from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
import json

from apps.db.models import (
    MedicalRecord,
    MedicineOrders,
    MedicineData
)

# ---------------------------------------------------------
# 의사 대시보드 화면
# ---------------------------------------------------------
def doctor_screen_dashboard(request):
    return render(request, 'emr/doctor_screen_dashboard.html')


# ---------------------------------------------------------
# 진료기록 작성 페이지
# ---------------------------------------------------------
def medical_record_creation(request):
    return render(request, 'emr/medical_record_creation.html')


# ---------------------------------------------------------
# 의료기록 + 처방 저장 API
# ---------------------------------------------------------
@csrf_exempt
def api_create_medical_record(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST only"}, status=400)

    record_type = request.POST.get("record_type")
    ptnt_div_cd = request.POST.get("ptnt_div_cd")
    subjective = request.POST.get("subjective")
    objective = request.POST.get("objective")
    assessment = request.POST.get("assessment")
    plan = request.POST.get("plan")

    patient_id = request.POST.get("patient_id")
    doctor_id = request.POST.get("doctor_id")
    hos_id = request.POST.get("hos_id")

    prescriptions_raw = request.POST.get("prescriptions", "[]")
    prescriptions = json.loads(prescriptions_raw)

    record = MedicalRecord.objects.create(
        record_type=record_type,
        ptnt_div_cd=ptnt_div_cd,
        record_datetime=timezone.now(),
        subjective=subjective,
        objective=objective,
        assessment=assessment,
        plan=plan,
        doctor_id=doctor_id,
        hos_id=hos_id,
        user_id=patient_id,
    )

    order = MedicineOrders.objects.create(
        order_datetime=timezone.now(),
        start_datetime=None,
        stop_datetime=None,
        notes=None,
        medical_record_id=record.medical_record_id
    )

    for p in prescriptions:
        MedicineData.objects.create(
            order_code=p.get("drug_code"),
            order_name=p.get("drug_name"),
            dose=p.get("dose"),
            frequency=p.get("frequency"),
            order_id=order.order_id
        )

    return JsonResponse({
        "result": "ok",
        "medical_record_id": record.medical_record_id
    })
