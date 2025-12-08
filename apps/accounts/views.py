from django.db import IntegrityError, transaction
from django.http import JsonResponse
from django.contrib import messages
from django.contrib.auth.hashers import check_password, make_password
from django.shortcuts import render, redirect
from django.views.decorators.http import require_http_methods
import requests

from apps.db.models.department import Department
from apps.db.models.hospital import Hospital
from apps.db.models.users import Users
from apps.db.models.doctor import Doctors

@require_http_methods(["GET", "POST"])
def login_view(request):
    next_url = request.GET.get('next') or request.POST.get('next') or '/'

    # GET: 무조건 로그인 폼 보여주기
    if request.method == 'GET':
        return render(request, 'accounts/login.html', {'next': next_url})

    # POST: 실제 로그인 시도
    username = request.POST.get('username', '').strip()
    password = request.POST.get('password', '')

    if not username or not password:
        messages.error(request, "아이디와 비밀번호를 모두 입력해 주세요.")
        return render(request, 'accounts/login.html', {
            'next': next_url,
            'username': username,
        })

    try:
        user = Users.objects.get(username=username, provider='local')
    except Users.DoesNotExist:
        messages.error(request, "아이디 또는 비밀번호가 일치하지 않습니다.")
        return render(request, 'accounts/login.html', {
            'next': next_url,
            'username': username,
        })

    if not check_password(password, user.password):
        messages.error(request, "아이디 또는 비밀번호가 일치하지 않습니다.")
        return render(request, 'accounts/login.html', {
            'next': next_url,
            'username': username,
        })

    if user.withdrawal == '1':
        messages.error(request, "탈퇴 처리된 계정입니다.")
        return render(request, 'accounts/login.html', {
            'next': next_url,
            'username': username,
        })

    # 실제 로그인 처리
    request.session['user_id'] = user.user_id
    request.session['username'] = user.username
    request.session['role'] = user.role

    # 관리자 역할 체크 (role 값은 'ADMIN' - 대문자)
    if user.role == 'ADMIN':
        return redirect('/admin_panel/')

    return redirect(next_url)

@require_http_methods(["GET", "POST"])
def register_view(request):
    # ---------- 공통: 카카오 임시 정보 ----------
    kakao_tmp = request.session.get("kakao_tmp")
    from_kakao = kakao_tmp is not None

    if request.method == "GET":
        role = request.GET.get("role", "patient")          # 기본값: patient
        provider = request.GET.get("provider", "local")    # local 또는 kakao

        hospitals = Hospital.objects.all()
        departments = Department.objects.all()

        context = {
            "role": role,
            "hospitals": hospitals,
            "departments": departments,
            "provider": provider,
            "from_kakao": False,
        }

        if provider == "kakao" and from_kakao:
            context["from_kakao"] = True
            context["kakao_email"] = kakao_tmp.get("email", "")
            context["kakao_name"] = kakao_tmp.get("name", "")

        return render(request, "accounts/register.html", context)

    # ---------- POST 처리 시작 ----------
    role = request.POST.get("role", "patient").strip()
    provider = request.POST.get("provider", "local").strip()  # hidden 으로 넘기기

    username = request.POST.get("username", "").strip()
    name = request.POST.get("name", "").strip()
    gender = request.POST.get("gender")
    resident_reg_no = request.POST.get("resident_reg_no", "").strip()
    phone = request.POST.get("phone", "").strip()
    email = request.POST.get("email", "").strip()
    mail_confirm = request.POST.get("mail_confirm", "N")
    password1 = request.POST.get("password1", "")
    password2 = request.POST.get("password2", "")

    address = ""

    # 의사 전용 필드
    license_no = request.POST.get("license_number", "").strip()
    hospital_id = request.POST.get("hospital_id")
    department_id = request.POST.get("department_id")

    profil_url = request.POST.get("profil_url", "").strip()

    # 1) 역할별 주소 세팅 ----------------------
    if role == "patient":
        address = request.POST.get("address", "").strip()
    else:  # doctor
        if hospital_id:
            hospital = Hospital.objects.filter(pk=hospital_id).first()
            address = hospital.address if hospital else ""
        else:
            address = ""

    # 2) 기본 검증 -----------------------------
    # (1) 비밀번호: local 가입만 검사
    if provider == "local":
        if password1 != password2:
            messages.error(request, "비밀번호가 서로 다릅니다.")
            return redirect("register")

    # (2) 아이디: local 은 필수, kakao 는 비워두면 자동 생성
    if provider == "local" and not username:
        messages.error(request, "아이디를 입력해주세요.")
        return redirect("register")

    # 카카오인 경우 최종 username 결정
    if provider == "kakao" and from_kakao:
        kakao_id = kakao_tmp.get("provider_id")
        if not kakao_id:
            messages.error(request, "카카오 정보가 유효하지 않습니다. 다시 시도해주세요.")
            return redirect("login")
        final_username = username or f'kakao_{kakao_id}'
    else:
        final_username = username

    # (3) 아이디 중복 검사 (local / kakao 모두 적용)
    if Users.objects.filter(username=final_username).exists():
        messages.error(request, "이미 사용 중인 아이디입니다.")
        return redirect("register")

    # (4) 의사일 때 추가 검증
    if role == "doctor":
        if not hospital_id:
            messages.error(request, "병원을 선택해주세요.")
            return redirect("register")
        if not department_id:
            messages.error(request, "진찰과를 선택해주세요.")
            return redirect("register")
        if not license_no:
            messages.error(request, "의사 번호를 입력해주세요.")
            return redirect("register")

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
                    phone=phone,                    # 템플릿에서 빼면 빈 문자열
                    email=kakao_email,
                    resident_reg_no=resident_reg_no, # 템플릿에서 빼면 빈 문자열
                    mail_confirm=mail_confirm,
                    address=address,
                    role=role,
                    provider="kakao",
                    provider_id=kakao_id,
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
            if role == "doctor":
                Doctors.objects.create(
                    user=user,
                    license_no=license_no,
                    verified=False,
                    memo="",
                    profil_url=profil_url,
                    hos_id=hospital_id,
                    dep_id=department_id,
                )

    except Exception as e:
        messages.error(request, f"회원가입 중 오류가 발생했습니다: {e}")
        return redirect("register")

    # 카카오 임시 세션 정리
    if "kakao_tmp" in request.session:
        del request.session["kakao_tmp"]

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