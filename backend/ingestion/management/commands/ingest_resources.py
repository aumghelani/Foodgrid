"""
Management command: ingest_resources

Reads the USDA food-store and farmers-market CSV exports provided by
PolicyMap, optionally geocodes each address using the Nominatim OpenStreetMap
geocoder (free, no API key), and upserts records into MongoDB.

Usage:
    python manage.py ingest_resources [--data-dir PATH] [--geocode] [--limit N]

Flags:
    --geocode   Enable Nominatim address geocoding (slow: ~1 req/s).
                Without this flag, coordinates are set to null and distance
                filtering in the API will not work for ingested records.
    --limit N   Process at most N resources (useful for testing).
    --dry-run   Parse and geocode without writing to MongoDB.
"""
import time
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from core.db import resources_col
from ingestion.parsers import (
    parse_farmers_market_row,
    parse_food_store_row,
    read_policymap_csv,
)

# ── Default data directory ────────────────────────────────────────────────────
_DEFAULT_DATA_DIR = Path(__file__).resolve().parents[4] / "PolicyMap Data"

_FILE_STORES  = "PolicyMap Data Food Store Locations (578 stores).csv"
_FILE_MARKETS = "PolicyMap Data Farmers Markets locations .csv"

# Nominatim rate limit: 1 request per second (OpenStreetMap usage policy).
_GEOCODE_DELAY = 1.1


class Command(BaseCommand):
    help = (
        "Ingest USDA food-store and farmers-market data into MongoDB. "
        "Use --geocode to resolve addresses to lat/lng via Nominatim."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--data-dir",
            type=str,
            default=str(_DEFAULT_DATA_DIR),
            help="Directory containing the PolicyMap CSV exports.",
        )
        parser.add_argument(
            "--geocode",
            action="store_true",
            default=False,
            help="Geocode addresses using Nominatim (rate-limited to 1 req/s).",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=0,
            help="Maximum number of resources to process (0 = no limit).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            default=False,
            help="Parse without writing to MongoDB.",
        )

    def handle(self, *args, **options):
        data_dir = Path(options["data_dir"])
        geocode  = options["geocode"]
        limit    = options["limit"]
        dry_run  = options["dry_run"]

        if not data_dir.is_dir():
            raise CommandError(f"Data directory not found: {data_dir}")

        # ── Optional geocoder setup ────────────────────────────────────────
        geocoder = None
        if geocode:
            try:
                from geopy.geocoders import Nominatim
                geocoder = Nominatim(user_agent="foodgrid-boston-ingestion/1.0")
                self.stdout.write("Nominatim geocoder initialised.")
            except ImportError:
                raise CommandError(
                    "geopy is not installed. Run: pip install geopy==2.*"
                )

        # ── Load CSVs ──────────────────────────────────────────────────────
        try:
            df_stores  = read_policymap_csv(data_dir / _FILE_STORES)
            df_markets = read_policymap_csv(data_dir / _FILE_MARKETS)
        except FileNotFoundError as exc:
            raise CommandError(f"Missing PolicyMap file: {exc}") from exc

        self.stdout.write(
            f"Food stores : {len(df_stores)} rows\n"
            f"Farmers mkts: {len(df_markets)} rows"
        )

        # ── Parse rows ────────────────────────────────────────────────────
        resources: list[dict] = []

        for row in df_stores.to_dict(orient="records"):
            doc = parse_food_store_row(row)
            if doc:
                resources.append(doc)

        for row in df_markets.to_dict(orient="records"):
            doc = parse_farmers_market_row(row)
            if doc:
                resources.append(doc)

        if limit:
            resources = resources[:limit]

        self.stdout.write(f"Parsed {len(resources)} resources after filtering.")

        # ── Geocode ────────────────────────────────────────────────────────
        if geocoder:
            self._geocode_all(resources, geocoder)
        else:
            geocoded_count = sum(1 for r in resources if r.get("coordinates"))
            self.stdout.write(
                f"Geocoding skipped. {geocoded_count} resources already have coordinates."
            )

        if dry_run:
            self.stdout.write(self.style.WARNING("--dry-run: no data written."))
            if resources:
                self.stdout.write(f"Sample resource:\n  {resources[0]}")
            return

        # ── Upsert to MongoDB ──────────────────────────────────────────────
        col = resources_col()
        upserted = 0
        for doc in resources:
            result = col.update_one(
                {"resource_id": doc["resource_id"]},
                {"$set": doc},
                upsert=True,
            )
            if result.upserted_id or result.modified_count:
                upserted += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"MongoDB: {upserted}/{len(resources)} resources upserted."
            )
        )

    # ── Private helpers ────────────────────────────────────────────────────

    def _geocode_all(self, resources: list[dict], geocoder) -> None:
        """
        Geocode each resource in-place using Nominatim.

        Applies a 1.1-second delay between requests to comply with the
        OpenStreetMap usage policy. Failures are logged but do not abort
        the run — resources without coordinates are still upserted.
        """
        total   = len(resources)
        success = 0
        failed  = 0

        for i, doc in enumerate(resources, start=1):
            address = doc.get("address", "")
            if not address:
                failed += 1
                continue

            try:
                location = geocoder.geocode(address, timeout=10)
            except Exception as exc:
                self.stderr.write(f"  [WARN] Geocode failed for '{address}': {exc}")
                failed += 1
                time.sleep(_GEOCODE_DELAY)
                continue

            if location:
                doc["coordinates"] = [
                    round(location.longitude, 6),
                    round(location.latitude,  6),
                ]
                success += 1
            else:
                self.stderr.write(
                    f"  [WARN] No geocode result for: {address}"
                )
                failed += 1

            if i % 50 == 0:
                self.stdout.write(
                    f"  Geocoded {i}/{total} ({success} OK, {failed} failed)…"
                )

            time.sleep(_GEOCODE_DELAY)

        self.stdout.write(
            f"Geocoding complete: {success} resolved, {failed} failed."
        )
