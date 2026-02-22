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
from core.store_hierarchy import enrich_resource

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
    # ── Brookline / Fenway (near DEFAULT_USER_LOCATION) ──────────────────────
    {"resource_id":"mock-b01","name":"Trader Joe's Coolidge Corner","type":"grocery",
     "address":"1317 Beacon St, Brookline, MA 02446","coordinates":[-71.1239,42.3413],
     "snap":True,"free":False,"hours":"Daily 8am-9pm","transit_minutes_est":6},
    {"resource_id":"mock-b02","name":"Star Market Fenway","type":"grocery",
     "address":"53 Huntington Ave, Boston, MA 02116","coordinates":[-71.0870,42.3469],
     "snap":True,"free":False,"transit_minutes_est":12},
    {"resource_id":"mock-b03","name":"Whole Foods Fenway","type":"grocery",
     "address":"15 Westland Ave, Boston, MA 02115","coordinates":[-71.0998,42.3449],
     "snap":True,"free":False,"hours":"Daily 7am-10pm","transit_minutes_est":8},
    {"resource_id":"mock-b04","name":"CVS Brookline Village","type":"grocery",
     "address":"1199 Boylston St, Brookline, MA 02467","coordinates":[-71.1199,42.3518],
     "snap":False,"free":False,"transit_minutes_est":4},
    {"resource_id":"mock-b05","name":"Copley Square Farmers Market","type":"market",
     "address":"139 St James Ave, Boston, MA 02116","coordinates":[-71.0749,42.3497],
     "snap":True,"free":False,"hours":"Tue & Fri 11am-6pm","transit_minutes_est":14},
    # ── Roxbury ──────────────────────────────────────────────────────────────
    {"resource_id":"mock-r01","name":"Roxbury Community Health Center Pantry","type":"pantry",
     "address":"435 Warren St, Roxbury, MA 02119","coordinates":[-71.0839,42.3246],
     "snap":True,"free":True,"hours":"Mon-Fri 9am-5pm","transit_minutes_est":18},
    {"resource_id":"mock-r02","name":"Tropical Foods International","type":"grocery",
     "address":"450 Melnea Cass Blvd, Roxbury, MA 02119","coordinates":[-71.0823,42.3311],
     "snap":True,"free":False,"transit_minutes_est":20},
    {"resource_id":"mock-r03","name":"Dudley Farmers Market","type":"market",
     "address":"427 Dudley St, Roxbury, MA 02119","coordinates":[-71.0832,42.3277],
     "snap":True,"free":False,"hours":"Sat 10am-3pm","transit_minutes_est":22},
    {"resource_id":"mock-r04","name":"Warren Gardens Resident Pantry","type":"pantry",
     "address":"10 Cheney St, Roxbury, MA 02119","coordinates":[-71.0861,42.3239],
     "snap":True,"free":True,"transit_minutes_est":25},
    {"resource_id":"mock-r05","name":"GBFB Mobile Market — Roxbury","type":"mobile",
     "address":"Malcolm X Blvd & Shawmut Ave, Roxbury, MA","coordinates":[-71.0807,42.3242],
     "snap":False,"free":True,"hours":"Wed 10am-2pm","transit_minutes_est":22},
    # ── South End / Back Bay ─────────────────────────────────────────────────
    {"resource_id":"mock-s01","name":"South End Food Pantry","type":"pantry",
     "address":"95 Berkeley St, Boston, MA 02116","coordinates":[-71.0717,42.3449],
     "snap":True,"free":True,"hours":"Mon-Sat 10am-4pm","transit_minutes_est":10},
    {"resource_id":"mock-s02","name":"Shaw's Back Bay","type":"grocery",
     "address":"53 Huntington Ave, Boston, MA 02116","coordinates":[-71.0828,42.3480],
     "snap":True,"free":False,"transit_minutes_est":8},
    {"resource_id":"mock-s03","name":"South End Farmers Market","type":"market",
     "address":"Columbus Ave & Dartmouth St, Boston, MA","coordinates":[-71.0695,42.3439],
     "snap":True,"free":False,"hours":"Sat 9am-1pm","transit_minutes_est":12},
    {"resource_id":"mock-s04","name":"Boston Rescue Mission Mobile Kitchen","type":"mobile",
     "address":"39 Kingston St, Boston, MA 02111","coordinates":[-71.0572,42.3591],
     "snap":False,"free":True,"transit_minutes_est":16},
    # ── Downtown / Charlestown ───────────────────────────────────────────────
    {"resource_id":"mock-d01","name":"Boston Public Market","type":"market",
     "address":"136 Blackstone St, Boston, MA 02202","coordinates":[-71.0545,42.3605],
     "snap":True,"free":False,"hours":"Tue-Sun 8am-8pm","transit_minutes_est":14},
    {"resource_id":"mock-d02","name":"Whole Foods Downtown","type":"grocery",
     "address":"181 Cambridge St, Boston, MA 02114","coordinates":[-71.0632,42.3556],
     "snap":True,"free":False,"hours":"Daily 7am-10pm","transit_minutes_est":12},
    {"resource_id":"mock-d03","name":"St. Francis House Pantry","type":"pantry",
     "address":"39 Boylston St, Boston, MA 02116","coordinates":[-71.0593,42.3568],
     "snap":False,"free":True,"hours":"Mon-Fri 8am-4pm","transit_minutes_est":10},
    {"resource_id":"mock-d04","name":"Market Basket Charlestown","type":"grocery",
     "address":"3 Rutherford Ave, Charlestown, MA 02129","coordinates":[-71.0679,42.3785],
     "snap":True,"free":False,"transit_minutes_est":18},
    {"resource_id":"mock-d05","name":"Charlestown Pantry","type":"pantry",
     "address":"33 White St, Charlestown, MA 02129","coordinates":[-71.0631,42.3755],
     "snap":True,"free":True,"transit_minutes_est":20},
    # ── Dorchester ───────────────────────────────────────────────────────────
    {"resource_id":"mock-do01","name":"Dorchester Winter Farmers Market","type":"market",
     "address":"6 Norfolk St, Dorchester, MA 02124","coordinates":[-71.0671,42.3049],
     "snap":True,"free":False,"hours":"Sat 10am-2pm","transit_minutes_est":28},
    {"resource_id":"mock-do02","name":"Truong Thinh II Market","type":"grocery",
     "address":"1305 Dorchester Ave, Dorchester, MA 02122","coordinates":[-71.0682,42.3022],
     "snap":True,"free":False,"transit_minutes_est":30},
    {"resource_id":"mock-do03","name":"Stop & Shop South Bay","type":"grocery",
     "address":"1150 Massachusetts Ave, Dorchester, MA 02125","coordinates":[-71.0619,42.3201],
     "snap":True,"free":False,"transit_minutes_est":24},
    {"resource_id":"mock-do04","name":"Mobile Food Truck — Dorchester","type":"mobile",
     "address":"1234 Dorchester Ave, Dorchester, MA","coordinates":[-71.0691,42.3052],
     "snap":False,"free":True,"hours":"Thu 11am-2pm","transit_minutes_est":30},
    # ── Jamaica Plain ────────────────────────────────────────────────────────
    {"resource_id":"mock-j01","name":"Whole Foods Jamaica Plain","type":"grocery",
     "address":"415 Centre St, Jamaica Plain, MA 02130","coordinates":[-71.1131,42.3172],
     "snap":True,"free":False,"hours":"Daily 7am-10pm","transit_minutes_est":22},
    {"resource_id":"mock-j02","name":"JP Farmers Market","type":"market",
     "address":"18 Marbury Terrace, Jamaica Plain, MA 02130","coordinates":[-71.1115,42.3123],
     "snap":True,"free":False,"hours":"Wed 12pm-6pm","transit_minutes_est":24},
    {"resource_id":"mock-j03","name":"Community Servings Food Pantry","type":"pantry",
     "address":"179 Amory St, Jamaica Plain, MA 02130","coordinates":[-71.1086,42.3141],
     "snap":False,"free":True,"transit_minutes_est":26},
    {"resource_id":"mock-j04","name":"Hi-Lo Foods JP","type":"grocery",
     "address":"415 Centre St, Jamaica Plain, MA 02130","coordinates":[-71.1149,42.3159],
     "snap":True,"free":False,"transit_minutes_est":23},
    # ── East Boston ──────────────────────────────────────────────────────────
    {"resource_id":"mock-e01","name":"Eagle Market East Boston","type":"grocery",
     "address":"198 Maverick St, East Boston, MA 02128","coordinates":[-71.0378,42.3710],
     "snap":True,"free":False,"transit_minutes_est":28},
    {"resource_id":"mock-e02","name":"East Boston Health Center Pantry","type":"pantry",
     "address":"10 Gove St, East Boston, MA 02128","coordinates":[-71.0388,42.3678],
     "snap":False,"free":True,"hours":"Mon-Fri 9am-4pm","transit_minutes_est":30},
    {"resource_id":"mock-e03","name":"7-Eleven East Boston","type":"grocery",
     "address":"5 Central Square, East Boston, MA 02128","coordinates":[-71.0387,42.3715],
     "snap":False,"free":False,"hours":"24/7","transit_minutes_est":28},
    {"resource_id":"mock-e04","name":"Mobile Pantry East Boston","type":"mobile",
     "address":"Maverick Square, East Boston, MA","coordinates":[-71.0412,42.3694],
     "snap":False,"free":True,"hours":"Tue 10am-1pm","transit_minutes_est":30},
    # ── Mattapan ─────────────────────────────────────────────────────────────
    {"resource_id":"mock-m01","name":"Mattapan Farmers Market","type":"market",
     "address":"525 River St, Mattapan, MA 02126","coordinates":[-71.0928,42.2730],
     "snap":True,"free":False,"hours":"Sat 9am-1pm","transit_minutes_est":38},
    {"resource_id":"mock-m02","name":"Mattapan Food Pantry","type":"pantry",
     "address":"90 Cummins Hwy, Mattapan, MA 02126","coordinates":[-71.0960,42.2761],
     "snap":True,"free":True,"transit_minutes_est":40},
    {"resource_id":"mock-m03","name":"City Harvest Mobile — Mattapan","type":"mobile",
     "address":"River St & Cummins Hwy, Mattapan, MA","coordinates":[-71.0933,42.2780],
     "snap":False,"free":True,"hours":"Fri 11am-3pm","transit_minutes_est":40},
    {"resource_id":"mock-m04","name":"Stop & Shop Mattapan","type":"grocery",
     "address":"1277 River St, Hyde Park, MA 02136","coordinates":[-71.0945,42.2753],
     "snap":True,"free":False,"transit_minutes_est":38},
    # ── Hyde Park ────────────────────────────────────────────────────────────
    {"resource_id":"mock-h01","name":"Star Market Hyde Park","type":"grocery",
     "address":"1377 Hyde Park Ave, Hyde Park, MA 02136","coordinates":[-71.1264,42.2558],
     "snap":True,"free":False,"transit_minutes_est":42},
    {"resource_id":"mock-h02","name":"Hyde Park Farmers Market","type":"market",
     "address":"Hyde Park Ave & Cleary Square, MA","coordinates":[-71.1264,42.2558],
     "snap":True,"free":False,"hours":"Thu 3pm-7pm","transit_minutes_est":42},
    {"resource_id":"mock-h03","name":"Hyde Park Food Pantry","type":"pantry",
     "address":"1110 Hyde Park Ave, Hyde Park, MA 02136","coordinates":[-71.1299,42.2513],
     "snap":True,"free":True,"transit_minutes_est":44},
    # ── Allston / Brighton ───────────────────────────────────────────────────
    {"resource_id":"mock-a01","name":"Star Market Allston","type":"grocery",
     "address":"60 Everett St, Allston, MA 02134","coordinates":[-71.1420,42.3503],
     "snap":True,"free":False,"transit_minutes_est":16},
    {"resource_id":"mock-a02","name":"GBFB Mobile Market — Brighton","type":"mobile",
     "address":"20 Fordham Rd, Brighton, MA 02135","coordinates":[-71.1512,42.3502],
     "snap":True,"free":True,"hours":"Mon 10am-2pm","transit_minutes_est":18},
    {"resource_id":"mock-a03","name":"Harvest Co-op Allston","type":"grocery",
     "address":"57 South St, Jamaica Plain, MA 02130","coordinates":[-71.1319,42.3478],
     "snap":True,"free":False,"hours":"Daily 8am-9pm","transit_minutes_est":14},
    # ── Cambridge / Mission Hill border ──────────────────────────────────────
    {"resource_id":"mock-c01","name":"Costco-style Wholesale (Chelsea)","type":"grocery",
     "address":"190 Mystic Ave, Medford, MA 02155","coordinates":[-71.0849,42.3920],
     "snap":True,"free":False,"transit_minutes_est":30},
    {"resource_id":"mock-c02","name":"Whole Foods Cambridge","type":"grocery",
     "address":"340 River St, Cambridge, MA 02139","coordinates":[-71.1061,42.3625],
     "snap":True,"free":False,"hours":"Daily 7am-10pm","transit_minutes_est":15},
    {"resource_id":"mock-c03","name":"Cambridge Food Pantry","type":"pantry",
     "address":"8 Cameron Ave, Cambridge, MA 02140","coordinates":[-71.1091,42.3741],
     "snap":False,"free":True,"transit_minutes_est":22},
    # ── Mission Hill / Longwood ───────────────────────────────────────────────
    {"resource_id":"mock-mh01","name":"Mission Hill Farmers Market","type":"market",
     "address":"Calumet St & Tremont St, Mission Hill, MA","coordinates":[-71.1023,42.3333],
     "snap":True,"free":False,"hours":"Fri 3pm-7pm","transit_minutes_est":10},
    {"resource_id":"mock-mh02","name":"Stop & Shop Mission Hill","type":"grocery",
     "address":"1100 Huntington Ave, Boston, MA 02115","coordinates":[-71.0998,42.3341],
     "snap":True,"free":False,"transit_minutes_est":8},
    {"resource_id":"mock-mh03","name":"Longwood Medical Food Pantry","type":"pantry",
     "address":"330 Brookline Ave, Boston, MA 02215","coordinates":[-71.1058,42.3372],
     "snap":False,"free":True,"hours":"Tue & Thu 10am-2pm","transit_minutes_est":10},
    # ── South Boston ─────────────────────────────────────────────────────────
    {"resource_id":"mock-sb01","name":"Roche Bros. South Boston","type":"grocery",
     "address":"516 E Broadway, South Boston, MA 02127","coordinates":[-71.0470,42.3375],
     "snap":True,"free":False,"transit_minutes_est":18},
    {"resource_id":"mock-sb02","name":"South Boston Food Pantry","type":"pantry",
     "address":"388 Old Colony Ave, South Boston, MA","coordinates":[-71.0492,42.3329],
     "snap":True,"free":True,"transit_minutes_est":22},
    {"resource_id":"mock-sb03","name":"Mobile Food Truck — South Boston","type":"mobile",
     "address":"Old Colony Ave & Dorchester St, South Boston, MA","coordinates":[-71.0501,42.3351],
     "snap":False,"free":True,"hours":"Mon 10am-1pm","transit_minutes_est":20},
]

