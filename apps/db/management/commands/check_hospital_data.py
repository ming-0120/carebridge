"""
병원 데이터의 전화번호와 개원일 중복 여부를 확인하는 명령어
"""
from django.core.management.base import BaseCommand
from apps.db.models.hospital import Hospital
from django.db.models import Count

class Command(BaseCommand):
    help = "병원 데이터의 전화번호와 개원일 중복 여부 확인"

    def handle(self, *args, **options):
        # 전화번호별 그룹화하여 중복 확인
        tel_counts = Hospital.objects.values('tel').annotate(
            count=Count('tel')
        ).filter(count__gt=1, tel__isnull=False).exclude(tel='').order_by('-count')
        
        # 개원일별 그룹화하여 중복 확인
        estb_date_counts = Hospital.objects.values('estb_date').annotate(
            count=Count('estb_date')
        ).filter(count__gt=1, estb_date__isnull=False).exclude(estb_date='').order_by('-count')
        
        self.stdout.write("=" * 60)
        self.stdout.write("전화번호 중복 확인")
        self.stdout.write("=" * 60)
        
        if tel_counts:
            for item in tel_counts[:10]:  # 상위 10개만 표시
                tel = item['tel']
                count = item['count']
                hospitals = Hospital.objects.filter(tel=tel)[:5]  # 처음 5개만
                self.stdout.write(f"\n전화번호 '{tel}': {count}개 병원이 동일")
                for h in hospitals:
                    self.stdout.write(f"  - {h.name} (hpid: {h.hpid})")
        else:
            self.stdout.write("중복된 전화번호가 없습니다.")
        
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write("개원일 중복 확인")
        self.stdout.write("=" * 60)
        
        if estb_date_counts:
            for item in estb_date_counts[:10]:  # 상위 10개만 표시
                estb_date = item['estb_date']
                count = item['count']
                hospitals = Hospital.objects.filter(estb_date=estb_date)[:5]  # 처음 5개만
                self.stdout.write(f"\n개원일 '{estb_date}': {count}개 병원이 동일")
                for h in hospitals:
                    self.stdout.write(f"  - {h.name} (hpid: {h.hpid})")
        else:
            self.stdout.write("중복된 개원일이 없습니다.")
        
        # 전체 통계
        total = Hospital.objects.count()
        with_tel = Hospital.objects.exclude(tel__isnull=True).exclude(tel='').count()
        with_estb_date = Hospital.objects.exclude(estb_date__isnull=True).exclude(estb_date='').count()
        
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write("전체 통계")
        self.stdout.write("=" * 60)
        self.stdout.write(f"전체 병원 수: {total}개")
        self.stdout.write(f"전화번호 있는 병원: {with_tel}개")
        self.stdout.write(f"개원일 있는 병원: {with_estb_date}개")










