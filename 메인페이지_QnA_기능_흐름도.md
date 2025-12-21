# 메인 페이지 QnA 기능 흐름도

## 개요
일반 사용자가 사용하는 QnA(1:1 문의) 기능의 전체 흐름도입니다.

---

## 1. QnA 목록 페이지 (qna_list)

### 1.1 페이지 접근 흐름

```
사용자 접근 (/qna/)
    ↓
로그인 확인 (views.py:28-33)
    ├─ 미로그인 → 로그인 페이지로 리다이렉트
    └─ 로그인됨 → 다음 단계 진행
    ↓
사용자 정보 조회 (views.py:31-33)
    ├─ 사용자 없음 → 로그인 페이지로 리다이렉트
    └─ 사용자 있음 → 다음 단계 진행
    ↓
POST 요청 파라미터 추출 (views.py:36-41)
    ├─ search: 검색 키워드
    ├─ page: 페이지 번호
    ├─ sort: 정렬 필드
    └─ order: 정렬 방향
    ↓
QnA 목록 조회 (views.py:51-58)
    ├─ 본인이 작성한 문의 (공개/비공개 모두)
    ├─ 다른 사람이 공개로 설정한 문의 (privacy='PUBLIC')
    └─ Active 사용자만 (withdrawal='0')
    ↓
정렬 처리 (views.py:60-109)
    ├─ status 정렬: 답변 대기(0) 우선, 답변 완료(1) 나중
    └─ 기타 필드 정렬: 해당 필드로 정렬
    ↓
페이지네이션 처리 (views.py:112-113)
    └─ 페이지당 10개 항목 표시
    ↓
AJAX 요청 확인 (views.py:124)
    ├─ AJAX 요청 → 테이블과 페이지네이션만 JSON 반환
    └─ 일반 요청 → 전체 페이지 렌더링
    ↓
템플릿 렌더링 (views.py:133)
    └─ m_qna_list.html 렌더링
```

### 1.2 검색 기능 흐름

```
검색어 입력
    ↓
검색 버튼 클릭
    ↓
검색 폼 제출 이벤트 (m_qna_list.js:551-627)
    ├─ 기본 제출 동작 취소 (preventDefault)
    └─ AJAX 요청 생성
    ↓
AJAX 요청 전송
    ├─ search: 검색 키워드
    ├─ sort, order: 정렬 파라미터 유지
    └─ X-Requested-With: XMLHttpRequest
    ↓
서버에서 검색 처리 (views.py:36-58)
    ├─ 제목 또는 내용으로 검색 (icontains)
    └─ 검색 결과 반환
    ↓
AJAX 응답 처리 (m_qna_list.js:587-620)
    ├─ 테이블 업데이트
    ├─ 페이지네이션 업데이트
    ├─ 스크롤 위치 복원
    └─ 이벤트 리스너 재연결
```

### 1.3 정렬 기능 흐름

```
정렬 컬럼 클릭
    ↓
정렬 링크 클릭 이벤트 (m_qna_list.js:157-351)
    ├─ 기본 동작 취소 (preventDefault)
    └─ 정렬 방향 결정
    ↓
정렬 방향 결정 로직
    ├─ 같은 필드 클릭 → 토글 (asc ↔ desc)
    ├─ 다른 필드 클릭 → 내림차순 (desc)
    └─ No. 컬럼 클릭 → 문의 일자로 정렬 (반대 방향)
    ↓
AJAX 요청 전송
    ├─ sort: 정렬 필드
    ├─ order: 정렬 방향
    ├─ search: 검색 키워드 유지
    └─ X-Requested-With: XMLHttpRequest
    ↓
서버에서 정렬 처리 (views.py:60-109)
    ├─ status 정렬: Case/When으로 답변 상태 값 생성
    └─ 기타 필드 정렬: 해당 필드로 정렬
    ↓
AJAX 응답 처리 (m_qna_list.js:226-262)
    ├─ 테이블 업데이트
    ├─ 페이지네이션 업데이트
    ├─ 스크롤 위치 복원
    └─ 이벤트 리스너 재연결
```

