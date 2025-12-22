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
from django.db.models import Count, Sum, Q, Case, When, F, IntegerField  # 집계 함수(Count, Sum), 복잡한 쿼리 조건(Q), 조건부 표현식(Case, When), 필드 참조(F)
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
import random  # 랜덤 데이터 생성 (더미 그래프 데이터용)

# Create your views here.

# ========= 공통 유틸리티 함수 =========

def generate_dummy_address(city_district=None):
    """더미 데이터용 주소 생성 함수"""
    import random
    
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
    
    # city_district가 지정되지 않으면 랜덤 선택
    if city_district is None:
        city_districts = list(address_data.keys())
        city_district = random.choice(city_districts)
    
    # 동 선택
    dong_list = address_data.get(city_district, ['동'])
    dong = random.choice(dong_list)
    
    # 상세 주소 생성
    detail_addresses = [
        f'{random.randint(100, 999)}-{random.randint(10, 99)}',
        f'{random.randint(1, 99)}-{random.randint(100, 999)}',
        f'아파트 {random.randint(101, 999)}동 {random.randint(101, 999)}호',
        f'빌라 {random.randint(201, 999)}호',
        f'{random.randint(1, 50)}번지',
        f'상가 {random.randint(1, 5)}층 {random.randint(101, 999)}호',
    ]
    detail_address = random.choice(detail_addresses)
    
    # 전체 주소 생성
    return f'{city_district} {dong} {detail_address}'

def get_dummy_address_data():
    """더미 데이터용 주소 데이터 딕셔너리 반환"""
    return {
        '서울특별시 강남구': ['역삼동', '삼성동', '청담동', '논현동', '압구정동', '신사동', '대치동', '도곡동'],
        '서울특별시 서초구': ['반포동', '잠원동', '방배동', '양재동', '서초동', '내곡동', '염곡동', '신원동'],
        '서울특별시 송파구': ['잠실동', '문정동', '방이동', '오금동', '석촌동', '삼전동', '가락동', '거여동'],
        '경기도 성남시 분당구': ['정자동', '서현동', '이매동', '야탑동', '판교동', '백현동', '구미동', '운중동'],
        '인천광역시 남동구': ['구월동', '간석동', '만수동', '장수동', '서창동', '논현동', '도림동', '고잔동'],
        '부산광역시 해운대구': ['우동', '좌동', '중동', '송정동', '반송동', '재송동', '반여동', '석대동'],
        '대전광역시 서구': ['둔산동', '용문동', '탄방동', '괴정동', '가장동', '도마동', '정림동', '변동'],
        '광주광역시 남구': ['봉선동', '주월동', '방림동', '송하동', '양림동', '사동', '구동', '월산동'],
    }

def get_dummy_name_data():
    """더미 데이터용 이름 데이터 반환 (성씨, 이름 목록)"""
    surnames = ['김', '이', '박', '최', '유', '조', '가', '임', '하', '성', '정', '강', '고', '윤', '손', '오', '한', '백', '전', '서', '문', '남']
    
    given_names = [
        '지우', '서준', '민서', '하준', '유진', '예린', '세영', '도윤', '아린', '시온',
        '나연', '태훈', '다온', '하림', '윤호', '예슬', '지안', '현아', '건우', '세아',
        '주원', '민재', '소연', '지유', '서아', '연우', '라희', '지호', '다혜', '나윤',
        '태영', '규민', '세나', '아현', '준영', '은서', '도하', '민혁', '현지', '아준',
        '윤아', '지훈', '채원', '효린', '준서', '예나', '수아', '소민', '한별', '현우',
        '다솔', '라온', '민호', '하연', '윤재', '시윤', '민아', '아라', '태민', '유림'
    ]
    
    return surnames, given_names

def generate_dummy_gender():
    """더미 데이터용 성별 생성"""
    import random
    return random.choice(['M', 'W'])

def generate_dummy_phone():
    """더미 데이터용 전화번호 생성"""
    import random
    return f'010-{random.randint(1000, 9999)}-{random.randint(1000, 9999)}'

def generate_dummy_email(username, role='PATIENT', index=0):
    """더미 데이터용 이메일 생성"""
    if role == 'DOCTOR':
        return f'{username}@hospital.com'
    else:  # PATIENT
        return f'{username}@gmail.com' if index % 2 == 1 else f'{username}@naver.com'

def get_request_param(request, param_name, default=''):
    """
    GET 또는 POST 요청에서 파라미터 값을 가져오는 공통 함수
    
    Args:
        request: HTTP 요청 객체
        param_name: 파라미터 이름
        default: 기본값 (기본값: 빈 문자열)
    
    Returns:
        파라미터 값 또는 기본값
    """
    # GET 요청에서 먼저 확인, 없으면 POST 요청에서 확인
    return request.GET.get(param_name) or request.POST.get(param_name, default)

