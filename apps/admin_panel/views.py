from django.shortcuts import render, HttpResponse, redirect, get_object_or_404
from django.utils import timezone
from datetime import timedelta
from django.db.models import Count, Q, Sum
from django.core.paginator import Paginator
from apps.db.models import Users, Doctors, Hospital, Qna, DailyVisit, UserFavorite, Department, ErInfo
import json

# Create your views here.

def dashboard(request):
    """
    관리자 대시보드 뷰
    """
    today = timezone.now().date()
    week_ago = today - timedelta(days=7)
    
    # 1. 신규 가입자수 (오늘 기준)
    new_users_count = Users.objects.filter(
        created_at__date=today,
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
        visit_date__gte=week_ago,
        visit_date__lte=today
    ).aggregate(total=Sum('visit_count'))
    weekly_visitors_count = weekly_visitors['total'] or 0
    
    # 6. 미처리 1:1 문의 (답변이 없는 문의)
    pending_qna_count = Qna.objects.filter(reply__isnull=True).count()
    
    # 7. 의사 승인 대기 (검증되지 않은 의사)
    pending_doctors_count = Doctors.objects.filter(verified=False).count()
    
    # 8. 평균 대기 일수 (검증되지 않은 의사들의 평균 대기 일수)
    pending_doctors = Doctors.objects.filter(verified=False)
    if pending_doctors.exists():
        # Doctors 모델에 created_at이 없다면 Users의 created_at 사용
        avg_waiting_days = 1.5  # 임시값, 실제로는 계산 필요
    else:
        avg_waiting_days = 0
    
    # 9. 오늘 가입한 회원 (웹/모바일 구분 - provider로 구분)
    new_users_web = Users.objects.filter(
        created_at__date=today,
        provider='local',
        withdrawal='0'
    ).count()
    
    new_users_mobile = Users.objects.filter(
        created_at__date=today,
        provider__in=['kakao', 'naver'],
        withdrawal='0'
    ).count()
    
    # 10. 7일 이용자 그래프 데이터 (최근 7일간 일일 방문자 수)
    visitor_chart_data = {
        'labels': [],
        'values': []
    }
    
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
        'visitor_chart_data': json.dumps(visitor_chart_data),
    }
    
    return render(request, 'admin_panel/dashboard.html', context)


def user_list(request):
    """
    사용자 목록 페이지 뷰
    """
    # 검색 조건 및 키워드
    search_type = request.GET.get('search_type', '')
    search_keyword = request.GET.get('search_keyword', '')
    selected_user_id = request.GET.get('user_id', '')
    
    # 기본 쿼리셋 (Users 테이블에서만 조회)
    users = Users.objects.all().order_by('-created_at')
    
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
    
    # 페이지네이션 (페이지당 10개)
    paginator = Paginator(users, 10)
    page_number = request.GET.get('page', 1)
    page_obj = paginator.get_page(page_number)
    
    # 선택된 사용자 정보
    selected_user = None
    favorite_hospitals = []
    if selected_user_id:
        try:
            selected_user = Users.objects.get(user_id=selected_user_id, withdrawal='0')
            # 즐겨찾기 병원 조회
            favorites = UserFavorite.objects.filter(user=selected_user)
            favorite_hospitals = [fav.hos.name for fav in favorites if hasattr(fav, 'hos')]
        except Users.DoesNotExist:
            pass
    
    # 디버깅용: 전체 사용자 수와 검색 결과 수
    total_users_count = Users.objects.count()
    search_result_count = users.count()
    
    context = {
        'page_obj': page_obj,
        'users': page_obj,
        'search_type': search_type,
        'search_keyword': search_keyword,
        'selected_user': selected_user,
        'favorite_hospitals': favorite_hospitals,
        'total_users_count': total_users_count,
        'search_result_count': search_result_count,
    }
    
    return render(request, 'admin_panel/user_list.html', context)


