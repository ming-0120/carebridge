from django.shortcuts import render
from django.http import JsonResponse
import os
from dotenv import load_dotenv
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET
from datetime import datetime, date
import requests, json
from django.utils import timezone
from apps.db.models.slot_reservation import Reservations
from django.db import connection
from django.db.models import Q
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
    Reservations,
)

load_dotenv()


# ---------------------------------------------------------
# 의사 대시보드 화면
# ---------------------------------------------------------
def doctor_screen_dashboard(request):
    currentYear = datetime.now().year

    items = []
    for i in range(2):
        url = (
            f'https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/'
            f'getRestDeInfo?solYear={currentYear}&numOfRows=100&ServiceKey={os.getenv("API_KEY")}&_type=json'
        )
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


# ---------------------------------------------------------
# 병원 직원 대시보드
# ---------------------------------------------------------
def hospital_staff_dashboard(request):
    lab_order = []
    treatment_order = []
    lab_pending_count = 0
    lab_sampled_count = 0
    lab_is_urgent_count = 0
    treatment_pending_count = 0
    treatment_inprogress_count = 0
    try:
        medical_records = Hospital.objects.get(hos_id=1).medicalrecord_set.all()
        for record in medical_records:
            try:
                print(str(date.today()))
                lab = LabOrders.objects.exclude(
                    status__in=['Completed']
                ).get(
                    medical_record__pk=record.medical_record_id,
                    order_datetime__contains=str(date.today()),
                )
                lab_order.append(lab)
                if lab.status == 'Pending':
                    lab_pending_count += 1
                if lab.status == 'Sampled':
                    lab_sampled_count += 1
                if lab.is_urgent == True:
                    lab_is_urgent_count += 1
            except:
                print('LabOrders error')
            print(record.medical_record_id)
            try:
                treatment = TreatmentProcedures.objects.exclude(
                    status__in=['Completed']
                ).get(
                    medical_record__pk=record.medical_record_id,
                    execution_datetime__contains=str(date.today()),
                )
                treatment_order.append(treatment)
                if treatment.status == 'Pending':
                    treatment_pending_count += 1
                if treatment.status == 'In progress':
                    treatment_inprogress_count += 1
            except:
                print('TreatmentProcedures error')    
    except:
        print('Hospital error')

    context = {
       'lab_order': lab_order,
       'treatment_order': treatment_order,
       'lab_pending_count': lab_pending_count,
       'lab_sampled_count': lab_sampled_count,
       'lab_is_urgent_count': lab_is_urgent_count,
       'treatment_pending_count': treatment_pending_count,
       'treatment_inprogress_count': treatment_inprogress_count
    }

    return render(request, 'emr/hospital_staff_dashboard.html', context)



# ---------------------------------------------------------
# 검사 입력 화면
# ---------------------------------------------------------
def lab_record_creation(request):
    return render(request, "emr/lab_record_creation.html")


# ---------------------------------------------------------
# 진료기록 작성 화면
# ---------------------------------------------------------
def medical_record_creation(request):
    return render(request, 'emr/medical_record_creation.html')


# -------------------------------------------------------------------
# 추가해야 하는 나머지 View (템플릿만 연결)
# -------------------------------------------------------------------

def lab_record_creation(request):
    return render(request, 'emr/lab_record_creation.html')

def medical_record_inquiry(request):
    return render(request, "emr/medical_record_inquiry.html")


# ---------------------------------------------------------
# 환자 검색 화면
# ---------------------------------------------------------
def patient_search_list(request):
    return render(request, "emr/patient_search_list.html")


# ---------------------------------------------------------
# 오늘의 환자 목록
# ---------------------------------------------------------
def today_patient_list(request):
    return render(request, "emr/today_patient_list.html")


# ---------------------------------------------------------
# 치료/처치 기록 검증 화면
# ---------------------------------------------------------
def treatment_record_verification(request):
    return render(request, "emr/treatment_record_verification.html")


# ---------------------------------------------------------
# 과거 진료기록 조회 화면
# ---------------------------------------------------------
def view_previous_medical_records(request):
    return render(request, "emr/previous_medical_records.html")


# ---------------------------------------------------------
# 약품 검색 API
# ---------------------------------------------------------
@require_GET
def api_search_medicine(request):
    q = request.GET.get("q", "").strip()

    if q == "":
        return JsonResponse({"results": []})

    rows = MedicineData.objects.filter(order_name__icontains=q)[:50]

    data = [{"name": r.order_name, "code": r.order_code} for r in rows]

    return JsonResponse({"results": data})