def paginate_queryset(request, queryset, per_page=5):
    """쿼리셋을 페이지네이션 처리하는 공통 함수"""
    paginator = Paginator(queryset, per_page)
    page_number = get_request_param(request, 'page', 1)
    # page_number를 정수로 변환 (문자열로 전달될 수 있음)
    try:
        page_number = int(page_number) if page_number else 1
    except (ValueError, TypeError):
        page_number = 1
    page_obj = paginator.get_page(page_number)
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
            # 더미 데이터 생성: 자연스러운 그래프를 위해 점진적으로 증가하는 패턴
            #   - 6일 전: 낮은 값 (10~30)
            #   - 5일 전: 약간 증가 (15~35)
            #   - 4일 전: 계속 증가 (20~45)
            #   - 3일 전: 더 증가 (30~55)
            #   - 2일 전: 계속 증가 (40~65)
            #   - 1일 전: 더 증가 (50~75)
            #   - 오늘: 가장 높은 값 (60~85)
            #   - 각 날짜마다 약간의 랜덤 변동 추가하여 자연스러움 향상
            days_from_today = 6 - i  # 오늘로부터 멀어진 일수 (0~6)
            # 기본값: 오늘에 가까울수록 높은 값 (최소 20, 최대 80)
            base_value = 20 + (days_from_today * 8)  # 20, 28, 36, 44, 52, 60, 68
            # 랜덤 변동 추가 (±10): 자연스러운 변동을 위해
            random_variation = random.randint(-10, 10)
            count = max(10, base_value + random_variation)  # 최소값 10 보장
        
        # 그래프 데이터에 날짜 레이블 추가 (X축 레이블)
        # labels 배열에 날짜 문자열 추가 (예: ['12/01', '12/02', ...])
        visitor_chart_data['labels'].append(date_str)
        
        # 그래프 데이터에 방문자 수 값 추가 (Y축 데이터)
        # values 배열에 방문자 수 추가 (예: [100, 150, ...])
        #   - 데이터가 있으면: 실제 방문자 수
        #   - 데이터가 없으면: 더미 데이터 (점진적으로 증가하는 패턴)
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
    """일반 사용자 목록 조회, 검색, 정렬, 페이지네이션"""
    # AJAX 요청 확인
    is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'
    data = request.POST if is_ajax else request.GET
    
    # 파라미터 추출
    search_type = data.get('search_type', '')
    search_keyword = data.get('search_keyword', '')
    selected_user_id = data.get('user_id', '')
    sort_field = data.get('sort', '')
    
    # 정렬 필드 매핑
    sort_fields = {
        'user_id': 'user_id',
        'username': 'username',
        'name': 'name',
        'email': 'email',
        'phone': 'phone',
        'gender': 'gender',
        'resident_reg_no': 'resident_reg_no',
        'address': 'address',
        'created_at': 'created_at',
    }
    
    # 기본 쿼리셋: 일반 사용자만, 탈퇴하지 않은 사용자
    users = Users.objects.filter(role='PATIENT', withdrawal='0')
    
    # 정렬 적용
    if not sort_field or sort_field not in sort_fields:
        sort_field = 'created_at'
        sort_order = 'desc'
    else:
        sort_order = data.get('order', 'desc')
        if sort_order not in ['asc', 'desc']:
            sort_order = 'desc'
    
    order_prefix = '-' if sort_order == 'desc' else ''
    if sort_field != 'created_at':
        users = users.order_by(f'{order_prefix}{sort_fields[sort_field]}', '-created_at')
    else:
        users = users.order_by(f'{order_prefix}{sort_fields[sort_field]}')
    
    # 검색 필터 적용
    if search_type and search_keyword:
        search_keyword = search_keyword.strip()
        if search_keyword:
            if search_type == 'username':
                users = users.filter(username__icontains=search_keyword)
            elif search_type == 'name':
                users = users.filter(name__icontains=search_keyword)
            elif search_type == 'email':
                users = users.filter(email__icontains=search_keyword)
            elif search_type == 'phone':
                users = users.filter(phone__icontains=search_keyword)
    
    # 페이지네이션
    page_obj, total_count = paginate_queryset(request, users, per_page=5)
    
    # 신규 가입 유저 확인용 날짜 범위
    today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = timezone.now().replace(hour=23, minute=59, second=59, microsecond=999999)
    
    # 각 항목의 번호 계산 및 데이터 가공
    users_with_number = []
    start_index = (page_obj.number - 1) * page_obj.paginator.per_page + 1
    
    for idx, user in enumerate(page_obj):
        # 번호 계산
        if sort_field == 'user_id' and sort_order == 'desc':
            number = total_count - (start_index - 1 + idx) + 1
        else:
            number = start_index + idx
        
        # 주민번호를 생년월일로 변환 (yyyy년mm월dd일 형식으로 통일)
        birth_date = None
        if user.resident_reg_no:
            reg_no = user.resident_reg_no.replace('-', '')  # 하이픈 제거
            if len(reg_no) >= 7:
                yy = reg_no[0:2]
                mm = reg_no[2:4]
                dd = reg_no[4:6]
                gender_code = reg_no[6] if len(reg_no) > 6 else None
                
                try:
                    month_int = int(mm)
                    day_int = int(dd)
                    if 1 <= month_int <= 12 and 1 <= day_int <= 31:
                        # 주민번호 7번째 자리로 연도 판단 (1,2: 1900년대, 3,4: 2000년대)
                        if gender_code in ['1', '2', '5', '6']:
                            yyyy = f'19{yy}'
                        elif gender_code in ['3', '4', '7', '8']:
                            yyyy = f'20{yy}'
                        else:
                            # 기본값: yy가 작으면 2000년대, 크면 1900년대
                            yy_int = int(yy)
                            yyyy = f'20{yy}' if yy_int < 50 else f'19{yy}'
                        birth_date = f'{yyyy}년{mm}월{dd}일'
                except ValueError:
                    pass
        
        # 신규 가입 유저 확인
        is_new_user = user.created_at >= today_start and user.created_at <= today_end if user.created_at else False
        
        # 주소 처리 (우편번호|메인주소|상세주소 형식에서 메인주소만 추출)
        address_short = None
        if user.address:
            # 우편번호|메인주소|상세주소 형식인지 확인
            if '|' in user.address:
                parts = user.address.split('|')
                if len(parts) >= 2:
                    # 메인주소만 사용 (두 번째 부분)
                    address_short = parts[1].strip()
                else:
                    address_short = user.address
            else:
                # 기존 형식 (더미 데이터 등) - 동까지만 표시
                if '동' in user.address:
                    dong_index = user.address.find('동')
                    address_short = user.address[:dong_index + 1] if dong_index != -1 else user.address
                else:
                    address_short = user.address
        
        users_with_number.append({
            'user': user,
            'number': number,
            'birth_date': birth_date,
            'is_new_user': is_new_user,
            'address_short': address_short
        })
    
    # 선택된 사용자 정보 처리
    selected_user = None
    favorite_hospitals = []
    birth_date = None
    address_formatted = None
    if selected_user_id:
        try:
            selected_user = Users.objects.get(user_id=selected_user_id, withdrawal='0', role='PATIENT')
            favorites = UserFavorite.objects.filter(user=selected_user)
            favorite_hospitals = [fav.hos.name for fav in favorites if hasattr(fav, 'hos')]
            
            # 주민번호를 생년월일로 변환 (yyyy년mm월dd일 형식으로 통일)
            if selected_user.resident_reg_no:
                reg_no = selected_user.resident_reg_no.replace('-', '')  # 하이픈 제거
                if len(reg_no) >= 7:
                    yy = reg_no[0:2]
                    mm = reg_no[2:4]
                    dd = reg_no[4:6]
                    gender_code = reg_no[6] if len(reg_no) > 6 else None
                    
                    try:
                        month_int = int(mm)
                        day_int = int(dd)
                        if 1 <= month_int <= 12 and 1 <= day_int <= 31:
                            # 주민번호 7번째 자리로 연도 판단 (1,2: 1900년대, 3,4: 2000년대)
                            if gender_code in ['1', '2', '5', '6']:
                                yyyy = f'19{yy}'
                            elif gender_code in ['3', '4', '7', '8']:
                                yyyy = f'20{yy}'
                            else:
                                # 기본값: yy가 작으면 2000년대, 크면 1900년대
                                yy_int = int(yy)
                                yyyy = f'20{yy}' if yy_int < 50 else f'19{yy}'
                            birth_date = f'{yyyy}년{mm}월{dd}일'
                    except ValueError:
                        pass
            
            # 주소 포맷팅 (우편번호|메인주소|상세주소 형식에서 (우편번호) 메인주소 상세주소 형식으로 변환)
            if selected_user.address:
                if '|' in selected_user.address:
                    parts = selected_user.address.split('|')
                    if len(parts) >= 3:
                        # (우편번호) 메인주소 상세주소 형식
                        zipcode = parts[0].strip()
                        main_address = parts[1].strip()
                        detail_address = parts[2].strip()
                        address_formatted = f'({zipcode}) {main_address} {detail_address}'
                    elif len(parts) == 2:
                        # 우편번호|메인주소 형식 (상세주소 없음)
                        zipcode = parts[0].strip()
                        main_address = parts[1].strip()
                        address_formatted = f'({zipcode}) {main_address}'
                    else:
                        address_formatted = selected_user.address
                else:
                    # 기존 형식 (더미 데이터 등)
                    address_formatted = selected_user.address
        except Users.DoesNotExist:
            pass
    
    # 통계 정보
    total_users_count = Users.objects.filter(role='PATIENT').count()
    search_result_count = users.count()
    
    # 컨텍스트 데이터
    context = {
        'page_obj': page_obj,
        'users': page_obj,
        'users_with_number': users_with_number,
        'search_type': search_type,
        'search_keyword': search_keyword,
        'selected_user': selected_user,
        'favorite_hospitals': favorite_hospitals,
        'birth_date': birth_date,
        'address_formatted': address_formatted,
        'total_users_count': total_users_count,
        'search_result_count': search_result_count,
        'sort_field': sort_field,
        'sort_order': sort_order,
    }
    
    # AJAX 요청 처리
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        if selected_user_id:
            detail_html = render_to_string('admin_panel/user_list_detail.html', context, request=request)
            return JsonResponse({'detail_html': detail_html})
    
    return render(request, 'admin_panel/user_list.html', context)


