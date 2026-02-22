"""
Management command: ingest_acs

Thin wrapper that notes the PolicyMap exports already incorporate ACS data
and delegates to ingest_tracts for the actual ingestion work.

The American Community Survey (ACS) variables used by FoodGrid Boston —
median household income, population density, and low-income flag — are
pre-processed and exported by PolicyMap.  Running ``ingest_tracts`` is
sufficient; this command exists for discoverability and CI parity.

Usage:
    python manage.py ingest_acs [--data-dir PATH]

All arguments are forwarded to the ingest_tracts command.
"""
from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = (
        "Ingest ACS-derived data via PolicyMap exports. "
        "Delegates to the ingest_tracts command."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--data-dir",
            type=str,
            default="",
            help="Directory containing the PolicyMap CSV exports (forwarded to ingest_tracts).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            default=False,
            help="Forwarded to ingest_tracts.",
        )

    def handle(self, *args, **options):
        self.stdout.write(
            "ingest_acs: ACS data is bundled in the PolicyMap exports.\n"
            "Delegating to ingest_tracts…"
        )
        kwargs = {"dry_run": options["dry_run"]}
        if options.get("data_dir"):
            kwargs["data_dir"] = options["data_dir"]

        call_command("ingest_tracts", **kwargs)
        self.stdout.write(self.style.SUCCESS("ingest_acs complete."))
