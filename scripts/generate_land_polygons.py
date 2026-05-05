"""
Run once: python scripts/generate_land_polygons.py
Writes "land_polygon" key to each data/cities/{slug}.json.

land_polygon format: list of rings, each ring is [[lng, lat], ...] (closed).
Multiple rings = MultiPolygon (e.g. NYC boroughs separated by rivers).
Backend PIP checks all rings: cell is land if ANY ring contains its center.

Strategy (hybrid):
- Default cities: subtract all OSM water bodies from the city bbox polygon. This gives
  true land geometry without relying on admin boundary geocoding.
- Override cities (coastal, ocean not tagged in OSM): use admin boundary or island polygons.
  Mumbai → union of Mumbai City District + Mumbai Suburban District (admin_level=5)
  Singapore → union of all OSM place=island polygons within bbox
  Lagos → Lagos State admin boundary clipped to bbox

Simplification at 0.001° (~100m) — smaller than grid CELL_W (0.003°), so no
cell center is misclassified by polygon boundary coarseness.

AREA_THRESHOLD = 0.0001°² filters out tiny slivers while keeping all inhabited areas.
"""
import json
import sys
import osmnx as ox
from shapely import simplify
from shapely.geometry import box
from shapely.ops import unary_union
from pathlib import Path

CITIES_DIR = Path(__file__).resolve().parents[1] / "data" / "cities"
SIMPLIFY_TOLERANCE = 0.001   # degrees; ~100m
AREA_THRESHOLD = 0.0001      # degrees²; keeps all inhabited areas

CITY_SLUGS = [
    "new_york", "los_angeles", "tokyo", "lagos",
    "london", "sao_paulo", "singapore", "dubai", "mumbai",
]

targets = sys.argv[1:] if len(sys.argv) > 1 else CITY_SLUGS


def extract_rings(geom, area_threshold: float) -> list[list]:
    """
    Return list of exterior rings from a (Multi)Polygon.
    Filters out polygons with area < area_threshold.
    Each ring: [[lng, lat], ...] closed.
    """
    if geom.geom_type == "Polygon":
        polys = [geom]
    elif geom.geom_type == "MultiPolygon":
        polys = list(geom.geoms)
    else:
        polys = [g for g in geom.geoms if g.geom_type in ("Polygon", "MultiPolygon")]

    rings = []
    for p in polys:
        if p.geom_type == "MultiPolygon":
            for sub in p.geoms:
                if sub.area >= area_threshold:
                    rings.append([[round(x, 6), round(y, 6)] for x, y in sub.exterior.coords])
        elif p.area >= area_threshold:
            rings.append([[round(x, 6), round(y, 6)] for x, y in p.exterior.coords])
    return rings


def land_geom_default(bbox_box):
    """Subtract OSM water bodies from bbox rectangle."""
    water_tags = {
        "natural": ["water", "bay", "strait", "wetland"],
        "waterway": True,
        "landuse": "reservoir",
    }
    try:
        gdf_water = ox.features_from_polygon(bbox_box, tags=water_tags)
        water_polys = gdf_water[
            gdf_water.geometry.geom_type.isin(["Polygon", "MultiPolygon"])
        ].geometry
        if len(water_polys) > 0:
            water_union = unary_union(water_polys.values).intersection(bbox_box)
            return bbox_box.difference(water_union)
        else:
            print("  INFO: no water features found — using full bbox as land")
            return bbox_box
    except Exception as e:
        print(f"  WARNING: water fetch failed: {e}. Using full bbox as land.")
        return bbox_box


def land_geom_mumbai(bbox_box):
    """Union of Mumbai City District + Mumbai Suburban District (admin_level=5)."""
    gdf = ox.features_from_polygon(bbox_box, tags={"boundary": "administrative", "admin_level": "5"})
    target_names = {"Mumbai City District", "Mumbai Suburban District"}
    polys = []
    for _, row in gdf.iterrows():
        name = row.get("name", "")
        if name in target_names and row.geometry and row.geometry.geom_type in ("Polygon", "MultiPolygon"):
            polys.append(row.geometry.intersection(bbox_box))
            print(f"  Using admin boundary: {name}")
    if not polys:
        print("  WARNING: Mumbai admin boundaries not found, falling back to default")
        return land_geom_default(bbox_box)
    return unary_union(polys)


def land_geom_singapore(bbox_box):
    """Union of all OSM place=island polygons within bbox (filters tiny ones)."""
    gdf = ox.features_from_polygon(bbox_box, tags={"place": "island"})
    polys = []
    for _, row in gdf.iterrows():
        geom = row.geometry
        if geom and geom.geom_type in ("Polygon", "MultiPolygon") and geom.area >= AREA_THRESHOLD:
            polys.append(geom.intersection(bbox_box))
    if not polys:
        print("  WARNING: Singapore islands not found, falling back to default")
        return land_geom_default(bbox_box)
    print(f"  Using {len(polys)} island polygon(s)")
    return unary_union(polys)


def land_geom_lagos(bbox_box):
    """Lagos State admin boundary clipped to bbox."""
    try:
        gdf = ox.geocode_to_gdf("Lagos State, Nigeria")
        geom = gdf.geometry.iloc[0]
        clipped = geom.intersection(bbox_box)
        if clipped.is_empty:
            raise ValueError("Empty intersection")
        print("  Using Lagos State admin boundary")
        return clipped
    except Exception as e:
        print(f"  WARNING: Lagos admin boundary failed: {e}, falling back to default")
        return land_geom_default(bbox_box)


# Cities that need special handling due to untagged ocean in OSM
OVERRIDE_STRATEGIES = {
    "mumbai": land_geom_mumbai,
    "singapore": land_geom_singapore,
    "lagos": land_geom_lagos,
}

for slug in targets:
    if slug not in CITY_SLUGS:
        print(f"Unknown slug: {slug}. Skipping.")
        continue

    city_file = CITIES_DIR / f"{slug}.json"
    if not city_file.exists():
        print(f"  ERROR: {city_file} not found. Skipping.")
        continue

    print(f"Processing {slug}...")
    profile = json.loads(city_file.read_text())
    west, south, east, north = profile["bbox"]
    bbox_box = box(west, south, east, north)

    try:
        strategy = OVERRIDE_STRATEGIES.get(slug, land_geom_default)
        if slug in OVERRIDE_STRATEGIES:
            land_geom = strategy(bbox_box)
        else:
            land_geom = land_geom_default(bbox_box)
    except Exception as e:
        print(f"  ERROR: {e}. Skipping.")
        continue

    # Handle GeometryCollection — keep only (Multi)Polygon parts
    if land_geom.geom_type == "GeometryCollection":
        polys = [g for g in land_geom.geoms if g.geom_type in ("Polygon", "MultiPolygon")]
        land_geom = unary_union(polys) if polys else bbox_box

    # Simplify
    land_geom = simplify(land_geom, tolerance=SIMPLIFY_TOLERANCE, preserve_topology=True)

    # Extract rings above area threshold
    rings = extract_rings(land_geom, AREA_THRESHOLD)
    if not rings:
        print(f"  WARNING: all rings below threshold — lowering to 0")
        rings = extract_rings(land_geom, 0.0)
    if not rings:
        print(f"  ERROR: no rings extracted for {slug}. Skipping.")
        continue

    profile["land_polygon"] = rings
    city_file.write_text(json.dumps(profile, indent=2))
    total_verts = sum(len(r) for r in rings)
    print(f"  {slug}: {len(rings)} ring(s), {total_verts} total vertices")

print("\nDone. Inspect each city polygon at https://geojson.io before committing.")
