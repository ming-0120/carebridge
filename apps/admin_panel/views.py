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

def dashboard(request):
    """
    관리자 대시보드 뷰
    - 오늘 가입한 사용자 수, 검증 완료된 의사 수, 총 병원 수 등 통계 정보 제공
    - 최근 7일간 방문자 수 그래프 데이터 생성
    - 웹/모바일 가입자 구분 통계 제공
    """
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
    visitor_chart_data = {
        'labels': [],
        'values': []
    }
    
    # 6일 전부터 오늘까지의 데이터 수집
    for i in range(6, -1, -1):  # 6일 전부터 오늘까지
        date = today - timedelta(days=i)
        date_str = date.strftime('%m/%d')
        try:
            daily_visit = DailyVisit.objects.get(visit_date=date)
            count = daily_visit.visit_count
        except DailyVisit.DoesNotExist:
            count = 0
        visitor_chart_data['labels'].append(date_str)
        visitor_chart_data['values'].append(count)
    
    # 템플릿에 전달할 컨텍스트 데이터
    context = {
        'new_users_count': new_users_count,
        'verified_doctors_count': verified_doctors_count,
        'total_hospitals_count': total_hospitals_count,
        'total_doctors_count': total_doctors_count,
        'weekly_visitors_count': weekly_visitors_count,
        'pending_qna_count': pending_qna_count,
        'pending_doctors_count': pending_doctors_count,
        'avg_waiting_days': avg_waiting_days,
        'new_users_web': new_users_web,
        'new_users_mobile': new_users_mobile,
        'visitor_chart_data': json.dumps(visitor_chart_data),  # JSON 문자열로 변환하여 전달
    }
    
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
    # 검색 조건 및 키워드
    search_type = request.GET.get('search_type', '')
    search_keyword = request.GET.get('search_keyword', '')
    selected_user_id = request.GET.get('user_id', '')
    
    # 정렬 파라미터
    sort_field = request.GET.get('sort', '')
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
    
    # 정렬 적용
    if sort_field and sort_field in sort_fields:
        order_prefix = '-' if sort_order == 'desc' else ''
        users = users.order_by(f'{order_prefix}{sort_fields[sort_field]}')
    else:
        # 기본 정렬: 최신순
        users = users.order_by('-created_at')
    
    # 검색 필터 적용
    if search_type and search_keyword:
        search_keyword = search_keyword.strip()  # 공백 제거
        if search_keyword:  # 검색어가 비어있지 않을 때만 필터 적용
            if search_type == 'username':
                users = users.filter(username__icontains=search_keyword)
            elif search_type == 'name':
                users = users.filter(name__icontains=search_keyword)
            elif search_type == 'email':
                users = users.filter(email__icontains=search_keyword)
            elif search_type == 'phone':
                users = users.filter(phone__icontains=search_keyword)
    
    # 페이지네이션 (페이지당 5개)
    paginator = Paginator(users, 5)
    page_number = request.GET.get('page', 1)
    page_obj = paginator.get_page(page_number)
    
    # 전체 항목 수 (검색 결과 기준)
    total_count = users.count()
    
    # 각 항목의 번호 계산 (정렬 방향에 따라)
    users_with_number = []
    # start_index 계산: (현재 페이지 - 1) * 페이지당 항목 수 + 1
    start_index = (page_obj.number - 1) * paginator.per_page + 1
    for idx, user in enumerate(page_obj):
        if sort_field == 'user_id' and sort_order == 'desc':
            # 내림차순: 전체 개수에서 역순으로 계산
            number = total_count - (start_index - 1 + idx) + 1
        else:
            # 오름차순 또는 기본: 페이지네이션 기준
            number = start_index + idx
        
        # 주민번호를 생년월일로 변환 (표시용)
        birth_date = None
        if user.resident_reg_no and len(user.resident_reg_no) >= 7:
            reg_no = user.resident_reg_no
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
        
        users_with_number.append({
            'user': user,
            'number': number,
            'birth_date': birth_date
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
    
    # 디버깅용: 전체 사용자 수와 검색 결과 수 (일반 사용자만)
    total_users_count = Users.objects.filter(role='USER').count()
    search_result_count = users.count()
    
    context = {
        'page_obj': page_obj,
        'users': page_obj,
        'users_with_number': users_with_number,  # 번호가 포함된 사용자 리스트
        'search_type': search_type,
        'search_keyword': search_keyword,
        'selected_user': selected_user,
        'favorite_hospitals': favorite_hospitals,
        'birth_date': birth_date,
        'total_users_count': total_users_count,
        'search_result_count': search_result_count,
        'sort_field': sort_field,
        'sort_order': sort_order,
    }

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
    # 검색 조건 및 키워드
    search_type = request.GET.get('search_type', '')
    search_keyword = request.GET.get('search_keyword', '')
    selected_doctor_id = request.GET.get('doctor_id', '')
    
    # 정렬 파라미터
    sort_field = request.GET.get('sort', '')
    sort_order = request.GET.get('order', 'desc')
    
    # 정렬 필드 매핑 (URL 파라미터와 실제 모델 필드 매핑)
    sort_fields = {
        'doctor_id': 'doctor_id',  # No. 정렬용
        'name': 'user__name',
        'username': 'user__username',
        'license_no': 'license_no',
        'department': 'dep__dep_name',
        'hospital': 'hos__name',
        'email': 'user__email',
        'verified': 'verified',
        'created_at': 'user__created_at',
    }
    
    # 기본 쿼리셋 (모든 의사, 관련 객체 미리 로드)
    doctors = Doctors.objects.select_related('user', 'hos', 'dep').all()
    
    # 정렬 적용
    if sort_field and sort_field in sort_fields:
        # 사용자가 정렬을 선택한 경우
        order_prefix = '-' if sort_order == 'desc' else ''
        doctors = doctors.order_by(f'{order_prefix}{sort_fields[sort_field]}')
    else:
        # 기본 정렬: 승인 대기(verified=False)인 의사들이 먼저, 그 다음 최신순
        doctors = doctors.order_by('verified', '-user__created_at')
    
    # 검색 필터 적용
    if search_type and search_keyword:
        search_keyword = search_keyword.strip()
        if search_keyword:
            if search_type == 'name':
                doctors = doctors.filter(user__name__icontains=search_keyword)
            elif search_type == 'doctor_id':
                # 의사ID는 user_id나 다른 필드일 수 있음, 일단 user.username으로 검색
                doctors = doctors.filter(user__username__icontains=search_keyword)
            elif search_type == 'license_no':
                doctors = doctors.filter(license_no__icontains=search_keyword)
            elif search_type == 'department':
                doctors = doctors.filter(dep__dep_name__icontains=search_keyword)
            elif search_type == 'hospital':
                doctors = doctors.filter(hos__name__icontains=search_keyword)
    
    # 페이지네이션 (페이지당 5개)
    paginator = Paginator(doctors, 5)
    page_number = request.GET.get('page', 1)
    page_obj = paginator.get_page(page_number)
    
    # 전체 항목 수 (검색 결과 기준)
    total_count = doctors.count()
    
    # 각 항목의 번호 계산 (정렬 방향에 따라)
    doctors_with_number = []
    # start_index 계산: (현재 페이지 - 1) * 페이지당 항목 수 + 1
    start_index = (page_obj.number - 1) * paginator.per_page + 1
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
    
    # 선택된 의사 정보 (상세 정보 표시용)
    selected_doctor = None
    if selected_doctor_id:
        try:
            selected_doctor = Doctors.objects.select_related('user', 'hos', 'dep').get(doctor_id=selected_doctor_id)
        except Doctors.DoesNotExist:
            pass
    
    # 디버깅용
    total_doctors_count = Doctors.objects.count()
    search_result_count = doctors.count()
    
    context = {
        'page_obj': page_obj,
        'doctors': page_obj,
        'doctors_with_number': doctors_with_number,  # 번호가 포함된 의사 리스트
        'search_type': search_type,
        'search_keyword': search_keyword,
        'selected_doctor': selected_doctor,
        'total_doctors_count': total_doctors_count,
        'search_result_count': search_result_count,
        'sort_field': sort_field,
        'sort_order': sort_order,
    }
    
    # AJAX 요청인 경우 처리
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        # doctor_id 파라미터가 있으면 행 클릭으로 간주하여 상세 정보만 반환
        # page 파라미터가 있어도 doctor_id가 있으면 행 클릭이므로 상세 정보만 반환
        if selected_doctor_id:
            detail_html = render_to_string('admin_panel/doctor_list_detail.html', context, request=request)
            return JsonResponse({'detail_html': detail_html})
        # doctor_id가 없으면 페이지네이션이므로 전체 HTML 반환
        # 이 경우는 일반 페이지 렌더링으로 처리
    
    print('두번째')
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
    
    # 정렬 필드 매핑 (URL 파라미터와 실제 모델 필드 매핑)
    sort_fields = {
        'hos_id': 'hos_id',  # No. 정렬용
        'hos_name': 'hos_name',
        'name': 'name',
        'address': 'address',
        'tel': 'tel',
        'created_at': 'created_at',
    }
    
    # 기본 쿼리셋 (모든 병원, 의사 수 포함)
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
    
    # 페이지네이션 (페이지당 5개)
    paginator = Paginator(hospitals, 5)
    page_number = request.GET.get('page', 1)
    page_obj = paginator.get_page(page_number)
    
    # 전체 항목 수 (검색 결과 기준)
    total_count = hospitals.count()
    
    # 각 항목의 번호 계산 (정렬 방향에 따라)
    hospitals_with_number = []
    # start_index 계산: (현재 페이지 - 1) * 페이지당 항목 수 + 1
    start_index = (page_obj.number - 1) * paginator.per_page + 1
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
    
    # 선택된 병원 정보 (상세 정보 표시용)
    selected_hospital = None
    if selected_hospital_id:
        try:
            selected_hospital = Hospital.objects.annotate(
                doctor_count=Count('doctors')
            ).get(hos_id=selected_hospital_id)
        except Hospital.DoesNotExist:
            pass
    
    # 디버깅용
    total_hospitals_count = Hospital.objects.count()
    search_result_count = hospitals.count()
    
    context = {
        'page_obj': page_obj,
        'hospitals': page_obj,
        'hospitals_with_number': hospitals_with_number,  # 번호가 포함된 병원 리스트
        'search_type': search_type,
        'search_keyword': search_keyword,
        'selected_hospital': selected_hospital,
        'total_hospitals_count': total_hospitals_count,
        'search_result_count': search_result_count,
        'sort_field': sort_field,
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
    
    # 검증되지 않은 의사들 조회 (관련 객체 미리 로드)
    pending_doctors = Doctors.objects.filter(verified=False).select_related(
        'user', 'hos', 'dep'
    )
    
    # 정렬 적용
    if sort_field and sort_field in sort_fields:
        order_prefix = '-' if sort_order == 'desc' else ''
        pending_doctors = pending_doctors.order_by(f'{order_prefix}{sort_fields[sort_field]}')
    else:
        # 기본 정렬: 최신순
        pending_doctors = pending_doctors.order_by('user__created_at')
    
    # 선택된 의사 ID
    selected_doctor_id = request.GET.get('doctor_id', '')
    selected_doctor = None
    
    if selected_doctor_id:
        try:
            selected_doctor = Doctors.objects.select_related(
                'user', 'hos', 'dep'
            ).get(doctor_id=selected_doctor_id, verified=False)
        except Doctors.DoesNotExist:
            pass
    elif pending_doctors.exists():
        # 첫 번째 의사를 기본 선택
        selected_doctor = pending_doctors.first()
    
    # 페이지네이션 (페이지당 5개)
    paginator = Paginator(pending_doctors, 5)
    page_number = request.GET.get('page', 1)
    page_obj = paginator.get_page(page_number)
    
    # 전체 항목 수 (검색 결과 기준)
    total_count = pending_doctors.count()
    
    # 면허번호와 주민번호 뒷자리 일치 여부 확인 및 번호 계산 (각 의사에 대해)
    doctors_with_validation = []
    # start_index 계산: (현재 페이지 - 1) * 페이지당 항목 수 + 1
    start_index = (page_obj.number - 1) * paginator.per_page + 1
    for idx, doctor in enumerate(page_obj):
        # 면허번호에서 전공과 코드(2자리) 제거한 뒷자리 추출
        license_back = doctor.license_no[2:] if len(doctor.license_no) > 2 else ''
        
        # 주민번호에서 뒷자리 추출 (하이픈 기준)
        resident_reg_no = doctor.user.resident_reg_no
        if '-' in resident_reg_no:
            resident_back = resident_reg_no.split('-')[1] if len(resident_reg_no.split('-')) > 1 else ''
        else:
            # 하이픈이 없으면 뒤에서 7자리
            resident_back = resident_reg_no[-7:] if len(resident_reg_no) >= 7 else ''
        
        # 일치 여부 확인
        is_valid_license = (license_back == resident_back)
        
        # 번호 계산 (정렬 방향에 따라)
        if sort_field == 'doctor_id' and sort_order == 'desc':
            # 내림차순: 전체 개수에서 역순으로 계산
            number = total_count - (start_index - 1 + idx) + 1
        else:
            # 오름차순 또는 기본: 페이지네이션 기준
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
        
        # 쉼표로 구분된 문자열을 리스트로 변환
        if doctor_ids_str:
            doctor_ids = [int(id.strip()) for id in doctor_ids_str.split(',') if id.strip().isdigit()]
        else:
            doctor_ids = []
        
        if doctor_ids:
            if action == 'approve':
                # 승인 처리: verified=True로 업데이트
                Doctors.objects.filter(doctor_id__in=doctor_ids, verified=False).update(verified=True)
            elif action == 'reject':
                # 거절 처리: 의사 데이터 삭제
                Doctors.objects.filter(doctor_id__in=doctor_ids, verified=False).delete()
        
        return redirect('approval_pending')
    
    context = {
        'page_obj': page_obj,
        'pending_doctors': page_obj,
        'doctors_with_validation': doctors_with_validation,  # 면허번호 검증 정보 포함
        'selected_doctor': selected_doctor,
        'total_pending_count': pending_doctors.count(),
        'sort_field': sort_field,
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
    # 삭제 처리 (POST 요청)
    if request.method == 'POST':
        action = request.POST.get('action')
        qna_ids_str = request.POST.get('qna_ids', '')
        
        if action == 'delete' and qna_ids_str:
            # 쉼표로 구분된 ID 문자열을 리스트로 변환
            qna_ids = [int(id.strip()) for id in qna_ids_str.split(',') if id.strip()]
            if qna_ids:
                Qna.objects.filter(qna_id__in=qna_ids).delete()
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
    
    # 기본 쿼리셋 (모든 문의, 사용자 정보 미리 로드)
    qnas = Qna.objects.select_related('user').all()
    
    # 정렬 적용
    if sort_field and sort_field in sort_fields:
        # 사용자가 정렬을 선택한 경우
        if sort_field == 'status':
            # 상태 정렬: reply가 None이거나 빈 문자열인 것이 먼저 오도록
            from django.db.models import Case, When, Value, IntegerField
            qnas = qnas.annotate(
                reply_status=Case(
                    When(reply__isnull=True, then=Value(0)),  # 답변 없음 = 0
                    When(reply='', then=Value(0)),  # 빈 문자열 = 0
                    default=Value(1),  # 답변 있음 = 1
                    output_field=IntegerField(),
                )
            )
            order_prefix = '-' if sort_order == 'desc' else ''
            qnas = qnas.order_by(f'{order_prefix}reply_status', '-created_at')
        else:
            order_prefix = '-' if sort_order == 'desc' else ''
            qnas = qnas.order_by(f'{order_prefix}{sort_fields[sort_field]}')
    else:
        # 기본 정렬: 대기 상태(답변 없음)가 먼저, 그 다음 최신순
        # reply가 None이거나 빈 문자열인 것이 먼저 오도록
        from django.db.models import Case, When, Value, IntegerField
        qnas = qnas.annotate(
            reply_status=Case(
                When(reply__isnull=True, then=Value(0)),  # 답변 없음 = 0 (먼저)
                When(reply='', then=Value(0)),  # 빈 문자열 = 0 (먼저)
                default=Value(1),  # 답변 있음 = 1 (나중)
                output_field=IntegerField(),
            )
        ).order_by('reply_status', '-created_at')
    
    # 페이지네이션 (페이지당 5개)
    paginator = Paginator(qnas, 5)
    page_number = request.GET.get('page', 1)
    page_obj = paginator.get_page(page_number)
    
    # 전체 항목 수 (검색 결과 기준)
    total_count = qnas.count()
    
    # 각 항목의 번호 계산 (정렬 방향에 따라)
    qnas_with_number = []
    # start_index 계산: (현재 페이지 - 1) * 페이지당 항목 수 + 1
    start_index = (page_obj.number - 1) * paginator.per_page + 1
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
    
    # 디버깅용
    total_qna_count = Qna.objects.count()
    
    context = {
        'page_obj': page_obj,
        'qnas': page_obj,
        'qnas_with_number': qnas_with_number,  # 번호가 포함된 문의 리스트
        'total_qna_count': total_qna_count,
        'sort_field': sort_field,
        'sort_order': sort_order,
    }
    
    return render(request, 'admin_panel/qna_list.html', context)


def qna_detail(request, qna_id):
    """
    1:1 문의 상세 페이지 뷰
    - 문의 상세 정보 조회
    - 답변 저장 처리 (POST 요청)
    """
    # 문의 조회 (사용자 정보 미리 로드)
    qna = get_object_or_404(Qna.objects.select_related('user'), qna_id=qna_id)
    
    # 답변 저장 처리 (POST 요청)
    if request.method == 'POST':
        action = request.POST.get('action')
        
        if action == 'reply':
            reply_content = request.POST.get('reply_content', '').strip()
            if reply_content:
                qna.reply = reply_content
                qna.save()
                return redirect('qna_list')
        elif action == 'cancel':
            return redirect('qna_list')
    
    context = {
        'qna': qna,
    }
    
    return render(request, 'admin_panel/qna_detail.html', context)


def create_user_dummy_data(request):
    """
    더미 사용자 데이터 생성
    - 테스트용 사용자 데이터 생성 (8명)
    - 주민번호, 이메일, 전화번호 자동 생성
    - created_at을 오늘 날짜로 설정
    """
    from django.contrib.auth.hashers import make_password
    import random
    
    # 기존 더미 사용자 중 가장 큰 번호 찾기
    existing_users = Users.objects.filter(
        username__regex=r'^user\d+$',
        role='USER'
    ).values_list('username', flat=True)
    
    max_num = 0
    for username in existing_users:
        match = re.match(r'^user(\d+)$', username)
        if match:
            num = int(match.group(1))
            if num > max_num:
                max_num = num
    
    # 시작 번호 설정 (기존 번호 다음부터)
    start_num = max_num + 1
    
    # 더미 사용자 데이터 템플릿 (시, 군/구, 동 포함)
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
    
    user_templates = [
        {'name': '김철수', 'gender': 'M', 'city_district': '서울특별시 강남구'},
        {'name': '이영희', 'gender': 'W', 'city_district': '서울특별시 서초구'},
        {'name': '박민수', 'gender': 'M', 'city_district': '서울특별시 송파구'},
        {'name': '최지영', 'gender': 'W', 'city_district': '경기도 성남시 분당구'},
        {'name': '정대현', 'gender': 'M', 'city_district': '인천광역시 남동구'},
        {'name': '한소연', 'gender': 'W', 'city_district': '부산광역시 해운대구'},
        {'name': '윤성호', 'gender': 'M', 'city_district': '대전광역시 서구'},
        {'name': '강미영', 'gender': 'W', 'city_district': '광주광역시 남구'},
    ]
    
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


def create_doctor_dummy_data(request):
    """
    더미 의사 데이터 생성
    - 테스트용 의사 데이터 생성 (5명)
    - 전공과: 내과(IM), 외과(GS), 정형외과(OR), 소아과(PD), 이비인후과(EN)
    - 면허번호: 전공과 영어코드 + 주민번호 뒷자리
    - 첫 번째 의사는 면허번호와 주민번호가 일치하지 않도록 설정 (테스트용)
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
    
    # 전공과 생성 또는 조회
    dept_objects = {}
    for dept_info in departments:
        dept, created = Department.objects.get_or_create(
            dep_name=dept_info['name'],
            defaults={'dep_code': dept_info['code']}
        )
        if not created and dept.dep_code != dept_info['code']:
            # 기존 코드가 다르면 업데이트
            dept.dep_code = dept_info['code']
            dept.save()
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
    
    # 기존 더미 의사 중 가장 큰 번호 찾기
    existing_doctors = Users.objects.filter(
        username__regex=r'^doctor\d+$',
        role='DOCTOR'
    ).values_list('username', flat=True)
    
    max_num = 0
    for username in existing_doctors:
        match = re.match(r'^doctor(\d+)$', username)
        if match:
            num = int(match.group(1))
            if num > max_num:
                max_num = num
    
    # 시작 번호 설정 (기존 번호 다음부터)
    start_num = max_num + 1
    
    # 더미 의사 데이터 템플릿 (5명씩 생성)
    doctor_templates = [
        {'name': '김의사', 'gender': 'M', 'department': '내과'},
        {'name': '이의사', 'gender': 'M', 'department': '외과'},
        {'name': '박의사', 'gender': 'M', 'department': '정형외과'},
        {'name': '최의사', 'gender': 'W', 'department': '소아과'},
        {'name': '정의사', 'gender': 'M', 'department': '이비인후과'},
    ]
    
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
            license_no = f"{dept.dep_code}{wrong_back_reg}"
        else:
            # 나머지는 정상적으로 주민번호 뒷자리와 일치
            license_no = f"{dept.dep_code}{back_reg}"
        
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
    
    # 더미 문의 데이터 템플릿 (5개씩 생성)
    qna_templates = [
        {'title': '버튼 클릭이 잘 안돼요~', 'content': '홈페이지에서 응급실 이동 버튼이 클릭이 잘 안돼요~!', 'has_reply': False},
        {'title': '병원 예약 관련 문의드립니다.', 'content': '병원 예약을 하고 싶은데 어떻게 해야 하나요?', 'has_reply': True, 'reply': '병원 예약은 병원 목록에서 원하는 병원을 선택하신 후 예약 버튼을 클릭하시면 됩니다.'},
        {'title': '응급실 정보가 이상해요', 'content': '응급실 정보가 실제와 다르게 표시되는 것 같습니다.', 'has_reply': False},
        {'title': '로그인이 안됩니다', 'content': '로그인을 시도하는데 계속 실패합니다.', 'has_reply': True, 'reply': '비밀번호를 확인해주시고, 그래도 안되시면 비밀번호 찾기를 이용해주세요.'},
        {'title': '회원가입 문의', 'content': '회원가입 시 이메일 인증이 안됩니다.', 'has_reply': False},
    ]
    
    created_count = 0
    for i, template in enumerate(qna_templates):
        # 사용자 순환 할당
        user = users[i % len(users)]
        
        # 제목에 번호 추가 (누적)
        title = f'더미 문의 {start_num + i}'
        
        # 이미 존재하는지 확인 (안전장치)
        if Qna.objects.filter(title=title, user=user).exists():
            continue
        
        # 문의 생성
        qna = Qna.objects.create(
            title=title,
            content=template['content'],
            user=user,
            created_at=timezone.now() - timedelta(days=random.randint(0, 10))
        )
        
        # 답변이 있는 경우 추가
        if template.get('has_reply') and template.get('reply'):
            qna.reply = template['reply']
            qna.save()
        
        created_count += 1
    
    return redirect('qna_list')


def delete_qna_dummy_data(request):
    """
    더미 1:1 문의 데이터 삭제
    - 제목이 '더미 문의'로 시작하는 문의들 삭제
    """
    # 더미 문의 삭제 (제목이 '더미 문의'로 시작)
    deleted_count = 0
    dummy_qnas = Qna.objects.filter(
        title__startswith='더미 문의'
    )
    
    for qna in dummy_qnas:
        qna.delete()
        deleted_count += 1
    
    return redirect('qna_list')


def delete_user_dummy_data(request):
    """
    더미 사용자 데이터 삭제
    - username이 'user'로 시작하고 role='USER'인 사용자들 삭제
    """
    from django.db.models import Q
    
    # 더미 사용자 삭제 (username이 'user'로 시작하고 role='USER')
    deleted_count = 0
    dummy_users = Users.objects.filter(
        username__startswith='user',
        role='USER'
    )
    
    for user in dummy_users:
        # username이 'user' + 숫자 형식인지 확인 (예: user01, user02)
        if re.match(r'^user\d+$', user.username):
            user.delete()
            deleted_count += 1
    
    return redirect('user_list')


def delete_doctor_dummy_data(request):
    """
    더미 의사 데이터 삭제
    - username이 'doctor'로 시작하는 의사들 삭제 (Doctors와 Users 모두)
    - CASCADE로 Users도 함께 삭제됨
    """
    # 더미 의사 삭제 (username이 'doctor'로 시작)
    deleted_count = 0
    dummy_doctors = Doctors.objects.filter(
        user__username__startswith='doctor'
    ).select_related('user')
    
    for doctor in dummy_doctors:
        # username이 'doctor' + 숫자 형식인지 확인 (예: doctor01, doctor02)
        if re.match(r'^doctor\d+$', doctor.user.username):
            # Doctors를 삭제하면 CASCADE로 Users도 삭제됨
            doctor.delete()
            deleted_count += 1
    
    return redirect('doctor_list')
