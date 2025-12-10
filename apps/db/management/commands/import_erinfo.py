import csv
import os
from django.core.management.base import BaseCommand
from apps.db.models.emergency import ErInfo

class Command(BaseCommand):
    help = "Import ER Info from CSV (auto-detect path for home or academy)"

    def handle(self, *args, **kwargs):
        # 1) 학원 환경 경로
        academy_path = r"D:\data\er_export.csv"

        # 2) 집 환경 경로
        home_path = r"C:\KDTHome\data\er_export.csv"

        # 3) 존재 여부 체크하여 자동 선택
        if os.path.exists(academy_path):
            file_path = academy_path
        elif os.path.exists(home_path):
            file_path = home_path
        else:
            self.stdout.write(self.style.ERROR(
                f"ERROR: CSV 파일을 찾을 수 없습니다:\n"
                f"- {academy_path}\n"
                f"- {home_path}"
            ))
            return

        # 실제 import 로직
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
                    self.style.SUCCESS(
                        f"SUCCESS: CSV Imported from {file_path}. Created: {created}, Updated: {updated}"
                    )
                )

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Unexpected ERROR: {e}"))
