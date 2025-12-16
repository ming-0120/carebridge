import os
import re
import uuid
import requests

from datetime import datetime

from django.db import transaction
from django.http import JsonResponse
from django.contrib import messages
from django.contrib.auth.hashers import check_password, make_password
from django.shortcuts import render, redirect
from django.views.decorators.http import require_http_methods
from django.core.mail import send_mail
from django.conf import settings
from django.core.files.storage import default_storage
from django.urls import reverse

from django.core import signing
from django.utils import timezone

from apps.db.models.department import Department
from apps.db.models.hospital import Hospital
from apps.db.models.users import Users
from apps.db.models.doctor import Doctors


# =========================
# 공통 유틸
# =========================
def mask_username(username: str) -> str:
    if not username:
        return ""
    if len(username) <= 2:
        return username[0] + "*"
    return username[:2] + "*" * (len(username) - 4) + username[-2:]


def normalize_rrn(rrn: str) -> str:
    # 주민번호에서 숫자만 남김 (900101-1234567 / 900101 1234567 모두 대응)
    return "".join(ch for ch in (rrn or "") if ch.isdigit())


# =========================
# 로그인/회원가입 기존 코드 (원본 유지)
# =========================
@require_http_methods(["GET", "POST"])
def login_view(request, default_role="PATIENT", template_name="accounts/login.html"):
    next_url = request.GET.get('next') or request.POST.get('next') or '/'
    just_registered_role = request.session.pop("just_registered_role", None)

    if request.method == 'GET':
        role = (just_registered_role or default_role).upper()
        return render(request, template_name, {
            'next': next_url,
            'just_registered_role': just_registered_role,
            'role': role,
        })

    current_role = request.POST.get("role", default_role).upper()
    username = request.POST.get('username', '').strip()
    password = request.POST.get('password', '')

    if not username or not password:
        messages.error(request, "아이디와 비밀번호를 모두 입력해 주세요.")
        return render(request, template_name, {
            'next': next_url,
            'username': username,
            'role': current_role,
        })

    try:
        user = Users.objects.get(username=username, provider='local')
    except Users.DoesNotExist:
        messages.error(request, "아이디 또는 비밀번호가 일치하지 않습니다.")
        return render(request, template_name, {
            'next': next_url,
            'username': username,
            'role': current_role,
        })

    if not check_password(password, user.password):
        messages.error(request, "아이디 또는 비밀번호가 일치하지 않습니다.")
        return render(request, template_name, {
            'next': next_url,
            'username': username,
            'role': current_role,
        })

    if user.withdrawal == '1':
        messages.error(request, "탈퇴 처리된 계정입니다.")
        return render(request, template_name, {
            'next': next_url,
            'username': username,
            'role': current_role,
        })

    if user.role == 'DOCTOR':
        doctor = Doctors.objects.filter(user=user.user_id).first()
        if not doctor or not doctor.verified:
            messages.error(request, "미인증 회원입니다. 인증 절차를 기다려 주세요.")
            return render(request, template_name, {
                'next': next_url,
                'username': username,
                'role': 'DOCTOR',
            })

    request.session['user_id'] = user.user_id
    request.session['username'] = user.name
    request.session['role'] = user.role
    request.session.set_expiry(30 * 60)

    if user.role == 'ADMIN':
        return redirect('/admin_panel/')
    elif user.role == 'DOCTOR':
        return redirect('/mstaff/doctor_dashboard/')
    elif user.role == 'NURSE':
        return redirect('mstaff/hospital_dashboard/')

    return redirect(next_url)


