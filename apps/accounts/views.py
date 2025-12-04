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

    if user.role == 'admin':
        return redirect('/manager/dashboard/')

    return redirect(next_url)

@require_http_methods(["GET", "POST"])
def register_view(request):
    if request.method == "GET":
        role = request.GET.get("role", "patient")  # 기본값: patient

        # 병원 / 진료과 목록 템플릿으로 전달
        hospitals = Hospital.objects.all()
        departments = Department.objects.all()

        return render(request, "accounts/register.html", {
            "role": role,
            "hospitals": hospitals,
            "departments": departments,
        })

    # ---------- POST 처리 시작 ----------
    role = request.POST.get("role", "patient").strip()

    username = request.POST.get("username", "").strip()
    name = request.POST.get("name", "").strip()
    gender = request.POST.get("gender")
    resident_reg_no = request.POST.get("resident_reg_no", "").strip()
    phone = request.POST.get("phone", "").strip()
    email = request.POST.get("email", "").strip()
    mail_confirm = request.POST.get("mail_confirm", "N")
    password1 = request.POST.get("password1", "")
    password2 = request.POST.get("password2", "")
    address = ""  # 아직 폼에 없으니 기본값

    # 의사 전용 필드
    license_no = request.POST.get("license_number", "").strip()
    hospital_id = request.POST.get("hospital_id")       # name="hospital_id"
    department_id = request.POST.get("department_id")   # name="department_id"
    profil_url = request.POST.get("profile_image")

    # 1) 기본 검증 ----------------------
    if password1 != password2:
        messages.error(request, "비밀번호가 서로 다릅니다.")
        return redirect("register")

    if not username:
        messages.error(request, "아이디를 입력해주세요.")
        return redirect("register")

    if Users.objects.filter(username=username).exists():
        messages.error(request, "이미 사용 중인 아이디입니다.")
        return redirect("register")

    # 의사일 때 추가 검증
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
            # 2) Users 생성 ----------------
            user = Users.objects.create(
                username=username,
                password=make_password(password1),   # 지금 구조에서는 평문 그대로 사용 중이므로 그대로 둠
                name=name,
                gender=gender,
                phone=phone,
                email=email,
                resident_reg_no=resident_reg_no,
                mail_confirm=mail_confirm,
                address=address,
                role=role,
            )

            # 3) 의사라면 Doctors 생성 -------
            if role == "doctor":
                Doctors.objects.create(
                    user=user,
                    license_no=license_no,
                    verified=False,
                    memo="",
                    profil_url=profil_url,
                    hos_id=hospital_id,      # FK: Hospital(hos_id)
                    dep_id=department_id,    # FK: Department(dep_id)
                )

    except Exception as e:
        messages.error(request, f"회원가입 중 오류가 발생했습니다: {e}")
        return redirect("register")

    # messages.success(request, "회원가입이 완료되었습니다. 로그인 해주세요.")
    return redirect("login")


def check_username(request):
    username = request.GET.get('username', '').strip()
    if not username:
        return JsonResponse({'exists': False})

    exists = Users.objects.filter(username=username).exists()
    return JsonResponse({'exists': exists})

@require_http_methods(["POST"])
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