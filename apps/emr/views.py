from django.shortcuts import render,redirect
from django.http import JsonResponse
from dotenv import load_dotenv
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET
from datetime import datetime, date, time, timezone as dt_timezone, timedelta
from django.db import connection
from django.db.models import Q
from pytz import timezone as tz
from django.utils import timezone
from django.utils.timezone import localdate
from apps.db.models import MedicalRecord, Users, Doctors, Reservations, LabOrders, TreatmentProcedures
import requests, json
import os
import xml.etree.ElementTree as ET
from django.db.models import F
from django.db.models.functions import Abs
from django.core import serializers
from django.db.models import Count
from django.db.models import DateField
from django.db.models.functions import Cast

KST = tz("Asia/Seoul")


# ----------------------------
# 중복 제거: Reservations 단일 import
# ----------------------------
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
    TimeSlots,
)

load_dotenv()

@require_GET
def api_reserved_hours(request):
    doctor_id = request.GET.get("doctor_id")
    date_str = request.GET.get("date")

    if not doctor_id or not date_str:
        return JsonResponse({"error": "doctor_id, date 필요"}, status=400)

    target_date = datetime.strptime(date_str, "%Y-%m-%d").date()

    # KST 날짜 범위 생성
    start_kst = timezone.make_aware(
        datetime.combine(target_date, datetime.min.time()),
        KST
    )
    end_kst = timezone.make_aware(
        datetime.combine(target_date, datetime.max.time()),
        KST
    )

    # UTC 변환 (Django 5.2에서는 timezone.utc 제거됨 → dt_timezone.utc 사용)
    start_utc = start_kst.astimezone(dt_timezone.utc)
    end_utc   = end_kst.astimezone(dt_timezone.utc)

    # UTC 범위로 DB 조회
    qs = Reservations.objects.filter(
        slot__doctor_id=doctor_id,
        reserved_at__gte=start_utc,
        reserved_at__lte=end_utc
    ).values_list("reserved_at", flat=True)

    reserved_hours = []
    for dt in qs:
        local_dt = dt.astimezone(KST)
        reserved_hours.append(local_dt.hour)

    return JsonResponse({"reserved_hours": reserved_hours})


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

    doctor = {}
    users = []
    try:
        doctor = Doctors.objects.get(doctor_id=1)
        # users = list(Users.objects.filter(
        #     reservations__slot__doctor_id=doctor.doctor_id,
        #     reservations__slot__slot_date=date.today()
        # ))

        users = list(Reservations.objects.filter(
            # 필터링: 해당 의사의, 오늘 날짜에 잡힌 예약만 선택
            slot__doctor_id=doctor.doctor_id,
            slot__slot_date=date.today() 
        ).select_related(
            # Eager Loading: User 객체와 TimeSlots 객체를 한 번의 쿼리로 미리 가져옵니다.
            'user', 
            'slot' 
        ).order_by(
            # 정렬: TimeSlots의 start_time을 기준으로 오름차순 정렬
            'slot__start_time' 
        ))
        
        
    except:
        print('error')

    try:
        now = datetime.now() 
        seven_days_ago_date = now.date() - timedelta(days=7)
        start_of_period = datetime.combine(seven_days_ago_date, time.min)
        end_of_period = now

        daily_stats = list(MedicalRecord.objects.filter(
            hos_id=doctor.hos_id,
            record_datetime__gte=start_of_period,
            record_datetime__lte=end_of_period
        ).annotate(
            record_date=Cast('record_datetime', output_field=DateField())
        ).values('record_date').annotate(
            count=Count('medical_record_id')
        ).order_by('record_date'))

        labels = []  # 날짜 (x축)
        data = []    # 진료 건수 (y축)
        
        for item in daily_stats:
            labels.append(item['record_date'].strftime('%Y-%m-%d'))
            data.append(item['count'])
            
        medical_record_chart_data = {
            'labels': labels,
            'data': data,
        }

    except:
        print('error')

    datas = {
        'holidays': json.dumps(holidays),
        'users': users,
        'doctor': doctor,
        'medical_record_chart': medical_record_chart_data,
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
                lab = LabOrders.objects.exclude(
                    status__in=['Completed']
                ).get(
                    medical_record__pk=record.medical_record_id,
                    order_datetime__contains=str(date.today())
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
                
            elif current_status == 'Sampled':
                order.status_datetime = datetime.now()
                order.status = 'Completed'
                order.requisition_note = special_notes

                order.save()
                
            elif current_status == 'Sampled':
                order.status_datetime = datetime.now()
                order.status = 'Completed'
                order.requisition_note = special_notes

                order.save()

                for file in uploaded_files:
                    labUpload = LabUpload(uploadedFile=file, original_name=file.name, lab_order=order)
                    labUpload.save()

                try:
                    files = list(LabUpload.objects.filter(lab_order__pk=order.lab_order_id))
                except:
                    print('error')



        except:
            print('error')

        user_data = serializers.serialize('json', [user])
        medical_record_data = serializers.serialize('json', [medical_record])
        order_data = serializers.serialize('json', [order])
        files_data = serializers.serialize('json', files)

        python_user_data = json.loads(user_data)
        python_medical_record_data = json.loads(medical_record_data)
        python_order_data = json.loads(order_data)
        python_files_data = json.loads(files_data)

        files_dict_data = [item['fields'] for item in python_files_data]
        print(python_user_data[0]['fields'])
        python_user_data[0]['fields']['user_id'] = python_user_data[0]['pk']
        python_medical_record_data[0]['fields']['medical_record_id'] = python_medical_record_data[0]['pk']
        python_order_data[0]['fields']['lab_order_id'] = python_order_data[0]['pk']

        return JsonResponse({
            'user': python_user_data[0]['fields'],
            'medical_record': python_medical_record_data[0]['fields'],
            'order': python_order_data[0]['fields'],
            'files': files_dict_data,
        })

        

def medical_record_inquiry(request):
    return render(request, "emr/medical_record_inquiry.html")

def patient_search_list(request):
    return render(request, "emr/patient_search_list.html")

def today_patient_list(request):
    return render(request, "emr/today_patient_list.html")

def view_previous_medical_records(request):
    return render(request, "emr/view_previous_medical_records.html")



# ---------------------------------------------------------
# 치료/처치 기록 검증
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
# 오늘의 환자 리스트 검색
# ---------------------------------------------------------
@require_GET
def api_today_patients(request):
    q = request.GET.get("q", "").strip()
    today = localdate()

    matched_users = Users.objects.filter(
        Q(name__icontains=q) |
        Q(resident_reg_no__icontains=q)
    ).values_list("user_id", flat=True)

    reservations = (
        Reservations.objects.filter(
            user_id__in=matched_users,
            slot__slot_date=today,
        )
        .select_related(
            "user",
            "slot",
            "slot__doctor",
            "slot__doctor__user",
            "slot__doctor__dep",
        )
        .order_by("slot__start_time")
    )

    result = []

    for r in reservations:
        u = r.user
        s = r.slot
        d = s.doctor

        # 오늘 이전 기록 중 가장 최근
        today_start = timezone.make_aware(
            datetime.combine(today, time.min),
            timezone.get_current_timezone()
        )

        recent_record = (
            MedicalRecord.objects
            .filter(user=u, record_datetime__lt=today_start)
            .order_by('-record_datetime')
            .first()
        )

        recent_diag = recent_record.record_datetime.date().isoformat() if recent_record else ""

        # -----------------------------------------------------
        # 오더 유무 계산 (해당 환자의 모든 기록 기준)
        # -----------------------------------------------------
        # medical_record_id 리스트 전체 확보
        all_records = MedicalRecord.objects.filter(user=u).values_list("medical_record_id", flat=True)

        # Lab Completed 여부
        lab_completed = LabOrders.objects.filter(
            medical_record_id__in=all_records,
            status="Completed"
        ).exists()

        # Treatment Completed 여부
        treat_completed = TreatmentProcedures.objects.filter(
            medical_record_id__in=all_records,
            status="Completed"
        ).exists()

        if lab_completed or treat_completed:
            order_summary = "있음"
        else:
            order_summary = "없음"

        # -----------------------------------------------------
        # JSON 반환
        # -----------------------------------------------------
        result.append({
            "name": u.name,
            "gender": u.gender,
            "dob": u.resident_reg_no[:8],
            "visit": str(s.slot_date),
            "time": str(s.start_time)[:5],
            "dept": d.dep.dep_name if d and d.dep else "",
            "doctor": d.user.name if d else "",
            "recent_diag": recent_diag,
            "order_detail": order_summary,
        })

    return JsonResponse({"patients": result})

# ---------------------------------------------------------
# 약품 검색 API
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

    items = data.get("body", {}).get("items", [])

    results = []
    for item in items:
        name = item.get("ITEM_NAME")
        code = item.get("ITEM_SEQ")
        if name and code:
            results.append({"name": name, "code": code})

    return JsonResponse({"results": results})



# ---------------------------------------------------------
# 진료기록 + 처방 + 오더 + 예약 저장
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
    special_note = request.POST.get("special_note")

    patient_id = request.POST.get("patient_id")
    doctor_id = request.POST.get("doctor_id")
    hos_id = request.POST.get("hos_id")

    prescriptions_raw = request.POST.get("prescriptions", "[]")
    prescriptions = json.loads(prescriptions_raw)

    orders_raw = request.POST.get("orders", "{}")
    orders = json.loads(orders_raw)

    def safe_date(date_str):
        if not date_str:
            return None
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
    # 처방전 생성
    # ------------------------------
    med_order = MedicineOrders.objects.create(
        order_datetime=timezone.now(),
        start_datetime=global_start,
        stop_datetime=global_end,
        notes=prescriptions[0].get("note") if prescriptions else None,
        medical_record_id=record.medical_record_id
    )

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

    # ------------------------------
    # 예약 데이터 처리
    # ------------------------------
    reservation_type = request.POST.get("reservation_type")
    reservation_memo = request.POST.get("reservation_memo")
    reserved_at = None
    reserved_end = None

    date_str = request.POST.get("reservation_date_day")
    hour_str = request.POST.get("reservation_hour")

    if date_str and hour_str:
        naive_dt = datetime.strptime(
            f"{date_str} {hour_str}:00",
            "%Y-%m-%d %H:%M"
        )

        reserved_at = timezone.make_aware(naive_dt, timezone.get_current_timezone())
        reserved_end = reserved_at + timezone.timedelta(hours=1)

        local_hour = reserved_at.astimezone(timezone.get_current_timezone()).hour

        if local_hour == 13:
            return JsonResponse({"error": "13시는 예약 불가"}, status=400)

        if local_hour < 9 or local_hour > 17:
            return JsonResponse({"error": "예약 가능 시간은 09~12, 14~17"}, status=400)


        exists = Reservations.objects.filter(
            slot__doctor_id=doctor_id,
            reserved_at=reserved_at
        ).exists()

        if exists:
            return JsonResponse({"error": "이미 예약된 시간입니다"}, status=400)

    if reserved_at:
        slot_id = get_or_create_slot_id(int(doctor_id), reserved_at, reserved_end)

        reservation = Reservations.objects.create(
            reserved_at=reserved_at,
            reserved_end=reserved_end,
            slot_type=1 if reservation_type == "consultation" else 2,
            notes=reservation_memo,
            user_id=patient_id,
            slot_id=slot_id
        )

        # -----------------------------------------------------
        # ★ 오늘 날짜 예약이면 오늘 날짜 medical_record 자동 생성
        # -----------------------------------------------------
        today = localdate()

        # reserved_at은 aware datetime → 날짜만 비교
        if reserved_at.date() == today:
            exists_today_record = MedicalRecord.objects.filter(
                user_id=patient_id,
                record_datetime__date=today
            ).exists()

            if not exists_today_record:
                MedicalRecord.objects.create(
                    record_type="consult",
                    ptnt_div_cd="N",
                    record_datetime=timezone.now(),
                    doctor_id=doctor_id,
                    hos_id=hos_id,
                    user_id=patient_id,
                    assessment="",
                    subjective="",
                    objective="",
                    plan="",
                    record_content=""
                )

    return JsonResponse({
        "result": "ok",
        "medical_record_id": record.medical_record_id
    })

# ---------------------------------------------------------
# 슬롯 생성 함수
# ---------------------------------------------------------
def get_or_create_slot_id(doctor_id, reserved_at, reserved_end):
    slot_date = reserved_at.date()
    start_time = reserved_at.time()
    end_time = reserved_end.time()

    with connection.cursor() as cursor:
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



# ---------------------------------------------------------
# 검사/치료 검색 API
# ---------------------------------------------------------
def lab_data_search(request):
    search = request.GET.get('search', '')

    datas = []
    if search == '':
        datas = list(LabData.objects.all().values())
    else:
        datas = list(LabData.objects.filter(Q(lab_name__icontains=search) | Q(lab_code__icontains=search)).values())

    return JsonResponse({'lab_datas': datas})


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

    return JsonResponse({'treatment_datas': datas})



# ---------------------------------------------------------
# 환자 검색
# ---------------------------------------------------------
def patient_search_list_view(request):
    patients = Users.objects.filter(role='patient').values(
        'user_id', 'name', 'gender', 'birth_date'
    )

    return render(request, "emr/patient_search_list.html", {"patients": patients})


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

@csrf_exempt
def set_doctor_memo(request):
    memo = request.POST['memo']
    doctor_id = request.POST['doctor_id']

    try:
        doctor = Doctors.objects.get(doctor_id=doctor_id)
        doctor.memo = memo
        doctor.save()
    except:
        print('error')
    

    return JsonResponse({"result": 'Ok'})


# ---------------------------------------------------------
# 나이 계산
# ---------------------------------------------------------
def calculate_age_from_rrn(rrn_string, age_type='korean'):
    birth_date_part = rrn_string[:6]
    gender_code = rrn_string[7]

    if gender_code in ('1', '2', '5', '6', '9', '0'):
        if gender_code in ('1', '2', '9', '0'):
            century_prefix = 19
        else:
            century_prefix = 18
    else:
        century_prefix = 20

    birth_year = int(f"{century_prefix}{birth_date_part[:2]}")
    birth_month = int(birth_date_part[2:4])
    birth_day = int(birth_date_part[4:6])

    today = date.today()

    if age_type == 'man':
        age = today.year - birth_year
        if (today.month, today.day) < (birth_month, birth_day):
            age -= 1
        return age

    elif age_type == 'korean':
        return today.year - birth_year + 1

    else:
        raise ValueError("age_type은 'man' 또는 'korean'이어야 합니다.")
    

def extract_birth_date(reg_num):
    # 입력된 주민등록번호에서 하이픈(-)을 제거하고 숫자만 남깁니다.
    reg_num = reg_num.replace('-', '').strip()

    if len(reg_num) != 13 or not reg_num.isdigit():
        return "오류: 올바른 주민등록번호 형식이 아닙니다."

    # 1. 생년월일 부분 (앞 6자리)
    yy = reg_num[0:2]
    mm = reg_num[2:4]
    dd = reg_num[4:6]
    
    # 2. 성별/세기 구분 번호 (7번째 자리)
    century_digit = reg_num[6]
    
    # 3. 세기 결정 (가장 일반적인 경우: 1900년대와 2000년대)
    if century_digit in ('1', '2', '5', '6'):
        # 1, 2, 7, 8: 1900년대 (1, 2는 내국인, 7, 8은 외국인)
        # 7, 8은 외국인 등록번호에서 사용되었으나, 최근에는 5, 6으로 대체됨
        year_prefix = '19'
    elif century_digit in ('3', '4', '5', '6'):
        # 3, 4, 5, 6: 2000년대 (3, 4는 내국인, 5, 6은 외국인)
        year_prefix = '20'
    elif century_digit in ('9', '0'):
         # 9, 0: 1800년대 (매우 희귀)
        year_prefix = '18'
    else:
        return "오류: 유효하지 않은 성별 구분 번호입니다."
    
    # 최종 생년월일 문자열 조합
    full_year = year_prefix + yy
    birth_date = f"{full_year}-{mm}-{dd}"
    
    return birth_date
