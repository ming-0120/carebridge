from django.shortcuts import render
import os
from dotenv import load_dotenv
from django.views.decorators.csrf import csrf_exempt
from datetime import datetime
import requests, json
from django.utils import timezone
from django.db.models import Q
from django.http import JsonResponse
import xml.etree.ElementTree as ET

from apps.db.models import (
    MedicalRecord,
    MedicineOrders,
    MedicineData,
    LabData,
    Hospital,
    Users,
    LabOrders,
    LabUpload,
    TreatmentProcedures,
)

# .env 파일 로드
load_dotenv()

def doctor_screen_dashboard(request):
    currentYear = datetime.now().year

    items = []
    for i in range(2):
         url = f'https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo?solYear={currentYear}&numOfRows=100&ServiceKey={os.getenv("API_KEY")}&_type=json'
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
            'date': f'{y}-{m}-{d}',
            'name': data['dateName']
        })

    datas = {
        'holidays': json.dumps(holidays)
    }


    return render(request, 'emr/doctor_screen_dashboard.html', datas)

# 이미 존재
def medical_record_creation(request):
    return render(request, 'emr/medical_record_creation.html')


# -------------------------------------------------------------------
# 추가해야 하는 나머지 View (템플릿만 연결)
# -------------------------------------------------------------------

def hospital_staff_dashboard(request):

    try:
        medical_records = Hospital.objects.get(hos_id=1).medicalrecord_set.all()
        lab_order = []
        treatment_order = []
        lab_pending_count = 0
        lab_sampled_count = 0
        lab_is_urgent_count = 0
        treatment_pending_count = 0
        treatment_inprogress_count = 0
        for record in medical_records:
            try:
                lab = LabOrders.objects.get(medical_record__pk=record.medical_record_id)
                lab_order.append(lab.objects.values())
                if lab.objects.values('status') == 'PENDING':
                    lab_pending_count += 1
                if lab.objects.values('status') == 'SAMPLED':
                    lab_sampled_count += 1
                if lab.objects.values('is_urgent') == True:
                    lab_is_urgent_count += 1
            except:
                print('LabOrders error')
            print(record.medical_record_id)
            try:
                treatment = TreatmentProcedures.objects.get(medical_record__pk=record.medical_record_id)
                treatment_order.append(treatment.objects.values())
                if treatment.objects.values('status') == 'PENDING':
                    treatment_pending_count += 1
                if treatment.objects.values('status') == 'PENDING':
                    treatment_inprogress_count += 1
            except:
                print('TreatmentProcedures error')

    except:
        print('Hospital error')


    return render(request, 'emr/hospital_staff_dashboard.html')

def lab_record_creation(request):
    return render(request, 'emr/lab_record_creation.html')

def medical_record_inquiry(request):
    return render(request, 'emr/medical_record_inquiry.html')

def patient_search_list(request):
    return render(request, 'emr/patient_search_list.html')

def today_patient_list(request):
    return render(request, 'emr/today_patient_list.html')

def treatment_record_verification(request):
    return render(request, 'emr/treatment_record_verification.html')

def view_previous_medical_records(request):
    return render(request, 'emr/view_previous_medical_records.html')


# -------------------------------------------------------------------
# 의료기록 + 처방 저장 API (이미 정상)
# -------------------------------------------------------------------
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

def lab_data_search(request):
    search = request.GET.get('search', '')

    datas = []
    if (search == ''):
        datas = list(LabData.objects.all().values())
    else:
        datas = list(LabData.objects.filter(Q(lab_name__icontains=search)|Q(lab_code__icontains=search)).values())

    return JsonResponse({
        'lab_datas': datas
    })

def treatment_data_search(request):
    search = request.GET.get('search', '')

    url = f'https://apis.data.go.kr/B551182/diseaseInfoService1/getDissNameCodeList1?serviceKey={os.getenv("API_KEY")}&numOfRows=9999&pageNo=1&sickType=1&medTp=1&diseaseType=SICK_NM&searchText={search}'

    response = requests.get(url)
    root = ET.fromstring(response.text)

    items = root.findall('./body/items/item')

    datas = []
    for item in items:
        datas.append({
            'sickCd': item.find('sickCd').text,
            'sickNm': item.find('sickNm').text
        })

    return JsonResponse({
        'treatment_datas': datas
    })





