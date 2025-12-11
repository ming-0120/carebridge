from datetime import datetime, timedelta

from django.contrib import messages
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from apps.db.models import Reservations, Qna, Users
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

    # 역할 분기 (필드/값은 프로젝트에 맞게 수정)
    # 예: user.role 이 "DOCTOR" / "PATIENT"
    is_doctor = str(getattr(user, "role", "")).upper() == "DOCTOR"

    # --------------------------
    # 1) 주민번호 → 생년월일
    # --------------------------
    birth_display = ""
    raw = getattr(user, "resident_reg_no", "")

    if raw and len(raw) >= 6:
        front = raw.split("-")[0]          # 앞 6자리
        yy = int(front[0:2])
        mm = front[2:4]
        dd = front[4:6]

        back = raw.split("-")[1] if "-" in raw else ""
        gender_digit = back[0] if back else "1"

        if gender_digit in ["1", "2"]:
            year = 1900 + yy
        elif gender_digit in ["3", "4"]:
            year = 2000 + yy
        else:
            year = 1900 + yy

        birth_display = f"{year:04d}년 {mm}월 {dd}일"

    # --------------------------
    # 2) 주소 분해 (DB → 화면용)  : 환자에게만 사용
    # --------------------------
    zipcode = ""
    addr1 = ""
    addr2 = ""

    if not is_doctor:
        raw_addr = user.address or ""
        if raw_addr:
            parts = raw_addr.split("|")
            if len(parts) >= 1:
                zipcode = parts[0]
            if len(parts) >= 2:
                addr1 = parts[1]
            if len(parts) >= 3:
                addr2 = parts[2]

    # --------------------------
    # 3) POST: 저장 처리
    # --------------------------
    if request.method == "POST":
        # 이메일 앞/뒤, 선택 도메인
        email_local = request.POST.get("email_local", "").strip()
        email_domain_input = request.POST.get("email_domain_input", "").strip()
        email_domain_select = request.POST.get("email_domain_select", "").strip()

        if email_domain_select and email_domain_select != "custom":
            email_domain = email_domain_select
        else:
            email_domain = email_domain_input

        email = f"{email_local}@{email_domain}" if email_local and email_domain else ""

        # 연락처
        phone = request.POST.get("phone", "").strip()

        # 의사: 주소는 병원에서 관리 → 주소 갱신 안 함
        if not is_doctor:
            zipcode = request.POST.get("zipcode", "").strip()
            addr1 = request.POST.get("addr1", "").strip()
            addr2 = request.POST.get("addr2", "").strip()

            # 주소 다시 하나의 문자열로 합쳐 저장
            if zipcode or addr1 or addr2:
                user.address = f"{zipcode}|{addr1}|{addr2}"
            else:
                user.address = ""

        # 저장 (변경 가능한 필드만)
        if email:
            user.email = email
        user.phone = phone

        # 의사라면 프로필 사진 업로드(필드명이 있을 때만 사용)
        if is_doctor and "profile_image" in request.FILES:
            # Users 모델에 profile_image 필드가 있을 때만
            if hasattr(user, "profile_image"):
                user.profile_image = request.FILES["profile_image"]

        user.save()
        messages.success(request, "회원 정보가 수정되었습니다.")
        return redirect("profile_edit")

    # --------------------------
    # 4) GET: 이메일 분해 + context
    # --------------------------
    email_local = ""
    email_domain = ""
    if user.email:
        try:
            email_local, email_domain = user.email.split("@", 1)
        except ValueError:
            email_local = user.email

    context = {
        "user": user,
        "email_local": email_local,
        "email_domain": email_domain,
        "birth_display": birth_display,
        "zipcode": zipcode,
        "addr1": addr1,
        "addr2": addr2,
        "is_doctor": is_doctor,
    }

    # 의사 / 환자 템플릿 분기
    if is_doctor:
        template_name = "mypage/profile_edit_doctor.html"
    else:
        template_name = "mypage/profile_edit.html"

    return render(request, template_name, context)




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