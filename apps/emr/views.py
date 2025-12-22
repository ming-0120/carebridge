from django.shortcuts import render,redirect
from django.http import JsonResponse, Http404, HttpResponseBadRequest
from dotenv import load_dotenv
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET
from datetime import datetime, date, time, timezone as dt_timezone, timedelta
from django.db import connection
from django.db import transaction
from django.db.models import Q
from pytz import timezone as tz
from django.utils import timezone
from django.utils.timezone import localdate
from apps.db.models import (
    MedicalRecord,
    Users,
    Doctors,
    Reservations,
    LabOrders,
    TreatmentProcedures,
)
import requests, json
import os
import xml.etree.ElementTree as ET
from django.db.models import F
from django.db.models.functions import Abs
from django.core import serializers
from django.db.models import Count
from django.db.models import DateField
from django.db.models.functions import Cast
from django.core.serializers.json import DjangoJSONEncoder
from django.db.models import Max
from django.utils.timezone import make_aware
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.forms.models import model_to_dict
from django.core.paginator import Paginator
import socket
from django.conf import settings
from apps.services.holidays import get_holidays_for_years, is_holiday_date


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

def get_common_header_context(request):
    user_id = request.session.get('user_id', None)
    role = request.session.get('role', None)

    doctor = None
    department = ""
    doctor_name = ""

    if role == 'DOCTOR':
        try:
            doctor = Doctors.objects.get(user_id=user_id)
            department = doctor.dep.dep_name if doctor.dep else ""
            doctor_name = doctor.user.name
        except:
            pass

    return {
        "doctor": doctor,
        "department": department,
        "doctor_name": doctor_name,
    }


def _ensure_doctor_logged_in(request):
    """
    의사 로그인 세션이 없으면 로그인 페이지로 리다이렉트.
    """
    user_id = request.session.get("user_id")
    role = request.session.get("role")
    if not user_id or role != "DOCTOR":
        return redirect(f"/accounts/login/?next={request.path}")
    return None

def _get_pending_reservations_for_doctor(doctor, target_date):
    """
    Collect reservations for the given doctor/date and drop only the ones that
    already have a medical record completed for that specific day (pairing
    1 completed record to 1 reservation in time order).
    """
    if not doctor or not target_date:
        return []

    day_start = timezone.make_aware(
        datetime.combine(target_date, time.min),
        timezone.get_current_timezone(),
    )
    day_end = day_start + timedelta(days=1)

    reservations = list(
        Reservations.objects.filter(
            slot__doctor_id=doctor.doctor_id,
            slot__slot_date=target_date,
        )
        .select_related("user", "slot")
        .order_by("slot__start_time")
    )
    if not reservations:
        return []

    patient_ids = {res.user_id for res in reservations}

    completed_counts = (
        MedicalRecord.objects.filter(
            doctor_id=doctor.doctor_id,
            hos_id=doctor.hos_id,
            user_id__in=patient_ids,
            record_datetime__gte=day_start,
            record_datetime__lt=day_end,
        )
        .values("user_id")
        .annotate(cnt=Count("medical_record_id"))
    )
    completed_by_user = {row["user_id"]: row["cnt"] for row in completed_counts}

    pending_reservations = []
    reservations_by_user = {}
    for res in reservations:
        reservations_by_user.setdefault(res.user_id, []).append(res)

    for res_list in reservations_by_user.values():
        res_list.sort(key=lambda r: r.slot.start_time)
        completed = completed_by_user.get(res_list[0].user_id, 0)
        # drop as many earliest reservations as completed records for that user/day
        pending_reservations.extend(res_list[completed:])

    pending_reservations.sort(key=lambda r: r.slot.start_time)
    return pending_reservations

@require_GET
def api_patient_summary(request):
    patient_id = request.GET.get("patient_id")

    if not patient_id:
        return JsonResponse({"error": "patient_id required"}, status=400)

    # 환자 기본 정보
    try:
        patient = Users.objects.get(user_id=patient_id)
    except Users.DoesNotExist:
        return JsonResponse({"error": "not found"}, status=404)

    # 생년월일
    birth_date = extract_birth_date(patient.resident_reg_no)

    # -----------------------------------------
    # 1) 최근 방문 기록 1건
    # -----------------------------------------
    hos_id = None
    try:
        current_user_id = request.session.get("user_id")
        current_doctor = Doctors.objects.get(user_id=current_user_id)
        hos_id = current_doctor.hos_id
    except Exception:
        hos_id = None

    recent_qs = (
        MedicalRecord.objects
        .filter(user_id=patient_id)
        .select_related("doctor", "doctor__user", "doctor__dep")
        .order_by("-record_datetime")
    )
    if hos_id:
        recent_record = recent_qs.filter(hos_id=hos_id).first() or recent_qs.first()
    else:
        recent_record = recent_qs.first()

    recent_visit = None
    recent_dept = None
    recent_doctor = None

    if recent_record:
        recent_visit = timezone.localtime(recent_record.record_datetime).strftime("%Y년 %m월 %d일 %H시 %M분")

        if recent_record.doctor and recent_record.doctor.dep:
            recent_dept = recent_record.doctor.dep.dep_name

        if recent_record.doctor and recent_record.doctor.user:
            recent_doctor = recent_record.doctor.user.name
    else:
        try:
            reservation = (
                Reservations.objects
                .filter(user_id=patient_id, slot__doctor__hos_id=hos_id)
                .select_related("slot", "slot__doctor", "slot__doctor__user", "slot__doctor__dep")
                .order_by("-slot__slot_date", "-slot__start_time")
                .first()
            )
            if reservation and reservation.slot and reservation.slot.doctor:
                if reservation.slot.doctor.dep:
                    recent_dept = reservation.slot.doctor.dep.dep_name
                if reservation.slot.doctor.user:
                    recent_doctor = reservation.slot.doctor.user.name
        except Exception:
            pass

    # -----------------------------------------
    # 2) 최근 진료 1건
    # -----------------------------------------
    recent_consult = None
    if recent_record:
        recent_consult = {
            "record_type": recent_record.record_type,
            "record_datetime": timezone.localtime(recent_record.record_datetime).strftime("%Y년 %m월 %d일 %H시 %M분"),
            "subjective": recent_record.subjective,
            "objective": recent_record.objective,
            "assessment": recent_record.assessment,
            "plan": recent_record.plan,
        }

    return JsonResponse({
        "patient": {
            "name": patient.name,
            "gender": patient.gender,
            "birth_date": birth_date,
            "recent_visit": recent_visit,
        },
        "recent_dept": recent_dept or "-",
        "recent_doctor": recent_doctor or "-",
        "recent_consult": recent_consult,
    })

