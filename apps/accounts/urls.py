# apps/accounts/urls.py
from django.urls import path
from .views import login_view, register_view, logout_view, check_username, admin_login_view, nurse_login_view

urlpatterns = [
    path('login/', login_view, name='login'),
    path('register/', register_view, name='register'),
    path('logout/', logout_view, name='logout'),
    path('check-username/', check_username, name='check_username'),

    path('admin/login/', admin_login_view, name='admin_login'),
    path('nurse/login/', nurse_login_view, name='nurse_login'),
]
