"""
seed_mock_data.py — Populate MongoDB with development/demo data.

Run from the backend directory:
    python scripts/seed_mock_data.py

Or via Django:
    DJANGO_SETTINGS_MODULE=config.settings python scripts/seed_mock_data.py

The seed data is consistent with the frontend's BOSTON_TRACTS constant
(src/data/censusTracts.ts) so that map hover/click interactions work against
the real API during development without running the full ingestion pipeline.

Collections written:
  - census_tracts  (10 tracts — one per Boston neighbourhood)
  - food_resources (15 resources spread across high-risk tracts)
  - city_stats     (1 singleton document)
"""
import os
import sys
from pathlib import Path

# ── Bootstrap Django settings ─────────────────────────────────────────────────
# Supports running as a plain Python script *or* inside a Django shell.
if "django" not in sys.modules or not os.environ.get("DJANGO_SETTINGS_MODULE"):
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parents[1] / ".env")

    import django
    django.setup()

from core.db import city_stats_col, resources_col, tracts_col  # noqa: E402

# ─────────────────────────────────────────────────────────────────────────────
# Census Tracts
# Mirrors BOSTON_TRACTS in src/data/censusTracts.ts.
# tract_id uses the canonical 11-digit FIPS format.
# ─────────────────────────────────────────────────────────────────────────────

TRACTS = [
    {
        "tract_id":             "25025010100",
        "tract_name":           "Roxbury",
        "food_risk_score":      0.88,
        "equity_score":         0.31,
        "transit_coverage":     0.62,
        "food_insecurity_rate": 0.29,
        "poverty_rate":         0.34,
        "snap_rate":            0.41,
        "population":           28400,
    },
    {
        "tract_id":             "25025010200",
        "tract_name":           "Dorchester North",
        "food_risk_score":      0.80,
        "equity_score":         0.36,
        "transit_coverage":     0.69,
        "food_insecurity_rate": 0.26,
        "poverty_rate":         0.29,
        "snap_rate":            0.36,
        "population":           31800,
    },
    {
        "tract_id":             "25025010300",
        "tract_name":           "Dorchester South",
        "food_risk_score":      0.76,
        "equity_score":         0.38,
        "transit_coverage":     0.71,
        "food_insecurity_rate": 0.24,
        "poverty_rate":         0.27,
        "snap_rate":            0.34,
        "population":           38600,
    },
    {
        "tract_id":             "25025010400",
        "tract_name":           "Mattapan",
        "food_risk_score":      0.84,
        "equity_score":         0.29,
        "transit_coverage":     0.49,
        "food_insecurity_rate": 0.31,
        "poverty_rate":         0.36,
        "snap_rate":            0.44,
        "population":           21600,
    },
    {
        "tract_id":             "25025020100",
        "tract_name":           "South End",
        "food_risk_score":      0.42,
        "equity_score":         0.61,
        "transit_coverage":     0.88,
        "food_insecurity_rate": 0.12,
        "poverty_rate":         0.14,
        "snap_rate":            0.18,
        "population":           34100,
    },
    {
        "tract_id":             "25025020200",
        "tract_name":           "East Boston",
        "food_risk_score":      0.70,
        "equity_score":         0.44,
        "transit_coverage":     0.68,
        "food_insecurity_rate": 0.21,
        "poverty_rate":         0.23,
        "snap_rate":            0.28,
        "population":           44300,
    },
    {
        "tract_id":             "25025020300",
        "tract_name":           "Charlestown",
        "food_risk_score":      0.32,
        "equity_score":         0.68,
        "transit_coverage":     0.84,
        "food_insecurity_rate": 0.09,
        "poverty_rate":         0.10,
        "snap_rate":            0.12,
        "population":           17800,
    },
    {
        "tract_id":             "25025030100",
        "tract_name":           "Jamaica Plain",
        "food_risk_score":      0.48,
        "equity_score":         0.58,
        "transit_coverage":     0.76,
        "food_insecurity_rate": 0.15,
        "poverty_rate":         0.16,
        "snap_rate":            0.19,
        "population":           38200,
    },
    {
        "tract_id":             "25025030200",
        "tract_name":           "Hyde Park",
        "food_risk_score":      0.63,
        "equity_score":         0.47,
        "transit_coverage":     0.54,
        "food_insecurity_rate": 0.19,
        "poverty_rate":         0.21,
        "snap_rate":            0.26,
        "population":           29500,
    },
    {
        "tract_id":             "25025030300",
        "tract_name":           "Downtown / Financial District",
        "food_risk_score":      0.20,
        "equity_score":         0.81,
        "transit_coverage":     0.97,
        "food_insecurity_rate": 0.06,
        "poverty_rate":         0.08,
        "snap_rate":            0.07,
        "population":           18900,
    },
]

