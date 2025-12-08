"""
관리자 패널 뷰 함수들
- 대시보드, 사용자/의사/병원 목록, 승인 대기, 1:1 문의 관리 기능 제공
- AJAX 요청 처리 및 페이지네이션 지원
"""

# Django 기본 기능
from django.shortcuts import render, redirect, get_object_or_404  # 템플릿 렌더링, 리다이렉트, 객체 조회 또는 404 에러
from django.utils import timezone  # 시간대를 고려한 현재 시간/날짜 처리
from datetime import timedelta  # 날짜/시간 연산 (예: 7일 전 계산)

# Django ORM 기능
from django.db.models import Count, Sum, Q  # 집계 함수(Count, Sum), 복잡한 쿼리 조건(Q)
from django.core.paginator import Paginator  # 페이지네이션 처리
from django.db import connection  # 원시 SQL 쿼리 실행 (더미 데이터 생성 시 사용)

# Django 템플릿 및 HTTP 응답
from django.template.loader import render_to_string  # 템플릿을 문자열로 렌더링 (AJAX 응답용)
from django.http import JsonResponse  # JSON 형식 HTTP 응답 (AJAX 요청 처리)

# 데이터베이스 모델
from apps.db.models import Users, Doctors, Hospital, Qna, DailyVisit, UserFavorite, Department

# Python 표준 라이브러리
import json  # JSON 데이터 처리 (차트 데이터 직렬화)
import re  # 정규표현식 (더미 데이터 생성 시 패턴 매칭)

# Create your views here.

# ========= 공통 유틸리티 함수 =========

def paginate_queryset(request, queryset, per_page=5):
    """
    쿼리셋을 페이지네이션 처리하는 공통 함수
    
    Args:
        request: HTTP 요청 객체 (GET 파라미터에서 page 번호를 가져옴)
        queryset: 페이지네이션할 쿼리셋
        per_page: 페이지당 항목 수 (기본값: 5)
    
    Returns:
        tuple: (page_obj, total_count)
            - page_obj: 현재 페이지의 객체들 (Paginator.get_page()의 반환값)
            - total_count: 전체 항목 수 (queryset.count()의 반환값)
    
    사용 예시:
        page_obj, total_count = paginate_queryset(request, users)
    """
    # 페이지네이션 객체 생성
    # Paginator(queryset, per_page): 쿼리셋을 페이지당 per_page개씩 나누는 페이지네이터 생성
    paginator = Paginator(queryset, per_page)
    
    # 현재 페이지 번호 가져오기
    # request.GET.get('page', 1): URL 파라미터에서 'page' 값을 가져옴
    #   - 'page': URL 파라미터 이름 (예: ?page=2)
    #   - 1: 기본값 (page 파라미터가 없으면 1페이지)
    page_number = request.GET.get('page', 1)
    
    # 현재 페이지의 객체들 가져오기
    # paginator.get_page(page_number): 페이지 번호에 해당하는 페이지 객체 반환
    #   - page_number가 범위를 벗어나면 자동으로 유효한 페이지로 조정됨
    #   - 예: page_number=999 → 마지막 페이지 반환
    #   - 예: page_number=-1 → 첫 번째 페이지 반환
    page_obj = paginator.get_page(page_number)
    
    # 전체 항목 수 계산
    # queryset.count(): 쿼리셋의 총 개수 반환
    #   - SQL의 COUNT(*) 쿼리와 동일
    #   - 페이지네이션 적용 전의 전체 개수
    total_count = queryset.count()
    
    return page_obj, total_count

def dashboard(request):
    """
    관리자 대시보드 뷰
    - 오늘 가입한 사용자 수, 검증 완료된 의사 수, 총 병원 수 등 통계 정보 제공
    - 최근 7일간 방문자 수 그래프 데이터 생성
    - 웹/모바일 가입자 구분 통계 제공
    """
    # 관리자 권한 체크
    user_role = request.session.get('role', '')
    if user_role != 'ADMIN':
        return redirect('/')
    # 오늘 날짜 및 시간 범위 설정
    today = timezone.now().date()
    today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = timezone.now().replace(hour=23, minute=59, second=59, microsecond=999999)
    week_ago = today - timedelta(days=7)
    
    # 1. 신규 가입자수 (오늘 기준 - 오늘 00:00:00 ~ 23:59:59 사이에 생성된 사용자)
    # 이전 코드 (주석처리):
    # new_users_count = Users.objects.filter(
    #     created_at__date=today,
    #     withdrawal='0'
    # ).count()
    
    # 수정된 코드 (오늘 생성된 사용자만 정확하게 카운트)
    new_users_count = Users.objects.filter(
        created_at__gte=today_start,
        created_at__lte=today_end,
        withdrawal='0'
    ).count()
    
    # 2. 가입된 의사 (검증 완료된 의사)
    verified_doctors_count = Doctors.objects.filter(verified=True).count()
    
    # 3. 총 병원 수
    total_hospitals_count = Hospital.objects.count()
    
    # 4. 총 가입한 의사 수 (검증 여부와 관계없이 전체 의사)
    total_doctors_count = Doctors.objects.count()
    
    # 5. 7일 방문자 수 (최근 7일간 일일 방문자 수 합계) - 그래프용으로만 사용
    weekly_visitors = DailyVisit.objects.filter(
        visit_date__gte=week_ago,  # week_ago 이상 (이후 날짜)
        visit_date__lte=today      # today 이하 (이전 날짜)
    ).aggregate(total=Sum('visit_count'))  # visit_count 필드의 합계 계산
    weekly_visitors_count = weekly_visitors['total'] or 0  # 결과값 추출, 없으면 0
    
    # 6. 미처리 1:1 문의 (답변이 없는 문의)
    # Qna.objects: Qna 모델의 모든 객체에 접근
    # .filter(reply__isnull=True): reply 필드가 None(비어있음)인 문의만 필터링
    #   - reply__isnull=True: reply 필드가 NULL인 경우 (답변이 아직 작성되지 않음)
    #   - reply__isnull=False: reply 필드에 값이 있는 경우 (답변이 작성됨)
    # .count(): 필터링된 결과의 개수를 반환 (정수형)
    # 결과: 답변이 아직 작성되지 않은 문의의 총 개수
    pending_qna_count = Qna.objects.filter(reply__isnull=True).count()
    
    # 7. 의사 승인 대기 (검증되지 않은 의사)
    # Doctors.objects: Doctors 모델의 모든 객체에 접근
    # .filter(verified=False): verified 필드가 False인 의사만 필터링
    #   - verified=False: 검증되지 않은 의사 (승인 대기 중인 의사)
    #   - verified=True: 검증 완료된 의사 (승인된 의사)
    # .count(): 필터링된 결과의 개수를 반환 (정수형)
    # 결과: 아직 승인되지 않은(검증 대기 중인) 의사의 총 개수
    pending_doctors_count = Doctors.objects.filter(verified=False).count()
    
    # 8. 평균 대기 일수 (검증되지 않은 의사들의 평균 대기 일수)
    pending_doctors = Doctors.objects.filter(verified=False)
    if pending_doctors.exists():
        # Doctors 모델에 created_at이 없다면 Users의 created_at 사용
        avg_waiting_days = 1.5  # 임시값, 실제로는 계산 필요
    else:
        avg_waiting_days = 0
    
    # 9. 오늘 가입한 회원 (웹/모바일 구분 - provider로 구분)
    # 웹으로 가입한 사용자 수 (일반 회원가입)
    # Users.objects: Users 모델의 모든 객체에 접근
    # .filter(created_at__date=today): 오늘 날짜에 가입한 사용자만 필터링
    #   - created_at__date=today: created_at 필드의 날짜 부분이 오늘과 일치하는 경우
    # .filter(provider='local'): provider 필드가 'local'인 사용자만 필터링
    #   - provider='local': 일반 회원가입으로 가입한 사용자 (웹 가입)
    # .filter(withdrawal='0'): 탈퇴하지 않은 사용자만 필터링
    #   - withdrawal='0': 탈퇴하지 않은 사용자
    #   - withdrawal='1': 탈퇴한 사용자
    # .count(): 필터링된 결과의 개수를 반환 (정수형)
    # 결과: 오늘 일반 회원가입으로 가입한 사용자의 총 개수
    new_users_web = Users.objects.filter(
        created_at__date=today,  # 오늘 날짜에 가입한 사용자
        provider='local',        # 일반 회원가입 (웹 가입)
        withdrawal='0'           # 탈퇴하지 않은 사용자
    ).count()
    
    # 모바일로 가입한 사용자 수 (소셜 로그인)
    # Users.objects: Users 모델의 모든 객체에 접근
    # .filter(created_at__date=today): 오늘 날짜에 가입한 사용자만 필터링
    #   - created_at__date=today: created_at 필드의 날짜 부분이 오늘과 일치하는 경우
    # .filter(provider__in=['kakao', 'naver']): provider 필드가 'kakao' 또는 'naver'인 사용자만 필터링
    #   - provider__in=['kakao', 'naver']: 카카오 또는 네이버 소셜 로그인으로 가입한 사용자 (모바일 가입)
    #   - provider='local': 일반 회원가입 (웹 가입)
    # .filter(withdrawal='0'): 탈퇴하지 않은 사용자만 필터링
    #   - withdrawal='0': 탈퇴하지 않은 사용자
    #   - withdrawal='1': 탈퇴한 사용자
    # .count(): 필터링된 결과의 개수를 반환 (정수형)
    # 결과: 오늘 소셜 로그인(카카오/네이버)으로 가입한 사용자의 총 개수
    new_users_mobile = Users.objects.filter(
        created_at__date=today,              # 오늘 날짜에 가입한 사용자
        provider__in=['kakao', 'naver'],     # 카카오 또는 네이버 소셜 로그인 (모바일 가입)
        withdrawal='0'                        # 탈퇴하지 않은 사용자
    ).count()
    
    # 10. 7일 이용자 그래프 데이터 (최근 7일간 일일 방문자 수)
    # Chart.js에서 사용할 수 있도록 JSON 형식으로 데이터 준비
    # 그래프에 표시할 데이터를 담을 딕셔너리 초기화
    # - labels: X축에 표시할 날짜 레이블 (예: ['12/01', '12/02', ...])
    # - values: Y축에 표시할 방문자 수 값 (예: [100, 150, ...])
    visitor_chart_data = {
        'labels': [],
        'values': []
    }
    
    # 최근 7일간의 일일 방문자 데이터 수집 (6일 전부터 오늘까지)
    # range(6, -1, -1): 6부터 0까지 역순으로 반복 (6일 전 → 5일 전 → ... → 오늘)
    #   - range(start, stop, step): start부터 stop 전까지 step 간격으로 반복
    #   - range(6, -1, -1) = [6, 5, 4, 3, 2, 1, 0] (총 7일)
    for i in range(6, -1, -1):  # 6일 전부터 오늘까지 (총 7일)
        # 각 날짜 계산: today에서 i일을 뺀 날짜
        #   - i=6: 6일 전 날짜
        #   - i=5: 5일 전 날짜
        #   - ...
        #   - i=0: 오늘 날짜
        # timedelta(days=i): i일을 나타내는 시간 간격 객체
        date = today - timedelta(days=i)
        
        # 날짜를 문자열로 변환 (그래프 X축 레이블용)
        # strftime('%m/%d'): 날짜를 '월/일' 형식으로 변환 (예: '12/01', '12/02')
        date_str = date.strftime('%m/%d')
        
        # 해당 날짜의 방문자 데이터 조회
        try:
            # DailyVisit 모델에서 해당 날짜의 방문자 기록 조회
            # .get(visit_date=date): visit_date 필드가 date와 일치하는 단일 객체 조회
            #   - 객체가 존재하면: daily_visit 객체 반환
            #   - 객체가 없으면: DailyVisit.DoesNotExist 예외 발생
            daily_visit = DailyVisit.objects.get(visit_date=date)
            # 조회된 객체의 visit_count 필드 값 가져오기 (해당 날짜의 방문자 수)
            count = daily_visit.visit_count
        except DailyVisit.DoesNotExist:
            # 해당 날짜의 방문자 데이터가 없는 경우 (데이터베이스에 기록이 없음)
            # 예: 새로 시작한 서비스라서 아직 데이터가 없는 날짜
            # 그래프에서 0으로 표시하기 위해 count를 0으로 설정
            count = 0
        
        # 그래프 데이터에 날짜 레이블 추가 (X축 레이블)
        # labels 배열에 날짜 문자열 추가 (예: ['12/01', '12/02', ...])
        visitor_chart_data['labels'].append(date_str)
        
        # 그래프 데이터에 방문자 수 값 추가 (Y축 데이터)
        # values 배열에 방문자 수 추가 (예: [100, 150, ...])
        #   - 데이터가 있으면: 실제 방문자 수
        #   - 데이터가 없으면: 0
        visitor_chart_data['values'].append(count)
    
    # 템플릿에 전달할 컨텍스트 데이터 (딕셔너리)
    # context: Django 템플릿에서 사용할 변수들을 담은 딕셔너리
    # 템플릿에서 {{ 변수명 }} 형식으로 접근 가능
    context = {
        # 1. 신규 가입자수 (오늘 가입한 사용자 수)
        # 템플릿에서 {{ new_users_count }}로 접근
        'new_users_count': new_users_count,
        
        # 2. 가입된 의사 수 (검증 완료된 의사 수)
        # 템플릿에서 {{ verified_doctors_count }}로 접근
        'verified_doctors_count': verified_doctors_count,
        
        # 3. 총 병원 수 (등록된 모든 병원 수)
        # 템플릿에서 {{ total_hospitals_count }}로 접근
        'total_hospitals_count': total_hospitals_count,
        
        # 4. 총 가입한 의사 수 (검증 여부와 관계없이 전체 의사 수)
        # 템플릿에서 {{ total_doctors_count }}로 접근
        'total_doctors_count': total_doctors_count,
        
        # 5. 7일 방문자 수 (최근 7일간 일일 방문자 수 합계)
        # 템플릿에서 {{ weekly_visitors_count }}로 접근
        'weekly_visitors_count': weekly_visitors_count,
        
        # 6. 미처리 1:1 문의 수 (답변이 아직 작성되지 않은 문의 수)
        # 템플릿에서 {{ pending_qna_count }}로 접근
        'pending_qna_count': pending_qna_count,
        
        # 7. 의사 승인 대기 수 (검증되지 않은 의사 수)
        # 템플릿에서 {{ pending_doctors_count }}로 접근
        'pending_doctors_count': pending_doctors_count,
        
        # 8. 평균 대기 일수 (검증되지 않은 의사들의 평균 대기 일수)
        # 템플릿에서 {{ avg_waiting_days }}로 접근
        'avg_waiting_days': avg_waiting_days,
        
        # 9. 오늘 가입한 회원 수 - 웹 (일반 회원가입으로 가입한 사용자 수)
        # 템플릿에서 {{ new_users_web }}로 접근
        'new_users_web': new_users_web,
        
        # 10. 오늘 가입한 회원 수 - 모바일 (소셜 로그인으로 가입한 사용자 수)
        # 템플릿에서 {{ new_users_mobile }}로 접근
        'new_users_mobile': new_users_mobile,
        
        # 11. 방문자 차트 데이터 (최근 7일간 일일 방문자 수 그래프용)
        # json.dumps(): Python 딕셔너리를 JSON 문자열로 변환
        #   - 이유: JavaScript에서 JSON.parse()로 파싱하기 위해 문자열 형태로 전달
        #   - visitor_chart_data는 Python 딕셔너리: {'labels': [...], 'values': [...]}
        #   - json.dumps() 후: '{"labels": [...], "values": [...]}' (JSON 문자열)
        # 템플릿에서 {{ visitor_chart_data|safe }}로 접근 (|safe: HTML 이스케이프 방지)
        'visitor_chart_data': json.dumps(visitor_chart_data),  # JSON 문자열로 변환하여 전달
    }
    
    # 템플릿 렌더링 및 HTTP 응답 반환
    # render(): Django의 템플릿 렌더링 함수
    #   - request: HTTP 요청 객체 (사용자 정보, 세션 등 포함)
    #   - 'admin_panel/dashboard.html': 렌더링할 템플릿 파일 경로
    #     (Django는 자동으로 templates/ 폴더를 찾음)
    #   - context: 템플릿에 전달할 변수들 (위에서 정의한 딕셔너리)
    # 반환값: HttpResponse 객체 (HTML 응답)
    #   - 템플릿이 context의 변수들을 사용하여 HTML을 생성하고, 이를 HTTP 응답으로 반환
    return render(request, 'admin_panel/dashboard.html', context)