# ─── Cost-score lookup ─────────────────────────────────────────────────────────
# Used for priority sort when time_weight + cost_weight query params are provided.
# free=True overrides type-based cost to 0.0 (free = zero cost burden).

_TYPE_COST_SCORE: dict[str, float] = {
    "pantry":  0.0,   # food pantries are free
    "mobile":  0.0,   # mobile food stops are free
    "market":  0.33,  # farmers markets — affordable, moderate cost
    "grocery": 0.66,  # full-price grocery stores — standard cost
}


def _cost_score(resource: dict) -> float:
    """Return a 0–1 cost burden score for a resource (0 = free, 1 = expensive)."""
    if resource.get("free"):
        return 0.0
    # Use enriched price_score if available (more accurate than type-only lookup)
    if "price_score" in resource:
        return float(resource["price_score"])
    return _TYPE_COST_SCORE.get(resource.get("type", "grocery"), 0.5)


def _priority_sort(
    resources: list[dict],
    time_weight: float,
    cost_weight: float,
) -> list[dict]:
    """
    Sort resources by a weighted composite of transit time and cost.

    composite = time_weight × (1 − normalised_time) + cost_weight × (1 − cost_score)

    Higher composite = better match (appears first in results).
    """
    if not resources:
        return resources

    max_time = max((r.get("transit_minutes_est") or 30) for r in resources) or 30

    def _composite(r: dict) -> float:
        t = (r.get("transit_minutes_est") or 30) / max_time
        c = _cost_score(r)
        return time_weight * (1.0 - t) + cost_weight * (1.0 - c)

    return sorted(resources, key=_composite, reverse=True)