@require_http_methods(["GET", "POST"])
def register_view(request):
    kakao_tmp = request.session.get("kakao_tmp")
    from_kakao = kakao_tmp is not None

    hospitals = Hospital.objects.all()
    departments = Department.objects.all()
    kakao_notice = request.session.pop("kakao_notice", None)

    if request.method == "GET":
        role = request.GET.get("role", "PATIENT")
        provider = request.GET.get("provider", "local")

        context = {
            "role": role,
            "hospitals": hospitals,
            "departments": departments,
            "provider": provider,
            "from_kakao": False,
            "kakao_notice": kakao_notice,
        }

        if provider == "kakao" and from_kakao:
            context["from_kakao"] = True
            context["kakao_email"] = kakao_tmp.get("email", "")
            context["kakao_name"] = kakao_tmp.get("name", "")

        return render(request, "accounts/register.html", context)

    profile_file = request.FILES.get("profile_image")
    profile_url = ""
    if profile_file:
        ext = os.path.splitext(profile_file.name)[1]
        filename = f"doctor_profiles/{uuid.uuid4().hex}{ext}"
        saved_path = default_storage.save(filename, profile_file)
        profile_url = saved_path

    role = request.POST.get("role", "PATIENT").strip()
    provider = request.POST.get("provider", "local").strip()

    username = request.POST.get("username", "").strip()
    name = request.POST.get("name", "").strip()
    gender = request.POST.get("gender")
    resident_reg_no = request.POST.get("resident_reg_no", "").strip()
    phone = request.POST.get("phone", "").strip()

    email = request.POST.get("email", "").strip()

    mail_confirm = request.POST.get("mail_confirm", "N")
    password1 = request.POST.get("password1", "")
    password2 = request.POST.get("password2", "")

    zipcode = request.POST.get("zipcode", "").strip()
    addr1 = request.POST.get("addr1", "").strip()
    addr2 = request.POST.get("addr2", "").strip()

    license_no = request.POST.get("license_number", "").strip()
    hospital_id = request.POST.get("hospital_id")
    department_id = request.POST.get("department_id")

    base_context = {
        "role": role,
        "provider": provider,
        "from_kakao": from_kakao,
        "hospitals": hospitals,
        "departments": departments,
        "name": name,
        "username": username,
        "gender": gender,
        "resident_reg_no": resident_reg_no,
        "phone": phone,
        "email": email,
        "mail_confirm": mail_confirm,
        "zipcode": zipcode,
        "addr1": addr1,
        "addr2": addr2,
        "hospital_id": hospital_id,
        "department_id": department_id,
        "license_no": license_no,
    }

    if from_kakao:
        base_context["kakao_email"] = kakao_tmp.get("email", "")
        base_context["kakao_name"] = kakao_tmp.get("name", "")

    if not email:
        messages.error(request, "이메일을 입력해주세요.")
        return render(request, "accounts/register.html", base_context)

    if role == "PATIENT":
        address = f"{zipcode}|{addr1}|{addr2}" if (zipcode or addr1 or addr2) else ""
    else:
        if hospital_id:
            hospital = Hospital.objects.filter(pk=hospital_id).first()
            address = hospital.address if hospital else ""
        else:
            address = ""

    if provider == "local" and password1 != password2:
        messages.error(request, "비밀번호가 서로 다릅니다.")
        return render(request, "accounts/register.html", base_context)

    if provider == "local" and not username:
        messages.error(request, "아이디를 입력해주세요.")
        return render(request, "accounts/register.html", base_context)

    if provider == "kakao" and from_kakao:
        kakao_id = kakao_tmp.get("provider_id")
        if not kakao_id:
            messages.error(request, "카카오 정보가 유효하지 않습니다. 다시 시도해주세요.")
            return redirect("accounts:login")
        final_username = username or f"kakao_{kakao_id}"
    else:
        final_username = username

    if final_username and Users.objects.filter(username=final_username, withdrawal='0').exists():
        messages.error(request, "이미 사용 중인 아이디입니다.")
        return render(request, "accounts/register.html", base_context)

    if resident_reg_no:
        normalized = resident_reg_no.replace("-", "").strip()

        if not re.fullmatch(r"\d{13}", normalized):
            messages.error(request, "주민등록번호 형식이 올바르지 않습니다.")
            return render(request, "accounts/register.html", base_context)

        rrn_gender_digit = normalized[6]
        gender_map = {"M": {"1", "3"}, "F": {"2", "4"}}
        if gender not in gender_map:
            messages.error(request, "성별 값이 올바르지 않습니다.")
            return render(request, "accounts/register.html", base_context)

        if rrn_gender_digit not in gender_map[gender]:
            messages.error(request, "선택한 성별과 주민등록번호가 일치하지 않습니다.")
            return render(request, "accounts/register.html", base_context)

    if resident_reg_no:
        if Users.objects.filter(resident_reg_no=resident_reg_no).exclude(withdrawal='1').exists():
            messages.error(request, "이미 가입된 회원입니다.")
            return redirect("accounts:login")

    if role == "DOCTOR":
        if not hospital_id:
            messages.error(request, "병원을 선택해주세요.")
            return render(request, "accounts/register.html", base_context)
        if not department_id:
            messages.error(request, "진찰과를 선택해주세요.")
            return render(request, "accounts/register.html", base_context)
        if not license_no:
            messages.error(request, "의사 번호를 입력해주세요.")
            return render(request, "accounts/register.html", base_context)

    try:
        with transaction.atomic():
            if provider == "kakao" and from_kakao:
                kakao_id = kakao_tmp.get("provider_id")
                kakao_email = kakao_tmp.get("email", "")

                user = Users.objects.create(
                    username=final_username,
                    password="",
                    name=name,
                    gender=gender,
                    phone=phone,
                    email=email,
                    resident_reg_no=resident_reg_no,
                    mail_confirm=mail_confirm,
                    address=address,
                    role=role,
                    provider="kakao",
                    provider_id=kakao_id,
                    provider_email=kakao_email,
                )
            else:
                user = Users.objects.create(
                    username=final_username,
                    password=make_password(password1),
                    name=name,
                    gender=gender,
                    phone=phone,
                    email=email,
                    resident_reg_no=resident_reg_no,
                    mail_confirm=mail_confirm,
                    address=address,
                    role=role,
                    provider="local",
                )

            if role == "DOCTOR":
                Doctors.objects.create(
                    user=user,
                    license_no=license_no,
                    verified=False,
                    memo="",
                    profil_url=profile_url,
                    hos_id=hospital_id,
                    dep_id=department_id,
                )

    except Exception as e:
        messages.error(request, f"회원가입 중 오류가 발생했습니다: {e}")
        return render(request, "accounts/register.html", base_context)

    if "kakao_tmp" in request.session:
        del request.session["kakao_tmp"]

    request.session["just_registered_role"] = role
    messages.success(request, "회원가입이 완료되었습니다. 로그인 해주세요.")
    return redirect("accounts:login")


