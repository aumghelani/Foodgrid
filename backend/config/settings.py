"""
FoodGrid Boston — Django settings.

Design decisions:
  - Django ORM is disabled (DATABASES = {}) — all data access goes through
    pymongo via core.db.
  - Secrets are loaded from a .env file via python-dotenv.
  - CORS is open to the Vite dev server (localhost:5173) for local development.
  - Requires Django 5.1+ for Python 3.13 support.
  - UNAUTHENTICATED_USER = None — prevents DRF from importing AnonymousUser,
    which would trigger a RuntimeError because django.contrib.auth is not in
    INSTALLED_APPS (intentional: this project uses MongoDB, not the ORM).
"""
from pathlib import Path
from dotenv import load_dotenv
import os

BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env from the backend/ directory.  Must happen before any os.environ
# reads below, and BASE_DIR must be resolved first so the path is correct.
load_dotenv(BASE_DIR / ".env")

# ─── Security ─────────────────────────────────────────────────────────────────

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "insecure-dev-key-change-me")

DEBUG = os.environ.get("DJANGO_DEBUG", "True").lower() == "true"

ALLOWED_HOSTS = os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,0.0.0.0").split(",")

# ─── Application definition ───────────────────────────────────────────────────
# Do NOT add django.contrib.auth, django.contrib.contenttypes,
# django.contrib.sessions, or any app that requires ORM migrations.
# This project uses pymongo directly — the Django ORM is intentionally disabled.

INSTALLED_APPS = [
    "corsheaders",
    "rest_framework",
    "core",
    "tracts",
    "resources",
    "simulation",
    "ingestion",
]

# CorsMiddleware must be first — before any middleware that generates responses.
# Do NOT add SessionMiddleware or AuthenticationMiddleware.
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
]

ROOT_URLCONF = "config.urls"

WSGI_APPLICATION = "config.wsgi.application"

# ─── Database ─────────────────────────────────────────────────────────────────
# Django ORM is intentionally disabled. All data access uses pymongo directly
# through core.db. DATABASES must be empty — not absent — to prevent Django
# from complaining about missing configuration.

DATABASES = {}

# ─── Django REST Framework ────────────────────────────────────────────────────
# UNAUTHENTICATED_USER = None is the critical setting.
# Without it, DRF defaults to django.contrib.auth.models.AnonymousUser which
# imports django.contrib.contenttypes.models.ContentType — but contenttypes
# is not in INSTALLED_APPS, causing RuntimeError on every request.

REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
    ],
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_PERMISSION_CLASSES": [],
    "UNAUTHENTICATED_USER": None,
    "EXCEPTION_HANDLER": "core.exceptions.custom_exception_handler",
}

# ─── CORS ─────────────────────────────────────────────────────────────────────

_cors_origins = os.environ.get(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000",
)
CORS_ALLOWED_ORIGINS = [o.strip() for o in _cors_origins.split(",") if o.strip()]

CORS_ALLOW_METHODS = ["DELETE", "GET", "OPTIONS", "PATCH", "POST", "PUT"]

CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]

# ─── Internationalisation ─────────────────────────────────────────────────────

LANGUAGE_CODE = "en-us"
TIME_ZONE = "America/New_York"
USE_I18N = False
USE_TZ = True

# ─── Static files ─────────────────────────────────────────────────────────────

STATIC_URL = "/static/"

# ─── Logging ──────────────────────────────────────────────────────────────────

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": os.environ.get("DJANGO_LOG_LEVEL", "WARNING"),
            "propagate": False,
        },
    },
}