def user_list(request):
    """
    사용자 목록 페이지 뷰
    - 일반 사용자(role='USER') 목록 조회
    - 검색 기능 (사용자명, 이름, 이메일, 전화번호)
    - 정렬 기능 (다양한 필드 기준)
    - 페이지네이션 (페이지당 5개)
    - AJAX 요청 시 상세 정보만 반환
    """
    # ========= 검색 조건 및 키워드 =========
    # URL 쿼리 파라미터에서 검색 관련 정보 추출
    # 예: /admin_panel/users/?search_type=username&search_keyword=홍길동
    
    # 검색 타입 (어떤 필드로 검색할지)
    # request.GET: URL 쿼리 파라미터를 담은 딕셔너리 (예: ?search_type=username)
    # .get('search_type', ''): 'search_type' 파라미터 값을 가져오고, 없으면 빈 문자열('') 반환
    # 가능한 값: 'username' (사용자명), 'name' (이름), 'email' (이메일), 'phone' (전화번호)
    # 예: search_type = 'username' → 사용자명으로 검색
    search_type = request.GET.get('search_type', '')
    
    # 검색 키워드 (실제 검색어)
    # request.GET.get('search_keyword', ''): 'search_keyword' 파라미터 값을 가져오고, 없으면 빈 문자열('') 반환
    # 사용자가 검색창에 입력한 텍스트
    # 예: search_keyword = '홍길동' → '홍길동'을 포함하는 사용자 검색
    search_keyword = request.GET.get('search_keyword', '')
    
    # 선택된 사용자 ID (상세 정보 표시용)
    # request.GET.get('user_id', ''): 'user_id' 파라미터 값을 가져오고, 없으면 빈 문자열('') 반환
    # 사용자가 목록에서 특정 사용자 행을 클릭했을 때 전달되는 사용자 ID
    # 예: /admin_panel/users/?user_id=123 → ID가 123인 사용자의 상세 정보 표시
    selected_user_id = request.GET.get('user_id', '')
    
    # ========= 정렬 파라미터 =========
    # URL 쿼리 파라미터에서 정렬 관련 정보 추출
    # 예: /admin_panel/users/?sort=created_at&order=desc
    
    # 정렬 필드 (어떤 필드로 정렬할지)
    # request.GET.get('sort', ''): 'sort' 파라미터 값을 가져오고, 없으면 빈 문자열('') 반환
    # 가능한 값: 'user_id', 'username', 'name', 'email', 'phone', 'gender', 'resident_reg_no', 'address', 'created_at'
    # 예: sort_field = 'created_at' → 가입일 기준으로 정렬
    sort_field = request.GET.get('sort', '')
    
    # 정렬 순서 (오름차순/내림차순)
    # request.GET.get('order', 'desc'): 'order' 파라미터 값을 가져오고, 없으면 'desc' 반환 (기본값: 내림차순)
    # 가능한 값: 'asc' (오름차순), 'desc' (내림차순)
    # 예: sort_order = 'desc' → 내림차순 정렬 (최신순, 큰 값부터)
    # 예: sort_order = 'asc' → 오름차순 정렬 (오래된 순, 작은 값부터)
    sort_order = request.GET.get('order', 'desc')
    
    # 정렬 필드 매핑 (URL 파라미터와 실제 모델 필드 매핑)
    sort_fields = {
        'user_id': 'user_id',  # No. 정렬용
        'username': 'username',
        'name': 'name',
        'email': 'email',
        'phone': 'phone',
        'gender': 'gender',
        'resident_reg_no': 'resident_reg_no',  # 주민번호 정렬용
        'address': 'address',
        'created_at': 'created_at',
    }
    
    # 기본 쿼리셋 (일반 사용자만 조회, 의사 제외)
    users = Users.objects.filter(role='USER')
    
    # ========= 정렬 적용 =========
    # 사용자가 정렬을 선택했는지 확인하고, 선택한 경우 해당 필드로 정렬
    # sort_field가 있고, sort_fields 딕셔너리에 해당 키가 존재하는 경우에만 정렬 적용
    
    if sort_field and sort_field in sort_fields:
        # 정렬 순서에 따른 접두사 결정
        # Django ORM에서 정렬 순서 지정 방법:
        #   - 내림차순(desc): 필드명 앞에 '-' 붙임 (예: '-created_at')
        #   - 오름차순(asc): 필드명 그대로 사용 (예: 'created_at')
        # order_prefix: 정렬 순서에 따라 '-' 또는 빈 문자열('')을 저장
        #   - sort_order == 'desc' → order_prefix = '-' (내림차순)
        #   - sort_order == 'asc' → order_prefix = '' (오름차순)
        order_prefix = '-' if sort_order == 'desc' else ''
        
        # 실제 정렬 적용
        # f'{order_prefix}{sort_fields[sort_field]}': 문자열 포맷팅으로 정렬 필드명 생성
        #   - 예: sort_field='created_at', sort_order='desc' → '-created_at'
        #   - 예: sort_field='name', sort_order='asc' → 'name'
        # sort_fields[sort_field]: URL 파라미터를 실제 모델 필드명으로 변환
        #   - 예: sort_field='username' → sort_fields['username'] = 'username'
        # users.order_by(): 쿼리셋을 지정한 필드로 정렬
        #   - 반환값: 정렬된 쿼리셋 (아직 데이터베이스 쿼리는 실행되지 않음)
        users = users.order_by(f'{order_prefix}{sort_fields[sort_field]}')
    else:
        # 사용자가 정렬을 선택하지 않은 경우 기본 정렬 적용
        # 기본 정렬: 최신순 (가입일 기준 내림차순)
        # '-created_at': created_at 필드를 내림차순으로 정렬 (최신 가입자가 먼저)
        #   - 내림차순: 큰 값부터 작은 값 순서 (최신 → 오래된 순)
        users = users.order_by('-created_at')
    
    # ========= 검색 필터 적용 =========
    # 사용자가 검색 조건과 검색어를 입력한 경우에만 필터 적용
    # search_type과 search_keyword가 모두 존재할 때만 검색 수행
    
    if search_type and search_keyword:
        # 검색어 앞뒤 공백 제거
        # .strip(): 문자열의 앞뒤 공백(스페이스, 탭, 줄바꿈 등)을 제거
        # 예: '  홍길동  ' → '홍길동'
        # 이유: 사용자가 실수로 공백을 입력했을 때 검색 오류 방지
        search_keyword = search_keyword.strip()
        
        # 공백 제거 후에도 검색어가 비어있지 않은 경우에만 필터 적용
        # 빈 문자열('')이면 검색하지 않음 (모든 사용자 표시)
        if search_keyword:
            # 검색 타입에 따라 다른 필드로 검색
            # Django ORM의 __icontains: 대소문자 구분 없이 부분 일치 검색
            #   - 'icontains': case-insensitive contains (대소문자 구분 없이 포함 여부 확인)
            #   - 예: '홍길동' 검색 시 '홍길동', '홍길동님', '김홍길동' 모두 매칭
            
            if search_type == 'username':
                # 사용자명으로 검색
                # username__icontains: username 필드에서 검색어를 포함하는 사용자 검색
                # 예: search_keyword='홍' → username에 '홍'이 포함된 모든 사용자
                users = users.filter(username__icontains=search_keyword)
            elif search_type == 'name':
                # 이름으로 검색
                # name__icontains: name 필드에서 검색어를 포함하는 사용자 검색
                # 예: search_keyword='길동' → name에 '길동'이 포함된 모든 사용자
                users = users.filter(name__icontains=search_keyword)
            elif search_type == 'email':
                # 이메일로 검색
                # email__icontains: email 필드에서 검색어를 포함하는 사용자 검색
                # 예: search_keyword='gmail' → email에 'gmail'이 포함된 모든 사용자
                users = users.filter(email__icontains=search_keyword)
            elif search_type == 'phone':
                # 전화번호로 검색
                # phone__icontains: phone 필드에서 검색어를 포함하는 사용자 검색
                # 예: search_keyword='010' → phone에 '010'이 포함된 모든 사용자
                users = users.filter(phone__icontains=search_keyword)
    
    # ========= 페이지네이션 (페이지당 5개) =========
    # 공통 유틸리티 함수를 사용하여 페이지네이션 처리
    # paginate_queryset(): 쿼리셋을 페이지네이션하고 페이지 객체와 전체 개수를 반환
    page_obj, total_count = paginate_queryset(request, users, per_page=5)
    
    # 각 항목의 번호 계산 (정렬 방향에 따라)
    users_with_number = []
    # start_index 계산: (현재 페이지 - 1) * 페이지당 항목 수 + 1
    # page_obj.paginator.per_page: 페이지당 항목 수 (공통 함수에서 생성된 paginator 객체 접근)
    start_index = (page_obj.number - 1) * page_obj.paginator.per_page + 1
    for idx, user in enumerate(page_obj):
        if sort_field == 'user_id' and sort_order == 'desc':
            # 내림차순: 전체 개수에서 역순으로 계산
            number = total_count - (start_index - 1 + idx) + 1
        else:
            # 오름차순 또는 기본: 페이지네이션 기준
            number = start_index + idx
        
        # ========= 주민번호를 생년월일로 변환 (표시용) =========
        # 주민번호 형식: YYMMDD-GXXXXXX (예: 901225-1234567)
        #   - YY: 출생년도 뒷자리 2자리 (예: 90)
        #   - MM: 출생월 2자리 (예: 12)
        #   - DD: 출생일 2자리 (예: 25)
        #   - G: 성별 및 출생세기 구분 (1,2: 1900년대, 3,4: 2000년대)
        #   - X: 나머지 번호
        
        # 생년월일 변환 결과를 저장할 변수 초기화
        # 변환이 실패하거나 주민번호가 없으면 None으로 유지
        birth_date = None
        
        # 주민번호가 존재하고 길이가 7자리 이상인지 확인
        # len(user.resident_reg_no) >= 7: 최소한 YYMMDDG 형식이어야 함 (7자리)
        #   - 하이픈 포함: '901225-1' (8자리) 또는 '901225-1234567' (14자리)
        #   - 하이픈 없음: '9012251' (7자리) 또는 '9012251234567' (13자리)
        if user.resident_reg_no and len(user.resident_reg_no) >= 7:
            # 주민번호를 변수에 저장 (문자열 슬라이싱을 위해)
            reg_no = user.resident_reg_no
            
            # 주민번호에서 각 부분 추출
            # 주민번호 형식: YYMMDD-GXXXXXX 또는 YYMMDDGXXXXXX
            #   - 인덱스 0-1: YY (출생년도 뒷자리 2자리)
            #   - 인덱스 2-3: MM (출생월 2자리)
            #   - 인덱스 4-5: DD (출생일 2자리)
            #   - 인덱스 6: G (성별 및 출생세기 구분)
            
            # 성별 및 출생세기 구분자 추출 (7번째 문자, 인덱스 6)
            # year_prefix: 성별과 출생세기를 구분하는 숫자
            #   - '1': 1900년대 남자
            #   - '2': 1900년대 여자
            #   - '3': 2000년대 남자
            #   - '4': 2000년대 여자
            year_prefix = reg_no[6:7]  # 문자열 슬라이싱: 인덱스 6부터 7 전까지 (1자리)
            
            # 출생년도 뒷자리 2자리 추출 (인덱스 0-1)
            yy = reg_no[0:2]  # 문자열 슬라이싱: 인덱스 0부터 2 전까지 (2자리)
            
            # 출생월 2자리 추출 (인덱스 2-3)
            mm = reg_no[2:4]  # 문자열 슬라이싱: 인덱스 2부터 4 전까지 (2자리)
            
            # 출생일 2자리 추출 (인덱스 4-5)
            dd = reg_no[4:6]  # 문자열 슬라이싱: 인덱스 4부터 6 전까지 (2자리)
            
            # 월과 일 유효성 검증 (월: 01-12, 일: 01-31)
            # 문자열을 정수로 변환하여 유효한 날짜인지 확인
            try:
                # 월을 정수로 변환 (예: '12' → 12)
                month_int = int(mm)
                # 일을 정수로 변환 (예: '25' → 25)
                day_int = int(dd)
                
                # 월과 일이 유효한 범위인지 확인
                # 1 <= month_int <= 12: 월은 1월부터 12월까지
                # 1 <= day_int <= 31: 일은 1일부터 31일까지 (실제로는 월별로 다르지만 간단히 31일까지 확인)
                if 1 <= month_int <= 12 and 1 <= day_int <= 31:
                    # 출생세기 결정 (year_prefix를 기준으로)
                    # 성별 구분: 남자(1,3), 여자(2,4)
                    # 출생세기 구분: 1,2는 1900년대, 3,4는 2000년대
                    if year_prefix in ['1', '2']:
                        # 1900년대 출생
                        # 예: yy='90', year_prefix='1' → yyyy='1990'
                        yyyy = '19' + yy
                    elif year_prefix in ['3', '4']:
                        # 2000년대 출생
                        # 예: yy='05', year_prefix='3' → yyyy='2005'
                        yyyy = '20' + yy
                    else:
                        # 예상치 못한 값인 경우 (5, 6, 7, 8, 9, 0 등)
                        # 원본 yy 값 그대로 사용 (예: '90' → '90')
                        yyyy = yy
                    
                    # 생년월일 문자열 생성 (YYYY.MM.DD 형식)
                    # f'{yyyy}.{mm}.{dd}': 문자열 포맷팅으로 생년월일 생성
                    # 예: yyyy='1990', mm='12', dd='25' → '1990.12.25'
                    birth_date = f'{yyyy}.{mm}.{dd}'
            except ValueError:
                # 월 또는 일을 정수로 변환할 수 없는 경우 (예: 'ab', 'xx' 등)
                # ValueError 예외 발생 시 무시하고 birth_date는 None으로 유지
                # 예: mm='ab' 또는 dd='xx'인 경우 변환 실패
                pass
        
        # 사용자 정보를 딕셔너리로 구성하여 리스트에 추가
        # users_with_number: 번호와 생년월일이 포함된 사용자 정보 리스트
        users_with_number.append({
            'user': user,              # 사용자 객체
            'number': number,           # 목록에서의 번호 (페이지네이션 기준)
            'birth_date': birth_date    # 생년월일 (변환 성공 시 'YYYY.MM.DD', 실패 시 None)
        })
    
    # 선택된 사용자 정보 (상세 정보 표시용)
    selected_user = None
    favorite_hospitals = []
    birth_date = None
    if selected_user_id:
        try:
            selected_user = Users.objects.get(user_id=selected_user_id, withdrawal='0', role='USER')
            # 즐겨찾기 병원 조회
            favorites = UserFavorite.objects.filter(user=selected_user)
            favorite_hospitals = [fav.hos.name for fav in favorites if hasattr(fav, 'hos')]
            
            # 주민번호를 생년월일로 변환
            if selected_user.resident_reg_no and len(selected_user.resident_reg_no) >= 7:
                reg_no = selected_user.resident_reg_no
                year_prefix = reg_no[6:7]
                yy = reg_no[0:2]
                mm = reg_no[2:4]
                dd = reg_no[4:6]
                
                # 월과 일 유효성 검증 (월: 01-12, 일: 01-31)
                try:
                    month_int = int(mm)
                    day_int = int(dd)
                    
                    if 1 <= month_int <= 12 and 1 <= day_int <= 31:
                        # 성별 구분: 남자(1,3), 여자(2,4)
                        # 1,2: 1900년대, 3,4: 2000년대
                        if year_prefix in ['1', '2']:
                            yyyy = '19' + yy
                        elif year_prefix in ['3', '4']:
                            yyyy = '20' + yy
                        else:
                            yyyy = yy
                        
                        birth_date = f'{yyyy}.{mm}.{dd}'
                except ValueError:
                    pass
        except Users.DoesNotExist:
            pass
    
    # ========= 디버깅용: 전체 사용자 수와 검색 결과 수 (일반 사용자만) =========
    # 개발 및 디버깅 목적으로 전체 사용자 수와 검색 결과 수를 계산
    # 템플릿에서 검색 전후 사용자 수를 비교하여 검색 기능이 올바르게 동작하는지 확인 가능
    
    # 전체 사용자 수 (일반 사용자만, 검색/정렬 필터 적용 전)
    # Users.objects.filter(role='USER'): role이 'USER'인 사용자만 필터링 (의사 제외)
    # .count(): 필터링된 결과의 개수를 반환 (정수형)
    # 결과: 데이터베이스에 등록된 모든 일반 사용자의 총 개수
    total_users_count = Users.objects.filter(role='USER').count()
    
    # 검색 결과 수 (검색/정렬 필터 적용 후)
    # users: 위에서 검색 및 정렬 필터가 적용된 쿼리셋
    # .count(): 필터링된 결과의 개수를 반환 (정수형)
    # 결과: 검색 조건과 정렬 조건을 적용한 후의 사용자 수
    #   - 검색을 하지 않았으면: total_users_count와 동일
    #   - 검색을 했으면: 검색 조건에 맞는 사용자 수
    search_result_count = users.count()
    
    # ========= 템플릿에 전달할 컨텍스트 데이터 (딕셔너리) =========
    # context: Django 템플릿에서 사용할 변수들을 담은 딕셔너리
    # 템플릿에서 {{ 변수명 }} 형식으로 접근 가능
    context = {
        # 페이지네이션 객체 (현재 페이지의 사용자 목록 및 페이지네이션 정보 포함)
        # 템플릿에서 {{ page_obj }}로 접근
        # page_obj.number: 현재 페이지 번호
        # page_obj.has_previous: 이전 페이지 존재 여부
        # page_obj.has_next: 다음 페이지 존재 여부
        # page_obj.paginator.num_pages: 전체 페이지 수
        'page_obj': page_obj,
        
        # 사용자 목록 (page_obj와 동일, 템플릿 호환성을 위해 중복 제공)
        # 템플릿에서 {{ users }}로 접근
        'users': page_obj,
        
        # 번호가 포함된 사용자 리스트 (각 사용자에 번호와 생년월일 정보 포함)
        # 템플릿에서 {{ users_with_number }}로 접근
        # 각 항목: {'user': User객체, 'number': 번호, 'birth_date': 'YYYY.MM.DD' 또는 None}
        'users_with_number': users_with_number,
        
        # 검색 타입 (어떤 필드로 검색했는지)
        # 템플릿에서 {{ search_type }}로 접근
        # 가능한 값: 'username', 'name', 'email', 'phone', '' (검색 안 함)
        'search_type': search_type,
        
        # 검색 키워드 (실제 검색어)
        # 템플릿에서 {{ search_keyword }}로 접근
        # 사용자가 검색창에 입력한 텍스트
        'search_keyword': search_keyword,
        
        # 선택된 사용자 객체 (상세 정보 표시용)
        # 템플릿에서 {{ selected_user }}로 접근
        # 사용자가 목록에서 특정 사용자 행을 클릭했을 때 해당 사용자 객체
        # 선택되지 않았으면 None
        'selected_user': selected_user,
        
        # 선택된 사용자의 즐겨찾기 병원 리스트
        # 템플릿에서 {{ favorite_hospitals }}로 접근
        # 선택된 사용자가 즐겨찾기로 등록한 병원 이름들의 리스트
        # 선택되지 않았거나 즐겨찾기가 없으면 빈 리스트 []
        'favorite_hospitals': favorite_hospitals,
        
        # 선택된 사용자의 생년월일 (주민번호에서 변환)
        # 템플릿에서 {{ birth_date }}로 접근
        # 'YYYY.MM.DD' 형식의 문자열 또는 None
        'birth_date': birth_date,
        
        # 전체 사용자 수 (일반 사용자만, 검색 필터 적용 전)
        # 템플릿에서 {{ total_users_count }}로 접근
        # 디버깅 및 통계 표시용
        'total_users_count': total_users_count,
        
        # 검색 결과 수 (검색/정렬 필터 적용 후)
        # 템플릿에서 {{ search_result_count }}로 접근
        # 디버깅 및 통계 표시용
        'search_result_count': search_result_count,
        
        # 정렬 필드 (어떤 필드로 정렬했는지)
        # 템플릿에서 {{ sort_field }}로 접근
        # 가능한 값: 'user_id', 'username', 'name', 'email', 'phone', 'gender', 'resident_reg_no', 'address', 'created_at', '' (정렬 안 함)
        'sort_field': sort_field,
        
        # 정렬 순서 (오름차순/내림차순)
        # 템플릿에서 {{ sort_order }}로 접근
        # 가능한 값: 'asc' (오름차순), 'desc' (내림차순)
        'sort_order': sort_order,
    }

    # 디버깅용: context 딕셔너리 내용을 콘솔에 출력
    # 개발 중에 context에 어떤 데이터가 전달되는지 확인하기 위한 용도
    # 프로덕션 환경에서는 제거하거나 로깅으로 대체 권장
    print(context)
    
    # AJAX 요청인 경우 처리
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        # user_id 파라미터가 있으면 행 클릭으로 간주하여 상세 정보만 반환
        # page 파라미터가 있어도 user_id가 있으면 행 클릭이므로 상세 정보만 반환
        if selected_user_id:
            detail_html = render_to_string('admin_panel/user_list_detail.html', context, request=request)
            return JsonResponse({'detail_html': detail_html})
        # user_id가 없으면 페이지네이션이므로 전체 HTML 반환
        # 이 경우는 일반 페이지 렌더링으로 처리
    
    return render(request, 'admin_panel/user_list.html', context)


