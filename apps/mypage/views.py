from datetime import datetime, timedelta
import os
import uuid
from django.core.files.storage import default_storage
from django.contrib import messages
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from apps.db.models import Reservations, Qna, Users
from apps.db.models.doctor import Doctors
from apps.db.models.favorite import UserFavorite
from django.contrib.auth.hashers import check_password
from django.views.decorators.http import require_POST
from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.db.models import Q
from django.utils import timezone
from datetime import datetime
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from collections import defaultdict
from apps.db.models.emergency import ErInfo
from apps.db.models.review import AiReview
from apps.db.models.favorite import UserFavorite
from apps.db.models.slot_reservation import TimeSlots
from apps.db.models.users import Users
from django.conf import settings

def reservation_list(request):
    user_id = request.session.get("user_id")
    if not user_id:
        return redirect("login")

    now = timezone.now()
    three_months_ago = now - timedelta(days=90)

    qs = (
        Reservations.objects
        .select_related(
            "slot",                 # Reservations.slot
            "slot__doctor",         # TimeSlots.doctor
            "slot__doctor__hos"  # Doctors.hospital (이 필드 있다고 가정)
        )
        .filter(
            user_id=user_id,
            reserved_at__gte=three_months_ago,
        )
        .order_by("-reserved_at")
    )

    reservations = []
    for r in qs:
        can_cancel = (r.reserved_at >= now)   # status 없으니 일단 시간만 체크
        reservations.append({"obj": r, "can_cancel": can_cancel})

    return render(request, "mypage/reservation_list.html", {"reservations": reservations})


def reservation_cancel(request, pk):
    user_id = request.session.get("user_id")
    if not user_id:
        return redirect("login")

    reservation = get_object_or_404(
        Reservations,
        pk=pk,
        user_id=user_id,
    )

    if request.method == "POST":
        # 1) 삭제 전에 slot_id 확보
        slot_id = reservation.slot_id

        # 2) 예약 삭제
        reservation.delete()

        # 3) 해당 slot을 OPEN으로 변경
        TimeSlots.objects.filter(slot_id=slot_id).update(status="OPEN")

        messages.success(request, "예약이 삭제되었습니다.")
        return redirect("reservation_list")

    return redirect("reservation_list")

def my_qna_list(request):
    user_id = request.session.get("user_id")
    if not user_id:
        return redirect("login")

    now = timezone.now()
    three_months_ago = now - timedelta(days=90)

    sort = request.GET.get("sort", "date_desc")
    order_map = {
        "date_asc": "created_at",
        "date_desc": "-created_at",
        "answer": "-answered_at",
    }
    order_by = order_map.get(sort, "-created_at")

    qs = (
        Qna.objects
        .filter(
            user=user_id,
            created_at__gte=three_months_ago,
        )
        .order_by(order_by)
    )

    rows = []
    for q in qs:
        has_answer = bool(q.reply)
        rows.append(
            {
                "obj": q,
                "answer_label": "답변완료" if has_answer else "미답변",
            }
        )

    context = {
        "rows": rows,
        "current_sort": sort,
    }
    return render(request, "mypage/my_qna_list.html", context)