### 1.4 페이지네이션 AJAX 처리 흐름

```
페이지 번호 클릭
    ↓
페이지네이션 링크 클릭 이벤트 (m_qna_list.js:374-487)
    ├─ 기본 동작 취소 (preventDefault)
    └─ 페이지 번호 추출
    ↓
AJAX 요청 생성
    ├─ page: 페이지 번호
    ├─ search: 검색 키워드
    ├─ sort, order: 정렬 파라미터
    └─ X-Requested-With: XMLHttpRequest
    ↓
서버에서 페이지네이션 처리 (views.py:112-113)
    └─ 해당 페이지의 문의 목록 반환
    ↓
AJAX 응답 처리 (m_qna_list.js:447-481)
    ├─ 테이블 업데이트
    ├─ 페이지네이션 업데이트
    ├─ 스크롤 위치 복원
    └─ 이벤트 리스너 재연결
```

### 1.5 상세 페이지 이동 흐름

```
문의 행 클릭
    ↓
행 클릭 이벤트 리스너 (m_qna_list.js:111-127)
    └─ goToQnaDetail() 함수 호출
    ↓
goToQnaDetail() 함수 실행 (m_qna_list.js:38-78)
    ├─ QnA ID 확인
    ├─ POST 방식 폼 생성 (URL에 qna_id 노출 방지)
    ├─ CSRF 토큰 추가
    ├─ qna_id 추가
    └─ 폼 제출
    ↓
POST 요청 전송
    ├─ action: /qna/detail/
    ├─ method: POST
    └─ qna_id: 문의 ID
    ↓
qna_post 뷰 함수 호출
    └─ 상세 페이지 렌더링
```

### 1.6 FAQ 아코디언 기능 흐름

```
FAQ 항목 클릭
    ↓
FAQ 항목 toggle 이벤트 (m_qna_list.js:513-535)
    ├─ 항목이 열릴 때 (open=true)
    └─ 다른 모든 FAQ 항목 닫기
    ↓
아코디언 동작 완료
    └─ 한 번에 하나의 FAQ 항목만 열림
```

---

## 2. QnA 작성 페이지 (qna_write)

### 2.1 페이지 접근 흐름

```
작성 페이지 접근 (/qna/write/)
    ↓
로그인 확인 (views.py:143-149)
    ├─ 미로그인 → 로그인 페이지로 리다이렉트
    └─ 로그인됨 → 다음 단계 진행
    ↓
GET 요청 처리 (views.py:198-251)
    ├─ 사용자 정보 조회
    ├─ 생년월일 추출 (주민등록번호에서)
    ├─ 전화번호 마스킹 처리
    ├─ 이메일 분리
    └─ 작성 폼 표시
    ↓
템플릿 렌더링 (views.py:251)
    └─ m_qna_write.html 렌더링
```

### 2.2 개인정보 동의 및 작성자 정보 표시 흐름

```
페이지 로드 시 초기화 (m_qna_write.js:20-214)
    ├─ 작성자 정보 섹션 숨김 (초기 상태)
    ├─ 폼 내용 섹션 숨김 (초기 상태)
    └─ 등록/취소 버튼 숨김 (초기 상태)
    ↓
개인정보 수집 동의 라디오 버튼 선택
    ├─ 동의 (agree) 선택
    │   ├─ 작성자 정보 섹션 표시
    │   ├─ 폼 내용 섹션 표시
    │   └─ 등록/취소 버튼 표시
    └─ 동의 불가 (disagree) 선택
        ├─ 작성자 정보 섹션 숨김
        ├─ 폼 내용 섹션 숨김
        └─ 등록/취소 버튼 숨김
    ↓
작성자 정보 자동 표시
    ├─ 이름: {{ user.name }}
    ├─ 생년월일: 주민등록번호에서 추출
    ├─ 연락처: 마스킹 처리 (010 6*** ****)
    └─ 이메일: 분리 표시 (user@domain.com)
```

