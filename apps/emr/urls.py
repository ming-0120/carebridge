from django.urls import path
import apps.emr.views as views

urlpatterns = [
    path('doctor_dashboard/', views.doctor_screen_dashboard, name='doctor_dashboard'),
    path('hospital_dashboard/', views.hospital_staff_dashboard, name='hospital_dashboard'),
    path('lab_record/', views.lab_record_creation, name='lab_record'),
    path('medical_record/', views.medical_record_creation, name='medical_record'),
    path('record_inquiry/', views.medical_record_inquiry, name='record_inquiry'),
    path('patient_search/', views.patient_search_list, name='patient_search'),
    path('today_list/', views.today_patient_list, name='today_list'),
    path('treatment_verify/', views.treatment_record_verification, name='treatment_verify'),
    path('previous_records/', views.view_previous_medical_records, name='previous_records'),
]
