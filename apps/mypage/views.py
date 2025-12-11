from datetime import datetime, timedelta

from django.contrib import messages
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from apps.db.models import Reservations, Qna, Users
from apps.db.models.doctor import Doctors
from apps.db.models.favorite import UserFavorite
from django.contrib.auth.hashers import check_password

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
        reservation.delete()
        messages.success(request, "예약이 삭제되었습니다.")
        return redirect("reservation_list")

    return redirect("reservation_list")

def my_qna_list(request):
    user_id = request.session.get("user_id")
    if not user_id:
        return redirect("login")

    now = timezone.now()
    three_months_ago = now - timedelta(days=90)

    # 정렬 옵션 (?sort=date_asc / date_desc / answer)
    sort = request.GET.get("sort", "date_desc")
    order_map = {
        "date_asc": "created_at",
        "date_desc": "-created_at",
        # 답변완료 먼저 보고 싶으면 answered 내림차순
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

    # 템플릿에서 보기 좋게 flag/라벨을 계산
    rows = []
    for q in qs:
        has_answer = bool(q.answer)
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

        # 의사: profile_image 는 Doctors 모델에 저장한다고 가정
        if is_doctor:
            if doctor and "profil_url" in request.FILES:
                doctor.profil_url = request.FILES["profil_url"]
                doctor.save()

        user.save()
        messages.success(request, "회원 정보가 수정되었습니다.")
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

    # user 객체 안 쓰고 user_id로 바로 필터
    favorites = (
        UserFavorite.objects
        .filter(user_id=user_id, hos__isnull=False)
        .order_by("created_at")
    )


    context = {
        "favorites": favorites,
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
        user.username = f"{user.username}_deleted_{user.id}"
        user.save()

        # 3) 세션/로그인 정보 제거
        request.session.flush()

        return redirect("home")

    return render(request, "mypage/account_withdraw.html", {
        "user": user,
        "is_kakao_user": is_kakao_user,
    })