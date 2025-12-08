from django.urls import path
from . import views

urlpatterns = [
    # 대시보드
    path('', views.dashboard, name='admin_dashboard'),
    
    # 관리자 계정 생성
    path('create_admin_account/', views.create_admin_account, name='create_admin_account'),
    
    # 사용자 관리
    path('user_list/', views.user_list, name='user_list'),
    path('create_user_dummy/', views.create_user_dummy_data, name='create_user_dummy'),
    path('delete_user_dummy/', views.delete_user_dummy_data, name='delete_user_dummy'),
    
    # 의사 관리
    path('doctor_list/', views.doctor_list, name='doctor_list'),
    path('create_doctor_dummy/', views.create_doctor_dummy_data, name='create_doctor_dummy'),
    path('delete_doctor_dummy/', views.delete_doctor_dummy_data, name='delete_doctor_dummy'),
    
    # 병원 관리
    path('hospital_list/', views.hospital_list, name='hospital_list'),
    
    # 승인 대기
    path('approval_pending/', views.approval_pending, name='approval_pending'),
    
    # 1:1 문의 관리
    path('qna_list/', views.qna_list, name='qna_list'),
    path('qna_detail/<int:qna_id>/', views.qna_detail, name='qna_detail'),
    path('create_qna_dummy/', views.create_qna_dummy_data, name='create_qna_dummy'),
    path('delete_qna_dummy/', views.delete_qna_dummy_data, name='delete_qna_dummy'),
]
