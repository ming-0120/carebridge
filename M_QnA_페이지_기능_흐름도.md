# M_QnA 페이지 기능 흐름도

## 개요
관리자 패널의 1:1 문의 관리 페이지 관련 전체 기능 흐름도입니다.

---

## 1. QnA 목록 페이지 (qna_list)

### 1.1 페이지 접근 흐름

```
사용자 접근
    ↓
관리자 권한 체크 (views.py:1262-1264)
    ├─ 권한 없음 → 메인 페이지로 리다이렉트 (/)
    └─ 권한 있음 → 다음 단계 진행
    ↓
30일 이전 데이터 자동 삭제 (views.py:1286-1307)
    ↓
POST 요청 확인 (views.py:1310)
    ├─ POST 요청 (action='delete') → 삭제 처리 (views.py:1314-1319)
    │   └─ 답변이 있는 문의만 삭제 (reply__isnull=False)
    │   └─ 문의 목록 페이지로 리다이렉트
    └─ GET 요청 → 목록 조회 처리
    ↓
정렬 파라미터 추출 (views.py:1322-1323)
    ├─ sort_field: 정렬 필드 (qna_id, name, email, title, status, created_at)
    └─ sort_order: 정렬 방향 (asc, desc)
    ↓
쿼리셋 생성 및 정렬 (views.py:1336-1366)
    ├─ 기본: 답변 대기 상태 우선, 그 다음 최신순
    └─ 정렬 필드 지정 시: 해당 필드로 정렬
    ↓
페이지네이션 처리 (views.py:1369)
    └─ 페이지당 5개 항목 표시
    ↓
번호 계산 (views.py:1372-1382)
    └─ 페이지네이션 고려한 순번 계산
    ↓
템플릿 렌더링 (views.py:1398)
    └─ qna_list.html 렌더링
```

### 1.2 정렬 기능 흐름

```
사용자가 정렬 컬럼 클릭
    ↓
JavaScript 이벤트 처리 (qna_list.js)
    └─ admin_common.js의 정렬 함수 사용
    ↓
AJAX 요청 또는 페이지 새로고침
    ├─ sort 파라미터: 정렬 필드
    └─ order 파라미터: 정렬 방향 (asc/desc)
    ↓
서버에서 정렬 처리 (views.py:1339-1366)
    ├─ status 정렬: 답변 대기(0) 우선, 답변 완료(1) 나중
    └─ 기타 필드 정렬: 해당 필드로 정렬
    ↓
정렬된 목록 반환
```

### 1.3 체크박스 선택 기능 흐름

```
전체 선택 체크박스 클릭
    ↓
toggleSelectAllQna() 함수 실행 (qna_list.js:38)
    ├─ 전체 선택 체크박스 상태 확인
    ├─ 모든 개별 체크박스 선택/해제
    └─ updateSelectedQnas() 호출
    ↓
개별 체크박스 클릭
    ↓
updateSelectedQnas() 함수 실행 (qna_list.js:174)
    ├─ 선택된 체크박스 ID 수집
    ├─ 쉼표로 구분된 문자열로 변환
    └─ 숨겨진 입력 필드(qnaIdsInput)에 저장
    ↓
선택된 문의 ID 목록 업데이트 완료
```

### 1.4 일괄 삭제 기능 흐름

```
삭제 버튼 클릭
    ↓
deleteSelectedQnas() 함수 실행 (qna_list.js:290)
    ├─ 선택된 문의 ID 확인
    ├─ 선택된 문의 없으면 경고 메시지 표시
    └─ 선택된 문의 있으면 확인 메시지 표시
    ↓
사용자 확인 (confirm)
    ├─ 취소 → 작업 중단
    └─ 확인 → 폼 제출
    ↓
POST 요청 전송
    ├─ action='delete'
    └─ qna_ids='1,2,3' (선택된 문의 ID 목록)
    ↓
서버에서 삭제 처리 (views.py:1314-1319)
    ├─ 답변이 있는 문의만 삭제 (reply__isnull=False)
    └─ 문의 목록 페이지로 리다이렉트
```

