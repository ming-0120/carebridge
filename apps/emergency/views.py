from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.db.models import Q
from django.utils import timezone
from datetime import datetime

import math
import json
from collections import defaultdict

from apps.db.models.emergency import ErInfo, ErStatus, ErMessage
from apps.db.models.review import AiReview
from django.conf import settings


def _haversine_km(lat1, lon1, lat2, lon2):
    """
    두 좌표 사이 거리(km) 계산 (위도/경도 모두 float)
    """
    # 위/경도 -> 라디안
    rlat1 = math.radians(lat1)
    rlon1 = math.radians(lon1)
    rlat2 = math.radians(lat2)
    rlon2 = math.radians(lon2)

    dlat = rlat2 - rlat1
    dlon = rlon2 - rlon1

    a = math.sin(dlat / 2) ** 2 + math.cos(rlat1) * math.cos(rlat2) * math.sin(dlon / 2) ** 2
    c = 2 * math.asin(math.sqrt(a))
    R = 6371.0  # 지구 반지름 (km)

    return R * c


def calculate_congestion_score(status):
    """
    혼잡도 점수 계산
    혼잡도 = (응급실일반가용률 * 0.45) + (소아가용률 * 0.20) + 
             (음압가용률 * 0.20) + (일반격리가용률 * 0.10) + (분만실가용여부 * 0.05)
    - 분만실은 total 개념이 없고 Boolean 플래그(birth_available)만 존재
      → True 이면 1.0, False/None 이면 0.0 으로 반영
    """
    if not status:
        return 0.0
    
    def get_availability_rate(available, total):
        if total and total > 0:
            return (available or 0) / total
        return 0.0
    
    general_rate = get_availability_rate(
        status.er_general_available, status.er_general_total
    )
    child_rate = get_availability_rate(
        status.er_child_available, status.er_child_total
    )
    negative_rate = get_availability_rate(
        status.negative_pressure_available, status.negative_pressure_total
    )
    isolation_rate = get_availability_rate(
        status.isolation_general_available,
        status.isolation_general_total,
    )

    # 분만실: Boolean 플래그만 존재 → True면 1.0, 아니면 0.0
    birth_rate = 1.0 if getattr(status, "birth_available", None) else 0.0
    
    congestion = (
        general_rate * 0.45 +
        child_rate * 0.20 +
        negative_rate * 0.20 +
        isolation_rate * 0.10 +
        birth_rate * 0.05
    )
    
    return congestion


def calculate_score(hospital, user_lat, user_lng, filter_type=None, status=None):
    """
    종합 점수 계산
    - 기본: 거리 50% + 혼잡도 50%
    - 필터별 가중치 적용
    """
    # 거리 계산
    distance_km = None
    if user_lat and user_lng and hospital.er_lat and hospital.er_lng:
        distance_km = _haversine_km(
            user_lat, user_lng, hospital.er_lat, hospital.er_lng
        )
    
    # 거리 점수 (0-1, 거리가 가까울수록 높은 점수)
    # 30km를 기준으로 정규화 (30km = 0점, 0km = 1점)
    if distance_km is not None:
        distance_score = max(0, 1 - (distance_km / 30.0))
    else:
        distance_score = 0.0
    
    # 혼잡도 점수
    congestion_score = calculate_congestion_score(status)
    
    # 필터별 점수 계산
    if filter_type == "stroke" or filter_type == "traffic":
        # 뇌졸중/두부 및 교통사고: 거리 60% + 혼잡도 30% + 장비 10%
        equipment_score = 0.0
        if status:
            has_ct = status.has_ct or False
            has_mri = status.has_mri or False
            
            # CT 또는 MRI가 있으면 점수 부여
            if has_ct or has_mri:
                equipment_score = 1.0
        
        total_score = (
            distance_score * 0.60 +
            congestion_score * 0.30 +
            equipment_score * 0.10
        )
    elif filter_type == "cardio":
        # 심장/흉부: 거리 80% + 혼잡도 20%
        total_score = (
            distance_score * 0.80 +
            congestion_score * 0.20
        )
    elif filter_type == "obstetrics":
        # 산모/분만: 거리 40% + 혼잡도 30% + 분만실 가용 여부 30%
        # birth_available: True → 1.0, False/None → 0.0
        birth_rate = 1.0 if (status and getattr(status, "birth_available", None)) else 0.0
        
        total_score = (
            distance_score * 0.40 +
            congestion_score * 0.30 +
            birth_rate * 0.30
        )
    else:
        # 기본: 거리 50% + 혼잡도 50%
        total_score = (
            distance_score * 0.50 +
            congestion_score * 0.50
        )
    
    return total_score, distance_km