def doctor_list(request):
    """
    의사 목록 페이지 뷰
    - 모든 의사 목록 조회
    - 검색 기능 (이름, 의사ID, 면허번호, 진료과, 병원명)
    - 정렬 기능 (다양한 필드 기준)
    - 페이지네이션 (페이지당 5개)
    - AJAX 요청 시 상세 정보만 반환
    """
    # ========= 검색 조건 및 키워드 =========
    # URL 쿼리 파라미터에서 검색 관련 정보 추출
    # 예: /admin_panel/doctors/?search_type=name&search_keyword=홍길동
    
    # 검색 타입 (어떤 필드로 검색할지)
    # request.GET: URL 쿼리 파라미터를 담은 딕셔너리 (예: ?search_type=name)
    # .get('search_type', ''): 'search_type' 파라미터 값을 가져오고, 없으면 빈 문자열('') 반환
    # 가능한 값: 'name' (이름), 'doctor_id' (의사ID), 'license_no' (면허번호), 'department' (진료과), 'hospital' (병원명)
    # 예: search_type = 'name' → 이름으로 검색
    search_type = request.GET.get('search_type', '')
    
    # 검색 키워드 (실제 검색어)
    # request.GET.get('search_keyword', ''): 'search_keyword' 파라미터 값을 가져오고, 없으면 빈 문자열('') 반환
    # 사용자가 검색창에 입력한 텍스트
    # 예: search_keyword = '홍길동' → '홍길동'을 포함하는 의사 검색
    search_keyword = request.GET.get('search_keyword', '')
    
    # 선택된 의사 ID (상세 정보 표시용)
    # request.GET.get('doctor_id', ''): 'doctor_id' 파라미터 값을 가져오고, 없으면 빈 문자열('') 반환
    # 사용자가 목록에서 특정 의사 행을 클릭했을 때 전달되는 의사 ID
    # 예: /admin_panel/doctors/?doctor_id=123 → ID가 123인 의사의 상세 정보 표시
    selected_doctor_id = request.GET.get('doctor_id', '')
    
    # ========= 정렬 파라미터 =========
    # URL 쿼리 파라미터에서 정렬 관련 정보 추출
    # 예: /admin_panel/doctors/?sort=created_at&order=desc
    
    # 정렬 필드 (어떤 필드로 정렬할지)
    # request.GET.get('sort', ''): 'sort' 파라미터 값을 가져오고, 없으면 빈 문자열('') 반환
    # 가능한 값: 'doctor_id', 'name', 'username', 'license_no', 'department', 'hospital', 'email', 'verified', 'created_at'
    # 예: sort_field = 'created_at' → 가입일 기준으로 정렬
    sort_field = request.GET.get('sort', '')
    
    # 정렬 순서 (오름차순/내림차순)
    # request.GET.get('order', 'desc'): 'order' 파라미터 값을 가져오고, 없으면 'desc' 반환 (기본값: 내림차순)
    # 가능한 값: 'asc' (오름차순), 'desc' (내림차순)
    # 예: sort_order = 'desc' → 내림차순 정렬 (최신순, 큰 값부터)
    # 예: sort_order = 'asc' → 오름차순 정렬 (오래된 순, 작은 값부터)
    sort_order = request.GET.get('order', 'desc')
    
    # ========= 정렬 필드 매핑 (URL 파라미터와 실제 모델 필드 매핑) =========
    # URL에서 사용하는 정렬 필드명을 Django ORM에서 사용하는 실제 필드명으로 변환
    # Django ORM의 ForeignKey 관계 필드 접근: '관련모델__필드명' 형식 사용
    sort_fields = {
        # 의사 ID 정렬 (No. 컬럼 정렬용)
        'doctor_id': 'doctor_id',  # No. 정렬용
        
        # 이름 정렬 (Users 모델의 name 필드)
        # 'user__name': Doctors 모델의 user ForeignKey를 통해 Users 모델의 name 필드에 접근
        'name': 'user__name',
        
        # 사용자명 정렬 (Users 모델의 username 필드)
        # 'user__username': Doctors 모델의 user ForeignKey를 통해 Users 모델의 username 필드에 접근
        'username': 'user__username',
        
        # 면허번호 정렬 (Doctors 모델의 직접 필드)
        'license_no': 'license_no',
        
        # 진료과 정렬 (Department 모델의 dep_name 필드)
        # 'dep__dep_name': Doctors 모델의 dep ForeignKey를 통해 Department 모델의 dep_name 필드에 접근
        'department': 'dep__dep_name',
        
        # 병원명 정렬 (Hospital 모델의 name 필드)
        # 'hos__name': Doctors 모델의 hos ForeignKey를 통해 Hospital 모델의 name 필드에 접근
        'hospital': 'hos__name',
        
        # 이메일 정렬 (Users 모델의 email 필드)
        # 'user__email': Doctors 모델의 user ForeignKey를 통해 Users 모델의 email 필드에 접근
        'email': 'user__email',
        
        # 검증 상태 정렬 (Doctors 모델의 직접 필드)
        # verified: True(검증 완료), False(검증 대기)
        'verified': 'verified',
        
        # 가입일 정렬 (Users 모델의 created_at 필드)
        # 'user__created_at': Doctors 모델의 user ForeignKey를 통해 Users 모델의 created_at 필드에 접근
        'created_at': 'user__created_at',
    }
    
    # ========= 기본 쿼리셋 (모든 의사, 관련 객체 미리 로드) =========
    # Doctors.objects: Doctors 모델의 모든 객체에 접근
    # .select_related('user', 'hos', 'dep'): 관련 객체를 미리 로드하여 N+1 쿼리 문제 방지
    #   - 'user': Doctors 모델의 user ForeignKey (Users 모델과 연결)
    #   - 'hos': Doctors 모델의 hos ForeignKey (Hospital 모델과 연결)
    #   - 'dep': Doctors 모델의 dep ForeignKey (Department 모델과 연결)
    #   - select_related(): JOIN 쿼리를 사용하여 한 번의 쿼리로 관련 객체까지 함께 가져옴
    #     → 성능 최적화: 각 의사마다 user, hos, dep를 조회하는 쿼리를 방지
    # .all(): 모든 의사 객체 반환 (필터링 없음)
    # 반환값: 모든 의사가 포함된 쿼리셋 (아직 데이터베이스 쿼리는 실행되지 않음)
    doctors = Doctors.objects.select_related('user', 'hos', 'dep').all()
    
    # ========= 정렬 적용 =========
    # 사용자가 정렬을 선택했는지 확인하고, 선택한 경우 해당 필드로 정렬
    # sort_field가 있고, sort_fields 딕셔너리에 해당 키가 존재하는 경우에만 정렬 적용
    
    if sort_field and sort_field in sort_fields:
        # 사용자가 정렬을 선택한 경우
        # 정렬 순서에 따른 접두사 결정
        # Django ORM에서 정렬 순서 지정 방법:
        #   - 내림차순(desc): 필드명 앞에 '-' 붙임 (예: '-user__created_at')
        #   - 오름차순(asc): 필드명 그대로 사용 (예: 'user__created_at')
        # order_prefix: 정렬 순서에 따라 '-' 또는 빈 문자열('')을 저장
        #   - sort_order == 'desc' → order_prefix = '-' (내림차순)
        #   - sort_order == 'asc' → order_prefix = '' (오름차순)
        order_prefix = '-' if sort_order == 'desc' else ''
        
        # 실제 정렬 적용
        # f'{order_prefix}{sort_fields[sort_field]}': 문자열 포맷팅으로 정렬 필드명 생성
        #   - 예: sort_field='created_at', sort_order='desc' → '-user__created_at'
        #   - 예: sort_field='name', sort_order='asc' → 'user__name'
        # sort_fields[sort_field]: URL 파라미터를 실제 모델 필드명으로 변환
        #   - 예: sort_field='name' → sort_fields['name'] = 'user__name'
        # doctors.order_by(): 쿼리셋을 지정한 필드로 정렬
        #   - 반환값: 정렬된 쿼리셋 (아직 데이터베이스 쿼리는 실행되지 않음)
        doctors = doctors.order_by(f'{order_prefix}{sort_fields[sort_field]}')
    else:
        # 사용자가 정렬을 선택하지 않은 경우 기본 정렬 적용
        # 기본 정렬: 승인 대기(verified=False)인 의사들이 먼저, 그 다음 최신순
        # .order_by('verified', '-user__created_at'): 두 개의 필드로 정렬
        #   - 첫 번째 정렬: 'verified' (오름차순)
        #     → False(검증 대기)가 True(검증 완료)보다 먼저 (False < True)
        #     → 검증 대기 의사가 검증 완료 의사보다 먼저 표시
        #   - 두 번째 정렬: '-user__created_at' (내림차순)
        #     → 같은 verified 값 내에서 가입일 기준 최신순 정렬
        #     → 최신 가입자가 먼저 표시
        doctors = doctors.order_by('verified', '-user__created_at')
    
    # ========= 검색 필터 적용 =========
    # 사용자가 검색 조건과 검색어를 입력한 경우에만 필터 적용
    # search_type과 search_keyword가 모두 존재할 때만 검색 수행
    
    if search_type and search_keyword:
        # 검색어 앞뒤 공백 제거
        # .strip(): 문자열의 앞뒤 공백(스페이스, 탭, 줄바꿈 등)을 제거
        # 예: '  홍길동  ' → '홍길동'
        # 이유: 사용자가 실수로 공백을 입력했을 때 검색 오류 방지
        search_keyword = search_keyword.strip()
        
        # 공백 제거 후에도 검색어가 비어있지 않은 경우에만 필터 적용
        # 빈 문자열('')이면 검색하지 않음 (모든 의사 표시)
        if search_keyword:
            # 검색 타입에 따라 다른 필드로 검색
            # Django ORM의 __icontains: 대소문자 구분 없이 부분 일치 검색
            #   - 'icontains': case-insensitive contains (대소문자 구분 없이 포함 여부 확인)
            #   - 예: '홍길동' 검색 시 '홍길동', '홍길동님', '김홍길동' 모두 매칭
            
            if search_type == 'name':
                # 이름으로 검색
                # user__name__icontains: Users 모델의 name 필드에서 검색어를 포함하는 의사 검색
                #   - user__name: Doctors 모델의 user ForeignKey를 통해 Users 모델의 name 필드에 접근
                # 예: search_keyword='의사' → name에 '의사'가 포함된 모든 의사
                doctors = doctors.filter(user__name__icontains=search_keyword)
            elif search_type == 'doctor_id':
                # 의사ID로 검색
                # user__username__icontains: Users 모델의 username 필드에서 검색어를 포함하는 의사 검색
                #   - user__username: Doctors 모델의 user ForeignKey를 통해 Users 모델의 username 필드에 접근
                # 의사ID는 user_id나 다른 필드일 수 있음, 일단 user.username으로 검색
                # 예: search_keyword='doctor' → username에 'doctor'가 포함된 모든 의사
                doctors = doctors.filter(user__username__icontains=search_keyword)
            elif search_type == 'license_no':
                # 면허번호로 검색
                # license_no__icontains: Doctors 모델의 license_no 필드에서 검색어를 포함하는 의사 검색
                #   - license_no: Doctors 모델의 직접 필드 (ForeignKey 아님)
                # 예: search_keyword='IM' → license_no에 'IM'이 포함된 모든 의사
                doctors = doctors.filter(license_no__icontains=search_keyword)
            elif search_type == 'department':
                # 진료과로 검색
                # dep__dep_name__icontains: Department 모델의 dep_name 필드에서 검색어를 포함하는 의사 검색
                #   - dep__dep_name: Doctors 모델의 dep ForeignKey를 통해 Department 모델의 dep_name 필드에 접근
                # 예: search_keyword='내과' → dep_name에 '내과'가 포함된 모든 의사
                doctors = doctors.filter(dep__dep_name__icontains=search_keyword)
            elif search_type == 'hospital':
                # 병원명으로 검색
                # hos__name__icontains: Hospital 모델의 name 필드에서 검색어를 포함하는 의사 검색
                #   - hos__name: Doctors 모델의 hos ForeignKey를 통해 Hospital 모델의 name 필드에 접근
                # 예: search_keyword='서울' → name에 '서울'이 포함된 병원에 소속된 모든 의사
                doctors = doctors.filter(hos__name__icontains=search_keyword)
    
    # ========= 페이지네이션 (페이지당 5개) =========
    # 공통 유틸리티 함수를 사용하여 페이지네이션 처리
    # paginate_queryset(): 쿼리셋을 페이지네이션하고 페이지 객체와 전체 개수를 반환
    page_obj, total_count = paginate_queryset(request, doctors, per_page=5)
    
    # 각 항목의 번호 계산 (정렬 방향에 따라)
    doctors_with_number = []
    # start_index 계산: (현재 페이지 - 1) * 페이지당 항목 수 + 1
    # page_obj.paginator.per_page: 페이지당 항목 수 (공통 함수에서 생성된 paginator 객체 접근)
    start_index = (page_obj.number - 1) * page_obj.paginator.per_page + 1
    for idx, doctor in enumerate(page_obj):
        if sort_field == 'doctor_id' and sort_order == 'desc':
            # 내림차순: 전체 개수에서 역순으로 계산
            number = total_count - (start_index - 1 + idx) + 1
        else:
            # 오름차순 또는 기본: 페이지네이션 기준
            number = start_index + idx
        doctors_with_number.append({
            'doctor': doctor,
            'number': number
        })
    
    # ========= 선택된 의사 정보 (상세 정보 표시용) =========
    # 사용자가 목록에서 특정 의사를 클릭했을 때 해당 의사의 상세 정보를 표시하기 위한 데이터
    # selected_doctor_id: URL 파라미터에서 전달된 의사 ID (예: ?doctor_id=1)
    #   - 사용자가 목록의 특정 행을 클릭하면 해당 의사의 doctor_id가 URL에 포함됨
    #   - AJAX 요청 시 상세 정보만 반환하기 위해 사용
    
    selected_doctor = None  # 기본값: None (의사가 선택되지 않은 경우)
    
    # selected_doctor_id가 존재하는 경우에만 의사 정보 조회
    if selected_doctor_id:
        try:
            # Doctors.objects: Doctors 모델의 모든 객체에 접근
            # .select_related('user', 'hos', 'dep'): 관련 객체를 미리 로드하여 N+1 쿼리 문제 방지
            #   - 'user': Doctors 모델의 user ForeignKey (Users 모델과 연결)
            #   - 'hos': Doctors 모델의 hos ForeignKey (Hospital 모델과 연결)
            #   - 'dep': Doctors 모델의 dep ForeignKey (Department 모델과 연결)
            #   - select_related(): JOIN 쿼리를 사용하여 한 번의 쿼리로 관련 객체까지 함께 가져옴
            #     → 성능 최적화: 의사 정보와 함께 사용자, 병원, 진료과 정보도 함께 조회
            # .get(doctor_id=selected_doctor_id): doctor_id가 일치하는 의사 객체를 조회
            #   - get(): 단일 객체를 반환 (없으면 DoesNotExist 예외 발생)
            #   - doctor_id: Doctors 모델의 기본 키 (Primary Key)
            selected_doctor = Doctors.objects.select_related('user', 'hos', 'dep').get(doctor_id=selected_doctor_id)
        except Doctors.DoesNotExist:
            # 해당 doctor_id를 가진 의사가 존재하지 않는 경우
            # 예외 처리: selected_doctor는 None으로 유지 (에러 발생하지 않음)
            # 이유: 잘못된 doctor_id가 전달되었을 때 페이지가 에러로 중단되지 않도록 함
            pass
    
    # ========= 디버깅용 변수 =========
    # 개발 및 디버깅 시 유용한 통계 정보를 수집
    # 템플릿에서 사용하거나 콘솔에 출력하여 검색/필터링 결과를 확인할 수 있음
    
    # 전체 의사 수 (검색/필터링 전)
    # Doctors.objects.count(): 데이터베이스에 존재하는 모든 의사의 개수
    #   - count(): 쿼리셋의 개수를 반환 (실제 데이터를 가져오지 않음, 성능 효율적)
    #   - 검색이나 필터링을 적용하기 전의 전체 의사 수를 의미
    #   - 예: 전체 의사가 100명이면 total_doctors_count = 100
    total_doctors_count = Doctors.objects.count()
    
    # 검색/필터링 결과 의사 수 (검색/필터링 후)
    # doctors.count(): 검색 조건과 필터를 적용한 후의 의사 개수
    #   - doctors: 위에서 검색/필터링을 적용한 쿼리셋
    #   - count(): 쿼리셋의 개수를 반환
    #   - 검색어나 필터를 적용한 후의 결과 수를 의미
    #   - 예: '내과'로 검색했을 때 20명이 나오면 search_result_count = 20
    #   - total_doctors_count와 비교하여 검색이 제대로 작동하는지 확인 가능
    search_result_count = doctors.count()
    
    # ========= 템플릿에 전달할 컨텍스트 데이터 =========
    # render() 함수를 통해 템플릿에 전달되는 데이터 딕셔너리
    # 템플릿에서 {{ 변수명 }} 형식으로 접근 가능
    
    context = {
        # 페이지네이션 객체 (현재 페이지의 의사 목록)
        # page_obj: Paginator를 통해 생성된 페이지 객체
        #   - page_obj: 현재 페이지에 표시될 의사 목록 (최대 5개)
        #   - page_obj.number: 현재 페이지 번호
        #   - page_obj.has_previous(): 이전 페이지 존재 여부
        #   - page_obj.has_next(): 다음 페이지 존재 여부
        #   - 템플릿에서 {% for doctor in page_obj %} 형식으로 사용
        'page_obj': page_obj,
        
        # 의사 목록 (page_obj와 동일, 호환성을 위해 중복 포함)
        # doctors: page_obj와 동일한 값 (템플릿에서 사용하는 변수명에 따라 다를 수 있음)
        'doctors': page_obj,
        
        # 번호가 포함된 의사 리스트
        # doctors_with_number: 각 의사 객체와 함께 번호(No.)를 포함한 리스트
        #   - 형식: [{'doctor': Doctor객체, 'number': 1}, {'doctor': Doctor객체, 'number': 2}, ...]
        #   - number: 정렬 방향에 따라 계산된 번호 (페이지네이션 고려)
        #   - 템플릿에서 목록의 번호를 표시할 때 사용
        'doctors_with_number': doctors_with_number,
        
        # 검색 조건 (검색 타입)
        # search_type: 사용자가 선택한 검색 필드 (예: 'name', 'doctor_id', 'license_no', 'department', 'hospital')
        #   - 템플릿에서 검색 폼의 선택된 값을 유지하기 위해 사용
        #   - 예: 'name'으로 검색했으면 검색 폼에서 '이름' 옵션이 선택된 상태로 유지
        'search_type': search_type,
        
        # 검색 키워드 (검색어)
        # search_keyword: 사용자가 입력한 검색어
        #   - 템플릿에서 검색 폼의 입력값을 유지하기 위해 사용
        #   - 예: '홍길동'으로 검색했으면 검색 입력 필드에 '홍길동'이 그대로 표시됨
        'search_keyword': search_keyword,
        
        # 선택된 의사 정보 (상세 정보 표시용)
        # selected_doctor: 사용자가 목록에서 클릭한 의사의 상세 정보
        #   - None: 의사가 선택되지 않은 경우
        #   - Doctor 객체: 의사가 선택된 경우 (user, hos, dep 정보 포함)
        #   - 템플릿에서 상세 정보 영역에 표시할 데이터
        #   - AJAX 요청 시 상세 정보만 반환할 때 사용
        'selected_doctor': selected_doctor,
        
        # 전체 의사 수 (디버깅용)
        # total_doctors_count: 검색/필터링 전의 전체 의사 수
        #   - 템플릿에서 "전체: 100명" 형식으로 표시할 수 있음
        #   - 또는 개발자가 콘솔에서 확인하여 검색 기능이 제대로 작동하는지 확인
        'total_doctors_count': total_doctors_count,
        
        # 검색 결과 수 (디버깅용)
        # search_result_count: 검색/필터링 후의 의사 수
        #   - 템플릿에서 "검색 결과: 20명" 형식으로 표시할 수 있음
        #   - 또는 개발자가 콘솔에서 확인하여 검색 기능이 제대로 작동하는지 확인
        'search_result_count': search_result_count,
        
        # 정렬 필드 (현재 정렬 기준)
        # sort_field: 사용자가 선택한 정렬 필드 (예: 'name', 'created_at', 'verified')
        #   - 템플릿에서 정렬 헤더의 선택된 상태를 유지하기 위해 사용
        #   - 예: 'name'으로 정렬했으면 '이름' 헤더에 정렬 표시가 나타남
        'sort_field': sort_field,
        
        # 정렬 순서 (오름차순/내림차순)
        # sort_order: 정렬 방향 ('asc': 오름차순, 'desc': 내림차순)
        #   - 템플릿에서 정렬 헤더의 화살표 방향을 표시하기 위해 사용
        #   - 예: 'desc'이면 내림차순 화살표(↓) 표시
        'sort_order': sort_order,
    }
    
    # ========= AJAX 요청인 경우 처리 =========
    # JavaScript의 fetch() 또는 XMLHttpRequest를 사용한 비동기 요청 처리
    # 페이지 전체를 새로고침하지 않고 필요한 부분만 동적으로 업데이트하기 위해 사용
    # 예: 사용자가 목록의 행을 클릭하면 상세 정보만 업데이트, 페이지는 그대로 유지
    
    # X-Requested-With 헤더 확인
    # request.headers.get('X-Requested-With'): HTTP 요청 헤더에서 'X-Requested-With' 값을 가져옴
    #   - 일반 브라우저 요청: None 또는 다른 값
    #   - AJAX 요청: 'XMLHttpRequest' (jQuery, fetch API 등이 자동으로 설정)
    #   - 이 헤더를 통해 일반 페이지 요청과 AJAX 요청을 구분
    #   - 예: JavaScript에서 fetch()로 요청하면 자동으로 'XMLHttpRequest' 헤더가 포함됨
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        # AJAX 요청인 경우
        
        # selected_doctor_id가 있는 경우: 사용자가 목록의 특정 행을 클릭한 것으로 간주
        # doctor_id 파라미터가 있으면 행 클릭으로 간주하여 상세 정보만 반환
        # page 파라미터가 있어도 doctor_id가 있으면 행 클릭이므로 상세 정보만 반환
        #   - 예: URL에 ?doctor_id=1&page=2가 있어도 doctor_id가 있으면 행 클릭으로 처리
        #   - 이유: 사용자가 특정 의사를 선택했으므로 상세 정보만 업데이트하면 됨
        if selected_doctor_id:
            # 상세 정보 템플릿을 HTML 문자열로 렌더링
            # render_to_string(): 템플릿을 렌더링하여 HTML 문자열로 반환 (HttpResponse 객체가 아님)
            #   - 'admin_panel/doctor_list_detail.html': 상세 정보를 표시할 템플릿 파일
            #   - context: 템플릿에 전달할 데이터 (selected_doctor 등 포함)
            #   - request=request: 템플릿에서 request 객체를 사용할 수 있도록 전달
            #     → 템플릿에서 {% url %} 태그나 request.user 등을 사용할 수 있음
            # 반환값: 렌더링된 HTML 문자열 (예: '<div>의사 상세 정보...</div>')
            detail_html = render_to_string('admin_panel/doctor_list_detail.html', context, request=request)
            
            # JSON 형식으로 응답 반환
            # JsonResponse(): JSON 형식의 HTTP 응답을 생성하는 Django 클래스
            #   - {'detail_html': detail_html}: JSON 객체 (키: 'detail_html', 값: HTML 문자열)
            #   - JavaScript에서 response.json()으로 받으면 {detail_html: '<div>...</div>'} 형태
            #   - JavaScript에서 받은 후 DOM에 삽입하여 상세 정보 영역만 업데이트
            #   - 예: document.getElementById('detail-area').innerHTML = response.detail_html
            # 반환값: JSON 응답 (Content-Type: application/json)
            #   - 이 return 문이 실행되면 함수가 종료되고, 아래의 render()는 실행되지 않음
            return JsonResponse({'detail_html': detail_html})
        
        # selected_doctor_id가 없는 경우: 페이지네이션이나 다른 AJAX 요청
        # doctor_id가 없으면 페이지네이션이므로 전체 HTML 반환
        # 이 경우는 일반 페이지 렌더링으로 처리
        #   - 예: 페이지 번호를 클릭하여 다른 페이지로 이동하는 경우
        #   - 현재는 구현되지 않았지만, 필요시 여기서 페이지네이션 HTML만 반환할 수 있음
        #   - 현재는 아래의 render()로 일반 페이지 렌더링 처리
    
    # ========= 일반 페이지 렌더링 (AJAX 요청이 아닌 경우) =========
    # 브라우저에서 직접 URL을 입력하거나, 일반 링크를 클릭한 경우
    # 페이지 전체를 새로고침하여 전체 HTML을 반환
    
    # 디버깅용 출력 (개발 중에만 사용, 프로덕션에서는 제거 권장)
    # print('두번째'): 콘솔에 '두번째' 문자열 출력
    #   - 이 함수가 실행되었는지 확인하기 위한 디버깅 코드
    #   - 실제 프로덕션 환경에서는 제거하거나 로깅 시스템으로 대체 권장
    print('두번째')
    
    # 전체 페이지 렌더링
    # render(): 템플릿을 렌더링하여 HttpResponse 객체를 반환하는 Django 함수
    #   - request: HTTP 요청 객체 (템플릿에서 request.user 등을 사용할 수 있도록 전달)
    #   - 'admin_panel/doctor_list.html': 렌더링할 템플릿 파일 경로
    #     → apps/admin_panel/templates/admin_panel/doctor_list.html 파일을 찾음
    #   - context: 템플릿에 전달할 데이터 딕셔너리
    #     → 템플릿에서 {{ 변수명 }} 형식으로 접근 가능
    # 반환값: HttpResponse 객체 (HTML 응답)
    #   - 브라우저에 전체 HTML 페이지가 전송됨
    #   - 템플릿이 렌더링되어 의사 목록, 검색 폼, 페이지네이션 등이 모두 포함된 HTML 생성
    return render(request, 'admin_panel/doctor_list.html', context)