@require_GET
def api_reserved_hours(request):
    doctor_id = request.GET.get("doctor_id")
    date_str = request.GET.get("date")

    if not doctor_id or not date_str:
        return JsonResponse({"error": "doctor_id, date 필요"}, status=400)

    target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    if is_holiday_date(target_date):
        return JsonResponse({"reserved_hours": [], "holiday": True})

    # slot_date를 직접 사용
    qs = Reservations.objects.filter(
        slot__doctor_id=doctor_id,
        slot__slot_date=target_date
    ).select_related("slot").values_list("slot__start_time", flat=True)

    reserved_hours = [t.hour for t in qs]

    return JsonResponse({"reserved_hours": reserved_hours})



# ---------------------------------------------------------
# 의사 대시보드 화면
# ---------------------------------------------------------
def doctor_screen_dashboard(request):

    user_role = request.session.get('role', '')
    if user_role != 'DOCTOR':
        return redirect('/')

    user_id = request.session.get('user_id', '')
    currentYear = datetime.now().year
    holidays = get_holidays_for_years(currentYear, years=2)

    doctor = {}
    users = []
    try:
        doctor = Doctors.objects.select_related(
            'user',
            'hos',
            'dep',
        ).get(
            user_id=user_id
        )

        # 서버/DB TZ와 무관하게 로컬(설정된 TIME_ZONE, 기본 Asia/Seoul) 기준 날짜 사용
        target_date = timezone.localdate()
        users = _get_pending_reservations_for_doctor(doctor, target_date)
        
    except:
        print('error')

    
    now = datetime.now() 
    seven_days_ago_date = now.date() - timedelta(days=7)
    start_of_period = datetime.combine(seven_days_ago_date, time.min)
    end_of_period = now
    daily_medical_record_stats = []
    medical_record_chart_data = []
    daily_lab_orders_stats = []
    lab_orders_chart_data = []
    daily_treatment_stats = []
    treatment_chart_data = []
    daily_medical_record_completed_count = 0
    daily_reservation_count = 0

    try:
        daily_medical_record_stats = list(MedicalRecord.objects.filter(
            hos_id=doctor.hos_id,
            record_datetime__gte=start_of_period,
            record_datetime__lte=end_of_period
        ).annotate(
            record_date=Cast('record_datetime', output_field=DateField())
        ).values('record_date').annotate(
            count=Count('medical_record_id')
        ).order_by('record_date'))
        
        for item in daily_medical_record_stats:
            medical_chart = {
                'labels': item['record_date'].strftime('%Y-%m-%d'),
                'data': item['count']
            }
            medical_record_chart_data.append(medical_chart)
    except:
        print('error')

    try:
        daily_lab_orders_stats = list(LabOrders.objects.filter(
            medical_record__hos_id=doctor.hos_id,
            status_datetime__gte=start_of_period,
            status_datetime__lte=end_of_period,
            status='Completed'
        ).annotate(
            status_date=Cast('status_datetime', output_field=DateField())
        ).values('status_date').annotate(
            count=Count('lab_order_id')
        ).order_by('status_date'))

        for item in daily_lab_orders_stats:
            lab_orders_chart = {
                'labels': item['status_date'].strftime('%Y-%m-%d'),
                'data': item['count']
            }
            lab_orders_chart_data.append(lab_orders_chart)
    except:
        print('error')

    try:
        daily_treatment_stats = list(TreatmentProcedures.objects.filter(
            medical_record__hos_id=doctor.hos_id,
            completion_datetime__gte=start_of_period,
            completion_datetime__lte=end_of_period,
            status='Completed'
        ).annotate(
            completion_date=Cast('completion_datetime', output_field=DateField())
        ).values('completion_date').annotate(
            count=Count('treatment_id')
        ).order_by('completion_date'))

        for item in daily_treatment_stats:
            treatment_chart = {
                'labels': item['completion_date'].strftime('%Y-%m-%d'),
                'data': item['count']
            }
            treatment_chart_data.append(treatment_chart)
    except:
        print('error')

    try:
        daily_medical_record_completed_count = MedicalRecord.objects.filter(
            doctor_id=doctor.doctor_id,
            record_datetime__contains=str(date.today())
        ).count()

        daily_reservation_count = Reservations.objects.filter(
            slot__doctor_id=doctor.doctor_id,
            slot__slot_date=date.today() 
        ).count()
    except:
        print('error')

    datas = {
        'holidays': json.dumps(holidays),
        'users': users,
        'doctor': doctor,
        'medical_record_chart': json.dumps(medical_record_chart_data),
        'lab_orders_chart': json.dumps(lab_orders_chart_data),
        'treatment_chart': json.dumps(treatment_chart_data),
        'daily_medical_record_completed_count': daily_medical_record_completed_count,
        'daily_reservation_count': daily_reservation_count,
    }

    return render(request, 'emr/doctor_screen_dashboard.html', datas)



# ---------------------------------------------------------
# 병원 직원 대시보드
# ---------------------------------------------------------
def hospital_staff_dashboard(request):

    user_role = request.session.get('role', '')
    if user_role != 'HOSPITAL':
        return redirect('/')

    lab_order = []
    treatment_order = []
    lab_pending_count = 0
    lab_sampled_count = 0
    lab_is_urgent_count = 0
    treatment_pending_count = 0
    treatment_inprogress_count = 0
    hos_id = request.session.get('hospital_id', None)
    try:
        medical_records = Hospital.objects.get(hos_id=hos_id).medicalrecord_set.all()
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
       'treatment_inprogress_count': treatment_inprogress_count,
       'hos_id': hos_id,
    }

    return render(request, 'emr/hospital_staff_dashboard.html', context)


