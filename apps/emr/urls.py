from django.urls import path
import apps.emr.views as views
from .views import api_search_medicine

urlpatterns = [
    path('doctor_dashboard/', views.doctor_screen_dashboard, name='doctor_dashboard'),
    path('hospital_dashboard/', views.hospital_staff_dashboard, name='hospital_dashboard'),
    path('lab_record/', views.lab_record_creation, name='lab_record'),
    path('medical_record/', views.medical_record_creation, name='medical_record_creation'),
    path('record_inquiry/', views.medical_record_inquiry, name='record_inquiry'),
    path('patient_search/', views.patient_search_list, name='patient_search'),
    path('today_list/', views.today_patient_list, name='today_list'),
    path('treatment_verify/', views.treatment_record_verification, name='treatment_verify'),
    path('previous_records/', views.view_previous_medical_records, name='previous_records'),

    # 처방 저장 API
    path("api/medical-record/create/", views.api_create_medical_record, name="api_create_medical_record"),
    path('lab_data_search/', views.lab_data_search, name='lab_data_search'),
    path('treatment_data_search/', views.treatment_data_search, name='treatment_data_search'),

    path("api/medicine/search/", api_search_medicine),

    path("patient_search_list/", views.patient_search_list_view, name="patient_search_list"),
    path("api/patient/search/", views.api_search_patient),

]
        