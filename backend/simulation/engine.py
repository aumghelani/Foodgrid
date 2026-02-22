"""
Policy-intervention simulation engine for FoodGrid Boston.

Each intervention function is a pure function that accepts a tract-properties
dict (snake_case, matching the MongoDB schema) and returns a new dict with
updated scores. The original dict is never mutated.

Intervention deltas are intentionally conservative; they represent the
estimated effect of a single intervention at standard scale.

Households_reached is derived from the tract's population and a
coverage fraction that differs per intervention type.
"""
from __future__ import annotations

import copy
import logging
from typing import Callable

logger = logging.getLogger(__name__)

# ── Type alias ────────────────────────────────────────────────────────────────

TractDict = dict  # MongoDB document with snake_case fields

# ── Intervention registry ─────────────────────────────────────────────────────

_REGISTRY: dict[str, Callable[[TractDict], TractDict]] = {}


def _register(name: str) -> Callable:
    """Decorator that registers an intervention function by name."""
    def decorator(fn: Callable[[TractDict], TractDict]) -> Callable[[TractDict], TractDict]:
        _REGISTRY[name] = fn
        return fn
    return decorator


# ── Clamp helper ──────────────────────────────────────────────────────────────

def _clamp(value: float, lo: float = 0.0, hi: float = 1.0) -> float:
    """Clamp a float to [lo, hi]."""
    return max(lo, min(hi, value))


# ── Intervention functions ────────────────────────────────────────────────────

@_register("add_pantry")
def _add_pantry(tract: TractDict) -> TractDict:
    """
    Add a new food pantry to the tract.

    Effect:
      - food_risk_score  -= 0.08 × (1 − supply_score)
        A pantry in a well-supplied area does less marginal good.
      - equity_score     += 0.04  (improves access equity)
      - households_reached = population × 0.12
    """
    out = copy.deepcopy(tract)
    supply_score = 1.0 - out.get("food_risk_score", 0.5)
    out["food_risk_score"] = _clamp(out["food_risk_score"] - 0.08 * (1.0 - supply_score))
    out["equity_score"] = _clamp(out.get("equity_score", 0.5) + 0.04)
    out["households_reached"] = int(out.get("population", 0) * 0.12)
    return out


@_register("add_mobile")
def _add_mobile(tract: TractDict) -> TractDict:
    """
    Deploy a mobile food distribution unit.

    Effect:
      - food_risk_score  -= 0.05 × (1 − transit_coverage)
        Mobile units help most in transit-poor areas.
      - transit_coverage += 0.06  (effective coverage improvement)
      - households_reached = population × 0.07
    """
    out = copy.deepcopy(tract)
    transit = out.get("transit_coverage", 0.5)
    out["food_risk_score"] = _clamp(out["food_risk_score"] - 0.05 * (1.0 - transit))
    out["transit_coverage"] = _clamp(transit + 0.06)
    out["households_reached"] = int(out.get("population", 0) * 0.07)
    return out


@_register("extend_hours")
def _extend_hours(tract: TractDict) -> TractDict:
    """
    Extend operating hours at existing food resources.

    Effect:
      - food_risk_score  -= 0.03  (flat reduction — improves access time)
      - equity_score     += 0.02  (evening / weekend hours help working families)
      - households_reached = population × 0.04
    """
    out = copy.deepcopy(tract)
    out["food_risk_score"] = _clamp(out["food_risk_score"] - 0.03)
    out["equity_score"] = _clamp(out.get("equity_score", 0.5) + 0.02)
    out["households_reached"] = int(out.get("population", 0) * 0.04)
    return out


# ── Public API ────────────────────────────────────────────────────────────────

VALID_INTERVENTIONS: frozenset[str] = frozenset(_REGISTRY.keys())


def apply_interventions(tract: TractDict, interventions: list[str]) -> TractDict:
    """
    Apply a list of named interventions sequentially to a tract dict.

    Unknown intervention names are logged and skipped — they never raise,
    so the API remains responsive even when new intervention types are
    added to the frontend before the backend is updated.

    Args:
        tract:         MongoDB tract document (snake_case fields).
        interventions: Ordered list of intervention names to apply.

    Returns:
        A new dict with updated scores and a ``households_reached`` total
        that sums the individual contributions of each intervention.
    """
    result = copy.deepcopy(tract)
    total_households = 0

    for name in interventions:
        fn = _REGISTRY.get(name)
        if fn is None:
            logger.warning("Unknown intervention '%s' — skipped.", name)
            continue
        before_pop = result.get("population", 0)
        result = fn(result)
        # Accumulate households from each step; each fn sets households_reached
        # based on the current tract population, so sum them here.
        total_households += result.pop("households_reached", 0)
        # Restore population (interventions must not change it).
        result["population"] = before_pop

    result["households_reached"] = total_households
    return result
