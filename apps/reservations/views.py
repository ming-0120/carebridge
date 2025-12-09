import json
import math
import os

from django.core.serializers.json import DjangoJSONEncoder
from django.http import JsonResponse
from django.urls import reverse
import requests
from apps.db.models.department import Department
from apps.db.models.doctor import Doctors
from apps.db.models.favorite import UserFavorite
from apps.db.models.hospital import Hospital
from apps.db.models.slot_reservation import Reservations 
from apps.db.models import TimeSlots
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from datetime import date, datetime, time
from django.views.decorators.http import require_POST
from apps.db.models.users import Users


def haversine(lat1, lon1, lat2, lon2):
    """위도/경도 사이 거리(km)"""
    R = 6371
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (math.sin(d_lat / 2) ** 2 +
         math.cos(math.radians(lat1)) *
         math.cos(math.radians(lat2)) *
         math.sin(d_lon / 2) ** 2)
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def main_view(request):
    user_lat = float(request.session.get("user_lat", 37.4979))
    user_lon = float(request.session.get("user_lon", 127.0276))

    doctors = Doctors.objects.select_related("hos", "dep")

    grouped = {}

    for d in doctors:
        h = d.hos 
        dept_name = d.dep.dep_name
        dept_code = d.dep.dep_code
        hos_lat = h.lat 
        hos_lon = h.lng 

        if hos_lat is None or hos_lon is None:
            continue

        distance = haversine(user_lat, user_lon, float(hos_lat), float(hos_lon))

        # 과 딕셔너리 초기화
        if dept_name not in grouped:
            grouped[dept_name] = {}

        dept_hospitals = grouped[dept_name]

        if h.hos_id in dept_hospitals:
            if distance < dept_hospitals[h.hos_id]["distance"]:
                dept_hospitals[h.hos_id]["distance"] = distance
        else:
            dept_hospitals[h.hos_id] = {
                "id": h.hos_id,
                "name": h.name,
                "dept": dept_name,
                "dept_code":dept_code,
                "lat": float(hos_lat),
                "lng": float(hos_lon),
                "distance": distance,
                "address": getattr(h, "address", ""),
                "tel": getattr(h, "tel", ""),
                "sggu":h.sggu,
                "rating": h.rating,
            }

    result_by_dept = {}
    for dept_name, hospitals_dict in grouped.items():
        hospitals = list(hospitals_dict.values())
        hospitals.sort(key=lambda x: x["distance"])
        result_by_dept[dept_name] = hospitals[:5]

    context = {
        "hospital_json": json.dumps(result_by_dept, cls=DjangoJSONEncoder),
        "user_lat": user_lat,
        "user_lon": user_lon,
    }
    return render(request, "reservations/main.html", context)

def reservation_page(request):
    currentYear = datetime.now().year
    # 1) POST: 병원 id 세션 저장 + 진료과 코드 쿼리스트링으로 넘기기
    if request.method == "POST":
        hospital_id = request.POST.get("hospital_id")
        # dep_code는 POST 또는 GET 어디에 있어도 받게끔
        dep_code = request.POST.get("dept_id") or request.GET.get("dept_id")  # ★ 수정

        if not hospital_id:
            return redirect("main")

        request.session["selected_hospital_id"] = hospital_id

        if dep_code:
            url = f"{reverse('reservation_page')}?dept_id={dep_code}"
            return redirect(url)
        else:
            return redirect("reservation_page")
        
    # 2) GET: 세션에서 hospital_id 가져오기
    hospital_id = request.session.get("selected_hospital_id")
    if not hospital_id:
        return redirect("main")

    hospital = get_object_or_404(Hospital, pk=hospital_id)

    # 3) 모든 진료과 목록
    departments = Department.objects.all().order_by("dep_name")

    # 4) 주소에 ?dept_id=IM 이 오면 그 과를 선택
    code = request.GET.get("dept_id")  # URL 파라미터 이름은 그대로 사용
    if code:
        # Department.dep_code 컬럼에 "IM" 같은 코드가 들어있다고 가정
        selected_department = get_object_or_404(Department, dep_code=code)
    else:
        selected_department = departments.first()

    # 5) 병원 + 선택된 과에 속한 의사만
    doctors = Doctors.objects.filter(
        hos_id=hospital_id,
        dep=selected_department,
    ).select_related("user", "dep")
    items = []
    for i in range(2):
        url = (
            f'https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/'
            f'getRestDeInfo?solYear={currentYear}&numOfRows=100&ServiceKey={os.getenv("API_KEY")}&_type=json'
        )
        response = requests.get(url)
        item = response.json()
    
        if item['response']['body']['items']['item']:
            items += item['response']['body']['items']['item']
    
        currentYear += 1
    
    holidays = []
    for data in items:
        y = str(data['locdate'])[0:4]
        m = str(data['locdate'])[4:6]
        d = str(data['locdate'])[6:8]
    
        holidays.append({
            'date': f'{y}-{m}-{d}',          # YYYY-MM-DD
            'name': data['dateName']         # "삼일절"
        })
        context = {
            "hospital": hospital,
            "departments": departments,
            "selected_department": selected_department,
            "doctors": doctors,
            "holidays": holidays,   # ← 추가
        }
    return render(request, "reservations/reservation_page.html", context)


