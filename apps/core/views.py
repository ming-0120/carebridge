from django.shortcuts import render
from django.utils import timezone
from apps.db.models import DailyVisit
from django.db.models import F

def home(request):
    # 오늘 날짜
    today = timezone.now().date()
    
    # 방문자 수 기록 (메인 페이지 접속 시)
    daily_visit, created = DailyVisit.objects.get_or_create(visit_date=today)
    daily_visit.visit_count = F('visit_count') + 1
    daily_visit.save(update_fields=['visit_count'])
    
    return render(request, 'core/home.html')
