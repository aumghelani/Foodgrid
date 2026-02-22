"""
Data parsers for the FoodGrid Boston ingestion pipeline.

All PolicyMap exports follow a consistent two-row-header CSV convention:
  - Row 0: human-readable column descriptions
  - Row 1: short technical column names (GeoID, rpopden, mhhinc, …)
  - Row 2+: data rows

Use ``read_policymap_csv()`` to load any PolicyMap file; it skips the
descriptive row and returns a DataFrame keyed on technical column names.

The score-derivation helpers (``derive_tract_metrics``) convert the raw
PolicyMap columns into the canonical MongoDB document shape expected by the
``census_tracts`` collection.  All intermediate calculations reference the
tracts.scoring module so the weighting formula stays in one place.
"""
from __future__ import annotations

import hashlib
import logging
import re
from typing import Any

import pandas as pd

logger = logging.getLogger(__name__)

# ── PolicyMap CSV helpers ─────────────────────────────────────────────────────

def read_policymap_csv(path: str) -> pd.DataFrame:
    """
    Read a PolicyMap export CSV, handling the two-row header convention.

    PolicyMap CSVs have a descriptive header row (row 0) followed by a
    technical header row (row 1) that contains the actual column names used
    in the data model (e.g. "GeoID", "rpopden", "mhhinc").

    The function:
      1. Skips row 0 (descriptive names).
      2. Uses row 1 as column headers.
      3. Returns a DataFrame with all columns as strings (casting happens
         downstream in ``derive_tract_metrics``).

    Args:
        path: Absolute or relative path to the CSV file.

    Returns:
        pandas DataFrame indexed by default integer index.
    """
    return pd.read_csv(path, skiprows=[0], header=0, dtype=str)


def _clean_numeric(raw: Any) -> float | None:
    """
    Parse a PolicyMap numeric string to float.

    Handles:
      - "N/A" / empty → None
      - Dollar amounts: "$151,466" → 151466.0
      - Percentages:    "23.43%"  → 23.43
      - Plain numbers:  "17264.96" → 17264.96
    """
    if raw is None:
        return None
    s = str(raw).strip()
    if not s or s.upper() == "N/A":
        return None
    # Strip dollar signs and commas.
    s = s.replace("$", "").replace(",", "").replace("%", "").strip()
    try:
        return float(s)
    except ValueError:
        return None


def _clamp(value: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, float(value)))


# ── GeoID / tract-name utilities ──────────────────────────────────────────────

def geoid_to_tract_name(geoid: str) -> str:
    """
    Convert an 11-digit FIPS GeoID to a readable census tract name.

    Format: SSCCCTTTTTT
      SS  = 2-digit state FIPS (25 = MA)
      CCC = 3-digit county FIPS (025 = Suffolk)
      TTTTTT = 6-digit tract code (leading-zero-padded)

    The last two digits of the tract code are the decimal sub-tract suffix.

    Examples:
      "25025000101" → "Census Tract 1.01"
      "25025010100" → "Census Tract 101"
    """
    geoid = str(geoid).strip()
    if len(geoid) != 11:
        return f"Tract {geoid}"
    tract_raw = geoid[5:]          # "000101"
    main_part  = int(tract_raw[:4])  # 1
    sub_part   = tract_raw[4:]       # "01"
    if sub_part == "00":
        return f"Census Tract {main_part}"
    return f"Census Tract {main_part}.{sub_part}"


# ── Tract metric derivation ───────────────────────────────────────────────────

# Boston-specific normalisation anchors derived from the PolicyMap dataset.
# Adjust if reloading with newer or broader geographic exports.
_INCOME_LOW  =  23_000.0   # lowest observed mhhinc (approx.)
_INCOME_HIGH = 250_000.0   # practical ceiling (250 001+ cases)
_DENSITY_TRANSIT_CUTOFF = 40_000.0  # ppl/sq mi — above this = excellent transit
_FOOD_SPEND_LOW  =  6_000.0
_FOOD_SPEND_HIGH = 16_000.0
_COUNTY_SNAP_RATE = 0.2343  # Suffolk County average — used when tract-level unavailable