def _clean_resource(doc: dict) -> dict:
    """Remove MongoDB internals and cast coordinates to native Python floats."""
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
      time_weight - Priority weight for transit time 0–100 (default 50)
      cost_weight - Priority weight for cost 0–100 (default 50)

    Response shape:
      {
        "count":   int,
        "results": [ ...FoodResource[] ]
      }
    """
    params = request.query_params

    # ── ?all=true — return full dataset for map pins (no distance/filter) ──
    if params.get("all") == "true":
        docs = list(
            resources_col().find(
                {},
                projection={
                    "_id": 0,
                    "resource_id": 1,
                    "name": 1,
                    "type": 1,
                    "address": 1,
                    "coordinates": 1,
                    "tract_id": 1,
                    "snap": 1,
                    "free": 1,
                    "hours": 1,
                    "phone": 1,
                    "category": 1,
                    "price_score": 1,
                    "price_tier": 1,
                    "price_label": 1,
                    "price_dots": 1,
                    "hex_color": 1,
                    "transit_minutes_est": 1,
                },
            )
        )
        if not docs:
            resources = [_clean_resource(dict(r)) for r in _MOCK_RESOURCES]
        else:
            resources = [_clean_resource(d) for d in docs]
        resources = [enrich_resource(r) for r in resources]
        serializer = ResourceListSerializer({"count": len(resources), "results": resources})
        return Response(serializer.data)

    mongo_query = build_mongo_query(params)
    docs = list(resources_col().find(mongo_query))

    if not docs:
        logger.warning("food_resources collection is empty — returning mock fallback data.")
        resources = [_clean_resource(dict(r)) for r in _MOCK_RESOURCES]
    else:
        resources = [_clean_resource(d) for d in docs]

    # Enrich each resource with store hierarchy data (category, price_score, etc.)
    resources = [enrich_resource(r) for r in resources]

    if params.get("open_now") == "true":
        resources = apply_open_now_filter(resources)

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

    # Priority sort by time_weight / cost_weight
    try:
        raw_time = float(params.get("time_weight", 50))
        raw_cost = float(params.get("cost_weight", 50))
        total    = raw_time + raw_cost
        if total > 0:
            resources = _priority_sort(resources, raw_time / total, raw_cost / total)
    except (ValueError, TypeError):
        pass

    serializer = ResourceListSerializer({"count": len(resources), "results": resources})
    return Response(serializer.data)


@api_view(["GET"])
def resource_detail(request, resource_id: str):
    """
    GET /api/v1/resources/<resource_id>/

    Returns a single food resource document.
    Raises 404 if the resource_id is not found.
    """
    doc = resources_col().find_one({"resource_id": resource_id})
    if doc is None:
        mock = next((r for r in _MOCK_RESOURCES if r["resource_id"] == resource_id), None)
        if mock is None:
            raise NotFound(f"Food resource '{resource_id}' not found.")
        doc = dict(mock)

    resource = _clean_resource(doc)
    resource = enrich_resource(resource)
    serializer = FoodResourceSerializer(resource)
    return Response(serializer.data)
