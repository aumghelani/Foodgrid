"""
Serializers for the tracts app.

All serializers work with plain Python dicts (pymongo documents) — there is no
Django ORM model involved. ObjectId fields are converted to strings on output.
"""
from rest_framework import serializers


class TractPropertiesSerializer(serializers.Serializer):
    """Serialises a census tract's metric fields (the GeoJSON properties object)."""

    tract_id = serializers.CharField()
    tract_name = serializers.CharField()
    food_risk_score = serializers.FloatField()
    equity_score = serializers.FloatField()
    transit_coverage = serializers.FloatField()
    food_insecurity_rate = serializers.FloatField()
    poverty_rate = serializers.FloatField()
    snap_rate = serializers.FloatField()
    population = serializers.IntegerField()
    vulnerability_index = serializers.FloatField(default=0.0)
    need_score = serializers.FloatField(default=0.0)
    supply_score = serializers.FloatField(default=0.0)


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

    type = serializers.SerializerMethodField()
    id = serializers.CharField(source="tract_id")
    geometry = serializers.DictField()
    properties = serializers.SerializerMethodField()

    def get_type(self, obj: dict) -> str:
        """Always 'Feature' for GeoJSON compliance."""
        return "Feature"

    def get_properties(self, obj: dict) -> dict:
        """Return all tract metric fields as the properties object."""
        props_serializer = TractPropertiesSerializer(obj)
        return props_serializer.data


class TractCollectionSerializer(serializers.Serializer):
    """
    Serialises a list of tracts as a GeoJSON FeatureCollection.

    Shape:
      {
        "type": "FeatureCollection",
        "features": [ ...TractFeature[] ]
      }
    """

    type = serializers.SerializerMethodField()
    features = TractFeatureSerializer(many=True)

    def get_type(self, obj: dict) -> str:
        """Always 'FeatureCollection' for GeoJSON compliance."""
        return "FeatureCollection"


class TractDetailSerializer(serializers.Serializer):
    """
    Serialises the detail view for a single tract: tract data + resources + AI text.

    Shape:
      {
        "tract": { ...TractProperties },
        "resources": [ ...FoodResource[] ],
        "ai_explanation": str | null
      }
    """

    tract = TractPropertiesSerializer()
    resources = serializers.ListField(child=serializers.DictField(), default=list)
    ai_explanation = serializers.CharField(allow_null=True, default=None)


class CityStatsSerializer(serializers.Serializer):
    """Serialises the city_stats singleton document."""

    equity_score = serializers.FloatField()
    transit_coverage = serializers.FloatField()
    high_risk_tracts = serializers.IntegerField()
    total_tracts = serializers.IntegerField()