def hospital_list(request):
    """
    병원 목록 페이지 뷰
    - 모든 병원 목록 조회 (의사 수 포함)
    - 검색 기능 (병원명, 지역, 전화번호, 병원ID)
    - 정렬 기능 (다양한 필드 기준)
    - 페이지네이션 (페이지당 5개)
    - AJAX 요청 시 상세 정보만 반환
    """
    # 검색 조건 및 키워드
    search_type = request.GET.get('search_type', '')
    search_keyword = request.GET.get('search_keyword', '')
    selected_hospital_id = request.GET.get('hospital_id', '')
    
    # 정렬 파라미터
    sort_field = request.GET.get('sort', '')
    sort_order = request.GET.get('order', 'desc')
    
    # ========= 정렬 필드 매핑 (URL 파라미터와 실제 모델 필드 매핑) =========
    # 사용자가 URL 파라미터로 전달한 정렬 필드명을 실제 데이터베이스 모델 필드명으로 변환
    # 예: URL에 ?sort=name&order=asc가 있으면 sort_fields['name'] = 'name'으로 변환
    # 이유: URL 파라미터는 사용자 친화적인 이름을 사용하고, 실제 정렬은 모델 필드명을 사용해야 함
    
    sort_fields = {
        # 병원 ID 정렬 (No. 정렬용)
        # 'hos_id': Hospital 모델의 기본 키 (Primary Key)
        #   - hos_id: Hospital 모델의 직접 필드
        #   - 목록에서 번호(No.)를 기준으로 정렬할 때 사용
        'hos_id': 'hos_id',
        
        # 병원명 정렬 (공식명)
        # 'hos_name': Hospital 모델의 hos_name 필드
        #   - hos_name: Hospital 모델의 직접 필드
        #   - 병원의 공식명으로 정렬할 때 사용
        'hos_name': 'hos_name',
        
        # 병원명 정렬 (일반명)
        # 'name': Hospital 모델의 name 필드
        #   - name: Hospital 모델의 직접 필드
        #   - 병원의 일반명으로 정렬할 때 사용
        'name': 'name',
        
        # 주소 정렬
        # 'address': Hospital 모델의 address 필드
        #   - address: Hospital 모델의 직접 필드
        #   - 병원 주소로 정렬할 때 사용
        'address': 'address',
        
        # 전화번호 정렬
        # 'tel': Hospital 모델의 tel 필드
        #   - tel: Hospital 모델의 직접 필드
        #   - 병원 전화번호로 정렬할 때 사용
        'tel': 'tel',
        
        # 생성일 정렬
        # 'created_at': Hospital 모델의 created_at 필드
        #   - created_at: Hospital 모델의 직접 필드
        #   - 병원 등록일로 정렬할 때 사용 (최신순/오래된순)
        'created_at': 'created_at',
    }
    
    # ========= 기본 쿼리셋 (모든 병원, 의사 수 포함) =========
    # Hospital.objects: Hospital 모델의 모든 객체에 접근
    # .annotate(doctor_count=Count('doctors')): 각 병원에 소속된 의사 수를 계산하여 추가
    #   - annotate(): 쿼리셋에 추가 필드를 동적으로 추가하는 Django ORM 메서드
    #   - doctor_count: 새로 추가되는 필드명 (임시 필드, 데이터베이스에 저장되지 않음)
    #   - Count('doctors'): 'doctors' 관련 객체의 개수를 세는 집계 함수
    #     → 'doctors': Hospital 모델과 Doctors 모델 간의 역참조 관계명
    #     → Hospital 모델에 related_name='doctors'로 설정된 ForeignKey가 있다고 가정
    #     → 예: Doctors 모델에 hos = ForeignKey(Hospital, related_name='doctors')가 있다면
    #     → hospital.doctors.all()로 해당 병원의 모든 의사를 조회할 수 있음
    #   - SQL로 변환 시: SELECT hospital.*, COUNT(doctors.doctor_id) AS doctor_count
    #                   FROM hospital LEFT JOIN doctors ON hospital.hos_id = doctors.hos_id
    #                   GROUP BY hospital.hos_id
    #   - 결과: 각 병원 객체에 doctor_count 속성이 추가됨
    #     → 예: hospital.doctor_count로 해당 병원의 의사 수를 바로 확인 가능
    #     → 템플릿에서 {{ hospital.doctor_count }}로 표시 가능
    # .all(): 모든 병원 객체 반환 (필터링 없음)
    # 반환값: 모든 병원이 포함된 쿼리셋 (아직 데이터베이스 쿼리는 실행되지 않음)
    #   - 각 병원 객체에는 doctor_count 속성이 포함됨
    #   - 성능 최적화: 한 번의 쿼리로 병원 정보와 의사 수를 함께 가져옴
    #     → 각 병원마다 의사 수를 조회하는 N+1 쿼리 문제를 방지
    hospitals = Hospital.objects.annotate(
        doctor_count=Count('doctors')
    ).all()
    
    # 정렬 적용
    if sort_field and sort_field in sort_fields:
        order_prefix = '-' if sort_order == 'desc' else ''
        hospitals = hospitals.order_by(f'{order_prefix}{sort_fields[sort_field]}')
    else:
        # 기본 정렬: 최신순
        hospitals = hospitals.order_by('-created_at')
    
    # 검색 필터 적용
    if search_type and search_keyword:
        search_keyword = search_keyword.strip()
        if search_keyword:
            if search_type == 'name':
                hospitals = hospitals.filter(name__icontains=search_keyword)
            elif search_type == 'region':
                # 지역 검색 (주소에서 검색)
                hospitals = hospitals.filter(address__icontains=search_keyword)
            elif search_type == 'phone':
                hospitals = hospitals.filter(tel__icontains=search_keyword)
            elif search_type == 'hpid':
                # 병원ID 검색: hos_name 필드에서만 검색
                hospitals = hospitals.filter(hos_name__icontains=search_keyword)
    
    # ========= 페이지네이션 (페이지당 5개) =========
    # 공통 유틸리티 함수를 사용하여 페이지네이션 처리
    # paginate_queryset(): 쿼리셋을 페이지네이션하고 페이지 객체와 전체 개수를 반환
    page_obj, total_count = paginate_queryset(request, hospitals, per_page=5)
    
    # 각 항목의 번호 계산 (정렬 방향에 따라)
    hospitals_with_number = []
    # start_index 계산: (현재 페이지 - 1) * 페이지당 항목 수 + 1
    # page_obj.paginator.per_page: 페이지당 항목 수 (공통 함수에서 생성된 paginator 객체 접근)
    start_index = (page_obj.number - 1) * page_obj.paginator.per_page + 1
    for idx, hospital in enumerate(page_obj):
        if sort_field == 'hos_id' and sort_order == 'desc':
            # 내림차순: 전체 개수에서 역순으로 계산
            number = total_count - (start_index - 1 + idx) + 1
        else:
            # 오름차순 또는 기본: 페이지네이션 기준
            number = start_index + idx
        hospitals_with_number.append({
            'hospital': hospital,
            'number': number
        })
    
    # ========= 선택된 병원 정보 (상세 정보 표시용) =========
    # 사용자가 목록에서 특정 병원을 클릭했을 때 해당 병원의 상세 정보를 표시하기 위한 데이터
    # selected_hospital_id: URL 파라미터에서 전달된 병원 ID (예: ?hospital_id=1)
    #   - 사용자가 목록의 특정 행을 클릭하면 해당 병원의 hos_id가 URL에 포함됨
    #   - AJAX 요청 시 상세 정보만 반환하기 위해 사용
    
    selected_hospital = None  # 기본값: None (병원이 선택되지 않은 경우)
    
    # selected_hospital_id가 존재하는 경우에만 병원 정보 조회
    if selected_hospital_id:
        try:
            # Hospital.objects: Hospital 모델의 모든 객체에 접근
            # .annotate(doctor_count=Count('doctors')): 각 병원에 소속된 의사 수를 계산하여 추가
            #   - annotate(): 쿼리셋에 추가 필드를 동적으로 추가하는 Django ORM 메서드
            #   - doctor_count: 새로 추가되는 필드명 (임시 필드, 데이터베이스에 저장되지 않음)
            #   - Count('doctors'): 'doctors' 관련 객체의 개수를 세는 집계 함수
            #     → 'doctors': Hospital 모델과 Doctors 모델 간의 역참조 관계명
            #     → Hospital 모델에 related_name='doctors'로 설정된 ForeignKey가 있다고 가정
            #     → 예: Doctors 모델에 hos = ForeignKey(Hospital, related_name='doctors')가 있다면
            #     → hospital.doctors.all()로 해당 병원의 모든 의사를 조회할 수 있음
            #   - 결과: 각 병원 객체에 doctor_count 속성이 추가됨
            #     → 예: hospital.doctor_count로 해당 병원의 의사 수를 바로 확인 가능
            #     → 템플릿에서 {{ selected_hospital.doctor_count }}로 표시 가능
            # .get(hos_id=selected_hospital_id): hos_id가 일치하는 병원 객체를 조회
            #   - get(): 단일 객체를 반환 (없으면 DoesNotExist 예외 발생)
            #   - hos_id: Hospital 모델의 기본 키 (Primary Key)
            #   - 성능 최적화: 한 번의 쿼리로 병원 정보와 의사 수를 함께 가져옴
            #     → 각 병원마다 의사 수를 조회하는 N+1 쿼리 문제를 방지
            selected_hospital = Hospital.objects.annotate(
                doctor_count=Count('doctors')
            ).get(hos_id=selected_hospital_id)
        except Hospital.DoesNotExist:
            # 해당 hos_id를 가진 병원이 존재하지 않는 경우
            # 예외 처리: selected_hospital은 None으로 유지 (에러 발생하지 않음)
            # 이유: 잘못된 hos_id가 전달되었을 때 페이지가 에러로 중단되지 않도록 함
            pass
    
    # ========= 디버깅용 변수 =========
    # 개발 및 디버깅 시 유용한 통계 정보를 수집
    # 템플릿에서 사용하거나 콘솔에 출력하여 검색/필터링 결과를 확인할 수 있음
    
    # 전체 병원 수 (검색/필터링 전)
    # Hospital.objects.count(): 데이터베이스에 존재하는 모든 병원의 개수
    #   - count(): 쿼리셋의 개수를 반환 (실제 데이터를 가져오지 않음, 성능 효율적)
    #   - 검색이나 필터링을 적용하기 전의 전체 병원 수를 의미
    #   - 예: 전체 병원이 50개이면 total_hospitals_count = 50
    total_hospitals_count = Hospital.objects.count()
    
    # 검색/필터링 결과 병원 수 (검색/필터링 후)
    # hospitals.count(): 검색 조건과 필터를 적용한 후의 병원 개수
    #   - hospitals: 위에서 검색/필터링을 적용한 쿼리셋
    #   - count(): 쿼리셋의 개수를 반환
    #   - 검색어나 필터를 적용한 후의 결과 수를 의미
    #   - 예: '서울'로 검색했을 때 10개가 나오면 search_result_count = 10
    #   - total_hospitals_count와 비교하여 검색이 제대로 작동하는지 확인 가능
    search_result_count = hospitals.count()
    
    # ========= 템플릿에 전달할 컨텍스트 데이터 =========
    # render() 함수를 통해 템플릿에 전달되는 데이터 딕셔너리
    # 템플릿에서 {{ 변수명 }} 형식으로 접근 가능
    
    context = {
        # 페이지네이션 객체 (현재 페이지의 병원 목록)
        # page_obj: Paginator를 통해 생성된 페이지 객체
        #   - page_obj: 현재 페이지에 표시될 병원 목록 (최대 5개)
        #   - page_obj.number: 현재 페이지 번호
        #   - page_obj.has_previous(): 이전 페이지 존재 여부
        #   - page_obj.has_next(): 다음 페이지 존재 여부
        #   - 템플릿에서 {% for hospital in page_obj %} 형식으로 사용
        'page_obj': page_obj,
        
        # 병원 목록 (page_obj와 동일, 호환성을 위해 중복 포함)
        # hospitals: page_obj와 동일한 값 (템플릿에서 사용하는 변수명에 따라 다를 수 있음)
        'hospitals': page_obj,
        
        # 번호가 포함된 병원 리스트
        # hospitals_with_number: 각 병원 객체와 함께 번호(No.)를 포함한 리스트
        #   - 형식: [{'hospital': Hospital객체, 'number': 1}, {'hospital': Hospital객체, 'number': 2}, ...]
        #   - number: 정렬 방향에 따라 계산된 번호 (페이지네이션 고려)
        #   - 템플릿에서 목록의 번호를 표시할 때 사용
        'hospitals_with_number': hospitals_with_number,
        
        # 검색 조건 (검색 타입)
        # search_type: 사용자가 선택한 검색 필드 (예: 'name', 'region', 'phone', 'hpid')
        #   - 템플릿에서 검색 폼의 선택된 값을 유지하기 위해 사용
        #   - 예: 'name'으로 검색했으면 검색 폼에서 '병원명' 옵션이 선택된 상태로 유지
        'search_type': search_type,
        
        # 검색 키워드 (검색어)
        # search_keyword: 사용자가 입력한 검색어
        #   - 템플릿에서 검색 폼의 입력값을 유지하기 위해 사용
        #   - 예: '서울'로 검색했으면 검색 입력 필드에 '서울'이 그대로 표시됨
        'search_keyword': search_keyword,
        
        # 선택된 병원 정보 (상세 정보 표시용)
        # selected_hospital: 사용자가 목록에서 클릭한 병원의 상세 정보
        #   - None: 병원이 선택되지 않은 경우
        #   - Hospital 객체: 병원이 선택된 경우 (doctor_count 정보 포함)
        #   - 템플릿에서 상세 정보 영역에 표시할 데이터
        #   - AJAX 요청 시 상세 정보만 반환할 때 사용
        'selected_hospital': selected_hospital,
        
        # 전체 병원 수 (디버깅용)
        # total_hospitals_count: 검색/필터링 전의 전체 병원 수
        #   - 템플릿에서 "전체: 50개" 형식으로 표시할 수 있음
        #   - 또는 개발자가 콘솔에서 확인하여 검색 기능이 제대로 작동하는지 확인
        'total_hospitals_count': total_hospitals_count,
        
        # 검색 결과 수 (디버깅용)
        # search_result_count: 검색/필터링 후의 병원 수
        #   - 템플릿에서 "검색 결과: 10개" 형식으로 표시할 수 있음
        #   - 또는 개발자가 콘솔에서 확인하여 검색 기능이 제대로 작동하는지 확인
        'search_result_count': search_result_count,
        
        # 정렬 필드 (현재 정렬 기준)
        # sort_field: 사용자가 선택한 정렬 필드 (예: 'name', 'created_at', 'address')
        #   - 템플릿에서 정렬 헤더의 선택된 상태를 유지하기 위해 사용
        #   - 예: 'name'으로 정렬했으면 '병원명' 헤더에 정렬 표시가 나타남
        'sort_field': sort_field,
        
        # 정렬 순서 (오름차순/내림차순)
        # sort_order: 정렬 방향 ('asc': 오름차순, 'desc': 내림차순)
        #   - 템플릿에서 정렬 헤더의 화살표 방향을 표시하기 위해 사용
        #   - 예: 'desc'이면 내림차순 화살표(↓) 표시
        'sort_order': sort_order,
    }
    
    # AJAX 요청인 경우 처리
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        # hospital_id 파라미터가 있고, page 파라미터가 없으면 상세 정보만 반환 (행 클릭)
        # page 파라미터가 있으면 페이지네이션이므로 전체 HTML 반환
        if selected_hospital_id:
            detail_html = render_to_string('admin_panel/hospital_list_detail.html', context, request=request)
            return JsonResponse({'detail_html': detail_html})
        # 그 외의 경우 (페이지네이션 등)는 전체 HTML 반환
        # 이 경우는 일반 페이지 렌더링으로 처리
    
    return render(request, 'admin_panel/hospital_list.html', context)


def approval_pending(request):
    """
    의사 승인 대기 페이지 뷰
    - 검증되지 않은 의사(verified=False) 목록 조회
    - 면허번호와 주민번호 뒷자리 일치 여부 검증
    - 승인/거절 처리 (POST 요청)
    - 정렬 기능 및 페이지네이션 지원
    - AJAX 요청 시 상세 정보만 반환
    """
    # 정렬 파라미터
    sort_field = request.GET.get('sort', '')
    sort_order = request.GET.get('order', 'asc')
    
    # 정렬 필드 매핑 (URL 파라미터와 실제 모델 필드 매핑)
    sort_fields = {
        'doctor_id': 'doctor_id',  # No. 정렬용
        'name': 'user__name',
        'username': 'user__username',
        'hospital': 'hos__name',
        'department': 'dep__dep_name',
        'license_no': 'license_no',
        'created_at': 'user__created_at',
    }
    
    # ========= 검증되지 않은 의사들 조회 (관련 객체 미리 로드) =========
    # 승인 대기 상태인 의사들만 조회 (verified=False인 의사들)
    # 이 페이지는 관리자가 의사 가입 신청을 검토하고 승인/거절하는 페이지
    
    # Doctors.objects: Doctors 모델의 모든 객체에 접근
    # .filter(verified=False): 검증되지 않은 의사만 필터링
    #   - verified: Doctors 모델의 검증 상태 필드 (BooleanField)
    #   - verified=False: 검증되지 않은 의사 (승인 대기 상태)
    #   - verified=True: 검증 완료된 의사 (승인 완료 상태)
    #   - 이 페이지에서는 아직 승인되지 않은 의사들만 표시
    # .select_related('user', 'hos', 'dep'): 관련 객체를 미리 로드하여 N+1 쿼리 문제 방지
    #   - 'user': Doctors 모델의 user ForeignKey (Users 모델과 연결)
    #   - 'hos': Doctors 모델의 hos ForeignKey (Hospital 모델과 연결)
    #   - 'dep': Doctors 모델의 dep ForeignKey (Department 모델과 연결)
    #   - select_related(): JOIN 쿼리를 사용하여 한 번의 쿼리로 관련 객체까지 함께 가져옴
    #     → 성능 최적화: 각 의사마다 user, hos, dep를 조회하는 쿼리를 방지
    #     → 예: 의사 10명이 있으면 1번의 쿼리로 모든 정보를 가져옴 (10번의 쿼리가 아닌)
    # 반환값: 검증되지 않은 의사가 포함된 쿼리셋 (아직 데이터베이스 쿼리는 실행되지 않음)
    pending_doctors = Doctors.objects.filter(verified=False).select_related(
        'user', 'hos', 'dep'
    )
    
    # ========= 정렬 적용 =========
    # 사용자가 정렬을 선택했는지 확인하고, 선택한 경우 해당 필드로 정렬
    # sort_field가 있고, sort_fields 딕셔너리에 해당 키가 존재하는 경우에만 정렬 적용
    
    if sort_field and sort_field in sort_fields:
        # 사용자가 정렬을 선택한 경우
        # 정렬 순서에 따른 접두사 결정
        # Django ORM에서 정렬 순서 지정 방법:
        #   - 내림차순(desc): 필드명 앞에 '-' 붙임 (예: '-user__created_at')
        #   - 오름차순(asc): 필드명 그대로 사용 (예: 'user__created_at')
        # order_prefix: 정렬 순서에 따라 '-' 또는 빈 문자열('')을 저장
        #   - sort_order == 'desc' → order_prefix = '-' (내림차순)
        #   - sort_order == 'asc' → order_prefix = '' (오름차순)
        order_prefix = '-' if sort_order == 'desc' else ''
        
        # 실제 정렬 적용
        # f'{order_prefix}{sort_fields[sort_field]}': 문자열 포맷팅으로 정렬 필드명 생성
        #   - 예: sort_field='created_at', sort_order='desc' → '-user__created_at'
        #   - 예: sort_field='name', sort_order='asc' → 'user__name'
        # sort_fields[sort_field]: URL 파라미터를 실제 모델 필드명으로 변환
        #   - 예: sort_field='name' → sort_fields['name'] = 'user__name'
        # pending_doctors.order_by(): 쿼리셋을 지정한 필드로 정렬
        #   - 반환값: 정렬된 쿼리셋 (아직 데이터베이스 쿼리는 실행되지 않음)
        pending_doctors = pending_doctors.order_by(f'{order_prefix}{sort_fields[sort_field]}')
    else:
        # 사용자가 정렬을 선택하지 않은 경우 기본 정렬 적용
        # 기본 정렬: 최신순 (가입일 기준 내림차순)
        # .order_by('user__created_at'): Users 모델의 created_at 필드로 정렬
        #   - 'user__created_at': Doctors 모델의 user ForeignKey를 통해 Users 모델의 created_at 필드에 접근
        #   - 오름차순 정렬 (기본값, '-' 없음)
        #   - 최신 가입자가 먼저 표시됨 (내림차순이 아님, 오름차순)
        #   - 주의: 기본 정렬이 오름차순이므로 오래된 가입자가 먼저 표시됨
        #     → 만약 최신순을 원한다면 '-user__created_at'을 사용해야 함
        #     → 하지만 현재 코드는 'user__created_at'이므로 오래된 순서로 정렬됨
        pending_doctors = pending_doctors.order_by('user__created_at')
    
    # ========= 선택된 의사 ID =========
    # 사용자가 목록에서 특정 의사를 클릭했을 때 해당 의사의 상세 정보를 표시하기 위한 데이터
    # 또는 페이지에 처음 접근했을 때 기본으로 선택할 의사 결정
    
    # URL 파라미터에서 의사 ID 가져오기
    # request.GET.get('doctor_id', ''): HTTP GET 요청의 쿼리 파라미터에서 'doctor_id' 값을 가져옴
    #   - 'doctor_id': URL 파라미터 이름 (예: ?doctor_id=1)
    #   - '': 기본값 (doctor_id 파라미터가 없으면 빈 문자열 반환)
    #   - 사용자가 목록의 특정 행을 클릭하면 해당 의사의 doctor_id가 URL에 포함됨
    #   - AJAX 요청 시 상세 정보만 반환하기 위해 사용
    selected_doctor_id = request.GET.get('doctor_id', '')
    
    # 선택된 의사 객체 초기화
    # selected_doctor: 사용자가 선택한 의사의 상세 정보를 저장할 변수
    # 기본값: None (의사가 선택되지 않은 경우)
    selected_doctor = None
    
    # selected_doctor_id가 있는 경우: 사용자가 특정 의사를 클릭한 것으로 간주
    if selected_doctor_id:
        try:
            # Doctors.objects: Doctors 모델의 모든 객체에 접근
            # .select_related('user', 'hos', 'dep'): 관련 객체를 미리 로드하여 N+1 쿼리 문제 방지
            #   - 'user': Doctors 모델의 user ForeignKey (Users 모델과 연결)
            #   - 'hos': Doctors 모델의 hos ForeignKey (Hospital 모델과 연결)
            #   - 'dep': Doctors 모델의 dep ForeignKey (Department 모델과 연결)
            #   - select_related(): JOIN 쿼리를 사용하여 한 번의 쿼리로 관련 객체까지 함께 가져옴
            #     → 성능 최적화: 의사 정보와 함께 사용자, 병원, 진료과 정보도 함께 조회
            # .get(doctor_id=selected_doctor_id, verified=False): 특정 의사 조회
            #   - get(): 단일 객체를 반환 (없으면 DoesNotExist 예외 발생)
            #   - doctor_id=selected_doctor_id: doctor_id가 일치하는 의사
            #   - verified=False: 검증되지 않은 의사만 조회 (승인 대기 상태)
            #     → 이 페이지는 승인 대기 의사만 다루므로 verified=False 조건 필수
            #     → 이미 승인된 의사(verified=True)는 이 페이지에서 조회되지 않음
            selected_doctor = Doctors.objects.select_related(
                'user', 'hos', 'dep'
            ).get(doctor_id=selected_doctor_id, verified=False)
        except Doctors.DoesNotExist:
            # 해당 doctor_id를 가진 의사가 존재하지 않거나, 이미 승인된 의사인 경우
            # 예외 처리: selected_doctor은 None으로 유지 (에러 발생하지 않음)
            # 이유: 잘못된 doctor_id가 전달되었거나, 이미 승인된 의사가 전달되었을 때
            #      페이지가 에러로 중단되지 않도록 함
            pass
    elif pending_doctors.exists():
        # selected_doctor_id가 없는 경우: 사용자가 목록에서 의사를 클릭하지 않았거나, 페이지에 처음 접근한 경우
        # 첫 번째 의사를 기본 선택
        # pending_doctors.exists(): 승인 대기 의사가 존재하는지 확인
        #   - exists(): 쿼리셋에 데이터가 있는지 확인 (count()보다 효율적, 실제 데이터를 가져오지 않음)
        #   - True: 승인 대기 의사가 1명 이상 존재
        #   - False: 승인 대기 의사가 없음
        # pending_doctors.first(): 쿼리셋의 첫 번째 의사 객체를 반환
        #   - first(): 쿼리셋의 첫 번째 객체를 반환 (없으면 None 반환)
        #   - 정렬된 순서에 따라 첫 번째 의사가 결정됨 (위에서 정렬을 적용했으므로)
        #   - 예: 기본 정렬이 'user__created_at'이면 가장 오래된 가입 의사가 선택됨
        #   - 사용자 경험: 페이지에 처음 접근했을 때 자동으로 첫 번째 의사의 상세 정보를 표시
        #     → 관리자가 별도로 클릭하지 않아도 바로 의사 정보를 확인할 수 있음
        selected_doctor = pending_doctors.first()
    
    # ========= 페이지네이션 (페이지당 5개) =========
    # 공통 유틸리티 함수를 사용하여 페이지네이션 처리
    # paginate_queryset(): 쿼리셋을 페이지네이션하고 페이지 객체와 전체 개수를 반환
    page_obj, total_count = paginate_queryset(request, pending_doctors, per_page=5)
    
    # 면허번호와 주민번호 뒷자리 일치 여부 확인 및 번호 계산 (각 의사에 대해)
    doctors_with_validation = []
    # start_index 계산: (현재 페이지 - 1) * 페이지당 항목 수 + 1
    # page_obj.paginator.per_page: 페이지당 항목 수 (공통 함수에서 생성된 paginator 객체 접근)
    start_index = (page_obj.number - 1) * page_obj.paginator.per_page + 1
    for idx, doctor in enumerate(page_obj):
        # 면허번호에서 전공과 코드(2자리)와 $ 기호 제거한 뒷자리 추출
        # 면허번호 형식: 영어코드$주민번호7자리 (예: IM$1234567)
        # 영어코드 2자리 + $ 1자리 = 3자리 제거
        license_back = doctor.license_no[3:] if len(doctor.license_no) > 3 else ''
        
        # 주민번호에서 뒷자리 추출 (하이픈 기준)
        resident_reg_no = doctor.user.resident_reg_no
        if '-' in resident_reg_no:
            resident_back = resident_reg_no.split('-')[1] if len(resident_reg_no.split('-')) > 1 else ''
        else:
            # 하이픈이 없으면 뒤에서 7자리
            resident_back = resident_reg_no[-7:] if len(resident_reg_no) >= 7 else ''
        
        # 일치 여부 확인
        is_valid_license = (license_back == resident_back)
        
        # ========= 번호 계산 (정렬 방향에 따라) =========
        # 목록에서 각 의사에게 표시할 번호(No.)를 계산
        # 정렬 방향에 따라 번호 계산 방식이 달라짐
        # 이유: 사용자가 정렬을 변경해도 번호가 일관되게 표시되도록 하기 위함
        
        if sort_field == 'doctor_id' and sort_order == 'desc':
            # doctor_id로 내림차순 정렬한 경우
            # 내림차순: 전체 개수에서 역순으로 계산
            # number = total_count - (start_index - 1 + idx) + 1
            #   - total_count: 전체 승인 대기 의사 수 (예: 20명)
            #   - start_index: 현재 페이지의 첫 번째 항목 번호 (예: 2페이지면 6)
            #   - idx: 현재 페이지 내에서의 인덱스 (0부터 시작, 예: 0, 1, 2, 3, 4)
            #   - 계산 과정:
            #     * (start_index - 1 + idx): 현재 항목이 전체 목록에서 몇 번째인지 계산
            #       예: 2페이지, idx=0 → (6-1+0) = 5번째
            #     * total_count - (start_index - 1 + idx): 역순 위치 계산
            #       예: 20 - 5 = 15번째 (역순)
            #     * + 1: 1부터 시작하는 번호로 변환
            #       예: 15 + 1 = 16번
            #   - 결과: 내림차순 정렬 시 큰 번호가 먼저 오므로, 번호도 큰 것부터 표시
            #     예: 전체 20명, 2페이지 첫 번째 항목 → 16번
            number = total_count - (start_index - 1 + idx) + 1
        else:
            # doctor_id로 내림차순 정렬이 아닌 경우 (오름차순 또는 다른 필드 정렬)
            # 오름차순 또는 기본: 페이지네이션 기준
            # number = start_index + idx
            #   - start_index: 현재 페이지의 첫 번째 항목 번호
            #     예: 1페이지 → 1, 2페이지 → 6, 3페이지 → 11
            #   - idx: 현재 페이지 내에서의 인덱스 (0부터 시작)
            #     예: 첫 번째 항목 → 0, 두 번째 항목 → 1
            #   - 계산 과정:
            #     * start_index + idx: 현재 항목의 번호 계산
            #       예: 2페이지, idx=0 → 6 + 0 = 6번
            #       예: 2페이지, idx=1 → 6 + 1 = 7번
            #   - 결과: 페이지네이션 순서대로 번호가 표시됨
            #     예: 1페이지: 1, 2, 3, 4, 5 / 2페이지: 6, 7, 8, 9, 10
            number = start_index + idx
        
        # ========= 의사 정보를 검증 정보와 함께 리스트에 추가 =========
        # doctors_with_validation: 각 의사 객체와 함께 면허번호 검증 결과와 번호를 포함한 리스트
        # 템플릿에서 목록을 표시할 때 사용
        # .append(): 리스트에 새로운 딕셔너리 추가
        
        doctors_with_validation.append({
            # 의사 객체
            # doctor: Doctors 모델의 인스턴스 (user, hos, dep 정보 포함)
            #   - 템플릿에서 {{ doctor.user.name }}, {{ doctor.hos.name }} 등으로 접근 가능
            'doctor': doctor,
            
            # 면허번호 검증 결과
            # is_valid_license: 면허번호 뒷자리와 주민번호 뒷자리가 일치하는지 여부 (Boolean)
            #   - True: 면허번호와 주민번호 뒷자리가 일치 (정상)
            #   - False: 면허번호와 주민번호 뒷자리가 일치하지 않음 (의심)
            #   - 템플릿에서 검증 상태를 표시할 때 사용
            #     예: {% if is_valid_license %}정상{% else %}의심{% endif %}
            'is_valid_license': is_valid_license,
            
            # 목록 번호 (No.)
            # number: 목록에서 표시할 번호 (정렬 방향에 따라 계산됨)
            #   - 템플릿에서 목록의 번호를 표시할 때 사용
            #     예: {{ number }} → 1, 2, 3, ...
            'number': number,
        })
    
    # ========= 승인/거절 처리 (POST 요청) =========
    # 관리자가 의사 가입 신청을 승인하거나 거절할 때 처리하는 로직
    # JavaScript에서 폼 제출 또는 AJAX 요청으로 전달됨
    
    # HTTP 요청 메서드 확인
    # request.method: HTTP 요청 메서드 ('GET', 'POST', 'PUT', 'DELETE' 등)
    #   - 'POST': 폼 제출, 데이터 수정/삭제 등에 사용
    #   - 'GET': 데이터 조회에 사용 (기본값)
    #   - 이 블록은 POST 요청일 때만 실행됨 (승인/거절 액션 처리)
    if request.method == 'POST':
        # POST 데이터에서 액션 타입 가져오기
        # request.POST.get('action'): HTTP POST 요청의 폼 데이터에서 'action' 값을 가져옴
        #   - 'approve': 의사 승인 (verified=True로 변경)
        #   - 'reject': 의사 거절 (의사 데이터 삭제)
        #   - 기본값: None (action 파라미터가 없으면)
        action = request.POST.get('action')
        
        # POST 데이터에서 의사 ID 목록 가져오기 (문자열 형식)
        # request.POST.get('doctor_ids', ''): HTTP POST 요청의 폼 데이터에서 'doctor_ids' 값을 가져옴
        #   - 형식: 쉼표로 구분된 문자열 (예: "1,2,3")
        #   - JavaScript에서 여러 의사를 선택하여 한 번에 승인/거절할 수 있도록 함
        #   - 기본값: 빈 문자열 (doctor_ids 파라미터가 없으면)
        doctor_ids_str = request.POST.get('doctor_ids', '')
        
        # ========= 쉼표로 구분된 문자열을 리스트로 변환 =========
        # JavaScript에서 전달된 "1,2,3" 형식의 문자열을 Python 리스트 [1, 2, 3]으로 변환
        # 이유: 데이터베이스 쿼리에서 __in 연산자를 사용하기 위해 리스트가 필요함
        
        if doctor_ids_str:
            # doctor_ids_str.split(','): 쉼표로 문자열을 분리하여 리스트로 변환
            #   예: "1,2,3" → ["1", "2", "3"]
            # [int(id.strip()) for id in ...]: 리스트 컴프리헨션으로 각 문자열을 정수로 변환
            #   - id.strip(): 문자열 앞뒤 공백 제거 (예: " 1 " → "1")
            #   - int(...): 문자열을 정수로 변환 (예: "1" → 1)
            #   - if id.strip().isdigit(): 숫자로만 구성된 문자열만 변환 (안전성 검증)
            #     예: "1" → True, "abc" → False (필터링됨)
            # 결과: ["1", "2", "3"] → [1, 2, 3]
            doctor_ids = [int(id.strip()) for id in doctor_ids_str.split(',') if id.strip().isdigit()]
        else:
            # doctor_ids_str가 빈 문자열이면 빈 리스트로 설정
            # 이 경우 승인/거절할 의사가 없으므로 아무 작업도 수행하지 않음
            doctor_ids = []
        
        # ========= 의사 ID 목록이 있는 경우에만 처리 =========
        # doctor_ids가 비어있지 않으면 (최소 1개 이상의 의사 ID가 있으면) 승인/거절 처리 수행
        if doctor_ids:
            if action == 'approve':
                # ========= 승인 처리: verified=True로 업데이트 =========
                # Doctors.objects.filter(...): 조건에 맞는 의사 객체들을 필터링
                #   - doctor_id__in=doctor_ids: doctor_id가 doctor_ids 리스트에 포함된 의사들
                #     예: doctor_ids=[1, 2, 3] → doctor_id가 1, 2, 3 중 하나인 의사들
                #   - verified=False: 아직 승인되지 않은 의사들만 (안전장치)
                #     이미 승인된 의사는 다시 승인할 수 없도록 함
                # .update(verified=True): 필터링된 의사들의 verified 필드를 True로 일괄 업데이트
                #   - SQL의 UPDATE 문과 동일한 역할
                #   - 여러 의사를 한 번에 업데이트 (효율적)
                #   - 반환값: 업데이트된 행의 개수 (int)
                # 결과: 선택된 의사들이 승인 완료 상태(verified=True)로 변경됨
                Doctors.objects.filter(doctor_id__in=doctor_ids, verified=False).update(verified=True)
            elif action == 'reject':
                # ========= 거절 처리: 의사 데이터 삭제 =========
                # Doctors.objects.filter(...): 조건에 맞는 의사 객체들을 필터링
                #   - doctor_id__in=doctor_ids: doctor_id가 doctor_ids 리스트에 포함된 의사들
                #   - verified=False: 아직 승인되지 않은 의사들만 (안전장치)
                #     이미 승인된 의사는 삭제할 수 없도록 함
                # .delete(): 필터링된 의사들을 데이터베이스에서 삭제
                #   - SQL의 DELETE 문과 동일한 역할
                #   - 여러 의사를 한 번에 삭제 (효율적)
                #   - CASCADE 삭제: Doctors 모델과 Users 모델이 연결되어 있으면 Users도 함께 삭제됨
                #     (모델의 ForeignKey 설정에 따라 다름)
                # 결과: 선택된 의사들이 데이터베이스에서 완전히 삭제됨
                Doctors.objects.filter(doctor_id__in=doctor_ids, verified=False).delete()
        
        # ========= 승인/거절 처리 후 페이지 리다이렉트 =========
        # redirect('approval_pending'): 승인/거절 처리가 완료된 후 승인 대기 페이지로 리다이렉트
        #   - 'approval_pending': URL 패턴 이름 (apps/admin_panel/urls.py에서 정의)
        #   - 리다이렉트 이유: POST 요청 후 GET 요청으로 전환하여 페이지 새로고침
        #     (브라우저의 뒤로가기 버튼으로 POST 요청이 다시 실행되는 것을 방지)
        #   - 반환값: HttpResponseRedirect 객체 (HTTP 302 응답)
        # 결과: 승인/거절 처리 후 승인 대기 페이지가 새로고침되어 변경사항이 반영됨
        return redirect('approval_pending')
    
    # ========= 템플릿에 전달할 컨텍스트 데이터 구성 =========
    # context: Django 템플릿에 전달할 변수들을 담은 딕셔너리
    # 템플릿에서 {{ 변수명 }} 형식으로 접근 가능
    # 예: {{ page_obj }}, {{ selected_doctor.name }}, {{ total_pending_count }} 등
    
    context = {
        # 페이지네이션 객체
        # page_obj: Paginator.get_page()의 반환값
        #   - 현재 페이지의 의사 목록 (페이지당 5개)
        #   - 템플릿에서 {% for doctor in page_obj %} 형식으로 반복문 사용 가능
        #   - .number: 현재 페이지 번호
        #   - .has_previous: 이전 페이지 존재 여부
        #   - .has_next: 다음 페이지 존재 여부
        #   - .previous_page_number: 이전 페이지 번호
        #   - .next_page_number: 다음 페이지 번호
        'page_obj': page_obj,
        
        # 페이지네이션 객체 (별칭)
        # pending_doctors: page_obj와 동일한 값 (템플릿에서 다른 이름으로 접근하기 위해)
        #   - 템플릿에서 {% for doctor in pending_doctors %} 형식으로도 사용 가능
        'pending_doctors': page_obj,
        
        # 면허번호 검증 정보가 포함된 의사 리스트
        # doctors_with_validation: 각 의사 객체와 함께 면허번호 검증 결과와 번호를 포함한 리스트
        #   - 형식: [{'doctor': Doctors 객체, 'is_valid_license': True/False, 'number': 1}, ...]
        #   - 템플릿에서 목록을 표시할 때 사용
        #   - 예: {% for item in doctors_with_validation %}
        #           {{ item.number }} - {{ item.doctor.user.name }}
        #           {% if item.is_valid_license %}정상{% else %}의심{% endif %}
        #         {% endfor %}
        'doctors_with_validation': doctors_with_validation,
        
        # 선택된 의사 객체 (상세 정보 표시용)
        # selected_doctor: 사용자가 목록에서 클릭한 의사의 상세 정보
        #   - None: 의사가 선택되지 않은 경우
        #   - Doctors 객체: 의사가 선택된 경우 (user, hos, dep 정보 포함)
        #   - 템플릿에서 {{ selected_doctor.user.name }}, {{ selected_doctor.hos.name }} 등으로 접근 가능
        'selected_doctor': selected_doctor,
        
        # 전체 승인 대기 의사 수
        # total_pending_count: pending_doctors.count()의 반환값
        #   - 현재 필터링된 쿼리셋의 총 개수 (페이지네이션 적용 전)
        #   - 템플릿에서 "전체 X명" 형식으로 표시할 때 사용
        #   - 예: "승인 대기: {{ total_pending_count }}명"
        'total_pending_count': pending_doctors.count(),
        
        # 현재 정렬 필드
        # sort_field: URL 파라미터에서 가져온 정렬 필드명
        #   - 예: 'doctor_id', 'name', 'created_at' 등
        #   - 템플릿에서 현재 정렬 상태를 표시하거나 정렬 링크를 생성할 때 사용
        #   - 예: {% if sort_field == 'name' %}정렬됨{% endif %}
        'sort_field': sort_field,
        
        # 현재 정렬 방향
        # sort_order: URL 파라미터에서 가져온 정렬 방향 ('asc' 또는 'desc')
        #   - 'asc': 오름차순 (작은 값부터)
        #   - 'desc': 내림차순 (큰 값부터)
        #   - 템플릿에서 정렬 방향을 표시하거나 정렬 링크를 생성할 때 사용
        #   - 예: {% if sort_order == 'desc' %}▼{% else %}▲{% endif %}
        'sort_order': sort_order,
    }
    
    # AJAX 요청인 경우 처리
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        # doctor_id 파라미터가 있으면 행 클릭으로 간주하여 상세 정보만 반환
        # page 파라미터가 있어도 doctor_id가 있으면 행 클릭이므로 상세 정보만 반환
        if selected_doctor_id:
            detail_html = render_to_string('admin_panel/approval_pending_detail.html', context, request=request)
            return JsonResponse({'detail_html': detail_html})
        # 그 외의 경우 (페이지네이션 등)는 전체 HTML 반환
        # 이 경우는 일반 페이지 렌더링으로 처리
    
    return render(request, 'admin_panel/approval_pending.html', context)


