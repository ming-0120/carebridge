from django.shortcuts import render, redirect
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
from apps.db.models import Users
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
    Doctors,
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
                user = Users.objects.get(user_id=record.user.user_id)
                doctor = Doctors.objects.get(doctor_id=record.doctor.doctor_id)
                doctor_info = Users.objects.get(user_id=doctor.user.user_id)

                lab_order.append({
                    'lab': lab,
                    'user': user,
                    'doctor': doctor,
                    'doctor_info': doctor_info,
                    'user_age': calculate_age_from_rrn(user.resident_reg_no),
                    'record_id': record.medical_record_id,
                })
                if lab.status == 'Pending':
                    lab_pending_count += 1
                if lab.status == 'Sampled':
                    lab_sampled_count += 1
                if lab.is_urgent == True:
                    lab_is_urgent_count += 1
            except:
                print('LabOrders error')
            try:
                treatment = TreatmentProcedures.objects.exclude(
                    status__in=['Completed']
                ).get(
                    medical_record__pk=record.medical_record_id,
                    execution_datetime__contains=str(date.today()),
                )

                user = Users.objects.get(user_id=record.user.user_id)
                doctor = Doctors.objects.get(doctor_id=record.doctor.doctor_id)
                doctor_info = Users.objects.get(user_id=doctor.user.user_id)

                treatment_order.append({
                    'treatment': treatment,
                    'user': user,
                    'doctor': doctor,
                    'doctor_info': doctor_info,
                    'user_age': calculate_age_from_rrn(user.resident_reg_no),
                    'record_id': record.medical_record_id,
                })
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
    patient_id = request.GET.get("patient_id")
    return render(request, 'emr/medical_record_creation.html', {
        "patient_id": patient_id
    })



# -------------------------------------------------------------------
# 추가해야 하는 나머지 View (템플릿만 연결)
# -------------------------------------------------------------------
@csrf_exempt
def lab_record_creation(request):
    if request.method == "GET":
        order_id = request.GET['order_id']
        user_id = request.GET['user_id']
        record_id = request.GET['medical_record_id']
        files = []

        try:
            user = Users.objects.get(user_id=user_id)
            medical_record = MedicalRecord.objects.get(medical_record_id=int(record_id))
            order = LabOrders.objects.get(lab_order_id=int(order_id))

            try:
                files = list(LabOrders.objects.filter(medical_record__medical_record_id=order.lab_order_id))
            except:
                print('error')
        except:
            print('error')


        context = {
            'user': user,
            'medical_record': medical_record,
            'order': order,
            'files': files,
        }

        return render(request, 'emr/lab_record_creation.html', context)
    elif request.method == "POST":
        order_id = request.POST['order_id']
        user_id = request.POST['user_id']
        record_id = request.POST['medical_record_id']
        current_status = request.POST['current_status']
        lab_name = request.POST['labName']
        lab_code = request.POST['labCode']
        specimen_type = request.POST['specimenType']
        special_notes = request.POST['specialNotes']
        uploaded_files = request.FILES.getlist('fileAttachment')
        files = []

        try:
            user = Users.objects.get(user_id=user_id)
            medical_record = MedicalRecord.objects.get(medical_record_id=int(record_id))
            order = LabOrders.objects.get(lab_order_id=int(order_id))
            if current_status == 'Pending':
                order.status = 'Sampled'
                order.lab_nm = lab_name
                order.lab_cd = lab_code
                order.specimen_cd = specimen_type
                order.requisition_note = special_notes
                order.status_datetime = datetime.now()

                order.save()

                for file in uploaded_files:
                    labUpload = LabUpload(uploadedFile=file, original_name=file.name, lab_order=order)
                    labUpload.save()

                try:
                    files = list(LabOrders.objects.filter(medical_record__medical_record_id=order.lab_order_id))
                except:
                    print('error')
                
                
            elif current_status == 'Sampled':
                order.status_datetime = datetime.now()
                order.status = 'Completed'
                order.requisition_note = special_notes

                try:
                    files = list(LabOrders.objects.filter(medical_record__medical_record_id=order.lab_order_id))
                except:
                    print('error')



        except:
            print('error')

        context = {
            'user': user,
            'medical_record': medical_record,
            'order': order,
            'files': files,
        }

        if (order.status == 'Completed'):
            return redirect('/mstaff/hospital_dashboard/')
        else:
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
@csrf_exempt
def treatment_record_verification(request):

    if request.method == "GET":
        order_id = request.GET['order_id']
        user_id = request.GET['user_id']
        record_id = request.GET['medical_record_id']

        try:
            user = Users.objects.get(user_id=user_id)
            medical_record = MedicalRecord.objects.get(medical_record_id=int(record_id))
            order = TreatmentProcedures.objects.get(treatment_id=int(order_id))

        except:
            print('error')

        context = {
            'user': user,
            'medical_record': medical_record,
            'order': order,
        }

        return render(request, "emr/treatment_record_verification.html", context)
    elif request.method == "POST":
        order_id = request.POST['order_id']
        user_id = request.POST['user_id']
        record_id = request.POST['medical_record_id']
        current_status = request.POST['current_status']
        procedure_name = request.POST['procedureName']
        procedure_code = request.POST['procedureCode']
        procedure_site = request.POST['procedureSite']
        special_notes = request.POST['specialNotes']

        try:
            user = Users.objects.get(user_id=user_id)
            medical_record = MedicalRecord.objects.get(medical_record_id=int(record_id))
            order = TreatmentProcedures.objects.get(treatment_id=order_id)
            if current_status == 'Pending':
                order.status = 'In progress'
                order.execution_datetime = datetime.now()
                order.procedure_code = procedure_code
                order.procedure_name = procedure_name
                order.result_notes = special_notes
                order.treatment_site = procedure_site
                order.save()
            elif current_status == 'In progress':
                order.status = 'Completed'
                order.completion_datetime = datetime.now()
                order.result_notes = special_notes
                order.save()
        except:
            print('error')
        
        context = {
            'user': user,
            'medical_record': medical_record,
            'order': order,
        }

        if (order.status == 'Completed'):
            return redirect('/mstaff/hospital_dashboard/')
        else:
            return render(request, "emr/treatment_record_verification.html", context)

