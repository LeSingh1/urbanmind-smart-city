import asyncio
import heapq
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

from database import AsyncSessionLocal
from models.city import City
from models.simulation_frame import SimulationFrame
from models.simulation_session import SimulationSession, SimulationStatus
from redis_client import get_redis

DATA_DIR = Path(__file__).resolve().parents[2] / "data" / "cities"

# Module-level cache to avoid re-reading JSON on every simulation frame
_LAND_POLYGON_CACHE: dict[str, list | None] = {}

CELL_W = 0.003
CELL_H = 0.002
COLS = 80
ROWS = 70

ZONE_IDS = [
    "RES_LOW_DETACHED",
    "RES_MED_APARTMENT",
    "RES_HIGH_TOWER",
    "RES_MIXED",
    "COM_SMALL_SHOP",
    "COM_OFFICE_PLAZA",
    "PARK_SMALL",
    "BUS_STATION",
    "HEALTH_HOSPITAL",
    "EDU_HIGH",
    "SOLAR_FARM",
    "SMART_TRAFFIC_LIGHT",
    "RES_AFFORDABLE",
    "IND_WAREHOUSE",
]


def run_simulation(session_id: str, city_id: str, scenario_id: str) -> None:
    asyncio.run(_run_simulation(session_id, city_id, scenario_id))


async def _publish(channel: str, payload: dict) -> None:
    redis = await get_redis()
    await redis.publish(channel, json.dumps(payload))


def _empty_feature_collection() -> dict:
    return {"type": "FeatureCollection", "features": []}


def _city_bbox(city: City) -> tuple[float, float, float, float]:
    path = DATA_DIR / f"{city.slug}.json"
    if path.exists():
        return tuple(json.loads(path.read_text())["bbox"])
    return (city.center_lng - 0.25, city.center_lat - 0.2, city.center_lng + 0.25, city.center_lat + 0.2)


def _city_sim_center(city: City) -> tuple[float, float]:
    """Return the on-land simulation anchor point, falling back to DB center."""
    path = DATA_DIR / f"{city.slug}.json"
    if path.exists():
        profile = json.loads(path.read_text())
        if "sim_center_lat" in profile and "sim_center_lng" in profile:
            return profile["sim_center_lat"], profile["sim_center_lng"]
    return city.center_lat, city.center_lng


def _city_land_polygon(city: City) -> list | None:
    """Load land polygon rings from city JSON, with module-level caching."""
    slug = city.slug
    if slug in _LAND_POLYGON_CACHE:
        return _LAND_POLYGON_CACHE[slug]
    path = DATA_DIR / f"{slug}.json"
    rings = None
    if path.exists():
        profile = json.loads(path.read_text())
        rings = profile.get("land_polygon")
    _LAND_POLYGON_CACHE[slug] = rings
    return rings


def _ray_cast(lng: float, lat: float, ring: list) -> bool:
    """Ray-casting point-in-polygon test for a single ring."""
    inside = False
    n = len(ring)
    j = n - 1
    for i in range(n):
        xi, yi = ring[i]
        xj, yj = ring[j]
        if ((yi > lat) != (yj > lat)) and (
            lng < (xj - xi) * (lat - yi) / (yj - yi + 1e-12) + xi
        ):
            inside = not inside
        j = i
    return inside


def _valid_land_cell(lng: float, lat: float, rings: list | None) -> bool:
    """
    Return True if the point is on land (inside any ring).
    Fails open: if no land polygon is stored, every cell is accepted so the
    simulation still runs for cities without polygon data.
    """
    if rings is None:
        return True
    return any(_ray_cast(lng, lat, ring) for ring in rings)


def _city_boundary_feature(city: City) -> dict:
    path = DATA_DIR / f"{city.slug}.json"
    geometry = None
    if path.exists():
        profile = json.loads(path.read_text())
        min_lng, min_lat, max_lng, max_lat = profile["bbox"]
        geometry = {
            "type": "Polygon",
            "coordinates": [[
                [min_lng, min_lat],
                [max_lng, min_lat],
                [max_lng, max_lat],
                [min_lng, max_lat],
                [min_lng, min_lat],
            ]],
        }
    return {
        "type": "Feature",
        "properties": {"id": str(city.id), "slug": city.slug, "name": city.name},
        "geometry": geometry,
    }


