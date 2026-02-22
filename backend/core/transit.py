"""
MBTA transit time estimator for FoodGrid Boston.

Provides pure-Python functions to estimate transit travel times between
two coordinates using pre-built MBTA stop data. No network calls required.

Usage:
    from core.transit import estimate_transit_minutes, nearest_stop_distance_m

The stop data is loaded lazily from backend/data/mbta_stops.json, which is
built by:  python manage.py build_transit_data
"""
import json
import math
from pathlib import Path

_DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "mbta_stops.json"

# Module-level cache; None = not yet loaded
_stops_cache: list[dict] | None = None


def _load_stops() -> list[dict]:
    """Load MBTA stops from mbta_stops.json; returns [] if file missing."""
    global _stops_cache
    if _stops_cache is None:
        if _DATA_FILE.exists():
            with open(_DATA_FILE, encoding="utf-8") as fh:
                _stops_cache = json.load(fh)
        else:
            _stops_cache = []
    return _stops_cache


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Compute the great-circle distance in metres between two WGS-84 points.

    Args:
        lat1, lon1: Origin coordinates (decimal degrees).
        lat2, lon2: Destination coordinates (decimal degrees).

    Returns:
        Distance in metres (float).
    """
    R = 6_371_000.0  # Earth's mean radius in metres
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lam = math.radians(lon2 - lon1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))


def nearest_stop_distance_m(lat: float, lon: float) -> float:
    """
    Return the distance in metres to the nearest MBTA stop.

    Args:
        lat, lon: Query coordinates (WGS-84 decimal degrees).

    Returns:
        Distance in metres. Returns 999_999.0 if no stop data is available.
    """
    stops = _load_stops()
    if not stops:
        return 999_999.0
    return min(haversine_m(lat, lon, s["lat"], s["lon"]) for s in stops)


def estimate_transit_minutes(
    from_lat: float,
    from_lng: float,
    to_lat: float,
    to_lng: float,
) -> float:
    """
    Rough transit time estimate from one coordinate to another.

    Model (tuned to Boston MBTA):
      Walk to nearest stop:  distance_m / 80 m·min⁻¹  (≈ 4.8 km/h)
      Wait / board time:     7 minutes (average MBTA headway)
      In-vehicle leg:        straight-line distance / 400 m·min⁻¹  (≈ 24 km/h)
      Walk from dest stop:   5 minutes (constant average)

    Args:
        from_lat, from_lng: Origin coordinates (WGS-84).
        to_lat, to_lng:     Destination coordinates (WGS-84).

    Returns:
        Estimated minutes (float), capped at 90.
    """
    origin_stop_dist_m = nearest_stop_distance_m(from_lat, from_lng)
    walk_to_stop = origin_stop_dist_m / 80.0

    crow_flies_m = haversine_m(from_lat, from_lng, to_lat, to_lng)
    in_vehicle   = crow_flies_m / 400.0

    total = walk_to_stop + 7.0 + in_vehicle + 5.0
    return round(min(total, 90.0), 1)


def transit_coverage_score(
    centroid_lat: float,
    centroid_lon: float,
    radius_m: float = 800.0,
) -> float:
    """
    Estimate transit accessibility for a census tract.

    Counts MBTA stops within ``radius_m`` metres of the tract centroid and
    maps that count to [0, 1]:  0 stops → 0.0,  5+ stops → 1.0.

    Args:
        centroid_lat, centroid_lon: Tract centroid (WGS-84).
        radius_m: Walk-shed radius in metres (default: 800 m ≈ 10 min walk).

    Returns:
        Transit coverage score in [0.0, 1.0].
    """
    stops = _load_stops()
    if not stops:
        return 0.5  # neutral fallback when stop data unavailable
    in_range = sum(
        1 for s in stops
        if haversine_m(centroid_lat, centroid_lon, s["lat"], s["lon"]) <= radius_m
    )
    return round(min(1.0, in_range / 5.0), 4)