def qna_list(request):
    """
    1:1 문의 목록 페이지 뷰
    - 모든 문의 목록 조회
    - 삭제 처리 (POST 요청)
    - 정렬 기능 (기본: 답변 대기 상태가 먼저)
    - 페이지네이션 (페이지당 5개)
    """
    # ========= 삭제 처리 (POST 요청) =========
    # 관리자가 1:1 문의를 삭제할 때 처리하는 로직
    # JavaScript에서 폼 제출 또는 AJAX 요청으로 전달됨
    
    # HTTP 요청 메서드 확인
    # request.method: HTTP 요청 메서드 ('GET', 'POST', 'PUT', 'DELETE' 등)
    #   - 'POST': 폼 제출, 데이터 수정/삭제 등에 사용
    #   - 'GET': 데이터 조회에 사용 (기본값)
    #   - 이 블록은 POST 요청일 때만 실행됨 (삭제 액션 처리)
    if request.method == 'POST':
        # POST 데이터에서 액션 타입 가져오기
        # request.POST.get('action'): HTTP POST 요청의 폼 데이터에서 'action' 값을 가져옴
        #   - 'delete': 문의 삭제
        #   - 기본값: None (action 파라미터가 없으면)
        action = request.POST.get('action')
        
        # POST 데이터에서 문의 ID 목록 가져오기 (문자열 형식)
        # request.POST.get('qna_ids', ''): HTTP POST 요청의 폼 데이터에서 'qna_ids' 값을 가져옴
        #   - 형식: 쉼표로 구분된 문자열 (예: "1,2,3")
        #   - JavaScript에서 여러 문의를 선택하여 한 번에 삭제할 수 있도록 함
        #   - 기본값: 빈 문자열 (qna_ids 파라미터가 없으면)
        qna_ids_str = request.POST.get('qna_ids', '')
        
        # ========= 삭제 액션 및 문의 ID 목록 확인 =========
        # action == 'delete': 삭제 액션인지 확인
        #   - 다른 액션(예: 'approve', 'reject')과 구분하기 위함
        # qna_ids_str: 문의 ID 목록이 있는지 확인
        #   - 빈 문자열이면 삭제할 문의가 없으므로 처리하지 않음
        # 두 조건이 모두 만족될 때만 삭제 처리 수행
        if action == 'delete' and qna_ids_str:
            # ========= 쉼표로 구분된 문자열을 리스트로 변환 =========
            # JavaScript에서 전달된 "1,2,3" 형식의 문자열을 Python 리스트 [1, 2, 3]으로 변환
            # 이유: 데이터베이스 쿼리에서 __in 연산자를 사용하기 위해 리스트가 필요함
            
            # qna_ids_str.split(','): 쉼표로 문자열을 분리하여 리스트로 변환
            #   예: "1,2,3" → ["1", "2", "3"]
            # [int(id.strip()) for id in ...]: 리스트 컴프리헨션으로 각 문자열을 정수로 변환
            #   - id.strip(): 문자열 앞뒤 공백 제거 (예: " 1 " → "1")
            #   - int(...): 문자열을 정수로 변환 (예: "1" → 1)
            #   - if id.strip(): 빈 문자열이 아닌 경우만 변환 (안전성 검증)
            #     예: "1" → True (변환됨), "" → False (필터링됨)
            # 결과: ["1", "2", "3"] → [1, 2, 3]
            qna_ids = [int(id.strip()) for id in qna_ids_str.split(',') if id.strip()]
            
            # ========= 문의 ID 목록이 있는 경우에만 삭제 처리 =========
            # qna_ids가 비어있지 않으면 (최소 1개 이상의 문의 ID가 있으면) 삭제 처리 수행
            if qna_ids:
                # ========= 문의 삭제 처리 =========
                # Qna.objects.filter(...): 조건에 맞는 문의 객체들을 필터링
                #   - qna_id__in=qna_ids: qna_id가 qna_ids 리스트에 포함된 문의들
                #     예: qna_ids=[1, 2, 3] → qna_id가 1, 2, 3 중 하나인 문의들
                #   - __in 연산자: Django ORM에서 리스트에 포함된 값들을 필터링할 때 사용
                #     SQL의 IN 절과 동일한 역할
                # .delete(): 필터링된 문의들을 데이터베이스에서 삭제
                #   - SQL의 DELETE 문과 동일한 역할
                #   - 여러 문의를 한 번에 삭제 (효율적)
                #   - CASCADE 삭제: Qna 모델과 Users 모델이 연결되어 있으면 관련 데이터도 함께 삭제될 수 있음
                #     (모델의 ForeignKey 설정에 따라 다름)
                # 결과: 선택된 문의들이 데이터베이스에서 완전히 삭제됨
                Qna.objects.filter(qna_id__in=qna_ids).delete()
            
            # ========= 삭제 처리 후 페이지 리다이렉트 =========
            # redirect('qna_list'): 삭제 처리가 완료된 후 문의 목록 페이지로 리다이렉트
            #   - 'qna_list': URL 패턴 이름 (apps/admin_panel/urls.py에서 정의)
            #   - 리다이렉트 이유: POST 요청 후 GET 요청으로 전환하여 페이지 새로고침
            #     (브라우저의 뒤로가기 버튼으로 POST 요청이 다시 실행되는 것을 방지)
            #   - 반환값: HttpResponseRedirect 객체 (HTTP 302 응답)
            # 결과: 삭제 처리 후 문의 목록 페이지가 새로고침되어 변경사항이 반영됨
            return redirect('qna_list')
    
    # 정렬 파라미터 (기본값 없음 - 기본 정렬 사용)
    sort_field = request.GET.get('sort', '')
    sort_order = request.GET.get('order', 'asc')
    
    # 정렬 필드 매핑 (URL 파라미터와 실제 모델 필드 매핑)
    sort_fields = {
        'qna_id': 'qna_id',  # No. 정렬용
        'name': 'user__name',
        'email': 'user__email',
        'title': 'title',
        'status': 'reply',  # 상태 정렬 (reply 필드로 정렬)
        'created_at': 'created_at',
    }
    
    # ========= 기본 쿼리셋 (모든 문의, 사용자 정보 미리 로드) =========
    # Qna.objects: Qna 모델의 모든 객체에 접근
    # .select_related('user'): 관련 객체(user)를 미리 로드하여 N+1 쿼리 문제 방지
    #   - select_related(): ForeignKey 또는 OneToOneField 관계에서 사용
    #   - JOIN 쿼리를 사용하여 한 번의 쿼리로 관련 객체까지 함께 가져옴
    #   - 예: Qna 객체를 가져올 때 관련된 Users 객체도 함께 가져옴
    #   - 성능 최적화: 템플릿에서 {{ qna.user.name }}을 사용할 때 추가 쿼리가 발생하지 않음
    #   - N+1 쿼리 문제: 쿼리셋을 순회하면서 각 객체의 관련 객체를 가져올 때마다 추가 쿼리가 발생하는 문제
    #     예: 문의 10개를 가져올 때, 각 문의의 사용자 정보를 가져오기 위해 10번의 추가 쿼리 발생
    #     select_related()를 사용하면 1번의 쿼리로 모든 정보를 가져옴
    # .all(): 모든 문의 객체를 가져옴 (필터링 없음)
    # 결과: 모든 문의와 관련된 사용자 정보가 포함된 쿼리셋
    qnas = Qna.objects.select_related('user').all()
    
    # ========= 정렬 적용 =========
    # 사용자가 정렬을 선택했는지 확인하고, 선택한 경우 해당 정렬을 적용
    # sort_field: URL 파라미터에서 가져온 정렬 필드명 (예: 'status', 'created_at')
    # sort_field in sort_fields: sort_field가 sort_fields 딕셔너리에 키로 존재하는지 확인
    #   - 안전성 검증: 사용자가 임의의 정렬 필드를 입력하는 것을 방지
    if sort_field and sort_field in sort_fields:
        # ========= 사용자가 정렬을 선택한 경우 =========
        if sort_field == 'status':
            # ========= 상태 정렬: reply가 None이거나 빈 문자열인 것이 먼저 오도록 =========
            # 상태 정렬은 특별한 처리가 필요함
            # 이유: reply 필드가 None이거나 빈 문자열인 경우와 값이 있는 경우를 구분하여 정렬해야 함
            #   - 답변 대기 상태(reply=None 또는 reply='')를 먼저 표시
            #   - 답변 완료 상태(reply에 값이 있음)를 나중에 표시
            # Django ORM의 Case/When을 사용하여 조건부 정렬 필드 생성
            
            # django.db.models에서 필요한 클래스 import
            # Case: 조건부 표현식을 생성하는 클래스 (SQL의 CASE WHEN과 유사)
            # When: 조건을 정의하는 클래스 (SQL의 WHEN 절과 유사)
            # Value: 상수 값을 나타내는 클래스
            # IntegerField: 정수 필드 타입
            from django.db.models import Case, When, Value, IntegerField
            
            # annotate(): 쿼리셋에 동적으로 필드를 추가
            # reply_status: 새로 추가되는 필드명 (정렬에 사용됨)
            # Case(...): 조건부 표현식 생성
            qnas = qnas.annotate(
                reply_status=Case(
                    # When(reply__isnull=True, then=Value(0)): reply 필드가 None인 경우 0 반환
                    #   - reply__isnull=True: reply 필드가 NULL인지 확인 (Django ORM 문법)
                    #   - then=Value(0): 조건이 참이면 0 반환
                    #   - 답변 없음 = 0 (정렬 시 먼저 오도록)
                    When(reply__isnull=True, then=Value(0)),
                    
                    # When(reply='', then=Value(0)): reply 필드가 빈 문자열인 경우 0 반환
                    #   - reply='': reply 필드가 빈 문자열인지 확인
                    #   - then=Value(0): 조건이 참이면 0 반환
                    #   - 빈 문자열 = 0 (정렬 시 먼저 오도록)
                    When(reply='', then=Value(0)),
                    
                    # default=Value(1): 위 조건들이 모두 거짓인 경우 1 반환
                    #   - reply 필드에 값이 있는 경우 (답변 완료 상태)
                    #   - 답변 있음 = 1 (정렬 시 나중에 오도록)
                    default=Value(1),
                    
                    # output_field=IntegerField(): 반환값의 타입을 정수로 지정
                    #   - 정렬 시 숫자로 비교하기 위함
                    output_field=IntegerField(),
                )
            )
            
            # 정렬 방향 결정
            # order_prefix: 정렬 방향을 나타내는 접두사
            #   - sort_order == 'desc': 내림차순 → '-' 접두사 추가
            #   - sort_order == 'asc': 오름차순 → 빈 문자열 (접두사 없음)
            #   - Django ORM에서 내림차순 정렬은 필드명 앞에 '-'를 붙임
            #     예: '-reply_status' (내림차순), 'reply_status' (오름차순)
            order_prefix = '-' if sort_order == 'desc' else ''
            
            # 정렬 적용
            # order_by(): 쿼리셋을 정렬
            # f'{order_prefix}reply_status': reply_status 필드로 정렬 (방향은 order_prefix에 따라 결정)
            # '-created_at': 두 번째 정렬 기준 (생성일 내림차순, 최신순)
            #   - reply_status가 같은 경우 created_at으로 정렬
            #   - 예: 답변 대기 상태가 여러 개인 경우 최신순으로 정렬
            qnas = qnas.order_by(f'{order_prefix}reply_status', '-created_at')
        else:
            # ========= 다른 필드 정렬 (일반 정렬) =========
            # status가 아닌 다른 필드로 정렬하는 경우
            # 예: qna_id, name, email, title, created_at 등
            
            # 정렬 방향 결정
            # order_prefix: 정렬 방향을 나타내는 접두사
            #   - sort_order == 'desc': 내림차순 → '-' 접두사 추가
            #   - sort_order == 'asc': 오름차순 → 빈 문자열 (접두사 없음)
            order_prefix = '-' if sort_order == 'desc' else ''
            
            # 정렬 적용
            # sort_fields[sort_field]: URL 파라미터를 실제 모델 필드명으로 변환
            #   - 예: sort_field='name' → sort_fields['name'] = 'user__name'
            # f'{order_prefix}{sort_fields[sort_field]}': 정렬 필드명 생성
            #   - 예: order_prefix='-'이고 sort_fields[sort_field]='user__name'이면 '-user__name'
            # order_by(): 쿼리셋을 정렬
            #   - 예: qnas.order_by('-user__name') → 사용자 이름 내림차순 정렬
            qnas = qnas.order_by(f'{order_prefix}{sort_fields[sort_field]}')
    else:
        # ========= 기본 정렬: 대기 상태(답변 없음)가 먼저, 그 다음 최신순 =========
        # 사용자가 정렬을 선택하지 않은 경우 기본 정렬 적용
        # 목적: 답변 대기 상태인 문의를 먼저 표시하여 관리자가 우선적으로 처리할 수 있도록 함
        
        # reply가 None이거나 빈 문자열인 것이 먼저 오도록
        # Django ORM의 Case/When을 사용하여 조건부 정렬 필드 생성
        
        # django.db.models에서 필요한 클래스 import
        from django.db.models import Case, When, Value, IntegerField
        
        # annotate(): 쿼리셋에 동적으로 필드를 추가
        # reply_status: 새로 추가되는 필드명 (정렬에 사용됨)
        # Case(...): 조건부 표현식 생성
        qnas = qnas.annotate(
            reply_status=Case(
                # When(reply__isnull=True, then=Value(0)): reply 필드가 None인 경우 0 반환
                #   - 답변 없음 = 0 (먼저 표시)
                When(reply__isnull=True, then=Value(0)),
                
                # When(reply='', then=Value(0)): reply 필드가 빈 문자열인 경우 0 반환
                #   - 빈 문자열 = 0 (먼저 표시)
                When(reply='', then=Value(0)),
                
                # default=Value(1): 위 조건들이 모두 거짓인 경우 1 반환
                #   - reply 필드에 값이 있는 경우 (답변 완료 상태)
                #   - 답변 있음 = 1 (나중에 표시)
                default=Value(1),
                
                # output_field=IntegerField(): 반환값의 타입을 정수로 지정
                output_field=IntegerField(),
            )
        # order_by(): 쿼리셋을 정렬
        # 'reply_status': reply_status 필드로 오름차순 정렬 (0이 먼저, 1이 나중)
        #   - 답변 대기 상태(0)가 먼저 오고, 답변 완료 상태(1)가 나중에 옴
        # '-created_at': 두 번째 정렬 기준 (생성일 내림차순, 최신순)
        #   - reply_status가 같은 경우 created_at으로 정렬
        #   - 예: 답변 대기 상태가 여러 개인 경우 최신순으로 정렬
        ).order_by('reply_status', '-created_at')
    
    # ========= 페이지네이션 (페이지당 5개) =========
    # 공통 유틸리티 함수를 사용하여 페이지네이션 처리
    # paginate_queryset(): 쿼리셋을 페이지네이션하고 페이지 객체와 전체 개수를 반환
    page_obj, total_count = paginate_queryset(request, qnas, per_page=5)
    
    # 각 항목의 번호 계산 (정렬 방향에 따라)
    qnas_with_number = []
    # start_index 계산: (현재 페이지 - 1) * 페이지당 항목 수 + 1
    # page_obj.paginator.per_page: 페이지당 항목 수 (공통 함수에서 생성된 paginator 객체 접근)
    start_index = (page_obj.number - 1) * page_obj.paginator.per_page + 1
    for idx, qna in enumerate(page_obj):
        if sort_field == 'qna_id' and sort_order == 'desc':
            # 내림차순: 전체 개수에서 역순으로 계산
            number = total_count - (start_index - 1 + idx) + 1
        else:
            # 오름차순 또는 기본: 페이지네이션 기준
            number = start_index + idx
        qnas_with_number.append({
            'qna': qna,
            'number': number
        })
    
    # ========= 디버깅용 변수 =========
    # 개발 및 디버깅 시 유용한 통계 정보를 수집
    # 템플릿에서 사용하거나 콘솔에 출력하여 검색/필터링 결과를 확인할 수 있음
    
    # 전체 문의 수 (검색/필터링 전)
    # Qna.objects.count(): 데이터베이스에 존재하는 모든 문의의 개수
    #   - count(): 쿼리셋의 개수를 반환 (실제 데이터를 가져오지 않음, 성능 효율적)
    #   - 검색이나 필터링을 적용하기 전의 전체 문의 수를 의미
    #   - 예: 전체 문의가 100개이면 total_qna_count = 100
    #   - 템플릿에서 "전체: 100개" 형식으로 표시할 수 있음
    #   - 또는 개발자가 콘솔에서 확인하여 검색 기능이 제대로 작동하는지 확인
    total_qna_count = Qna.objects.count()
    
    # ========= 템플릿에 전달할 컨텍스트 데이터 구성 =========
    # context: Django 템플릿에 전달할 변수들을 담은 딕셔너리
    # 템플릿에서 {{ 변수명 }} 형식으로 접근 가능
    # 예: {{ page_obj }}, {{ qnas }}, {{ total_qna_count }} 등
    
    context = {
        # 페이지네이션 객체 (현재 페이지의 문의 목록)
        # page_obj: Paginator를 통해 생성된 페이지 객체
        #   - 현재 페이지에 표시될 문의 목록 (최대 5개)
        #   - 템플릿에서 {% for qna in page_obj %} 형식으로 반복문 사용 가능
        #   - .number: 현재 페이지 번호
        #   - .has_previous: 이전 페이지 존재 여부
        #   - .has_next: 다음 페이지 존재 여부
        #   - .previous_page_number: 이전 페이지 번호
        #   - .next_page_number: 다음 페이지 번호
        #   - .paginator.num_pages: 전체 페이지 수
        'page_obj': page_obj,
        
        # 문의 목록 (page_obj와 동일, 호환성을 위해 중복 포함)
        # qnas: page_obj와 동일한 값 (템플릿에서 사용하는 변수명에 따라 다를 수 있음)
        #   - 템플릿에서 {% for qna in qnas %} 형식으로도 사용 가능
        'qnas': page_obj,
        
        # 번호가 포함된 문의 리스트
        # qnas_with_number: 각 문의 객체와 함께 번호(No.)를 포함한 리스트
        #   - 형식: [{'qna': Qna객체, 'number': 1}, {'qna': Qna객체, 'number': 2}, ...]
        #   - number: 정렬 방향에 따라 계산된 번호 (페이지네이션 고려)
        #   - 템플릿에서 목록의 번호를 표시할 때 사용
        #   - 예: {% for item in qnas_with_number %}
        #           {{ item.number }} - {{ item.qna.title }}
        #         {% endfor %}
        'qnas_with_number': qnas_with_number,
        
        # 전체 문의 수 (디버깅용)
        # total_qna_count: 검색/필터링 전의 전체 문의 수
        #   - 템플릿에서 "전체: 100개" 형식으로 표시할 수 있음
        #   - 또는 개발자가 콘솔에서 확인하여 검색 기능이 제대로 작동하는지 확인
        #   - total_count(검색/필터링 후)와 비교하여 검색이 제대로 작동하는지 확인 가능
        'total_qna_count': total_qna_count,
        
        # 정렬 필드 (현재 정렬 기준)
        # sort_field: 사용자가 선택한 정렬 필드 (예: 'qna_id', 'name', 'title', 'status', 'created_at')
        #   - 템플릿에서 정렬 헤더의 선택된 상태를 유지하기 위해 사용
        #   - 예: 'status'로 정렬했으면 '상태' 헤더에 정렬 표시가 나타남
        #   - 빈 문자열('')이면 정렬을 선택하지 않은 경우 (기본 정렬 사용)
        'sort_field': sort_field,
        
        # 정렬 순서 (오름차순/내림차순)
        # sort_order: 정렬 방향 ('asc': 오름차순, 'desc': 내림차순)
        #   - 템플릿에서 정렬 헤더의 화살표 방향을 표시하기 위해 사용
        #   - 예: 'desc'이면 내림차순 화살표(↓) 표시
        #   - 예: 'asc'이면 오름차순 화살표(↑) 표시
        'sort_order': sort_order,
    }
    
    # ========= 템플릿 렌더링 및 HTTP 응답 반환 =========
    # render(): 템플릿을 렌더링하여 HttpResponse 객체를 반환하는 Django 함수
    #   - request: HTTP 요청 객체 (템플릿에서 request.user 등을 사용할 수 있도록 전달)
    #   - 'admin_panel/qna_list.html': 렌더링할 템플릿 파일 경로
    #     → apps/admin_panel/templates/admin_panel/qna_list.html 파일을 찾음
    #   - context: 템플릿에 전달할 데이터 딕셔너리
    #     → 템플릿에서 {{ 변수명 }} 형식으로 접근 가능
    # 반환값: HttpResponse 객체 (HTML 응답)
    #   - 브라우저에 전체 HTML 페이지가 전송됨
    #   - 템플릿이 렌더링되어 문의 목록, 검색 폼, 정렬 헤더, 페이지네이션 등이 모두 포함된 HTML 생성
    #   - 예: 문의 목록 테이블, 검색 입력 필드, 정렬 가능한 헤더, 페이지 번호 링크 등
    return render(request, 'admin_panel/qna_list.html', context)


