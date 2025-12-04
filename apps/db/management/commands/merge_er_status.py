from django.core.management.base import BaseCommand
from django.db import transaction
from apps.db.models.emergency import ErInfo, ErStatus, ErStatusStaging


class Command(BaseCommand):
    help = "Merge ER Status Staging -> Main Table (Upsert Logic)"

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("[1] staging에서 최신값만 추출 후 er_status로 UPDATE/INSERT"))

        # 각 병원별로 최신 hvdate 찾기
        hospital_ids = ErStatusStaging.objects.values_list('hos_id', flat=True).distinct()
        
        updated_count = 0
        created_count = 0

        for hos_id in hospital_ids:
            # 해당 병원의 최신 hvdate 찾기
            latest_staging = ErStatusStaging.objects.filter(
                hos_id=hos_id
            ).order_by('-hvdate').first()
            
            if not latest_staging:
                continue
            
            # er_info에서 er_id 찾기
            try:
                er_info = ErInfo.objects.get(hpid=hos_id)
            except ErInfo.DoesNotExist:
                self.stdout.write(self.style.WARNING(f"Skipping unknown HPID: {hos_id}"))
                continue
            
            with transaction.atomic():
                # UPDATE 방식: update_or_create 사용
                # API 필드 → ErStatus 필드 매핑:
                # hv31 → er_general_available (일반 응급 Available)
                # hvs03 → er_general_total (일반 응급 Total)
                # hv36 → er_child_available (소아 Available)
                # hvs04 → er_child_total (소아 Total)
                # hv7 → birth_available (분만 Available)
                # hvs05 → birth_total (분만 Total)
                # hv11 → negative_pressure_available (음압 Available)
                # hvs06 → negative_pressure_total (음압 Total)
                # hv10 → isolation_available (일반격리 Available)
                # hvs07 → isolation_total (일반격리 Total)
                # hv5 → cohort_available (코호트 Available)
                # hvs38 → cohort_total (코호트 Total)
                # hvctayn → has_ct (CT 장비 여부 Y/N)
                # hvmriayn → has_mri (MRI 여부)
                # hvangioayn → has_angio (Angio 여부)
                # hvventiayn → has_ventilator (Ventilator 여부)
                
                er_status, created = ErStatus.objects.update_or_create(
                    er=er_info,
                    defaults={
                        'hvdate': latest_staging.hvdate,
                        # 일반 응급실
                        'er_general_available': latest_staging.hv31,  # hv31 → er_general_available
                        'er_general_total': latest_staging.hvs03,     # hvs03 → er_general_total
                        # 소아 응급실
                        'er_child_available': latest_staging.hv36,    # hv36 → er_child_available
                        'er_child_total': latest_staging.hvs04,      # hvs04 → er_child_total
                        # 분만실
                        'birth_available': latest_staging.hv7,        # hv7 → birth_available
                        'birth_total': latest_staging.hvs05,         # hvs05 → birth_total
                        # 음압격리
                        'negative_pressure_available': latest_staging.hv11,  # hv11 → negative_pressure_available
                        'negative_pressure_total': latest_staging.hvs06,     # hvs06 → negative_pressure_total
                        # 일반격리
                        'isolation_available': latest_staging.hv10,   # hv10 → isolation_available
                        'isolation_total': latest_staging.hvs07,      # hvs07 → isolation_total
                        # 코호트격리
                        'cohort_available': latest_staging.hv5,      # hv5 → cohort_available
                        'cohort_total': latest_staging.hvs38,         # hvs38 → cohort_total
                        # 장비 정보
                        'has_ct': latest_staging.hvctayn == 'Y' if latest_staging.hvctayn else None,        # hvctayn → has_ct
                        'has_mri': latest_staging.hvmriayn == 'Y' if latest_staging.hvmriayn else None,     # hvmriayn → has_mri
                        'has_angio': latest_staging.hvangioayn == 'Y' if latest_staging.hvangioayn else None,  # hvangioayn → has_angio
                        'has_ventilator': latest_staging.hvventiayn == 'Y' if latest_staging.hvventiayn else None,  # hvventiayn → has_ventilator
                    }
                )
            
            if created:
                created_count += 1
            else:
                updated_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"완료: staging → er_status 병합 성공 "
                f"(생성: {created_count}, 업데이트: {updated_count})"
            )
        )
