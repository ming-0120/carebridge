from django.urls import path
import apps.emr.views as views

urlpatterns = [
    path('doctor_screen_dashboard/', views.doctor_screen_dashboard, name='doctor_screen_dashboard'),
]