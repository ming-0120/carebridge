from django.urls import path
from . import views

app_name = 'qna'

urlpatterns = [
    # QnA 목록
    path('', views.qna_list, name='qna_list'),
    
    # QnA 작성
    path('write/', views.qna_write, name='qna_write'),
    
    # QnA 상세보기 (POST 방식)
    path('detail/', views.qna_post, name='qna_post'),
    
    # QnA 삭제
    path('<int:qna_id>/delete/', views.qna_delete, name='qna_delete'),
]