# ---------------------------------------------------------
# 과거 진료기록 조회 화면
# ---------------------------------------------------------
def view_previous_medical_records(request):
    return render(request, "emr/view_previous_medical_records.html")


# ---------------------------------------------------------
# 약품 검색 API
# ---------------------------------------------------------
# ---------------------------------------------------------
# 약품 검색 API (외부 API 버전)
# ---------------------------------------------------------
@require_GET
def api_search_medicine(request):
    query = request.GET.get("q", "").strip()
    if not query:
        return JsonResponse({"results": []})

    service_key = "7o7cPo1AJvy3VxggWsMo/ZVdslwCi1Ebcm6LQ36QOIkQTgFNRBGfKkzq1Ug7LhWkxdmmhjnW1zM76UZA7cOo1A=="

    url = (
        "https://apis.data.go.kr/1471000/MdcinGrnIdntfcInfoService03/getMdcinGrnIdntfcInfoList03?"
        f"serviceKey={service_key}"
        f"&item_name={query}"
        f"&pageNo=1"
        f"&numOfRows=50"
        f"&type=json"
    )

    response = requests.get(url)
    data = response.json()

    items = (
        data.get("body", {})
            .get("items", [])
    )

    results = []
    for item in items:
        name = item.get("ITEM_NAME")
        code = item.get("ITEM_SEQ")
        if name and code:
            results.append({"name": name, "code": code})

    return JsonResponse({"results": results})



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
        notes= prescriptions[0].get("note") if prescriptions else None,
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
            medical_record=record
        )
    # ------------------------------------------------
    # 예약 정보 읽기
    # ------------------------------------------------
    reservation_date = request.POST.get("reservation_date")
    reservation_type = request.POST.get("reservation_type")
    reservation_memo = request.POST.get("reservation_memo")

    # ------------------------------------------------
    # 예약 시간 유효성 검사 + 예약 datetime 생성
    # ------------------------------------------------

    reserved_at = None
    reserved_end = None

    date_str = request.POST.get("reservation_date")      # "2025-12-04T12:00" 가능
    hour_str = request.POST.get("reservation_hour")      # "12" 또는 빈값

    if date_str:

        # reservation_date 가 datetime-local 형태인 경우
        if "T" in date_str:
            naive_dt = datetime.strptime(date_str, "%Y-%m-%dT%H:%M")

        else:
            # 날짜만 있는 경우 (hour_str 사용)
            naive_dt = datetime.strptime(f"{date_str}T{hour_str}:00", "%Y-%m-%dT%H:%M")

        hour = naive_dt.hour

        # 점심시간 제외
        if hour == 13:
            return JsonResponse({"error": "13시는 예약 불가"}, status=400)

        # 운영시간 체크
        if hour < 9 or hour > 17:
            return JsonResponse({"error": "예약 가능 시간은 09~12, 14~17"}, status=400)

        # 중복 체크
        exists = Reservations.objects.filter(
            slot__doctor_id=doctor_id,
            reserved_at__date=naive_dt.date(),
            reserved_at__hour=naive_dt.hour
        ).exists()

        if exists:
            return JsonResponse({"error": "이미 예약된 시간입니다"}, status=400)
        
        # 5) timezone-aware 변환
        reserved_at = timezone.make_aware(naive_dt, timezone.get_current_timezone())
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