def derive_tract_metrics(
    geoid: str,
    mhhinc:    float | None,
    rpopden:   float | None,
    food_avg:  float | None,
    lilatracts_all: str | None,
    lowmod_hh: float | None,
) -> dict[str, Any]:
    """
    Derive the full census-tract MongoDB document from raw PolicyMap columns.

    All sub-scores are normalised to [0, 1] before being fed into the
    canonical FoodRiskScore formula (see ``tracts.scoring``).

    **Normalisation strategy:**

    - ``need_score``:
        Primarily driven by median household income (lower income → more
        need).  A secondary signal from average food spending (lower
        spending → greater food hardship).

    - ``supply_score``:
        Driven by the USDA LILA flag.  A tract flagged "Low Income and Low
        Access" is treated as having near-zero food supply; all other tracts
        receive full supply credit.  This is a binary signal because LILA
        is the USDA's primary food-desert indicator.

    - ``transit_score``:
        Population density used as a proxy for MBTA accessibility.  Boston's
        transit network correlates strongly with density — the T runs through
        the densest neighbourhoods.  A density of 40 k ppl/sq mi is treated
        as the "full transit" threshold.

    - ``vulnerability_index``:
        Derived from the income-relative-to-AMI indicator (``lowmod_hh``).
        A value below 80 % AMI is the federal LMI threshold; below 50 % AMI
        is the extreme-poverty threshold.

    Args:
        geoid:          11-digit FIPS census tract identifier.
        mhhinc:         Median household income in dollars, or None.
        rpopden:        Population density (ppl/sq mile), or None.
        food_avg:       Average annual household food spending ($), or None.
        lilatracts_all: USDA LILA flag string, or None.
        lowmod_hh:      Low/mod income households as % of area median income,
                        or None.

    Returns:
        Dict matching the census_tracts MongoDB document schema.
    """
    # ── Defaults for missing values ────────────────────────────────────────
    mhhinc   = mhhinc   if mhhinc   is not None else 60_000.0
    rpopden  = rpopden  if rpopden  is not None else 15_000.0
    food_avg = food_avg if food_avg is not None else 10_000.0
    # lowmod_hh is a %; default to 80 (= at AMI threshold)
    lowmod_hh = lowmod_hh if lowmod_hh is not None else 80.0

    # ── LILA flag ──────────────────────────────────────────────────────────
    lila_flag = 1.0 if (
        lilatracts_all and "Low Income and Low Access" in lilatracts_all
        and "Not" not in lilatracts_all
    ) else 0.0

    # ── Sub-scores ─────────────────────────────────────────────────────────
    # need_score: lower income + lower food spending → higher need
    income_need  = _clamp(1.0 - (mhhinc - _INCOME_LOW) / (_INCOME_HIGH - _INCOME_LOW))
    spend_need   = _clamp(1.0 - (food_avg - _FOOD_SPEND_LOW) / (_FOOD_SPEND_HIGH - _FOOD_SPEND_LOW))
    need_score   = _clamp(0.6 * income_need + 0.4 * spend_need)

    # supply_score: LILA = 0 supply; non-LILA = full supply
    supply_score = 1.0 - lila_flag

    # transit_score: population density proxy
    transit_score = _clamp(rpopden / _DENSITY_TRANSIT_CUTOFF)

    # vulnerability_index: low income relative to AMI
    # lowmod_hh=100 means AT the AMI; <80 = LMI; <50 = extreme poverty
    vulnerability = _clamp(1.0 - lowmod_hh / 100.0)

    # ── Canonical food risk score (tracts.scoring formula) ─────────────────
    from tracts.scoring import compute_food_risk_score, compute_vulnerability_index
    vuln_index = compute_vulnerability_index(
        poverty_rate=_clamp(vulnerability),
        snap_rate=_COUNTY_SNAP_RATE,
    )
    food_risk_score = compute_food_risk_score(
        need_score=need_score,
        supply_score=supply_score,
        transit_score=transit_score,
        vulnerability_index=vuln_index,
    )

    # ── Equity score proxy ─────────────────────────────────────────────────
    # High-need access rate: inversely proportional to income need + LILA.
    # Low-need access rate: set to 1.0 (well-off residents always have access).
    from tracts.scoring import compute_equity_score
    equity_score = compute_equity_score(
        high_need_access_rate=_clamp(supply_score * transit_score),
        low_need_access_rate=1.0,
    )

    # ── Derived demographic proxies ────────────────────────────────────────
    poverty_rate         = _clamp(vulnerability * 0.7)        # LMI → rough poverty proxy
    snap_rate            = _COUNTY_SNAP_RATE                   # tract-level not available
    food_insecurity_rate = _clamp(0.5 * income_need + 0.5 * lila_flag)
    transit_coverage     = transit_score
    # Population estimate: density × approx average Boston tract area (0.45 sq mi)
    population           = max(1, int(rpopden * 0.45))

    return {
        "tract_id":            geoid,
        "tract_name":          geoid_to_tract_name(geoid),
        # Scores
        "food_risk_score":     food_risk_score,
        "equity_score":        equity_score,
        "transit_coverage":    round(transit_coverage, 4),
        # Demographic indicators
        "food_insecurity_rate": round(food_insecurity_rate, 4),
        "poverty_rate":        round(poverty_rate, 4),
        "snap_rate":           round(snap_rate, 4),
        "population":          population,
        # Raw PolicyMap values (kept for provenance / re-scoring)
        "raw": {
            "mhhinc":       mhhinc,
            "rpopden":      rpopden,
            "food_avg":     food_avg,
            "lila":         bool(lila_flag),
            "lowmod_hh":    lowmod_hh,
        },
    }