### 1.5 상세 페이지 이동 흐름

```
문의 행 클릭
    ↓
행 클릭 이벤트 리스너 (qna_list.js:556-687)
    ├─ 체크박스 클릭 이벤트는 제외
    └─ goToQnaDetail() 함수 호출
    ↓
goToQnaDetail() 함수 실행 (qna_list.js:413)
    ├─ 문의 ID 확인
    └─ 상세 페이지 URL 생성: /admin_panel/qna_detail/{qnaId}/
    ↓
페이지 이동
    └─ qna_detail 뷰 함수 호출
```

### 1.6 페이지네이션 AJAX 처리 흐름

```
페이지 번호 클릭
    ↓
JavaScript 이벤트 처리 (admin_common.js)
    ├─ AJAX 요청 생성
    ├─ sort, order 파라미터 유지
    └─ page 파라미터 전달
    ↓
서버에서 페이지네이션 처리 (views.py:1369)
    └─ 해당 페이지의 문의 목록 반환
    ↓
AJAX 응답 처리
    ├─ 테이블 본문 업데이트
    └─ 페이지네이션 UI 업데이트
```

---

## 2. QnA 상세 페이지 (qna_detail)

### 2.1 페이지 접근 흐름

```
상세 페이지 URL 접근 (/admin_panel/qna_detail/{qna_id}/)
    ↓
관리자 권한 체크 (views.py:1408-1410)
    ├─ 권한 없음 → 메인 페이지로 리다이렉트 (/)
    └─ 권한 있음 → 다음 단계 진행
    ↓
문의 조회 (views.py:1423)
    ├─ select_related('user')로 사용자 정보 미리 로드
    └─ 문의 없으면 404 에러
    ↓
POST 요청 확인 (views.py:1434)
    ├─ POST 요청 → 답변 저장/취소 처리
    └─ GET 요청 → 상세 정보 표시
    ↓
템플릿 렌더링 (views.py:1518)
    └─ qna_detail.html 렌더링
```

### 2.2 답변 작성 및 저장 흐름

```
답변 내용 입력
    ↓
답변 완료 버튼 클릭
    ↓
답변 완료 버튼 클릭 이벤트 (qna_detail.js:53-84)
    ├─ 답변 내용 확인
    ├─ 빈 내용이면 경고 메시지 표시
    └─ 내용이 있으면 확인 메시지 표시
    ↓
사용자 확인 (confirm)
    ├─ 취소 → 작업 중단
    └─ 확인 → 폼 제출
    ↓
POST 요청 전송
    ├─ action='reply'
    └─ reply_content='답변 내용'
    ↓
서버에서 답변 저장 처리 (views.py:1442-1476)
    ├─ 답변 내용 유효성 검증
    ├─ qna.reply 필드에 저장
    └─ 데이터베이스에 저장 (qna.save())
    ↓
문의 목록 페이지로 리다이렉트
    └─ 답변 완료 상태로 표시됨
```

### 2.3 답변 취소 흐름

```
답변 취소 버튼 클릭
    ↓
답변 취소 버튼 클릭 이벤트 (qna_detail.js:88-113)
    └─ 확인 메시지 표시
    ↓
사용자 확인 (confirm)
    ├─ 취소 → 작업 중단
    └─ 확인 → 폼 제출
    ↓
POST 요청 전송
    └─ action='cancel'
    ↓
서버에서 답변 취소 처리 (views.py:1477-1486)
    └─ 문의 목록 페이지로 리다이렉트
    ↓
문의 목록 페이지로 이동
    └─ 답변 내용은 저장되지 않음
```

---

## 3. 더미 데이터 관리

### 3.1 더미 데이터 생성 흐름

