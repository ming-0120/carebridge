# apps/accounts/urls.py
from django.urls import path
from . import views

app_name = "accounts"

urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('register/', views.register_view, name='register'),
    path('logout/', views.logout_view, name='logout'),
    path('check-username/', views.check_username, name='check_username'),

    path('find_id/', views.find_id_view, name='find_id'),

    # ✅ 비밀번호 찾기/재설정 (Django auth 없이 Users 기준)
    path("find-password/", views.find_password_view, name="find_password"),
    path("find-password/done/", views.find_password_done_view, name="password_reset_done"),

    # ✅ token 방식(서명 토큰 1개)으로 변경
    path("reset/", views.reset_password_view, name="password_reset_confirm"),
    path("reset/done/", views.reset_password_complete_view, name="password_reset_complete"),

    path('admin/login/', views.admin_login_view, name='admin_login'),
    path('nurse/login/', views.nurse_login_view, name='nurse_login'),
]
