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
from django.conf import settings
from django.conf.urls.static import static
from apps.core import views as core_views
from apps.core import errors as error_views
from apps.emergency import views as emergency_views



urlpatterns = [
    path('admin/', admin.site.urls),

    # 메인 홈페이지
    path('', include('apps.core.urls')),
    path("api/save_location/", core_views.save_location, name="save_location"),


    # 희원가입
    path("accounts/", include(("apps.accounts.urls", "accounts"), namespace="accounts")),
    path('', include('apps.social_auth.urls')),  # 카카오 로그인 경로
    
    path("api/chat/", include("apps.chatbot.urls")),  # ← 추가
    path("reservations/", include("apps.reservations.urls")),

    # 감염병 통계 & 병원 페이지
    path('hospitals/', include('apps.hospitals.urls')),  # ← 이게 중요!!

    # 마이페이지
    path('mypage/', include('apps.mypage.urls')),  # ← 이게 중요!!
    
    # 실시간 응급실 조회 전용 라우팅
    path('emergency/', include('apps.emergency.urls')),
    path("emergency/update/", emergency_views.update_preferences, name="emergency_update"),

    
    # 관리자 페이지
    # URL 규칙: 언더스코어(_) 사용
    path('admin_panel/', include('apps.admin_panel.urls')),
    # qna
    path('qna/', include('apps.qna.urls')),
    
    # 의사 EMR
    path('mstaff/', include('apps.emr.urls')),
    path("", include("apps.newsletter.urls")), 
]
if settings.DEBUG:
    urlpatterns += [
        path("__errors__/403/", error_views.debug_403),
        path("__errors__/404/", error_views.debug_404),
        path("__errors__/500/", error_views.debug_500),
    ]
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

handler403 = "apps.core.errors.custom_403"
handler404 = "apps.core.errors.custom_404"
handler500 = "apps.core.errors.custom_500"