```
더미 데이터 생성 버튼 클릭 (개발 환경)
    ↓
POST 요청 전송 (/admin_panel/create_qna_dummy/)
    ↓
create_qna_dummy_data() 함수 실행 (views.py:2174)
    ├─ POST 방식 체크
    ├─ 일반 사용자(PATIENT) 조회
    └─ 기존 더미 문의 번호 확인
    ↓
더미 문의 템플릿 정의 (views.py:2222-2228)
    ├─ 5개의 문의 템플릿
    ├─ 일부는 답변 있음 (has_reply=True)
    └─ 일부는 답변 없음 (has_reply=False)
    ↓
각 템플릿 순회하며 문의 생성 (views.py:2241-2344)
    ├─ 사용자 순환 할당
    ├─ 제목에 번호 추가 ('더미 문의 {번호}')
    ├─ 중복 확인
    ├─ 문의 생성 (Qna.objects.create)
    ├─ 답변이 있으면 reply 필드에 저장
    └─ 과거 날짜로 created_at 설정 (0~10일 전)
    ↓
문의 목록 페이지로 리다이렉트 (views.py:2355)
    └─ 생성된 더미 문의 확인 가능
```

### 3.2 더미 데이터 삭제 흐름

```
더미 데이터 삭제 버튼 클릭 (개발 환경)
    ↓
POST 요청 전송 (/admin_panel/delete_qna_dummy/)
    ↓
delete_qna_dummy_data() 함수 실행 (views.py:2358)
    ├─ POST 방식 체크
    └─ 제목이 '더미 문의'로 시작하는 문의 조회
    ↓
각 문의 순회하며 삭제 (views.py:2396-2414)
    ├─ qna.delete() 호출
    └─ 삭제된 개수 카운트
    ↓
문의 목록 페이지로 리다이렉트 (views.py:2424)
    └─ 더미 문의가 목록에서 제거됨
```

---

## 4. 자동 삭제 기능

### 4.1 30일 이전 데이터 자동 삭제 흐름

```
문의 목록 페이지 접근 시마다 실행 (views.py:1286-1307)
    ↓
30일 전 날짜 계산
    └─ timezone.now() - timedelta(days=30)
    ↓
30일 이전 문의 조회 및 삭제
    ├─ Qna.objects.filter(created_at__lt=thirty_days_ago)
    └─ .delete() 호출
    ↓
삭제된 문의 개수 로그 출력 (선택사항)
    └─ deleted_count > 0이면 로그 출력
    ↓
정상적으로 목록 조회 계속 진행
```

---

## 5. 데이터 모델 관계

```
Qna 모델
    ├─ qna_id: 문의 ID (PK)
    ├─ title: 문의 제목
    ├─ content: 문의 내용
    ├─ reply: 답변 내용 (nullable)
    ├─ created_at: 문의 작성일
    └─ user: ForeignKey → Users 모델
        ├─ username: 사용자 ID
        ├─ name: 사용자 이름
        ├─ email: 이메일
        └─ phone: 전화번호
```

---

## 6. 주요 파일 구조

### 6.1 백엔드 파일
- `apps/admin_panel/views.py`
  - `qna_list()`: 문의 목록 조회, 삭제, 정렬, 페이지네이션
  - `qna_detail()`: 문의 상세 조회, 답변 저장/취소
  - `create_qna_dummy_data()`: 더미 데이터 생성
  - `delete_qna_dummy_data()`: 더미 데이터 삭제

- `apps/admin_panel/urls.py`
  - `/admin_panel/qna_list/`: 문의 목록 페이지
  - `/admin_panel/qna_detail/<int:qna_id>/`: 문의 상세 페이지
  - `/admin_panel/create_qna_dummy/`: 더미 데이터 생성
  - `/admin_panel/delete_qna_dummy/`: 더미 데이터 삭제

### 6.2 프론트엔드 파일
- `apps/admin_panel/templates/admin_panel/qna_list.html`: 문의 목록 템플릿
- `apps/admin_panel/templates/admin_panel/qna_detail.html`: 문의 상세 템플릿
- `apps/admin_panel/static/admin_panel/js/qna_list.js`: 문의 목록 JavaScript
- `apps/admin_panel/static/admin_panel/js/qna_detail.js`: 문의 상세 JavaScript
- `apps/admin_panel/static/admin_panel/css/qna_list.css`: 문의 목록 스타일
- `apps/admin_panel/static/admin_panel/css/qna_detail.css`: 문의 상세 스타일