# ─────────────────────────────────────────────────────────────────────────────
# Food Resources
# 15 resources spread across Boston neighbourhoods, sourced from the USDA
# datasets included in backend/PolicyMap Data/.
# Coordinates are WGS-84 [longitude, latitude].
# ─────────────────────────────────────────────────────────────────────────────

RESOURCES = [
    # ── Roxbury ───────────────────────────────────────────────────────────────
    {
        "resource_id":  "dudley-farmers-market-310624",
        "name":         "Dudley Farmers Market",
        "type":         "market",
        "address":      "427 Dudley St, Boston, MA 02119",
        "coordinates":  [-71.0832, 42.3277],
        "snap":         True,
        "free":         False,
        "tract_id":     "25025010100",
        "source":       "USDA",
    },
    {
        "resource_id":  "tropical-foods-international-abc123",
        "name":         "Tropical Foods International",
        "type":         "grocery",
        "address":      "450 Melnea Cass Blvd, Roxbury, MA 02119",
        "coordinates":  [-71.0823, 42.3311],
        "snap":         True,
        "free":         False,
        "tract_id":     "25025010100",
        "source":       "USDA",
    },
    # ── Dorchester North ──────────────────────────────────────────────────────
    {
        "resource_id":  "dorchester-winter-farmers-market-310622",
        "name":         "Dorchester Winter Farmers' Market",
        "type":         "market",
        "address":      "6 Norfolk St, Boston, MA 02124",
        "coordinates":  [-71.0671, 42.3049],
        "snap":         True,
        "free":         False,
        "tract_id":     "25025010200",
        "source":       "USDA",
    },
    {
        "resource_id":  "truong-thinh-ii-market-def456",
        "name":         "Truong Thinh II Market",
        "type":         "grocery",
        "address":      "1305 Dorchester Ave, Dorchester, MA 02122",
        "coordinates":  [-71.0682, 42.3022],
        "snap":         True,
        "free":         False,
        "tract_id":     "25025010200",
        "source":       "USDA",
    },
    # ── Mattapan ──────────────────────────────────────────────────────────────
    {
        "resource_id":  "mattapan-farmers-market-310663",
        "name":         "Mattapan Farmers' Market",
        "type":         "market",
        "address":      "525 River St, Mattapan, MA 02126",
        "coordinates":  [-71.0928, 42.2730],
        "snap":         True,
        "free":         False,
        "tract_id":     "25025010400",
        "source":       "USDA",
    },
    {
        "resource_id":  "community-servings-food-pantry-ghi789",
        "name":         "Community Servings Food Pantry",
        "type":         "pantry",
        "address":      "18 Marbury Terrace, Jamaica Plain, MA 02130",
        "coordinates":  [-71.1115, 42.3123],
        "snap":         False,
        "free":         True,
        "tract_id":     "25025010400",
        "source":       "USDA",
    },
    # ── East Boston ───────────────────────────────────────────────────────────
    {
        "resource_id":  "east-boston-grocery-jkl012",
        "name":         "Eagle Market (East Boston)",
        "type":         "grocery",
        "address":      "198 Maverick St, East Boston, MA 02128",
        "coordinates":  [-71.0378, 42.3710],
        "snap":         True,
        "free":         False,
        "tract_id":     "25025020200",
        "source":       "USDA",
    },
    {
        "resource_id":  "east-boston-pantry-mno345",
        "name":         "East Boston Neighborhood Health Center Food Pantry",
        "type":         "pantry",
        "address":      "10 Gove St, East Boston, MA 02128",
        "coordinates":  [-71.0388, 42.3678],
        "snap":         False,
        "free":         True,
        "tract_id":     "25025020200",
        "source":       "seed",
    },
    # ── Hyde Park ─────────────────────────────────────────────────────────────
    {
        "resource_id":  "hyde-park-star-market-pqr678",
        "name":         "Star Market Hyde Park",
        "type":         "grocery",
        "address":      "1377 Hyde Park Ave, Hyde Park, MA 02136",
        "coordinates":  [-71.1264, 42.2558],
        "snap":         True,
        "free":         False,
        "tract_id":     "25025030200",
        "source":       "USDA",
    },
    # ── Jamaica Plain ─────────────────────────────────────────────────────────
    {
        "resource_id":  "community-servings-farmers-market-310614",
        "name":         "Community Servings' Farmers' Market",
        "type":         "market",
        "address":      "18 Marbury Terrace, Jamaica Plain, MA 02130",
        "coordinates":  [-71.1115, 42.3123],
        "snap":         False,
        "free":         False,
        "tract_id":     "25025030100",
        "source":       "USDA",
    },
    {
        "resource_id":  "whole-foods-jp-stu901",
        "name":         "Whole Foods Market (Jamaica Plain)",
        "type":         "grocery",
        "address":      "415 Centre St, Jamaica Plain, MA 02130",
        "coordinates":  [-71.1131, 42.3172],
        "snap":         True,
        "free":         False,
        "tract_id":     "25025030100",
        "source":       "seed",
    },
    # ── South End ─────────────────────────────────────────────────────────────
    {
        "resource_id":  "south-end-food-pantry-vwx234",
        "name":         "South End Food Pantry",
        "type":         "pantry",
        "address":      "95 Berkeley St, Boston, MA 02116",
        "coordinates":  [-71.0694, 42.3467],
        "snap":         False,
        "free":         True,
        "tract_id":     "25025020100",
        "source":       "seed",
    },
    # ── Charlestown ───────────────────────────────────────────────────────────
    {
        "resource_id":  "charlestown-market-basket-yza567",
        "name":         "Market Basket (Charlestown)",
        "type":         "grocery",
        "address":      "3 Rutherford Ave, Charlestown, MA 02129",
        "coordinates":  [-71.0679, 42.3785],
        "snap":         True,
        "free":         False,
        "tract_id":     "25025020300",
        "source":       "seed",
    },
    # ── Downtown ──────────────────────────────────────────────────────────────
    {
        "resource_id":  "boston-public-market-310596",
        "name":         "Boston Public Market on the Greenway",
        "type":         "market",
        "address":      "136 Blackstone St, Boston, MA 02202",
        "coordinates":  [-71.0545, 42.3605],
        "snap":         True,
        "free":         False,
        "tract_id":     "25025030300",
        "source":       "USDA",
    },
    # ── Allston-Brighton (mobile unit) ────────────────────────────────────────
    {
        "resource_id":  "gb-mobile-food-truck-bcd890",
        "name":         "Greater Boston Food Bank Mobile Market",
        "type":         "mobile",
        "address":      "20 Fordham Rd, Brighton, MA 02135",
        "coordinates":  [-71.1512, 42.3502],
        "snap":         True,
        "free":         True,
        "tract_id":     None,
        "source":       "seed",
    },
]

