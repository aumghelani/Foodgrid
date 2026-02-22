"""
Serializers for the simulation app.

The simulation endpoint accepts a POST body and returns a before/after
comparison for a single census tract. All fields that change are surfaced
in the response so the frontend can render deltas.
"""
from rest_framework import serializers


class SimulationRequestSerializer(serializers.Serializer):
    """Validates the POST body for POST /api/v1/simulation/run/."""

    tract_id = serializers.CharField(
        help_text="Census tract identifier (e.g. 'TRACT_001').",
    )
    interventions = serializers.ListField(
        child=serializers.ChoiceField(
            choices=["add_pantry", "add_mobile", "extend_hours"],
        ),
        min_length=1,
        help_text="One or more intervention types to simulate (applied in order).",
    )


class TractScoreSerializer(serializers.Serializer):
    """Snapshot of a tract's key scores at a point in time."""

    food_risk_score = serializers.FloatField()
    equity_score = serializers.FloatField()
    transit_coverage = serializers.FloatField()
    food_insecurity_rate = serializers.FloatField(required=False)
    poverty_rate = serializers.FloatField(required=False)
    snap_rate = serializers.FloatField(required=False)


class SimulationResultSerializer(serializers.Serializer):
    """
    Full response shape for a simulation run.

    Shape:
      {
        "tract_id":           str,
        "tract_name":         str,
        "interventions":      str[],
        "before":             TractScore,
        "after":              TractScore,
        "delta": {
          "food_risk_score":  float,   # negative means improvement
          "equity_score":     float,   # positive means improvement
          "transit_coverage": float,
        },
        "households_reached": int,
      }
    """

    tract_id = serializers.CharField()
    tract_name = serializers.CharField()
    interventions = serializers.ListField(child=serializers.CharField())
    before = TractScoreSerializer()
    after = TractScoreSerializer()
    delta = serializers.DictField(child=serializers.FloatField())
    households_reached = serializers.IntegerField()
