"""
Food Risk Score engine for FoodGrid Boston.

Canonical formula (weights sum to 1.0):
  FoodRiskScore = 0.4 × need_score
                + 0.3 × (1 - supply_score)
                + 0.2 × (1 - transit_score)
                + 0.1 × vulnerability_index

All inputs and outputs are in the range [0.0, 1.0].
Higher scores indicate worse food access conditions.

This module contains only pure functions — no I/O, no Django, no pymongo.
It is safe to import and unit-test in isolation.
"""


def normalize(value: float, min_val: float, max_val: float) -> float:
    """
    Min-max normalise a value to the [0.0, 1.0] range.

    Args:
        value:   The raw value to normalise.
        min_val: Observed minimum across the dataset.
        max_val: Observed maximum across the dataset.

    Returns:
        Normalised float in [0.0, 1.0]. Returns 0.0 if min_val == max_val
        (degenerate case — all values identical).
    """
    if max_val == min_val:
        return 0.0
    return float((value - min_val) / (max_val - min_val))


def compute_food_risk_score(
    need_score: float,
    supply_score: float,
    transit_score: float,
    vulnerability_index: float,
) -> float:
    """
    Compute the canonical Food Risk Score for a census tract.

    Higher scores indicate worse food access. The formula is a weighted
    composite of four normalised sub-scores:

      - need_score (40%):           Food insecurity composite (higher = more need).
      - supply_score (30%):         Food resource density (higher = better supply;
                                    inverted so that high supply lowers risk).
      - transit_score (20%):        Transit-accessible food access (higher = better;
                                    inverted so that low coverage raises risk).
      - vulnerability_index (10%):  Composite of poverty, SNAP uptake, language
                                    barrier, elderly / disabled population shares.

    Args:
        need_score:          Normalised food insecurity composite [0, 1].
        supply_score:        Normalised food resources per capita [0, 1].
        transit_score:       Normalised MBTA-accessible coverage [0, 1].
        vulnerability_index: Normalised vulnerability composite [0, 1].

    Returns:
        Float rounded to 4 decimal places, clamped to [0.0, 1.0].
    """
    raw = (
        0.4 * need_score
        + 0.3 * (1.0 - supply_score)
        + 0.2 * (1.0 - transit_score)
        + 0.1 * vulnerability_index
    )
    return round(float(max(0.0, min(1.0, raw))), 4)


def compute_equity_score(
    high_need_access_rate: float,
    low_need_access_rate: float,
) -> float:
    """
    Compute an equity score measuring relative food access parity.

    The equity score is the ratio of food access rates between high-need and
    low-need populations within a tract. A score of 1.0 represents perfect
    parity; lower values indicate that high-need residents have proportionally
    worse access than their low-need neighbours.

    Args:
        high_need_access_rate: Fraction of high-need residents with adequate
                               food access (0.0–1.0).
        low_need_access_rate:  Fraction of low-need residents with adequate
                               food access (0.0–1.0).

    Returns:
        Float rounded to 4 decimal places, clamped to [0.0, 1.0].
        Returns 0.0 if low_need_access_rate is zero (no low-need baseline).
    """
    if low_need_access_rate == 0:
        return 0.0
    return round(float(min(1.0, high_need_access_rate / low_need_access_rate)), 4)


def compute_vulnerability_index(
    poverty_rate: float,
    snap_rate: float,
    pct_non_english: float = 0.0,
    pct_elderly: float = 0.0,
    pct_disabled: float = 0.0,
) -> float:
    """
    Compute a composite vulnerability index from demographic indicators.

    Weights are based on their known correlation with food insecurity barriers:
      - Poverty rate (35%):         Primary economic barrier.
      - SNAP rate (25%):            Proxy for food assistance dependency.
      - Non-English speaking (20%): Navigation barrier for assistance programmes.
      - Elderly population (10%):   Mobility and access limitation.
      - Disabled population (10%):  Mobility and access limitation.

    Args:
        poverty_rate:     Fraction of residents below federal poverty line.
        snap_rate:        Fraction of households receiving SNAP benefits.
        pct_non_english:  Fraction of residents who speak English "less than
                          very well" (ACS concept).
        pct_elderly:      Fraction of residents aged 65+.
        pct_disabled:     Fraction of residents with a disability.

    Returns:
        Float rounded to 4 decimal places, clamped to [0.0, 1.0].
    """
    raw = (
        0.35 * poverty_rate
        + 0.25 * snap_rate
        + 0.20 * pct_non_english
        + 0.10 * pct_elderly
        + 0.10 * pct_disabled
    )
    return round(float(max(0.0, min(1.0, raw))), 4)