---

## 7. 주요 기능 요약

### 7.1 문의 목록 페이지
- ✅ 문의 목록 조회 및 표시
- ✅ 정렬 기능 (No., 제목, 이름, 이메일, 일자, 상태)
- ✅ 페이지네이션 (페이지당 5개)
- ✅ 체크박스 선택 (전체 선택/개별 선택)
- ✅ 일괄 삭제 (답변이 있는 문의만 삭제 가능)
- ✅ 상세 페이지 이동 (행 클릭)
- ✅ 30일 이전 데이터 자동 삭제

### 7.2 문의 상세 페이지
- ✅ 문의 상세 정보 표시 (작성자, 연락처, 이메일, 제목, 내용)
- ✅ 답변 작성 및 저장
- ✅ 답변 취소
- ✅ 기존 답변 수정

### 7.3 더미 데이터 관리 (개발 환경)
- ✅ 더미 문의 데이터 생성 (5개)
- ✅ 더미 문의 데이터 삭제

---

## 8. 보안 및 권한 관리

### 8.1 권한 체크
- 모든 QnA 관련 페이지는 관리자 권한(ADMIN) 필수
- 권한이 없으면 메인 페이지로 리다이렉트

### 8.2 CSRF 보호
- 모든 POST 요청에 CSRF 토큰 필수
- Django의 `{% csrf_token %}` 사용

### 8.3 데이터 삭제 제한
- 일괄 삭제: 답변이 있는 문의만 삭제 가능 (reply__isnull=False)
- 대기 중인 문의는 삭제 불가 (체크박스 비활성화)

---

## 9. 성능 최적화

### 9.1 쿼리 최적화
- `select_related('user')`: N+1 쿼리 문제 방지
- 페이지네이션: 한 번에 5개만 조회

### 9.2 자동 데이터 정리
- 30일 이전 데이터 자동 삭제로 데이터베이스 용량 관리

---

## 10. 사용자 경험(UX) 개선 사항

### 10.1 시각적 피드백
- 답변 완료/대기 상태 배지 표시
- 정렬 방향 화살표 표시 (↑/↓)
- 현재 페이지 하이라이트

### 10.2 인터랙션
- 행 클릭으로 상세 페이지 이동
- 확인 메시지로 실수 방지
- AJAX 페이지네이션으로 페이지 새로고침 없이 목록 업데이트

### 10.3 접근성
- 반응형 디자인 (모바일, 태블릿, PC)
- 개인정보 마스킹 처리 (전화번호, 이름)

---

## 11. 에러 처리

### 11.1 404 에러
- 존재하지 않는 문의 ID 접근 시 404 에러 페이지 표시
- `get_object_or_404()` 사용

### 11.2 유효성 검증
- 답변 내용 빈 문자열 체크
- 선택된 문의 없을 때 경고 메시지

---

## 12. 참고사항

### 12.1 정렬 규칙
- 기본 정렬: 답변 대기 상태 우선, 그 다음 최신순
- 상태 정렬: 답변 대기(0) → 답변 완료(1)
- 페이지네이션 후 Python `sorted()` 사용하지 않음 (DB 레벨에서 정렬)

### 12.2 삭제 규칙
- 일괄 삭제: 답변이 있는 문의만 삭제 가능
- 더미 데이터 삭제: 제목이 '더미 문의'로 시작하는 모든 문의 삭제
- 자동 삭제: 30일 이전 문의 자동 삭제

### 12.3 AJAX 요청 처리
- 페이지네이션: AJAX로 처리하여 페이지 새로고침 없이 목록 업데이트
- 정렬: AJAX로 처리하여 페이지 새로고침 없이 정렬된 목록 표시