### 2.3 QnA 작성 및 저장 흐름

```
제목, 내용, 공개 설정 입력
    ↓
등록 버튼 클릭
    ↓
폼 제출 이벤트 (m_qna_write.js:53-135)
    ├─ 제목 유효성 검사
    │   ├─ 제목 없음 → 경고 메시지, 제출 취소
    │   └─ 제목 있음 → 다음 단계
    ├─ 내용 유효성 검사
    │   ├─ 내용 없음 → 경고 메시지, 제출 취소
    │   └─ 내용 있음 → 다음 단계
    └─ 유효성 검사 통과 → 폼 제출
    ↓
POST 요청 전송
    ├─ title: 제목
    ├─ content: 내용
    ├─ privacy: 공개 설정 (PUBLIC/PRIVATE)
    └─ privacy_consent: 개인정보 동의 (agree/disagree)
    ↓
서버에서 유효성 검사 (views.py:159-176)
    ├─ 제목/내용 없음 → 에러 메시지와 함께 작성 폼 재표시
    ├─ 개인정보 동의 없음 → 에러 메시지와 함께 작성 폼 재표시
    └─ 유효성 검사 통과 → 다음 단계
    ↓
QnA 생성 (views.py:186-193)
    ├─ Qna.objects.create()
    ├─ user: 작성자
    ├─ title: 제목
    ├─ content: 내용
    ├─ privacy: 공개 설정
    └─ reply: null (답변은 관리자가 작성)
    ↓
문의 목록 페이지로 리다이렉트 (views.py:195)
    └─ 작성된 문의 확인 가능
```

---

## 3. QnA 상세 페이지 (qna_post)

### 3.1 페이지 접근 흐름

```
상세 페이지 접근 (POST 방식)
    ↓
POST 방식 확인 (views.py:263-264)
    ├─ GET 요청 → 문의 목록으로 리다이렉트
    └─ POST 요청 → 다음 단계 진행
    ↓
로그인 확인 (views.py:267-273)
    ├─ 미로그인 → 로그인 페이지로 리다이렉트
    └─ 로그인됨 → 다음 단계 진행
    ↓
QnA ID 추출 (views.py:276-283)
    ├─ qna_id 없음 → 문의 목록으로 리다이렉트
    └─ qna_id 있음 → 다음 단계 진행
    ↓
QnA 조회 (views.py:292-300)
    ├─ 본인이 작성한 문의 (공개/비공개 모두)
    ├─ 다른 사람이 공개로 설정한 문의 (privacy='PUBLIC')
    ├─ 더미데이터 (제목이 "더미 문의"로 시작)
    └─ Active 사용자만 (withdrawal='0')
    ↓
소유자 확인 (views.py:303)
    ├─ 본인이 작성한 문의 → 삭제 버튼 표시
    └─ 다른 사람이 작성한 문의 → 삭제 버튼 숨김
    ↓
템플릿 렌더링 (views.py:311)
    └─ m_qna_post.html 렌더링
```

### 3.2 상세 정보 표시 흐름

```
상세 정보 표시
    ├─ 제목: {{ qna.title }}
    ├─ 등록자: {{ qna.user.name|mask_last_char }} (마스킹 처리)
    ├─ 공개여부: {{ qna.privacy }} (PUBLIC/PRIVATE)
    ├─ 등록일: {{ qna.created_at|date:"Y-m-d" }}
    ├─ 내용: {{ qna.content|linebreaks }}
    └─ 답변: {{ qna.reply|linebreaks }} (있는 경우만)
    ↓
답변 상태 표시
    ├─ 답변 있음 → "완료" 배지 표시
    └─ 답변 없음 → 배지 없음
```

### 3.3 삭제 기능 흐름