def compute_full_equity_score(
    *,
    p_fi_rate: float = 0.15,
    mhhinc: float = 60_000.0,
    food_avg: float = 8_000.0,
    lilatracts_all: int = 0,
    supply_score: float = 0.5,
    transit_coverage: float = 0.5,
    mhhinc_min: float = 20_000.0,
    mhhinc_max: float = 120_000.0,
) -> dict:
    """
    Compute the full equity score using a 5-component formula with LILA bonus.

    Components (weights sum to 1.0):
      Need        (35%): food insecurity rate [0, 1]
      Income Gap  (20%): normalised inverse of median household income
      Food Burden (15%): ratio of food spending to income, capped at 0.40
      Access      (20%): 50% LILA flag + 50% low transit coverage
      Resource    (10%): inverse of supply density score

    LILA bonus: if lilatracts_all == 1, food_risk_score is bumped +0.15
    (clamped to 1.0) to reflect the USDA 'food desert' classification.

    Args:
        p_fi_rate:        Food insecurity rate as a fraction or percentage.
                          Values > 1.0 are divided by 100 automatically.
        mhhinc:           Median household income in dollars.
        food_avg:         Annual food spending per household in dollars.
        lilatracts_all:   USDA LILA classification flag (0 or 1).
        supply_score:     Food resource density normalised to [0, 1].
        transit_coverage: Transit accessibility normalised to [0, 1].
        mhhinc_min:       City-wide minimum median household income.
        mhhinc_max:       City-wide maximum median household income.

    Returns:
        Dict with keys:
          food_risk_score, equity_score, need_score, vulnerability_index,
          supply_score, and equity_components (per-component breakdown).
    """
    # Normalise p_fi_rate: values > 1 are percentages
    if p_fi_rate > 1.0:
        p_fi_rate = p_fi_rate / 100.0
    p_fi_rate = float(max(0.0, min(1.0, p_fi_rate)))

    # Need (35%): raw food insecurity rate
    need = p_fi_rate

    # Income Gap (20%): lower income = higher risk
    income_gap = 1.0 - normalize(mhhinc, mhhinc_min, mhhinc_max)

    # Food Burden (15%): food_avg/mhhinc ratio, max 40% = full burden
    if mhhinc and mhhinc > 0:
        burden_ratio = food_avg / mhhinc
    else:
        burden_ratio = 0.20
    food_burden = float(min(1.0, burden_ratio / 0.40))

    # Access (20%): LILA flag + low transit coverage
    access = 0.5 * float(lilatracts_all) + 0.5 * (1.0 - float(transit_coverage))
    access = float(max(0.0, min(1.0, access)))

    # Resource (10%): inverse supply density
    resource = 1.0 - float(supply_score)

    raw_risk = (
        0.35 * need
        + 0.20 * income_gap
        + 0.15 * food_burden
        + 0.20 * access
        + 0.10 * resource
    )

    # LILA bonus
    if lilatracts_all:
        raw_risk += 0.15

    food_risk_score = round(float(max(0.0, min(1.0, raw_risk))), 4)
    equity_score    = round(1.0 - food_risk_score, 4)

    return {
        "food_risk_score":     food_risk_score,
        "equity_score":        equity_score,
        "need_score":          round(need, 4),
        "vulnerability_index": round((income_gap + food_burden) / 2.0, 4),
        "supply_score":        round(float(supply_score), 4),
        "equity_components": {
            "need":        round(need, 4),
            "income_gap":  round(income_gap, 4),
            "food_burden": round(food_burden, 4),
            "access":      round(access, 4),
            "resource":    round(resource, 4),
        },
    }


def recompute_city_stats(tract_docs: list[dict]) -> dict:
    """
    Recompute city-wide aggregate statistics from a list of tract documents.

    Args:
        tract_docs: List of census_tracts documents as plain Python dicts.

    Returns:
        Dict matching the city_stats document schema:
          equity_score, transit_coverage, high_risk_tracts, total_tracts.
    """
    if not tract_docs:
        return {
            "equity_score": 0.0,
            "transit_coverage": 0.0,
            "high_risk_tracts": 0,
            "total_tracts": 0,
        }

    equity_scores = [float(d.get("equity_score", 0.0)) for d in tract_docs]
    transit_coverages = [float(d.get("transit_coverage", 0.0)) for d in tract_docs]
    high_risk = sum(1 for d in tract_docs if float(d.get("food_risk_score", 0.0)) > 0.75)

    return {
        "equity_score": round(sum(equity_scores) / len(equity_scores), 4),
        "transit_coverage": round(sum(transit_coverages) / len(transit_coverages), 4),
        "high_risk_tracts": high_risk,
        "total_tracts": len(tract_docs),
    }
