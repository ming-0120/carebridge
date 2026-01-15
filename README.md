## **👩‍⚕️케어브릿지 (CareBridge)**

### 공공의료 데이터 기반 병원·응급실·예약 통합 관리 시스템

---

## **개요**

케어브릿지는 공공 의료 데이터를 기반으로

병원, 응급실, 의료진, 예약 정보를 통합 관리하고

사용자가 자신의 상황에 맞는 의료 서비스를 빠르게 선택할 수 있도록 돕는 웹 플랫폼이다.

관리자는 병원·의사·진료과·타임슬롯 정보를 관리할 수 있으며,

의료진은 예약된 환자 정보를 확인하고 진료 일정 관리를 수행할 수 있다.

일반 사용자는 응급실 실시간 현황 조회, 병원 검색, 진료 예약 기능을 이용할 수 있다.

---

## **주요 기술**

- **참여도**: 40% (백엔드 핵심 기능 및 서버 운영 담당)

### **데이터 요청 및 처리**

- 공공의료 Open API 연동
- Staging 테이블 기반 데이터 수집 및 정제
- 최신 데이터 기준 UPDATE / INSERT 로직 구현

### **웹 화면 연동**

- HTML, CSS, JavaScript
- AJAX 기반 비동기 데이터 요청
- JSON 응답 처리 및 동적 UI 렌더링

### **서버 액션 처리**

- Django (Python)
- Django ORM 기반 데이터 조회·가공
- 사용자 권한(Role) 분리 로직 구현

### **DB 액션 처리**

- MySQL
- 병원·의사·예약·응급실 상태 정규화 설계
- Foreign Key 기반 무결성 관리

### **보안 및 인증**

- Django Authentication
- SMTP 기반 비밀번호 재설정 (1회성 토큰)

### **Infra / 배포**

- AWS EC2
- Nginx + Gunicorn
- Linux (Ubuntu)
- 로그 관리 및 서버 장애 대응

---

## **개발 Tool**

- **IDE**: VSCode
- **DB Tool**: MySQL Workbench
- **Infra**: AWS EC2, PuTTY
- **형상관리**: GitHub
- **협업**: Notion
- **웹 서버**: Nginx, Gunicorn

---

## **Ajax · JSON 데이터 처리 시연**

- 병원 목록 필터링 및 정렬 요청
- 예약 가능 타임슬롯 동적 로딩

(※ 시연 영상 또는 GIF 첨부 영역)

---

## **케어브릿지 DB 구조 (ERD)**

- 병원(Hospital)
- 진료과(Department)
- 의사(Doctor)
- 사용자(User)
- 예약(Reservation)
- 타임슬롯(TimeSlot)
- 응급실 상태(EmergencyStatus)
- 감염병 통계(InfectiousStat)

> 병원–의사–예약 구조를 중심으로
> 
> 
> 응급실 실시간 상태는 별도 테이블로 관리하여 최신값만 유지
> 

<img width="1579" height="1264" alt="image" src="https://github.com/user-attachments/assets/e9bc3495-0496-4c86-a181-bd51cbec35f0" />




---

## **페이지 구조 · 명칭 및 기능 구현 문서화**

### **주요 페이지 구성**

- 메인 페이지
    - 응급실 현황 요약
    - 병원 검색 및 정렬
- 병원 상세 페이지
    - 응급실 상태
    - 진료과·의사 목록
- 예약 페이지
    - 의사별 진료 일정
    - 타임슬롯 선택 및 예약
- 마이페이지
    - 예약 내역 조회
    - 사용자 정보 관리
- 의료진 페이지
    - 예약 환자 목록
    - 진료 일정 관리
- 관리자 페이지
    - 병원·의사·진료과 관리
    - 데이터 상태 점검

---

## **기술적 특징 요약**

- 단순 CRUD가 아닌 **실시간성·정합성 중심 설계**
- 공공데이터 특성을 고려한 **데이터 정제 구조**
- 실제 서비스 환경을 고려한 **배포·운영 경험**
- 보안을 고려한 인증·비밀번호 재설정 구조

## **각 상황별 화면 흐름도**
- 로그인 사용자
<img width="2546" height="1165" alt="image" src="https://github.com/user-attachments/assets/47ee7261-7407-4356-9835-7141f265d4ab" />
- 비로그인 사용자
<img width="2108" height="969" alt="image" src="https://github.com/user-attachments/assets/7f45c634-a8a6-49b9-9ad3-4c207cc645ed" />
- 관리자
<img width="1513" height="1007" alt="image" src="https://github.com/user-attachments/assets/81217547-2135-4a62-b9d9-ffbccefb6d6e" />

