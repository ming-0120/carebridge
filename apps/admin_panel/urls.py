from django.urls import path
from . import views

urlpatterns = [
    path('', views.dashboard, name='admin_dashboard'),
    path('users/', views.user_list, name='user_list'),
    path('doctors/', views.doctor_list, name='doctor_list'),
    path('hospitals/', views.hospital_list, name='hospital_list'),
    path('approval-pending/', views.approval_pending, name='approval_pending'),
]