```
삭제 버튼 클릭 (본인 문의만 표시)
    ↓
확인 메시지 표시 (m_qna_post.html:37)
    └─ confirm('정말 삭제하시겠습니까?')
    ↓
사용자 확인
    ├─ 취소 → 작업 중단
    └─ 확인 → 폼 제출
    ↓
POST 요청 전송
    ├─ action: /qna/{qna_id}/delete/
    └─ method: POST
    ↓
qna_delete 뷰 함수 호출 (views.py:314-343)
    ├─ POST 방식 확인
    ├─ 로그인 확인
    ├─ QnA 조회 (본인이 작성한 것만)
    ├─ 더미데이터 확인
    │   ├─ 더미데이터 → 삭제하지 않음
    │   └─ 일반 문의 → 삭제 처리
    └─ 문의 목록 페이지로 리다이렉트
```

---

## 4. 데이터 모델 관계

```
Qna 모델
    ├─ qna_id: 문의 ID (PK, AutoField)
    ├─ title: 문의 제목 (CharField, max_length=255)
    ├─ content: 문의 내용 (TextField)
    ├─ reply: 답변 내용 (TextField, null=True, blank=True)
    ├─ created_at: 문의 작성일 (DateTimeField, auto_now_add=True)
    ├─ privacy: 공개 설정 (CharField, choices=QNA_PRIVACY_CHOICES, default='PUBLIC')
    │   ├─ PUBLIC: 공개
    │   └─ PRIVATE: 비공개
    └─ user: ForeignKey → Users 모델
        ├─ username: 사용자 ID
        ├─ name: 사용자 이름
        ├─ email: 이메일
        ├─ phone: 전화번호
        └─ withdrawal: 탈퇴 여부 ('0': 활성, '1': 탈퇴)
```

---

## 5. 주요 파일 구조

### 5.1 백엔드 파일
- `apps/qna/views.py`
  - `qna_list()`: 문의 목록 조회, 검색, 정렬, 페이지네이션
  - `qna_write()`: 문의 작성 폼 표시, 문의 저장
  - `qna_post()`: 문의 상세 조회
  - `qna_delete()`: 문의 삭제

- `apps/qna/urls.py`
  - `/qna/`: 문의 목록 페이지
  - `/qna/write/`: 문의 작성 페이지
  - `/qna/detail/`: 문의 상세 페이지 (POST)
  - `/qna/<int:qna_id>/delete/`: 문의 삭제 (POST)

### 5.2 프론트엔드 파일
- `apps/qna/templates/m_qna_list.html`: 문의 목록 템플릿
- `apps/qna/templates/m_qna_write.html`: 문의 작성 템플릿
- `apps/qna/templates/m_qna_post.html`: 문의 상세 템플릿
- `apps/qna/templates/qna/partials/qna_table.html`: 문의 테이블 부분 템플릿
- `apps/qna/templates/qna/partials/qna_pagination.html`: 페이지네이션 부분 템플릿
- `apps/qna/static/qna/js/m_qna_list.js`: 문의 목록 JavaScript
- `apps/qna/static/qna/js/m_qna_write.js`: 문의 작성 JavaScript
- `apps/qna/static/qna/js/m_qna_post.js`: 문의 상세 JavaScript
- `apps/qna/static/qna/js/m_qna_common.js`: 공통 JavaScript

---

## 6. 주요 기능 요약

### 6.1 문의 목록 페이지
- ✅ 로그인 필수
- ✅ 본인 문의 + 공개 문의 조회
- ✅ 검색 기능 (제목, 내용)
- ✅ 정렬 기능 (No., 제목, 일자, 작성자, 공개 설정, 상태)
- ✅ 페이지네이션 (페이지당 10개, AJAX 처리)
- ✅ 상세 페이지 이동 (POST 방식, URL에 qna_id 노출 방지)
- ✅ FAQ 아코디언 기능

### 6.2 문의 작성 페이지
- ✅ 로그인 필수
- ✅ 개인정보 수집 동의 (필수)
- ✅ 작성자 정보 자동 표시 (마스킹 처리)
- ✅ 제목, 내용, 공개 설정 입력
- ✅ 클라이언트/서버 유효성 검사

