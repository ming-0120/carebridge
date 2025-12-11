from pyexpat.errors import messages
import requests
from django.conf import settings
from django.http import HttpResponseBadRequest
from django.shortcuts import redirect
from apps.db.models.users import Users

def kakao_login(request):
    rest_api_key = settings.KAKAO_REST_API_KEY
    redirect_uri = settings.KAKAO_REDIRECT_URI 

    kakao_auth_url = "https://kauth.kakao.com/oauth/authorize"
    return redirect(
        f"{kakao_auth_url}?response_type=code"
        f"&client_id={rest_api_key}"
        f"&redirect_uri={redirect_uri}"
        f"&prompt=login"        
    )

def kakao_callback(request):
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

    # 2) Kakao 사용자 정보 요청
    user_info_url = "https://kapi.kakao.com/v2/user/me"
    user_info_resp = requests.get(
        user_info_url,
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=5,
    )
    if user_info_resp.status_code != 200:
        return HttpResponseBadRequest("Failed to get user info")

    data = user_info_resp.json()
    kakao_id = data.get("id")
    account = data.get("kakao_account", {}) or {}
    profile = account.get("profile", {}) or {}
    
    nickname = profile.get("nickname") or f"kakao_{kakao_id}"

    # 3) 여기서 Users를 만들지 않는다!
    #    필요한 정보만 세션에 저장해두고 추가 입력 페이지로 보냄
    request.session["kakao_tmp"] = {        
        "provider": "kakao",
        "provider_id": str(kakao_id),        
        "name": nickname,
    }

    # 이미 가입된 카카오 유저인지 확인
    if Users.objects.filter(provider="kakao", provider_id=str(kakao_id)).exists(): 
        user = Users.objects.get(provider="kakao", provider_id=str(kakao_id))

        # ★ 탈퇴 계정이면: 다시 가입 플로우로
        if user.withdrawal == '1':
            request.session["kakao_notice"] = "기존 탈퇴 이력이 있어 다시 회원가입을 진행해야 합니다."
            return redirect("/accounts/register/?provider=kakao")

        # 활성 계정이면 바로 로그인 처리
        request.session["auth_from"] = "kakao"
        request.session["kakao_id"] = str(kakao_id)

        request.session["user_id"] = user.user_id
        request.session["username"] = user.name
        request.session["role"] = user.role

        request.session.set_expiry(30 * 60)

        return redirect("/")
    else:
        request.session["kakao_notice"] = "카카오 계정으로 처음 방문하셨습니다. 추가 정보를 입력해 주세요."
        return redirect("/accounts/register/?provider=kakao")
