"""
Views for the tracts app.

All views read from MongoDB via core.db collection accessors. No Django ORM.
pymongo exceptions are propagated and caught by core.exceptions.custom_exception_handler.

When collections are empty (fresh install before ingestion), hardcoded mock data
is returned so the frontend always renders something useful.
"""
import logging

from rest_framework.decorators import api_view
from rest_framework.exceptions import NotFound
from rest_framework.response import Response

from core.db import city_stats_col, resources_col, tracts_col
from resources.serializers import FoodResourceSerializer

from .serializers import (
    CityStatsSerializer,
    TractCollectionSerializer,
    TractDetailSerializer,
    TractPropertiesSerializer,
)

logger = logging.getLogger(__name__)

# ─── Mock fallback data ────────────────────────────────────────────────────────
# Used when the MongoDB collections are empty (i.e. ingestion commands have not
# been run yet). Mirrors BOSTON_TRACTS in src/data/censusTracts.ts so the
# frontend map renders the correct polygons even without a seeded database.

_MOCK_TRACTS = [
    {"tract_id": "25025010100", "tract_name": "Roxbury",
     "food_risk_score": 0.88, "equity_score": 0.31, "transit_coverage": 0.62,
     "food_insecurity_rate": 0.29, "poverty_rate": 0.34, "snap_rate": 0.41,
     "population": 28400, "vulnerability_index": 0.82, "need_score": 0.85,
     "supply_score": 0.21,
     "geometry": {"type": "Polygon", "coordinates": [[
         [-71.100, 42.318], [-71.075, 42.318], [-71.075, 42.338],
         [-71.100, 42.338], [-71.100, 42.318],
     ]]}},
    {"tract_id": "25025010200", "tract_name": "Dorchester North",
     "food_risk_score": 0.80, "equity_score": 0.36, "transit_coverage": 0.69,
     "food_insecurity_rate": 0.26, "poverty_rate": 0.29, "snap_rate": 0.36,
     "population": 31800, "vulnerability_index": 0.74, "need_score": 0.77,
     "supply_score": 0.31,
     "geometry": {"type": "Polygon", "coordinates": [[
         [-71.075, 42.310], [-71.047, 42.310], [-71.047, 42.330],
         [-71.075, 42.330], [-71.075, 42.310],
     ]]}},
    {"tract_id": "25025010300", "tract_name": "Dorchester South",
     "food_risk_score": 0.76, "equity_score": 0.38, "transit_coverage": 0.71,
     "food_insecurity_rate": 0.24, "poverty_rate": 0.27, "snap_rate": 0.34,
     "population": 38600, "vulnerability_index": 0.70, "need_score": 0.73,
     "supply_score": 0.35,
     "geometry": {"type": "Polygon", "coordinates": [[
         [-71.075, 42.290], [-71.045, 42.290], [-71.045, 42.310],
         [-71.075, 42.310], [-71.075, 42.290],
     ]]}},
    {"tract_id": "25025010400", "tract_name": "Mattapan",
     "food_risk_score": 0.84, "equity_score": 0.29, "transit_coverage": 0.49,
     "food_insecurity_rate": 0.31, "poverty_rate": 0.36, "snap_rate": 0.44,
     "population": 21600, "vulnerability_index": 0.80, "need_score": 0.83,
     "supply_score": 0.18,
     "geometry": {"type": "Polygon", "coordinates": [[
         [-71.110, 42.277], [-71.080, 42.277], [-71.080, 42.297],
         [-71.110, 42.297], [-71.110, 42.277],
     ]]}},
    {"tract_id": "25025020100", "tract_name": "South End",
     "food_risk_score": 0.42, "equity_score": 0.61, "transit_coverage": 0.88,
     "food_insecurity_rate": 0.12, "poverty_rate": 0.14, "snap_rate": 0.18,
     "population": 34100, "vulnerability_index": 0.38, "need_score": 0.40,
     "supply_score": 0.72,
     "geometry": {"type": "Polygon", "coordinates": [[
         [-71.082, 42.338], [-71.055, 42.338], [-71.055, 42.355],
         [-71.082, 42.355], [-71.082, 42.338],
     ]]}},
    {"tract_id": "25025020200", "tract_name": "East Boston",
     "food_risk_score": 0.70, "equity_score": 0.44, "transit_coverage": 0.68,
     "food_insecurity_rate": 0.21, "poverty_rate": 0.23, "snap_rate": 0.28,
     "population": 44300, "vulnerability_index": 0.64, "need_score": 0.67,
     "supply_score": 0.38,
     "geometry": {"type": "Polygon", "coordinates": [[
         [-71.040, 42.365], [-71.010, 42.365], [-71.010, 42.390],
         [-71.040, 42.390], [-71.040, 42.365],
     ]]}},
    {"tract_id": "25025020300", "tract_name": "Charlestown",
     "food_risk_score": 0.32, "equity_score": 0.68, "transit_coverage": 0.84,
     "food_insecurity_rate": 0.09, "poverty_rate": 0.10, "snap_rate": 0.12,
     "population": 17800, "vulnerability_index": 0.28, "need_score": 0.30,
     "supply_score": 0.78,
     "geometry": {"type": "Polygon", "coordinates": [[
         [-71.080, 42.373], [-71.055, 42.373], [-71.055, 42.393],
         [-71.080, 42.393], [-71.080, 42.373],
     ]]}},
    {"tract_id": "25025030100", "tract_name": "Jamaica Plain",
     "food_risk_score": 0.48, "equity_score": 0.58, "transit_coverage": 0.76,
     "food_insecurity_rate": 0.15, "poverty_rate": 0.16, "snap_rate": 0.19,
     "population": 38200, "vulnerability_index": 0.44, "need_score": 0.46,
     "supply_score": 0.60,
     "geometry": {"type": "Polygon", "coordinates": [[
         [-71.118, 42.305], [-71.090, 42.305], [-71.090, 42.328],
         [-71.118, 42.328], [-71.118, 42.305],
     ]]}},
    {"tract_id": "25025030200", "tract_name": "Hyde Park",
     "food_risk_score": 0.63, "equity_score": 0.47, "transit_coverage": 0.54,
     "food_insecurity_rate": 0.19, "poverty_rate": 0.21, "snap_rate": 0.26,
     "population": 29500, "vulnerability_index": 0.58, "need_score": 0.61,
     "supply_score": 0.42,
     "geometry": {"type": "Polygon", "coordinates": [[
         [-71.132, 42.255], [-71.095, 42.255], [-71.095, 42.278],
         [-71.132, 42.278], [-71.132, 42.255],
     ]]}},
    {"tract_id": "25025030300", "tract_name": "Downtown / Financial District",
     "food_risk_score": 0.20, "equity_score": 0.81, "transit_coverage": 0.97,
     "food_insecurity_rate": 0.06, "poverty_rate": 0.08, "snap_rate": 0.07,
     "population": 18900, "vulnerability_index": 0.16, "need_score": 0.18,
     "supply_score": 0.92,
     "geometry": {"type": "Polygon", "coordinates": [[
         [-71.065, 42.352], [-71.040, 42.352], [-71.040, 42.370],
         [-71.065, 42.370], [-71.065, 42.352],
     ]]}},
]

