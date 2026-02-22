"""
MongoDB Atlas connection singleton for FoodGrid Boston.
Uses pymongo directly. No Django ORM involved.
"""
import logging
import os

from pymongo import MongoClient
from pymongo.database import Database

logger = logging.getLogger(__name__)

_client: MongoClient | None = None


def get_db() -> Database:
    """Return the MongoDB database instance (singleton)."""
    global _client
    if _client is None:
        uri = os.environ.get("MONGODB_URI")
        if not uri:
            raise RuntimeError(
                "MONGODB_URI is not set. "
                "Copy backend/.env.example to backend/.env and fill in your Atlas URI."
            )
        _client = MongoClient(uri, serverSelectionTimeoutMS=5000)
        logger.info("MongoDB client initialized.")
    db_name = os.environ.get("MONGODB_DB_NAME", "foodgrid_boston")
    return _client[db_name]


def tracts_col():
    """Census tracts collection."""
    return get_db()["census_tracts"]


def resources_col():
    """Food resources collection."""
    return get_db()["food_resources"]


def city_stats_col():
    """City-wide statistics (singleton document)."""
    return get_db()["city_stats"]


def ping_db() -> bool:
    """Returns True if MongoDB Atlas is reachable, False otherwise."""
    try:
        get_db().command("ping")
        return True
    except Exception as exc:
        logger.error("MongoDB ping failed: %s", exc)
        return False


def close_connection() -> None:
    """Close the MongoClient connection pool (call at process exit or in tests)."""
    global _client
    if _client is not None:
        _client.close()
        _client = None
        logger.info("MongoDB client closed.")