### 6.3 문의 상세 페이지
- ✅ 로그인 필수
- ✅ 본인 문의 또는 공개 문의만 조회
- ✅ 답변 표시 (있는 경우)
- ✅ 삭제 기능 (본인 문의만, 더미데이터 제외)
- ✅ POST 방식 접근 (URL에 qna_id 노출 방지)

### 6.4 문의 삭제
- ✅ 로그인 필수
- ✅ 본인 문의만 삭제 가능
- ✅ 더미데이터 삭제 불가

---

## 7. 보안 및 권한 관리

### 7.1 로그인 필수
- 모든 QnA 관련 페이지는 로그인 필수
- 미로그인 시 로그인 페이지로 리다이렉트

### 7.2 접근 제어
- 본인 문의: 공개/비공개 모두 조회 가능
- 다른 사람 문의: 공개(PUBLIC)만 조회 가능
- 더미데이터: 모든 사용자 조회 가능

### 7.3 CSRF 보호
- 모든 POST 요청에 CSRF 토큰 필수
- Django의 `{% csrf_token %}` 사용

### 7.4 URL 노출 방지
- 상세 페이지 접근: POST 방식 사용 (URL에 qna_id 노출 방지)
- 삭제 기능: POST 방식만 허용

---

## 8. 성능 최적화

### 8.1 쿼리 최적화
- `select_related('user')`: N+1 쿼리 문제 방지
- 페이지네이션: 한 번에 10개만 조회

### 8.2 AJAX 처리
- 검색, 정렬, 페이지네이션: AJAX로 처리하여 페이지 새로고침 없이 업데이트
- 스크롤 위치 복원: AJAX 처리 후 스크롤 위치 유지

---

## 9. 사용자 경험(UX) 개선 사항

### 9.1 시각적 피드백
- 답변 완료/대기 상태 배지 표시
- 정렬 방향 화살표 표시 (↑/↓)
- 현재 페이지 하이라이트

### 9.2 인터랙션
- 행 클릭으로 상세 페이지 이동
- FAQ 아코디언 (한 번에 하나만 열림)
- AJAX 처리로 페이지 새로고침 없이 목록 업데이트

### 9.3 접근성
- 반응형 디자인 (모바일, 태블릿, PC)
- 개인정보 마스킹 처리 (이름, 전화번호)

### 9.4 개인정보 보호
- 작성자 이름 마스킹 (마지막 글자)
- 전화번호 마스킹 (010 6*** ****)
- URL에 qna_id 노출 방지 (POST 방식 사용)

---

## 10. 에러 처리

### 10.1 404 에러
- 존재하지 않는 문의 ID 접근 시 404 에러 페이지 표시
- `get_object_or_404()` 사용

### 10.2 유효성 검증
- 제목/내용 빈 문자열 체크 (클라이언트/서버)
- 개인정보 동의 필수 체크

### 10.3 AJAX 에러 처리
- AJAX 요청 실패 시 전체 페이지 새로고침
- 네트워크 에러 처리

---

## 11. 참고사항

### 11.1 정렬 규칙
- 기본 정렬: 최신순 (created_at desc)
- 상태 정렬: 답변 대기(0) → 답변 완료(1)
- No. 컬럼: 문의 일자 정렬과 반대 방향으로 표시

### 11.2 공개 설정
- PUBLIC: 모든 사용자 조회 가능
- PRIVATE: 작성자만 조회 가능

### 11.3 더미데이터
- 관리자가 생성한 테스트 데이터 (제목이 "더미 문의"로 시작)
- 모든 사용자 조회 가능
- 삭제 불가

### 11.4 AJAX 요청 처리
- 검색, 정렬, 페이지네이션: AJAX로 처리하여 페이지 새로고침 없이 목록 업데이트
- 이벤트 리스너 재연결: AJAX 처리 후 새로 로드된 요소에 이벤트 리스너 재연결

### 11.5 개인정보 동의
- 개인정보 수집 동의 필수
- 동의하지 않으면 작성자 정보 및 폼 내용 숨김
- 동의해야만 문의 작성 가능






