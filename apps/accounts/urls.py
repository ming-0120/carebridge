# apps/accounts/urls.py
from django.urls import path
from .views import check_username, login_view, register_view, logout_view

urlpatterns = [
    path('login/', login_view, name='login'),
    path('register/', register_view, name='register'),
    path('logout/', logout_view, name='logout'),
    path('check-username/', check_username, name='check_username'),
]