def qna_detail(request, qna_id):
    """
    1:1 문의 상세 페이지 뷰
    - 문의 상세 정보 조회
    - 답변 저장 처리 (POST 요청)
    """
    # ========= 문의 조회 (사용자 정보 미리 로드) =========
    # get_object_or_404(): 객체를 조회하고, 없으면 404 에러 페이지를 반환하는 Django 함수
    #   - Qna.objects.select_related('user'): Qna 모델의 모든 객체에 접근하고 관련 객체(user)를 미리 로드
    #     → select_related('user'): ForeignKey 관계에서 N+1 쿼리 문제 방지
    #     → JOIN 쿼리를 사용하여 한 번의 쿼리로 문의와 사용자 정보를 함께 가져옴
    #     → 성능 최적화: 템플릿에서 {{ qna.user.name }}을 사용할 때 추가 쿼리가 발생하지 않음
    #   - qna_id=qna_id: URL에서 전달된 문의 ID로 조회
    #     → 예: /admin_panel/qna/123/ → qna_id=123
    #   - 반환값: Qna 객체 (사용자 정보 포함)
    #   - 예외: 해당 qna_id를 가진 문의가 없으면 Http404 예외 발생 → 404 에러 페이지 표시
    # 결과: 문의 객체와 관련된 사용자 정보가 포함된 쿼리셋에서 특정 문의를 조회
    qna = get_object_or_404(Qna.objects.select_related('user'), qna_id=qna_id)
    
    # ========= 답변 저장 처리 (POST 요청) =========
    # 관리자가 문의에 답변을 작성하거나 취소할 때 처리하는 로직
    # JavaScript에서 폼 제출 또는 AJAX 요청으로 전달됨
    
    # HTTP 요청 메서드 확인
    # request.method: HTTP 요청 메서드 ('GET', 'POST', 'PUT', 'DELETE' 등)
    #   - 'POST': 폼 제출, 데이터 수정/삭제 등에 사용
    #   - 'GET': 데이터 조회에 사용 (기본값)
    #   - 이 블록은 POST 요청일 때만 실행됨 (답변 저장/취소 액션 처리)
    if request.method == 'POST':
        # POST 데이터에서 액션 타입 가져오기
        # request.POST.get('action'): HTTP POST 요청의 폼 데이터에서 'action' 값을 가져옴
        #   - 'reply': 답변 저장
        #   - 'cancel': 답변 취소 (목록으로 돌아가기)
        #   - 기본값: None (action 파라미터가 없으면)
        action = request.POST.get('action')
        
        if action == 'reply':
            # ========= 답변 저장 처리 =========
            # POST 데이터에서 답변 내용 가져오기
            # request.POST.get('reply_content', ''): HTTP POST 요청의 폼 데이터에서 'reply_content' 값을 가져옴
            #   - 'reply_content': 답변 내용 (관리자가 입력한 텍스트)
            #   - '': 기본값 (reply_content 파라미터가 없으면 빈 문자열 반환)
            # .strip(): 문자열 앞뒤 공백 제거
            #   - 예: '  답변 내용  ' → '답변 내용'
            #   - 이유: 사용자가 실수로 공백을 입력했을 때 빈 답변으로 저장되는 것을 방지
            reply_content = request.POST.get('reply_content', '').strip()
            
            # 답변 내용이 비어있지 않은 경우에만 저장
            # 빈 문자열('')이면 답변을 저장하지 않음 (유효성 검증)
            if reply_content:
                # 문의 객체의 reply 필드에 답변 내용 저장
                # qna.reply: Qna 모델의 reply 필드 (답변 내용을 저장하는 필드)
                #   - reply_content: 관리자가 입력한 답변 내용
                qna.reply = reply_content
                
                # 데이터베이스에 변경사항 저장
                # qna.save(): Qna 객체의 변경사항을 데이터베이스에 저장
                #   - SQL의 UPDATE 문과 동일한 역할
                #   - reply 필드가 업데이트됨
                #   - 반환값: None (저장 성공 시)
                qna.save()
                
                # ========= 답변 저장 후 문의 목록 페이지로 리다이렉트 =========
                # redirect('qna_list'): 답변 저장이 완료된 후 문의 목록 페이지로 리다이렉트
                #   - 'qna_list': URL 패턴 이름 (apps/admin_panel/urls.py에서 정의)
                #   - 리다이렉트 이유: POST 요청 후 GET 요청으로 전환하여 페이지 새로고침
                #     (브라우저의 뒤로가기 버튼으로 POST 요청이 다시 실행되는 것을 방지)
                #   - 반환값: HttpResponseRedirect 객체 (HTTP 302 응답)
                # 결과: 답변 저장 후 문의 목록 페이지가 새로고침되어 변경사항이 반영됨
                #   - 문의 목록에서 해당 문의의 상태가 "답변 완료"로 표시됨
                return redirect('qna_list')
        elif action == 'cancel':
            # ========= 답변 취소 처리 =========
            # 관리자가 답변 작성을 취소하고 목록으로 돌아가는 경우
            # 답변을 저장하지 않고 문의 목록 페이지로 리다이렉트
            # redirect('qna_list'): 문의 목록 페이지로 리다이렉트
            #   - 'qna_list': URL 패턴 이름 (apps/admin_panel/urls.py에서 정의)
            #   - 반환값: HttpResponseRedirect 객체 (HTTP 302 응답)
            # 결과: 답변 작성 페이지에서 문의 목록 페이지로 이동
            #   - 답변 내용은 저장되지 않음
            return redirect('qna_list')
    
    # ========= 템플릿에 전달할 컨텍스트 데이터 구성 =========
    # context: Django 템플릿에 전달할 변수들을 담은 딕셔너리
    # 템플릿에서 {{ 변수명 }} 형식으로 접근 가능
    # 예: {{ qna.title }}, {{ qna.content }}, {{ qna.user.name }} 등
    
    context = {
        # 문의 객체 (상세 정보)
        # qna: Qna 모델의 인스턴스 (user 정보 포함)
        #   - 템플릿에서 문의의 상세 정보를 표시할 때 사용
        #   - 예: {{ qna.title }} → 문의 제목
        #   - 예: {{ qna.content }} → 문의 내용
        #   - 예: {{ qna.reply }} → 답변 내용 (있으면 표시, 없으면 빈 문자열)
        #   - 예: {{ qna.user.name }} → 문의 작성자 이름
        #   - 예: {{ qna.user.email }} → 문의 작성자 이메일
        #   - 예: {{ qna.created_at }} → 문의 작성일
        #   - select_related('user')를 사용했으므로 추가 쿼리 없이 사용자 정보 접근 가능
        'qna': qna,
    }
    
    # ========= 템플릿 렌더링 및 HTTP 응답 반환 =========
    # render(): 템플릿을 렌더링하여 HttpResponse 객체를 반환하는 Django 함수
    #   - request: HTTP 요청 객체 (템플릿에서 request.user 등을 사용할 수 있도록 전달)
    #   - 'admin_panel/qna_detail.html': 렌더링할 템플릿 파일 경로
    #     → apps/admin_panel/templates/admin_panel/qna_detail.html 파일을 찾음
    #   - context: 템플릿에 전달할 데이터 딕셔너리
    #     → 템플릿에서 {{ 변수명 }} 형식으로 접근 가능
    # 반환값: HttpResponse 객체 (HTML 응답)
    #   - 브라우저에 전체 HTML 페이지가 전송됨
    #   - 템플릿이 렌더링되어 문의 상세 정보, 답변 작성 폼 등이 모두 포함된 HTML 생성
    #   - 예: 문의 제목, 문의 내용, 작성자 정보, 답변 내용(있으면), 답변 작성 폼 등
    return render(request, 'admin_panel/qna_detail.html', context)


def create_user_dummy_data(request):
    """
    더미 사용자 데이터 생성
    - 테스트용 사용자 데이터 생성 (8명)
    - 주민번호, 이메일, 전화번호 자동 생성
    - created_at을 오늘 날짜로 설정
    """
    # ========= 필요한 모듈 import =========
    # django.contrib.auth.hashers.make_password: 비밀번호를 해시화하는 Django 함수
    #   - 비밀번호를 평문으로 저장하지 않고 해시화하여 보안 강화
    #   - 예: '1234' → 'pbkdf2_sha256$...' (해시된 문자열)
    #   - 데이터베이스에 저장될 때는 해시된 값이 저장됨
    from django.contrib.auth.hashers import make_password
    
    # random: 랜덤 값을 생성하는 Python 표준 라이브러리
    #   - random.randint(): 지정된 범위 내의 랜덤 정수 생성
    #   - random.choice(): 리스트에서 랜덤으로 하나 선택
    #   - 주민번호, 이메일, 전화번호 등을 랜덤으로 생성할 때 사용
    import random
    
    # ========= 기존 더미 사용자 중 가장 큰 번호 찾기 =========
    # 목적: 기존에 생성된 더미 사용자와 중복되지 않도록 새로운 번호를 할당하기 위함
    # 예: 기존에 user01, user02, user05가 있으면 → 다음 번호는 user06부터 시작
    
    # 기존 더미 사용자 조회
    # Users.objects.filter(...): 조건에 맞는 사용자들을 필터링
    #   - username__regex=r'^user\d+$': username이 'user'로 시작하고 숫자로 끝나는 패턴 매칭
    #     → 정규표현식 설명:
    #       - ^: 문자열의 시작
    #       - user: 'user' 문자열
    #       - \d+: 하나 이상의 숫자 (0-9)
    #       - $: 문자열의 끝
    #     → 예: 'user01', 'user02', 'user123' 등이 매칭됨
    #     → 예: 'user', 'userabc', 'admin01' 등은 매칭되지 않음
    #   - role='USER': 일반 사용자만 필터링 (의사 제외)
    #     → role='DOCTOR'인 사용자는 제외
    # .values_list('username', flat=True): username 필드만 리스트로 가져옴
    #   - 'username': 가져올 필드명
    #   - flat=True: 튜플이 아닌 단순 리스트로 반환
    #     → 예: ['user01', 'user02', 'user05'] (튜플 리스트가 아님)
    #   - 반환값: username 문자열 리스트
    existing_users = Users.objects.filter(
        username__regex=r'^user\d+$',
        role='USER'
    ).values_list('username', flat=True)
    
    # 가장 큰 번호를 저장할 변수 초기화
    # max_num: 기존 더미 사용자 중 가장 큰 번호 (예: user05 → 5)
    # 초기값: 0 (더미 사용자가 없으면 0)
    max_num = 0
    
    # 각 username에서 번호 추출하여 최대값 찾기
    # existing_users: ['user01', 'user02', 'user05', ...] 형식의 리스트
    for username in existing_users:
        # 정규표현식으로 username에서 번호 추출
        # re.match(r'^user(\d+)$', username): username이 'user' + 숫자 형식인지 확인하고 숫자 부분 추출
        #   - r'^user(\d+)$': 정규표현식 패턴
        #     → ^: 문자열의 시작
        #     → user: 'user' 문자열
        #     → (\d+): 하나 이상의 숫자를 그룹으로 캡처 (괄호로 묶음)
        #     → $: 문자열의 끝
        #   - match: 매칭 결과 객체 (매칭되면 Match 객체, 안 되면 None)
        #   - 예: 'user01' → 매칭됨, 'user' → 매칭 안 됨
        match = re.match(r'^user(\d+)$', username)
        
        # 매칭된 경우에만 번호 추출
        if match:
            # match.group(1): 첫 번째 캡처 그룹(괄호로 묶인 부분)의 값을 가져옴
            #   - group(0): 전체 매칭된 문자열 ('user01')
            #   - group(1): 첫 번째 그룹의 값 ('01')
            #   - 예: 'user01' → group(1) = '01'
            # int(...): 문자열을 정수로 변환
            #   - 예: '01' → 1, '123' → 123
            #   - 앞의 0은 자동으로 제거됨 (예: '01' → 1)
            num = int(match.group(1))
            
            # 현재 번호가 기존 최대값보다 크면 최대값 업데이트
            # if num > max_num: 현재 번호가 지금까지 찾은 최대값보다 큰 경우
            #   - 예: max_num=2, num=5 → 5 > 2 → max_num = 5로 업데이트
            if num > max_num:
                max_num = num
    
    # ========= 시작 번호 설정 (기존 번호 다음부터) =========
    # start_num: 새로 생성할 더미 사용자의 시작 번호
    # max_num + 1: 기존 최대 번호에 1을 더한 값
    #   - 예: 기존에 user01, user02, user05가 있으면 max_num=5 → start_num=6
    #   - 예: 더미 사용자가 없으면 max_num=0 → start_num=1
    # 결과: 새로 생성되는 사용자는 user06, user07, user08, ... 형식으로 생성됨
    #   - 기존 사용자와 중복되지 않도록 보장
    start_num = max_num + 1
    
    # 성씨 목록
    surnames = ['김', '이', '박', '최', '유', '조', '가', '임', '하', '성', '정', '강', '고', '윤', '손', '오', '한', '백', '전', '서', '문', '남']
    
    # 이름 목록
    given_names = [
        '지우', '서준', '민서', '하준', '유진', '예린', '세영', '도윤', '아린', '시온',
        '나연', '태훈', '다온', '하림', '윤호', '예슬', '지안', '현아', '건우', '세아',
        '주원', '민재', '소연', '지유', '서아', '연우', '라희', '지호', '다혜', '나윤',
        '태영', '규민', '세나', '아현', '준영', '은서', '도하', '민혁', '현지', '아준',
        '윤아', '지훈', '채원', '효린', '준서', '예나', '수아', '소민', '한별', '현우',
        '다솔', '라온', '민호', '하연', '윤재', '시윤', '민아', '아라', '태민', '유림'
    ]
    
    # 주소 데이터 (시, 군/구, 동 포함)
    address_data = {
        '서울특별시 강남구': ['역삼동', '삼성동', '청담동', '논현동', '압구정동', '신사동', '대치동', '도곡동'],
        '서울특별시 서초구': ['반포동', '잠원동', '방배동', '양재동', '서초동', '내곡동', '염곡동', '신원동'],
        '서울특별시 송파구': ['잠실동', '문정동', '방이동', '오금동', '석촌동', '삼전동', '가락동', '거여동'],
        '경기도 성남시 분당구': ['정자동', '서현동', '이매동', '야탑동', '판교동', '백현동', '구미동', '운중동'],
        '인천광역시 남동구': ['구월동', '간석동', '만수동', '장수동', '서창동', '논현동', '도림동', '고잔동'],
        '부산광역시 해운대구': ['우동', '좌동', '중동', '송정동', '반송동', '재송동', '반여동', '석대동'],
        '대전광역시 서구': ['둔산동', '용문동', '탄방동', '괴정동', '가장동', '도마동', '정림동', '변동'],
        '광주광역시 남구': ['봉선동', '주월동', '방림동', '송하동', '양림동', '사동', '구동', '월산동'],
    }
    
    # 지역 목록
    city_districts = list(address_data.keys())
    
    # 더미 사용자 데이터 생성 (8명씩, 동명이인 없이)
    user_templates = []
    used_names = set()  # 이미 사용된 이름 조합을 추적
    
    for i in range(8):
        # 성씨와 이름을 랜덤으로 조합하여 동명이인 방지
        while True:
            surname = random.choice(surnames)
            given_name = random.choice(given_names)
            full_name = f'{surname}{given_name}'
            
            # 동명이인이 없으면 사용
            if full_name not in used_names:
                used_names.add(full_name)
                break
        
        # 지역 할당 (순환)
        city_district = city_districts[i % len(city_districts)]
        
        # 성별 랜덤 할당
        gender = random.choice(['M', 'W'])
        
        user_templates.append({
            'name': full_name,
            'gender': gender,
            'city_district': city_district
        })
    
    created_count = 0
    for i, template in enumerate(user_templates):
        # 사용자명 생성 (누적 번호)
        username = f'user{start_num + i:02d}'
        
        # 이미 존재하는지 확인 (안전장치)
        if Users.objects.filter(username=username).exists():
            continue
        
        # 주민번호 생성 (YYMMDD-GXXXXXX 형식)
        # 앞자리: YYMMDD (년월일)
        # 1950년~2024년 범위로 랜덤 생성
        year_range = random.choice(['1900s', '2000s'])
        if year_range == '1900s':
            yy = random.randint(50, 99)  # 1950년~1999년
            # 뒷자리 첫 자리: 성별에 따라 (남자: 1, 여자: 2) - 1900년대
            if template['gender'] == 'M':
                first_digit = 1  # 남자
            else:
                first_digit = 2  # 여자
        else:  # 2000s
            yy = random.randint(0, 24)  # 2000년~2024년
            # 뒷자리 첫 자리: 성별에 따라 (남자: 3, 여자: 4) - 2000년대
            if template['gender'] == 'M':
                first_digit = 3  # 남자
            else:
                first_digit = 4  # 여자
        
        mm = random.randint(1, 12)  # 월: 1-12
        dd = random.randint(1, 31)  # 일: 1-31
        front_reg = f'{yy:02d}{mm:02d}{dd:02d}'
        
        back_reg = f'{first_digit}{random.randint(0, 999999):06d}'  # 나머지 6자리
        resident_reg_no = f'{front_reg}{back_reg}'  # 하이픈 없이 저장
        
        # 이메일 생성
        email = f'{username}@gmail.com' if (start_num + i) % 2 == 1 else f'{username}@naver.com'
        
        # 전화번호 생성
        phone = f'010-{random.randint(1000, 9999)}-{random.randint(1000, 9999)}'
        
        # 주소 생성 (시, 군/구, 동 포함)
        city_district = template['city_district']
        dong_list = address_data.get(city_district, ['동'])
        dong = random.choice(dong_list)
        address = f'{city_district} {dong}'
        
        # 사용자 생성
        user = Users.objects.create(
            username=username,
            password=make_password('1234'),  # 기본 비밀번호: 1234
            name=template['name'],
            email=email,
            phone=phone,
            gender=template['gender'],
            resident_reg_no=resident_reg_no,
            mail_confirm='Y',
            address=address,
            provider='local',
            role='USER',
            withdrawal='0',
        )
        # created_at을 오늘 날짜의 시작 시간으로 설정 (auto_now_add=True 필드는 원시 SQL로 직접 수정)
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        with connection.cursor() as cursor:
            cursor.execute(
                "UPDATE users SET created_at = %s WHERE user_id = %s",
                [today_start, user.user_id]
            )
        user.refresh_from_db()  # 객체를 다시 로드하여 변경사항 반영
        created_count += 1
    
    return redirect('user_list')