def doctor_list(request):
    """의사 목록 조회, 검색, 정렬, 페이지네이션"""
    # 파라미터 추출
    search_type = get_request_param(request, 'search_type', '')
    search_keyword = get_request_param(request, 'search_keyword', '')
    selected_doctor_id = get_request_param(request, 'doctor_id', '')
    sort_field = get_request_param(request, 'sort', '')
    sort_order = get_request_param(request, 'order', 'desc')
    
    # selected_doctor_id를 정수로 변환
    if selected_doctor_id:
        try:
            selected_doctor_id = int(selected_doctor_id)
        except (ValueError, TypeError):
            selected_doctor_id = None
    else:
        selected_doctor_id = None
    
    # 정렬 필드 매핑
    sort_fields = {
        'doctor_id': 'doctor_id',
        'name': 'user__name',
        'username': 'user__username',
        'license_no': 'license_no',
        'department': 'dep__dep_name',
        'hospital': 'hos__name',
        'email': 'user__email',
        'verified': 'verified',
        'created_at': 'user__created_at',
    }
    
    # 기본 쿼리셋: 탈퇴하지 않은 의사만, 관련 객체 미리 로드
    doctors = Doctors.objects.select_related('user', 'hos', 'dep').filter(user__withdrawal='0')
    
    # 정렬 적용
    if sort_field and sort_field in sort_fields:
        order_prefix = '-' if sort_order == 'desc' else ''
        if sort_field != 'created_at':
            doctors = doctors.order_by(f'{order_prefix}{sort_fields[sort_field]}', '-user__created_at')
        else:
            doctors = doctors.order_by(f'{order_prefix}{sort_fields[sort_field]}')
    else:
        # 기본 정렬: 승인 대기 먼저, 그 다음 최신순
        doctors = doctors.order_by('verified', '-user__created_at')
    
    # 검색 필터 적용
    if search_type and search_keyword:
        search_keyword = search_keyword.strip()
        if search_keyword:
            if search_type == 'name':
                doctors = doctors.filter(user__name__icontains=search_keyword)
            elif search_type == 'doctor_id':
                doctors = doctors.filter(user__username__icontains=search_keyword)
            elif search_type == 'license_no':
                doctors = doctors.filter(license_no__icontains=search_keyword)
            elif search_type == 'department':
                doctors = doctors.filter(dep__dep_name__icontains=search_keyword)
            elif search_type == 'hospital':
                doctors = doctors.filter(hos__name__icontains=search_keyword)
    
    # 페이지네이션
    page_obj, total_count = paginate_queryset(request, doctors, per_page=5)
    
    # 각 항목의 번호 계산
    doctors_with_number = []
    start_index = (page_obj.number - 1) * page_obj.paginator.per_page + 1
    for idx, doctor in enumerate(page_obj):
        if sort_field == 'doctor_id' and sort_order == 'desc':
            number = total_count - (start_index - 1 + idx) + 1
        else:
            number = start_index + idx
        doctors_with_number.append({
            'doctor': doctor,
            'number': number
        })
    
    # 선택된 의사 정보 처리
    selected_doctor = None
    if selected_doctor_id:
        try:
            selected_doctor = Doctors.objects.select_related('user', 'hos', 'dep').filter(user__withdrawal='0').get(doctor_id=selected_doctor_id)
        except Doctors.DoesNotExist:
            pass
    
    # 통계 정보
    total_doctors_count = Doctors.objects.count()
    search_result_count = doctors.count()
    
    # 컨텍스트 데이터
    context = {
        'page_obj': page_obj,
        'doctors': page_obj,
        'doctors_with_number': doctors_with_number,
        'search_type': search_type,
        'search_keyword': search_keyword,
        'selected_doctor': selected_doctor,
        'total_doctors_count': total_doctors_count,
        'search_result_count': search_result_count,
        'sort_field': sort_field,
        'sort_order': sort_order,
    }
    
    # AJAX 요청 처리
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        if selected_doctor_id:
            if not selected_doctor:
                return JsonResponse({'detail_html': ''})
            try:
                detail_html = render_to_string('admin_panel/doctor_list_detail.html', context, request=request)
                return JsonResponse({'detail_html': detail_html})
            except Exception as e:
                import traceback
                error_detail = traceback.format_exc()
                return JsonResponse({
                    'error': str(e),
                    'detail': error_detail
                }, status=500)
    
    return render(request, 'admin_panel/doctor_list.html', context)


