import csv
from datetime import datetime
from django.core.management.base import BaseCommand
from apps.db.models.emergency import ErInfo, ErStatus


class Command(BaseCommand):
    help = "Import ER status CSV data from D:/data/er_status.csv"

    def handle(self, *args, **options):
        csv_file = r"D:\data\er_status.csv"

        try:
            with open(csv_file, newline='', encoding='utf-8') as file:
                reader = csv.DictReader(file)

                for row in reader:
                    hpid = row.get("hpid")

                    if not hpid:
                        self.stdout.write(self.style.WARNING("Skipping row without hpid"))
                        continue

                    try:
                        er_info = ErInfo.objects.get(hpid=hpid)
                    except ErInfo.DoesNotExist:
                        self.stdout.write(self.style.WARNING(f"[SKIP] ERInfo missing for hpid={hpid}"))
                        continue

                    hvdate_raw = row.get("hvidate")
                    try:
                        hvdate = datetime.strptime(hvdate_raw, "%Y%m%d%H%M%S")
                    except:
                        self.stdout.write(self.style.WARNING(f"[SKIP] Invalid hvidate format: {hvdate_raw}"))
                        continue

                    ErStatus.objects.update_or_create(
                        er=er_info,
                        hvdate=hvdate,
                        defaults={
                            "hpid": hpid,
                            "er_general_available": int(row.get("hv3")) if row.get("hv3") and row.get("hv3").isdigit() else None,
                            "er_child_available": int(row.get("hv16")) if row.get("hv16") and row.get("hv16").isdigit() else None,
                            "birth_total": int(row.get("hv10a")) if row.get("hv10a") and row.get("hv10a").isdigit() else None,
                            "birth_available": None if row.get("hv10") in ["", None] else (1 if row.get("hv10") == "Y" else 0),
                            "negative_pressure_available": None if row.get("hv36") in ["", None] else (1 if row.get("hv36") == "Y" else 0),
                            "isolation_available": None if row.get("hvncc") in ["", None] else (1 if row.get("hvncc") == "Y" else 0),
                            "cohort_available": None if row.get("hvccc") in ["", None] else (1 if row.get("hvccc") == "Y" else 0),
                            "has_ct": row.get("hvctayn") == "Y",
                            "has_mri": row.get("hvmriayn") == "Y",
                            "has_ventilator": row.get("hvventiayn") == "Y",
                            "has_angio": row.get("hvangioayn") == "Y",
                        }
                    )

                self.stdout.write(self.style.SUCCESS("ER status CSV import completed successfully."))

        except FileNotFoundError:
            self.stdout.write(self.style.ERROR(f"File not found: {csv_file}"))