def doctor_list(request):
    """
    의사 목록 페이지 뷰
    """
    # 검색 조건 및 키워드
    search_type = request.GET.get('search_type', '')
    search_keyword = request.GET.get('search_keyword', '')
    selected_doctor_id = request.GET.get('doctor_id', '')
    
    # 기본 쿼리셋 (모든 의사)
    doctors = Doctors.objects.select_related('user', 'hos', 'dep').all().order_by('-user__created_at')
    
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
    
    # 페이지네이션 (페이지당 10개)
    paginator = Paginator(doctors, 10)
    page_number = request.GET.get('page', 1)
    page_obj = paginator.get_page(page_number)
    
    # 선택된 의사 정보
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
        'search_type': search_type,
        'search_keyword': search_keyword,
        'selected_doctor': selected_doctor,
        'total_doctors_count': total_doctors_count,
        'search_result_count': search_result_count,
    }
    
    return render(request, 'admin_panel/doctor_list.html', context)


def hospital_list(request):
    """
    병원 목록 페이지 뷰
    """
    # 검색 조건 및 키워드
    search_type = request.GET.get('search_type', '')
    search_keyword = request.GET.get('search_keyword', '')
    selected_hospital_id = request.GET.get('hospital_id', '')
    
    # 기본 쿼리셋 (모든 병원, 의사 수 포함)
    hospitals = Hospital.objects.annotate(
        doctor_count=Count('doctors')
    ).all().order_by('-created_at')
    
    # 응급실 운영 여부를 위한 ErInfo hpid 목록
    er_hpids = set(ErInfo.objects.values_list('hpid', flat=True))
    
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
                hospitals = hospitals.filter(hpid__icontains=search_keyword)
    
    # 페이지네이션 (페이지당 10개)
    paginator = Paginator(hospitals, 10)
    page_number = request.GET.get('page', 1)
    page_obj = paginator.get_page(page_number)
    
    # 선택된 병원 정보
    selected_hospital = None
    has_emergency = False
    if selected_hospital_id:
        try:
            selected_hospital = Hospital.objects.annotate(
                doctor_count=Count('doctors')
            ).get(hos_id=selected_hospital_id)
            # 응급실 운영 여부 확인
            has_emergency = ErInfo.objects.filter(hpid=selected_hospital.hpid).exists()
        except Hospital.DoesNotExist:
            pass
    
    # 디버깅용
    total_hospitals_count = Hospital.objects.count()
    search_result_count = hospitals.count()
    
    context = {
        'page_obj': page_obj,
        'hospitals': page_obj,
        'search_type': search_type,
        'search_keyword': search_keyword,
        'selected_hospital': selected_hospital,
        'has_emergency': has_emergency,
        'er_hpids': er_hpids,
        'total_hospitals_count': total_hospitals_count,
        'search_result_count': search_result_count,
    }
    
    return render(request, 'admin_panel/hospital_list.html', context)


def approval_pending(request):
    """
    의사 승인 대기 페이지 뷰
    """
    # 검증되지 않은 의사들 조회
    pending_doctors = Doctors.objects.filter(verified=False).select_related(
        'user', 'hos', 'dep'
    ).order_by('user__created_at')
    
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
    
    # 페이지네이션 (페이지당 10개)
    paginator = Paginator(pending_doctors, 10)
    page_number = request.GET.get('page', 1)
    page_obj = paginator.get_page(page_number)
    
    # 승인/거절 처리 (POST 요청)
    if request.method == 'POST':
        action = request.POST.get('action')
        doctor_ids = request.POST.getlist('doctor_ids')
        
        if action == 'approve':
            Doctors.objects.filter(doctor_id__in=doctor_ids, verified=False).update(verified=True)
        elif action == 'reject':
            # 거절 처리 (필요시 추가 로직)
            Doctors.objects.filter(doctor_id__in=doctor_ids, verified=False).delete()
        
        return redirect('approval_pending')
    
    context = {
        'page_obj': page_obj,
        'pending_doctors': page_obj,
        'selected_doctor': selected_doctor,
        'total_pending_count': pending_doctors.count(),
    }
    
    return render(request, 'admin_panel/approval_pending.html', context)
