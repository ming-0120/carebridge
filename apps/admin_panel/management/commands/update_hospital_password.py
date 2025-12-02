"""
병원 hos_password 업데이트 관리 명령어
빈 hos_password 값을 estb_date 값으로 채웁니다.
사용법: python manage.py update_hospital_password
"""
from django.core.management.base import BaseCommand
from apps.db.models import Hospital


class Command(BaseCommand):
    help = '빈 hos_password 값을 estb_date 값으로 채웁니다.'

    def handle(self, *args, **options):
        # 모든 병원 조회
        all_hospitals = Hospital.objects.all()
        
        updated_count = 0
        skipped_count = 0
        already_filled_count = 0
        
        self.stdout.write('병원 데이터 업데이트를 시작합니다...\n')
        
        for hospital in all_hospitals:
            # hos_password가 비어있는지 확인 (None, 빈 문자열, 공백만 있는 경우)
            is_password_empty = (
                not hospital.hos_password or 
                hospital.hos_password.strip() == ''
            )
            
            # estb_date가 있는지 확인
            has_estb_date = (
                hospital.estb_date and 
                hospital.estb_date.strip() != ''
            )
            
            if not is_password_empty:
                # 이미 hos_password가 채워져 있음
                already_filled_count += 1
                continue
            
            if has_estb_date:
                # hos_password를 estb_date로 업데이트
                hospital.hos_password = hospital.estb_date
                hospital.save()
                updated_count += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f'✓ 업데이트: {hospital.name} (hos_id: {hospital.hos_id}) - '
                        f'hos_password: "{hospital.hos_password}"'
                    )
                )
            else:
                skipped_count += 1
                self.stdout.write(
                    self.style.WARNING(
                        f'⚠ 건너뜀: {hospital.name} (hos_id: {hospital.hos_id}) - '
                        f'estb_date가 없어서 업데이트할 수 없습니다.'
                    )
                )
        
        self.stdout.write(f'\n=== 업데이트 완료 ===')
        self.stdout.write(f'업데이트된 병원: {updated_count}개')
        self.stdout.write(f'이미 채워진 병원: {already_filled_count}개')
        if skipped_count > 0:
            self.stdout.write(
                self.style.WARNING(f'estb_date가 없어서 건너뛴 병원: {skipped_count}개')
            )