def check_username(request):
    username = request.GET.get('username', '').strip()
    if not username:
        return JsonResponse({'exists': False})

    exists = Users.objects.filter(username=username).exists()
    return JsonResponse({'exists': exists})


@require_http_methods(["GET", "POST"])
def logout_view(request):
    user = request.user
    kakao_access_token = getattr(user, "access_token", None)

    request.session.flush()

    if kakao_access_token:
        try:
            url = "https://kapi.kakao.com/v1/user/unlink"
            headers = {"Authorization": f"Bearer {kakao_access_token}"}
            requests.post(url, headers=headers, timeout=3)
        except Exception:
            pass

    return redirect('/')


def admin_login_view(request):
    return login_view(
        request,
        default_role="ADMIN",
        template_name="accounts/admin_login.html",
    )


@require_http_methods(["GET", "POST"])
def nurse_login_view(request):
    next_url = request.GET.get('next') or request.POST.get('next') or '/mstaff/hospital_dashboard/'

    if request.method == "GET":
        return render(request, "accounts/nurse_login.html", {"next": next_url})

    hos_name = request.POST.get('username', '').strip()
    hos_pw_input = request.POST.get('password', '').strip()

    if not hos_name or not hos_pw_input:
        messages.error(request, "병원명과 비밀번호를 모두 입력해 주세요.")
        return render(request, "accounts/nurse_login.html", {"next": next_url})

    hospital = Hospital.objects.filter(hos_name__iexact=hos_name).first()
    if not hospital:
        messages.error(request, "병원명 또는 비밀번호가 일치하지 않습니다.")
        return render(request, "accounts/nurse_login.html", {"next": next_url})

    if hospital.hos_password != hos_pw_input:
        messages.error(request, "병원명 또는 비밀번호가 일치하지 않습니다.")
        return render(request, "accounts/nurse_login.html", {"next": next_url})

    request.session["role"] = "HOSPITAL"
    request.session["hospital_id"] = hospital.pk
    request.session["username"] = hospital.name
    request.session.set_expiry(30 * 60)

    return redirect(next_url)


# =========================
# ID 찾기 (주민번호 정규화 비교 적용)
# =========================
# =========================
# ID 찾기 (주민번호 정규화 비교 적용)
# =========================
@require_http_methods(["GET", "POST"])
def find_id_view(request):
    if request.method == "POST":
        name = request.POST.get("name", "").strip()
        birth = request.POST.get("birth", "").strip()   # YYYY-MM-DD
        email = request.POST.get("email", "").strip()

        if not (name and birth and email):
            messages.error(request, "모든 항목을 입력하세요.")
            return redirect("accounts:find_id")

        try:
            birth_6 = datetime.strptime(birth, "%Y-%m-%d").strftime("%y%m%d")
        except ValueError:
            messages.error(request, "생년월일 형식이 올바르지 않습니다.")
            return redirect("accounts:find_id")

        candidates = Users.objects.filter(
            name=name,
            email__iexact=email,
            withdrawal='0',
        ).only("username", "resident_reg_no")

        matched = [
            u for u in candidates
            if normalize_rrn(u.resident_reg_no).startswith(birth_6)
        ]

        # ✅ 핵심: 매칭 실패면 에러 메시지 + 다시 입력
        if not matched:
            messages.error(request, "입력하신 정보와 일치하는 계정을 찾을 수 없습니다.")
            return redirect("accounts:find_id")

        # ✅ 매칭 성공: 안내 메시지 + 메일 전송
        masked_ids = [mask_username(u.username) for u in matched]
        body = (
            "CareBridge 아이디 안내입니다.\n\n"
            f"아이디: {', '.join(masked_ids)}\n\n"
            "본인이 요청하지 않았다면 이 메일을 무시하세요."
        )

        send_mail(
            subject="[CareBridge] 아이디 찾기 안내",
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )

        messages.success(request, "아이디 안내 메일을 전송했습니다.")
        return redirect("accounts:find_id")

    return render(request, "accounts/find_id.html")



