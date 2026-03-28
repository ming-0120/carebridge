## **👩‍⚕️케어브릿지 (CareBridge)**

### 공공의료 데이터 기반 병원·응급실·예약 통합 관리 시스템

---

## **개요**

케어브릿지는 공공 의료 데이터를 기반으로

병원, 응급실, 의료진, 예약 정보를 통합 관리하고

사용자가 자신의 상황에 맞는 의료 서비스를 빠르게 선택할 수 있도록 돕는 **통합 서비스 웹 플랫폼**이다.

---

## **주요 기술**

- **포지션**: 팀장 (백엔드 핵심 기능 및 서버 운영 담당)

### **Gemini 기반 AI 챗봇 개발**

- Google Gemini API 를 활용한 자연어 이해 기반 챗봇 구현
- 사용자 질문 의도 파악 및 공공의료 데이터 기반 정보 제공 기능 설계
- 프롬프트 설계를 통해 정확한 응답 생성 및 기본 대화 흐름 처리 기능 구현

### **데이터 요청 및 처리**

- 공공의료 Open API 연동
- Staging 테이블 기반 데이터 수집 및 정제
- 최신 데이터 기준 UPDATE / INSERT 로직 구현

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

### **상세 설계 및 기술 문서**
[Notion 링크](https://www.notion.so/API-Django-2dc8296227df80b59e88f77c7eda94c0#2dd8296227df8003bef5d89aaf92ef85)
---

## **개발 Tool**

- **IDE**: VSCode
- **DB Tool**: MySQL Workbench
- **Infra**: AWS EC2, PuTTY
- **형상관리**: GitHub
- **협업**: Notion
- **웹 서버**: Nginx, Gunicorn

---

## **ERD**
<img width="1589" height="1092" alt="image" src="https://github.com/user-attachments/assets/efc3b40f-93be-45bc-929e-b102603a471d" />
---

