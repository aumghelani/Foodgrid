"""
Resource filtering logic for FoodGrid Boston.

All filter functions operate on pymongo query dicts and in-memory lists —
no Django ORM or QuerySet objects are used here.
"""
import logging
import math
from typing import Any, Optional

logger = logging.getLogger(__name__)

# Approximate metres per degree of latitude (fixed).
_METRES_PER_LAT_DEGREE = 111_139.0

# Rough walking / transit speed proxy used to convert distance to minutes.
# 400 m/min ≈ 24 km/h — a conservative MBTA average including wait time.
_TRANSIT_METRES_PER_MINUTE = 400.0


def build_mongo_query(params: dict[str, Any]) -> dict:
    """
    Build a pymongo filter document from validated query parameters.

    Handles: type, snap, free.  (open_now is handled post-query — see note.)

    Args:
        params: Dict of request query parameters (already type-coerced).

    Returns:
        pymongo filter dict ready for collection.find().
    """
    query: dict = {}

    # type filter (repeatable — e.g. ?type=pantry&type=grocery)
    types = params.getlist("type") if hasattr(params, "getlist") else params.get("type", [])
    if isinstance(types, str):
        types = [types]
    if types:
        query["type"] = {"$in": types}

    # Boolean filters
    if params.get("snap") == "true":
        query["snap"] = True

    if params.get("free") == "true":
        query["free"] = True

    # tract_id direct filter
    if params.get("tract_id"):
        query["tract_id"] = params["tract_id"]

    return query


def apply_open_now_filter(resources: list[dict]) -> list[dict]:
    """
    Filter resources to those currently open.

    MVP note: Parsing structured hours strings is out of scope. This function
    logs a warning and returns the full list unchanged. A future implementation
    should parse `hours` strings (e.g. "Mon-Fri 9am-5pm") using dateutil or a
    custom parser and compare against the current local time.

    Args:
        resources: List of food_resource documents.

    Returns:
        Same list (unfiltered for MVP).
    """
    logger.warning(
        "open_now filter requested but not yet implemented — returning all resources. "
        "Implement hours parsing in resources/filters.py when hours data is structured."
    )
    return resources


def haversine_distance_metres(
    lat1: float, lng1: float, lat2: float, lng2: float
) -> float:
    """
    Compute the great-circle distance between two WGS-84 coordinates.

    Args:
        lat1, lng1: Origin coordinates (user location).
        lat2, lng2: Destination coordinates (resource location).

    Returns:
        Distance in metres (float).
    """
    r = 6_371_000.0  # Earth radius in metres
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def apply_distance_filter(
    resources: list[dict],
    lat: float,
    lng: float,
    max_minutes: int,
) -> list[dict]:
    """
    Filter resources by estimated transit travel time and attach distance metadata.

    Uses a straight-line Haversine distance divided by a conservative transit
    speed (400 m/min) as a proxy for MBTA travel time. MBTA API integration
    will replace this calculation in a future sprint.

    Args:
        resources:   List of food_resource documents.
        lat:         User latitude.
        lng:         User longitude.
        max_minutes: Maximum acceptable transit time in minutes.

    Returns:
        Filtered list sorted by ascending estimated transit minutes.
        Each document gains a `transit_minutes_est` field.
    """
    max_metres = max_minutes * _TRANSIT_METRES_PER_MINUTE
    result = []

    for r in resources:
        coords = r.get("coordinates")
        if not coords or len(coords) < 2:
            continue
        r_lng, r_lat = float(coords[0]), float(coords[1])
        dist = haversine_distance_metres(lat, lng, r_lat, r_lng)
        if dist <= max_metres:
            r = dict(r)  # shallow copy — don't mutate the original
            r["transit_minutes_est"] = round(dist / _TRANSIT_METRES_PER_MINUTE)
            result.append(r)

    result.sort(key=lambda x: x["transit_minutes_est"])
    return result


def sort_alphabetical(resources: list[dict]) -> list[dict]:
    """Return resources sorted alphabetically by name."""
    return sorted(resources, key=lambda r: r.get("name", "").lower())
