from django.core.management.base import BaseCommand
from django.db import transaction
from datetime import date, datetime, time, timedelta
from apps.db.models.doctor import Doctors
from apps.db.models import TimeSlots  

class Command(BaseCommand):
    help = "의사별로 지정 날짜의 타임슬롯(09–13, 14–18, 1시간 간격)을 자동 생성"

    def add_arguments(self, parser):
        parser.add_argument(
            "--date",
            type=str,
            help="YYYY-MM-DD 형식. 생략 시 내일 날짜로 생성.",
        )

    def handle(self, *args, **options):
        # 1) 대상 날짜 결정
        if options["date"]:
            target_date = datetime.strptime(options["date"], "%Y-%m-%d").date()
        else:
            target_date = date.today() + timedelta(days=1)

        self.stdout.write(self.style.NOTICE(f"[INFO] target_date = {target_date}"))

        doctors = Doctors.objects.all()
        created_count = 0

        with transaction.atomic():
            for doctor in doctors:
                created_count += self._create_slots_for_doctor(doctor, target_date)

        self.stdout.write(
            self.style.SUCCESS(
                f"[DONE] {target_date} 기준 총 {created_count}개 타임슬롯 생성(또는 이미 존재)."
            )
        )

    def _create_slots_for_doctor(self, doctor, target_date):
        """
        한 의사에 대해 주어진 날짜의 오전/오후 슬롯 생성
        09-13: 9-10, 10-11, 11-12, 12-13
        14-18: 14-15, 15-16, 16-17, 17-18
        """
        created = 0

        created += self._create_range_slots(
            doctor, target_date, start_hour=9, end_hour=13
        )
        created += self._create_range_slots(
            doctor, target_date, start_hour=14, end_hour=18
        )

        return created

    def _create_range_slots(self, doctor, target_date, start_hour, end_hour):
        """
        start_hour ~ end_hour 를 1시간 간격으로 쪼개서 TimeSlots 생성
        예: start=9, end=13 → 9-10,10-11,11-12,12-13
        """
        created = 0

        for hour in range(start_hour, end_hour):
            start_t = time(hour, 0)
            end_t = time(hour + 1, 0)

            _, is_created = TimeSlots.objects.get_or_create(
                doctor=doctor,
                slot_date=target_date,
                start_time=start_t,
                end_time=end_t,
                defaults={
                    "status": "OPEN",
                    "capacity": 1,
                },
            )
            if is_created:
                created += 1

        return created