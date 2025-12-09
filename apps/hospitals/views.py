# hospitals/views.py
from django.http import JsonResponse
from django.shortcuts import render
import json
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
    
    # 2) JS 차트 코드가 기대하는 형태로 변환
    data = []
    for row in rows:
        data.append({
            "disease": row["disease_name"],                       # 질병명
            "stdDate": row["stat_date"].strftime("%Y-%m-%d"),     # 문자열로 변환
            "statType": row["dim_type"],                          # GENDER / AGE / REGION
            "groupName": row["dim_label"],                        # 남 / 여 / 0세 / 1세 ...
            "count": row["result_val"] or 0,                      # 건수
        })

    json_data = json.dumps(data, ensure_ascii=False)
        # 🔹 DimDisease에서 요약까지 가져오기
    diseases = list(
        DimDisease.objects.values(
            "disease_code",
            "disease_name",
            "ai_summary",
            "ai_updated_at",
        )
    )
    for d in diseases:
        if d["ai_updated_at"] is not None:
            d["ai_updated_at"] = d["ai_updated_at"].isoformat()

    diseases_json = json.dumps(diseases, ensure_ascii=False)

    return render(
        request,
        "hospitals/infectious_stat.html",
        {"raw_data_json": json_data,
         "diseases_json": diseases_json,},
        
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

    results = [
        {
            "id": h.pk,
            "name": h.name,
            "address": h.address,
        }
        for h in qs
    ]

    return JsonResponse({"results": results})