def profile_edit(request):
    user_id = request.session.get("user_id")
    if not user_id:
        return redirect("login")

    user = get_object_or_404(Users, pk=user_id)

    # 역할 판단
    role = str(getattr(user, "role", "")).upper()
    is_doctor = (role == "DOCTOR")

    # --------------------------
    # 의사 → Doctors 모델 로딩
    # --------------------------
    doctor = None
    if is_doctor:
        try:
            doctor = Doctors.objects.get(user=user)
        except Doctors.DoesNotExist:
            doctor = None   # 의사 데이터가 없을 경우 대비

    # --------------------------
    # 생년월일 계산 (Users 기준)
    # --------------------------
    birth_display = ""
    raw = getattr(user, "resident_reg_no", "")
    if raw and len(raw) >= 6:
        front = raw.split("-")[0]
        yy = int(front[0:2])
        mm = front[2:4]
        dd = front[4:6]
        back = raw.split("-")[1] if "-" in raw else "1"
        gender_digit = back[0]

        if gender_digit in ["1", "2"]:
            year = 1900 + yy
        elif gender_digit in ["3", "4"]:
            year = 2000 + yy
        else:
            year = 1900 + yy

        birth_display = f"{year}년 {mm}월 {dd}일"

    # --------------------------
    # 환자: 주소 분리
    # --------------------------
    zipcode = ""
    addr1 = ""
    addr2 = ""

    if not is_doctor:
        raw_addr = user.address or ""
        if raw_addr:
            parts = raw_addr.split("|")
            zipcode = parts[0] if len(parts) > 0 else ""
            addr1 = parts[1] if len(parts) > 1 else ""
            addr2 = parts[2] if len(parts) > 2 else ""

    # --------------------------
    # POST 처리
    # --------------------------
    if request.method == "POST":

        # 이메일
        email_local = request.POST.get("email_local", "").strip()
        email_domain_input = request.POST.get("email_domain_input", "").strip()
        email_domain_select = request.POST.get("email_domain_select", "").strip()

        if email_domain_select and email_domain_select != "custom":
            email_domain = email_domain_select
        else:
            email_domain = email_domain_input

        email = f"{email_local}@{email_domain}" if email_local and email_domain else ""

        # 연락처 갱신
        user.phone = request.POST.get("phone", "").strip()

        # 주소는 환자만
        if not is_doctor:
            zipcode = request.POST.get("zipcode", "").strip()
            addr1 = request.POST.get("addr1", "").strip()
            addr2 = request.POST.get("addr2", "").strip()

            user.address = f"{zipcode}|{addr1}|{addr2}" if (zipcode or addr1 or addr2) else ""

        if email:
            user.email = email

        # ✅ 의사 프로필 업로드 저장 (필드명 통일: doctor_profile)
        if is_doctor and doctor:
            profile_file = request.FILES.get("profile_image")
            if profile_file:
                ext = os.path.splitext(profile_file.name)[1]
                filename = f"doctor_profiles/{uuid.uuid4().hex}{ext}"
                saved_path = default_storage.save(filename, profile_file)
                doctor.profil_url = saved_path  # 문자열 저장
                doctor.save()

        user.save()
        messages.success(request, "프로필 정보가 수정되었습니다.")

        if is_doctor:
            return redirect("/mstaff/doctor_dashboard/")
        return redirect("profile_edit")

    # --------------------------
    # GET: 이메일 분리
    # --------------------------
    if user.email:
        try:
            email_local, email_domain = user.email.split("@", 1)
        except:
            email_local = user.email
            email_domain = ""
    else:
        email_local = ""
        email_domain = ""

    # --------------------------
    # 컨텍스트
    # --------------------------
    context = {
        "user": user,
        "doctor": doctor,             # ← 의사 전용 데이터
        "is_doctor": is_doctor,
        "birth_display": birth_display,
        "email_local": email_local,
        "email_domain": email_domain,
        "zipcode": zipcode,
        "addr1": addr1,
        "addr2": addr2,
    }

    # --------------------------
    # 템플릿 분기
    # --------------------------
    if is_doctor:
        return render(request, "mypage/profile_edit_doctor.html", context)
    else:
        return render(request, "mypage/profile_edit.html", context)





def favorite_hospitals(request):
    user_id = request.session.get("user_id")
    print(">>> session user_id =", user_id)

    if not user_id:
        return redirect("login")

    # 일반 병원 즐겨찾기 (hos가 있는 경우)
    hospital_favorites = (
        UserFavorite.objects
        .filter(user_id=user_id, hos__isnull=False)
        .select_related('hos')
        .order_by("created_at")
    )
    
    # 응급실 즐겨찾기 (er가 있는 경우)
    er_favorites = (
        UserFavorite.objects
        .filter(user_id=user_id, er__isnull=False)
        .select_related('er')
        .order_by("created_at")
    )
    
    # 두 리스트를 합치기 (created_at 기준 정렬)
    from itertools import chain
    from operator import attrgetter
    
    all_favorites = sorted(
        chain(hospital_favorites, er_favorites),
        key=attrgetter('created_at'),
        reverse=True
    )

    context = {
        "favorites": all_favorites,
    }
    return render(request, "mypage/favorite_hospitals.html", context)


