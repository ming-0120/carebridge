import os
import re
import uuid
from django.db import transaction
from django.http import JsonResponse
from django.contrib import messages
from django.contrib.auth.hashers import check_password, make_password
from django.shortcuts import render, redirect
from django.views.decorators.http import require_http_methods
import requests
from django.core.files.storage import default_storage
from apps.db.models.department import Department
from apps.db.models.hospital import Hospital
from apps.db.models.users import Users
from apps.db.models.doctor import Doctors

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
                'role': 'DOCTOR',   # 토글이 의사로 보이게
            })    
        
    request.session['user_id'] = user.user_id
    request.session['username'] = user.name
    request.session['role'] = user.role

    # 30분 세션 유지
    request.session.set_expiry(30 * 60)

    # 역할별 리다이렉트
    if user.role == 'ADMIN':
        return redirect('/admin_panel/')
    elif user.role == 'DOCTOR':
        return redirect('/mstaff/doctor_dashboard/')
    elif user.role == 'NURSE':
        return redirect('mstaff/hospital_dashboard/')
    

    # 일반 환자, 그 외 역할은 next_url 로
    return redirect(next_url)

@require_http_methods(["GET", "POST"])
def register_view(request):
    # ---------- 공통: 카카오 임시 정보 ----------
    kakao_tmp = request.session.get("kakao_tmp")
    from_kakao = kakao_tmp is not None

    # 공통으로 쓰는 목록 (GET/POST 둘 다 필요)
    hospitals = Hospital.objects.all()
    departments = Department.objects.all()
    kakao_notice = request.session.pop("kakao_notice", None)

    # ---------- GET: 회원가입 폼 ----------
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

    # ---------- POST: 실제 회원가입 처리 ----------
    profile_file = request.FILES.get("profile_image")
    profile_url = ""  # 기본값
    if profile_file:
        ext = os.path.splitext(profile_file.name)[1]  # .jpg, .png 등
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

    # ✅ 사용자가 입력한 이메일 (이 값으로 가입되게 강제할 것)
    email = request.POST.get("email", "").strip()

    mail_confirm = request.POST.get("mail_confirm", "N")
    password1 = request.POST.get("password1", "")
    password2 = request.POST.get("password2", "")

    zipcode = request.POST.get("zipcode", "").strip()
    addr1 = request.POST.get("addr1", "").strip()
    addr2 = request.POST.get("addr2", "").strip()

    # 의사 전용 필드
    license_no = request.POST.get("license_number", "").strip()
    hospital_id = request.POST.get("hospital_id")
    department_id = request.POST.get("department_id")

    # 에러 시 다시 렌더링할 때 쓸 공통 context
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

    # ✅ (중요) 이메일 입력은 local/kakao 모두 필수로 강제
    if not email:
        messages.error(request, "이메일을 입력해주세요.")
        return render(request, "accounts/register.html", base_context)

    # 1) 역할별 주소 세팅 ----------------------
    if role == "PATIENT":
        if zipcode or addr1 or addr2:
            address = f"{zipcode}|{addr1}|{addr2}"
        else:
            address = ""
    else:  # doctor
        if hospital_id:
            hospital = Hospital.objects.filter(pk=hospital_id).first()
            address = hospital.address if hospital else ""
        else:
            address = ""

    # 2) 기본 검증 -----------------------------
    # (1) 비밀번호: local 가입만 검사
    if provider == "local" and password1 != password2:
        messages.error(request, "비밀번호가 서로 다릅니다.")
        return render(request, "accounts/register.html", base_context)

    # (2) 아이디: local 은 필수, kakao 는 비워두면 자동 생성
    if provider == "local" and not username:
        messages.error(request, "아이디를 입력해주세요.")
        return render(request, "accounts/register.html", base_context)

    # 카카오인 경우 최종 username 결정
    if provider == "kakao" and from_kakao:
        kakao_id = kakao_tmp.get("provider_id")
        if not kakao_id:
            messages.error(request, "카카오 정보가 유효하지 않습니다. 다시 시도해주세요.")
            return redirect("login")
        final_username = username or f"kakao_{kakao_id}"
    else:
        final_username = username

    # (3) 아이디 중복 검사 (local / kakao 모두 적용)
    if final_username and Users.objects.filter(username=final_username, withdrawal=0).exists():
        messages.error(request, "이미 사용 중인 아이디입니다.")
        return render(request, "accounts/register.html", base_context)

    # (3-0) 성별-주민번호 뒷자리 첫 숫자 검증 (값이 있을 때만)
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

    # (3-1) 주민등록번호 중복 검사 (값이 있을 때만)
    if resident_reg_no:
        if Users.objects.filter(resident_reg_no=resident_reg_no).exclude(withdrawal='1').exists():
            messages.error(request, "이미 가입된 회원입니다.")
            return redirect("login")

    # (4) 의사일 때 추가 검증
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
            # 3) Users 생성 ----------------
            if provider == "kakao" and from_kakao:
                kakao_id = kakao_tmp.get("provider_id")
                kakao_email = kakao_tmp.get("email", "")

                user = Users.objects.create(
                    username=final_username,
                    password="",  # 소셜 로그인: 비밀번호 사용 안 함
                    name=name,
                    gender=gender,
                    phone=phone,

                    # ✅ 사용자가 입력한 이메일로 가입
                    email=email,

                    resident_reg_no=resident_reg_no,
                    mail_confirm=mail_confirm,
                    address=address,
                    role=role,
                    provider="kakao",
                    provider_id=kakao_id,

                    # 참고용으로만 보관
                    provider_email=kakao_email,
                )
            else:
                # 일반 로컬 회원가입
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

            # 4) 의사라면 Doctors 생성 -------
            if role == "DOCTOR":
                Doctors.objects.create(
                    user=user,
                    license_no=license_no,
                    verified=False,
                    memo="",
                    profil_url=profile_url,  # 기존 필드명이 profil_url 이라면 그대로 유지
                    hos_id=hospital_id,
                    dep_id=department_id,
                )

    except Exception as e:
        messages.error(request, f"회원가입 중 오류가 발생했습니다: {e}")
        return render(request, "accounts/register.html", base_context)

    # 카카오 임시 세션 정리
    if "kakao_tmp" in request.session:
        del request.session["kakao_tmp"]

    request.session["just_registered_role"] = role
    return redirect("login")



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
            headers = {
                "Authorization": f"Bearer {kakao_access_token}",
            }
            requests.post(url, headers=headers, timeout=3)
        except Exception:
            pass

    return redirect('/')

def admin_login_view(request):
    # 기본 role 힌트를 ADMIN 으로, 템플릿도 관리자용으로 쓰고 싶다면 여기서만 바꿔줌
    return login_view(
        request,
        default_role="ADMIN",
        template_name="accounts/admin_login.html",  # 관리자용 화면  # 필요 없으면 기본 login.html 그대로 써도 됨
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