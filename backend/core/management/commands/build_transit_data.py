"""
Management command: build_transit_data

Reads the MBTA GTFS stops.txt file (in the backend root directory) and
writes a compact mbta_stops.json to backend/data/.

The JSON file is consumed at runtime by core.transit for distance lookups
and transit time estimates — no network calls required.

Usage:
    python manage.py build_transit_data
    python manage.py build_transit_data --radius 800   # default walk-shed radius
"""
import csv
import json
from pathlib import Path

from django.core.management.base import BaseCommand

# GTFS files live in the backend root (same directory as manage.py)
_BACKEND_DIR = Path(__file__).resolve().parents[4]
_STOPS_TXT   = _BACKEND_DIR / "stops.txt"
_OUT_PATH    = _BACKEND_DIR / "data" / "mbta_stops.json"

# Suffolk County / Greater Boston bounding box (WGS-84)
_LAT_MIN, _LAT_MAX = 42.20, 42.45
_LON_MIN, _LON_MAX = -71.20, -70.90

# GTFS vehicle_type codes
_VEHICLE_LABELS = {
    "0": "light_rail",
    "1": "subway",
    "2": "commuter_rail",
    "3": "bus",
    "4": "ferry",
}


class Command(BaseCommand):
    help = "Build mbta_stops.json from GTFS stops.txt for use by core.transit"

    def add_arguments(self, parser):
        parser.add_argument(
            "--stops-file",
            type=Path,
            default=_STOPS_TXT,
            help="Path to GTFS stops.txt (default: backend/stops.txt)",
        )
        parser.add_argument(
            "--out",
            type=Path,
            default=_OUT_PATH,
            help="Output path for mbta_stops.json",
        )

    def handle(self, *args, **options):
        stops_file: Path = options["stops_file"]
        out_path:   Path = options["out"]

        if not stops_file.exists():
            self.stderr.write(f"ERROR: stops.txt not found at {stops_file}")
            return

        self.stdout.write(f"Reading GTFS stops from {stops_file} ...")

        stops: list[dict] = []
        skipped = 0

        with open(stops_file, encoding="utf-8", newline="") as fh:
            reader = csv.DictReader(fh)
            for row in reader:
                try:
                    lat = float(row["stop_lat"])
                    lon = float(row["stop_lon"])
                except (KeyError, ValueError):
                    skipped += 1
                    continue

                # Filter to Boston metro bounding box
                if not (_LAT_MIN <= lat <= _LAT_MAX and _LON_MIN <= lon <= _LON_MAX):
                    continue

                # Skip child stops (location_type != 0 or empty = stop platform)
                loc_type = row.get("location_type", "").strip()
                if loc_type not in ("", "0"):
                    continue

                vehicle_code = row.get("vehicle_type", "3").strip()
                stops.append({
                    "stop_id":      row.get("stop_id", "").strip(),
                    "name":         row.get("stop_name", "").strip(),
                    "lat":          round(lat, 6),
                    "lon":          round(lon, 6),
                    "vehicle_type": _VEHICLE_LABELS.get(vehicle_code, "bus"),
                    "municipality": row.get("municipality", "").strip(),
                })

        self.stdout.write(f"  Total GTFS rows read: {len(stops) + skipped}")
        self.stdout.write(f"  Boston-area stops:    {len(stops)}")
        self.stdout.write(f"  Skipped (no coords):  {skipped}")

        out_path.parent.mkdir(parents=True, exist_ok=True)
        with open(out_path, "w", encoding="utf-8") as fh:
            json.dump(stops, fh, separators=(",", ":"))

        size_kb = out_path.stat().st_size // 1024
        self.stdout.write(
            self.style.SUCCESS(
                f"Wrote {len(stops)} stops to {out_path} ({size_kb} KB)"
            )
        )
