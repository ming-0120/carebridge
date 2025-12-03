from django.core.management.base import BaseCommand
from django.db import transaction
from apps.db.models.emergency import ErInfo, ErStatus, ErStatusStaging


class Command(BaseCommand):
    help = "Merge ER Status Staging -> Main Table (Upsert Logic)"

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("Starting ER Status Merge..."))

        staging_rows = ErStatusStaging.objects.all()
        if not staging_rows.exists():
            self.stdout.write(self.style.WARNING("No staging data found"))
            return

        merged_count = 0

        for row in staging_rows:
            try:
                er_info = ErInfo.objects.get(hpid=row.hos_id)
            except ErInfo.DoesNotExist:
                self.stdout.write(self.style.WARNING(f"Skipping unknown HPID: {row.hos_id}"))
                continue

            with transaction.atomic():
                obj, created = ErStatus.objects.update_or_create(
                    er=er_info,
                    hvdate=row.hvdate,
                    defaults={
                        "er_general_available": row.hv31,
                        "er_general_total": row.hv36,
                        "er_child_available": row.hv7,
                        "er_child_total": row.hv11,
                        "birth_available": row.hv5,
                        "birth_total": row.hv10,
                        "negative_pressure_available": row.hvs03,
                        "negative_pressure_total": row.hvs04,
                        "isolation_available": row.hvs05,
                        "isolation_total": row.hvs06,
                        "cohort_available": row.hvs07,
                        "cohort_total": row.hvs38,
                        "has_ct": row.hvctayn,
                        "has_mri": row.hvmriayn,
                        "has_angio": row.hvangioayn,
                        "has_ventilator": row.has_ventilator,
                    }
                )

                merged_count += 1

        self.stdout.write(self.style.SUCCESS(f"Merged {merged_count} rows"))
