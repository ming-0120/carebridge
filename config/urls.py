"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),

    # 메인 홈페이지
    path('', include('apps.core.urls')),

    # 희원가입
    path('accounts/', include('apps.accounts.urls')),
    path('', include('apps.social_auth.urls')),  # 카카오 로그인 경로
    
    path("api/chat/", include("apps.chatbot.urls")),  # ← 추가
    path("reservations/", include("apps.reservations.urls")),

    # 감염병 통계 & 병원 페이지
    path('hospitals/', include('apps.hospitals.urls')),  # ← 이게 중요!!
    
    # 실시간 응급실 조회 전용 라우팅
    path('emergency/', include('apps.emergency.urls')),
    
    # 관리자 페이지
    # URL 규칙: 언더스코어(_) 사용
    path('admin_panel/', include('apps.admin_panel.urls')),  
    
    # 의사 EMR
    path('mstaff/', include('apps.emr.urls')),
    path("", include("apps.newsletter.urls")), 
]