def has_any_status_data(status):
    """
    병상 정보(원형 그래프 값)가 하나라도 존재하면 True,
    모두 '-' 상태(available=None 또는 total=None/0)이면 False.
    """
    if not status:
        return False

    fields = [
        ("er_general_available", "er_general_total"),
        ("er_child_available", "er_child_total"),
        ("birth_available", "birth_total"),
        ("negative_pressure_available", "negative_pressure_total"),
        ("isolation_general_available", "isolation_general_total"),
        ("isolation_cohort_available", "isolation_cohort_total"),
    ]

    for a, t in fields:
        avail = getattr(status, a, None)
        total = getattr(status, t, None)

        # total이 있는 경우 (양수) → 유효 데이터
        if total not in (None, 0):
            return True

        # total 없이 available만 존재해도 유효 데이터
        if avail not in (None, 0):
            return True

    return False

def normalize_sido_name(sido):
    """
    시/도 이름을 표준화해서 같은 지역으로 합친다.
    예: '전남' → '전라남도'
    """
    if sido in ("전남", "전라남도"):
        return "전라남도"
    if sido in ("전북", "전라북도"):
        return "전라북도"
    if sido in ("경남", "경상남도"):
        return "경상남도"
    if sido in ("경북", "경상북도"):
        return "경상북도"
    if sido in ("충남", "충청남도"):
        return "충청남도"
    if sido in ("충북", "충청북도"):
        return "충청북도"

    return sido


