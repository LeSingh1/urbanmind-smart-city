import asyncio
import json
import random
import uuid
from datetime import datetime, timezone
from pathlib import Path

from database import AsyncSessionLocal
from models.city import City
from models.simulation_frame import SimulationFrame
from models.simulation_session import SimulationSession, SimulationStatus
from redis_client import get_redis

DATA_DIR = Path(__file__).resolve().parents[2] / "data" / "cities"


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


def _simulation_geojson(city: City, year: int) -> tuple[dict, dict, list[dict]]:
    west, south, east, north = _city_bbox(city)
    clat, clng = _city_sim_center(city)

    # City-block scale cells (~270m × 200m). Growing from the actual city
    # center ensures zones stay on land rather than spreading over water.
    CELL_W = 0.003
    CELL_H = 0.002
    COLS = 60
    ROWS = 50
    ccol, crow = COLS // 2, ROWS // 2
    max_radius = 3 + year // 2  # slowly expand outward each year

    zone_ids = [
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

    features = []
    actions = []

    for row in range(ROWS):
        for col in range(COLS):
            dc = col - ccol
            dr = row - crow
            dist = abs(dc) + abs(dr)
            if dist > max_radius:
                continue

            lng = clng + dc * CELL_W
            lat = clat - dr * CELL_H  # dr positive → south

            # Skip cells outside city bbox
            if not (west <= lng < east and south <= lat < north):
                continue

            x0, x1 = lng - CELL_W / 2, lng + CELL_W / 2
            y0, y1 = lat - CELL_H / 2, lat + CELL_H / 2

            zone = zone_ids[(col * 7 + row * 13 + year) % len(zone_ids)]
            features.append({
                "type": "Feature",
                "properties": {
                    "x": col,
                    "y": row,
                    "zone_type_id": zone,
                    "population_density": 4000 + dist * 600 + year * 150,
                },
                "geometry": {"type": "Polygon", "coordinates": [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]]},
            })
    for action_index, feature in enumerate(features[-3:]):
        props = feature["properties"]
        zone = props["zone_type_id"]
        actions.append({
            "x": props["x"],
            "y": props["y"],
            "zone_type_id": zone,
            "zone_display_name": zone.replace("_", " ").title(),
            "sps_score": round(4.2 + (year % 10) * 0.35 + action_index * 0.2, 2),
            "rejection_reason": "Lower connectivity and service leverage than the selected cell." if action_index == 0 else None,
        })
    span_w = COLS // 2 * CELL_W
    span_h = ROWS // 2 * CELL_H
    roads = {
        "type": "FeatureCollection",
        "features": [
            {"type": "Feature", "properties": {"road_type": "HIGHWAY", "congestion_pct": min(100, 35 + year)}, "geometry": {"type": "LineString", "coordinates": [[clng - span_w, clat], [clng + span_w, clat]]}},
            {"type": "Feature", "properties": {"road_type": "ARTERIAL", "congestion_pct": max(10, 52 - year // 2)}, "geometry": {"type": "LineString", "coordinates": [[clng, clat - span_h], [clng, clat + span_h]]}},
            {"type": "Feature", "properties": {"road_type": "COLLECTOR", "congestion_pct": 30}, "geometry": {"type": "LineString", "coordinates": [[clng - span_w * 0.6, clat + span_h * 0.3], [clng + span_w * 0.6, clat + span_h * 0.3]]}},
        ],
    }
    return {"type": "FeatureCollection", "features": features}, roads, actions


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

        for year in range(0, 51):
            zones_geojson, roads_geojson, actions = _simulation_geojson(city, year)
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
        await _publish(channel, {"type": "SIM_COMPLETE", "session_id": session_id, "year": 50})
