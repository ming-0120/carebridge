"""
관리자 패널 URL 설정

관리자 패널의 모든 URL 라우팅을 정의합니다.
모든 URL은 /admin_panel/로 시작합니다.
"""

from django.urls import path
from . import views

urlpatterns = [
    # 대시보드
    # 관리자 메인 페이지 - 통계 정보 및 요약 대시보드
    path('', views.dashboard, name='admin_dashboard'),
    
    # 사용자 관리
    # 사용자 목록 페이지 - 일반 사용자 목록 조회, 검색, 정렬 기능
    path('users/', views.user_list, name='user_list'),
    # 더미 사용자 데이터 생성 (테스트용)
    path('users/create_dummy/', views.create_user_dummy_data, name='create_user_dummy'),
    # 더미 사용자 데이터 삭제 (테스트용)
    path('users/delete_dummy/', views.delete_user_dummy_data, name='delete_user_dummy'),
    
    # 의사 관리
    # 의사 목록 페이지 - 의사 목록 조회, 검색, 정렬 기능
    path('doctors/', views.doctor_list, name='doctor_list'),
    # 더미 의사 데이터 생성 (테스트용)
    path('doctors/create_dummy/', views.create_doctor_dummy_data, name='create_doctor_dummy'),
    # 더미 의사 데이터 삭제 (테스트용)
    path('doctors/delete_dummy/', views.delete_doctor_dummy_data, name='delete_doctor_dummy'),
    
    # 병원 관리
    # 병원 목록 페이지 - 병원 목록 조회, 검색, 정렬 기능
    path('hospitals/', views.hospital_list, name='hospital_list'),
    
    # 의사 승인 대기
    # 의사 승인 대기 페이지 - 검증되지 않은 의사 목록 및 승인/거절 처리
    path('approval_pending/', views.approval_pending, name='approval_pending'),
    
    # 1:1 문의 관리
    # 문의 목록 페이지 - 모든 문의 목록 조회 및 삭제 기능
    path('qna/', views.qna_list, name='qna_list'),
    # 문의 상세 페이지 - 문의 상세 정보 조회 및 답변 작성
    path('qna/<int:qna_id>/', views.qna_detail, name='qna_detail'),
    # 더미 문의 데이터 생성 (테스트용)
    path('qna/create_dummy/', views.create_qna_dummy_data, name='create_qna_dummy'),
    # 더미 문의 데이터 삭제 (테스트용)
    path('qna/delete_dummy/', views.delete_qna_dummy_data, name='delete_qna_dummy'),
]