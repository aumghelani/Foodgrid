"""
FoodGrid Boston — root URL configuration.
"""
import logging

from django.http import JsonResponse
from django.urls import include, path

logger = logging.getLogger(__name__)


def health_check(request):
    """
    GET /api/health/

    Returns the application health status including MongoDB connectivity.
    Response shape: {"status": "ok", "db": "connected" | "error"}
    """
    try:
        from core.db import ping_db
        db_status = "connected" if ping_db() else "error"
    except Exception as exc:
        logger.warning("Health check: MongoDB ping failed — %s", exc)
        db_status = "error"

    return JsonResponse({"status": "ok", "db": db_status})


urlpatterns = [
    path("api/health/", health_check),
    path("api/v1/tracts/", include("tracts.urls")),
    path("api/v1/resources/", include("resources.urls")),
    path("api/v1/simulation/", include("simulation.urls")),
]