def emergency_main(request):
    """
    ER 실시간 조회 메인 페이지
    - 지역 필터(sido, sigungu) -> ErInfo.er_sido, ErInfo.er_sigungu 기준으로 필터
    - 정렬(sort)        -> distance(거리순) or name(병원명순), 기본은 distance
    - 사용자 위치(lat, lng) -> home.js에서 쿼리 스트링으로 넘어오는 값
    - 템플릿에서 기대하는 컨텍스트 키:
        hospitals, selected_region, selected_sido, selected_sigungu,
        selected_sort, selected_etype, region_dict_json
    """

    # 1) GET 파라미터 읽기
    selected_sido = request.GET.get("sido")
    selected_sigungu = request.GET.get("sigungu")
    selected_sort = request.GET.get("sort")  # "distance" 또는 None (기본값: 종합점수)
    selected_etype = request.GET.get("etype") or ""  # stroke, traffic, cardio, obstetrics

    # -------------------------------------------------------
    # 응급유형 → 필요한 장비 매핑
    # -------------------------------------------------------
    EMERGENCY_MAP = {
        "stroke": ["ct", "mri", "angio"],
        "traffic": ["ct", "angio"],
        "cardio": ["angio", "ventilator"],
        "obstetrics": ["delivery"],
    }

    # OR 조건 장비 집합
    required_equips = set()

    # 응급유형이 선택된 경우 → 기본 매핑된 장비 추가
    if selected_etype in EMERGENCY_MAP:
        required_equips.update(EMERGENCY_MAP[selected_etype])

    # 사용자가 장비칩을 직접 선택한 경우 → OR 조건 추가
    for eq in ["ct", "mri", "angio", "delivery", "ventilator"]:
        if request.GET.get(eq) == "1":
            required_equips.add(eq)


    # 위치 정보
    user_lat = request.GET.get("lat") or request.headers.get("X-User-Lat")
    user_lng = request.GET.get("lng") or request.headers.get("X-User-Lng")

    # 문자열 -> float 변환 (실패 시 None)
    def to_float(value):
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    user_lat_f = to_float(user_lat)
    user_lng_f = to_float(user_lng)

    # 지역 선택 여부 확인
    has_region_filter = bool(selected_sido)

    # 2) 기본 병원 queryset (ErInfo에서 시작)
    hospitals_qs = ErInfo.objects.all()

    if selected_sido:
        std_sido = normalize_sido_name(selected_sido)
        hospitals_qs = hospitals_qs.filter(er_sido__in=[
            selected_sido,
            std_sido,
            selected_sido.replace("도",""),
            std_sido.replace("도",""),
        ])


    if selected_sigungu:
        hospitals_qs = hospitals_qs.filter(er_sigungu=selected_sigungu)

    # status(실시간) 정보 미리 가져오기 (N+1 방지)
    hospitals_qs = hospitals_qs.prefetch_related("statuses")

    # 3) 시/도별 시/군/구 목록 (표준화 적용)
    raw_regions = (
        ErInfo.objects
        .values_list("er_sido", "er_sigungu")
        .distinct()
    )

    region_dict = defaultdict(set)

    for sido, sigungu in raw_regions:
        if sido and sigungu:
            std_sido = normalize_sido_name(sido)   # 표준화 적용
            region_dict[std_sido].add(sigungu)

    # JSON 직렬화 (템플릿에서 사용)
    region_dict_json = json.dumps(
        {sido: sorted(list(sigungus)) for sido, sigungus in region_dict.items()},
        ensure_ascii=False,
    )



    # 4) 현재 선택된 시/군/구 목록
    if selected_sido:
        sigungu_list = (
            ErInfo.objects
            .filter(er_sido=selected_sido)
            .values_list("er_sigungu", flat=True)
            .distinct()
            .order_by("er_sigungu")
        )
    else:
        sigungu_list = []

    # 5) 각 병원에 최신 상태와 점수 계산
    hospitals = list(hospitals_qs)
    hospital_data = []
    
    for hos in hospitals:
        # 최신 상태 가져오기 (가장 최근 hvdate)
        if hasattr(hos, 'statuses') and hos.statuses.exists():
            statuses_list = list(hos.statuses.all())
            if statuses_list:
                valid_statuses = [s for s in statuses_list if s.hvdate is not None]
                if valid_statuses:
                    latest_status = max(valid_statuses, key=lambda s: s.hvdate)
                else:
                    latest_status = None
            else:
                latest_status = None
        else:
            latest_status = None
        
        hos.latest_status = latest_status

        # ---------------------------------------------------
        # 장비 필터 OR 조건 검사 (하나도 만족하지 않으면 제외)
        # ---------------------------------------------------
        if required_equips:
            match = False

            for eq in required_equips:
                if eq == "ct" and latest_status and latest_status.has_ct:
                    match = True
                if eq == "mri" and latest_status and latest_status.has_mri:
                    match = True
                if eq == "angio" and latest_status and latest_status.has_angio:
                    match = True
                if eq == "ventilator" and latest_status and latest_status.has_ventilator:
                    match = True
                if eq == "delivery" and latest_status and latest_status.birth_available:
                    match = True

            # 하나도 만족 못했으면 리스트 제외
            if not match:
                continue


        # 원형 그래프 데이터가 1개도 없으면 제외
        if not has_any_status_data(latest_status):
            continue
        
        # 지역 선택이 없을 때만 거리 및 점수 계산
        if not has_region_filter:
            score, distance_km = calculate_score(
                hos, user_lat_f, user_lng_f, selected_etype, latest_status
            )
            hos.score = score
            hos.distance_km = distance_km
            
            # 반경 30km 필터링
            if user_lat_f and user_lng_f:
                if distance_km is None or distance_km > 30:
                    continue
            
            # 필터별 장비 필터링
            if selected_etype == "stroke" or selected_etype == "traffic":
                # CT 또는 MRI 필요
                if not latest_status or (not latest_status.has_ct and not latest_status.has_mri):
                    continue
            elif selected_etype == "cardio":
                # 심장/흉부는 장비 필터 없음
                pass
            elif selected_etype == "obstetrics":
                # 분만실 필요: birth_available 이 True 여야 함
                if not latest_status or not getattr(latest_status, "birth_available", None):
                    continue
        else:
            # 지역 선택이 있을 때는 거리/점수 계산하지 않음
            hos.score = 0
            hos.distance_km = None
        
        hospital_data.append(hos)
    
    # 6) 정렬 로직
    if not has_region_filter:
        # 지역 선택이 없을 때
        if selected_sort == "distance":
            # "가장 가까운 응급실" 버튼 클릭 시: 거리 순으로 정렬
            hospital_data.sort(
                key=lambda h: h.distance_km if h.distance_km is not None else float("inf")
            )
        else:
            # 기본값: 종합점수 높은 순으로 정렬
            hospital_data.sort(key=lambda h: h.score, reverse=True)
    else:
        # 지역 선택이 있을 때는 병원명 순으로 정렬
        hospital_data.sort(key=lambda h: (h.er_name or ""))

    # 7) 화면 상단 요약용 문구
    if not selected_sido:
        region_summary = "전체 지역"
    elif not selected_sigungu:
        region_summary = f"{selected_sido} 전체"
    else:
        region_summary = f"{selected_sido} {selected_sigungu}"

    # 시/도 목록 (지역 모달용)
    raw_sido_list = (
        ErInfo.objects.values_list("er_sido", flat=True)
        .distinct()
    )

    # 표준화 + 중복 제거
    sido_list = sorted({ normalize_sido_name(s) for s in raw_sido_list })


    context = {
        "hospitals": hospital_data,
        "selected_region": region_summary,
        "selected_sido": selected_sido or "",
        "selected_sigungu": selected_sigungu or "",
        "selected_sort": selected_sort,
        "selected_etype": selected_etype,
        "sigungu_list": sigungu_list,
        "sido_list": sido_list,
        "region_dict_json": region_dict_json,
    }

    return render(request, "emergency/main.html", context)