def update_favorite_memo(request, fav_id):
    if request.method != "POST":
        return redirect("favorite_hospitals")

    user_id = request.session.get("user_id")
    if not user_id:
        return redirect("login")

    fav = get_object_or_404(UserFavorite, fav_id=fav_id, user_id=user_id)

    memo = request.POST.get("memo", "").strip()
    fav.memo = memo
    fav.save()
    return redirect("favorite_hospitals")


def delete_favorite(request, fav_id):
    user_id = request.session.get("user_id")
    if not user_id:
        return redirect("login")

    fav = get_object_or_404(UserFavorite, fav_id=fav_id, user_id=user_id)
    fav.delete()

    # 삭제 후 현재 페이지로 돌아가기
    return redirect("favorite_hospitals")

def account_withdraw(request):
    user_id = request.session.get("user_id")
    if not user_id:
        return redirect("login")

    user = Users.objects.filter(pk=user_id).first()
    if not user:
        request.session.flush()
        return redirect("home")

    # 카카오 계정 여부 판단 (DB + 세션 둘 다 고려)
    is_kakao_user = (
        getattr(user, "provider", None) == "kakao"
        or request.session.get("auth_from") == "kakao"
    )

    if request.method == "POST":
        reason = request.POST.get("reason", "")

        # 1) 로컬(local) 유저만 비밀번호 검증
        if not is_kakao_user:
            password = request.POST.get("password", "")

            is_valid_password = check_password(password, user.password)
            # 만약 user.password가 평문이면:
            # is_valid_password = (password == user.password)

            if not is_valid_password:
                messages.error(request, "비밀번호가 일치하지 않습니다.")
                return render(request, "mypage/account_withdraw.html", {
                    "user": user,
                    "error": "비밀번호가 일치하지 않습니다.",
                    "is_kakao_user": is_kakao_user,
                })

        # 2) 탈퇴 처리 (withdrawal 필드 타입에 맞게 값 설정)
        user.withdrawal = '1'   
        user.username = f"{user.username}_deleted_{user.user_id}"
        user.save()

        # 3) 세션/로그인 정보 제거
        request.session.flush()

        return redirect("home")

    return render(request, "mypage/account_withdraw.html", {
        "user": user,
        "is_kakao_user": is_kakao_user,
    })

@require_POST
def toggle_er_favorite(request):
    """응급실 즐겨찾기 토글 (AJAX)"""
    # 1) 로그인 사용자 확인 (세션 기반)
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse({"ok": False, "error": "login_required"}, status=401)

    user = get_object_or_404(Users, pk=user_id)

    # 2) 응급실 ID 파라미터 확인
    er_id = request.POST.get("er_id")
    if not er_id:
        return JsonResponse({"ok": False, "error": "no_er_id"}, status=400)

    er = get_object_or_404(ErInfo, pk=er_id)

    # 3) 이미 즐겨찾기 되어 있으면 삭제, 없으면 생성
    qs = UserFavorite.objects.filter(user=user, er=er, hos__isnull=True)
    # hos__isnull=True 로 "일반 병원이 아닌 응급실 즐겨찾기" 로 한정

    if qs.exists():
        qs.delete()
        is_favorite = False
    else:
        UserFavorite.objects.create(
            user=user,
            er=er,
            hos=None,     # 응급실 즐겨찾기이므로 hos는 비워둠
            memo="",      # 필요 없으면 빈 문자열
        )
        is_favorite = True

    # 4) JSON 응답
    return JsonResponse({"ok": True, "is_favorite": is_favorite})
