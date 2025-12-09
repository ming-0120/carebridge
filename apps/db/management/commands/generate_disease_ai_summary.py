from django.core.management.base import BaseCommand
from django.db.models import Sum
from django.utils import timezone

from apps.db.models.disease import DimDisease
from apps.db.models.statistic import InfectiousStat
from apps.services.ai_analysis import generate_disease_ai_summary

class Command(BaseCommand):
    help = "감염병 통계를 기반으로 AI 요약을 생성하고 dim_disease에 저장"

    def add_arguments(self, parser):
        parser.add_argument("--disease-code", type=str)
        parser.add_argument("--overwrite", action="store_true")

    def handle(self, *args, **options):
        disease_code = options.get("disease_code")
        overwrite = options.get("overwrite")

        qs = DimDisease.objects.all()
        if disease_code:
            qs = qs.filter(disease_code=disease_code)

        for disease in qs:
            # 이미 요약 있고 overwrite=False → 건너뜀
            if disease.ai_summary and not overwrite:
                continue

            # 통계 조회
            # apps/db/management/commands/generate_disease_ai_summary.py
            
            stats_qs = (
                InfectiousStat.objects
                .filter(disease_code_id=disease.disease_code)
                .values("stat_date", "dim_type", "dim_label")
                .annotate(cases=Sum("ptnt_val"))
                .order_by("stat_date", "dim_type", "dim_label")
            )
            
            stats_rows = list(stats_qs)
            
            # 🔹 date → 문자열 변환 (아까 에러 해결했던 부분)
            for row in stats_rows:
                for key, value in row.items():
                    if hasattr(value, "isoformat"):
                        row[key] = value.isoformat()
            
            if not stats_rows:
                self.stdout.write(
                    self.style.WARNING(
                        f"[{disease.disease_code}] 통계 데이터가 없어 AI 요약 생성을 건너뜀"
                    )
                )
                continue


            # AI 생성
            summary = generate_disease_ai_summary(
                disease_name=disease.disease_name,
                stats_rows=stats_rows,
            )

            # 저장
            disease.ai_summary = summary
            disease.ai_updated_at = timezone.now()
            disease.save(update_fields=["ai_summary", "ai_updated_at"])