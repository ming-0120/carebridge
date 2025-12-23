# hospitals/views.py
from django.http import JsonResponse
from django.shortcuts import render
import os
import json
import requests
from apps.db.models.disease import DimDisease
from apps.db.models.statistic import InfectiousStat
from apps.db.models.hospital import Hospital
from django.views.decorators.http import require_GET
from django.db.models import Q

def infectious_stat(request):
    qs = InfectiousStat.objects.all().values(
        "disease_name",
        "stat_date",
        "dim_type",
        "dim_label",
        "result_val",
    )
    rows = list(qs)

    # JS 차트 코드가 기대하는 형태로 변환
    data = []
    for row in rows:
        data.append({
            "disease": row["disease_name"],
            "stdDate": row["stat_date"].strftime("%Y-%m-%d"),
            "statType": row["dim_type"],
            "groupName": row["dim_label"],
            "count": row["result_val"] or 0,
        })

    json_data = json.dumps(data, ensure_ascii=False)

    # DimDisease에서 요약까지 가져오기
    diseases = list(
        DimDisease.objects.values(
            "disease_code",
            "disease_name",
            "ai_summary",
            "ai_updated_at",
        )
    )

    for d in diseases:
        # datetime -> iso
        if d["ai_updated_at"] is not None:
            d["ai_updated_at"] = d["ai_updated_at"].isoformat()

        # ai_summary: JSON 문자열 -> dict 변환
        s = d.get("ai_summary")
        if not s:
            d["ai_summary"] = None
        elif isinstance(s, dict):
            # JSONField 등 이미 dict인 경우
            d["ai_summary"] = s
        else:
            # TextField에 JSON 문자열로 저장된 경우
            try:
                d["ai_summary"] = json.loads(s)
            except json.JSONDecodeError:
                d["ai_summary"] = None

    diseases_json = json.dumps(diseases, ensure_ascii=False)

    return render(
        request,
        "hospitals/infectious_stat.html",
        {
            "raw_data_json": json_data,
            "diseases_json": diseases_json,
        },
    )

@require_GET
def hospital_search(request):
    q = request.GET.get("q", "").strip()

    if not q:
        return JsonResponse({"results": []})

    qs = (
        Hospital.objects
        .filter(Q(name__icontains=q))
        .order_by("name")
    )
    # DB에서 등록된 병원의 병원명 목록 조회 (hos_name이 있는 병원만)
    # 병원명으로 비교하여 등록 여부 확인 (hpid는 UUID로 자동 생성되므로 API의 ykiho와 일치하지 않음)
    # distinct()로 중복 제거하여 쿼리 최적화
    registered_names = set(
        Hospital.objects
        .filter(hos_name__isnull=False)
        .exclude(hos_name="")
        .values_list("name", flat=True)
        .distinct()
    )
    results = [
        {
            "id": h.pk,
            "name": h.name,
            "address": h.address,
            "tel":h.tel,
            "estb_date" : h.estb_date,
            "is_registered": h.name in registered_names,  # DB에 등록된 병원인지 확인 (병원명 기준)
        }
        for h in qs
    ]

    return JsonResponse({"results": results})

