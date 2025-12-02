from django.urls import path
from . import views

urlpatterns = [
    path('', views.dashboard, name='admin_dashboard'),
    path('users/', views.user_list, name='user_list'),
    path('doctors/', views.doctor_list, name='doctor_list'),
    path('hospitals/', views.hospital_list, name='hospital_list'),
    path('approval-pending/', views.approval_pending, name='approval_pending'),
    path('qna/', views.qna_list, name='qna_list'),
    path('qna/<int:qna_id>/', views.qna_detail, name='qna_detail'),
    path('qna/create-dummy/', views.create_qna_dummy_data, name='create_qna_dummy'),
    path('users/create-dummy/', views.create_user_dummy_data, name='create_user_dummy'),
]