import csv
from django.core.management.base import BaseCommand
from apps.db.models.emergency import ErInfo

class Command(BaseCommand):
    help = "Import ER Info from CSV located at D:\\data\\er_export.csv"

    def handle(self, *args, **kwargs):
        file_path = r"D:\data\er_export.csv"

        try:
            with open(file_path, newline='', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)

                created = 0
                updated = 0

                for row in reader:
                    _, created_flag = ErInfo.objects.update_or_create(
                        hpid=row["hpid"],
                        defaults={
                            "er_name": row["er_name"],
                            "er_address": row["er_address"],
                            "er_sido": row["er_sido"],
                            "er_sigungu": row["er_sigungu"],
                            "er_lat": float(row["er_lat"]) if row["er_lat"] else None,
                            "er_lng": float(row["er_lng"]) if row["er_lng"] else None,
                        }
                    )
                    if created_flag:
                        created += 1
                    else:
                        updated += 1

                self.stdout.write(
                    self.style.SUCCESS(f"SUCCESS: CSV Imported. Created: {created}, Updated: {updated}")
                )

        except FileNotFoundError:
            self.stdout.write(self.style.ERROR(f"ERROR: File not found at {file_path}"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Unexpected ERROR: {e}"))
