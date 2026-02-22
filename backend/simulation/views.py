"""
Views for the simulation app.

POST /api/v1/simulation/run/

Accepts a tract_id and a list of interventions, fetches the live tract
document from MongoDB, applies the simulation engine, and returns a
before/after comparison.
"""
import logging

from rest_framework.decorators import api_view
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response

from core.db import tracts_col

from .engine import VALID_INTERVENTIONS, apply_interventions
from .serializers import SimulationRequestSerializer, SimulationResultSerializer

logger = logging.getLogger(__name__)

# Fields compared in the delta summary.
_DELTA_FIELDS = ("food_risk_score", "equity_score", "transit_coverage")


@api_view(["POST"])
def simulation_run(request):
    """
    POST /api/v1/simulation/run/

    Simulate one or more policy interventions on a census tract and return
    a before/after score comparison.

    Request body (JSON):
      {
        "tract_id":      "TRACT_001",
        "interventions": ["add_pantry", "add_mobile"]
      }

    Response shape:
      {
        "tract_id":           str,
        "tract_name":         str,
        "interventions":      str[],
        "before":             { food_risk_score, equity_score, transit_coverage, ... },
        "after":              { food_risk_score, equity_score, transit_coverage, ... },
        "delta":              { food_risk_score, equity_score, transit_coverage },
        "households_reached": int,
      }

    Errors:
      400 — missing / invalid fields, unknown intervention name
      404 — tract_id not found in the database
    """
    # ── Validate request body ──────────────────────────────────────────────────
    req_serializer = SimulationRequestSerializer(data=request.data)
    if not req_serializer.is_valid():
        raise ValidationError(req_serializer.errors)

    tract_id: str = req_serializer.validated_data["tract_id"]
    interventions: list[str] = req_serializer.validated_data["interventions"]

    # ── Guard: reject unknown intervention names ───────────────────────────────
    unknown = [iv for iv in interventions if iv not in VALID_INTERVENTIONS]
    if unknown:
        raise ValidationError(
            {"interventions": f"Unknown intervention(s): {', '.join(unknown)}"}
        )

    # ── Fetch tract from MongoDB ───────────────────────────────────────────────
    doc = tracts_col().find_one({"tract_id": tract_id})
    if doc is None:
        raise NotFound(f"Census tract '{tract_id}' not found.")

    doc.pop("_id", None)

    # ── Build before snapshot ─────────────────────────────────────────────────
    before_scores = {
        "food_risk_score":     float(doc.get("food_risk_score", 0.0)),
        "equity_score":        float(doc.get("equity_score", 0.0)),
        "transit_coverage":    float(doc.get("transit_coverage", 0.0)),
        "food_insecurity_rate": float(doc.get("food_insecurity_rate", 0.0)),
        "poverty_rate":        float(doc.get("poverty_rate", 0.0)),
        "snap_rate":           float(doc.get("snap_rate", 0.0)),
    }

    # ── Run simulation ─────────────────────────────────────────────────────────
    simulated = apply_interventions(doc, interventions)

    after_scores = {
        "food_risk_score":     float(simulated.get("food_risk_score", 0.0)),
        "equity_score":        float(simulated.get("equity_score", 0.0)),
        "transit_coverage":    float(simulated.get("transit_coverage", 0.0)),
        "food_insecurity_rate": float(simulated.get("food_insecurity_rate", 0.0)),
        "poverty_rate":        float(simulated.get("poverty_rate", 0.0)),
        "snap_rate":           float(simulated.get("snap_rate", 0.0)),
    }

    # ── Compute deltas ─────────────────────────────────────────────────────────
    delta = {
        field: round(after_scores[field] - before_scores[field], 4)
        for field in _DELTA_FIELDS
    }

    households_reached: int = simulated.get("households_reached", 0)

    # ── Serialise and return ───────────────────────────────────────────────────
    result_data = {
        "tract_id":           tract_id,
        "tract_name":         doc.get("tract_name", ""),
        "interventions":      interventions,
        "before":             before_scores,
        "after":              after_scores,
        "delta":              delta,
        "households_reached": households_reached,
    }

    serializer = SimulationResultSerializer(result_data)
    return Response(serializer.data)
