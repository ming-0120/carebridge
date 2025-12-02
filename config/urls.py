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
from django.shortcuts import redirect
from django.http import HttpResponsePermanentRedirect

def admin_panel_redirect(request, path=''):
    """admin-panel/로 접근 시 admin_panel/로 리다이렉트"""
    query_string = request.GET.urlencode()
    redirect_url = f'/admin_panel/{path}'
    if query_string:
        redirect_url += f'?{query_string}'
    return HttpResponsePermanentRedirect(redirect_url)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('apps.core.urls')),
    path('hospitals/', include('apps.hospitals.urls')),  # ← 이게 중요!!
    path('emergency/', include('apps.hospitals.urls')),
    path('admin_panel/', include('apps.admin_panel.urls')),  
    path('admin-panel/', lambda request: admin_panel_redirect(request, '')),  # 하이픈으로 접근 시 언더스코어로 리다이렉트
    path('admin-panel/<path:path>', admin_panel_redirect),  # 하이픈으로 접근 시 언더스코어로 리다이렉트
    path('mstaff/', include('apps.emr.urls')),
]