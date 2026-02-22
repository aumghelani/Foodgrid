"""
store_hierarchy.py — Single source of truth for food store category classification.

Python equivalent of frontend/src/data/storeHierarchy.ts.
Used by:
  - resources/views.py   → enrich API response with price/category fields
  - ingestion commands   → classify stores during import
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional


# ─── Data classes ─────────────────────────────────────────────────────────────

@dataclass(frozen=True)
class StoreTier:
    label:       str
    short_label: str
    icon:        str
    price_score: float   # 0.0 (free) → 1.0 (most expensive)
    price_tier:  str
    price_label: str     # e.g. "$$$$", empty string for free
    price_dots:  int     # 0–5 filled dots
    hex_color:   str
    category:    str     # StoreCategory string key


# ─── Hierarchy ────────────────────────────────────────────────────────────────

STORE_HIERARCHY: dict[str, StoreTier] = {
    "convenience": StoreTier(
        label="Convenience Store",
        short_label="Convenience",
        icon="ShoppingBag",
        price_score=0.95,
        price_tier="Very High",
        price_label="$$$$",
        price_dots=5,
        hex_color="#ef4444",
        category="convenience",
    ),
    "supermarket": StoreTier(
        label="Supermarket / Chain",
        short_label="Supermarket",
        icon="Store",
        price_score=0.65,
        price_tier="Moderate-High",
        price_label="$$$",
        price_dots=3,
        hex_color="#f59e0b",
        category="supermarket",
    ),
    "grocery": StoreTier(
        label="Independent Grocery",
        short_label="Grocery",
        icon="ShoppingCart",
        price_score=0.50,
        price_tier="Moderate",
        price_label="$$",
        price_dots=2,
        hex_color="#84cc16",
        category="grocery",
    ),
    "wholesale": StoreTier(
        label="Wholesale / Club",
        short_label="Wholesale",
        icon="Warehouse",
        price_score=0.35,
        price_tier="Low (bulk)",
        price_label="$",
        price_dots=2,
        hex_color="#3b82f6",
        category="wholesale",
    ),
    "farmersmarket": StoreTier(
        label="Farmer's Market",
        short_label="Market",
        icon="Leaf",
        price_score=0.25,
        price_tier="Low",
        price_label="$",
        price_dots=1,
        hex_color="#8b5cf6",
        category="farmersmarket",
    ),
    "pantry": StoreTier(
        label="Food Pantry",
        short_label="Pantry",
        icon="Heart",
        price_score=0.0,
        price_tier="Free",
        price_label="",
        price_dots=0,
        hex_color="#10b981",
        category="pantry",
    ),
    "mobile": StoreTier(
        label="Mobile Food Unit",
        short_label="Mobile",
        icon="Truck",
        price_score=0.0,
        price_tier="Free",
        price_label="",
        price_dots=0,
        hex_color="#06b6d4",
        category="mobile",
    ),
}

# Ordered most-expensive → least-expensive
PRICE_ORDER: list[str] = [
    "convenience",
    "supermarket",
    "grocery",
    "wholesale",
    "farmersmarket",
    "pantry",
    "mobile",
]


# ─── Classification helpers ───────────────────────────────────────────────────

def classify_store_type(backend_type: str, store_name: str = "") -> str:
    """
    Map a backend resource type (or freeform store_type string) to a
    StoreCategory key.

    Backend types: 'pantry' | 'grocery' | 'market' | 'mobile'
    PolicyMap store_type examples:
        "Supermarket", "Super Store", "Convenience Store",
        "Grocery Store", "Specialty Food Store", "Wholesale Club"
    """
    t = (backend_type or "").lower().strip()
    n = (store_name or "").lower().strip()

    # Direct backend type passthrough
    if t == "pantry":  return "pantry"
    if t == "mobile":  return "mobile"
    if t == "market":  return "farmersmarket"

    # PolicyMap store_type strings
    if "convenience" in t:                      return "convenience"
    if "super store" in t or t == "supermarket": return "supermarket"
    if "wholesale" in t or "club" in t:         return "wholesale"
    if "farmers" in t or "farm market" in t:    return "farmersmarket"
    if "grocery" in t:                          return "grocery"

    # Chain name heuristics (name-based fallback)
    if re.search(r"7.?eleven|circle k|cumberland|speedway|wawa", n):
        return "convenience"
    if re.search(r"costco|bj'?s|sam'?s club", n):
        return "wholesale"
    if re.search(
        r"whole foods|trader joe|wegmans|star market|stop & shop|shaw|hannaford|aldi|market basket",
        n,
    ):
        return "supermarket"

    # Default grocery bucket
    return "grocery"


def get_chain_price_score(store_name: str) -> Optional[float]:
    """
    Returns a price score override for known chain names, or None if unknown.
    """
    n = store_name.lower()
    if "whole foods" in n:                       return 0.80
    if "trader joe" in n:                        return 0.45
    if "aldi" in n:                              return 0.30
    if "market basket" in n:                     return 0.35
    if re.search(r"stop & shop|shaw|hannaford", n): return 0.60
    if "star market" in n:                       return 0.65
    if re.search(r"costco|bj'?s|sam'?s", n):    return 0.35
    if re.search(r"7.?eleven|circle k|cumberland", n): return 0.95
    return None


def enrich_resource(resource: dict) -> dict:
    """
    Adds category, price_score, price_tier, price_label, price_dots,
    and hex_color fields to a resource dict in-place and returns it.

    Expects resource to have 'type' (backend type) and optionally 'name'.
    """
    category = classify_store_type(
        resource.get("type", ""),
        resource.get("name", ""),
    )
    tier = STORE_HIERARCHY[category]

    # Allow chain-level price score override
    chain_score = get_chain_price_score(resource.get("name", ""))
    price_score  = chain_score if chain_score is not None else tier.price_score

    resource["category"]    = category
    resource["price_score"] = round(price_score, 4)
    resource["price_tier"]  = tier.price_tier
    resource["price_label"] = tier.price_label
    resource["price_dots"]  = tier.price_dots
    resource["hex_color"]   = tier.hex_color
    return resource
