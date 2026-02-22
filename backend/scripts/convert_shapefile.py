"""
convert_shapefile.py — Convert MA TIGER/Line shapefile → Boston GeoJSON.

Uses pyshp (shapefile) + pyproj — pure Python, no GDAL/fiona/geopandas needed.

Reads the Massachusetts census tract shapefile, filters to Suffolk County
(FIPS 025 = Boston), reprojects from NAD83 to WGS84, simplifies geometry,
and writes GeoJSON to both backend/data/ and frontend/src/data/.

Usage (run from backend/ directory):
    python scripts/convert_shapefile.py
    python scripts/convert_shapefile.py --simplify 0.00005
    python scripts/convert_shapefile.py --output /tmp/test.geojson
"""
import argparse
import json
import sys
from pathlib import Path

# ── Resolve project root paths ────────────────────────────────────────────────
SCRIPT_DIR   = Path(__file__).resolve().parent
BACKEND_DIR  = SCRIPT_DIR.parent
PROJECT_ROOT = BACKEND_DIR.parent

SHP_PATH = (
    BACKEND_DIR
    / "tl_2023_25_tract"
    / "tl_2023_25_tract.shp"
)

DEFAULT_OUTPUTS = [
    BACKEND_DIR  / "data"         / "boston_tracts.geojson",
    PROJECT_ROOT / "src" / "data" / "boston_tracts.geojson",
]

KEEP_FIELDS = {"GEOID", "TRACTCE", "NAME", "NAMELSAD", "COUNTYFP", "STATEFP", "ALAND", "AWATER"}
INT_FIELDS  = {"ALAND", "AWATER"}


# ── Coordinate simplification (Ramer-Douglas-Peucker) ────────────────────────

def _rdp(points: list, eps: float) -> list:
    """Ramer-Douglas-Peucker line simplification."""
    if len(points) < 3:
        return points
    # Find the point with max distance from the line start→end
    start, end = points[0], points[-1]
    dx, dy = end[0] - start[0], end[1] - start[1]
    dist_sq_line = dx * dx + dy * dy
    max_dist, max_idx = 0.0, 0
    for i in range(1, len(points) - 1):
        px, py = points[i]
        if dist_sq_line == 0:
            d = ((px - start[0]) ** 2 + (py - start[1]) ** 2) ** 0.5
        else:
            t = ((px - start[0]) * dx + (py - start[1]) * dy) / dist_sq_line
            t = max(0.0, min(1.0, t))
            d = ((px - (start[0] + t * dx)) ** 2 + (py - (start[1] + t * dy)) ** 2) ** 0.5
        if d > max_dist:
            max_dist, max_idx = d, i
    if max_dist > eps:
        left  = _rdp(points[:max_idx + 1], eps)
        right = _rdp(points[max_idx:], eps)
        return left[:-1] + right
    return [start, end]


def _simplify_ring(ring: list, eps: float) -> list:
    simplified = _rdp(ring, eps)
    # Ensure the ring is closed and has at least 4 points
    if len(simplified) < 4:
        return ring  # keep original if too aggressive
    if simplified[0] != simplified[-1]:
        simplified.append(simplified[0])
    return simplified


def _simplify_geom(geom: dict, eps: float) -> dict:
    """Simplify a GeoJSON geometry dict in-place."""
    if eps <= 0:
        return geom
    t = geom["type"]
    if t == "Polygon":
        geom["coordinates"] = [_simplify_ring(r, eps) for r in geom["coordinates"]]
    elif t == "MultiPolygon":
        geom["coordinates"] = [
            [_simplify_ring(r, eps) for r in poly]
            for poly in geom["coordinates"]
        ]
    return geom


# ── Argument parsing ──────────────────────────────────────────────────────────

def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Convert MA shapefile to Boston GeoJSON")
    p.add_argument("--simplify", type=float, default=0.0001, metavar="TOL",
                   help="RDP simplification tolerance in degrees (default: 0.0001)")
    p.add_argument("--output", type=Path, default=None, metavar="PATH",
                   help="Override output path (single file instead of both defaults)")
    return p.parse_args()


