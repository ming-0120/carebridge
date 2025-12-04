# apps/social_auth/views.py

import requests
from django.conf import settings
from django.contrib.auth import get_user_model, login
from django.http import HttpResponseBadRequest
from django.shortcuts import redirect

User = get_user_model()


def kakao_login(request):
    """
    카카오 로그인 시작 (그냥 이 URL로 들어오면 곧바로 카카오로 리다이렉트)
    """
    rest_api_key = settings.KAKAO_REST_API_KEY
    redirect_uri = settings.KAKAO_REDIRECT_URI  # .env에 있는 전체 URL

    kakao_auth_url = "https://kauth.kakao.com/oauth/authorize"
    return redirect(
        f"{kakao_auth_url}?response_type=code"
        f"&client_id={rest_api_key}"
        f"&redirect_uri={redirect_uri}"
        f"&prompt=login"
    )


def kakao_callback(request):
    """
    카카오에서 ?code=... 들고 돌아오는 콜백
    → 토큰 발급 → 유저 정보 조회 → User/세션 생성 → 메인으로 redirect
    """
    code = request.GET.get("code")
    if not code:
        return HttpResponseBadRequest("No code provided")

    rest_api_key = settings.KAKAO_REST_API_KEY
    redirect_uri = settings.KAKAO_REDIRECT_URI

    # 1) 토큰 요청
    token_url = "https://kauth.kakao.com/oauth/token"
    data = {
        "grant_type": "authorization_code",
        "client_id": rest_api_key,
        "redirect_uri": redirect_uri,
        "code": code,
    }

    token_response = requests.post(
        token_url,
        data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded;charset=utf-8"},
        timeout=5,
    )

    if token_response.status_code != 200:
        return HttpResponseBadRequest("Failed to get access token from Kakao")

    token_json = token_response.json()
    access_token = token_json.get("access_token")
    if not access_token:
        return HttpResponseBadRequest("No access token in response")

    # 2) 유저 정보 요청
    user_info_url = "https://kapi.kakao.com/v2/user/me"
    user_info_resp = requests.get(
        user_info_url,
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=5,
    )

    if user_info_resp.status_code != 200:
        return HttpResponseBadRequest("Failed to get user info from Kakao")

    kakao_account = user_info_resp.json()
    kakao_id = kakao_account.get("id")
    kakao_profile = kakao_account.get("kakao_account", {}).get("profile", {})
    nickname = kakao_profile.get("nickname") or f"kakao_{kakao_id}"

    if not kakao_id:
        return HttpResponseBadRequest("No kakao id")

    username = f"kakao_{kakao_id}"
    email = kakao_account.get("kakao_account", {}).get("email")

    # 3) Django User 생성/조회
    user, created = User.objects.get_or_create(
        username=username,
        defaults={"email": email or ""},
    )

    if created:
        user.save()

    # 4) Django auth 로그인
    login(request, user)

    # 5) 네가 헤더에서 사용하는 세션 키도 채워주기
    request.session["username"] = nickname  # 또는 username

    # 6) 메인 페이지로 redirect (팝업 없음)
    return redirect(settings.LOGIN_REDIRECT_URL)