def hospital_list(request):
    """병원 목록 조회, 검색, 정렬, 페이지네이션, 병원 추가"""
    # POST 요청 처리 (병원 추가)
    if request.method == 'POST':
        action = request.POST.get('action', '')
        
        # AJAX 요청인 경우 JSON 응답
        is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'
        
        if action == 'add_hospital':
            # 병원 추가 처리
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"[병원 추가] 요청 시작: is_ajax={is_ajax}, action={action}")
            
            try:
                hospital_name = request.POST.get('hospital_name', '').strip()
                hospital_hos_name = request.POST.get('hospital_hos_name', '').strip()
                hospital_hos_password = request.POST.get('hospital_hos_password', '').strip()
                hospital_address = request.POST.get('hospital_address', '').strip()
                hospital_tel = request.POST.get('hospital_tel', '').strip()
                hospital_estb_date = request.POST.get('hospital_estb_date', '').strip()
                
                # API에서 가져온 추가 정보
                hospital_lat = request.POST.get('hospital_lat', '').strip()
                hospital_lng = request.POST.get('hospital_lng', '').strip()
                hospital_dr_total = request.POST.get('hospital_dr_total', '').strip()
                hospital_sggu = request.POST.get('hospital_sggu', '').strip()
                hospital_sido = request.POST.get('hospital_sido', '').strip()
                
                # 디버깅: 받은 데이터 확인
                logger.info(f"[병원 추가] 받은 데이터: name={hospital_name}, hos_name={hospital_hos_name}, address={hospital_address}, tel={hospital_tel}, estb_date={hospital_estb_date}")
                logger.info(f"[병원 추가] 추가 정보: lat={hospital_lat}, lng={hospital_lng}, dr_total={hospital_dr_total}, sggu={hospital_sggu}, sido={hospital_sido}")
                
                # 필수 필드 검증
                if not hospital_name or not hospital_hos_name or not hospital_hos_password:
                    if is_ajax:
                        return JsonResponse({'success': False, 'message': '필수 항목을 모두 입력해주세요.'})
                    else:
                        # 일반 POST 요청인 경우 리다이렉트
                        return redirect('hospital_list')
                
                # 필드 길이 검증 (모델 제약 조건 확인)
                if len(hospital_name) > 100:
                    if is_ajax:
                        return JsonResponse({'success': False, 'message': '병원명은 100자 이하여야 합니다.'})
                    else:
                        return redirect('hospital_list')
                
                if len(hospital_hos_name) > 50:
                    if is_ajax:
                        return JsonResponse({'success': False, 'message': '병원 계정ID는 50자 이하여야 합니다.'})
                    else:
                        return redirect('hospital_list')
                
                if hospital_address and len(hospital_address) > 255:
                    if is_ajax:
                        return JsonResponse({'success': False, 'message': '주소는 255자 이하여야 합니다.'})
                    else:
                        return redirect('hospital_list')
                
                if hospital_tel and len(hospital_tel) > 50:
                    if is_ajax:
                        return JsonResponse({'success': False, 'message': '전화번호는 50자 이하여야 합니다.'})
                    else:
                        return redirect('hospital_list')
                
                # hos_name 중복 확인
                if Hospital.objects.filter(hos_name=hospital_hos_name).exists():
                    if is_ajax:
                        return JsonResponse({'success': False, 'message': '이미 존재하는 병원 계정ID입니다.'})
                    else:
                        return redirect('hospital_list')
                
                # hpid 자동 생성 (hos_name 기반으로 생성)
                import uuid
                hospital_hpid = str(uuid.uuid4())[:36]  # UUID 기반 고유 ID 생성
                
                # API에서 가져온 추가 정보 파싱
                lat_float = None
                lng_float = None
                dr_total_int = None
                
                if hospital_lat:
                    try:
                        lat_float = float(hospital_lat)
                    except (ValueError, TypeError):
                        lat_float = None
                
                if hospital_lng:
                    try:
                        lng_float = float(hospital_lng)
                    except (ValueError, TypeError):
                        lng_float = None
                
                if hospital_dr_total:
                    try:
                        dr_total_int = int(hospital_dr_total)
                    except (ValueError, TypeError):
                        dr_total_int = None
                
                # sggu, sido는 문자열이므로 그대로 사용 (빈 문자열이면 None)
                hospital_sggu = hospital_sggu if hospital_sggu else None
                hospital_sido = hospital_sido if hospital_sido else None
                
                # 병원 생성
                # address 필드는 CharField이므로 빈 문자열 허용 (null=True 없음)
                try:
                    new_hospital = Hospital.objects.create(
                        name=hospital_name,
                        hpid=hospital_hpid,
                        hos_name=hospital_hos_name,
                        hos_password=hospital_hos_password,
                        address=hospital_address if hospital_address else '',  # 빈 문자열로 저장
                        tel=hospital_tel if hospital_tel else None,
                        estb_date=hospital_estb_date if hospital_estb_date else None,
                        lat=lat_float,
                        lng=lng_float,
                        dr_total=dr_total_int,
                        sggu=hospital_sggu,
                        sido=hospital_sido,
                    )
                    
                    # 저장 후 실제로 DB에 저장되었는지 확인
                    saved_hospital = Hospital.objects.filter(hpid=hospital_hpid).first()
                    if not saved_hospital:
                        logger.error(f"[병원 추가] 저장 실패: hpid={hospital_hpid}로 조회했지만 결과 없음")
                        if is_ajax:
                            return JsonResponse({'success': False, 'message': '병원 저장 후 확인 중 오류가 발생했습니다.'})
                        else:
                            return redirect('hospital_list')
                    
                    logger.info(f"[병원 추가] 성공: hos_id={new_hospital.hos_id}, hpid={new_hospital.hpid}, hos_name={new_hospital.hos_name}")
                    
                    if is_ajax:
                        return JsonResponse({
                            'success': True, 
                            'message': '병원이 성공적으로 추가되었습니다.',
                            'hospital_id': new_hospital.hos_id
                        })
                    else:
                        return redirect('hospital_list')
                except Exception as create_error:
                    logger.error(f"[병원 추가] DB 저장 중 오류: {str(create_error)}")
                    import traceback
                    logger.error(traceback.format_exc())
                    # create 에러를 상위 except로 전달
                    raise
                    
            except Exception as e:
                import traceback
                from django.db import IntegrityError
                error_detail = traceback.format_exc()
                
                # DB 제약 조건 위반 에러 처리
                if isinstance(e, IntegrityError):
                    error_msg = str(e)
                    # hpid 중복 에러
                    if 'hpid' in error_msg.lower() or 'unique' in error_msg.lower():
                        if is_ajax:
                            return JsonResponse({'success': False, 'message': '이미 존재하는 병원입니다. (hpid 중복)'})
                        else:
                            return redirect('hospital_list')
                    # hos_name 중복 에러 (이미 위에서 체크하지만 DB 레벨에서도 발생 가능)
                    elif 'hos_name' in error_msg.lower():
                        if is_ajax:
                            return JsonResponse({'success': False, 'message': '이미 존재하는 병원 계정ID입니다.'})
                        else:
                            return redirect('hospital_list')
                    else:
                        if is_ajax:
                            return JsonResponse({'success': False, 'message': f'DB 제약 조건 위반: {error_msg}'})
                        else:
                            return redirect('hospital_list')
                
                # 기타 에러 - 더 자세한 에러 정보 제공
                if is_ajax:
                    # 개발 환경에서는 상세 에러 정보 제공
                    import sys
                    error_type = type(e).__name__
                    error_message = str(e)
                    # 에러 타입에 따른 사용자 친화적인 메시지
                    if 'ValidationError' in error_type:
                        return JsonResponse({'success': False, 'message': f'입력값 검증 오류: {error_message}'})
                    elif 'ValueError' in error_type:
                        return JsonResponse({'success': False, 'message': f'값 오류: {error_message}'})
                    else:
                        return JsonResponse({
                            'success': False, 
                            'message': f'병원 추가 중 오류가 발생했습니다: {error_message}',
                            'error_type': error_type
                        })
                else:
                    return redirect('hospital_list')
        else:
            # 검색 요청인 경우 (기존 로직)
            pass
    
    # 파라미터 추출
    search_type = get_request_param(request, 'search_type', '')
    search_keyword = get_request_param(request, 'search_keyword', '')
    selected_hospital_id = get_request_param(request, 'hospital_id', '')
    sort_field = get_request_param(request, 'sort', '')
    sort_order = get_request_param(request, 'order', 'desc')
    
    # selected_hospital_id를 정수로 변환
    if selected_hospital_id:
        try:
            selected_hospital_id = int(selected_hospital_id)
        except (ValueError, TypeError):
            selected_hospital_id = None
    else:
        selected_hospital_id = None
    
    # 정렬 필드 매핑
    sort_fields = {
        'hos_id': 'hos_id',
        'hos_name': 'hos_name',
        'name': 'name',
        'address': 'address',
        'tel': 'tel',
        'doctor_count': 'doctor_count',
        'created_at': 'created_at',
        'estb_date': 'estb_date',
    }
    
    # 기본 쿼리셋: 모든 병원, 의사 수 포함
    hospitals = Hospital.objects.annotate(
        doctor_count=Count('doctors'),
        doctor_count_for_sort=Case(
            When(doctor_count__gt=0, then=F('doctor_count')),
            default=Case(
                When(dr_total__isnull=False, then=F('dr_total')),
                default=0,
                output_field=IntegerField()
            ),
            output_field=IntegerField()
        )
    ).all()
    
    # 정렬 적용
    if sort_field and sort_field in sort_fields:
        order_prefix = '-' if sort_order == 'desc' else ''
        if sort_field == 'doctor_count':
            hospitals = hospitals.order_by(f'{order_prefix}doctor_count_for_sort')
        else:
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
                hospitals = hospitals.filter(address__icontains=search_keyword)
            elif search_type == 'phone':
                hospitals = hospitals.filter(tel__icontains=search_keyword)
            elif search_type == 'hpid':
                hospitals = hospitals.filter(hos_name__icontains=search_keyword)
    
    # 페이지네이션
    page_obj, total_count = paginate_queryset(request, hospitals, per_page=5)
    
    # 각 항목의 번호 계산 및 데이터 가공
    hospitals_with_number = []
    start_index = (page_obj.number - 1) * page_obj.paginator.per_page + 1
    for idx, hospital in enumerate(page_obj):
        if sort_field == 'hos_id' and sort_order == 'desc':
            number = total_count - (start_index - 1 + idx) + 1
        else:
            number = start_index + idx
        
        # 주소 처리 (첫 번째 쉼표까지만 표시)
        address_short = None
        if hospital.address:
            if ',' in hospital.address:
                comma_index = hospital.address.find(',')
                address_short = hospital.address[:comma_index] if comma_index != -1 else hospital.address
            else:
                address_short = hospital.address
        
        # 개원일 포맷팅 (yyyy.mm.dd 형식)
        estb_date_formatted = None
        if hospital.estb_date:
            estb_date_str = str(hospital.estb_date)
            if len(estb_date_str) == 8 and estb_date_str.isdigit():
                year = estb_date_str[:4]
                month = estb_date_str[4:6]
                day = estb_date_str[6:8]
                estb_date_formatted = f'{year}.{month}.{day}'
            else:
                # 이미 포맷팅된 형식이거나 다른 형식이면 그대로 사용
                estb_date_formatted = estb_date_str
        
        # 등록일 포맷팅 (yyyy.mm.dd 형식)
        created_at_formatted = None
        if hospital.created_at:
            created_at_formatted = hospital.created_at.strftime('%Y.%m.%d')
        
        hospitals_with_number.append({
            'hospital': hospital,
            'number': number,
            'address_short': address_short,
            'estb_date_formatted': estb_date_formatted,
            'created_at_formatted': created_at_formatted
        })
    
    # 선택된 병원 정보 처리
    selected_hospital = None
    if selected_hospital_id:
        try:
            selected_hospital = Hospital.objects.annotate(
                doctor_count=Count('doctors')
            ).get(hos_id=selected_hospital_id)
            
            # 개원일 포맷팅
            if selected_hospital.estb_date:
                estb_date_str = str(selected_hospital.estb_date)
                if len(estb_date_str) == 8 and estb_date_str.isdigit():
                    year = estb_date_str[:4]
                    month = estb_date_str[4:6]
                    day = estb_date_str[6:8]
                    selected_hospital.estb_date_formatted = f'{year}.{month}.{day}'
                else:
                    selected_hospital.estb_date_formatted = estb_date_str
            else:
                selected_hospital.estb_date_formatted = None
        except Hospital.DoesNotExist:
            pass
    
    # 통계 정보
    total_hospitals_count = Hospital.objects.count()
    search_result_count = hospitals.count()
    
    # 컨텍스트 데이터
    context = {
        'page_obj': page_obj,
        'hospitals': page_obj,
        'hospitals_with_number': hospitals_with_number,
        'search_type': search_type,
        'search_keyword': search_keyword,
        'selected_hospital': selected_hospital,
        'total_hospitals_count': total_hospitals_count,
        'search_result_count': search_result_count,
        'sort_field': sort_field,
        'sort_order': sort_order,
    }
    
    # AJAX 요청 처리
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        if selected_hospital_id:
            if not selected_hospital:
                return JsonResponse({'detail_html': ''})
            try:
                detail_html = render_to_string('admin_panel/hospital_list_detail.html', context, request=request)
                return JsonResponse({'detail_html': detail_html})
            except Exception as e:
                import traceback
                error_detail = traceback.format_exc()
                return JsonResponse({
                    'error': str(e),
                    'detail': error_detail
                }, status=500)
    
    return render(request, 'admin_panel/hospital_list.html', context)


