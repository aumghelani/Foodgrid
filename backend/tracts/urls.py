"""URL patterns for the tracts app."""
from django.urls import path

from .views import city_stats, tract_detail, tract_list

urlpatterns = [
    path("", tract_list, name="tract-list"),
    path("stats/", city_stats, name="city-stats"),
    path("<str:tract_id>/", tract_detail, name="tract-detail"),
]
