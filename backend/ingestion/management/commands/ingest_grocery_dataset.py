"""
Management command: ingest_grocery_dataset

Reads the Boston food-license CSV (tmp6k1hu4fv.csv) and upserts records
into the food_resources MongoDB collection.

The CSV has a single header row with columns:
    businessname, dbaname, address, city, state, zip, licstatus,
    licensecat, descript, license_add_dt_tm, dayphn_cleaned,
    property_id, latitude, longitude

Unlike the PolicyMap CSVs, coordinates are already present — no geocoding
required. Only rows with valid coordinates inside the Boston bounding box
are ingested.

Usage:
    python manage.py ingest_grocery_dataset [--data-dir PATH] [--limit N] [--dry-run]
"""

import csv
import logging
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from pymongo import UpdateOne

from core.db import resources_col
from core.store_hierarchy import classify_store_type, enrich_resource

logger = logging.getLogger(__name__)

_DEFAULT_DATA_DIR = Path(__file__).resolve().parents[4] / "PolicyMap Data"
_CSV_FILENAME     = "tmp6k1hu4fv.csv"

# Boston metro bounding box (lat/lng)
_LAT_MIN, _LAT_MAX = 42.22, 42.41
_LNG_MIN, _LNG_MAX = -71.20, -70.96

# MongoDB bulk-write batch size
_BATCH_SIZE = 500


class Command(BaseCommand):
    help = (
        "Ingest the Boston food-license dataset (tmp6k1hu4fv.csv) into MongoDB. "
        "Coordinates are pre-geocoded in the CSV — no geocoding step is required."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--data-dir",
            type=str,
            default=str(_DEFAULT_DATA_DIR),
            help="Directory containing tmp6k1hu4fv.csv (default: backend/PolicyMap Data/).",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=0,
            help="Maximum number of records to ingest (0 = no limit).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            default=False,
            help="Parse without writing to MongoDB.",
        )

    def handle(self, *args, **options):
        data_dir = Path(options["data_dir"])
        limit    = options["limit"]
        dry_run  = options["dry_run"]

        csv_path = data_dir / _CSV_FILENAME
        if not csv_path.is_file():
            raise CommandError(f"CSV file not found: {csv_path}")

        self.stdout.write(f"Reading: {csv_path}")
        records = self._parse_csv(csv_path, limit)
        self.stdout.write(f"Parsed {len(records)} valid records from CSV.")

        if not records:
            self.stdout.write(self.style.WARNING("No records to ingest."))
            return

        if dry_run:
            self.stdout.write(self.style.WARNING("--dry-run: no data written to MongoDB."))
            self.stdout.write(f"Sample record:\n  {records[0]}")
            return

        upserted = self._upsert_batched(records)
        self.stdout.write(
            self.style.SUCCESS(
                f"MongoDB: {upserted}/{len(records)} records upserted successfully."
            )
        )

    # ── Private helpers ────────────────────────────────────────────────────────

    def _parse_csv(self, path: Path, limit: int) -> list[dict]:
        records: list[dict] = []
        skipped_coords = 0
        skipped_bbox   = 0

        with open(path, newline="", encoding="utf-8-sig") as fh:
            reader = csv.DictReader(fh)
            for row in reader:
                if limit and len(records) >= limit:
                    break

                # Parse coordinates — skip rows without valid lat/lng
                try:
                    lat = float(row["latitude"])
                    lng = float(row["longitude"])
                except (ValueError, TypeError, KeyError):
                    skipped_coords += 1
                    continue

                # Skip out-of-bbox records
                if not (_LAT_MIN <= lat <= _LAT_MAX and _LNG_MIN <= lng <= _LNG_MAX):
                    skipped_bbox += 1
                    continue

                name    = (row.get("dbaname") or row.get("businessname") or "").strip()
                address = row.get("address", "").strip()
                city    = row.get("city", "Boston").strip()
                state   = row.get("state", "MA").strip()
                zipcode = row.get("zip", "").strip()
                phone   = row.get("dayphn_cleaned", "").strip() or None
                prop_id = row.get("property_id", "").strip()

                if not name or not prop_id:
                    continue

                full_address = f"{address}, {city}, {state} {zipcode}".strip(", ")

                # Classify using store hierarchy (type_hint → category)
                category = classify_store_type("grocery", name)

                doc: dict = {
                    "resource_id":  f"grocery-{prop_id}",
                    "name":         name,
                    "type":         "grocery",
                    "address":      full_address,
                    "coordinates":  [round(lng, 6), round(lat, 6)],
                    "tract_id":     "",          # not pre-assigned; spatial join optional
                    "snap":         False,
                    "free":         False,
                    "category":     category,
                    "source":       "boston_food_license",
                }
                if phone:
                    doc["phone"] = phone

                # Enrich with price score / tier / label / dots / hex_color inline
                doc = enrich_resource(doc)
                records.append(doc)

        if skipped_coords:
            self.stdout.write(f"  Skipped {skipped_coords} rows (no valid coordinates).")
        if skipped_bbox:
            self.stdout.write(f"  Skipped {skipped_bbox} rows (outside Boston bbox).")

        return records

    def _upsert_batched(self, records: list[dict]) -> int:
        col     = resources_col()
        total   = 0
        batches = range(0, len(records), _BATCH_SIZE)

        for start in batches:
            batch = records[start : start + _BATCH_SIZE]
            ops   = [
                UpdateOne(
                    {"resource_id": doc["resource_id"]},
                    {"$set": doc},
                    upsert=True,
                )
                for doc in batch
            ]
            result = col.bulk_write(ops, ordered=False)
            total += result.upserted_count + result.modified_count
            self.stdout.write(
                f"  Batch {start // _BATCH_SIZE + 1}: "
                f"{result.upserted_count} inserted, {result.modified_count} updated"
            )

        return total