def approval_pending(request):
    """의사 승인 대기 목록 조회, 면허번호 검증, 승인/거절 처리"""
    # 파라미터 추출
    sort_field = get_request_param(request, 'sort', '')
    sort_order = get_request_param(request, 'order', 'asc')
    
    # sort_field와 sort_order 기본값 설정 (템플릿에서 항상 포함하기 위함)
    if not sort_field:
        sort_field = ''
    if not sort_order or sort_order not in ['asc', 'desc']:
        sort_order = 'asc'
    
    # 정렬 필드 매핑
    sort_fields = {
        'doctor_id': 'doctor_id',
        'name': 'user__name',
        'username': 'user__username',
        'hospital': 'hos__name',
        'department': 'dep__dep_name',
        'license_no': 'license_no',
        'created_at': 'user__created_at',
    }
    
    # 검증되지 않은 의사들 조회
    pending_doctors = Doctors.objects.filter(verified=False).select_related(
        'user', 'hos', 'dep'
    )
    
    # 정렬 적용
    if sort_field and sort_field in sort_fields:
        order_prefix = '-' if sort_order == 'desc' else ''
        pending_doctors = pending_doctors.order_by(f'{order_prefix}{sort_fields[sort_field]}')
    else:
        # 기본 정렬: 오래된 순
        pending_doctors = pending_doctors.order_by('user__created_at')
    
    # 유효하지 않은 면허번호를 가진 의사를 우선 표시하기 위한 정렬
    all_doctors = list(pending_doctors)
    doctors_with_validation_temp = []
    
    for doctor in all_doctors:
        # 면허번호 뒷자리 추출 (영어코드$주민번호7자리 형식에서 뒷자리만)
        license_back = doctor.license_no[3:] if len(doctor.license_no) > 3 else ''
        
        # 주민번호 뒷자리 추출
        resident_reg_no = doctor.user.resident_reg_no
        if '-' in resident_reg_no:
            resident_back = resident_reg_no.split('-')[1] if len(resident_reg_no.split('-')) > 1 else ''
        else:
            resident_back = resident_reg_no[-7:] if len(resident_reg_no) >= 7 else ''
        
        is_valid_license = (license_back == resident_back)
        doctors_with_validation_temp.append({
            'doctor': doctor,
            'is_valid_license': is_valid_license
        })
    
    # 유효하지 않은 면허번호를 가진 의사를 먼저 정렬
    doctors_with_validation_temp.sort(key=lambda x: x['is_valid_license'])
    
    # ID 순서대로 의사를 다시 정렬 (Case 문 사용)
    ordered_doctor_ids = [item['doctor'].doctor_id for item in doctors_with_validation_temp]
    if ordered_doctor_ids:
        order_case = Case(
            *[When(doctor_id=doctor_id, then=pos) for pos, doctor_id in enumerate(ordered_doctor_ids)],
            default=len(ordered_doctor_ids),
            output_field=IntegerField()
        )
        pending_doctors = pending_doctors.order_by(order_case)
    
    # 선택된 의사 정보 처리
    selected_doctor_id = get_request_param(request, 'doctor_id', '')
    selected_doctor = None
    
    # URL에 doctor_id 파라미터가 있을 때만 의사 선택
    # 기본 상태에서는 아무것도 선택하지 않음 (상세정보 숨김)
    if selected_doctor_id:
        try:
            selected_doctor = Doctors.objects.select_related(
                'user', 'hos', 'dep'
            ).get(doctor_id=selected_doctor_id, verified=False)
        except Doctors.DoesNotExist:
            pass
    
    # 페이지네이션
    page_obj, total_count = paginate_queryset(request, pending_doctors, per_page=5)
    
    # 디버깅: 페이지 번호 확인
    page_number_from_request = get_request_param(request, 'page', 1)
    print(f'[approval_pending] 요청된 page 파라미터: {page_number_from_request}, 타입: {type(page_number_from_request)}')
    print(f'[approval_pending] 실제 page_obj.number: {page_obj.number}, 전체 페이지 수: {page_obj.paginator.num_pages}')
    
    # 면허번호 검증 및 번호 계산
    doctors_with_validation = []
    start_index = (page_obj.number - 1) * page_obj.paginator.per_page + 1
    for idx, doctor in enumerate(page_obj):
        # 면허번호 뒷자리 추출
        license_back = doctor.license_no[3:] if len(doctor.license_no) > 3 else ''
        
        # 주민번호 뒷자리 추출
        resident_reg_no = doctor.user.resident_reg_no
        if '-' in resident_reg_no:
            resident_back = resident_reg_no.split('-')[1] if len(resident_reg_no.split('-')) > 1 else ''
        else:
            resident_back = resident_reg_no[-7:] if len(resident_reg_no) >= 7 else ''
        
        is_valid_license = (license_back == resident_back)
        
        # 번호 계산
        if sort_field == 'doctor_id' and sort_order == 'desc':
            number = total_count - (start_index - 1 + idx) + 1
        else:
            number = start_index + idx
        
        doctors_with_validation.append({
            'doctor': doctor,
            'is_valid_license': is_valid_license,
            'number': number,
        })
    
    # 승인/거절 처리 (POST 요청)
    if request.method == 'POST':
        action = request.POST.get('action')
        doctor_ids_str = request.POST.get('doctor_ids', '')
        
        if doctor_ids_str:
            doctor_ids = [int(id.strip()) for id in doctor_ids_str.split(',') if id.strip().isdigit()]
        else:
            doctor_ids = []
        
        if doctor_ids:
            if action == 'approve':
                Doctors.objects.filter(doctor_id__in=doctor_ids, verified=False).update(verified=True)
            elif action == 'reject':
                # 거절 시 Doctors와 관련 Users 모두 삭제
                # Doctors 객체들을 먼저 가져와서 관련 Users ID 수집
                doctors_to_delete = Doctors.objects.filter(
                    doctor_id__in=doctor_ids, 
                    verified=False
                ).select_related('user')
                
                # 관련 Users ID 수집
                user_ids = [doctor.user.user_id for doctor in doctors_to_delete]
                
                # Doctors 삭제 (CASCADE로 자동 삭제되지 않으므로 수동 삭제)
                doctors_to_delete.delete()
                
                # 관련 Users 삭제
                if user_ids:
                    Users.objects.filter(user_id__in=user_ids).delete()
            
            # 승인/거절 처리 후 리다이렉트 (AJAX 요청이 아닌 경우에만)
            # 페이지네이션 AJAX 요청은 리다이렉트하지 않음
            if request.headers.get('X-Requested-With') != 'XMLHttpRequest':
                return redirect('approval_pending')
    
    # 컨텍스트 데이터
    context = {
        'page_obj': page_obj,
        'pending_doctors': page_obj,
        'doctors_with_validation': doctors_with_validation,
        'selected_doctor': selected_doctor,
        'selected_doctor_id': selected_doctor_id if selected_doctor_id else '',
        'total_pending_count': pending_doctors.count(),
        'sort_field': sort_field,
        'sort_order': sort_order,
    }
    
    # AJAX 요청 처리
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        if selected_doctor_id:
            detail_html = render_to_string('admin_panel/approval_pending_detail.html', context, request=request)
            return JsonResponse({'detail_html': detail_html})
    
    return render(request, 'admin_panel/approval_pending.html', context)


