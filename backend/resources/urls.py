"""URL configuration for the resources app."""
from django.urls import path

from .views import resource_detail, resource_list

urlpatterns = [
    path("", resource_list, name="resource-list"),
    path("<str:resource_id>/", resource_detail, name="resource-detail"),
]