# ── Food-resource parsers ─────────────────────────────────────────────────────

# Maps USDA store_type values to FoodGrid resource types.
STORE_TYPE_MAP: dict[str, str] = {
    "supermarket":              "grocery",
    "super store":              "grocery",
    "grocery store":            "grocery",
    "specialty store":          "grocery",
    "farmers and markets":      "market",
    "restaurant meals program": "pantry",
}

# Store types to skip entirely (convenience stores provide poor food security value).
SKIP_STORE_TYPES = {"convenience store", "other", ""}


def _slugify(text: str) -> str:
    """Convert a display name to a URL-safe slug for use as resource_id."""
    s = text.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def _make_resource_id(name: str, address: str) -> str:
    """
    Generate a stable resource_id from name + address.

    Uses the first 8 hex chars of a SHA-1 hash to keep IDs short while
    still being collision-resistant within Boston's ~600-store dataset.
    """
    raw = f"{name.lower().strip()}|{address.lower().strip()}"
    return _slugify(name)[:30] + "-" + hashlib.sha1(raw.encode()).hexdigest()[:6]


def parse_food_store_row(row: dict[str, Any]) -> dict[str, Any] | None:
    """
    Normalise a USDA food store CSV row into a food-resource MongoDB document.

    Rows with store types in SKIP_STORE_TYPES are filtered out (returns None).
    The returned document will NOT have coordinates — the caller is responsible
    for geocoding and setting ``coordinates: [lng, lat]``.

    Args:
        row: Dict with keys from the PolicyMap food store CSV technical header
             (store_name, address, city, state, zip5, store_type, …).

    Returns:
        Normalised document dict, or None if the store should be skipped.
    """
    store_type_raw = str(row.get("store_type", "")).strip().lower()
    resource_type  = STORE_TYPE_MAP.get(store_type_raw)

    if resource_type is None:
        if store_type_raw not in SKIP_STORE_TYPES:
            logger.debug("Unknown store type '%s' — skipping.", store_type_raw)
        return None

    name    = str(row.get("store_name", "")).strip()
    addr    = str(row.get("address",    "")).strip()
    addr2   = str(row.get("address2",   "")).strip()
    city    = str(row.get("city",       "")).strip()
    state   = str(row.get("state",      "MA")).strip()
    zipcode = str(row.get("zip5",       "")).strip()

    full_address = ", ".join(filter(None, [
        " ".join(filter(None, [addr, addr2])),
        city, state, zipcode,
    ]))

    incentive = str(row.get("incentive_program", "")).strip()
    snap_accepted = bool(incentive)  # non-empty incentive programme → SNAP/WIC likely

    return {
        "resource_id": _make_resource_id(name, full_address),
        "name":        name or "Unknown Store",
        "type":        resource_type,
        "address":     full_address,
        "snap":        snap_accepted,
        "free":        False,
        "coordinates": None,  # caller must geocode
        "source":      "USDA",
    }


def parse_farmers_market_row(row: dict[str, Any]) -> dict[str, Any]:
    """
    Normalise a USDA farmers-market CSV row into a food-resource MongoDB document.

    The address field in the farmers-market CSV is a single combined string
    (e.g. "18 Marbury Terrace Jamaica Plain, MA 02130").

    Returned document will NOT have coordinates — the caller must geocode.

    Args:
        row: Dict with keys from the PolicyMap farmers market CSV technical header
             (marketname, location_address, fsnap, listing_id, …).

    Returns:
        Normalised document dict.
    """
    name    = str(row.get("marketname",        "")).strip() or "Farmers Market"
    address = str(row.get("location_address",  "")).strip()
    fsnap   = str(row.get("fsnap",             "")).strip().lower()
    listing_id = str(row.get("listing_id",     "")).strip()

    snap_accepted = "snap" in fsnap or "ebt" in fsnap or "wic" in fsnap

    return {
        "resource_id": f"market-{listing_id}" if listing_id else _make_resource_id(name, address),
        "name":        name,
        "type":        "market",
        "address":     address,
        "snap":        snap_accepted,
        "free":        False,
        "coordinates": None,  # caller must geocode
        "source":      "USDA",
    }
