from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.db.models import Q
from django.utils import timezone
from datetime import datetime

import math
import json
from collections import defaultdict

from apps.db.models.emergency import ErInfo, ErStatus


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
             (음압가용률 * 0.20) + (일반격리가용률 * 0.10) + (분만실가용률 * 0.05)
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

    birth_rate = get_availability_rate(
        status.birth_available, status.birth_total
    )
    
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
        # 산모/분만: 거리 40% + 혼잡도 30% + 분만실 가용률 30%
        birth_rate = 0.0
        if status and status.birth_total and status.birth_total > 0:
            birth_rate = (status.birth_available or 0) / status.birth_total
        
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

    # 위치 정보: URL 파라미터 또는 요청 헤더에서 읽기
    # sessionStorage는 클라이언트 측에서만 접근 가능하므로,
    # JavaScript에서 읽어서 요청 헤더나 POST 데이터로 전달해야 함
    # 여기서는 URL 파라미터를 우선 확인하고, 없으면 None으로 처리
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
        hospitals_qs = hospitals_qs.filter(er_sido=selected_sido)

    if selected_sigungu:
        hospitals_qs = hospitals_qs.filter(er_sigungu=selected_sigungu)

    # status(실시간) 정보 미리 가져오기 (N+1 방지)
    hospitals_qs = hospitals_qs.prefetch_related("statuses")

    # 3) 시/도별 시/군/구 목록 (지역 모달/JS용)
    region_dict = defaultdict(set)
    for sido, sigungu in (
        ErInfo.objects
        .values_list("er_sido", "er_sigungu")
        .distinct()
    ):
        if sido and sigungu:
            region_dict[sido].add(sigungu)

    region_dict_json = json.dumps(
        {sido: sorted(list(sigungus)) for sido, sigungus in region_dict.items()},
        ensure_ascii=False,
    )

    # 4) 현재 선택된 시/군/구 목록 (모달에서 오른쪽 리스트 초기값 등으로 쓰일 수 있음)
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
        # prefetch_related로 가져온 statuses를 Python에서 직접 정렬
        if hasattr(hos, 'statuses') and hos.statuses.exists():
            # prefetch_related로 가져온 queryset을 리스트로 변환 후 정렬
            statuses_list = list(hos.statuses.all())
            if statuses_list:
                # hvdate 기준으로 내림차순 정렬하여 최신 것 선택
                # None인 경우를 처리하기 위해 필터링
                valid_statuses = [s for s in statuses_list if s.hvdate is not None]
                if valid_statuses:
                    latest_status = max(valid_statuses, key=lambda s: s.hvdate)
                else:
                    latest_status = None
            else:
                latest_status = None
        else:
            latest_status = None
        
        # latest_status를 hos 객체에 할당하여 템플릿에서 사용 가능하도록
        hos.latest_status = latest_status
        
        # 지역 선택이 없을 때만 거리 및 점수 계산
        if not has_region_filter:
            # 거리 및 점수 계산
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
                # 분만실 필요
                if not latest_status or not latest_status.birth_total or latest_status.birth_total == 0:
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
    sido_list = (
        ErInfo.objects.values_list("er_sido", flat=True)
        .distinct()
        .order_by("er_sido")
    )

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

    # 필요하면 여기에서 시/도 이름 normalization (예: 세종시 ↔ 세종특별자치시) 가능
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
    상세 모달에서 사용하는 병원 상세 + 시간대별 병상 현황 JSON API
    - URL: /emergency/hospitals/<er_id>/detail-json/
    - 반환 데이터 예시:
      {
        "er_name": "...",
        "er_address": "...",
        "er_lat": ...,
        "er_lng": ...,
        "statuses": [
          {
            "hvdate": "2025-12-03 12:30",
            "er_general_total": 10,
            "er_general_available": 3,
            ...
          },
          ...
        ]
      }
    """
    er_info = get_object_or_404(ErInfo, er_id=er_id)

    status_qs = (
        ErStatus.objects
        .filter(er=er_info)
        .order_by("hvdate")
        .values(
            "hvdate",
            "er_general_total",
            "er_general_available",
            "er_child_total",
            "er_child_available",
            "birth_total",
            "birth_available",
            "negative_pressure_total",
            "negative_pressure_available",
            "isolation_general_total",
            "isolation_general_available",
            "isolation_cohort_total",
            "isolation_cohort_available",
        )
    )


    status_list = []
    for row in status_qs:
        hvdate = row["hvdate"]
        row_dict = dict(row)
        # datetime -> 문자열 변환 (JS에서 그대로 그래프에 쓰기 편하게)
        row_dict["hvdate"] = hvdate.strftime("%Y-%m-%d %H:%M")
        status_list.append(row_dict)

    data = {
        "er_name": er_info.er_name,
        "er_address": er_info.er_address,
        "er_lat": er_info.er_lat,
        "er_lng": er_info.er_lng,
        "statuses": status_list,
    }

    return JsonResponse(data)
