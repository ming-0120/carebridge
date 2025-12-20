from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.db.models import Q
from django.utils import timezone
from datetime import datetime
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from collections import defaultdict
from apps.db.models.emergency import ErInfo, ErStatus, ErMessage
from apps.db.models.review import AiReview
from apps.db.models.favorite import UserFavorite
from apps.db.models.users import Users
from django.conf import settings
from .templatetags import status_filters
from django.core.cache import cache


import math
import json



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
        # 기본: 거리 60% + 혼잡도 40%
        total_score = (
            distance_score * 0.60 +
            congestion_score * 0.40
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

    # 1) SESSION 값 읽기 (GET 완전 제거)
    selected_sido = request.session.get("region_sido")
    selected_sigungu = request.session.get("region_sigungu")
    selected_sort = request.session.get("sort", "score")   # 기본 정렬: score
    selected_etype = request.session.get("etype", "")      # 선택된 응급유형(없으면 "")
    selected_filters = request.session.get("filters", {})  # CT/MRI/Angio 등 필터 세트


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
    # session에서 필터 정보 읽기
    session_filters = request.session.get("filters", {})
    for eq in ["ct", "mri", "angio", "delivery", "ventilator"]:
        # session에서 먼저 확인, 없으면 GET 파라미터 확인 (하위 호환성)
        if session_filters.get(eq) == "1" or request.GET.get(eq) == "1":
            required_equips.add(eq)


    # 위치 정보
    # ★★★★★ GET → SESSION → HEADER 순서로 읽기 ★★★★★
    user_lat = (
        request.GET.get("lat")
        or request.session.get("lat")
        or request.headers.get("X-User-Lat")
    )

    user_lng = (
        request.GET.get("lng")
        or request.session.get("lng")
        or request.headers.get("X-User-Lng")
    )


    # 문자열 -> float 변환 (실패 시 None)
    def to_float(value):
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    user_lat_f = to_float(user_lat)
    user_lng_f = to_float(user_lng)

    # 지역 선택 여부 확인
    # 시/도가 선택되었는지 확인 (시/군/구는 "전체"일 수 있음)
    has_sido_filter = selected_sido not in (None, "", "전체")
    # 시/도와 시/군/구가 모두 선택되었는지 확인 (완전한 지역 필터)
    has_region_filter = (
        has_sido_filter and
        selected_sigungu not in (None, "", "전체")
    )


    # 2) 기본 병원 queryset (ErInfo에서 시작)
    hospitals_qs = ErInfo.objects.all()

    # 시/도 필터링 (시/도가 선택되었고 "전체"가 아닐 때만)
    if selected_sido and selected_sido != "전체":
        std_sido = normalize_sido_name(selected_sido)
        hospitals_qs = hospitals_qs.filter(er_sido__in=[
            selected_sido,
            std_sido,
            selected_sido.replace("도",""),
            std_sido.replace("도",""),
        ])

    # 시/군/구 필터링 (시/군/구가 선택되었고 "전체"가 아닐 때만)
    if selected_sigungu and selected_sigungu != "전체":
        hospitals_qs = hospitals_qs.filter(er_sigungu=selected_sigungu)

    # status(실시간) 정보 미리 가져오기 (N+1 방지)
    hospitals_qs = hospitals_qs.prefetch_related("statuses")

    # 3) 시/도별 시/군/구 목록 (표준화 적용) — 캐시 적용
    cache_key = "region_dict_json:v1"
    region_dict_json = cache.get(cache_key)

    if region_dict_json is None:
        raw_regions = (
            ErInfo.objects
            .values_list("er_sido", "er_sigungu")
            .distinct()
        )

        region_dict = defaultdict(set)

        for sido, sigungu in raw_regions:
            if sido and sigungu:
                std_sido = normalize_sido_name(sido)
                region_dict[std_sido].add(sigungu)

        region_dict_json = json.dumps(
            {sido: sorted(list(sigungus)) for sido, sigungus in region_dict.items()},
            ensure_ascii=False,
        )

        # 6시간 캐시 (지역 정보는 자주 안 바뀜)
        cache.set(cache_key, region_dict_json, 60 * 60 * 6)




    # 4) 현재 선택된 시/군/구 목록
    if selected_sido:
        # 표준화 로직 적용 (get_sigungu와 동일)
        # DB에 "경북", "경남" 등으로 저장되어 있을 수 있으므로 여러 변형 허용
        std_sido = normalize_sido_name(selected_sido)
        sigungu_list = (
            ErInfo.objects
            .filter(er_sido__in=[
                selected_sido,
                std_sido,
                selected_sido.replace("도", ""),
                std_sido.replace("도", ""),
            ])
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
        if not has_sido_filter:
            # 시/도가 선택되지 않았을 때: 거리 기반 필터링 적용
            score, distance_km = calculate_score(
                hos, user_lat_f, user_lng_f, selected_etype, latest_status
            )
            hos.score = score
            hos.distance_km = distance_km
            
            # 반경 30km 필터링 (위치 정보가 있을 때만)
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
            # 시/도가 선택되었을 때: 거리/점수 계산하지 않음 (위치 정보 없어도 표시)
            hos.score = 0
            hos.distance_km = None
        
        hospital_data.append(hos)
    
    # 6) 정렬 로직
    if not has_sido_filter:
        # 시/도가 선택되지 않았을 때: 거리/점수 기반 정렬
        if selected_sort == "distance":
            # "가장 가까운 응급실" 버튼 클릭 시: 거리 순으로 정렬
            hospital_data.sort(
                key=lambda h: h.distance_km if h.distance_km is not None else float("inf")
            )
        else:
            # 기본값: 종합점수 높은 순으로 정렬
            hospital_data.sort(key=lambda h: h.score, reverse=True)
    else:
        # 시/도가 선택되었을 때는 병원명 순으로 정렬 (시/군/구가 "전체"여도)
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

    # 즐겨찾기 상태 확인 (로그인 사용자만)
    user_id = request.session.get("user_id")
    favorite_er_ids = set()
    if user_id:
        favorite_er_ids = set(
            UserFavorite.objects.filter(
                user_id=user_id,
                er__isnull=False,
                hos__isnull=True
            ).values_list('er_id', flat=True)
        )
    
    # hospital_data에 즐겨찾기 상태 추가
    for hos in hospital_data:
        hos.is_favorite = hos.er_id in favorite_er_ids

    # selected_filters를 JSON으로 직렬화 (템플릿에서 사용)
    selected_filters_json = json.dumps(selected_filters, ensure_ascii=False)

    context = {
        "hospitals": hospital_data,
        "selected_region": region_summary,
        "selected_sido": selected_sido or "",
        "selected_sigungu": selected_sigungu or "",
        "selected_sort": selected_sort,
        "selected_etype": selected_etype,
        "selected_filters": selected_filters_json,  # JSON 문자열로 전달
        "sigungu_list": sigungu_list,
        "sido_list": sido_list,
        "region_dict_json": region_dict_json,
        "KAKAO_MAP_JS_KEY": settings.KAKAO_MAP_JS_KEY,  # 카카오맵 SDK 키 추가
        "GOOGLE_API_KEY": settings.GOOGLE_API_KEY,  # GOOGLE_MAPS_API_KEY → GOOGLE_API_KEY로 변경
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

    # emergency_main과 동일한 표준화 로직 적용
    # DB에 "경북", "경남" 등으로 저장되어 있을 수 있으므로 여러 변형 허용
    std_sido = normalize_sido_name(sido)
    
    sigungus = (
        ErInfo.objects
        .filter(er_sido__in=[
            sido,
            std_sido,
            sido.replace("도", ""),
            std_sido.replace("도", ""),
        ])
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

    # 상태 데이터 준비 + 메인 템플릿 계산 결과를 함께 전달
    status_data = {}
    status_ui = {}

    def build_status_ui(available, total, type_name: str):
        """
        메인 템플릿(status_filters)과 동일한 계산을 서버에서 수행한다.
        그래프 표시 여부, 라벨/색상, stroke 값 등을 한 번 계산해 내려준다.
        """
        label = status_filters.congestion_text(available, total, type_name)
        color_class = status_filters.congestion_color_class(available, total, type_name)

        dash_offset = None
        bg_stroke = "#e0e0e0"
        if total is not None and total > 0 and available is not None:
            dash_offset = status_filters.circle_dashoffset(available, total)
            # available 0 & red일 때만 배경을 빨강으로 처리 (메인과 동일)
            if available == 0 and color_class == "red":
                bg_stroke = "#E53935"

        return {
            "label": label,
            "color_class": color_class,
            "dash_offset": dash_offset,  # None이면 그래프 미표시
            "bg_stroke": bg_stroke,
            "available": available,
            "total": total,
        }

    if latest_status:
        status_data = {
            "er_general_available": latest_status.er_general_available,
            "er_general_total": latest_status.er_general_total,
            "er_child_available": latest_status.er_child_available,
            "er_child_total": latest_status.er_child_total,
            "birth_available": latest_status.birth_available,
            "birth_total": latest_status.birth_total,  # 메인 페이지와 동일하게 전달
            "negative_pressure_available": latest_status.negative_pressure_available,
            "negative_pressure_total": latest_status.negative_pressure_total,
            "isolation_general_available": latest_status.isolation_general_available,
            "isolation_general_total": latest_status.isolation_general_total,
            "isolation_cohort_available": latest_status.isolation_cohort_available,
            "isolation_cohort_total": latest_status.isolation_cohort_total,
        }

        status_ui = {
            "er_general": build_status_ui(
                latest_status.er_general_available,
                latest_status.er_general_total,
                "er_general",
            ),
            "er_child": build_status_ui(
                latest_status.er_child_available,
                latest_status.er_child_total,
                "er_child",
            ),
            "birth": build_status_ui(
                latest_status.birth_available,
                latest_status.birth_total,
                "birth",
            ),
            "negative_pressure": build_status_ui(
                latest_status.negative_pressure_available,
                latest_status.negative_pressure_total,
                "negative_pressure",
            ),
            "isolation_general": build_status_ui(
                latest_status.isolation_general_available,
                latest_status.isolation_general_total,
                "isolation_general",
            ),
            "isolation_cohort": build_status_ui(
                latest_status.isolation_cohort_available,
                latest_status.isolation_cohort_total,
                "isolation_cohort",
            ),
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


    # 즐겨찾기 상태 확인 (로그인 사용자만)
    is_favorite = False
    user_id = request.session.get("user_id")
    if user_id:
        is_favorite = UserFavorite.objects.filter(
            user_id=user_id,
            er=er_info,
            hos__isnull=True
        ).exists()

    data = {
        "er_name": er_info.er_name,
        "er_address": er_info.er_address,
        "er_lat": er_info.er_lat,
        "er_lng": er_info.er_lng,
        "er_id": er_info.er_id,  # 추가: 모달에서 즐겨찾기 토글 시 사용
        "is_favorite": is_favorite,  # 추가: 즐겨찾기 상태
        "tags": tags,
        "status": status_data,
        "status_ui": status_ui,  # 메인과 동일한 계산 결과
        "message": er_message.message if er_message and er_message.message else None,
        "ai_review": {
            "summary": ai_review.summary if ai_review and ai_review.summary else None,
            "positive_ratio": float(ai_review.positive_ratio) if ai_review and ai_review.positive_ratio is not None else None,
            "negative_ratio": float(ai_review.negative_ratio) if ai_review and ai_review.negative_ratio is not None else None,
        } if ai_review else None,

        "kakao_map_js_key": settings.KAKAO_MAP_JS_KEY,
    }

    return JsonResponse(data)

# =========================================
# ★  통합 POST API 엔드포인트  ★
# =========================================
@csrf_exempt
def update_preferences(request):
    """
    통합 POST API:
    action: "sort" | "region" | "filter" | "reset"
    모든 UI 동작을 POST + session 기반으로 처리함.
    """
    if request.method != "POST":
        return JsonResponse({"error": "POST only"}, status=400)

    data = json.loads(request.body)
    action = data.get("action")

    # 0) 모든 설정 초기화 (새로고침 시)
    if action == "reset":
        request.session.pop("region_sido", None)
        request.session.pop("region_sigungu", None)
        request.session.pop("sort", None)
        request.session.pop("etype", None)
        request.session.pop("filters", None)

    # 1) 정렬 설정
    elif action == "sort":
        request.session["sort"] = data.get("sort")
        # 필터 초기화: "가장 가까운 응급실" 선택 시 필터는 독립적으로 동작
        request.session.pop("etype", None)
        request.session.pop("filters", None)

    # 2) 지역 설정
    elif action == "region":
        request.session["region_sido"] = data.get("sido")
        request.session["region_sigungu"] = data.get("sigungu")

    # 3) 필터 설정 (etype, ct, mri, angio 등)
    elif action == "filter":
        request.session["etype"] = data.get("etype", "")
        request.session["filters"] = data.get("filters", {})
        # 정렬 초기화: 필터 적용 시 정렬은 독립적으로 동작
        request.session.pop("sort", None)

    request.session.save()
    return JsonResponse({"status": "ok"})

@require_POST
def toggle_er_favorite(request):
    """응급실 즐겨찾기 토글 (AJAX)"""
    # 1) 로그인 사용자 확인 (세션 기반)
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse({"ok": False, "error": "login_required"}, status=401)

    user = get_object_or_404(Users, pk=user_id)

    # 2) 응급실 ID 파라미터 확인
    er_id = request.POST.get("er_id")
    if not er_id:
        return JsonResponse({"ok": False, "error": "no_er_id"}, status=400)

    er = get_object_or_404(ErInfo, pk=er_id)

    # 3) 이미 즐겨찾기 되어 있으면 삭제, 없으면 생성
    qs = UserFavorite.objects.filter(user=user, er=er, hos__isnull=True)
    # hos__isnull=True 로 "일반 병원이 아닌 응급실 즐겨찾기" 로 한정

    if qs.exists():
        qs.delete()
        is_favorite = False
    else:
        UserFavorite.objects.create(
            user=user,
            er=er,
            hos=None,     # 응급실 즐겨찾기이므로 hos는 비워둠
            memo="",      # 필요 없으면 빈 문자열
        )
        is_favorite = True

    # 4) JSON 응답
    return JsonResponse({"ok": True, "is_favorite": is_favorite})

