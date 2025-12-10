"""
QnA 앱 뷰 함수들
- QnA 목록 조회, 작성, 상세보기 기능 제공
- 페이지네이션 지원
"""

from django.shortcuts import render, redirect, get_object_or_404
from django.core.paginator import Paginator
from django.http import JsonResponse
from django.db.models import Q
from django.utils import timezone

from apps.db.models import Qna, Users


def qna_list(request):
    """
    QnA 목록 조회
    - 전체 QnA 목록을 페이지네이션하여 표시
    - 검색 기능 (제목, 내용)
    - 정렬 기능 (최신순, 오래된순)
    """
    # 로그인 확인
    if not request.session.get('user_id'):
        return redirect('login')
    
    try:
        user = Users.objects.get(user_id=request.session.get('user_id'), withdrawal='0')
    except Users.DoesNotExist:
        return redirect('login')
    
    # 검색 파라미터
    search_keyword = request.GET.get('search', '').strip()
    page_number = request.GET.get('page', 1)
    
    # QnA 목록 조회 (로그인한 사용자만)
    qnas = Qna.objects.filter(user=user)
    
    # 검색 필터 적용
    if search_keyword:
        qnas = qnas.filter(
            Q(title__icontains=search_keyword) | 
            Q(content__icontains=search_keyword)
        )
    
    # 최신순 정렬
    qnas = qnas.order_by('-created_at')
    
    # 페이지네이션 (10개씩)
    paginator = Paginator(qnas, 10)
    page_obj = paginator.get_page(page_number)
    
    context = {
        'qnas': page_obj,
        'page_obj': page_obj,
        'search_keyword': search_keyword,
    }
    
    return render(request, 'm_qna_list.html', context)


def qna_write(request):
    """
    QnA 작성 페이지
    - GET: 작성 폼 표시
    - POST: QnA 저장
    """
    # 로그인 확인
    if not request.session.get('user_id'):
        return redirect('login')
    
    try:
        user = Users.objects.get(user_id=request.session.get('user_id'), withdrawal='0')
    except Users.DoesNotExist:
        return redirect('login')
    
    if request.method == 'POST':
        title = request.POST.get('title', '').strip()
        content = request.POST.get('content', '').strip()
        privacy = request.POST.get('privacy', 'PUBLIC')
        
        # 유효성 검사
        if not title or not content:
            context = {
                'error': '제목과 내용을 입력해주세요.',
                'title': title,
                'content': content,
                'privacy': privacy,
            }
            return render(request, 'm_qna_write.html', context)
        
        # QnA 생성
        Qna.objects.create(
            user=user,
            title=title,
            content=content,
            privacy=privacy,
        )
        
        return redirect('qna_list')
    
    # GET 요청: 작성 폼 표시
    return render(request, 'm_qna_write.html')


def qna_post(request, qna_id):
    """
    QnA 상세보기
    - QnA 상세 내용 표시
    - 답변 표시 (있는 경우)
    """
    # 로그인 확인
    if not request.session.get('user_id'):
        return redirect('login')
    
    try:
        user = Users.objects.get(user_id=request.session.get('user_id'), withdrawal='0')
    except Users.DoesNotExist:
        return redirect('login')
    
    # QnA 조회 (본인이 작성한 것만)
    qna = get_object_or_404(Qna, qna_id=qna_id, user=user)
    
    context = {
        'qna': qna,
    }
    
    return render(request, 'm_qna_post.html', context)


def qna_delete(request, qna_id):
    """
    QnA 삭제
    - 본인이 작성한 QnA만 삭제 가능
    """
    # 로그인 확인
    if not request.session.get('user_id'):
        return redirect('login')
    
    try:
        user = Users.objects.get(user_id=request.session.get('user_id'), withdrawal='0')
    except Users.DoesNotExist:
        return redirect('login')
    
    # QnA 조회 및 삭제 (본인이 작성한 것만)
    qna = get_object_or_404(Qna, qna_id=qna_id, user=user)
    qna.delete()
    
    return redirect('qna_list')