def patient_search_list_view(request):
    # role='patient' 인 사용자만 조회
    patients = Users.objects.filter(role='patient').values(
        'user_id', 'name', 'gender', 'birth_date'
    )

    return render(request, "emr/patient_search_list.html", {
        "patients": patients
    })
    
def api_search_patient(request):
    keyword = request.GET.get("keyword", "").strip()

    if keyword == "":
        return JsonResponse({"results": []})

    rows = Users.objects.filter(
        Q(name__icontains=keyword) |
        Q(resident_reg_no__startswith=keyword),
        role='patient'
    ).values('user_id', 'name', 'gender', 'resident_reg_no')

    results = []
    for r in rows:
        rrn = r["resident_reg_no"]
        dob = None
        if rrn and len(rrn) >= 8:
            dob = f"{rrn[0:4]}-{rrn[4:6]}-{rrn[6:8]}"

        results.append({
            "user_id": r["user_id"],
            "name": r["name"],
            "gender": r["gender"],
            "birth_date": dob,
        })

    return JsonResponse({"results": results})


def calculate_age_from_rrn(rrn_string, age_type='korean'):
    """
    주민등록번호 문자열을 받아 나이를 계산합니다.
    :param rrn_string: 'YYMMDD-GXXXXXX' 형태의 주민등록번호
    :param age_type: 'man' (만 나이) 또는 'korean' (세는 나이)
    :return: 계산된 나이 (정수)
    """
    
    # 1. 생년월일 및 성별 코드 추출
    birth_date_part = rrn_string[:6]
    gender_code = rrn_string[7]

    # 2. 세기 결정 (1900년대 vs 2000년대)
    if gender_code in ('1', '2', '5', '6', '9', '0'):
        # 19xx년생 (1, 2, 9, 0) 또는 18xx년생 (5, 6)
        if gender_code in ('1', '2', '9', '0'):
             century_prefix = 19
        else: # 5, 6
             century_prefix = 18
    else: # 3, 4, 7, 8 (20xx년생)
        century_prefix = 20

    # 3. 완전한 생년월일 생성
    birth_year = int(f"{century_prefix}{birth_date_part[:2]}")
    birth_month = int(birth_date_part[2:4])
    birth_day = int(birth_date_part[4:6])

    today = date.today()
    
    # 4. 나이 계산 로직
    if age_type == 'man':
        ## 📌 만 나이 계산 (국제 표준)
        # (현재 연도 - 출생 연도)에서, 아직 생일이 지나지 않았으면 1을 뺌
        age = today.year - birth_year
        if (today.month, today.day) < (birth_month, birth_day):
            age -= 1
        return age
        
    elif age_type == 'korean':
        ## 📌 세는 나이 계산 (한국식 나이)
        # (현재 연도 - 출생 연도) + 1
        return today.year - birth_year + 1
        
    else:
        raise ValueError("age_type은 'man' 또는 'korean'이어야 합니다.")