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

# -------------------------------
# 거리 계산
# -------------------------------
def calc_distance(lat1, lng1, lat2, lng2):
    if not lat1 or not lng1 or not lat2 or not lng2:
        return None
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lat2 - lng1)
    a = (math.sin(dlat/2)**2 +
         math.cos(math.radians(lat1)) *
         math.cos(math.radians(lat2)) *
         math.sin(dlng/2)**2)
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

    SIDO_NORMALIZE = {
        "전남": "전라남도", "전북": "전라북도",
        "경남": "경상남도", "경북": "경상북도",
        "충남": "충청남도", "충북": "충청북도",
        "제주": "제주특별자치도",
    }
    if sido:
        sido = SIDO_NORMALIZE.get(sido, sido)

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

    # 거리 계산
    for h in hospitals:
        h.distance_km = calc_distance(user_lat, user_lng, h.er_lat, h.er_lng)

    # Availability 계산
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

        dist_score = 1 / (h.distance_km + 1) if h.distance_km else 0  # 가까울수록 높음
        avail_score = h.avail_ratio
        equip_score = 0   # 추후 장비 필터에 따라 상승 가능

        return (dist_score * w["dist"]) + (avail_score * w["avail"]) + (equip_score * w["equip"])

    for h in hospitals:
        h.score = calc_score(h)

    # 점수순 정렬 (높은 점수 우선)
    hospitals.sort(key=lambda x: x.score, reverse=True)

    # region display
    selected_region = f"{sido} {sigungu}" if sido and sigungu else (sido or "전체 지역")

    raw_sido_list = ERInfo.objects.values_list("er_sido", flat=True).distinct()
    sido_list = sorted({SIDO_NORMALIZE.get(s, s) for s in raw_sido_list})

    region_dict = {
        s: list(
            ERInfo.objects.filter(er_sido=s).values_list("er_sigungu", flat=True).distinct().order_by("er_sigungu")
        ) for s in sido_list
    }

    return render(
        request, "emergency/main.html",
        {"hospitals": hospitals, "sido_list": sido_list,
         "region_dict_json": json.dumps(region_dict, cls=DjangoJSONEncoder),
         "selected_region": selected_region}
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
        "충북": "충청북도",
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
    er_info = get_object_or_404(ERInfo, pk=er_id)
    latest_status = ERStatus.objects.filter(er_id=er_id).order_by('-hvdate').first()

    if not latest_status:
        return JsonResponse({'error': 'no_status'}, status=404)

    return JsonResponse({
        "name": er_info.er_name,
        "address": er_info.er_address,
        "lat": er_info.er_lat,
        "lng": er_info.er_lng,
        "hvdate": latest_status.hvdate.strftime('%Y-%m-%d %H:%M'),
        "messages": [],
        "status": {
            "er_general_available": latest_status.er_general_available,
            "er_general_total": latest_status.er_general_total,
            "er_child_available": latest_status.er_child_available,
            "er_child_total": latest_status.er_child_total,
            "birth_available": latest_status.birth_available,
            "birth_total": latest_status.birth_total,
            "negative_pressure_available": latest_status.negative_pressure_available,
            "negative_pressure_total": latest_status.negative_pressure_total,
            "isolation_available": latest_status.isolation_available,
            "isolation_total": latest_status.isolation_total,
            "cohort_available": latest_status.cohort_available,
            "cohort_total": latest_status.cohort_total,
        }
    })