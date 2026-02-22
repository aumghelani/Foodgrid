"""
Cursor-based pagination helper for FoodGrid Boston.

pymongo cursors are not directly serialisable. This module provides a simple
offset-based pagination wrapper suitable for MVP-scale datasets. Cursor-based
pagination (via _id) is provided as a utility for future use.
"""
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)

DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 500


def paginate_queryset(
    collection,
    query: dict,
    sort_field: str = "_id",
    sort_direction: int = 1,
    skip: int = 0,
    limit: int = DEFAULT_PAGE_SIZE,
    projection: Optional[dict] = None,
) -> dict[str, Any]:
    """
    Execute a paginated MongoDB query and return results with metadata.

    Args:
        collection:     pymongo Collection to query.
        query:          MongoDB filter document.
        sort_field:     Field to sort by (default: "_id").
        sort_direction: 1 for ascending, -1 for descending.
        skip:           Number of documents to skip (offset pagination).
        limit:          Maximum number of documents to return.
        projection:     Optional MongoDB projection document.

    Returns:
        Dict with keys:
          - "results":  list of documents (with ObjectId stringified)
          - "count":    number of results in this page
          - "total":    total matching documents
          - "skip":     offset used
          - "limit":    page size used
    """
    limit = min(limit, MAX_PAGE_SIZE)

    cursor = collection.find(query, projection).sort(sort_field, sort_direction)
    total = collection.count_documents(query)

    cursor = cursor.skip(skip).limit(limit)
    results = list(cursor)

    # Stringify ObjectIds so JSON serialisation works cleanly downstream.
    for doc in results:
        if "_id" in doc:
            doc["_id"] = str(doc["_id"])

    return {
        "results": results,
        "count": len(results),
        "total": total,
        "skip": skip,
        "limit": limit,
    }


def stringify_id(doc: dict) -> dict:
    """
    Convert the MongoDB _id field to a string in-place and return the doc.

    Safe to call on documents that do not have an _id field.
    """
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc
