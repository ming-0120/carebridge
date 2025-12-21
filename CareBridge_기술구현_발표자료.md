# CareBridge 기술 구현 발표 자료

## 📋 프로젝트 개요

### CareBridge란?
- **의료 정보 및 병원 예약 서비스 플랫폼**
- Django 기반 웹 애플리케이션
- 사용자, 의사, 관리자를 위한 통합 시스템

### 주요 기능
1. 응급실 조회 (실시간 혼잡도)
2. 병원 예약 시스템
3. 1:1 문의 관리
4. 관리자 패널 (통계, 승인, 관리)

---

## 🔐 1. 개인정보 보호 구현

### 전화번호 마스킹

**목적**: 개인정보 보호를 위한 전화번호 마스킹 처리

**구현 위치**:
- 필터: `apps/admin_panel/templatetags/masking_filters.py`
- 사용: `apps/admin_panel/templates/admin_panel/user_list.html`

**마스킹 규칙**:
```
원본: "010-7751-7593"
마스킹 후: "010 7**** ****"
```

**코드 구조**:
```python
@register.filter
def mask_phone(phone):
    # 010으로 시작하는 11자리 전화번호 확인
    # 앞 3자리(010) + 첫 번째 숫자 + "****" + " ****" 형식으로 변환
    return f"{area_code} {first_digit}**** ****"
```

**활용 사례**:
- 사용자 목록 테이블
- 의사 목록 테이블
- 상세 정보 모달
- QnA 답변 상세 페이지

---

## 🔍 2. 검색 및 필터링 기능

### 검색 기능

**검색 조건**:
- ID (username)
- 이름 (name)
- 이메일 (email)
- 전화번호 (phone)

**검증 로직** (JavaScript):
```javascript
function validateSearchForm(formElement) {
    // 검색 조건 선택 확인
    if (!searchType.value && searchKeyword.value.trim()) {
        alert('검색 조건을 선택해주세요.');
        return false;
    }
    
    // 검색어 입력 확인
    if (searchType.value && !searchKeyword.value.trim()) {
        alert('검색어를 입력해주세요.');
        return false;
    }
    
    // 전화번호 형식 검증
    if (searchType.value === 'phone') {
        const phoneRegex = /^[\d\s-]+$/;
        if (!phoneRegex.test(phoneValue)) {
            alert('전화번호는 숫자, 공백, 하이픈만 입력 가능합니다.');
            return false;
        }
    }
}
```

**서버 사이드 처리**:
```python
# 검색어 공백 제거 및 필터링
search_keyword = request.POST.get('search_keyword', '').strip()
if search_type and search_keyword:
    if search_type == 'username':
        users = users.filter(username__icontains=search_keyword)
    elif search_type == 'name':
        users = users.filter(name__icontains=search_keyword)
    # ... 기타 검색 조건
```

---

## 📊 3. 대시보드 통계 및 그래프

### 통계 카드 (5개)

1. **신규 가입자 수**: 오늘 가입한 사용자 (00:00:00 ~ 23:59:59)
2. **가입된 의사 수**: 검증 완료된 의사
3. **총 병원 수**: 등록된 모든 병원
4. **미처리 1:1 문의**: 답변이 없는 문의 수
5. **의사 승인 대기**: 검증 대기 중인 의사 수

### 7일간 방문자 그래프

**데이터 생성**:
```python
visitor_chart_data = {'labels': [], 'values': []}

# 최근 7일간 일일 방문자 데이터 수집
for i in range(6, -1, -1):  # 6일 전부터 오늘까지
    date = today - timedelta(days=i)
    try:
        daily_visit = DailyVisit.objects.get(visit_date=date)
        count = daily_visit.visit_count
    except DailyVisit.DoesNotExist:
        count = 0  # 데이터가 없으면 0으로 처리
    
    visitor_chart_data['labels'].append(date.strftime('%m/%d'))
    visitor_chart_data['values'].append(count)
```

**그래프 렌더링** (Chart.js):
```javascript
const ctx = document.getElementById('visitorChart');
new Chart(ctx, {
    type: 'bar',
    data: {
        labels: visitorChartData.labels,
        datasets: [{
            label: '방문자 수',
            data: visitorChartData.values,
            backgroundColor: '#3B82F6'
        }]
    }
});
```

---

## 📝 4. 정렬 및 페이지네이션

### 정렬 기능

**정렬 가능한 필드**:
- 사용자 ID, 이름, 이메일, 전화번호, 가입일 등