# ── Main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    args = parse_args()

    # --- Import dependencies --------------------------------------------------
    try:
        import shapefile as shp  # pyshp
    except ImportError:
        print("ERROR: pyshp is not installed.  Run:  pip install pyshp")
        sys.exit(1)
    try:
        from pyproj import Transformer
    except ImportError:
        print("ERROR: pyproj is not installed.  Run:  pip install pyproj")
        sys.exit(1)

    # --- Verify shapefile exists ----------------------------------------------
    if not SHP_PATH.exists():
        print(f"ERROR: Shapefile not found at:\n  {SHP_PATH}")
        sys.exit(1)

    print(f"Reading shapefile: {SHP_PATH}")

    # NAD83 (EPSG:4269) → WGS84 (EPSG:4326)
    transformer = Transformer.from_crs("EPSG:4269", "EPSG:4326", always_xy=True)

    def reproject_coords(coords):
        """Recursively reproject coordinate arrays."""
        if not coords:
            return coords
        if isinstance(coords[0], (int, float)):
            # Single point
            x, y = transformer.transform(coords[0], coords[1])
            return [x, y]
        return [reproject_coords(c) for c in coords]

    features = []
    total = 0

    with shp.Reader(str(SHP_PATH)) as sf:
        fields = [f[0] for f in sf.fields[1:]]  # skip DeletionFlag
        print(f"  Fields: {fields}")

        for shape_rec in sf.iterShapeRecords():
            total += 1
            rec = dict(zip(fields, shape_rec.record))

            # Filter to Suffolk County
            if rec.get("COUNTYFP") != "025":
                continue

            # Build properties — keep only KEEP_FIELDS
            props = {}
            for k in KEEP_FIELDS:
                if k in rec:
                    v = rec[k]
                    props[k] = int(v) if k in INT_FIELDS and v is not None else v

            # Build geometry
            shape = shape_rec.shape
            geom_type = shape.shapeType

            if geom_type in (5, 15, 25):  # Polygon variants
                parts = list(shape.parts) + [len(shape.points)]
                rings = []
                for i in range(len(parts) - 1):
                    ring = [[p[0], p[1]] for p in shape.points[parts[i]:parts[i + 1]]]
                    rings.append(ring)

                # Reproject
                rings = [reproject_coords(r) for r in rings]

                # Simplify
                rings = [_simplify_ring(r, args.simplify) for r in rings]

                # Determine if Polygon or MultiPolygon
                # Simple heuristic: first ring is exterior, rest are holes
                # For Census tracts, most are simple polygons
                geom = {"type": "Polygon", "coordinates": rings}

            else:
                print(f"  SKIP: unsupported shape type {geom_type} for GEOID {props.get('GEOID')}")
                continue

            features.append({
                "type": "Feature",
                "id": len(features),
                "geometry": geom,
                "properties": props,
            })

    print(f"  Total MA tracts read: {total}")
    print(f"  Suffolk County tracts: {len(features)}")

    n = len(features)
    if n < 150 or n > 250:
        print(f"WARNING: Expected 150–250 Suffolk County tracts, got {n}.")
        sys.exit(1)

    geojson_dict = {"type": "FeatureCollection", "features": features}
    geojson_str  = json.dumps(geojson_dict, separators=(",", ":"))

    # --- Determine output paths ----------------------------------------------
    output_paths = [args.output.resolve()] if args.output else DEFAULT_OUTPUTS

    for out_path in output_paths:
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(geojson_str, encoding="utf-8")
        size_kb = out_path.stat().st_size // 1024
        print(f"  Output: {out_path}  ({size_kb} KB)")

    print(f"\nConverted {n} Suffolk County tracts to GeoJSON.")

    # --- Spot-check coordinates are WGS84 (lng/lat) --------------------------
    first_geom = features[0]["geometry"]
    lng, lat   = first_geom["coordinates"][0][0]
    in_boston  = (-71.3 <= lng <= -70.8) and (42.1 <= lat <= 42.5)
    if in_boston:
        print(f"  Coordinate check OK: ({lng:.4f}, {lat:.4f}) [PASS]")
    else:
        print(f"  WARNING: ({lng:.4f}, {lat:.4f}) not in Boston lng/lat range!")

    print("\nDone. Restart the Vite dev server to pick up the new GeoJSON.")


if __name__ == "__main__":
    main()
