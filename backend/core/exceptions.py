"""
Custom DRF exception handler for FoodGrid Boston.

All API errors are normalised to a consistent envelope:
  {
    "error": {
      "code":    str,   // machine-readable constant (UPPER_SNAKE_CASE)
      "message": str,   // human-readable description
      "detail":  any    // optional extra info (validation errors, etc.)
    }
  }
"""
import logging

from rest_framework import status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


def _error_response(code: str, message: str, detail=None, http_status: int = 500) -> Response:
    """
    Build a normalised error Response.

    Args:
        code:        Machine-readable error code (e.g. "NOT_FOUND").
        message:     Human-readable error description.
        detail:      Optional extra context (validation errors, raw exception, …).
        http_status: HTTP status code for the response.
    """
    return Response(
        {"error": {"code": code, "message": message, "detail": detail}},
        status=http_status,
    )


def custom_exception_handler(exc: Exception, context: dict) -> Response:
    """
    DRF exception handler replacement.

    Intercepts all exceptions raised inside views, maps them to structured
    error responses, and logs unexpected errors at ERROR level.

    Registered in settings.py as REST_FRAMEWORK['EXCEPTION_HANDLER'].
    """
    # Let DRF handle the response object first (sets response.data, etc.).
    response = exception_handler(exc, context)

    # ── pymongo errors ────────────────────────────────────────────────────────
    try:
        import pymongo.errors as mongo_errors

        if isinstance(exc, mongo_errors.ConnectionFailure):
            logger.error("MongoDB connection failure: %s", exc)
            return _error_response(
                "SERVICE_UNAVAILABLE",
                "Database connection failed. Please try again later.",
                http_status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        if isinstance(exc, mongo_errors.OperationFailure):
            logger.error("MongoDB operation failure: %s", exc)
            return _error_response(
                "DATABASE_ERROR",
                "A database error occurred.",
                http_status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
    except ImportError:
        pass  # pymongo not installed — shouldn't happen, but be safe

    # ── DRF validation errors ─────────────────────────────────────────────────
    if isinstance(exc, ValidationError):
        return _error_response(
            "VALIDATION_ERROR",
            "Request validation failed.",
            detail=exc.detail,
            http_status=status.HTTP_400_BAD_REQUEST,
        )

    # ── 404 Not Found ─────────────────────────────────────────────────────────
    if isinstance(exc, NotFound):
        return _error_response(
            "NOT_FOUND",
            str(exc.detail) if hasattr(exc, "detail") else "Resource not found.",
            http_status=status.HTTP_404_NOT_FOUND,
        )

    # ── DRF-handled exceptions (auth, throttle, etc.) ────────────────────────
    if response is not None:
        code = getattr(exc, "default_code", "API_ERROR").upper()
        message = str(getattr(exc, "detail", exc))
        return _error_response(code, message, http_status=response.status_code)

    # ── Unhandled exceptions ──────────────────────────────────────────────────
    logger.exception("Unhandled exception in view: %s", exc)
    return _error_response(
        "INTERNAL_ERROR",
        "An unexpected error occurred.",
        http_status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
