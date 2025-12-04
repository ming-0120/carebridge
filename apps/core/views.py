from django.shortcuts import render
from django.utils import timezone
from apps.db.models import DailyVisit, MedicalNewsletter
from django.db.models import F


def home(request):
    today = timezone.now().date()

    daily_visit, created = DailyVisit.objects.get_or_create(visit_date=today)
    daily_visit.visit_count = F('visit_count') + 1
    daily_visit.save(update_fields=['visit_count'])

    # 최신 5개 뉴스레터
    newsletters = (
        MedicalNewsletter.objects
        .order_by('-created_at')[:3]   # created_at 컬럼 기준
    )

    return render(
        request,
        'core/home.html',
        {
            'newsletters': newsletters
        }
    )
   
