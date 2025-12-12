import apps.emr.views as views
from django.urls import path
from .views import api_search_medicine
from . import views
from .views import api_today_patients
from .views import get_previous_medical_records
from apps.emr import views
from apps.emr.views import api_patient_summary

urlpatterns = [
    path('doctor_dashboard/', views.doctor_screen_dashboard, name='doctor_dashboard'),
    path('hospital_dashboard/', views.hospital_staff_dashboard, name='hospital_dashboard'),
    path('lab_record/', views.lab_record_creation, name='lab_record'),
    path('medical_record/', views.medical_record_creation, name='medical_record_creation'),
    path('record_inquiry/', views.medical_record_inquiry, name='medical_record_inquiry'),
    path('patient_search/', views.patient_search_list, name='patient_search'),
    path('today_list/', views.today_patient_list, name='today_list'),
    path('treatment_verify/', views.treatment_record_verification, name='treatment_verify'),
    path('previous_records/', views.view_previous_medical_records, name='previous_records'),

    path("api/medical-record/create/", views.api_create_medical_record, name="api_create_medical_record"),
    path('lab_data_search/', views.lab_data_search, name='lab_data_search'),
    path('treatment_data_search/', views.treatment_data_search, name='treatment_data_search'),
    path("api/medicine/search/", api_search_medicine),
    path("patient_search_list/", views.patient_search_list_view, name="patient_search_list"),
    path("api/patient/search/", views.api_search_patient),
    path("api/reserved-hours/", views.api_reserved_hours, name="reserved_hours"),
    path("api/today-patients/", api_today_patients, name="api_today_patients"),
    path('set_doctor_memo/', views.set_doctor_memo, name='set_doctor_memo'),
    path('get_reservation_medical_record/', views.get_reservation_medical_record, name='get_reservation_medical_record'),
    path('api/previous-records/<int:user_id>/', get_previous_medical_records),
    path('api/patient/<str:patient_id>/recent-records/', views.api_patient_recent_records, name="api_patient_recent_records"),
    path("mstaff/api/previous-records/<int:user_id>/", get_previous_medical_records),
    path("api/patient/summary/", api_patient_summary, name="api_patient_summary"),
    path('get_lab_record/', views.get_lab_record, name="get_lab_record"),
    path('get_treatment_record/', views.get_treatment_record, name="get_treatment_record"),
]
        