**정렬 처리** (JavaScript):
```javascript
function getSortUrl(sortField, currentSort, currentOrder) {
    const url = new URL(window.location.href);
    
    // 정렬 방향 결정 (같은 필드 클릭 시 토글)
    let newOrder = 'asc';
    if (currentSort === sortField && currentOrder === 'asc') {
        newOrder = 'desc';
    }
    
    url.searchParams.set('sort', sortField);
    url.searchParams.set('order', newOrder);
    
    return url.toString();
}
```

**서버 사이드 정렬**:
```python
# DB 레벨에서 정렬 (페이지네이션 전에 정렬 필수)
users = users.order_by(f'{order_prefix}{sort_field}')

# 페이지네이션
page_obj, total_count = paginate_queryset(request, users, per_page=5)
```

### 페이지네이션

**페이지네이션 구조**:
```html
<div class="pagination">
    <!-- 첫 페이지, 이전 페이지 -->
    <a href="#" class="page-link" data-page="1">«</a>
    <a href="#" class="page-link" data-page="{{ prev_page }}"><</a>
    
    <!-- 페이지 번호 -->
    {% for page_num in page_range %}
        <a href="#" class="page-link {% if page_num == current_page %}active{% endif %}" 
           data-page="{{ page_num }}">{{ page_num }}</a>
    {% endfor %}
    
    <!-- 다음 페이지, 마지막 페이지 -->
    <a href="#" class="page-link" data-page="{{ next_page }}">></a>
    <a href="#" class="page-link" data-page="{{ total_pages }}">»</a>
</div>
```

**페이지네이션 규칙**:
- ✅ DB 레벨에서 정렬 후 페이지네이션
- ❌ 페이지네이션 후 Python `sorted()` 사용 금지 (전체 정렬 깨짐)

---

## 🏥 5. 병원 검색 API 연동

### 공공데이터 API 활용

**API 엔드포인트**:
```
Base URL: apis.data.go.kr/B551182/hospInfoServicev2
Method: getHospBasisList
```

**API 호출 코드**:
```python
@require_GET
def hospital_search(request):
    q = request.GET.get("q", "").strip()
    
    if not q:
        return JsonResponse({"results": []})
    
    SERVICE_KEY = "9767c8cf570c27ef856b2b355630a0d4a5701223a487b61faf3d9b3950c7b9d1"
    base_url = "https://apis.data.go.kr/B551182/hospInfoServicev2/getHospBasisList"
    
    params = {
        "ServiceKey": SERVICE_KEY,
        "pageNo": "1",
        "numOfRows": "50",
        "_type": "json",
        "yadmNm": q,  # 병원명 검색
    }
    
    resp = requests.get(base_url, params=params, timeout=30)
    # API 응답 처리...
```

**검색 결과 자동 입력** (JavaScript):
```javascript
hospitalResultsBody.addEventListener('click', function(e) {
    const tr = e.target.closest('tr.hospital-row');
    
    // 선택한 병원 정보를 폼에 자동 입력
    document.getElementById('hospital_name').value = tr.dataset.name;
    document.getElementById('hospital_tel').value = tr.dataset.tel;
    document.getElementById('hospital_estb_date').value = tr.dataset.estbDate;
    // ...
});
```

---

## 💬 6. 1:1 문의 (QnA) 시스템

### 비공개 설정 및 개인정보 보호

**비공개 설정 로직**:
```python
# QnA 목록 조회 필터
qnas = Qna.objects.filter(
    Q(user=user) |  # 본인이 작성한 글 (공개/비공개 모두 표시)
    (Q(privacy='PUBLIC') & ~Q(user=user))  # 다른 사람이 공개로 설정한 글만
)
```

**개인정보 수집 동의 처리**:

**HTML 구조**:
```html
<!-- 동의 선택 -->
<label>
    <input type="radio" name="privacy_consent" value="agree" required>
    <span>개인정보 수집 동의.</span>
</label>
<label>
    <input type="radio" name="privacy_consent" value="disagree">
    <span>개인정보수집 및 이용에 동의 불가.</span>
</label>

<!-- 작성자 정보 (초기 상태: 숨김) -->
<div id="writer-info-group" style="display: none;">
    <!-- 작성자 정보 -->
</div>
```

**JavaScript 처리**:
```javascript
// 초기 상태: 작성자 정보 숨김
hideWriterInfoSection();

// 동의 선택 시
privacyConsentAgree.addEventListener('change', function() {
    if (this.checked) {
        showWriterInfoSection();  // 작성자 정보 표시
    }
});

// 동의 불가 선택 시
privacyConsentDisagree.addEventListener('change', function() {
    if (this.checked) {
        hideWriterInfoSection();  // 작성자 정보 숨김
    }
});
```