# =========================
# 비밀번호 찾기 / 재설정 (Django auth 없이 Users 기준)
# =========================
PASSWORD_RESET_SALT = "cb-password-reset"
@require_http_methods(["GET", "POST"])
def find_password_view(request):
    if request.method == "GET":
        return render(request, "accounts/password_reset_form.html")

    name = request.POST.get("name", "").strip()
    username = request.POST.get("username", "").strip()
    birth = request.POST.get("birth", "").strip()
    email = request.POST.get("email", "").strip()

    if not all([name, username, birth, email]):
        messages.error(request, "모든 항목을 입력하세요.")
        return redirect("accounts:find_password")

    try:
        birth_6 = datetime.strptime(birth, "%Y-%m-%d").strftime("%y%m%d")
    except ValueError:
        messages.error(request, "생년월일 형식이 올바르지 않습니다.")
        return redirect("accounts:find_password")

    candidates = Users.objects.filter(
        provider="local",
        withdrawal='0',
        name=name,
        username=username,
        email__iexact=email,
    ).only("user_id", "email", "resident_reg_no")

    matched = [
        u for u in candidates
        if normalize_rrn(u.resident_reg_no).startswith(birth_6)
    ]

    # ✅ 핵심 추가 분기
    if not matched:
        messages.error(request, "입력하신 정보와 일치하는 계정을 찾을 수 없습니다.")
        return redirect("accounts:find_password")

    user = matched[0]

    payload = {
        "uid": user.user_id,
        "ts": int(timezone.now().timestamp()),
    }
    token = signing.dumps(payload, salt=PASSWORD_RESET_SALT)

    reset_url = (
        request.build_absolute_uri(
            reverse("accounts:password_reset_confirm")
        )
        + f"?token={token}"
    )

    body = (
        "비밀번호 재설정 요청이 접수되었습니다.\n\n"
        f"아래 링크에서 새 비밀번호를 설정하세요:\n{reset_url}\n\n"
        "본인이 요청하지 않았다면 이 메일을 무시하세요."
    )

    send_mail(
        subject="[CareBridge] 비밀번호 재설정 안내",
        message=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[email],
        fail_silently=False,
    )

    return redirect("accounts:password_reset_done")


@require_http_methods(["GET"])
def find_password_done_view(request):
    return render(request, "accounts/password_reset_done.html")


@require_http_methods(["GET", "POST"])
def reset_password_view(request):
    token = request.GET.get("token", "").strip()
    if not token:
        messages.error(request, "유효하지 않은 링크입니다.")
        return redirect("accounts:find_password")

    # 토큰 검증
    try:
        payload = signing.loads(token, salt=PASSWORD_RESET_SALT)
    except signing.BadSignature as e:
        print("DEBUG BadSignature:", repr(e))
        print("DEBUG token(raw):", token)
        messages.error(request, "유효하지 않은 링크입니다.")
        return redirect("accounts:find_password")

    # ✅ payload에서 uid/ts 꺼내
    uid = payload.get("uid")
    ts = payload.get("ts")
    if not uid or not ts:
        messages.error(request, "유효하지 않은 링크입니다.")
        return redirect("accounts:find_password")

    # 만료 체크
    max_age = getattr(settings, "PASSWORD_RESET_TOKEN_AGE_SECONDS", 30 * 60)
    now_ts = int(timezone.now().timestamp())
    if now_ts - int(ts) > int(max_age):
        messages.error(request, "링크가 만료되었습니다. 다시 시도하세요.")
        return redirect("accounts:find_password")

    # 유저 조회
    user = Users.objects.filter(user_id=uid, withdrawal='0', provider="local").first()
    if not user:
        messages.error(request, "계정을 찾을 수 없습니다.")
        return redirect("accounts:find_password")

    # ✅ GET이면 새 비밀번호 입력 화면
    if request.method == "GET":
        return render(request, "accounts/password_reset_confirm.html", {"token": token})

    # POST: 비번 변경
    pw1 = request.POST.get("new_password1", "")
    pw2 = request.POST.get("new_password2", "")

    if not pw1 or not pw2:
        messages.error(request, "비밀번호를 모두 입력하세요.")
        # ✅ querystring 방식으로 다시 이동
        return redirect(f"{reverse('accounts:password_reset_confirm')}?token={token}")

    if pw1 != pw2:
        messages.error(request, "비밀번호가 서로 다릅니다.")
        return redirect(f"{reverse('accounts:password_reset_confirm')}?token={token}")

    user.password = make_password(pw1)
    user.save(update_fields=["password"])

    return redirect("accounts:password_reset_complete")



@require_http_methods(["GET"])
def reset_password_complete_view(request):
    return render(request, "accounts/password_reset_complete.html")
