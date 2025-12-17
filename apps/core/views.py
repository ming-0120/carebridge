# Django 기본 기능
from django.shortcuts import render  # 템플릿 렌더링을 위한 함수
from django.utils import timezone  # 시간대를 고려한 현재 시간/날짜 처리

# 데이터베이스 모델
from apps.db.models import DailyVisit, MedicalNewsletter  # 일일 방문자 수, 의료 뉴스레터 모델
# Django ORM 기능
from django.db.models import F  # 데이터베이스 필드 참조 및 원자적 업데이트를 위한 F 

from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json

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



@csrf_exempt
def save_location(request):
    if request.method == "POST":
        data = json.loads(request.body)
        lat = data.get("lat")
        lng = data.get("lng")

        request.session["lat"] = lat
        request.session["lng"] = lng

        return JsonResponse({"status": "ok", "lat": lat, "lng": lng})

    return JsonResponse({"error": "invalid method"}, status=400)