**서버 사이드 검증**:
```python
privacy_consent = request.POST.get('privacy_consent', '')

if privacy_consent != 'agree':
    return render(request, 'qna/m_qna_write.html', {
        'error': '개인정보 수집에 동의해주세요.',
        'privacy': privacy,
    })
```

### 자동 삭제 기능 (30일 보관)

**구현 목적**:
- 개인정보 보호
- 데이터베이스 용량 관리
- 성능 최적화

**코드**:
```python
def qna_list(request):
    # 30일 이전 데이터 자동 삭제
    thirty_days_ago = timezone.now() - timedelta(days=30)
    
    deleted_count, _ = Qna.objects.filter(
        created_at__lt=thirty_days_ago
    ).delete()
    
    if deleted_count > 0:
        print(f'[qna_list] 30일 이전 문의 데이터 {deleted_count}개 자동 삭제 완료')
    
    # 나머지 로직...
```

**동작 방식**:
- 관리자가 QnA 목록 페이지 접근 시마다 실행
- 30일 이전 문의 자동 삭제
- 삭제된 데이터 개수 로그 출력

---

## ✅ 7. 의사 승인 관리

### 승인/거절 처리

**체크박스 선택**:
```javascript
function updateSelectedIds() {
    const checkboxes = document.querySelectorAll('input[name="doctor_checkbox"]:checked');
    const ids = Array.from(checkboxes).map(cb => cb.value);
    document.getElementById('doctorIdsInput').value = ids.join(',');
}

function approveSelected() {
    const doctorIds = document.getElementById('doctorIdsInput').value;
    if (!doctorIds) {
        alert('승인할 의사를 선택해주세요.');
        return;
    }
    
    if (confirm('선택한 의사를 승인하시겠습니까?')) {
        document.getElementById('actionInput').value = 'approve';
        document.getElementById('approvalForm').submit();
    }
}
```

**전체 선택 (조건부)**:
```javascript
function handleSelectAll() {
    const selectAllCheckbox = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('input[name="doctor_checkbox"]:not([disabled])');
    
    // 활성화된 체크박스만 선택/해제
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
    
    updateSelectedIds();
}
```

**서버 사이드 처리**:
```python
if action == 'approve':
    doctor_ids = [int(id) for id in doctor_ids_str.split(',')]
    Doctors.objects.filter(doctor_id__in=doctor_ids).update(verified=True)
elif action == 'reject':
    doctor_ids = [int(id) for id in doctor_ids_str.split(',')]
    Doctors.objects.filter(doctor_id__in=doctor_ids).update(verified=False)
```

---

## 🎯 핵심 기술 요약

### 보안
- ✅ 개인정보 마스킹 처리
- ✅ 권한 기반 접근 제어 (ADMIN 체크)
- ✅ CSRF 토큰 검증
- ✅ 입력값 검증 (클라이언트 + 서버)

### 성능
- ✅ `select_related()` / `prefetch_related()` 활용
- ✅ DB 레벨 정렬 및 페이지네이션
- ✅ AJAX를 통한 비동기 처리
- ✅ 자동 데이터 정리 (30일 삭제)

### 사용자 경험
- ✅ 실시간 검색 및 필터링
- ✅ 직관적인 정렬 기능
- ✅ 반응형 디자인 (모바일/태블릿/PC)
- ✅ 조건부 UI 표시 (동의/비동의)

### 코드 품질
- ✅ DRY 원칙 준수 (공통 함수 활용)
- ✅ 명확한 주석 작성
- ✅ 모듈화된 구조
- ✅ 재사용 가능한 컴포넌트

---

## 📌 주요 파일 구조

```
apps/
├── admin_panel/          # 관리자 패널
│   ├── views.py          # 뷰 로직
│   ├── templates/        # HTML 템플릿
│   ├── static/           # CSS, JavaScript
│   └── templatetags/     # 커스텀 템플릿 필터 (마스킹)
├── qna/                  # 1:1 문의
│   ├── views.py
│   ├── templates/
│   └── static/
├── hospitals/            # 병원 검색 API
│   └── views.py
└── db/                   # 데이터베이스 모델
    └── models/
```

---

## 🎓 학습 포인트

1. **Django 템플릿 필터**: 커스텀 필터를 통한 데이터 변환
2. **AJAX 처리**: 페이지 전환 없이 동적 데이터 로드
3. **공공데이터 API**: 외부 API 연동 및 데이터 활용
4. **개인정보 보호**: 마스킹, 동의 처리, 자동 삭제
5. **성능 최적화**: 쿼리 최적화, 페이지네이션, 정렬 전략

---

## ❓ Q&A

발표 중 질문에 대비하여 주요 구현 세부사항을 준비해주세요.

