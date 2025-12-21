"""
QnA 앱 뷰 함수들
- QnA 목록 조회, 작성, 상세보기 기능 제공
- 페이지네이션 지원
- db/models/qna.py의 Qna 모델 구조에 맞춰 구현
"""

from django.shortcuts import render, redirect, get_object_or_404
from django.core.paginator import Paginator
from django.http import JsonResponse
from django.db.models import Q, Case, When, Value, IntegerField
from django.utils import timezone
from django.template.loader import render_to_string

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
        return redirect('accounts:login')
    try:
        user = Users.objects.get(user_id=request.session.get('user_id'), withdrawal='0')
    except Users.DoesNotExist:
        return redirect('accounts:login')
    
    # 검색 파라미터 (POST 또는 GET 방식)
    search_keyword = (request.POST.get('search') or request.GET.get('search', '')).strip()
    page_number = request.POST.get('page') or request.GET.get('page', 1)
    
    # 정렬 파라미터 (POST 또는 GET 방식)
    sort_field = request.POST.get('sort') or request.GET.get('sort', 'created_at')  # 기본값: created_at
    sort_order = request.POST.get('order') or request.GET.get('order', 'desc')  # 기본값: desc (내림차순)
    
    # QnA 목록 조회 (로그인한 사용자 본인의 문의 + 다른 사람이 공개로 설정한 글 + 관리자가 만든 더미데이터)
    # select_related('user'): user 정보를 미리 로드하여 N+1 쿼리 문제 방지
    # 
    # 필터 조건:
    # 1. 본인이 작성한 글 (Q(user=user)) - 공개/비공개 상관없이 모두 표시
    # 2. 다른 사람이 공개로 설정한 글 (Q(privacy='PUBLIC') & ~Q(user=user)) - 공개 글만 표시
    # 3. 더미데이터 표시 (Q(title__startswith='더미 문의')) - 관리자가 생성한 테스트 데이터
    
    qnas = (
        Qna.objects.select_related('user')
        .filter(
            Q(user=user) |
            (Q(privacy='PUBLIC') & ~Q(user=user))
        )
        .filter(user__withdrawal='0')  # Active 사용자만
    )
    
    # 검색 필터링 (제목 또는 내용으로 검색)
    if search_keyword:
        qnas = qnas.filter(
            Q(title__icontains=search_keyword) | Q(content__icontains=search_keyword)
        )
    
    # 정렬 처리
    # 허용된 정렬 필드만 처리 (보안)
    allowed_sort_fields = {
        'qna_id': 'qna_id',
        'title': 'title',
        'created_at': 'created_at',
        'username': 'user__name',  # username 대신 name으로 정렬 (표시는 마스킹된 이름)
        'privacy': 'privacy',
        'status': 'reply',  # reply가 있으면 답변 완료, 없으면 대기
    }
    
    # 정렬 필드 검증
    if sort_field not in allowed_sort_fields:
        sort_field = 'created_at'
    
    # 정렬 방향 검증
    if sort_order not in ['asc', 'desc']:
        sort_order = 'desc'
    
    # 정렬 필드 매핑
    db_sort_field = allowed_sort_fields[sort_field]
    
    # 정렬 적용
    if sort_field == 'status':
        # 상태 정렬: reply가 있으면 답변 완료(1), 없으면 대기(0)
        # Case/When을 사용하여 reply 필드의 NULL 여부에 따라 정렬
        if sort_order == 'asc':
            # 오름차순: 대기(0) 먼저, 답변 완료(1) 나중
            qnas = qnas.annotate(
                status_value=Case(
                    When(reply__isnull=True, then=Value(0)),
                    default=Value(1),
                    output_field=IntegerField()
                )
            ).order_by('status_value')
        else:
            # 내림차순: 답변 완료(1) 먼저, 대기(0) 나중
            qnas = qnas.annotate(
                status_value=Case(
                    When(reply__isnull=True, then=Value(0)),
                    default=Value(1),
                    output_field=IntegerField()
                )
            ).order_by('-status_value')
    else:
        # 일반 정렬
        if sort_order == 'asc':
            qnas = qnas.order_by(db_sort_field)
        else:
            qnas = qnas.order_by(f'-{db_sort_field}')
    
    # 페이지네이션 (10개씩)
    paginator = Paginator(qnas, 10)
    page_obj = paginator.get_page(page_number)
    
    context = {
        'qnas': page_obj,
        'page_obj': page_obj,
        'search_keyword': search_keyword,
        'sort_field': sort_field,
        'sort_order': sort_order,
    }
    
    # AJAX 요청인 경우 테이블 부분만 반환
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        # 테이블과 페이지네이션만 렌더링
        table_html = render_to_string('qna/partials/qna_table.html', context, request=request)
        pagination_html = render_to_string('qna/partials/qna_pagination.html', context, request=request)
        return JsonResponse({
            'table_html': table_html,
            'pagination_html': pagination_html,
        })
    
    return render(request, 'm_qna_list.html', context)