# ---------------------------------------------------------
# 진료기록 작성 화면
# ---------------------------------------------------------
# ---------------------------------------------------------
# 진료기록 작성 화면
# ---------------------------------------------------------
def medical_record_creation(request):
    guard = _ensure_doctor_logged_in(request)
    if guard:
        return guard

    # 1) 쿼리스트링에서 patient_id 가져오기
    patient_id = request.GET.get("patient_id")
    user_id = request.session.get("user_id")
    slot_id = request.GET.get("slot_id")
    reservation_id = request.GET.get("reservation_id")
    reservation_date_str = request.GET.get("date")

    # 2) 환자(Users), 의사(Doctors) 객체 조회
    #    의사는 지금 전체를 doctor_id=1로 쓰고 있으니 동일하게 통일
    if not patient_id:
        raise Http404("patient_id required")

    try:
        patient = Users.objects.get(user_id=patient_id)
    except Users.DoesNotExist as exc:
        raise Http404("patient not found") from exc

    try:
        doctor = Doctors.objects.select_related("user", "hos", "dep").get(user_id=user_id)
    except Doctors.DoesNotExist as exc:
        raise Http404("doctor not found") from exc

    # 3) 화면용 파생 값 세팅
    #    주민번호 → 생년월일
    birth = extract_birth_date(patient.resident_reg_no)
    if birth and isinstance(birth, str) and "-" in birth:
        try:
            y, m, d = birth.split("-")[:3]
            birth_display = f"{y}년 {m}월 {d}일"
        except Exception:
            birth_display = birth
    else:
        birth_display = birth or "-"

    gender_display = (
        "남" if patient.gender == "M"
        else "여" if patient.gender in ("F", "W")
        else (patient.gender or "-")
    )
    #    진료과 이름 (모델 구조에 따라 dep_name 사용)
    department = doctor.dep.dep_name if doctor.dep else ""
    #    의사 이름 (Users 테이블에 연결되어 있다고 가정)
    doctor_name = doctor.user.name if hasattr(doctor, "user") else ""

    now_dt = timezone.now()

    def _parse_iso_date(date_str: str | None):
        if not date_str:
            return None
        try:
            return date.fromisoformat(date_str)
        except Exception:
            return None

    # 예약 시 환자가 입력한 증상 메모(Reservations.notes) 조회
    reservation_notes = ""
    reservation_slot_date = None
    reservation_slot_time = None

    try:
        reservation_qs = Reservations.objects.select_related("slot").filter(user_id=patient.user_id)
        if doctor:
            reservation_qs = reservation_qs.filter(slot__doctor_id=doctor.doctor_id)

        if reservation_id:
            reservation_qs = reservation_qs.filter(reservation_id=reservation_id)
        elif slot_id:
            reservation_qs = reservation_qs.filter(slot_id=slot_id)
        else:
            target_date = _parse_iso_date(reservation_date_str)
            if target_date:
                reservation_qs = reservation_qs.filter(slot__slot_date=target_date)

        reservation = reservation_qs.order_by("-slot__slot_date", "-slot__start_time", "-reservation_id").first()
        if reservation:
            reservation_notes = (reservation.notes or "").strip()
            reservation_slot_date = getattr(reservation.slot, "slot_date", None)
            reservation_slot_time = getattr(reservation.slot, "start_time", None)
    except Exception:
        pass

    requested_reservation_date = _parse_iso_date(reservation_date_str)
    target_record_date = reservation_slot_date or requested_reservation_date
    if target_record_date and is_holiday_date(target_record_date):
        return HttpResponseBadRequest("공휴일에는 예약/진료기록을 생성할 수 없습니다.")

    context = {
        "patient": patient,
        "doctor": doctor,          # doctor.doctor_id, doctor.hos_id 템플릿에서 사용
        "birth": birth,
        "birth_display": birth_display,
        "gender_display": gender_display,
        "department": department,
        "doctor_name": doctor_name,
        "now": now_dt,
        "reservation_notes": reservation_notes,
        "reservation_slot_date": reservation_slot_date,
        "reservation_slot_time": reservation_slot_time,
        "holidays": json.dumps(get_holidays_for_years(datetime.now().year, years=2), ensure_ascii=False),
        "source_slot_id": slot_id,
        "source_reservation_id": reservation_id,
    }

    return render(request, 'emr/medical_record_creation.html', context)

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
        hos_id = request.GET['hos_id']
        session_hos_id = request.session.get('hospital_id', None)
        user_role = request.session.get('role', '')

        if (hos_id != session_hos_id or user_role != 'HOSPITAL'):
            redirect('/')

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

        rrn_digits = "".join(ch for ch in str(getattr(user, "resident_reg_no", "") or "") if ch.isdigit())
        if len(rrn_digits) >= 13:
            resident_reg_no_display = f"{rrn_digits[:6]}-{rrn_digits[6:13]}"
        elif len(rrn_digits) > 6:
            resident_reg_no_display = f"{rrn_digits[:6]}-{rrn_digits[6:]}"
        elif rrn_digits:
            resident_reg_no_display = rrn_digits
        else:
            resident_reg_no_display = "-"

        context = {
            'user': user,
            'medical_record': medical_record,
            'order': order,
            'files': files,
            'resident_reg_no_display': resident_reg_no_display,
            'hos_id': hos_id,
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
        hos_id = request.session.get('hospital_id', None)

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

        if is_redis_alive():
            try:
                channel_layer = get_channel_layer()

                group_name = f'hospital_group_{hos_id}'

                async_to_sync(channel_layer.group_send)(
                    group_name,
                    {
                        "type": "chart_update_event", 
                        "message": "lab"
                    }
                )
            except:
                print('error')

        return JsonResponse({
            'user': python_user_data[0]['fields'],
            'medical_record': python_medical_record_data[0]['fields'],
            'order': python_order_data[0]['fields'],
            'files': files_dict_data,
        })

def medical_record_inquiry(request):
    guard = _ensure_doctor_logged_in(request)
    if guard:
        return guard

    ctx = get_common_header_context(request)

    patient_id = request.GET.get("patient_id")
    if not patient_id:
        return render(request, "emr/medical_record_inquiry.html", ctx)

    patient = Users.objects.get(user_id=patient_id)
    birth = extract_birth_date(patient.resident_reg_no)
    age = calculate_age_from_rrn(patient.resident_reg_no)
    gender_display = (
        "남" if patient.gender == "M"
        else "여" if patient.gender in ("F", "W")
        else (patient.gender or "-")
    )

    rrn_raw = patient.resident_reg_no or ""
    rrn_digits = "".join(ch for ch in str(rrn_raw) if ch.isdigit())
    if len(rrn_digits) >= 13:
        resident_reg_no_display = f"{rrn_digits[:6]}-{rrn_digits[6:13]}"
    elif len(rrn_digits) > 6:
        resident_reg_no_display = f"{rrn_digits[:6]}-{rrn_digits[6:]}"
    elif rrn_digits:
        resident_reg_no_display = rrn_digits
    else:
        resident_reg_no_display = "-"

    recent_record = (
        MedicalRecord.objects
        .filter(user_id=patient_id)
        .order_by("-record_datetime")
        .first()
    )
    recent_visit_date = (
        recent_record.record_datetime.strftime("%Y년 %m월 %d일")
        if recent_record else "기록 없음"
    )

    visits = (
        MedicalRecord.objects
        .filter(user_id=patient_id)
        .select_related("doctor", "doctor__user")
        .order_by("-record_datetime")
    )

    visit_list = []

    def _format_korean_datetime(dt):
        if not dt:
            return "-"
        try:
            local_dt = timezone.localtime(dt)
        except Exception:
            local_dt = dt
        return local_dt.strftime("%Y년 %m월 %d일 %H시 %M분")

    for v in visits:
        visit_date = v.record_datetime.date()
        doctor_name = v.doctor.user.name if v.doctor and v.doctor.user else ""

        # LabOrders → 리스트
        lab_list = []
        try:
            lab_obj = v.laborders
            attachments = []
            if lab_obj:
                try:
                    uploads = LabUpload.objects.filter(lab_order=lab_obj)
                    attachments = [
                        {"name": upload.original_name, "url": upload.uploadedFile.url}
                        for upload in uploads
                    ]
                except Exception:
                    attachments = []

                lab_list.append({
                    "lab_nm": lab_obj.lab_nm,
                    "status": lab_obj.status,
                    "status_datetime": lab_obj.status_datetime,
                    "status_datetime_display": _format_korean_datetime(lab_obj.status_datetime),
                    "specimen_cd": lab_obj.specimen_cd,
                    "requisition_note": getattr(lab_obj, "requisition_note", ""),
                    "attachments": attachments,
                    "attachments_json": json.dumps(attachments, ensure_ascii=False)
                })
        except:
            pass

        # TreatmentProcedures → 리스트
        treat_list = []
        try:
            treat_obj = v.treatmentprocedures
            if treat_obj:
                treat_list.append({
                    "procedure_name": treat_obj.procedure_name,
                    "execution_datetime": treat_obj.execution_datetime,
                    "execution_datetime_display": _format_korean_datetime(treat_obj.execution_datetime),
                    "status": treat_obj.status,
                    "result_notes": treat_obj.result_notes,
                })
        except:
            pass

        # MedicineOrders → 리스트
        med_data = []
        try:
            med_order = v.medicineorders
            if med_order:
                med_data = [
                    {
                        "order_name": md.order_name,
                        "order_code": md.order_code,
                        "dose": md.dose,
                        "frequency": md.frequency,
                        "notes": med_order.notes,
                    }
                    for md in med_order.medicinedata_set.all()
                ]
        except:
            med_data = []

        visit_list.append({
            "record_id": v.medical_record_id,
            "date": visit_date,
            "datetime": v.record_datetime.strftime("%Y-%m-%d %H:%M"),
            "datetime_display": _format_korean_datetime(v.record_datetime),
            "doctor": doctor_name,

            "consult": {
                "type": v.record_type,
                "content": v.record_content,
            },

            "lab": lab_list,
            "prescriptions": med_data,
            "treatment": treat_list,
        })

    # 4열 컬럼 레이아웃을 위해 방문 기록을 열 단위로 분배
    visit_columns = [[], [], [], []]
    for idx, v in enumerate(visit_list):
        visit_columns[idx % 4].append(v)

    ctx.update({
        "patient": patient,
        "birth": birth,
        "age": age,
        "gender_display": gender_display,
        "resident_reg_no_display": resident_reg_no_display,
        "recent_visit_date": recent_visit_date,
        "visits": visit_list,
        "visit_columns": visit_columns,
    })

    return render(request, "emr/medical_record_inquiry.html", ctx)

def patient_search_list(request):
    guard = _ensure_doctor_logged_in(request)
    if guard:
        return guard

    ctx = get_common_header_context(request)

    keyword = request.GET.get("searchQuery", "").strip()

    # 병원 ID 가져오기
    user_id = request.session.get("user_id")
    try:
        doctor = Doctors.objects.get(user_id=user_id)
        hos_id = doctor.hos_id
    except Doctors.DoesNotExist:
        print('error')

    try:
        # 병원과 연결된 환자 필터링
        patients = Users.objects.filter(role__in=["PATIENT", "USER"]).filter(
            Q(reservations__slot__doctor__hos_id=hos_id) |
            Q(medicalrecord__hos_id=hos_id)
        ).distinct()

        # 검색 키워드 필터
        patients = patients.filter(
            Q(name__icontains=keyword) |
            Q(resident_reg_no__startswith=keyword)
        )

        results = []
        for p in patients:
            rrn = p.resident_reg_no or ""
            dob = None
            if len(rrn) >= 8:
                dob = f"{rrn[0:4]}-{rrn[4:6]}-{rrn[6:8]}"

            recent_record = (
                MedicalRecord.objects
                .filter(user_id=p.user_id, hos_id=hos_id)
                .select_related("doctor", "doctor__user")
                .order_by("-record_datetime")
                .first()
            )

            recent_str = (
                timezone.localtime(recent_record.record_datetime).strftime("%Y년 %m월 %d일 %H시 %M분")
                if recent_record else None
            )

            recent_doctor = None
            if recent_record and recent_record.doctor and recent_record.doctor.user:
                recent_doctor = recent_record.doctor.user.name
            else:
                try:
                    reservation = (
                        Reservations.objects
                        .filter(user_id=p.user_id, slot__doctor__hos_id=hos_id)
                        .select_related("slot", "slot__doctor", "slot__doctor__user")
                        .order_by("-slot__slot_date", "-slot__start_time")
                        .first()
                    )
                    if reservation and reservation.slot and reservation.slot.doctor and reservation.slot.doctor.user:
                        recent_doctor = reservation.slot.doctor.user.name
                except Exception:
                    recent_doctor = None

            results.append({
                "user_id": p.user_id,
                "name": p.name,
                "gender": p.gender,
                "birth_date": dob,
                "recent_visit": recent_str,
                "recent_doctor": recent_doctor,
            })
        return render(request, "emr/patient_search_list.html", {"patients": results})
    except Exception as e:
        return render(request, "emr/patient_search_list.html", {})

def today_patient_list(request):
    guard = _ensure_doctor_logged_in(request)
    if guard:
        return guard

    ctx = get_common_header_context(request)
    return render(request, "emr/today_patient_list.html", ctx)

def view_previous_medical_records(request):
    guard = _ensure_doctor_logged_in(request)
    if guard:
        return guard

    ctx = get_common_header_context(request)

    patient_id = request.GET.get("patient_id")

    patient = None
    recent_record = None
    department = ""
    doctor_name = ""
    visit_datetime = ""
    
    if patient_id:
        try:
            # 환자 기본 정보
            patient = Users.objects.get(user_id=patient_id)

            # 가장 최근 진료기록 1개 조회
            recent_record = (
                MedicalRecord.objects
                .filter(user_id=patient_id)
                .order_by('-record_datetime')
                .select_related('doctor', 'doctor__user', 'doctor__dep')
                .first()
            )

            if recent_record:
                visit_datetime = recent_record.record_datetime.strftime("%Y-%m-%d %H:%M")

                # 진료과
                if recent_record.doctor and recent_record.doctor.dep:
                    department = recent_record.doctor.dep.dep_name

                # 담당의
                if recent_record.doctor and recent_record.doctor.user:
                    doctor_name = recent_record.doctor.user.name
        
        except:
            pass

    ctx.update({
        "patient": patient,
        "birth": extract_birth_date(patient.resident_reg_no) if patient else "",
        "visit_datetime": visit_datetime,
        "department": department,
        "doctor_name": doctor_name,
    })

    return render(request, "emr/view_previous_medical_records.html", ctx)

def get_previous_medical_records(request, user_id):

    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT 
                mr.medical_record_id,
                mr.record_type,
                mr.record_datetime,
                mr.subjective,
                mr.objective,
                mr.assessment,
                mr.plan,

                tp.procedure_code,
                tp.treatment_site,
                tp.procedure_name,
                tp.execution_datetime,
                tp.completion_datetime,
                tp.status AS tp_status,
                tp.result_notes,

                lb.lab_nm,
                lb.lab_cd,
                lb.lab_order_id,
                lb.specimen_cd,
                lb.status AS lab_status,
                lb.status_datetime,
                lb.order_datetime AS lab_order_datetime,
                lb.is_urgent,
                lb.requisition_note,

                md.order_code,
                md.order_name,
                md.dose,
                md.frequency,

                mo.order_datetime,
                mo.start_datetime,
                mo.stop_datetime,
                mo.notes,

                u.name AS doctor_name

            FROM medical_record mr
            LEFT JOIN treatment_procedures tp 
                ON mr.medical_record_id = tp.medical_record_id
            LEFT JOIN lab_orders lb 
                ON mr.medical_record_id = lb.medical_record_id
            LEFT JOIN medicine_orders mo 
                ON mr.medical_record_id = mo.medical_record_id
            LEFT JOIN medicine_data md
                ON mo.order_id = md.order_id
            LEFT JOIN doctors d
                ON mr.doctor_id = d.doctor_id
            LEFT JOIN users u
                ON d.user_id = u.user_id
            WHERE mr.user_id = %s
            ORDER BY mr.record_datetime DESC

        """, [user_id])

        rows = cursor.fetchall()
        columns = [col[0] for col in cursor.description]  # ← 컬럼명 자동 획득

    records = {}

    def to_kst(dt):
        if dt is None:
            return None
        aware_utc = make_aware(dt, tz("UTC"))
        return aware_utc.astimezone(KST)

    for row in rows:
        row_data = dict(zip(columns, row))   # ← ★ 핵심 수정

        # 시간 변환
        row_data["record_datetime"] = to_kst(row_data["record_datetime"])
        row_data["execution_datetime"] = to_kst(row_data.get("execution_datetime"))
        row_data["completion_datetime"] = to_kst(row_data.get("completion_datetime"))
        row_data["status_datetime"] = to_kst(row_data.get("status_datetime"))
        row_data["lab_order_datetime"] = to_kst(row_data.get("lab_order_datetime"))
        row_data["order_datetime"] = to_kst(row_data.get("order_datetime"))
        row_data["start_datetime"] = to_kst(row_data.get("start_datetime"))
        row_data["stop_datetime"] = to_kst(row_data.get("stop_datetime"))

        mr_id = row_data["medical_record_id"]

        if mr_id not in records:
            records[mr_id] = {
                "medical_record_id": mr_id,
                "record_type": row_data["record_type"],
                "record_datetime": row_data["record_datetime"],
                "subjective": row_data["subjective"],
                "objective": row_data["objective"],
                "assessment": row_data["assessment"],
                "plan": row_data["plan"],
                "doctor_name": row_data["doctor_name"],   # 추가
                "treatment": [],
                "lab": [],
                "prescriptions": []
            }

        # 치료기록
        if row_data["procedure_name"]:
            records[mr_id]["treatment"].append({
                "procedure_code": row_data["procedure_code"],
                "procedure_name": row_data["procedure_name"],
                "execution_datetime": row_data["execution_datetime"],
                "completion_datetime": row_data["completion_datetime"],
                "status": row_data["tp_status"],
                "treatment_site": row_data["treatment_site"],
                "result_notes": row_data["result_notes"]
            })

        # 검사
        if row_data["lab_nm"]:
            try:
                uploads = LabUpload.objects.filter(lab_order_id=row_data["lab_order_id"])
                attachments = [
                    {"name": upload.original_name, "url": upload.uploadedFile.url}
                    for upload in uploads
                ]
            except Exception:
                attachments = []

            records[mr_id]["lab"].append({
                "lab_nm": row_data["lab_nm"],
                "lab_cd": row_data["lab_cd"],
                "lab_order_id": row_data["lab_order_id"],
                "specimen_cd": row_data["specimen_cd"],
                "status": row_data["lab_status"],
                "status_datetime": row_data["status_datetime"],
                "order_datetime": row_data["lab_order_datetime"],
                "is_urgent": row_data["is_urgent"],
                "requisition_note": row_data["requisition_note"],
                "attachments": attachments,
            })

        # 처방
        if row_data["order_code"]:
            records[mr_id]["prescriptions"].append({
                "order_code": row_data["order_code"],
                "order_name": row_data["order_name"],
                "dose": row_data["dose"],
                "frequency": row_data["frequency"],
                "order_datetime": row_data["order_datetime"],
                "start_datetime": row_data["start_datetime"],
                "end_datetime": row_data["stop_datetime"],
                "notes": row_data["notes"],
                "status": row_data.get("tp_status")  # 또는 lab_status처럼 원하는 상태값 매핑
            })

    return JsonResponse({"records": list(records.values())})

# ---------------------------------------------------------
# 치료/처치 기록 검증
# ---------------------------------------------------------
@csrf_exempt
def treatment_record_verification(request):
    if request.method == "GET":
        order_id = request.GET['order_id']
        user_id = request.GET['user_id']
        record_id = request.GET['medical_record_id']
        hos_id = request.GET['hos_id']
        session_hos_id = request.session.get('hospital_id', None)
        user_role = request.session.get('role', '')

        if (hos_id != session_hos_id or user_role != 'HOSPITAL'):
            redirect('/')

        try:
            user = Users.objects.get(user_id=user_id)
            medical_record = MedicalRecord.objects.get(medical_record_id=int(record_id))
            order = TreatmentProcedures.objects.get(treatment_id=int(order_id))

        except:
            print('error')

        rrn_digits = "".join(ch for ch in str(getattr(user, "resident_reg_no", "") or "") if ch.isdigit())
        if len(rrn_digits) >= 13:
            resident_reg_no_display = f"{rrn_digits[:6]}-{rrn_digits[6:13]}"
        elif len(rrn_digits) > 6:
            resident_reg_no_display = f"{rrn_digits[:6]}-{rrn_digits[6:]}"
        elif rrn_digits:
            resident_reg_no_display = rrn_digits
        else:
            resident_reg_no_display = "-"

        context = {
            'user': user,
            'medical_record': medical_record,
            'order': order,
            'resident_reg_no_display': resident_reg_no_display,
            'hos_id': hos_id,
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
        hos_id = request.session.get('hospital_id', None)

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

        if is_redis_alive():
            try:
                channel_layer = get_channel_layer()

                group_name = f'hospital_group_{hos_id}'

                async_to_sync(channel_layer.group_send)(
                    group_name,
                    {
                        "type": "chart_update_event", 
                        "message": "treatment"
                    }
                )
            except:
                print('error')

        if (order.status == 'Completed'):
            return redirect('/mstaff/hospital_dashboard/')
        else:
            return render(request, "emr/treatment_record_verification.html", context)

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

    # slot_date 중심 조회
    reservations = (
        Reservations.objects.filter(
            user_id__in=matched_users,
            slot__slot_date=today
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

        recent_record = (
            MedicalRecord.objects
            .filter(user=u, record_datetime__date__lt=today)
            .order_by('-record_datetime')
            .first()
        )
        recent_diag = recent_record.record_datetime.date().isoformat() if recent_record else ""

        # 오더 유무 계산
        all_records = MedicalRecord.objects.filter(user=u)\
            .values_list("medical_record_id", flat=True)

        lab_completed = LabOrders.objects.filter(
            medical_record_id__in=all_records,
            status="Completed"
        ).exists()
        treat_completed = TreatmentProcedures.objects.filter(
            medical_record_id__in=all_records,
            status="Completed"
        ).exists()

        order_summary = "있음" if (lab_completed or treat_completed) else "없음"

        result.append({
            "name": u.name,
            "gender": u.gender,
            "dob": u.resident_reg_no[:8],

            # slot_date · start_time 기준 표시
            "visit": str(s.slot_date),
            "time": str(s.start_time)[:5],

            "dept": d.dep.dep_name if d and d.dep else "",
            "doctor": d.user.name if d else "",
            "recent_diag": recent_diag,
            "order_detail": order_summary,
            "patient_id": u.user_id,
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
@transaction.atomic
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
    source_reservation_id = request.POST.get("source_reservation_id")
    source_slot_id = request.POST.get("source_slot_id")

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

    source_reservation = None
    try:
        if source_reservation_id:
            source_reservation = Reservations.objects.select_related("slot").filter(
                reservation_id=source_reservation_id
            ).first()
        elif source_slot_id and patient_id and doctor_id:
            source_reservation = Reservations.objects.select_related("slot").filter(
                slot_id=source_slot_id,
                user_id=patient_id,
                slot__doctor_id=doctor_id,
            ).order_by("-reservation_id").first()
    except Exception:
        source_reservation = None

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

    reservation_slot_id = (request.POST.get("reservation_slot_id") or "").strip()
    date_str = (request.POST.get("reservation_date_day") or "").strip()
    hour_str = (request.POST.get("reservation_hour") or "").strip()

    # reservations 앱 기준: 미리 열린 TimeSlots 중에서만 예약 생성 (2주 제한)
    if reservation_slot_id:
        try:
            slot = (
                TimeSlots.objects.select_for_update()
                .select_related("doctor")
                .get(pk=reservation_slot_id)
            )
        except Exception:
            transaction.set_rollback(True)
            return JsonResponse({"error": "invalid_slot"}, status=400)

        if str(slot.doctor_id) != str(doctor_id):
            transaction.set_rollback(True)
            return JsonResponse({"error": "invalid_slot_doctor"}, status=400)

        target_date = slot.slot_date
        if is_holiday_date(target_date):
            transaction.set_rollback(True)
            return JsonResponse({"error": "holiday_not_allowed"}, status=400)

        # 주말 정책:
        # - 일요일: 예약 불가
        # - 토요일: 09:00 ~ 13:00(시작시간 기준)만 허용
        weekday = target_date.weekday()  # 0=Mon ... 5=Sat, 6=Sun
        if weekday == 6:
            transaction.set_rollback(True)
            return JsonResponse({"error": "sunday_not_allowed"}, status=400)
        if weekday == 5:
            start_hour = getattr(slot.start_time, "hour", None)
            if start_hour is None or start_hour < 9 or start_hour >= 13:
                transaction.set_rollback(True)
                return JsonResponse({"error": "saturday_hours_only"}, status=400)

        today = timezone.localdate()
        if target_date < today or target_date > (today + timedelta(days=14)):
            transaction.set_rollback(True)
            return JsonResponse({"error": "out_of_range"}, status=400)

        if getattr(slot, "status", None) != "OPEN":
            transaction.set_rollback(True)
            return JsonResponse({"error": "slot_not_open"}, status=400)

        if Reservations.objects.filter(slot_id=slot.slot_id).exists():
            transaction.set_rollback(True)
            return JsonResponse({"error": "slot_already_reserved"}, status=400)

        reserved_at = timezone.make_aware(
            datetime.combine(slot.slot_date, slot.start_time),
            timezone.get_current_timezone(),
        )
        reserved_end = timezone.make_aware(
            datetime.combine(slot.slot_date, slot.end_time),
            timezone.get_current_timezone(),
        )

        Reservations.objects.create(
            reserved_at=reserved_at,
            reserved_end=reserved_end,
            slot_type=1 if reservation_type == "consultation" else 2,
            notes=reservation_memo,
            user_id=patient_id,
            slot_id=slot.slot_id,
        )
        slot.status = "CLOSED"
        slot.save(update_fields=["status"])

    # legacy: hour 기반 예약(미사용 예정)
    elif date_str or hour_str:
        transaction.set_rollback(True)
        return JsonResponse({"error": "slot_required"}, status=400)
        reserved_at = None
        reserved_end = None

        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except Exception:
            return JsonResponse({"error": "invalid_reservation_date"}, status=400)

        if is_holiday_date(target_date):
            return JsonResponse({"error": "holiday_not_allowed"}, status=400)

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
            return JsonResponse({"error": "이미 해당 의사에게 예약된 시간입니다"}, status=400)

        patient_conflict = Reservations.objects.filter(
            user_id=patient_id,
            reserved_at=reserved_at
        ).exists()
        if patient_conflict:
            return JsonResponse({"error": "해당 시간에 이미 환자의 다른 예약이 존재합니다"}, status=400)

        slot_id = get_or_create_slot_id(int(doctor_id), reserved_at, reserved_end)
        Reservations.objects.create(
            reserved_at=reserved_at,
            reserved_end=reserved_end,
            slot_type=1 if reservation_type == "consultation" else 2,
            notes=reservation_memo,
            user_id=patient_id,
            slot_id=slot_id
        )

    if is_redis_alive():
        try:
            target_hos_id = hos_id

            # Redis 채널 레이어 가져오기
            channel_layer = get_channel_layer()
            # async_to_sync를 쓰는 이유는 views가 동기(Sync) 함수이기 때문입니다.
            group_name = f'hospital_group_{target_hos_id}'

            if order_type:
                async_to_sync(channel_layer.group_send)(
                    group_name,
                    {
                        "type": "chart_update_event", 
                        "message": order_type
                    }
                )
        except:
            print('error')

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
        # 의사 + 날짜 + 시간대 → 슬롯 고유
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

        # ★ 의사마다 독립적인 슬롯 생성
        cursor.execute(
            """
            INSERT INTO time_slots
                (doctor_id, slot_date, start_time, end_time, status, capacity, created_at)
            VALUES
                (%s, %s, %s, %s, %s, %s, %s)
            """,
            [doctor_id, slot_date, start_time, end_time, "reserved", 1, now],
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

    url = f'https://apis.data.go.kr/B551182/diseaseInfoService1/getDissNameCodeList1?serviceKey={settings.OPENAPI_SERVICE_KEY}&numOfRows=9999&pageNo=1&sickType=1&medTp=1&diseaseType=SICK_NM&searchText={search}'

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
    guard = _ensure_doctor_logged_in(request)
    if guard:
        return guard

    keyword = (request.GET.get("keyword", "") or request.GET.get("searchQuery", "")).strip()

    user_id = request.session.get('user_id')

    try:
        doctor = Doctors.objects.get(user_id=user_id)
        hos_id = doctor.hos_id
    except:
        return render(request, "emr/patient_search_list.html", {"patients": []})

    # 환자 역할: 기존 데이터에 USER로 저장된 경우도 있어서 USER/PATIENT 둘 다 허용
    patients_qs = Users.objects.filter(role__in=['PATIENT', 'USER']).filter(
        Q(reservations__slot__doctor__hos_id=hos_id) |
        Q(medicalrecord__hos_id=hos_id)
    ).distinct()

    if keyword:
        patients_qs = patients_qs.filter(
            Q(name__icontains=keyword) |
            Q(resident_reg_no__startswith=keyword)
        )

    results = []
    for p in patients_qs:
        rrn = p.resident_reg_no or ""

        recent_record = (
            MedicalRecord.objects
            .filter(user_id=p.user_id, hos_id=hos_id)
            .select_related("doctor", "doctor__user")
            .order_by("-record_datetime")
            .first()
        )
        recent_str = (
            timezone.localtime(recent_record.record_datetime).strftime("%Y년 %m월 %d일 %H시 %M분")
            if recent_record else None
        )

        recent_doctor = None
        if recent_record and recent_record.doctor and recent_record.doctor.user:
            recent_doctor = recent_record.doctor.user.name
        else:
            try:
                reservation = (
                    Reservations.objects
                    .filter(user_id=p.user_id, slot__doctor__hos_id=hos_id)
                    .select_related("slot", "slot__doctor", "slot__doctor__user")
                    .order_by("-slot__slot_date", "-slot__start_time")
                    .first()
                )
                if reservation and reservation.slot and reservation.slot.doctor and reservation.slot.doctor.user:
                    recent_doctor = reservation.slot.doctor.user.name
            except Exception:
                recent_doctor = None

        results.append({
            "user_id": p.user_id,
            "name": p.name,
            "gender": p.gender,
            # 템플릿/JS에서 주민번호를 받아 생년월일로 변환하므로 그대로 전달
            "birth_date": rrn,
            "recent_visit": recent_str,
            "recent_doctor": recent_doctor,
        })

    page_number = request.GET.get("page")
    paginator = Paginator(results, 10)
    page_obj = paginator.get_page(page_number)

    return render(
        request,
        "emr/patient_search_list.html",
        {
            "patients": page_obj,
            "page_obj": page_obj,
            "paginator": paginator,
            "keyword": keyword,
        },
    )

def api_search_patient(request):
    keyword = request.GET.get("keyword", "").strip()
    if keyword == "":
        return JsonResponse({"results": []})

    # 병원 ID 가져오기
    user_id = request.session.get("user_id")
    try:
        doctor = Doctors.objects.get(user_id=user_id)
        hos_id = doctor.hos_id
    except Doctors.DoesNotExist:
        return JsonResponse({"results": []})

    try:
        # 병원과 연결된 환자 필터링
        patients = Users.objects.filter(role__in=["PATIENT", "USER"]).filter(
            Q(reservations__slot__doctor__hos_id=hos_id) |
            Q(medicalrecord__hos_id=hos_id)
        ).distinct()

        # 검색 키워드 필터
        patients = patients.filter(
            Q(name__icontains=keyword) |
            Q(resident_reg_no__startswith=keyword)
        )

        results = []
        for p in patients:
            rrn = p.resident_reg_no or ""
            dob = None
            if len(rrn) >= 8:
                dob = f"{rrn[0:4]}-{rrn[4:6]}-{rrn[6:8]}"

            recent_record = (
                MedicalRecord.objects
                .filter(user_id=p.user_id, hos_id=hos_id)
                .select_related("doctor", "doctor__user")
                .order_by("-record_datetime")
                .first()
            )
            recent_str = (
                timezone.localtime(recent_record.record_datetime).strftime("%Y년 %m월 %d일 %H시 %M분")
                if recent_record else None
            )

            recent_doctor = None
            if recent_record and recent_record.doctor and recent_record.doctor.user:
                recent_doctor = recent_record.doctor.user.name
            else:
                try:
                    reservation = (
                        Reservations.objects
                        .filter(user_id=p.user_id, slot__doctor__hos_id=hos_id)
                        .select_related("slot", "slot__doctor", "slot__doctor__user")
                        .order_by("-slot__slot_date", "-slot__start_time")
                        .first()
                    )
                    if reservation and reservation.slot and reservation.slot.doctor and reservation.slot.doctor.user:
                        recent_doctor = reservation.slot.doctor.user.name
                except Exception:
                    recent_doctor = None

            results.append({
                "user_id": p.user_id,
                "name": p.name,
                "gender": p.gender,
                "birth_date": dob,
                "recent_visit": recent_str,
                "recent_doctor": recent_doctor,
            })

        return JsonResponse({"results": results})

    except Exception as e:
        # 여기서 500 대신 JSON 에러 반환
        return JsonResponse({"error": str(e)}, status=500)

def api_patient_recent_records(request, patient_id):

    # 최근 진료
    recent_consult = (
        MedicalRecord.objects
        .filter(user_id=patient_id)
        .order_by('-record_datetime')
        .values(
            'medical_record_id',
            'record_datetime',
            'record_type',
            'subjective',
            'objective',
            'assessment',
            'plan'
        )
        .first()
    )

    # 최근 처방
    recent_prescription = (
        MedicineData.objects
        .filter(order__medical_record__user_id=patient_id)
        .order_by('-order__order_datetime')
        .values(
            'order_name',
            'order_code',
            'dose',
            'frequency',
            'order__order_datetime'
        )
        .first()
    )

    # 최근 검사
    recent_lab = (
        LabOrders.objects
        .filter(medical_record__user_id=patient_id)
        .order_by('-order_datetime')
        .values(
            'lab_nm',
            'specimen_cd',
            'status',
            'order_datetime',
            'status_datetime'
        )
        .first()
    )

    # 최근 치료
    recent_treatment = (
        TreatmentProcedures.objects
        .filter(medical_record__user_id=patient_id)
        .order_by('-execution_datetime')
        .values(
            'procedure_name',
            'procedure_code',
            'execution_datetime',
            'completion_datetime',
            'status',
            'result_notes'
        )
        .first()
    )

    return JsonResponse({
        "consult": recent_consult,
        "prescription": recent_prescription,
        "lab": recent_lab,
        "treatment": recent_treatment
    })




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

def get_reservation_medical_record(request):
    doctor_id = request.GET['doctor_id']
    date_str = request.GET['date']
    try:
        target_date = date.fromisoformat(date_str)
    except Exception:
        return JsonResponse({'users': []})

    if is_holiday_date(target_date):
        return JsonResponse({'users': []})

    doctor = {}
    users = []
    user_data_list = []
    try:
        doctor = Doctors.objects.get(doctor_id=doctor_id)

        users = _get_pending_reservations_for_doctor(doctor, target_date)
        
        for reservation in users:
            user = reservation.user
            slot = reservation.slot
            
            user_data_list.append({
                'reservation_id': reservation.reservation_id,
                'user': {
                    'user_id': user.user_id,
                    'gender': user.gender,
                    'name': user.name,
                    'email': user.email,
                    'resident_reg_no': user.resident_reg_no,
                },
                'slot': {
                    'slot_id': slot.slot_id,
                    'start_time': slot.start_time, # time 객체
                    'end_time': slot.end_time,     # time 객체
                    'slot_date': slot.slot_date,   # date 객체
                    'status': slot.status,
                },
            })
    except:
        print('error')

    return JsonResponse({
        'users': user_data_list,
    })

def get_lab_record(request):
    lab_order = []
    lab_pending_count = 0
    lab_sampled_count = 0
    lab_is_urgent_count = 0
    hos_id = request.GET.get('hos_id', 'N')
    session_hos_id = request.session.get('hospital_id', None)
    user_role = request.session.get('role', '')

    if (hos_id != session_hos_id or user_role != 'HOSPITAL'):
        redirect('/')
    try:
        medical_records = Hospital.objects.get(hos_id=session_hos_id).medicalrecord_set.all()
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
                    'lab': model_to_dict(lab),
                    'user': model_to_dict(user),
                    'doctor': model_to_dict(doctor),
                    'doctor_info': model_to_dict(doctor_info),
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
    except:
        print('Hospital error')

    context = {
       'lab_order': lab_order,
       'lab_pending_count': lab_pending_count,
       'lab_sampled_count': lab_sampled_count,
       'lab_is_urgent_count': lab_is_urgent_count,
    }

    return JsonResponse(context, safe=False, encoder=DjangoJSONEncoder)

def get_treatment_record(request):    
    treatment_order = []
    treatment_pending_count = 0
    treatment_inprogress_count = 0
    hos_id = request.GET.get('hos_id', 'N')
    session_hos_id = request.session.get('hospital_id', None)
    user_role = request.session.get('role', '')

    if (hos_id != session_hos_id or user_role != 'HOSPITAL'):
        redirect('/')
    try:
        medical_records = Hospital.objects.get(hos_id=hos_id).medicalrecord_set.all()
        for record in medical_records:
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
                    'treatment': model_to_dict(treatment),
                    'user': model_to_dict(user),
                    'doctor': model_to_dict(doctor),
                    'doctor_info': model_to_dict(doctor_info),
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
       'treatment_order': treatment_order,
       'treatment_pending_count': treatment_pending_count,
       'treatment_inprogress_count': treatment_inprogress_count
    }

    return JsonResponse(context, safe=False, encoder=DjangoJSONEncoder)
    


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

def is_redis_alive():
    try:
        # settings.py에 설정된 Redis 정보를 가져오거나, 직접 IP/Port 입력
        # 보통 settings.CHANNEL_LAYERS['default']['CONFIG']['hosts'][0] 에 있습니다.
        # 편의상 직접 입력하거나 설정에서 파싱하세요. 예: ('127.0.0.1', 6379)
        host = '127.0.0.1' 
        port = 6379
        
        # 소켓 생성
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(0.1)  # 중요: 0.1초만 기다리고 끊음 (지연 방지)
        result = sock.connect_ex((host, port))
        sock.close()
        
        # result가 0이면 연결 성공
        return result == 0
    except Exception:
        return False