def create_admin_account(request):
    """
    관리자 계정 생성
    - 관리자 계정 생성 (admin01, 비밀번호 1234, role='ADMIN')
    """
    from django.contrib.auth.hashers import make_password
    
    # 관리자 계정이 이미 존재하는지 확인
    if Users.objects.filter(username='admin01', role='ADMIN').exists():
        # 이미 존재하면 업데이트 (비밀번호만 변경)
        admin_user = Users.objects.get(username='admin01', role='ADMIN')
        admin_user.password = make_password('1234')
        admin_user.save()
        return redirect('admin_dashboard')
    
    # 관리자 계정 생성
    admin_user = Users.objects.create(
        username='admin01',
        password=make_password('1234'),
        name='관리자',
        email='admin01@carebridge.com',
        phone='010-0000-0000',
        gender='M',
        resident_reg_no='000000-0000000',
        mail_confirm='Y',
        address='서울특별시',
        provider='local',
        role='ADMIN',
        withdrawal='0',
    )
    
    return redirect('admin_dashboard')


def create_doctor_dummy_data(request):
    """
    더미 의사 데이터 생성
    - 테스트용 의사 데이터 생성 (5명)
    - 전공과: 내과(IM), 외과(GS), 정형외과(OR), 소아과(PD), 이비인후과(EN)
    - 면허번호: 전공과 영어코드 + 주민번호 뒷자리
    - 첫 번째 의사는 면허번호와 주민번호가 일치하지 않도록 설정 (테스트용)
    
    이 함수가 필요한 이유:
    1. 개발 및 테스트 환경에서 의사 데이터가 필요할 때 빠르게 생성
       - 실제 의사 정보를 입력하지 않고도 테스트 가능
       - 다양한 전공과, 병원, 면허번호 검증 시나리오 테스트 가능
    2. 관리자 패널의 의사 목록, 승인 대기 기능 등을 테스트하기 위함
       - 의사 목록 페이지네이션 테스트
       - 의사 승인/거절 기능 테스트
       - 면허번호 검증 로직 테스트 (첫 번째 의사는 불일치로 설정)
    3. 여러 번 실행해도 중복되지 않도록 번호 자동 증가
       - 기존 더미 의사 번호를 확인하여 다음 번호부터 생성
       - 예: doctor01~05가 있으면 → doctor06~10 생성
       - 데이터베이스 무결성 보장 (username 고유성)
    """
    from django.contrib.auth.hashers import make_password
    import random
    
    # 전공과 정보 (이름, 코드)
    departments = [
        {'name': '내과', 'code': 'IM'},
        {'name': '외과', 'code': 'GS'},
        {'name': '정형외과', 'code': 'OR'},
        {'name': '소아과', 'code': 'PD'},
        {'name': '이비인후과', 'code': 'EN'},
    ]
    
    # ========= 전공과 생성 또는 조회 =========
    # 목적: 더미 의사 데이터 생성 시 필요한 전공과(Department) 객체를 준비
    #   - 전공과가 이미 존재하면 조회, 없으면 생성
    #   - 전공과 코드가 다르면 업데이트하여 일관성 유지
    
    # 전공과 객체를 저장할 딕셔너리 초기화
    # dept_objects: 전공과 이름을 키로, Department 객체를 값으로 저장하는 딕셔너리
    #   - 예: {'내과': <Department: 내과>, '외과': <Department: 외과>, ...}
    #   - 나중에 의사 생성 시 전공과 정보를 빠르게 조회하기 위해 사용
    #   - 키: 전공과 이름 (예: '내과', '외과')
    #   - 값: Department 모델 인스턴스
    dept_objects = {}
    
    # 각 전공과 정보를 순회하며 생성 또는 조회
    # departments: [{'name': '내과', 'code': 'IM'}, {'name': '외과', 'code': 'GS'}, ...]
    for dept_info in departments:
        # ========= 전공과 생성 또는 조회 =========
        # Department.objects.get_or_create(...): Django ORM의 편의 메서드
        #   - 전공과가 존재하면 조회(get), 없으면 생성(create)
        #   - 반환값: (객체, 생성 여부) 튜플
        #     → 객체: Department 모델 인스턴스
        #     → 생성 여부: True(새로 생성됨), False(기존 객체 조회)
        
        # dep_name=dept_info['name']: 조회 또는 생성할 전공과 이름
        #   - 예: '내과', '외과', '정형외과' 등
        #   - 이 값으로 기존 전공과를 찾거나 새로 생성할 때 사용
        
        # defaults={'dep_code': dept_info['code']}: 새로 생성할 때 사용할 기본값
        #   - dep_code: 전공과 코드 (예: 'IM', 'GS', 'OR' 등)
        #   - 전공과가 없을 때만 이 값으로 생성됨
        #   - 전공과가 이미 존재하면 이 값은 무시됨
        
        # 동작 방식:
        #   1. dep_name='내과'로 기존 전공과 조회 시도
        #   2. 존재하면: (기존 Department 객체, False) 반환
        #   3. 없으면: dep_code='IM'으로 새로 생성하고 (새 Department 객체, True) 반환
        dept, created = Department.objects.get_or_create(
            dep_name=dept_info['name'],
            defaults={'dep_code': dept_info['code']}
        )
        
        # ========= 전공과 코드 일관성 확인 및 업데이트 =========
        # 기존 전공과가 존재하는데 코드가 다른 경우 업데이트
        # 목적: 데이터베이스에 저장된 전공과 코드가 템플릿의 코드와 다를 때 일치시킴
        #   - 예: 기존에 '내과'가 dep_code='INTERNAL'로 저장되어 있는데
        #         템플릿에서는 'IM'을 사용하는 경우 → 'IM'으로 업데이트
        
        # if not created: 전공과가 새로 생성된 것이 아닌 경우 (기존 객체 조회)
        #   - created=False: 기존 전공과를 조회한 경우
        #   - created=True: 새로 생성한 경우 (이 조건문은 실행되지 않음)
        
        # and dept.dep_code != dept_info['code']: 전공과 코드가 다른 경우
        #   - dept.dep_code: 데이터베이스에 저장된 전공과 코드
        #   - dept_info['code']: 템플릿에서 정의한 전공과 코드
        #   - 예: dept.dep_code='INTERNAL', dept_info['code']='IM' → 다름 → 업데이트 필요
        if not created and dept.dep_code != dept_info['code']:
            # 기존 코드가 다르면 업데이트
            # dept.dep_code: Department 객체의 dep_code 필드에 새로운 코드 할당
            #   - 예: 'INTERNAL' → 'IM'
            dept.dep_code = dept_info['code']
            
            # 데이터베이스에 변경사항 저장
            # dept.save(): Department 객체의 변경사항을 데이터베이스에 저장
            #   - SQL의 UPDATE 문과 동일한 역할
            #   - dep_code 필드가 업데이트됨
            #   - 반환값: None (저장 성공 시)
            dept.save()
        
        # ========= 딕셔너리에 전공과 객체 저장 =========
        # dept_objects[dept_info['name']] = dept: 전공과 이름을 키로, Department 객체를 값으로 저장
        #   - 예: dept_objects['내과'] = <Department: 내과>
        #   - 예: dept_objects['외과'] = <Department: 외과>
        # 목적: 나중에 의사 생성 시 전공과 이름으로 빠르게 Department 객체를 조회하기 위함
        #   - 예: dept = dept_objects['내과'] → <Department: 내과> 객체 반환
        #   - 데이터베이스 쿼리 없이 메모리에서 바로 조회 가능 (성능 향상)
        dept_objects[dept_info['name']] = dept
    
    # 병원이 없으면 생성
    if Hospital.objects.count() == 0:
        # 기본 병원 생성
        Hospital.objects.create(
            hpid='TEST001',
            name='테스트 병원',
            hos_name='테스트병원',
            hos_password='1234',
            address='서울특별시 강남구',
            tel='02-1234-5678',
        )
    
    # 병원 목록 가져오기
    hospitals = list(Hospital.objects.all())
    if not hospitals:
        return redirect('doctor_list')
    
    # ========= 기존 더미 의사 중 가장 큰 번호 찾기 =========
    # 목적: 기존에 생성된 더미 의사와 중복되지 않도록 새로운 번호를 할당하기 위함
    # 예: 기존에 doctor01, doctor02, doctor05가 있으면 → 다음 번호는 doctor06부터 시작
    # 
    # 이 로직이 필요한 이유:
    # 1. 여러 번 더미 데이터를 생성할 때마다 번호가 계속 증가하도록 하기 위함
    #    - 첫 번째 실행: doctor01, doctor02, doctor03, doctor04, doctor05 생성
    #    - 두 번째 실행: doctor06, doctor07, doctor08, doctor09, doctor10 생성
    #    - 세 번째 실행: doctor11, doctor12, doctor13, doctor14, doctor15 생성
    # 2. 기존 더미 데이터를 삭제하지 않고 추가로 생성할 수 있도록 하기 위함
    #    - 기존 doctor01~05가 있는 상태에서 추가로 5명 생성 → doctor06~10 생성
    # 3. 데이터베이스 무결성 보장
    #    - username은 고유해야 하므로 중복 방지
    #    - 기존 데이터와 충돌하지 않도록 보장
    
    # 기존 더미 의사 조회
    # Users.objects.filter(...): 조건에 맞는 사용자들을 필터링
    #   - username__regex=r'^doctor\d+$': username이 'doctor'로 시작하고 숫자로 끝나는 패턴 매칭
    #     → 정규표현식 설명:
    #       - ^: 문자열의 시작
    #       - doctor: 'doctor' 문자열
    #       - \d+: 하나 이상의 숫자 (0-9)
    #       - $: 문자열의 끝
    #     → 예: 'doctor01', 'doctor02', 'doctor123' 등이 매칭됨
    #     → 예: 'doctor', 'doctorabc', 'user01' 등은 매칭되지 않음
    #   - role='DOCTOR': 의사 역할만 필터링 (일반 사용자 제외)
    #     → role='USER'인 사용자는 제외
    # .values_list('username', flat=True): username 필드만 리스트로 가져옴
    #   - 'username': 가져올 필드명
    #   - flat=True: 튜플이 아닌 단순 리스트로 반환
    #     → 예: ['doctor01', 'doctor02', 'doctor05'] (튜플 리스트가 아님)
    #   - 반환값: username 문자열 리스트
    existing_doctors = Users.objects.filter(
        username__regex=r'^doctor\d+$',
        role='DOCTOR'
    ).values_list('username', flat=True)
    
    # 가장 큰 번호를 저장할 변수 초기화
    # max_num: 기존 더미 의사 중 가장 큰 번호 (예: doctor05 → 5)
    # 초기값: 0 (더미 의사가 없으면 0)
    max_num = 0
    
    # 각 username에서 번호 추출하여 최대값 찾기
    # existing_doctors: ['doctor01', 'doctor02', 'doctor05', ...] 형식의 리스트
    for username in existing_doctors:
        # 정규표현식으로 username에서 번호 추출
        # re.match(r'^doctor(\d+)$', username): username이 'doctor' + 숫자 형식인지 확인하고 숫자 부분 추출
        #   - r'^doctor(\d+)$': 정규표현식 패턴
        #     → ^: 문자열의 시작
        #     → doctor: 'doctor' 문자열
        #     → (\d+): 하나 이상의 숫자를 그룹으로 캡처 (괄호로 묶음)
        #     → $: 문자열의 끝
        #   - match: 매칭 결과 객체 (매칭되면 Match 객체, 안 되면 None)
        #   - 예: 'doctor01' → 매칭됨, 'doctor' → 매칭 안 됨
        match = re.match(r'^doctor(\d+)$', username)
        
        # 매칭된 경우에만 번호 추출
        if match:
            # match.group(1): 첫 번째 캡처 그룹(괄호로 묶인 부분)의 값을 가져옴
            #   - group(0): 전체 매칭된 문자열 ('doctor01')
            #   - group(1): 첫 번째 그룹의 값 ('01')
            #   - 예: 'doctor01' → group(1) = '01'
            # int(...): 문자열을 정수로 변환
            #   - 예: '01' → 1, '123' → 123
            #   - 앞의 0은 자동으로 제거됨 (예: '01' → 1)
            num = int(match.group(1))
            
            # 현재 번호가 기존 최대값보다 크면 최대값 업데이트
            # if num > max_num: 현재 번호가 지금까지 찾은 최대값보다 큰 경우
            #   - 예: max_num=2, num=5 → 5 > 2 → max_num = 5로 업데이트
            if num > max_num:
                max_num = num
    
    # ========= 시작 번호 설정 (기존 번호 다음부터) =========
    # start_num: 새로 생성할 더미 의사의 시작 번호
    # max_num + 1: 기존 최대 번호에 1을 더한 값
    #   - 예: 기존에 doctor01, doctor02, doctor05가 있으면 max_num=5 → start_num=6
    #   - 예: 더미 의사가 없으면 max_num=0 → start_num=1
    # 결과: 새로 생성되는 의사는 doctor06, doctor07, doctor08, ... 형식으로 생성됨
    #   - 기존 의사와 중복되지 않도록 보장
    #   - username 고유성 제약 조건을 만족
    start_num = max_num + 1
    
    # 성씨 목록
    surnames = ['김', '이', '박', '최', '유', '조', '가', '임', '하', '성', '정', '강', '고', '윤', '손', '오', '한', '백', '전', '서', '문', '남']
    
    # 이름 목록
    given_names = [
        '지우', '서준', '민서', '하준', '유진', '예린', '세영', '도윤', '아린', '시온',
        '나연', '태훈', '다온', '하림', '윤호', '예슬', '지안', '현아', '건우', '세아',
        '주원', '민재', '소연', '지유', '서아', '연우', '라희', '지호', '다혜', '나윤',
        '태영', '규민', '세나', '아현', '준영', '은서', '도하', '민혁', '현지', '아준',
        '윤아', '지훈', '채원', '효린', '준서', '예나', '수아', '소민', '한별', '현우',
        '다솔', '라온', '민호', '하연', '윤재', '시윤', '민아', '아라', '태민', '유림'
    ]
    
    # 전공과 목록
    departments_list = ['내과', '외과', '정형외과', '소아과', '이비인후과']
    
    # 더미 의사 데이터 생성 (5명씩, 동명이인 없이)
    doctor_templates = []
    used_names = set()  # 이미 사용된 이름 조합을 추적
    
    for i in range(5):
        # 성씨와 이름을 랜덤으로 조합하여 동명이인 방지
        while True:
            surname = random.choice(surnames)
            given_name = random.choice(given_names)
            full_name = f'{surname}{given_name}'
            
            # 동명이인이 없으면 사용
            if full_name not in used_names:
                used_names.add(full_name)
                break
        
        # 전공과 할당 (순환)
        department = departments_list[i % len(departments_list)]
        
        # 성별 랜덤 할당 (대략적인 성별 구분을 위해 이름의 마지막 글자로 판단하거나 랜덤)
        # 간단하게 랜덤으로 할당
        gender = random.choice(['M', 'W'])
        
        doctor_templates.append({
            'name': full_name,
            'gender': gender,
            'department': department
        })
    
    created_count = 0
    for i, template in enumerate(doctor_templates):
        # 사용자명 생성 (누적 번호)
        username = f'doctor{start_num + i:02d}'
        
        # 이미 존재하는지 확인 (안전장치)
        if Users.objects.filter(username=username).exists():
            continue
        
        # 주민번호 생성 (뒷자리 첫 자리는 1~2만)
        front_reg = f'{random.randint(500000, 999999)}'
        first_digit = random.choice([1, 2])  # 뒷자리 첫 자리는 1 또는 2
        back_reg = f'{first_digit}{random.randint(0, 999999):06d}'  # 나머지 6자리
        resident_reg_no = f'{front_reg}-{back_reg}'
        
        # 전공과 정보 가져오기
        dept = dept_objects[template['department']]
        
        # 면허번호 생성: 5명 중 1명(첫 번째)은 주민번호 뒷자리와 일치하지 않게
        if i == 0:  # 첫 번째 의사는 면허번호와 주민번호 뒷자리가 일치하지 않게
            # 다른 주민번호 뒷자리 생성
            wrong_back_reg = f'{first_digit}{random.randint(0, 999999):06d}'
            # back_reg와 다를 때까지 반복
            while wrong_back_reg == back_reg:
                wrong_back_reg = f'{first_digit}{random.randint(0, 999999):06d}'
            license_no = f"{dept.dep_code}${wrong_back_reg}"
        else:
            # 나머지는 정상적으로 주민번호 뒷자리와 일치
            license_no = f"{dept.dep_code}${back_reg}"
        
        # 이메일 생성
        email = f'{username}@hospital.com'
        
        # 전화번호 생성
        phone = f'010-{random.randint(1000, 9999)}-{random.randint(1000, 9999)}'
        
        # 사용자 생성
        user = Users.objects.create(
            username=username,
            password=make_password('1234'),
            name=template['name'],
            email=email,
            phone=phone,
            gender=template['gender'],
            resident_reg_no=resident_reg_no,
            mail_confirm='Y',
            address='서울특별시',
            provider='local',
            role='DOCTOR',
            withdrawal='0',
        )
        # created_at을 오늘 날짜의 시작 시간으로 설정 (auto_now_add=True 필드는 원시 SQL로 직접 수정)
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        with connection.cursor() as cursor:
            cursor.execute(
                "UPDATE users SET created_at = %s WHERE user_id = %s",
                [today_start, user.user_id]
            )
        user.refresh_from_db()  # 객체를 다시 로드하여 변경사항 반영
        
        # 병원 랜덤 할당
        hospital = random.choice(hospitals)
        
        # 의사 생성
        # 첫 번째 의사(면허번호 불일치)는 반드시 대기상태(verified=False)로 생성
        if i == 0:
            verified_status = False  # 면허번호 불일치 의사는 반드시 대기상태
        else:
            verified_status = random.choice([True, False])  # 나머지는 랜덤
        
        doctor = Doctors.objects.create(
            user=user,
            hos=hospital,
            dep=dept,
            license_no=license_no,
            verified=verified_status,
        )
        
        created_count += 1
    
    return redirect('doctor_list')


