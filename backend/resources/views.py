"""
Views for the resources app.

Supports full filtering via query parameters. All data access uses pymongo.

When the food_resources collection is empty (fresh install), hardcoded mock
data is returned so the frontend sidebar always renders something useful.
"""
import logging

from rest_framework.decorators import api_view
from rest_framework.exceptions import NotFound
from rest_framework.response import Response

from core.db import resources_col

from .filters import (
    apply_distance_filter,
    apply_open_now_filter,
    build_mongo_query,
    sort_alphabetical,
)
from .serializers import FoodResourceSerializer, ResourceListSerializer

logger = logging.getLogger(__name__)

# ─── Mock fallback data ────────────────────────────────────────────────────────
# Used when food_resources collection is empty (before ingest_resources runs).

_MOCK_RESOURCES = [
    {
        "resource_id": "mock-001",
        "name": "Roxbury Community Health Center Pantry",
        "type": "pantry",
        "address": "435 Warren St, Roxbury, MA 02119",
        "coordinates": [-71.0839, 42.3246],
        "tract_id": "25025010100",
        "snap": True,
        "free": True,
        "hours": "Mon-Fri 9am-5pm",
        "transit_minutes_est": 8,
    },
    {
        "resource_id": "mock-002",
        "name": "Dudley Street Food Co-op",
        "type": "grocery",
        "address": "2149 Washington St, Roxbury, MA 02119",
        "coordinates": [-71.0825, 42.3261],
        "tract_id": "25025010100",
        "snap": True,
        "free": False,
        "transit_minutes_est": 12,
    },
    {
        "resource_id": "mock-003",
        "name": "Nubian Square Farmers Market",
        "type": "market",
        "address": "Nubian Square, Roxbury, MA",
        "coordinates": [-71.0831, 42.3257],
        "tract_id": "25025010100",
        "snap": True,
        "free": False,
        "hours": "Tue & Sat 10am-3pm",
        "transit_minutes_est": 14,
    },
    {
        "resource_id": "mock-004",
        "name": "Boston Mobile Food Truck - GBFB",
        "type": "mobile",
        "address": "Malcolm X Blvd & Shawmut Ave (rotating)",
        "coordinates": [-71.0807, 42.3242],
        "tract_id": "25025010100",
        "snap": False,
        "free": True,
        "transit_minutes_est": 18,
    },
    {
        "resource_id": "mock-005",
        "name": "Warren Gardens Resident Pantry",
        "type": "pantry",
        "address": "10 Cheney St, Roxbury, MA 02119",
        "coordinates": [-71.0861, 42.3239],
        "tract_id": "25025010100",
        "snap": True,
        "free": True,
        "transit_minutes_est": 22,
    },
    {
        "resource_id": "mock-006",
        "name": "South End Food Bank",
        "type": "pantry",
        "address": "95 Berkeley St, South End, MA 02116",
        "coordinates": [-71.0717, 42.3449],
        "tract_id": "25025020100",
        "snap": True,
        "free": True,
        "transit_minutes_est": 19,
    },
]


def _clean_resource(doc: dict) -> dict:
    """
    Remove MongoDB internals and cast coordinates to native Python floats.

    pymongo may return numpy-derived types for numeric fields stored via the
    ingestion pipeline. Ensure all floats are native Python float before
    serialisation to avoid JSON encoding errors.
    """
    doc.pop("_id", None)
    if "coordinates" in doc:
        doc["coordinates"] = [float(c) for c in doc["coordinates"]]
    return doc


@api_view(["GET"])
def resource_list(request):
    """
    GET /api/v1/resources/

    Returns a filtered list of food resources.

    Query parameters:
      type        - Resource type(s): pantry | grocery | market | mobile (repeatable)
      snap        - true | false — filter by SNAP acceptance
      free        - true | false — filter by free-of-charge status
      open_now    - true | false — filter by current open status (MVP: ignored)
      lat         - User latitude (float)
      lng         - User longitude (float)
      max_minutes - Max transit travel time in minutes (int, default 30)
      tract_id    - Filter by census tract ID

    Response shape:
      {
        "count":   int,
        "results": [ ...FoodResource[] ]
      }
    """
    params = request.query_params

    # Build and execute the MongoDB query for structured filters.
    mongo_query = build_mongo_query(params)
    docs = list(resources_col().find(mongo_query))

    if not docs:
        logger.warning("food_resources collection is empty — returning mock fallback data.")
        resources = [_clean_resource(dict(r)) for r in _MOCK_RESOURCES]
    else:
        resources = [_clean_resource(d) for d in docs]

    # Apply open_now filter (post-query, MVP: no-op with warning).
    if params.get("open_now") == "true":
        resources = apply_open_now_filter(resources)

    # Apply distance / travel-time filter if coordinates provided.
    lat_str = params.get("lat")
    lng_str = params.get("lng")
    if lat_str and lng_str:
        try:
            lat = float(lat_str)
            lng = float(lng_str)
            max_minutes = int(params.get("max_minutes", 30))
            resources = apply_distance_filter(resources, lat, lng, max_minutes)
        except (ValueError, TypeError) as exc:
            logger.warning("Invalid lat/lng parameters: %s", exc)
            resources = sort_alphabetical(resources)
    else:
        resources = sort_alphabetical(resources)

    serializer = ResourceListSerializer({"count": len(resources), "results": resources})
    return Response(serializer.data)


@api_view(["GET"])
def resource_detail(request, resource_id: str):
    """
    GET /api/v1/resources/<resource_id>/

    Returns a single food resource document.

    Raises 404 if the resource_id is not found in the collection.
    """
    doc = resources_col().find_one({"resource_id": resource_id})
    if doc is None:
        # Try mock fallback before raising 404
        mock = next((r for r in _MOCK_RESOURCES if r["resource_id"] == resource_id), None)
        if mock is None:
            raise NotFound(f"Food resource '{resource_id}' not found.")
        doc = dict(mock)

    resource = _clean_resource(doc)
    serializer = FoodResourceSerializer(resource)
    return Response(serializer.data)