def qna_list(request):
    """1:1 문의 목록 조회, 삭제 처리, 정렬, 페이지네이션"""
    # 관리자 권한 체크
    user_role = request.session.get('role', '')
    if user_role != 'ADMIN':
        return redirect('/')
    
    # ========= 30일 이전 데이터 자동 삭제 =========
    # 목적: 오늘 날짜 기준으로 30일 이전 문의 데이터를 자동으로 삭제
    #   - 데이터 관리: 오래된 문의 데이터를 자동으로 정리하여 데이터베이스 용량 관리
    #   - 개인정보 보호: 오래된 문의 데이터를 자동으로 삭제하여 개인정보 보호
    #   - 성능 최적화: 오래된 데이터를 삭제하여 쿼리 성능 향상
    # 
    # timezone.now(): 현재 시간 (시간대를 고려한 현재 시간)
    #   - Django의 timezone.now()는 settings.py의 TIME_ZONE 설정을 고려
    #   - 반환값: datetime 객체 (예: 2024-12-12 16:30:00+09:00)
    #   - 목적: 현재 시간을 기준으로 30일 전 날짜를 계산
    # 
    # timedelta(days=30): 30일의 시간 간격
    #   - days=30: 30일
    #   - 반환값: timedelta 객체
    #   - 목적: 현재 시간에서 30일을 빼기 위함
    # 
    # timezone.now() - timedelta(days=30): 30일 전 날짜/시간 계산
    #   - 반환값: datetime 객체 (30일 전 날짜/시간)
    #   - 예: 오늘이 2024-12-12이면 2024-11-12 반환
    #   - 목적: 이 날짜 이전의 문의 데이터를 삭제하기 위함
    thirty_days_ago = timezone.now() - timedelta(days=30)
    
    # Qna.objects.filter(...): 조건에 맞는 문의들을 필터링
    #   - created_at__lt=thirty_days_ago: created_at 필드가 thirty_days_ago보다 이전인 문의
    #     → created_at__lt: Django ORM의 필드 조회 메서드 (less than)
    #     → SQL의 WHERE created_at < '2024-11-12'와 동일한 역할
    #     → 예: 2024-11-10에 생성된 문의는 삭제됨
    #     → 예: 2024-11-15에 생성된 문의는 삭제되지 않음
    #   - .delete(): 필터링된 문의들을 데이터베이스에서 삭제
    #     → SQL의 DELETE 문과 동일한 역할
    #     → 반환값: (삭제된 객체 수, {모델명: 삭제된 객체 수}) 튜플
    #     → 예: (5, {'qna.Qna': 5}) - 5개의 문의가 삭제됨
    #   - 목적: 30일 이전의 문의 데이터를 자동으로 삭제
    #   - 결과: 30일 이전의 문의 데이터가 데이터베이스에서 제거됨
    #   - 주의: 삭제된 데이터는 복구할 수 없으므로 신중하게 처리됨
    deleted_count, _ = Qna.objects.filter(created_at__lt=thirty_days_ago).delete()
    
    # 삭제된 문의가 있는 경우 로그 출력 (선택사항)
    #   - 디버깅 목적으로 삭제된 문의 개수를 확인할 수 있음
    #   - 프로덕션 환경에서는 로깅 시스템으로 대체 가능
    if deleted_count > 0:
        print(f'[qna_list] 30일 이전 문의 데이터 {deleted_count}개 자동 삭제 완료')
    
    # 삭제 처리 (POST 요청)
    if request.method == 'POST':
        action = request.POST.get('action')
        qna_ids_str = request.POST.get('qna_ids', '')
        
        if action == 'delete' and qna_ids_str:
            qna_ids = [int(id.strip()) for id in qna_ids_str.split(',') if id.strip()]
            if qna_ids:
                # 대기 상태(reply가 없는 상태)의 문의는 삭제하지 않음
                Qna.objects.filter(qna_id__in=qna_ids, reply__isnull=False).delete()
            # 삭제 처리 후 리다이렉트 (AJAX 요청이 아닌 경우에만)
            # 페이지네이션 AJAX 요청은 리다이렉트하지 않음
            if request.headers.get('X-Requested-With') != 'XMLHttpRequest':
                return redirect('/admin_panel/qna_list/')
    
    # 파라미터 추출
    sort_field = get_request_param(request, 'sort', '')
    sort_order = get_request_param(request, 'order', 'asc')
    
    # 정렬 필드 매핑
    sort_fields = {
        'qna_id': 'qna_id',
        'name': 'user__name',
        'email': 'user__email',
        'title': 'title',
        'status': 'reply',
        'created_at': 'created_at',
    }
    
    # 기본 쿼리셋: 모든 문의, 사용자 정보 미리 로드
    qnas = Qna.objects.select_related('user').all()
    
    # 정렬 적용
    if sort_field and sort_field in sort_fields:
        if sort_field == 'status':
            # 상태 정렬: 답변 대기 상태가 먼저 오도록
            from django.db.models import Case, When, Value, IntegerField
            qnas = qnas.annotate(
                reply_status=Case(
                    When(reply__isnull=True, then=Value(0)),
                    When(reply='', then=Value(0)),
                    default=Value(1),
                    output_field=IntegerField(),
                )
            )
            order_prefix = '-' if sort_order == 'desc' else ''
            qnas = qnas.order_by(f'{order_prefix}reply_status', '-created_at')
        else:
            order_prefix = '-' if sort_order == 'desc' else ''
            qnas = qnas.order_by(f'{order_prefix}{sort_fields[sort_field]}')
    else:
        # 기본 정렬: 답변 대기 상태가 먼저, 그 다음 최신순
        from django.db.models import Case, When, Value, IntegerField
        qnas = qnas.annotate(
            reply_status=Case(
                When(reply__isnull=True, then=Value(0)),
                When(reply='', then=Value(0)),
                default=Value(1),
                output_field=IntegerField(),
            )
        ).order_by('reply_status', '-created_at')
    
    # 페이지네이션
    page_obj, total_count = paginate_queryset(request, qnas, per_page=5)
    
    # 각 항목의 번호 계산
    qnas_with_number = []
    start_index = (page_obj.number - 1) * page_obj.paginator.per_page + 1
    for idx, qna in enumerate(page_obj):
        if sort_field == 'qna_id' and sort_order == 'desc':
            number = total_count - (start_index - 1 + idx) + 1
        else:
            number = start_index + idx
        qnas_with_number.append({
            'qna': qna,
            'number': number
        })
    
    # 통계 정보
    total_qna_count = Qna.objects.count()
    
    # 컨텍스트 데이터
    context = {
        'page_obj': page_obj,
        'qnas': page_obj,
        'qnas_with_number': qnas_with_number,
        'total_qna_count': total_qna_count,
        'sort_field': sort_field,
        'sort_order': sort_order,
    }
    
    # ========= 템플릿 렌더링 및 HTTP 응답 반환 =========
    return render(request, 'admin_panel/qna_list.html', context)