def qna_write(request):
    """
    QnA 작성 페이지
    - GET: 작성 폼 표시
    - POST: QnA 저장 (db/models/qna.py의 Qna 모델 구조에 맞춰 저장)
    """
    # 로그인 확인
    if not request.session.get('user_id'):
        redirect('accounts:login')
    
    try:
        user = Users.objects.get(user_id=request.session.get('user_id'), withdrawal='0')
    except Users.DoesNotExist:
        redirect('accounts:login')
    
    if request.method == 'POST':
        # POST 데이터에서 필드 값 가져오기
        title = request.POST.get('title', '').strip()
        content = request.POST.get('content', '').strip()
        privacy = request.POST.get('privacy', 'PUBLIC')
        privacy_consent = request.POST.get('privacy_consent', '')
        
        # 유효성 검사
        if not title or not content:
            context = {
                'error': '제목과 내용을 입력해주세요.',
                'title': title,
                'content': content,
                'privacy': privacy,
            }
            return render(request, 'm_qna_write.html', context)
        
        # 개인정보 수집·이용 동의 확인 (필수)
        if privacy_consent != 'agree':
            context = {
                'error': '개인정보 수집·이용에 동의해주세요.',
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
    # 생년월일 추출 (resident_reg_no에서 추출)
    birth_date = None
    if user.resident_reg_no:
        # 주민등록번호 형식: YYMMDD-XXXXXXX 또는 YYYYMMDD-XXXXXXX
        reg_no = user.resident_reg_no.replace('-', '')
        if len(reg_no) >= 6:
            year = reg_no[:2]
            month = reg_no[2:4]
            day = reg_no[4:6]
            # 1900년대 또는 2000년대 판단 (7번째 자리로 판단)
            if len(reg_no) >= 7:
                gender_code = reg_no[6]
                if gender_code in ['1', '2', '5', '6']:  # 1900년대
                    year = '19' + year
                elif gender_code in ['3', '4', '7', '8']:  # 2000년대
                    year = '20' + year
            birth_date = f"{year}-{month}-{day}"
    
    # 전화번호 분리 (010-1234-5678 형식) - 마스킹 없이 원본 표시
    phone_parts = {'area': '', 'middle': '', 'last': ''}
    if user.phone:
        phone_split = user.phone.split('-')
        if len(phone_split) >= 3:
            phone_parts['area'] = phone_split[0]
            # 중간 번호 원본 표시
            phone_parts['middle'] = phone_split[1] if phone_split[1] else ''
            # 마지막 번호 원본 표시
            phone_parts['last'] = phone_split[2] if phone_split[2] else ''
        elif len(phone_split) == 1 and len(user.phone) >= 10:
            # 하이픈 없는 경우 (01012345678)
            phone_parts['area'] = user.phone[:3]
            phone_parts['middle'] = user.phone[3:7] if len(user.phone) >= 7 else ''
            phone_parts['last'] = user.phone[7:] if len(user.phone) > 7 else ''
    
    # 이메일 분리 (user@domain.com 형식)
    email_parts = {'username': '', 'domain': ''}
    if user.email:
        email_split = user.email.split('@')
        if len(email_split) >= 2:
            email_parts['username'] = email_split[0]
            email_parts['domain'] = email_split[1]
    
    context = {
        'user': user,
        'birth_date': birth_date,
        'phone_parts': phone_parts,
        'email_parts': email_parts,
    }
    
    return render(request, 'm_qna_write.html', context)


def qna_post(request):
    """
    QnA 상세보기 (POST 방식)
    - QnA 상세 내용 표시 (db/models/qna.py의 Qna 모델 구조에 맞춰 조회)
    - 답변 표시 (reply 필드가 있는 경우)
    - select_related('user')를 사용하여 성능 최적화
    - POST 방식으로만 접근 가능 (URL에 qna_id 노출 방지)
    """
    # POST 방식만 허용
    if request.method != 'POST':
        return redirect('qna:qna_list')
    
    # 로그인 확인
    if not request.session.get('user_id'):
        return redirect('login')
    
    try:
        user = Users.objects.get(user_id=request.session.get('user_id'), withdrawal='0')
    except Users.DoesNotExist:
        return redirect('login')
    
    # POST 데이터에서 qna_id 가져오기
    qna_id = request.POST.get('qna_id')
    if not qna_id:
        return redirect('qna:qna_list')
    
    try:
        qna_id = int(qna_id)
    except (ValueError, TypeError):
        return redirect('qna:qna_list')
    
    # QnA 조회 (본인이 작성한 것, 공개된 글, 또는 더미데이터)
    # select_related('user'): user 정보를 미리 로드하여 N+1 쿼리 문제 방지
    # 더미데이터는 제목이 "더미 문의"로 시작하는 문의
    # 필터 조건:
    # 1. 본인이 작성한 글 (공개/비공개 상관없이 모두 표시)
    # 2. 다른 사람이 공개로 설정한 글 (privacy='PUBLIC')
    # 3. 더미데이터 (제목이 "더미 문의"로 시작)
    qna = get_object_or_404(
        Qna.objects.select_related('user').filter(
            Q(qna_id=qna_id) & (
                Q(user=user) | 
                (Q(privacy='PUBLIC') & ~Q(user=user)) | 
                Q(title__startswith='더미 문의')
            )
        ).filter(user__withdrawal='0')  # Active 사용자만
    )
    
    # 본인이 작성한 글인지 확인 (더미데이터는 제외)
    is_owner = (qna.user == user) and (not qna.title.startswith('더미 문의'))
    is_from_mypage = request.POST.get('from_page') == 'mypage'
    context = {
        'qna': qna,
        'is_owner': is_owner,
        'is_from_mypage': is_from_mypage,
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