def _precompute_bfs(city: City) -> list[list[tuple[int, int]]]:
    """
    BFS expansion seeded from the city's sim_center.
    Returns a list of 76 elements (years 0-75). Each element is the list of
    (col, row) cells that are newly placed IN THAT YEAR. Year 0 = seed cells.

    The heap key is (manhattan_distance_from_seed, col * ROWS + row) to ensure
    deterministic tie-breaking across runs.
    """
    clat, clng = _city_sim_center(city)
    west, south, east, north = _city_bbox(city)
    rings = _city_land_polygon(city)

    ccol = COLS // 2
    crow = ROWS // 2

    def col_lng(col: int) -> float:
        return clng + (col - ccol) * CELL_W

    def row_lat(row: int) -> float:
        return clat - (row - crow) * CELL_H

    def in_bbox(col: int, row: int) -> bool:
        lng = col_lng(col)
        lat = row_lat(row)
        return west <= lng < east and south <= lat < north

    def is_land(col: int, row: int) -> bool:
        return _valid_land_cell(col_lng(col), row_lat(row), rings)

    # Seed: the center cell and its immediate cardinal neighbours (all land-checked)
    seeds = [(ccol, crow), (ccol + 1, crow), (ccol - 1, crow), (ccol, crow - 1), (ccol, crow + 1)]
    seeds = [(c, r) for c, r in seeds if 0 <= c < COLS and 0 <= r < ROWS and in_bbox(c, r) and is_land(c, r)]
    if not seeds:
        # Fallback: use center even if it looks like water (edge case for cities
        # where the polygon hasn't been generated yet)
        seeds = [(ccol, crow)]

    visited: set[tuple[int, int]] = set()
    # (manhattan_dist, tiebreak, col, row)
    heap: list[tuple[int, int, int, int]] = []
    for c, r in seeds:
        dist = abs(c - ccol) + abs(r - crow)
        heapq.heappush(heap, (dist, c * ROWS + r, c, r))
        visited.add((c, r))

    # Each year admits up to NEW_PER_YEAR new cells from the BFS frontier
    NEW_PER_YEAR = 12   # ~12 city blocks per simulated year
    years: list[list[tuple[int, int]]] = []

    # Year 0: place seed cells
    years.append(list(seeds))

    for _year in range(1, 76):
        added: list[tuple[int, int]] = []
        while heap and len(added) < NEW_PER_YEAR:
            dist, _, col, row = heapq.heappop(heap)
            # Expand neighbours
            for dc, dr in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                nc, nr = col + dc, row + dr
                if (nc, nr) in visited:
                    continue
                if not (0 <= nc < COLS and 0 <= nr < ROWS):
                    continue
                if not in_bbox(nc, nr):
                    continue
                if not is_land(nc, nr):
                    visited.add((nc, nr))  # mark water cells as visited to skip later
                    continue
                visited.add((nc, nr))
                ndist = abs(nc - ccol) + abs(nr - crow)
                heapq.heappush(heap, (ndist, nc * ROWS + nr, nc, nr))
                added.append((nc, nr))
                if len(added) >= NEW_PER_YEAR:
                    break
        years.append(added)

    return years


def _build_zones_geojson(
    city: City,
    placed_cells: set[tuple[int, int]],
    new_this_year: list[tuple[int, int]],
    year: int,
    clng: float,
    clat: float,
) -> dict:
    ccol = COLS // 2
    crow = ROWS // 2
    features = []
    new_set = set(new_this_year)
    for col, row in placed_cells:
        lng = clng + (col - ccol) * CELL_W
        lat = clat - (row - crow) * CELL_H
        x0, x1 = lng - CELL_W / 2, lng + CELL_W / 2
        y0, y1 = lat - CELL_H / 2, lat + CELL_H / 2
        dist = abs(col - ccol) + abs(row - crow)
        zone = ZONE_IDS[(col * 7 + row * 13 + year) % len(ZONE_IDS)]
        features.append({
            "type": "Feature",
            "properties": {
                "x": col,
                "y": row,
                "zone_type_id": zone,
                "population_density": 4000 + dist * 600 + year * 150,
                "isNew": (col, row) in new_set,
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]],
            },
        })
    return {"type": "FeatureCollection", "features": features}


def _make_roads(clng: float, clat: float, year: int) -> dict:
    span_w = COLS // 2 * CELL_W
    span_h = ROWS // 2 * CELL_H
    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {"road_type": "HIGHWAY", "congestion_pct": min(100, 35 + year)},
                "geometry": {"type": "LineString", "coordinates": [[clng - span_w, clat], [clng + span_w, clat]]},
            },
            {
                "type": "Feature",
                "properties": {"road_type": "ARTERIAL", "congestion_pct": max(10, 52 - year // 2)},
                "geometry": {"type": "LineString", "coordinates": [[clng, clat - span_h], [clng, clat + span_h]]},
            },
            {
                "type": "Feature",
                "properties": {"road_type": "COLLECTOR", "congestion_pct": 30},
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[clng - span_w * 0.6, clat + span_h * 0.3], [clng + span_w * 0.6, clat + span_h * 0.3]],
                },
            },
        ],
    }