# ---------------------------------------------------------
# 진료기록 + 처방 + 검사 + 치료 오더 저장 API
# ---------------------------------------------------------
@csrf_exempt
def api_create_medical_record(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST only"}, status=400)

    # ------------------------------
    # 기본 진료 정보
    # ------------------------------
    record_type = request.POST.get("record_type")
    ptnt_div_cd = request.POST.get("ptnt_div_cd")
    subjective = request.POST.get("subjective")
    objective = request.POST.get("objective")
    assessment = request.POST.get("assessment")
    plan = request.POST.get("plan")
    special_note = request.POST.get("special_note")

    patient_id = request.POST.get("patient_id")
    doctor_id = request.POST.get("doctor_id")
    hos_id = request.POST.get("hos_id")

    # ------------------------------
    # 처방 리스트
    # ------------------------------
    prescriptions_raw = request.POST.get("prescriptions", "[]")
    prescriptions = json.loads(prescriptions_raw)

    # ------------------------------
    # 투약기간 + 검사/치료 오더
    # ------------------------------
    orders_raw = request.POST.get("orders", "{}")
    orders = json.loads(orders_raw)

    # 날짜 하루 밀림 방지용 변환 함수
    def safe_date(date_str):
        if not date_str:
            return None
        # HTML date → 00:00으로 오면 timezone 변환 시 하루 밀림 발생
        # 이를 방지하기 위해 '12:00' 고정
        return datetime.strptime(date_str + " 12:00", "%Y-%m-%d %H:%M")

    global_start = safe_date(orders.get("start_date"))
    global_end = safe_date(orders.get("end_date"))
    order_type = orders.get("order_type")
    emergency_flag = orders.get("emergency_flag")


    # ------------------------------
    # 진료기록 생성
    # ------------------------------
    record = MedicalRecord.objects.create(
        record_type=record_type,
        ptnt_div_cd=ptnt_div_cd,
        record_datetime=timezone.now(),
        record_content=special_note,
        subjective=subjective,
        objective=objective,
        assessment=assessment,
        plan=plan,
        doctor_id=doctor_id,
        hos_id=hos_id,
        user_id=patient_id,
    )

    # ------------------------------
    # 처방전(MedicineOrders)
    # ------------------------------
    med_order = MedicineOrders.objects.create(
        order_datetime=timezone.now(),
        start_datetime=global_start,
        stop_datetime=global_end,
        notes=None,
        medical_record_id=record.medical_record_id
    )

    # ------------------------------
    # 약품(MedicineData)
    # ------------------------------
    for p in prescriptions:
        MedicineData.objects.create(
            order_code=p.get("drug_code"),
            order_name=p.get("drug_name"),
            dose=p.get("dose"),
            frequency=p.get("frequency"),
            order_id=med_order.order_id,
        )

    # ------------------------------
    # 검사 오더
    # ------------------------------
    if order_type == "lab":
        LabOrders.objects.create(
            is_urgent=(emergency_flag == "yes"),
            order_datetime=timezone.now(),
            medical_record_id=record.medical_record_id
        )


    # ------------------------------
    # 치료 오더
    # ------------------------------
    elif order_type == "treatment":
        TreatmentProcedures.objects.create(
            execution_datetime=timezone.now(),
            status="pending",
            medical_record=record
        )
    # ------------------------------------------------
    # 예약 정보 읽기
    # ------------------------------------------------
    reservation_date = request.POST.get("reservation_date")
    reservation_type = request.POST.get("reservation_type")
    reservation_memo = request.POST.get("reservation_memo")

    reserved_at = None
    reserved_end = None

    if reservation_date:
        # 문자열을 datetime으로 변환
        naive_dt = datetime.strptime(reservation_date, "%Y-%m-%dT%H:%M")

        # timezone aware 로 변환
        if timezone.is_naive(naive_dt):
            reserved_at = timezone.make_aware(naive_dt, timezone.get_current_timezone())
        else:
            reserved_at = naive_dt

        reserved_end = reserved_at + timezone.timedelta(hours=1)

    # ------------------------------
    # 예약 저장
    # ------------------------------
    if reserved_at:
        # time_slots 에서 slot_id 확보 또는 생성
        slot_id = get_or_create_slot_id(int(doctor_id), reserved_at, reserved_end)

        Reservations.objects.create(
            reserved_at=reserved_at,
            reserved_end=reserved_end,
            slot_type=1 if reservation_type == "consultation" else 2,
            notes=reservation_memo,
            user_id=patient_id,
            slot_id=slot_id   # ← 이 값이 FK 제약을 항상 만족한다
        )

    return JsonResponse({
        "result": "ok",
        "medical_record_id": record.medical_record_id
    })

def get_or_create_slot_id(doctor_id, reserved_at, reserved_end):
    """
    reservations.slot_id 가 참조할 time_slots.slot_id 를
    DB에 직접 SELECT/INSERT 해서 확보하는 함수.
    스키마는 건드리지 않고 데이터만 추가한다.
    """
    slot_date = reserved_at.date()
    start_time = reserved_at.time()
    end_time = reserved_end.time()

    with connection.cursor() as cursor:
        # 1) 기존 슬롯 있는지 확인
        cursor.execute(
            """
            SELECT slot_id
            FROM time_slots
            WHERE doctor_id = %s
              AND slot_date = %s
              AND start_time = %s
              AND end_time = %s
            LIMIT 1
            """,
            [doctor_id, slot_date, start_time, end_time],
        )
        row = cursor.fetchone()
        if row:
            return row[0]

        # 2) 없으면 새로 생성
        now = timezone.now()
        cursor.execute(
            """
            INSERT INTO time_slots
                (slot_date, start_time, end_time, status, capacity, created_at, doctor_id)
            VALUES
                (%s, %s, %s, %s, %s, %s, %s)
            """,
            [slot_date, start_time, end_time, "reserved", 1, now, doctor_id],
        )
        return cursor.lastrowid

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