_MOCK_CITY_STATS = {
    "equity_score": 0.61,
    "transit_coverage": 0.73,
    "high_risk_tracts": 4,
    "total_tracts": 10,
}


def _clean_tract(doc: dict) -> dict:
    """
    Remove MongoDB internals from a tract document and ensure float types.

    pymongo returns ObjectId objects for _id; we exclude them from API output
    and cast all float-like fields to native Python float so downstream
    serialisers and JSON encoding work without issues.
    """
    doc.pop("_id", None)
    float_fields = (
        "food_risk_score",
        "equity_score",
        "transit_coverage",
        "food_insecurity_rate",
        "poverty_rate",
        "snap_rate",
        "vulnerability_index",
        "need_score",
        "supply_score",
    )
    for field in float_fields:
        if field in doc:
            doc[field] = float(doc[field])
    return doc


@api_view(["GET"])
def tract_list(request):
    """
    GET /api/v1/tracts/

    Returns all census tracts as a GeoJSON FeatureCollection.
    Used by Government Mode to render the choropleth layer.

    Response shape:
      {
        "type": "FeatureCollection",
        "features": [ ...TractFeature[] ]
      }
    """
    docs = list(tracts_col().find({}))
    if not docs:
        logger.warning("census_tracts collection is empty — returning mock fallback data.")
        tracts = [_clean_tract(dict(d)) for d in _MOCK_TRACTS]
    else:
        tracts = [_clean_tract(d) for d in docs]

    serializer = TractCollectionSerializer({"features": tracts})
    return Response(serializer.data)


@api_view(["GET"])
def tract_detail(request, tract_id: str):
    """
    GET /api/v1/tracts/<tract_id>/

    Returns a single tract document with its associated food resources and a
    placeholder AI explanation (AI integration is a separate deliverable).

    Response shape:
      {
        "tract": { ...TractProperties },
        "resources": [ ...FoodResource[] ],
        "ai_explanation": str | null
      }
    """
    doc = tracts_col().find_one({"tract_id": tract_id})
    if doc is None:
        # Try mock fallback before raising 404
        mock = next((d for d in _MOCK_TRACTS if d["tract_id"] == tract_id), None)
        if mock is None:
            raise NotFound(f"Census tract '{tract_id}' not found.")
        doc = dict(mock)

    tract = _clean_tract(doc)

    # Fetch resources associated with this tract.
    resource_docs = list(resources_col().find({"tract_id": tract_id}))
    for r in resource_docs:
        r.pop("_id", None)

    resource_serializer = FoodResourceSerializer(resource_docs, many=True)

    # Pull equity_components if stored (by ingest_datasets); else empty dict.
    equity_components = tract.pop("equity_components", {}) or {}

    payload = {
        "tract": tract,
        "resources": resource_serializer.data,
        "equity_components": equity_components,
        "ai_explanation": None,  # Placeholder — Ollama integration is separate.
    }
    serializer = TractDetailSerializer(payload)
    return Response(serializer.data)