# ─────────────────────────────────────────────────────────────────────────────
# City stats singleton
# ─────────────────────────────────────────────────────────────────────────────

CITY_STATS = {
    "_id":             "singleton",   # must match city_stats view query
    "_type":           "city_stats",
    "equity_score":    0.52,
    "transit_coverage": 0.70,
    "high_risk_tracts": 4,
    "total_tracts":    10,
}


# ─────────────────────────────────────────────────────────────────────────────
# Seed runner
# ─────────────────────────────────────────────────────────────────────────────

def seed():
    print("=== FoodGrid Boston — seed_mock_data ===\n")

    # ── Tracts ────────────────────────────────────────────────────────────────
    col_t = tracts_col()
    t_upserted = 0
    for tract in TRACTS:
        r = col_t.update_one(
            {"tract_id": tract["tract_id"]},
            {"$set": tract},
            upsert=True,
        )
        if r.upserted_id or r.modified_count:
            t_upserted += 1
    print(f"Tracts   : {t_upserted}/{len(TRACTS)} upserted.")

    # ── Resources ─────────────────────────────────────────────────────────────
    col_r = resources_col()
    r_upserted = 0
    for resource in RESOURCES:
        r = col_r.update_one(
            {"resource_id": resource["resource_id"]},
            {"$set": resource},
            upsert=True,
        )
        if r.upserted_id or r.modified_count:
            r_upserted += 1
    print(f"Resources: {r_upserted}/{len(RESOURCES)} upserted.")

    # ── City stats ────────────────────────────────────────────────────────────
    col_s = city_stats_col()
    col_s.update_one(
        {"_id": "singleton"},
        {"$set": CITY_STATS},
        upsert=True,
    )
    print("City stats: updated.")

    print("\nDone. MongoDB collections are ready for development.")


if __name__ == "__main__":
    seed()