def get_sigungu(request):
    """
    시/도 선택 시, 해당 시/도의 시/군/구 리스트를 JSON으로 반환하는 API
    (JS에서 /emergency/get_sigungu/?sido=서울특별시 이런 식으로 호출)
    """
    sido = request.GET.get("sido")

    if not sido:
        return JsonResponse({"sigungu": []})

    sigungus = (
        ErInfo.objects
        .filter(er_sido=sido)
        .values_list("er_sigungu", flat=True)
        .distinct()
        .order_by("er_sigungu")
    )

    return JsonResponse({"sigungu": list(sigungus)})


def hospital_detail_json(request, er_id: int):
    """
    상세 모달에서 사용하는 병원 상세 정보 JSON API
    """
    er_info = get_object_or_404(ErInfo, er_id=er_id)

    # 최신 상태 정보 가져오기
    latest_status = (
        ErStatus.objects
        .filter(er=er_info)
        .order_by("-hvdate")
        .first()
    )

    # 최신 메시지 가져오기 (hospital 기준, 최신 1개)
    er_message = (
        ErMessage.objects
        .filter(hospital=er_info)
        .order_by("-message_time")
        .first()
    )


    # AiReview 가져오기
    ai_review = None
    try:
        ai_review = AiReview.objects.get(er=er_info)
    except AiReview.DoesNotExist:
        pass

    # 상태 데이터 준비
    status_data = {}
    if latest_status:
        status_data = {
            "er_general_available": latest_status.er_general_available,
            "er_general_total": latest_status.er_general_total,
            "er_child_available": latest_status.er_child_available,
            "er_child_total": latest_status.er_child_total,
            "birth_available": latest_status.birth_available,
            # birth_total 제거 (Boolean만 사용)
            "negative_pressure_available": latest_status.negative_pressure_available,
            "negative_pressure_total": latest_status.negative_pressure_total,
            "isolation_general_available": latest_status.isolation_general_available,
            "isolation_general_total": latest_status.isolation_general_total,
            "isolation_cohort_available": latest_status.isolation_cohort_available,
            "isolation_cohort_total": latest_status.isolation_cohort_total,
        }

    # 장비 정보
    has_ct = latest_status.has_ct if latest_status else False
    has_mri = latest_status.has_mri if latest_status else False
    has_angio = latest_status.has_angio if latest_status else False
    has_ventilator = latest_status.has_ventilator if latest_status else False
    has_birth = bool(latest_status.birth_available) if latest_status else False


    # 태그 리스트 생성
    tags = []
    if has_ct:
        tags.append("CT")
    if has_mri:
        tags.append("MRI")
    if has_angio:
        tags.append("혈관조영")
    if has_ventilator:
        tags.append("인공호흡기")
    if has_birth:
        tags.append("분만실")


    data = {
        "er_name": er_info.er_name,
        "er_address": er_info.er_address,
        "er_lat": er_info.er_lat,
        "er_lng": er_info.er_lng,
        "tags": tags,
        "status": status_data,
        "message": er_message.message if er_message and er_message.message else None,
        "ai_review": {
            "summary": ai_review.summary if ai_review and ai_review.summary else None,
            "positive_ratio": float(ai_review.positive_ratio) if ai_review and ai_review.positive_ratio is not None else None,
            "negative_ratio": float(ai_review.negative_ratio) if ai_review and ai_review.negative_ratio is not None else None,
        } if ai_review else None,

        "kakao_map_js_key": settings.KAKAO_MAP_JS_KEY,
    }

    return JsonResponse(data)