@api_view(["GET"])
def county_scores(request):
    """
    GET /api/v1/tracts/county-scores/

    Returns county-level aggregate scores computed via MongoDB aggregation
    pipeline over the census_tracts collection.

    Groups tracts by county_fips (defaults to '25025' / Suffolk County for all
    tracts that pre-date the county_fips field).

    Response shape:
      [
        {
          "county_fips": "25025",
          "county_name": "Suffolk County",
          "tract_count": int,
          "avg_equity_score": float,
          "avg_food_risk": float,
          "high_risk_count": int,
          "lila_count": int,
          "avg_mhhinc": float,
          "avg_transit_coverage": float
        }
      ]
    """
    pipeline = [
        # Default county_fips to "25025" for legacy documents
        {
            "$addFields": {
                "_county_fips": {
                    "$ifNull": ["$county_fips", "25025"]
                },
                "_county_name": {
                    "$ifNull": ["$county_name", "Suffolk County"]
                },
            }
        },
        {
            "$group": {
                "_id": "$_county_fips",
                "county_name":         {"$first": "$_county_name"},
                "tract_count":         {"$sum": 1},
                "avg_equity_score":    {"$avg": "$equity_score"},
                "avg_food_risk":       {"$avg": "$food_risk_score"},
                "high_risk_count":     {"$sum": {"$cond": [{"$gte": ["$food_risk_score", 0.7]}, 1, 0]}},
                "lila_count":          {"$sum": {"$cond": [{"$eq": ["$lila_flag", 1]}, 1, 0]}},
                "avg_mhhinc":          {"$avg": "$mhhinc"},
                "avg_transit_coverage":{"$avg": "$transit_coverage"},
            }
        },
        {"$sort": {"_id": 1}},
    ]

    docs = list(tracts_col().aggregate(pipeline))

    if not docs:
        # Fallback to mock aggregation from static mock tracts
        docs = [
            {
                "_id": "25025",
                "county_name": "Suffolk County",
                "tract_count": len(_MOCK_TRACTS),
                "avg_equity_score": round(
                    sum(t["equity_score"] for t in _MOCK_TRACTS) / len(_MOCK_TRACTS), 3
                ),
                "avg_food_risk": round(
                    sum(t["food_risk_score"] for t in _MOCK_TRACTS) / len(_MOCK_TRACTS), 3
                ),
                "high_risk_count": sum(
                    1 for t in _MOCK_TRACTS if t["food_risk_score"] >= 0.7
                ),
                "lila_count": 0,
                "avg_mhhinc": 55000.0,
                "avg_transit_coverage": round(
                    sum(t["transit_coverage"] for t in _MOCK_TRACTS) / len(_MOCK_TRACTS), 3
                ),
            }
        ]

    results = []
    for doc in docs:
        results.append({
            "county_fips":          doc.get("_id", "25025"),
            "county_name":          doc.get("county_name", "Suffolk County"),
            "tract_count":          int(doc.get("tract_count", 0)),
            "avg_equity_score":     round(float(doc.get("avg_equity_score") or 0), 3),
            "avg_food_risk":        round(float(doc.get("avg_food_risk") or 0), 3),
            "high_risk_count":      int(doc.get("high_risk_count", 0)),
            "lila_count":           int(doc.get("lila_count", 0)),
            "avg_mhhinc":           round(float(doc.get("avg_mhhinc") or 0), 0),
            "avg_transit_coverage": round(float(doc.get("avg_transit_coverage") or 0), 3),
        })

    return Response(results)


@api_view(["GET"])
def city_stats(request):
    """
    GET /api/v1/tracts/stats/

    Returns the city_stats singleton document with city-wide aggregates.

    Response shape:
      {
        "equity_score": float,
        "transit_coverage": float,
        "high_risk_tracts": int,
        "total_tracts": int
      }
    """
    doc = city_stats_col().find_one({"_id": "singleton"})
    if doc is None:
        # Fall back to computing stats on the fly if singleton not seeded.
        logger.warning("city_stats singleton not found — computing from tracts collection.")
        all_tracts = list(tracts_col().find(
            {}, {"food_risk_score": 1, "equity_score": 1, "transit_coverage": 1}
        ))
        if all_tracts:
            from tracts.scoring import recompute_city_stats
            doc = recompute_city_stats(all_tracts)
        else:
            logger.warning("census_tracts also empty — returning mock city stats.")
            doc = dict(_MOCK_CITY_STATS)

    doc.pop("_id", None)
    serializer = CityStatsSerializer(doc)
    return Response(serializer.data)