def _make_actions(new_this_year: list[tuple[int, int]], year: int, clng: float, clat: float) -> list[dict]:
    ccol = COLS // 2
    crow = ROWS // 2
    actions = []
    for action_index, (col, row) in enumerate(new_this_year[-3:]):
        zone = ZONE_IDS[(col * 7 + row * 13 + year) % len(ZONE_IDS)]
        actions.append({
            "x": col,
            "y": row,
            "zone_type_id": zone,
            "zone_display_name": zone.replace("_", " ").title(),
            "sps_score": round(4.2 + (year % 10) * 0.35 + action_index * 0.2, 2),
            "rejection_reason": (
                "Lower connectivity and service leverage than the selected cell."
                if action_index == 0
                else None
            ),
        })
    return actions


def _metrics(city: City, year: int) -> dict:
    growth_factor = 1 + (city.urban_growth_rate / 100 + 0.012) * year
    population = int(city.population_current * growth_factor)
    return {
        "year": year,
        "pop_total": population,
        "pop_density_avg": round(5000 + year * 150, 2),
        "pop_growth_rate": round(city.urban_growth_rate + year * 0.03, 2),
        "mobility_commute": round(max(18, 46 - year * 0.25), 2),
        "mobility_congestion": round(min(92, 42 + year * 0.7), 2),
        "mobility_transit_coverage": round(min(98, 42 + year * 1.05), 2),
        "mobility_walkability": round(min(95, 50 + year * 0.8), 2),
        "econ_gdp_est": round(population * city.gdp_per_capita * (1 + year * 0.018), 2),
        "econ_housing_afford": round(max(28, 64 - year * 0.25), 2),
        "econ_jobs_created": int(year * population * 0.004),
        "env_green_ratio": round(max(10, 24 - year * 0.1), 2),
        "env_co2_est": round(max(220, 780 - year * 6.5), 2),
        "env_impervious": round(min(82, 38 + year * 0.55), 2),
        "env_flood_exposure": round(max(4, 24 - year * 0.18), 2),
        "equity_infra_gini": round(max(18, 42 - year * 0.35), 2),
        "equity_hosp_coverage": round(min(96, 48 + year * 0.9), 2),
        "equity_school_access": round(min(98, 58 + year * 0.75), 2),
        "infra_power_load": round(min(96, 45 + year * 0.8), 2),
        "infra_water_capacity": round(min(98, 52 + year * 0.65), 2),
        "safety_response_time": round(max(3.4, 8.5 - year * 0.08), 2),
    }


async def _run_simulation(session_id: str, city_id: str, scenario_id: str) -> None:
    session_uuid = uuid.UUID(session_id)
    city_uuid = uuid.UUID(city_id)
    channel = f"sim_{session_id}"

    async with AsyncSessionLocal() as db:
        sim = await db.get(SimulationSession, session_uuid)
        city = await db.get(City, city_uuid)
        if sim is None or city is None:
            return

        sim.status = SimulationStatus.running
        await db.commit()

        city_geojson = _city_boundary_feature(city)
        await _publish(
            channel,
            {
                "type": "SIM_INIT",
                "session_id": session_id,
                "city_id": str(city.id),
                "city": city_geojson,
                "scenario_id": scenario_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        )

        # Pre-compute full horizon (0-75 → calendar 2026-2101) BFS zone expansion once, upfront
        bfs_years = _precompute_bfs(city)
        clat, clng = _city_sim_center(city)

        placed_cells: set[tuple[int, int]] = set()
        for year in range(0, 76):
            new_this_year = bfs_years[year] if year < len(bfs_years) else []
            placed_cells.update(new_this_year)

            zones_geojson = _build_zones_geojson(city, placed_cells, new_this_year, year, clng, clat)
            roads_geojson = _make_roads(clng, clat, year)
            actions = _make_actions(new_this_year, year, clng, clat)
            metrics = _metrics(city, year)

            frame = SimulationFrame(
                session_id=session_uuid,
                year=year,
                zones_geojson=zones_geojson,
                roads_geojson=roads_geojson,
                agent_actions=actions,
                metrics_snapshot=metrics,
            )
            db.add(frame)
            sim.current_year = year
            sim.metrics_history = [*sim.metrics_history, metrics]
            await db.commit()

            await _publish(
                channel,
                {
                    "type": "SIM_FRAME",
                    "session_id": session_id,
                    "year": year,
                    "zones_geojson": frame.zones_geojson,
                    "roads_geojson": frame.roads_geojson,
                    "agent_actions": frame.agent_actions,
                    "metrics_snapshot": metrics,
                },
            )
            await asyncio.sleep(0.1)

        sim.status = SimulationStatus.complete
        sim.completed_at = datetime.now(timezone.utc)
        await db.commit()
        await _publish(channel, {"type": "SIM_COMPLETE", "session_id": session_id, "year": 75})
