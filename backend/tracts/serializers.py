"""
Serializers for the tracts app.

All serializers work with plain Python dicts (pymongo documents) — there is no
Django ORM model involved. ObjectId fields are converted to strings on output.
"""
from rest_framework import serializers


class TractPropertiesSerializer(serializers.Serializer):
    """Serialises a census tract's metric fields (the GeoJSON properties object)."""

    tract_id             = serializers.CharField()
    tract_name           = serializers.CharField()
    food_risk_score      = serializers.FloatField()
    equity_score         = serializers.FloatField()
    transit_coverage     = serializers.FloatField()
    food_insecurity_rate = serializers.FloatField()
    poverty_rate         = serializers.FloatField()
    snap_rate            = serializers.FloatField()
    population           = serializers.IntegerField()
    vulnerability_index  = serializers.FloatField(default=0.0)
    need_score           = serializers.FloatField(default=0.0)
    supply_score         = serializers.FloatField(default=0.0)
    # Extended equity fields (populated by ingest_datasets)
    mhhinc               = serializers.FloatField(default=0.0)
    lila_flag            = serializers.IntegerField(default=0)


class EquityComponentsSerializer(serializers.Serializer):
    """Breakdown of the 5-component equity score (returned in tract detail only)."""

    need        = serializers.FloatField(default=0.0)
    income_gap  = serializers.FloatField(default=0.0)
    food_burden = serializers.FloatField(default=0.0)
    access      = serializers.FloatField(default=0.0)
    resource    = serializers.FloatField(default=0.0)


class TractFeatureSerializer(serializers.Serializer):
    """
    Serialises a single census tract as a GeoJSON Feature.

    Shape:
      {
        "type": "Feature",
        "id": <tract_id>,
        "geometry": { ... },
        "properties": { ...TractProperties }
      }
    """

    type       = serializers.SerializerMethodField()
    id         = serializers.CharField(source="tract_id")
    geometry   = serializers.DictField()
    properties = serializers.SerializerMethodField()

    def get_type(self, obj: dict) -> str:
        return "Feature"

    def get_properties(self, obj: dict) -> dict:
        return TractPropertiesSerializer(obj).data


class TractCollectionSerializer(serializers.Serializer):
    """
    Serialises a list of tracts as a GeoJSON FeatureCollection.

    Shape:
      {
        "type": "FeatureCollection",
        "features": [ ...TractFeature[] ]
      }
    """

    type     = serializers.SerializerMethodField()
    features = TractFeatureSerializer(many=True)

    def get_type(self, obj: dict) -> str:
        return "FeatureCollection"


class TractDetailSerializer(serializers.Serializer):
    """
    Serialises the detail view for a single tract.

    Shape:
      {
        "tract":             { ...TractProperties },
        "resources":         [ ...FoodResource[] ],
        "equity_components": { need, income_gap, food_burden, access, resource },
        "ai_explanation":    str | null
      }
    """

    tract             = TractPropertiesSerializer()
    resources         = serializers.ListField(child=serializers.DictField(), default=list)
    equity_components = EquityComponentsSerializer(default=dict)
    ai_explanation    = serializers.CharField(allow_null=True, default=None)


class CityStatsSerializer(serializers.Serializer):
    """Serialises the city_stats singleton document."""

    equity_score     = serializers.FloatField()
    transit_coverage = serializers.FloatField()
    high_risk_tracts = serializers.IntegerField()
    total_tracts     = serializers.IntegerField()
