from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.db.models import Q
from django.utils import timezone

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
    selected_sido = request.GET.get("sido") or "전체"
    selected_sigungu = request.GET.get("sigungu") or "전체"
    selected_sort = request.GET.get("sort") or "distance"
    selected_etype = request.GET.get("etype") or ""  # 현재는 JS 필터용(백엔드 필터 X)

    user_lat = request.GET.get("lat")
    user_lng = request.GET.get("lng")

    # 문자열 -> float 변환 (실패 시 None)
    def to_float(value):
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    user_lat_f = to_float(user_lat)
    user_lng_f = to_float(user_lng)

    # 2) 기본 병원 queryset (ErInfo에서 시작)
    hospitals_qs = ErInfo.objects.all()

    if selected_sido != "전체":
        hospitals_qs = hospitals_qs.filter(er_sido=selected_sido)

    if selected_sigungu != "전체":
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
    if selected_sido != "전체":
        sigungu_list = (
            ErInfo.objects
            .filter(er_sido=selected_sido)
            .values_list("er_sigungu", flat=True)
            .distinct()
            .order_by("er_sigungu")
        )
    else:
        sigungu_list = []

    # 5) 각 병원에 distance_km 속성 주입 (템플릿에서 {{ hos.distance_km }} 사용)
    hospitals = list(hospitals_qs)

    for hos in hospitals:
        hos.distance_km = None
        if (
            user_lat_f is not None
            and user_lng_f is not None
            and hos.er_lat is not None
            and hos.er_lng is not None
        ):
            hos.distance_km = round(
                _haversine_km(user_lat_f, user_lng_f, hos.er_lat, hos.er_lng),
                1,
            )

    # 6) 정렬 로직
    #    - sort=distance : 거리순 (거리 없는 병원은 맨 뒤)
    #    - sort=name     : 병원명 순
    #    - 그 외         : 기본은 병원명 순
    if selected_sort == "distance" and user_lat_f is not None and user_lng_f is not None:
        hospitals.sort(
            key=lambda h: h.distance_km if h.distance_km is not None else float("inf")
        )
    elif selected_sort == "name":
        hospitals.sort(key=lambda h: (h.er_name or ""))
    else:
        hospitals.sort(key=lambda h: (h.er_name or ""))

    # 7) 화면 상단 요약용 문구
    if selected_sido == "전체":
        region_summary = "전체 지역"
    elif selected_sigungu == "전체":
        region_summary = f"{selected_sido} 전체"
    else:
        region_summary = f"{selected_sido} {selected_sigungu}"

    context = {
        "hospitals": hospitals,
        "selected_region": region_summary,
        "selected_sido": selected_sido,
        "selected_sigungu": selected_sigungu,
        "selected_sort": selected_sort,
        "selected_etype": selected_etype,
        "sigungu_list": sigungu_list,
        "region_dict_json": region_dict_json,
    }

    return render(request, "emergency/main.html", context)


def get_sigungu(request):
    """
    시/도 선택 시, 해당 시/도의 시/군/구 리스트를 JSON으로 반환하는 API
    (JS에서 /emergency/get-sigungu?sido=서울특별시 이런 식으로 호출)
    """
    sido = request.GET.get("sido")

    if not sido:
        return JsonResponse({"sigungus": []})

    # 필요하면 여기에서 시/도 이름 normalization (예: 세종시 ↔ 세종특별자치시) 가능
    sigungus = (
        ErInfo.objects
        .filter(er_sido=sido)
        .values_list("er_sigungu", flat=True)
        .distinct()
        .order_by("er_sigungu")
    )

    return JsonResponse({"sigungus": list(sigungus)})


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
            "isolation_total",
            "isolation_available",
            "cohort_total",
            "cohort_available",
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