def create_qna_dummy_data(request):
    """
    더미 1:1 문의 데이터 생성
    - 테스트용 문의 데이터 생성 (5개)
    - 일부는 답변이 있는 문의, 일부는 답변이 없는 문의로 생성
    """
    from datetime import timedelta
    import random
    
    # 사용자 데이터 확인 (일반 사용자)
    users = list(Users.objects.filter(role='USER'))
    
    if not users:
        return redirect('qna_list')
    
    # 기존 더미 문의 중 가장 큰 번호 찾기 (제목 패턴으로)
    existing_qnas = Qna.objects.filter(
        title__startswith='더미 문의'
    ).values_list('title', flat=True)
    
    max_num = 0
    for title in existing_qnas:
        match = re.match(r'^더미 문의 (\d+)$', title)
        if match:
            num = int(match.group(1))
            if num > max_num:
                max_num = num
    
    # 시작 번호 설정 (기존 번호 다음부터)
    start_num = max_num + 1
    
    # ========= 더미 문의 데이터 템플릿 정의 =========
    # qna_templates: 더미 문의 데이터를 생성하기 위한 템플릿 리스트
    # 각 딕셔너리는 하나의 문의를 나타내며, 다음 필드를 포함:
    #   - title: 문의 제목 (원본 제목, 나중에 번호가 추가됨)
    #   - content: 문의 내용
    #   - has_reply: 답변이 있는지 여부 (True/False)
    #   - reply: 답변 내용 (has_reply=True인 경우에만 존재)
    # 
    # 목적: 다양한 시나리오의 문의 데이터를 생성하여 테스트
    #   - 답변이 있는 문의: 관리자가 답변을 작성한 상태 테스트
    #   - 답변이 없는 문의: 관리자가 답변을 작성해야 하는 상태 테스트
    #   - 다양한 문의 유형: 버튼 클릭 문제, 예약 문의, 정보 오류, 로그인 문제, 회원가입 문제 등
    qna_templates = [
        {'title': '버튼 클릭이 잘 안돼요~', 'content': '홈페이지에서 응급실 이동 버튼이 클릭이 잘 안돼요~!', 'has_reply': False},
        {'title': '병원 예약 관련 문의드립니다.', 'content': '병원 예약을 하고 싶은데 어떻게 해야 하나요?', 'has_reply': True, 'reply': '병원 예약은 병원 목록에서 원하는 병원을 선택하신 후 예약 버튼을 클릭하시면 됩니다.'},
        {'title': '응급실 정보가 이상해요', 'content': '응급실 정보가 실제와 다르게 표시되는 것 같습니다.', 'has_reply': False},
        {'title': '로그인이 안됩니다', 'content': '로그인을 시도하는데 계속 실패합니다.', 'has_reply': True, 'reply': '비밀번호를 확인해주시고, 그래도 안되시면 비밀번호 찾기를 이용해주세요.'},
        {'title': '회원가입 문의', 'content': '회원가입 시 이메일 인증이 안됩니다.', 'has_reply': False},
    ]
    
    # ========= 더미 문의 데이터 생성 =========
    # created_count: 성공적으로 생성된 문의의 개수를 저장하는 변수
    # 초기값: 0 (아직 생성된 문의가 없음)
    # 목적: 생성된 문의의 개수를 추적하여 디버깅이나 로깅에 사용 가능
    created_count = 0
    
    # 각 템플릿을 순회하며 문의 데이터 생성
    # enumerate(qna_templates): 템플릿 리스트를 순회하면서 인덱스와 템플릿을 함께 가져옴
    #   - i: 현재 템플릿의 인덱스 (0부터 시작)
    #   - template: 현재 템플릿 딕셔너리
    #   - 예: i=0, template={'title': '버튼 클릭이 잘 안돼요~', ...}
    for i, template in enumerate(qna_templates):
        # ========= 사용자 순환 할당 =========
        # users[i % len(users)]: 사용자 리스트에서 순환적으로 사용자 선택
        #   - i % len(users): 나머지 연산자를 사용하여 인덱스를 순환
        #   - 예: users가 3명이고 i=0,1,2,3,4일 때
        #     → i=0: users[0], i=1: users[1], i=2: users[2]
        #     → i=3: users[0], i=4: users[1] (순환)
        # 목적: 여러 문의를 생성할 때 사용자를 균등하게 분배
        #   - 한 사용자에게 모든 문의가 할당되는 것을 방지
        #   - 다양한 사용자의 문의 데이터를 생성하여 테스트 시나리오 확보
        user = users[i % len(users)]
        
        # ========= 제목에 번호 추가 (누적) =========
        # title: 최종 문의 제목 (원본 제목 + 번호)
        # f'더미 문의 {start_num + i}': 문자열 포맷팅을 사용하여 제목 생성
        #   - start_num: 기존 더미 문의 중 가장 큰 번호 + 1 (이전에 계산됨)
        #   - i: 현재 템플릿의 인덱스 (0부터 시작)
        #   - 예: start_num=6, i=0 → '더미 문의 6'
        #   - 예: start_num=6, i=1 → '더미 문의 7'
        # 목적: 각 문의를 고유하게 식별할 수 있도록 번호 부여
        #   - 기존 문의와 중복되지 않도록 보장
        #   - 나중에 삭제할 때 '더미 문의'로 시작하는 제목으로 필터링 가능
        title = f'더미 문의 {start_num + i}'
        
        # ========= 이미 존재하는지 확인 (안전장치) =========
        # Qna.objects.filter(...): 조건에 맞는 문의를 조회
        #   - title=title: 제목이 일치하는 문의
        #   - user=user: 작성자가 일치하는 문의
        # .exists(): 조건에 맞는 문의가 존재하는지 확인 (True/False)
        #   - 존재하면 True, 없으면 False
        #   - 실제 객체를 가져오지 않고 존재 여부만 확인하므로 효율적
        # 목적: 중복 생성을 방지하는 안전장치
        #   - 같은 제목과 작성자의 문의가 이미 존재하면 건너뛰기
        #   - 데이터베이스 무결성 보장 (중복 데이터 방지)
        #   - 예외 상황에서도 안전하게 동작하도록 보장
        if Qna.objects.filter(title=title, user=user).exists():
            # continue: 현재 반복을 건너뛰고 다음 반복으로 진행
            #   - 문의를 생성하지 않고 다음 템플릿으로 이동
            continue
        
        # ========= 문의 생성 =========
        # Qna.objects.create(...): Qna 모델의 새 인스턴스를 생성하고 데이터베이스에 저장
        #   - 반환값: 생성된 Qna 객체
        #   - SQL의 INSERT 문과 동일한 역할
        qna = Qna.objects.create(
            # title: 문의 제목 (번호가 추가된 최종 제목)
            #   - 예: '더미 문의 6'
            title=title,
            
            # content: 문의 내용 (템플릿에서 가져온 원본 내용)
            #   - template['content']: 템플릿 딕셔너리의 'content' 키 값
            #   - 예: '홈페이지에서 응급실 이동 버튼이 클릭이 잘 안돼요~!'
            content=template['content'],
            
            # user: 문의 작성자 (Users 모델 인스턴스)
            #   - 위에서 순환 할당된 사용자 객체
            #   - ForeignKey 관계로 Users 모델과 연결됨
            user=user,
            
            # created_at: 문의 작성일시 (과거 날짜로 설정)
            #   - timezone.now(): 현재 시간
            #   - timedelta(days=random.randint(0, 10)): 0일~10일 전의 랜덤 날짜
            #   - random.randint(0, 10): 0부터 10까지의 랜덤 정수
            #   - 예: 현재가 2024-01-10이면 → 2024-01-00 ~ 2024-01-10 사이의 랜덤 날짜
            # 목적: 더 현실적인 테스트 데이터 생성
            #   - 모든 문의가 같은 날짜에 생성되는 것이 아니라 다양한 날짜로 분산
            #   - 시간순 정렬, 날짜 필터링 등의 기능 테스트에 유용
            created_at=timezone.now() - timedelta(days=random.randint(0, 10))
        )
        
        # ========= 답변이 있는 경우 추가 =========
        # template.get('has_reply'): 템플릿에서 'has_reply' 키의 값을 가져옴
        #   - 키가 없으면 None 반환 (에러 발생 안 함)
        #   - 'has_reply': 답변이 있는지 여부 (True/False)
        # and template.get('reply'): 'reply' 키의 값도 존재하는지 확인
        #   - 'reply': 답변 내용 (문자열)
        #   - 키가 없거나 값이 None이면 False
        # 목적: 템플릿에서 답변이 있다고 표시된 경우에만 답변 내용을 저장
        #   - has_reply=True이고 reply 값이 있는 경우에만 실행
        #   - 답변이 있는 문의와 없는 문의를 구분하여 테스트 시나리오 확보
        if template.get('has_reply') and template.get('reply'):
            # qna.reply: Qna 객체의 reply 필드에 답변 내용 저장
            #   - template['reply']: 템플릿에서 가져온 답변 내용
            #   - 예: '병원 예약은 병원 목록에서 원하는 병원을 선택하신 후 예약 버튼을 클릭하시면 됩니다.'
            qna.reply = template['reply']
            
            # 데이터베이스에 변경사항 저장
            # qna.save(): Qna 객체의 변경사항을 데이터베이스에 저장
            #   - SQL의 UPDATE 문과 동일한 역할
            #   - reply 필드가 업데이트됨
            #   - 반환값: None (저장 성공 시)
            # 주의: create() 후에 save()를 호출하는 이유
            #   - create() 시점에는 reply 필드가 없었음
            #   - reply 필드를 추가한 후 별도로 save()를 호출하여 저장
            qna.save()
        
        # ========= 생성된 문의 개수 증가 =========
        # created_count += 1: 성공적으로 생성된 문의의 개수를 1 증가
        #   - 문의가 생성될 때마다 카운터가 증가
        #   - 중복으로 인해 건너뛴 경우는 증가하지 않음
        # 목적: 실제로 생성된 문의의 개수를 추적
        #   - 디버깅: 예상한 개수와 실제 생성된 개수를 비교
        #   - 로깅: 생성된 문의 개수를 로그에 기록 가능
        created_count += 1
    
    # ========= 문의 목록 페이지로 리다이렉트 =========
    # redirect('qna_list'): 더미 문의 데이터 생성이 완료된 후 문의 목록 페이지로 리다이렉트
    #   - 'qna_list': URL 패턴 이름 (apps/admin_panel/urls.py에서 정의)
    #   - 리다이렉트 이유: POST 요청 후 GET 요청으로 전환하여 페이지 새로고침
    #     (브라우저의 뒤로가기 버튼으로 POST 요청이 다시 실행되는 것을 방지)
    #   - 반환값: HttpResponseRedirect 객체 (HTTP 302 응답)
    # 결과: 더미 문의 생성 후 문의 목록 페이지가 새로고침되어 생성된 문의들이 표시됨
    #   - 문의 목록에서 새로 생성된 더미 문의들을 확인 가능
    #   - 답변이 있는 문의와 없는 문의가 구분되어 표시됨
    return redirect('qna_list')


def delete_qna_dummy_data(request):
    """
    더미 1:1 문의 데이터 삭제
    - 제목이 '더미 문의'로 시작하는 문의들 삭제
    """
    # ========= 더미 문의 데이터 삭제 =========
    # 목적: 테스트용으로 생성된 더미 문의 데이터를 일괄 삭제
    #   - 제목이 '더미 문의'로 시작하는 모든 문의를 삭제
    #   - 예: '더미 문의 1', '더미 문의 2', '더미 문의 6' 등 모두 삭제
    
    # 삭제된 문의의 개수를 저장할 변수 초기화
    # deleted_count: 성공적으로 삭제된 문의의 개수
    # 초기값: 0 (아직 삭제된 문의가 없음)
    # 목적: 삭제된 문의의 개수를 추적하여 디버깅이나 로깅에 사용 가능
    deleted_count = 0
    
    # ========= 더미 문의 조회 =========
    # Qna.objects.filter(...): 조건에 맞는 문의들을 필터링
    #   - title__startswith='더미 문의': 제목이 '더미 문의'로 시작하는 문의
    #     → title__startswith: Django ORM의 필드 조회 메서드
    #     → SQL의 LIKE '더미 문의%'와 동일한 역할
    #     → 예: '더미 문의 1', '더미 문의 2', '더미 문의 10' 등이 매칭됨
    #     → 예: '실제 문의', '더미 문의가 아닌 문의' 등은 매칭되지 않음
    #   - 반환값: QuerySet 객체 (조건에 맞는 Qna 객체들의 집합)
    #   - 아직 데이터베이스 쿼리는 실행되지 않음 (지연 평가)
    dummy_qnas = Qna.objects.filter(
        title__startswith='더미 문의'
    )
    
    # ========= 각 문의를 순회하며 삭제 =========
    # for qna in dummy_qnas: QuerySet을 순회하며 각 문의 객체를 가져옴
    #   - 이 시점에 데이터베이스 쿼리가 실행됨
    #   - 각 문의 객체는 Qna 모델의 인스턴스
    for qna in dummy_qnas:
        # ========= 문의 삭제 =========
        # qna.delete(): Qna 객체를 데이터베이스에서 삭제
        #   - SQL의 DELETE 문과 동일한 역할
        #   - 해당 문의의 모든 데이터가 데이터베이스에서 제거됨
        #   - 반환값: (deleted_count, {}) 튜플
        #     → deleted_count: 삭제된 객체의 개수 (보통 1)
        #     → {}: 관련 객체 삭제 정보 (이 경우는 빈 딕셔너리)
        #   - CASCADE 관계가 있으면 관련 객체도 함께 삭제될 수 있음
        #     (Qna 모델에 CASCADE 관계가 정의되어 있으면)
        qna.delete()
        
        # ========= 삭제된 문의 개수 증가 =========
        # deleted_count += 1: 성공적으로 삭제된 문의의 개수를 1 증가
        #   - 문의가 삭제될 때마다 카운터가 증가
        #   - 목적: 실제로 삭제된 문의의 개수를 추적
        #     - 디버깅: 예상한 개수와 실제 삭제된 개수를 비교
        #     - 로깅: 삭제된 문의 개수를 로그에 기록 가능
        deleted_count += 1
    
    # ========= 문의 목록 페이지로 리다이렉트 =========
    # redirect('qna_list'): 더미 문의 데이터 삭제가 완료된 후 문의 목록 페이지로 리다이렉트
    #   - 'qna_list': URL 패턴 이름 (apps/admin_panel/urls.py에서 정의)
    #   - 리다이렉트 이유: POST 요청 후 GET 요청으로 전환하여 페이지 새로고침
    #     (브라우저의 뒤로가기 버튼으로 POST 요청이 다시 실행되는 것을 방지)
    #   - 반환값: HttpResponseRedirect 객체 (HTTP 302 응답)
    # 결과: 더미 문의 삭제 후 문의 목록 페이지가 새로고침되어 삭제된 문의들이 목록에서 제거됨
    #   - 문의 목록에서 더미 문의들이 사라진 것을 확인 가능
    return redirect('qna_list')


def delete_user_dummy_data(request):
    """
    더미 사용자 데이터 삭제
    - username이 'user'로 시작하고 role='USER'인 사용자들 삭제
    """
    # ========= 더미 사용자 데이터 삭제 =========
    # 목적: 테스트용으로 생성된 더미 사용자 데이터를 일괄 삭제
    #   - username이 'user'로 시작하고 role='USER'인 사용자들을 삭제
    #   - 예: 'user01', 'user02', 'user10' 등 모두 삭제
    #   - 주의: 'user'로 시작하지만 숫자가 아닌 사용자는 삭제되지 않음 (안전장치)
    
    # from django.db.models import Q: Django ORM의 Q 객체를 import
    #   - Q 객체: 복잡한 쿼리 조건을 구성할 때 사용
    #   - 이 함수에서는 사용하지 않지만, 향후 확장을 위해 import되어 있을 수 있음
    #   - 실제로는 사용되지 않으므로 제거해도 무방하지만, 기존 코드 유지
    from django.db.models import Q
    
    # 삭제된 사용자의 개수를 저장할 변수 초기화
    # deleted_count: 성공적으로 삭제된 사용자의 개수
    # 초기값: 0 (아직 삭제된 사용자가 없음)
    # 목적: 삭제된 사용자의 개수를 추적하여 디버깅이나 로깅에 사용 가능
    deleted_count = 0
    
    # ========= 더미 사용자 조회 =========
    # Users.objects.filter(...): 조건에 맞는 사용자들을 필터링
    #   - username__startswith='user': username이 'user'로 시작하는 사용자
    #     → username__startswith: Django ORM의 필드 조회 메서드
    #     → SQL의 LIKE 'user%'와 동일한 역할
    #     → 예: 'user01', 'user02', 'user10', 'userabc' 등이 매칭됨
    #   - role='USER': 일반 사용자 역할만 필터링
    #     → role='DOCTOR'인 사용자는 제외
    #     → 의사 데이터는 별도의 함수(delete_doctor_dummy_data)에서 삭제
    #   - 반환값: QuerySet 객체 (조건에 맞는 Users 객체들의 집합)
    #   - 아직 데이터베이스 쿼리는 실행되지 않음 (지연 평가)
    dummy_users = Users.objects.filter(
        username__startswith='user',
        role='USER'
    )
    
    # ========= 각 사용자를 순회하며 삭제 =========
    # for user in dummy_users: QuerySet을 순회하며 각 사용자 객체를 가져옴
    #   - 이 시점에 데이터베이스 쿼리가 실행됨
    #   - 각 사용자 객체는 Users 모델의 인스턴스
    for user in dummy_users:
        # ========= 더미 사용자 패턴 확인 (안전장치) =========
        # re.match(r'^user\d+$', user.username): username이 'user' + 숫자 형식인지 확인
        #   - r'^user\d+$': 정규표현식 패턴
        #     → ^: 문자열의 시작
        #     → user: 'user' 문자열
        #     → \d+: 하나 이상의 숫자 (0-9)
        #     → $: 문자열의 끝
        #   - match: 매칭 결과 객체 (매칭되면 Match 객체, 안 되면 None)
        #   - 예: 'user01' → 매칭됨, 'user02' → 매칭됨
        #   - 예: 'user', 'userabc', 'admin01' → 매칭 안 됨
        # 목적: 안전장치로 더미 사용자만 삭제하도록 보장
        #   - 'user'로 시작하지만 숫자가 아닌 사용자는 삭제하지 않음
        #   - 예: 'useradmin', 'usertest' 등은 삭제되지 않음
        #   - 실수로 중요한 사용자 데이터를 삭제하는 것을 방지
        if re.match(r'^user\d+$', user.username):
            # ========= 사용자 삭제 =========
            # user.delete(): Users 객체를 데이터베이스에서 삭제
            #   - SQL의 DELETE 문과 동일한 역할
            #   - 해당 사용자의 모든 데이터가 데이터베이스에서 제거됨
            #   - 반환값: (deleted_count, {}) 튜플
            #     → deleted_count: 삭제된 객체의 개수 (보통 1)
            #     → {}: 관련 객체 삭제 정보
            #   - CASCADE 관계가 있으면 관련 객체도 함께 삭제될 수 있음
            #     - 예: UserFavorite, Qna 등이 CASCADE로 설정되어 있으면 함께 삭제
            #   - 주의: 의사(Doctors)와 연결된 사용자는 이 함수에서 삭제되지 않음
            #     (role='DOCTOR'이므로 필터링에서 제외됨)
            user.delete()
            
            # ========= 삭제된 사용자 개수 증가 =========
            # deleted_count += 1: 성공적으로 삭제된 사용자의 개수를 1 증가
            #   - 사용자가 삭제될 때마다 카운터가 증가
            #   - 패턴에 맞지 않아 건너뛴 경우는 증가하지 않음
            #   - 목적: 실제로 삭제된 사용자의 개수를 추적
            #     - 디버깅: 예상한 개수와 실제 삭제된 개수를 비교
            #     - 로깅: 삭제된 사용자 개수를 로그에 기록 가능
            deleted_count += 1
    
    # ========= 사용자 목록 페이지로 리다이렉트 =========
    # redirect('user_list'): 더미 사용자 데이터 삭제가 완료된 후 사용자 목록 페이지로 리다이렉트
    #   - 'user_list': URL 패턴 이름 (apps/admin_panel/urls.py에서 정의)
    #   - 리다이렉트 이유: POST 요청 후 GET 요청으로 전환하여 페이지 새로고침
    #     (브라우저의 뒤로가기 버튼으로 POST 요청이 다시 실행되는 것을 방지)
    #   - 반환값: HttpResponseRedirect 객체 (HTTP 302 응답)
    # 결과: 더미 사용자 삭제 후 사용자 목록 페이지가 새로고침되어 삭제된 사용자들이 목록에서 제거됨
    #   - 사용자 목록에서 더미 사용자들이 사라진 것을 확인 가능
    return redirect('user_list')


def delete_doctor_dummy_data(request):
    """
    더미 의사 데이터 삭제
    - username이 'doctor'로 시작하는 의사들 삭제 (Doctors와 Users 모두)
    - CASCADE로 Users도 함께 삭제됨
    """
    # ========= 더미 의사 데이터 삭제 =========
    # 목적: 테스트용으로 생성된 더미 의사 데이터를 일괄 삭제
    #   - username이 'doctor'로 시작하는 의사들을 삭제
    #   - 예: 'doctor01', 'doctor02', 'doctor10' 등 모두 삭제
    #   - 주의: 'doctor'로 시작하지만 숫자가 아닌 의사는 삭제되지 않음 (안전장치)
    # 
    # 삭제 대상:
    #   - Doctors 모델의 인스턴스 (의사 정보)
    #   - Users 모델의 인스턴스 (의사 사용자 계정)
    #   - CASCADE 관계로 Doctors를 삭제하면 관련 Users도 함께 삭제됨
    
    # 삭제된 의사의 개수를 저장할 변수 초기화
    # deleted_count: 성공적으로 삭제된 의사의 개수
    # 초기값: 0 (아직 삭제된 의사가 없음)
    # 목적: 삭제된 의사의 개수를 추적하여 디버깅이나 로깅에 사용 가능
    deleted_count = 0
    
    # ========= 더미 의사 조회 =========
    # Doctors.objects.filter(...): 조건에 맞는 의사들을 필터링
    #   - user__username__startswith='doctor': 관련 Users 객체의 username이 'doctor'로 시작하는 의사
    #     → user__username: ForeignKey 관계를 통해 Users 모델의 username 필드에 접근
    #     → username__startswith: Django ORM의 필드 조회 메서드
    #     → SQL의 JOIN과 LIKE 'doctor%'와 동일한 역할
    #     → 예: 'doctor01', 'doctor02', 'doctor10', 'doctorabc' 등이 매칭됨
    #   - 반환값: QuerySet 객체 (조건에 맞는 Doctors 객체들의 집합)
    #   - 아직 데이터베이스 쿼리는 실행되지 않음 (지연 평가)
    # 
    # .select_related('user'): 관련 Users 객체를 미리 로드 (성능 최적화)
    #   - select_related: JOIN을 사용하여 관련 객체를 한 번의 쿼리로 가져옴
    #   - 'user': Doctors 모델의 ForeignKey 필드명
    #   - 목적: 각 의사의 Users 객체에 접근할 때 추가 쿼리를 방지
    #     - select_related 없이: N+1 쿼리 문제 발생 (의사 N명 → N+1번 쿼리)
    #     - select_related 있음: 1번의 쿼리로 모든 관련 Users 객체를 가져옴
    #   - 성능 향상: 의사가 많을수록 쿼리 횟수가 크게 감소
    dummy_doctors = Doctors.objects.filter(
        user__username__startswith='doctor'
    ).select_related('user')
    
    # ========= 각 의사를 순회하며 삭제 =========
    # for doctor in dummy_doctors: QuerySet을 순회하며 각 의사 객체를 가져옴
    #   - 이 시점에 데이터베이스 쿼리가 실행됨
    #   - 각 의사 객체는 Doctors 모델의 인스턴스
    #   - select_related('user')로 인해 doctor.user에 접근해도 추가 쿼리 없음
    for doctor in dummy_doctors:
        # ========= 더미 의사 패턴 확인 (안전장치) =========
        # re.match(r'^doctor\d+$', doctor.user.username): username이 'doctor' + 숫자 형식인지 확인
        #   - r'^doctor\d+$': 정규표현식 패턴
        #     → ^: 문자열의 시작
        #     → doctor: 'doctor' 문자열
        #     → \d+: 하나 이상의 숫자 (0-9)
        #     → $: 문자열의 끝
        #   - match: 매칭 결과 객체 (매칭되면 Match 객체, 안 되면 None)
        #   - 예: 'doctor01' → 매칭됨, 'doctor02' → 매칭됨
        #   - 예: 'doctor', 'doctorabc', 'user01' → 매칭 안 됨
        # 목적: 안전장치로 더미 의사만 삭제하도록 보장
        #   - 'doctor'로 시작하지만 숫자가 아닌 의사는 삭제하지 않음
        #   - 예: 'doctoradmin', 'doctortest' 등은 삭제되지 않음
        #   - 실수로 중요한 의사 데이터를 삭제하는 것을 방지
        if re.match(r'^doctor\d+$', doctor.user.username):
            # ========= 의사 삭제 (CASCADE로 Users도 함께 삭제) =========
            # doctor.delete(): Doctors 객체를 데이터베이스에서 삭제
            #   - SQL의 DELETE 문과 동일한 역할
            #   - 해당 의사의 모든 데이터가 데이터베이스에서 제거됨
            #   - 반환값: (deleted_count, {}) 튜플
            #     → deleted_count: 삭제된 객체의 개수 (보통 1)
            #     → {}: 관련 객체 삭제 정보
            # 
            # CASCADE 삭제 동작:
            #   - Doctors 모델과 Users 모델 간의 ForeignKey 관계가 CASCADE로 설정되어 있으면
            #     Doctors를 삭제할 때 관련 Users 객체도 자동으로 삭제됨
            #   - CASCADE: 부모 객체(Doctors)가 삭제되면 자식 객체(Users)도 함께 삭제
            #   - 결과: doctor.delete()를 호출하면
            #     1. Doctors 테이블에서 해당 의사 레코드 삭제
            #     2. Users 테이블에서 해당 의사 사용자 레코드도 자동 삭제
            #   - 주의: Users를 먼저 삭제하면 안 됨 (Doctors가 Users를 참조하고 있으므로)
            #     → Doctors를 삭제하면 CASCADE로 Users도 함께 삭제됨
            # 
            # 삭제되는 데이터:
            #   - Doctors 테이블: 의사 정보 (면허번호, 병원, 전공과, 승인 여부 등)
            #   - Users 테이블: 의사 사용자 계정 (username, password, 이메일, 전화번호 등)
            #   - 관련 데이터: CASCADE로 설정된 다른 관련 객체들도 함께 삭제될 수 있음
            doctor.delete()
            
            # ========= 삭제된 의사 개수 증가 =========
            # deleted_count += 1: 성공적으로 삭제된 의사의 개수를 1 증가
            #   - 의사가 삭제될 때마다 카운터가 증가
            #   - 패턴에 맞지 않아 건너뛴 경우는 증가하지 않음
            #   - 주의: Doctors와 Users 둘 다 삭제되지만 카운터는 1만 증가
            #     (하나의 의사 객체를 삭제하는 것이므로)
            #   - 목적: 실제로 삭제된 의사의 개수를 추적
            #     - 디버깅: 예상한 개수와 실제 삭제된 개수를 비교
            #     - 로깅: 삭제된 의사 개수를 로그에 기록 가능
            deleted_count += 1
    
    # ========= 의사 목록 페이지로 리다이렉트 =========
    # redirect('doctor_list'): 더미 의사 데이터 삭제가 완료된 후 의사 목록 페이지로 리다이렉트
    #   - 'doctor_list': URL 패턴 이름 (apps/admin_panel/urls.py에서 정의)
    #   - 리다이렉트 이유: POST 요청 후 GET 요청으로 전환하여 페이지 새로고침
    #     (브라우저의 뒤로가기 버튼으로 POST 요청이 다시 실행되는 것을 방지)
    #   - 반환값: HttpResponseRedirect 객체 (HTTP 302 응답)
    # 결과: 더미 의사 삭제 후 의사 목록 페이지가 새로고침되어 삭제된 의사들이 목록에서 제거됨
    #   - 의사 목록에서 더미 의사들이 사라진 것을 확인 가능
    #   - Doctors와 Users 모두 삭제되었으므로 목록에서 완전히 제거됨
    return redirect('doctor_list')
