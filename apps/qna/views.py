"""
QnA 앱 뷰 함수들
- QnA 목록 조회, 작성, 상세보기 기능 제공
- 페이지네이션 지원
- db/models/qna.py의 Qna 모델 구조에 맞춰 구현
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
    - 로그인한 사용자 본인의 문의 + 관리자가 만든 더미데이터 조회
    - 페이지네이션 지원 (10개씩)
    - 검색 기능 (제목, 내용)
    - 최신순 정렬
    - select_related('user')를 사용하여 성능 최적화
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
    
    # QnA 목록 조회 (로그인한 사용자 본인의 문의 + 관리자가 만든 더미데이터)
    # select_related('user'): user 정보를 미리 로드하여 N+1 쿼리 문제 방지
    # 더미데이터는 제목이 "더미 문의"로 시작하는 문의
    qnas = Qna.objects.select_related('user').filter(
        Q(user=user) | Q(title__startswith='더미 문의')
    )
    
    # 검색 필터 적용
    if search_keyword:
        qnas = qnas.filter(
            Q(title__icontains=search_keyword) | 
            Q(content__icontains=search_keyword)
        )
    
    # 최신순 정렬 (created_at 기준 내림차순)
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
    - POST: QnA 저장 (db/models/qna.py의 Qna 모델 구조에 맞춰 저장)
    """
    # 로그인 확인
    if not request.session.get('user_id'):
        return redirect('login')
    
    try:
        user = Users.objects.get(user_id=request.session.get('user_id'), withdrawal='0')
    except Users.DoesNotExist:
        return redirect('login')
    
    if request.method == 'POST':
        # POST 데이터에서 필드 값 가져오기
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
        
        # QnA 생성 (db/models/qna.py의 Qna 모델 구조에 맞춰 저장)
        # - qna_id: AutoField (자동 생성)
        # - title: 제목
        # - content: 내용
        # - reply: null (답변은 관리자가 나중에 작성)
        # - created_at: auto_now_add=True (자동 생성)
        # - privacy: 공개 설정 (PUBLIC/PRIVATE)
        # - user: ForeignKey to Users
        Qna.objects.create(
            user=user,
            title=title,
            content=content,
            privacy=privacy,
            # reply는 기본값 None (답변은 관리자가 작성)
            # created_at은 auto_now_add=True로 자동 생성
        )
        
        return redirect('qna:qna_list')
    
    # GET 요청: 작성 폼 표시
    return render(request, 'm_qna_write.html')


def qna_post(request, qna_id):
    """
    QnA 상세보기
    - QnA 상세 내용 표시 (db/models/qna.py의 Qna 모델 구조에 맞춰 조회)
    - 답변 표시 (reply 필드가 있는 경우)
    - select_related('user')를 사용하여 성능 최적화
    """
    # 로그인 확인
    if not request.session.get('user_id'):
        return redirect('login')
    
    try:
        user = Users.objects.get(user_id=request.session.get('user_id'), withdrawal='0')
    except Users.DoesNotExist:
        return redirect('login')
    
    # QnA 조회 (본인이 작성한 것 또는 더미데이터)
    # select_related('user'): user 정보를 미리 로드하여 N+1 쿼리 문제 방지
    # 더미데이터는 제목이 "더미 문의"로 시작하는 문의
    qna = get_object_or_404(
        Qna.objects.select_related('user').filter(
            Q(qna_id=qna_id) & (Q(user=user) | Q(title__startswith='더미 문의'))
        )
    )
    
    context = {
        'qna': qna,
    }
    
    return render(request, 'm_qna_post.html', context)


def qna_delete(request, qna_id):
    """
    QnA 삭제
    - 본인이 작성한 QnA만 삭제 가능 (db/models/qna.py의 Qna 모델 구조에 맞춰 삭제)
    - 더미데이터는 삭제 불가
    - POST 방식만 허용
    """
    # POST 방식 체크
    if request.method != 'POST':
        return redirect('qna:qna_list')
    
    # 로그인 확인
    if not request.session.get('user_id'):
        return redirect('login')
    
    try:
        user = Users.objects.get(user_id=request.session.get('user_id'), withdrawal='0')
    except Users.DoesNotExist:
        return redirect('login')
    
    # QnA 조회 (본인이 작성한 것만)
    # qna_id와 user로 조회하여 본인이 작성한 문의만 조회
    qna = get_object_or_404(Qna, qna_id=qna_id, user=user)
    
    # 더미데이터는 삭제 불가 (제목이 "더미 문의"로 시작하는 경우 삭제하지 않음)
    if not qna.title.startswith('더미 문의'):
        # QnA 삭제 (CASCADE 설정으로 user가 삭제되면 관련 QnA도 자동 삭제됨)
        qna.delete()
    
    return redirect('qna:qna_list')
