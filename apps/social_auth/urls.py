# social_auth/urls.py
from django.urls import path
from .views import kakao_callback, kakao_login

urlpatterns = [
    path('login/kakao/', kakao_login, name='kakao_login'),
    path('login/kakao/callback/', kakao_callback, name='kakao_callback'),
]