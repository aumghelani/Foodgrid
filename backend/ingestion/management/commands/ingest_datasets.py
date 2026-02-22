"""
Management command: ingest_datasets

Reads all PolicyMap CSV files, merges them by GeoID (census tract),
computes the 5-component equity score for each tract, and upserts the
results into the MongoDB census_tracts collection.

Run AFTER ingest_tracts so the base tract documents exist.

Usage:
    python manage.py ingest_datasets
    python manage.py ingest_datasets --dry-run   # print scores, do not write DB
"""
import csv
from pathlib import Path

from django.core.management.base import BaseCommand

from core.db import tracts_col
from tracts.scoring import compute_full_equity_score, recompute_city_stats

# ── PolicyMap CSV locations ────────────────────────────────────────────────────
# Files live in jigar-chatbot/chatbot/src/data/policymap/ relative to repo root.
_REPO_ROOT = Path(__file__).resolve().parents[5]
_PM_DIR    = _REPO_ROOT / "jigar-chatbot" / "chatbot" / "src" / "data" / "policymap"

# Map internal field name → CSV filename (timestamp-based)
_CSV_MAP: dict[str, str] = {
    "mhhinc":           "PolicyMap Data 2026-02-21 230612 UTC.csv",
    "p_fi_rate":        "PolicyMap Data 2026-02-21 224444 UTC.csv",
    "food_avg":         "PolicyMap Data 2026-02-21 230737 UTC.csv",
    "lilatracts_all":   "PolicyMap Data 2026-02-21 231057 UTC.csv",
    "lowmod_hh":        "PolicyMap Data 2026-02-21 222916 UTC.csv",
    "rfastfoodtakeout": "PolicyMap Data 2026-02-21 232450 UTC.csv",
}

# GeoID column name is the same across all tract-level PolicyMap exports
_GEOID_COL = "GeoID"


