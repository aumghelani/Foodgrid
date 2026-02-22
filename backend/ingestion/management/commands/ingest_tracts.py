"""
Management command: ingest_tracts

Reads the PolicyMap census-tract CSV exports, merges them by 11-digit
GeoID, derives food-risk scores, and upserts each tract into MongoDB.

Usage:
    python manage.py ingest_tracts [--data-dir PATH]

The --data-dir option defaults to the "PolicyMap Data" folder that ships
with the repository, relative to this file's parent chain.
"""
import os
import sys
from pathlib import Path

import pandas as pd
from django.core.management.base import BaseCommand, CommandError

from core.db import city_stats_col, tracts_col
from ingestion.parsers import (
    _clean_numeric,
    derive_tract_metrics,
    read_policymap_csv,
)
from tracts.scoring import recompute_city_stats

# ── Default data directory ────────────────────────────────────────────────────
# Resolves to: backend/PolicyMap Data/
_DEFAULT_DATA_DIR = Path(__file__).resolve().parents[4] / "PolicyMap Data"

# ── PolicyMap file names ──────────────────────────────────────────────────────
_FILE_FOOD_AVG   = "PolicyMap Data Amount Spent per Household on Food.csv"
_FILE_LILA       = "PolicyMap Data Low Income + Low Access flag (USDA LILA).csv"
_FILE_LOWMOD     = "PolicyMap Data Median Household Income %.csv"
_FILE_MHHINC     = "PolicyMap Data Median Household Income (raw $).csv"
_FILE_POPDEN     = "PolicyMap Data Population Density.csv"


class Command(BaseCommand):
    help = (
        "Ingest PolicyMap census-tract data into MongoDB, computing food-risk "
        "scores from median income, LILA flag, population density, and more."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--data-dir",
            type=str,
            default=str(_DEFAULT_DATA_DIR),
            help="Directory containing the PolicyMap CSV exports.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            default=False,
            help="Parse and derive metrics without writing to MongoDB.",
        )

    def handle(self, *args, **options):
        data_dir = Path(options["data_dir"])
        dry_run  = options["dry_run"]

        if not data_dir.is_dir():
            raise CommandError(f"Data directory not found: {data_dir}")

        self.stdout.write(f"Loading PolicyMap CSVs from: {data_dir}")

        # ── Load each tract-level file ─────────────────────────────────────
        try:
            df_food_avg = read_policymap_csv(data_dir / _FILE_FOOD_AVG)
            df_lila     = read_policymap_csv(data_dir / _FILE_LILA)
            df_lowmod   = read_policymap_csv(data_dir / _FILE_LOWMOD)
            df_mhhinc   = read_policymap_csv(data_dir / _FILE_MHHINC)
            df_popden   = read_policymap_csv(data_dir / _FILE_POPDEN)
        except FileNotFoundError as exc:
            raise CommandError(f"Missing PolicyMap file: {exc}") from exc

        self.stdout.write(
            f"  food_avg rows  : {len(df_food_avg)}\n"
            f"  LILA rows      : {len(df_lila)}\n"
            f"  lowmod rows    : {len(df_lowmod)}\n"
            f"  mhhinc rows    : {len(df_mhhinc)}\n"
            f"  popden rows    : {len(df_popden)}\n"
        )

        # ── Build GeoID-keyed series for fast lookup ───────────────────────
        def _to_series(df: pd.DataFrame, value_col: str) -> pd.Series:
            """Return a Series keyed on GeoID, filtering rows without GeoID."""
            valid = df.dropna(subset=["GeoID"])
            valid = valid[valid["GeoID"].str.match(r"^\d{11}$", na=False)]
            return valid.set_index("GeoID")[value_col]

        s_food_avg = _to_series(df_food_avg, "food_avg")
        s_lila     = _to_series(df_lila,     "lilatracts_all")
        s_lowmod   = _to_series(df_lowmod,   "lowmod_hh")
        s_mhhinc   = _to_series(df_mhhinc,   "mhhinc")
        s_popden   = _to_series(df_popden,   "rpopden")

        # ── Union of all GeoIDs across files ───────────────────────────────
        all_geoids = (
            set(s_food_avg.index)
            | set(s_lila.index)
            | set(s_lowmod.index)
            | set(s_mhhinc.index)
            | set(s_popden.index)
        )
        self.stdout.write(f"Total unique tract GeoIDs: {len(all_geoids)}")

        # ── Derive metrics and upsert ──────────────────────────────────────
        docs: list[dict] = []
        skipped = 0

        for geoid in sorted(all_geoids):
            mhhinc   = _clean_numeric(s_mhhinc.get(geoid))
            rpopden  = _clean_numeric(s_popden.get(geoid))
            food_avg = _clean_numeric(s_food_avg.get(geoid))
            lila_raw = s_lila.get(geoid)
            lowmod   = _clean_numeric(s_lowmod.get(geoid))

            # Skip tracts where all numeric fields are missing (likely water).
            if all(v is None for v in [mhhinc, rpopden, food_avg]):
                skipped += 1
                continue

            try:
                doc = derive_tract_metrics(
                    geoid=geoid,
                    mhhinc=mhhinc,
                    rpopden=rpopden,
                    food_avg=food_avg,
                    lilatracts_all=lila_raw,
                    lowmod_hh=lowmod,
                )
            except Exception as exc:
                self.stderr.write(f"  [WARN] GeoID {geoid} skipped: {exc}")
                skipped += 1
                continue

            docs.append(doc)

        self.stdout.write(
            f"Tracts parsed: {len(docs)} valid, {skipped} skipped."
        )

        if dry_run:
            self.stdout.write(self.style.WARNING("--dry-run: no data written."))
            # Print a sample
            if docs:
                sample = docs[0]
                self.stdout.write(f"Sample tract:\n  {sample}")
            return

        # ── Upsert to MongoDB ──────────────────────────────────────────────
        col = tracts_col()
        upserted = 0
        for doc in docs:
            result = col.update_one(
                {"tract_id": doc["tract_id"]},
                {"$set": doc},
                upsert=True,
            )
            if result.upserted_id or result.modified_count:
                upserted += 1

        self.stdout.write(
            self.style.SUCCESS(f"MongoDB: {upserted}/{len(docs)} tracts upserted.")
        )

        # ── Recompute and persist city-wide stats ──────────────────────────
        all_docs = list(col.find({}, {"_id": 0}))
        stats = recompute_city_stats(all_docs)
        city_stats_col().update_one(
            {"_type": "city_stats"},
            {"$set": {**stats, "_type": "city_stats"}},
            upsert=True,
        )
        self.stdout.write(self.style.SUCCESS(
            f"City stats updated: {stats}"
        ))