def qna_detail(request, qna_id):
    """
    1:1 문의 상세 페이지 뷰
    - 문의 상세 정보 조회
    - 답변 저장 처리 (POST 요청)
    """
    # 관리자 권한 체크
    user_role = request.session.get('role', '')
    if user_role != 'ADMIN':
        return redirect('/')
    
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
                # redirect('/admin_panel/qna_list/'): 답변 저장이 완료된 후 문의 목록 페이지로 리다이렉트
                #   - '/admin_panel/qna_list/': 관리자 패널의 QnA 목록 페이지 절대 경로
                #   - 리다이렉트 이유: POST 요청 후 GET 요청으로 전환하여 페이지 새로고침
                #     (브라우저의 뒤로가기 버튼으로 POST 요청이 다시 실행되는 것을 방지)
                #   - 반환값: HttpResponseRedirect 객체 (HTTP 302 응답)
                # 결과: 답변 저장 후 문의 목록 페이지가 새로고침되어 변경사항이 반영됨
                #   - 문의 목록에서 해당 문의의 상태가 "답변 완료"로 표시됨
                return redirect('/admin_panel/qna_list/')
        elif action == 'cancel':
            # ========= 답변 취소 처리 =========
            # 관리자가 답변 작성을 취소하고 목록으로 돌아가는 경우
            # 답변을 저장하지 않고 문의 목록 페이지로 리다이렉트
            # redirect('/admin_panel/qna_list/'): 문의 목록 페이지로 리다이렉트
            #   - '/admin_panel/qna_list/': 관리자 패널의 QnA 목록 페이지 절대 경로
            #   - 반환값: HttpResponseRedirect 객체 (HTTP 302 응답)
            # 결과: 답변 작성 페이지에서 문의 목록 페이지로 이동
            #   - 답변 내용은 저장되지 않음
            return redirect('/admin_panel/qna_list/')
    
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
        role='PATIENT'
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
    
    # 이름 데이터 가져오기
    surnames, given_names = get_dummy_name_data()
    
    # 주소 데이터 가져오기
    address_data = get_dummy_address_data()
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
        gender = generate_dummy_gender()
        
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
        email = generate_dummy_email(username, role='PATIENT', index=start_num + i)
        
        # 전화번호 생성
        phone = generate_dummy_phone()
        
        # 주소 생성 (공통 함수 사용)
        address = generate_dummy_address(template['city_district'])
        
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
            role='PATIENT',
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
    - 테스트용 의사 데이터 생성
    - 전공과별 생성 또는 전체 생성 지원
    - 전공과: 내과(IM), 외과(GS), 정형외과(OR), 소아과(PD), 이비인후과(EN)
    - 각 전공과마다 1명씩 정상 승인(verified=True), 1명씩 비정상 승인(verified=False)
    - 면허번호: 전공과 영어코드 + 주민번호 뒷자리
    
    파라미터:
    - department: 생성할 전공과 (내과, 외과, 정형외과, 소아과, 이비인후과, all)
      - 특정 전공과 선택 시: 해당 전공과 의사 2명 생성
      - 'all' 선택 시: 모든 전공과 의사 10명 생성
    """
    from django.contrib.auth.hashers import make_password
    import random
    
    # POST 요청에서 전공과 파라미터 가져오기
    selected_department = request.POST.get('department', 'all')
    
    # 전공과 정보 (이름, 코드)
    all_departments = [
        {'name': '내과', 'code': 'IM'},
        {'name': '외과', 'code': 'GS'},
        {'name': '정형외과', 'code': 'OR'},
        {'name': '소아과', 'code': 'PD'},
        {'name': '이비인후과', 'code': 'EN'},
    ]
    
    # 선택된 전공과에 따라 생성할 전공과 목록 필터링
    if selected_department == 'all':
        departments = all_departments
    else:
        departments = [d for d in all_departments if d['name'] == selected_department]
        if not departments:
            return redirect('doctor_list')
    
    # 기존 코드와 호환성을 위해 원래 변수명 유지
    departments_backup = [
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
    
    # 전공과별 지정 병원 매핑
    department_hospitals = {
        '내과': ['서울본브릿지병원', '삼성서울병원', '서울숭인병원', '서울성심병원', '녹색병원'],
        '외과': ['비에비스나무병원', '아이디병원', '혜민병원', '왕십리휴병원', '서울석병원'],
        '정형외과': ['서울본브릿지병원', '연세사랑병원', '서울송도병원', '강남힘찬병원', '서울석병원'],
        '이비인후과': ['비에비스나무병원', '9988병원', '에이치 플러스 양지병원', '서울대학교병원', '한림대학교 강남성심병원'],
        '소아과': ['올바로병원', '모두가행복한연세병원', '건국대학교병원', '연세한강병원', '서울연세병원'],
    }
    
    # 전공과별 병원 객체 저장
    dept_hospital_objects = {}
    for dept_name, hospital_names in department_hospitals.items():
        dept_hospital_objects[dept_name] = []
        for hos_name in hospital_names:
            # 병원명으로 DB에서 검색 (부분 일치)
            hospital = Hospital.objects.filter(name__icontains=hos_name).first()
            if hospital:
                dept_hospital_objects[dept_name].append(hospital)
        
        # 해당 전공과에 병원이 하나도 없으면 전체 병원에서 랜덤 선택
        if not dept_hospital_objects[dept_name]:
            all_hospitals = list(Hospital.objects.all()[:5])
            dept_hospital_objects[dept_name] = all_hospitals
    
    # 병원이 없으면 기본 병원 생성
    if Hospital.objects.count() == 0:
        Hospital.objects.create(
            hpid='TEST001',
            name='테스트 병원',
            hos_name='테스트병원',
            hos_password='1234',
            address='서울특별시 강남구',
            tel='02-1234-5678',
        )
    
    # 전체 병원 목록 (백업용)
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
    
    # 이름 데이터 가져오기
    surnames, given_names = get_dummy_name_data()
    
    # 선택된 전공과 목록 (전공과별 생성 또는 전체 생성)
    departments_list = [d['name'] for d in departments]
    
    # 주소 데이터 가져오기 (사용자 더미 데이터와 동일)
    address_data = get_dummy_address_data()
    city_districts = list(address_data.keys())
    
    # 더미 의사 데이터 생성
    # - 전체 생성(all): 각 전공과마다 6명씩 총 30명
    # - 전공과별 생성: 해당 전공과 6명 (5명 승인 - 병원당 1명, 1명 대기)
    
    doctor_templates = []
    used_names = set()  # 이미 사용된 이름 조합을 추적
    department_verified_count = {dept: 0 for dept in departments_list}  # 각 전공과별 정상 승인 의사 수 추적
    department_unverified_count = {dept: 0 for dept in departments_list}  # 각 전공과별 비정상 승인 의사 수 추적
    
    # 생성할 의사 수 계산 (전공과당 6명: 승인 5명 + 대기 1명)
    doctors_per_dept = 6
    verified_per_dept = 5  # 승인 의사 수 (병원당 1명씩)
    
    # 전공과별로 의사 템플릿 생성
    for dept_name in departments_list:
        # 해당 전공과의 병원 목록 가져오기
        dept_hospitals = dept_hospital_objects.get(dept_name, hospitals[:5])
        
        # 승인 의사 5명 생성 (각 병원당 1명씩)
        for hospital_idx, hospital in enumerate(dept_hospitals[:5]):
            # 성씨와 이름을 랜덤으로 조합하여 동명이인 방지
            while True:
                surname = random.choice(surnames)
                given_name = random.choice(given_names)
                full_name = f'{surname}{given_name}'
                
                if full_name not in used_names:
                    used_names.add(full_name)
                    break
            
            # 지역 할당 (순환)
            city_district = city_districts[hospital_idx % len(city_districts)]
            
            # 성별 랜덤 할당
            gender = generate_dummy_gender()
            
            doctor_templates.append({
                'name': full_name,
                'gender': gender,
                'department': dept_name,
                'city_district': city_district,
                'hospital': hospital,
                'verified': True  # 승인 상태
            })
        
        # 대기 의사 1명 생성 (랜덤 병원)
        while True:
            surname = random.choice(surnames)
            given_name = random.choice(given_names)
            full_name = f'{surname}{given_name}'
            
            if full_name not in used_names:
                used_names.add(full_name)
                break
        
        # 대기 의사는 해당 전공과 병원 중 랜덤 선택
        pending_hospital = random.choice(dept_hospitals) if dept_hospitals else random.choice(hospitals)
        city_district = city_districts[5 % len(city_districts)]
        gender = generate_dummy_gender()
        
        doctor_templates.append({
            'name': full_name,
            'gender': gender,
            'department': dept_name,
            'city_district': city_district,
            'hospital': pending_hospital,
            'verified': False  # 대기 상태
        })
    
    total_doctors = len(doctor_templates)
    
    # 면허번호 불일치 의사 인덱스 선택 (대기 의사 중에서 랜덤 선택)
    pending_indices = [i for i, t in enumerate(doctor_templates) if not t['verified']]
    license_mismatch_index = random.choice(pending_indices) if pending_indices else -1
    
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
        
        # 면허번호 생성: 랜덤하게 선택된 1명은 주민번호 뒷자리와 일치하지 않게
        if i == license_mismatch_index:  # 랜덤하게 선택된 의사는 면허번호와 주민번호 뒷자리가 일치하지 않게
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
        email = generate_dummy_email(username, role='DOCTOR')
        
        # 전화번호 생성
        phone = generate_dummy_phone()
        
        # 주소 생성 (공통 함수 사용)
        address = generate_dummy_address(template['city_district'])
        
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
            address=address,
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
        
        # 병원 할당 (템플릿에서 가져오기)
        hospital = template['hospital']
        
        # 의사 생성
        # 승인 상태는 템플릿에서 가져오기 (5명 승인 - 병원당 1명, 1명 대기)
        current_dept = template['department']
        verified_status = template['verified']
        
        if verified_status:
            department_verified_count[current_dept] += 1
        else:
            department_unverified_count[current_dept] += 1
        
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
    - POST 방식만 허용
    """
    # POST 방식 체크
    if request.method != 'POST':
        return redirect('qna_list')
    
    from datetime import timedelta
    import random
    
    # 사용자 데이터 확인 (일반 사용자)
    users = list(Users.objects.filter(role='PATIENT'))
    
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
    - POST 방식만 허용
    """
    # POST 방식 체크
    if request.method != 'POST':
        return redirect('qna_list')
    
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
        role='PATIENT'
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