def reserve_submit(request):
    """상세 페이지에서 '예약확정' 버튼 눌렀을 때 실제로 Reservations 생성"""
    if request.method != "POST":
        return redirect("main")

    # 로그인 확인 (세션 기반)
    user_id = request.session.get("user_id")
    if not user_id:
        return redirect("accounts:login")

    user = get_object_or_404(Users, pk=user_id)

    slot_id = request.POST.get("slot_id")
    if not slot_id:
        return redirect("main")

    slot = get_object_or_404(TimeSlots, pk=slot_id)

    # 증상 메모
    notes = request.POST.get("notes", "").strip()

    reserved_start = datetime.combine(slot.slot_date, slot.start_time)
    reserved_end = datetime.combine(slot.slot_date, slot.end_time)

    Reservations.objects.create(
        user=user,
        slot=slot,
        reserved_at=reserved_start,
        reserved_end=reserved_end,
        notes=notes,
    )

    # 슬롯 상태 변경
    slot.status = "CLOSED"
    slot.save()

    # 예약 완료 후 마이페이지의 예약 목록으로 이동 (url name 은 프로젝트에 맞게 바꿔주세요)
    return redirect("mypage_reservations")  # TODO: 실제 url name 으로 수정


def doctor_reservations_api(request):
    """FullCalendar 에 뿌릴 이벤트 데이터 (의사별 예약)"""
    doctor_id = request.GET.get("doctor_id")
    start = request.GET.get("start")  # ISO 날짜 문자열 (YYYY-MM-DD)
    end = request.GET.get("end")

    if not doctor_id or not start or not end:
        return JsonResponse([], safe=False)

    # 날짜 범위 파싱
    start_date = datetime.fromisoformat(start).date()
    end_date = datetime.fromisoformat(end).date()

    # 해당 의사의 예약만
    qs = Reservations.objects.filter(
        slot__doctor_id=doctor_id,
        reserved_at__date__gte=start_date,
        reserved_at__date__lte=end_date,
    ).select_related("slot", "user")

    events = []
    for r in qs:
        events.append({
            "id": r.reservation_id,
            "title": f"{r.user.name} 예약",  # 원하면 다른 텍스트로
            "start": r.reserved_at.isoformat(),
            "end": r.reserved_end.isoformat(),
        })

    return JsonResponse(events, safe=False)

def doctor_slots_api(request):
    """의사 + 날짜에 대한 TimeSlots 리스트 (AM / PM 구분)"""
    doctor_id = request.GET.get("doctor_id")
    date_str = request.GET.get("date")  # YYYY-MM-DD

    if not doctor_id or not date_str:
        return JsonResponse({"am": [], "pm": []})

    target_date = datetime.fromisoformat(date_str).date()

    slots = TimeSlots.objects.filter(
        doctor_id=doctor_id,
        slot_date=target_date,
        status="OPEN",   # OPEN 슬롯만
    ).order_by("start_time")

    am = []
    pm = []

    for s in slots:
        data = {
            "slot_id": s.slot_id,
            "start": s.start_time.strftime("%H:%M"),
            "end": s.end_time.strftime("%H:%M"),
        }
        if s.start_time.hour < 12:
            am.append(data)
        else:
            pm.append(data)

    return JsonResponse({"am": am, "pm": pm})

def reservation_confirm(request):
    """예약하기 버튼을 누른 뒤 보여줄 '상세 확인 + 증상 입력' 페이지"""
    if request.method != "POST":
        return redirect("main")

    slot_id = request.POST.get("slot_id")
    if not slot_id:
        return redirect("main")

    # 로그인한 사용자 (세션 기반)
    user_id = request.session.get("user_id")
    if not user_id:
        return redirect("accounts:login")  # 실제 로그인 url name 으로 수정

    user = get_object_or_404(Users, pk=user_id)

    # 슬롯 + 의사 + 병원 정보 한 번에 가져오기
    slot = get_object_or_404(
        TimeSlots.objects.select_related("doctor__hos", "doctor__dep"),
        pk=slot_id,
    )
    doctor = slot.doctor
    hospital = doctor.hos
    department = doctor.dep

    context = {
        "user": user,
        "slot": slot,
        "doctor": doctor,
        "hospital": hospital,
        "department": department,
        "reserved_date": slot.slot_date,
        "reserved_start": slot.start_time,
        "reserved_end": slot.end_time,
    }
    return render(request, "reservations/reservation_confirm.html", context)

@require_POST
def toggle_favorite(request):
    """병원 즐겨찾기 토글 (AJAX)"""
    # 1) 로그인 사용자 (세션 기반)
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse({"ok": False, "error": "login_required"}, status=401)

    user = get_object_or_404(Users, pk=user_id)

    # 2) 병원 ID 파라미터
    hospital_id = request.POST.get("hospital_id")
    if not hospital_id:
        return JsonResponse({"ok": False, "error": "no_hospital"}, status=400)

    hospital = get_object_or_404(Hospital, pk=hospital_id)

    # 3) 이미 즐겨찾기 되어 있으면 삭제, 없으면 생성
    qs = UserFavorite.objects.filter(user=user, hos=hospital, er__isnull=True)
    # er__isnull=True 로 "응급실이 아닌 일반 병원 즐겨찾기" 로 한정

    if qs.exists():
        qs.delete()
        is_favorite = False
    else:
        UserFavorite.objects.create(
            user=user,
            hos=hospital,
            er=None,     # 병원 즐겨찾기이므로 er는 비워둠
            memo="",     # 필요 없으면 빈 문자열
        )
        is_favorite = True

    # 4) JSON 응답
    return JsonResponse({"ok": True, "is_favorite": is_favorite})