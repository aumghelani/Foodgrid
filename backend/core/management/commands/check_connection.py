"""
Management command: check_connection

Verifies that Django can reach the MongoDB Atlas cluster and prints
collection document counts. Exits with code 1 on failure so start.sh
can abort before launching the server.

Usage:
    python manage.py check_connection
"""
import sys

from django.core.management.base import BaseCommand

from core.db import city_stats_col, resources_col, tracts_col


class Command(BaseCommand):
    help = "Verify MongoDB Atlas connectivity and report collection sizes."

    def handle(self, *args, **options):
        self.stdout.write("Checking MongoDB connection...")
        try:
            tracts_count = tracts_col().count_documents({})
            resources_count = resources_col().count_documents({})
            stats_count = city_stats_col().count_documents({})

            self.stdout.write(self.style.SUCCESS(
                f"  MongoDB OK\n"
                f"  census_tracts:  {tracts_count} documents\n"
                f"  food_resources: {resources_count} documents\n"
                f"  city_stats:     {stats_count} documents"
            ))

            if tracts_count == 0:
                self.stdout.write(self.style.WARNING(
                    "  WARNING: census_tracts is empty. "
                    "Run: python manage.py ingest_tracts"
                ))
            if resources_count == 0:
                self.stdout.write(self.style.WARNING(
                    "  WARNING: food_resources is empty. "
                    "Run: python manage.py ingest_resources --geocode"
                ))

        except Exception as exc:  # noqa: BLE001
            self.stderr.write(self.style.ERROR(
                f"  MongoDB connection FAILED: {exc}\n"
                f"  Check that MONGODB_URI is set correctly in backend/.env"
            ))
            sys.exit(1)
