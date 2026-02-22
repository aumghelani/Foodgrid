"""URL configuration for the simulation app."""
from django.urls import path

from .views import simulation_run

urlpatterns = [
    path("run/", simulation_run, name="simulation-run"),
]
