"""
Serializers for the resources app.

Serialises plain Python dicts (pymongo documents) — no ORM models.
"""
from rest_framework import serializers


class FoodResourceSerializer(serializers.Serializer):
    """
    Serialises a single food resource document.

    The `is_open_now` field is a computed value derived from the `hours` string
    and current time. For the MVP it defaults to None (unknown) because
    structured hours parsing is not yet implemented.
    """

    resource_id = serializers.CharField()
    name = serializers.CharField()
    type = serializers.CharField()
    address = serializers.CharField()
    # coordinates: [lng, lat] — matches GeoJSON convention used by the frontend.
    coordinates = serializers.ListField(child=serializers.FloatField(), min_length=2, max_length=2)
    tract_id = serializers.CharField(allow_blank=True, default="")
    snap = serializers.BooleanField(default=False)
    free = serializers.BooleanField(default=False)
    hours = serializers.CharField(allow_blank=True, allow_null=True, default=None)
    is_open_now = serializers.BooleanField(allow_null=True, read_only=True, default=None)
    phone = serializers.CharField(allow_null=True, allow_blank=True, default=None)
    # Optional computed field added by filters.apply_distance_filter()
    transit_minutes_est = serializers.IntegerField(read_only=True, required=False, allow_null=True)
    # Store hierarchy enrichment (added by resources/views.py via store_hierarchy.enrich_resource)
    category    = serializers.CharField(allow_blank=True, default="grocery")
    price_score = serializers.FloatField(default=0.5)
    price_tier  = serializers.CharField(allow_blank=True, default="Moderate")
    price_label = serializers.CharField(allow_blank=True, default="")
    price_dots  = serializers.IntegerField(default=2)
    hex_color   = serializers.CharField(allow_blank=True, default="#84cc16")


class ResourceListSerializer(serializers.Serializer):
    """
    Wrapper serializer for a list of food resources.

    Provides a `count` field alongside the results array so clients can display
    result counts without an extra request.
    """

    count = serializers.IntegerField()
    results = FoodResourceSerializer(many=True)