class Command(BaseCommand):
    help = (
        "Ingest PolicyMap datasets and compute 5-component equity scores "
        "for all census tracts. Requires ingest_tracts to have run first."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            default=False,
            help="Compute scores and print stats without writing to MongoDB.",
        )
        parser.add_argument(
            "--data-dir",
            type=Path,
            default=_PM_DIR,
            help="Directory containing PolicyMap CSV files.",
        )

    def handle(self, *args, **options):
        dry_run:  bool = options["dry_run"]
        data_dir: Path = options["data_dir"]

        self.stdout.write(f"PolicyMap data directory: {data_dir}")

        # ── Load each CSV into {geoid: value} dicts ────────────────────────────
        datasets: dict[str, dict[str, float]] = {}
        for field, filename in _CSV_MAP.items():
            path = data_dir / filename
            if not path.exists():
                self.stderr.write(f"  WARNING: {filename} not found — skipping {field}")
                datasets[field] = {}
                continue
            datasets[field] = self._read_policymap_csv(path, field)
            self.stdout.write(f"  Loaded {field}: {len(datasets[field])} tracts")

        if not any(datasets.values()):
            self.stderr.write("No datasets loaded. Nothing to do.")
            return

        # ── Fetch existing tracts from MongoDB ─────────────────────────────────
        tracts = list(tracts_col().find(
            {},
            {"tract_id": 1, "supply_score": 1, "transit_coverage": 1, "_id": 0},
        ))
        if not tracts:
            self.stderr.write(
                "census_tracts collection is empty. Run ingest_tracts first."
            )
            return

        self.stdout.write(f"Found {len(tracts)} tracts in MongoDB.")

        # ── Compute city-level income range for normalisation ──────────────────
        mhhinc_vals = [v for v in datasets["mhhinc"].values() if v is not None and v > 0]
        mhhinc_min  = min(mhhinc_vals) if mhhinc_vals else 20_000.0
        mhhinc_max  = max(mhhinc_vals) if mhhinc_vals else 120_000.0
        self.stdout.write(
            f"Income range: ${mhhinc_min:,.0f} – ${mhhinc_max:,.0f}"
        )

        # ── Compute and upsert scores ──────────────────────────────────────────
        updated = 0
        skipped = 0
        all_tract_docs: list[dict] = []

        for tract in tracts:
            geoid        = tract["tract_id"]
            supply_score = float(tract.get("supply_score", 0.5) or 0.5)
            transit_cov  = float(tract.get("transit_coverage", 0.5) or 0.5)

            p_fi_rate      = datasets["p_fi_rate"].get(geoid, 0.15)
            mhhinc         = datasets["mhhinc"].get(geoid, 60_000.0) or 60_000.0
            food_avg       = datasets["food_avg"].get(geoid, 8_000.0) or 8_000.0
            lilatracts_all = int(datasets["lilatracts_all"].get(geoid, 0) or 0)

            scores = compute_full_equity_score(
                p_fi_rate=p_fi_rate,
                mhhinc=mhhinc,
                food_avg=food_avg,
                lilatracts_all=lilatracts_all,
                supply_score=supply_score,
                transit_coverage=transit_cov,
                mhhinc_min=mhhinc_min,
                mhhinc_max=mhhinc_max,
            )

            update_fields = {
                "food_risk_score":   scores["food_risk_score"],
                "equity_score":      scores["equity_score"],
                "need_score":        scores["need_score"],
                "vulnerability_index": scores["vulnerability_index"],
                "equity_components": scores["equity_components"],
                "mhhinc":            mhhinc,
                "p_fi_rate":         p_fi_rate,
                "food_avg":          food_avg,
                "lila_flag":         lilatracts_all,
            }

            if not dry_run:
                result = tracts_col().update_one(
                    {"tract_id": geoid},
                    {"$set": update_fields},
                )
                if result.matched_count:
                    updated += 1
                else:
                    skipped += 1
            else:
                updated += 1

            all_tract_docs.append({**update_fields, "tract_id": geoid})

        # ── Recompute city_stats singleton ─────────────────────────────────────
        if not dry_run and updated > 0:
            city_stats = recompute_city_stats(all_tract_docs)
            from core.db import city_stats_col
            city_stats_col().replace_one(
                {"_id": "singleton"},
                {"_id": "singleton", **city_stats},
                upsert=True,
            )
            self.stdout.write(
                f"City stats updated: equity={city_stats['equity_score']:.4f}, "
                f"high_risk={city_stats['high_risk_tracts']}"
            )

        mode = "[DRY RUN] " if dry_run else ""
        self.stdout.write(
            self.style.SUCCESS(
                f"{mode}Updated {updated} tracts. Skipped {skipped} (no match)."
            )
        )

    # ── CSV helpers ────────────────────────────────────────────────────────────

    def _read_policymap_csv(self, path: Path, field_col: str) -> dict[str, float]:
        """
        Read a PolicyMap CSV with 2-row headers.

        Row 0 (index 0): human-readable column descriptions — skipped.
        Row 1 (index 1): technical column names used as actual headers.

        Returns:
            Dict mapping 11-digit GeoID strings to float values for field_col.
        """
        result: dict[str, float] = {}

        with open(path, encoding="utf-8", newline="") as fh:
            reader = csv.reader(fh)
            rows = list(reader)

        if len(rows) < 3:
            return result

        # Row index 1 = technical headers
        headers = [h.strip().strip('"') for h in rows[1]]

        try:
            geoid_idx = headers.index(_GEOID_COL)
            field_idx = headers.index(field_col)
        except ValueError:
            self.stderr.write(
                f"  WARNING: Column '{field_col}' or 'GeoID' not found in {path.name}"
            )
            return result

        # Data rows start at index 2
        for row in rows[2:]:
            if len(row) <= max(geoid_idx, field_idx):
                continue
            geoid   = row[geoid_idx].strip().strip('"')
            val_str = row[field_idx].strip().strip('"')

            if not geoid or val_str in ("", "N/A", "NULL", "null"):
                continue

            try:
                result[geoid] = float(val_str.replace(",", ""))
            except ValueError:
                pass

        return result
