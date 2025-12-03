# apps/emergency/views.py

from django.db.models import OuterRef, Subquery, Q
from django.http import JsonResponse
from django.shortcuts import render, get_object_or_404
from django.core.serializers.json import DjangoJSONEncoder
import json
import math

from apps.db.models.emergency import (
    ErInfo as ERInfo,
    ErStatus as ERStatus,
    ErMessage as ERMessage
)

# --------------------------------
# 상수: 사용자 기준 최대 조회 거리(km)
# --------------------------------
MAX_DISTANCE_KM = 30  # 30km 고정


# -------------------------------
# 거리 계산 (Haversine)
# -------------------------------
def calc_distance(lat1, lng1, lat2, lng2):
    if not lat1 or not lng1 or not lat2 or not lng2:
        return None
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) *
         math.cos(math.radians(lat2)) *
         math.sin(dlng / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 1)


# -------------------------------
# 메인 라우팅
# -------------------------------
def emergency_main(request):
    return er_main(request)


# -------------------------------
# ER 리스트
# -------------------------------
def er_main(request):
    sido = request.GET.get('sido')
    sigungu = request.GET.get('sigungu')
    etype = request.GET.get('etype')  # 필터 값 추가
    sort = request.GET.get("sort", "score")  # 정렬 기준 추가

    SIDO_NORMALIZE = {
        "전남": "전라남도", "전북": "전라북도",
        "경남": "경상남도", "경북": "경상북도",
        "충남": "충청남도", "충청북도": "충청북도",
        "제주": "제주특별자치도",
    }
    if sido:
        sido = SIDO_NORMALIZE.get(sido, sido)

    # ------------------------
    # 사용자 위치 (GET 파라미터)
    # ------------------------
    user_lat = request.GET.get('lat')
    user_lng = request.GET.get('lng')
    user_lat = float(user_lat) if user_lat else None
    user_lng = float(user_lng) if user_lng else None

    # 기본 조회
    latest_status_sq = ERStatus.objects.filter(
        er_id=OuterRef('pk')
    ).order_by('-hvdate').values('status_id')[:1]

    qs = ERInfo.objects.annotate(
        latest_status_id=Subquery(latest_status_sq)
    ).filter(latest_status_id__isnull=False)

    if sido:
        qs = qs.filter(er_sido=sido)
    if sigungu:
        qs = qs.filter(er_sigungu=sigungu)

    # Prefetch
    hospitals = list(qs.prefetch_related('statuses').order_by('er_name'))

    # ------------------------
    # 거리 계산
    # ------------------------
    for h in hospitals:
        h.distance_km = calc_distance(user_lat, user_lng, h.er_lat, h.er_lng)

    # ------------------------
    # 지역 선택 여부에 따른 30km 필터 ON/OFF
    # ------------------------
    is_region_selected = bool(sido or sigungu)

    if not is_region_selected:
        # 지역을 선택하지 않은 상태 → 초기 진입 화면 → 내 위치 기준 30km 제한
        if user_lat is not None and user_lng is not None:
            hospitals = [
                h for h in hospitals
                if h.distance_km is not None and h.distance_km <= MAX_DISTANCE_KM
            ]

    # ------------------------
    # Availability 계산
    # ------------------------
    for h in hospitals:
        status = h.statuses.last()
        if status and status.er_general_total:
            h.avail_ratio = status.er_general_available / status.er_general_total
        else:
            h.avail_ratio = 0

    # -------------------------------------
    # 점수 계산
    # -------------------------------------
    def calc_score(h):
        if not etype:
            return 0

        # 응급유형별 가중치
        weights = {
            "stroke":     {"dist": 0.6, "avail": 0.3, "equip": 0.1},
            "traffic":    {"dist": 0.6, "avail": 0.3, "equip": 0.1},
            "cardio":     {"dist": 0.8, "avail": 0.2, "equip": 0.0},
            "obstetrics": {"dist": 0.4, "avail": 0.3, "equip": 0.3},
        }

        w = weights.get(etype, {"dist": 0.6, "avail": 0.3, "equip": 0.1})

        dist_score = 1 / (h.distance_km + 1) if h.distance_km else 0
        avail_score = h.avail_ratio
        equip_score = 0

        return (dist_score * w["dist"]) + (avail_score * w["avail"]) + (equip_score * w["equip"])

    for h in hospitals:
        h.score = calc_score(h)

    # -------------------------------------
    # 정렬 기준 분기: score OR distance
    # -------------------------------------
    if sort == "distance":
        hospitals.sort(key=lambda x: (x.distance_km if x.distance_km is not None else 9999))
    else:
        hospitals.sort(key=lambda x: x.score, reverse=True)

    # -------------------------------------
    # 지역 명 표시
    # -------------------------------------
    if sido and sigungu:
        selected_region = f"{sido} {sigungu}"
    elif sido:
        selected_region = sido
    else:
        selected_region = ""   # 지역 미선택 = 아무것도 표시하지 않음


    raw_sido_list = ERInfo.objects.values_list("er_sido", flat=True).distinct()
    sido_list = sorted({SIDO_NORMALIZE.get(s, s) for s in raw_sido_list})

    region_dict = {
        s: list(
            ERInfo.objects.filter(er_sido=s).values_list("er_sigungu", flat=True).distinct().order_by("er_sigungu")
        ) for s in sido_list
    }

    return render(
        request, "emergency/main.html",
        {
            "hospitals": hospitals,
            "sido_list": sido_list,
            "region_dict_json": json.dumps(region_dict, cls=DjangoJSONEncoder),
            "selected_region": selected_region,
        }
    )


# =======================================================
# 시군구 fetch API
# =======================================================
def get_sigungu(request):
    sido = request.GET.get("sido", "")
    if not sido:
        return JsonResponse({"sigungu": []})

    SIDO_NORMALIZE = {
        "전남": "전라남도",
        "전북": "전라북도",
        "경남": "경상남도",
        "경북": "경상북도",
        "충남": "충청남도",
        "충청북": "충청북도",
        "제주": "제주특별자치도",
    }

    sido = SIDO_NORMALIZE.get(sido, sido)

    sigungus = (
        ERInfo.objects.filter(er_sido=sido)
        .values_list("er_sigungu", flat=True)
        .distinct()
        .order_by("er_sigungu")
    )

    return JsonResponse({"sigungu": list(sigungus)})


# =======================================================
# 상세 API
# =======================================================
def hospital_detail_json(request, er_id):
    hospital = get_object_or_404(ERInfo, pk=er_id)
    st = hospital.statuses.order_by('-hvdate').first()

    # 안전하게 값 보정(available/total이 None이면 fallback)
    def safe(value):
        return value if value is not None else None

    data = {
        "er_name": hospital.er_name,
        "er_address": hospital.er_address,
        "distance": getattr(hospital, "distance_km", None),

        "tags": [
            t for t in [
                "CT" if getattr(hospital, "has_ct", False) else None,
                "MRI" if getattr(hospital, "has_mri", False) else None,
                "인공호흡기" if getattr(hospital, "has_ventilator", False) else None,
                "Angio" if getattr(hospital, "has_angio", False) else None,
            ] if t
        ],

        "messages": [],

        "status": {
            "er_general_available": safe(st.er_general_available) if st else None,
            "er_general_total": safe(st.er_general_total) if st else None,

            "er_child_available": safe(st.er_child_available) if st else None,
            "er_child_total": safe(st.er_child_total) if st else None,

            "birth_available": safe(st.birth_available) if st else None,
            "birth_total": safe(st.birth_total) if st else None,

            "negative_pressure_available": safe(st.negative_pressure_available) if st else None,
            "negative_pressure_total": safe(st.negative_pressure_total) if st else None,

            "isolation_available": safe(st.isolation_available) if st else None,
            "isolation_total": safe(st.isolation_total) if st else None,

            "cohort_available": safe(st.cohort_available) if st else None,
            "cohort_total": safe(st.cohort_total) if st else None,
        }
    }

    return JsonResponse(data)


