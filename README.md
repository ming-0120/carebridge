# 👩‍⚕️ **케어브릿지**
<img width="1536" height="1024" alt="logo_2" src="https://github.com/user-attachments/assets/cf3229b3-90e2-4840-8066-8d28ecf94218" />

## **🤳 화면**
### **사용자 화면 구상도**
<img width="1589" height="1306" alt="image" src="https://github.com/user-attachments/assets/8e7afd70-2bcb-4bae-9c8b-5b48b520e0fa" />
### **의료진 화면 구상도**
<img width="1425" height="1008" alt="image" src="https://github.com/user-attachments/assets/2c7a54d5-aa5d-4727-baac-d01610ffbe93" />
### **관리자 화면 구상도**
<img width="1422" height="897" alt="image" src="https://github.com/user-attachments/assets/ce182eaa-7d49-41c8-bed9-e71014e80ac4" />

### **케어브릿지 발표 영상**
[![케어브릿지_발표영상](http://img.youtube.com/vi/T2mVEn3PbGM/0.jpg)](https://www.youtube.com/watch?v=T2mVEn3PbGM)

<img width="1905" height="1760" alt="KakaoTalk_20251229_114717726_03" src="https://github.com/user-attachments/assets/02fd408f-b174-48e2-b1e4-a1514f0bb324" />
<img width="1905" height="1510" alt="KakaoTalk_20251229_114717726" src="https://github.com/user-attachments/assets/64dfacc7-817f-4518-b93d-a7f47c127f5d" />
<img width="1920" height="919" alt="KakaoTalk_20251229_114717726_01" src="https://github.com/user-attachments/assets/f11f1749-32f6-4dd8-9f38-e504049a6876" />
<img width="1920" height="919" alt="KakaoTalk_20251229_114717726_02" src="https://github.com/user-attachments/assets/52fc56db-b1ce-4108-8533-1298db28c09c" />
<img width="1905" height="1311" alt="KakaoTalk_20251229_114717726_04" src="https://github.com/user-attachments/assets/b488cb7c-8dfa-4e0e-891b-1f6c847681bc" />

## **프로젝트 개요**

- **프로젝트명**: 케어브릿지 (CareBridge) – 공공의료 데이터 기반 병원·응급실 통합 정보 플랫폼
- **개발 기간**: 2025.11.19 ~ 2025.12.23
- **수행 방식**: **팀 프로젝트**
- **담당 범위**: 백엔드(Django) / 데이터 처리 / 일부 프론트 연동

## **서비스 기획 배경**

- 응급실, 병원 예약, 감염병 정보를 한 곳에서 확인할 수 있는 **의료 통합 시스템 개발**
- **공공데이터**는 많지만 흩어져 있어서 기능적 사용은 어려움
- 응급실 포화도가 단순 조회가 아닌 **거리·혼잡도·상태 기반 의사결정 지원**이 필요

---
# **💡 기능 요약 및 담당 역할**

## **📌 기능 요약**

- 실시간 응급실 병상/장비 정보 제공
- 병원 및 의사 예약 기능
- 감염병 통계 시각화
- 사용자/의료진 역할 분리
- 실제 서비스처럼 동작하는 서버 환경 구성

## **👩🏻‍💻 담당 역할**

- Django 기반 **백엔드 전체 구조 설계**
- 공공 의료 API 수집 및 DB 적재 로직 구현
- 병원·의사·예약·타임슬롯 도메인 모델링
- AWS EC2 서버 배포 및 운영 환경 구성
- SMTP 기반 비밀번호 재설정 메일 기능 구현

---

# **협업 및 커뮤니케이션 방법**

- GitHub Flow 기반 협업
- 기능 단위 PR 및 코드 리뷰
- 문제 발생 시 원인·해결 과정을 Notion에 기록
- 프론트엔드와 API 명세 공유

---
# **개발 중 발생한 문제 해결 및 트러블슈팅 경험**
---

## **✅ 배포 문제 : 서버 500 에러 및 디스크 용량 문제**

### **🧨 문제 상황**

- 잘 작동하던 배포된 서버가 자주 응답 불가(500) 에러 발생
- 백엔드 /  프론트엔드 파일의 로그에도  원인이 밝혀지지 않았음.

### **🔍 해결 과정**

1. 실무의 경험을 살려 프로그램상의 문제로는 보이지 않아 서버상에서 로그가 쌓이도록 추가
2. 특정 폴더의 용량이 말도 안 되게 늘어난 것을 확인
3. 실시간 응급실 데이터를 받아오던 로그 파일(`fetch_emergency.log`) 과도한 누적 확인
4. 로그 로테이션 및 불필요 로그 삭제
5. 서버 정상화 후 재배포

---

## ✅ 보안 문제 : 비밀번호 재설정 보안 이슈

### 🧨 문제 상황

- 비밀번호를 화면에 직접 노출하는 방식은 보안상 위험
- 개선: 1회성 토큰 + 이메일 인증 기반 비밀번호 재설정 방식으로 변경

### 🔐 비밀번호 재설정 보안 처리

사용자 정보 검증 → 서명 토큰 생성 → 이메일 인증 링크 전달 방식 적용

### 🔍 해결 방법

1️⃣ 사용자 검증 로직

```python
candidates = Users.objects.filter(
    provider="local",
    withdrawal='0',
    name=name,
    username=username,
    email__iexact=email,
).only("user_id", "email", "resident_reg_no")

matched = [
    u for u in candidates
    if normalize_rrn(u.resident_reg_no).startswith(birth_6)
]

# 🔐 보안 포인트:
# - 입력 정보와 DB 데이터를 교차 검증하여 계정 존재 여부 확인
# - 존재하지 않는 경우 즉시 종료 (계정 정보 노출 방지)
if not matched:
    messages.error(request, "입력하신 정보와 일치하는 계정을 찾을 수 없습니다.")
    return redirect("accounts:find_password")
```

2️⃣ 서명 기반 토큰 생성

```python
payload = {
    "uid": user.user_id,
    "ts": int(timezone.now().timestamp()),
}
token = signing.dumps(payload, salt=PASSWORD_RESET_SALT)

# 🔐 보안 포인트:
# - Django signing을 활용한 위변조 방지 토큰 생성
# - 사용자 ID + timestamp 포함 → 1회성 및 만료 처리 가능
```

3️⃣이메일 기반 재설정 링크 전달

```python
reset_url = (
    request.build_absolute_uri(
        reverse("accounts:password_reset_confirm")
    )
    + f"?token={token}"
)

send_mail(
    subject="[CareBridge] 비밀번호 재설정 안내",
    message=body,
    from_email=settings.DEFAULT_FROM_EMAIL,
    recipient_list=[email],
    fail_silently=False,
)
```

---

## **✅ 챗봇 문제: LLM 기반 진료과 추천 챗봇의 정확하지 않은 답변**

### **🧨** 문제 상황

- LLM이 자유롭게 응답하면서 문제 발생
    - 병원에 없는 진료과 추천 (hallucination)
    - JSON 형식 불안정 → 파싱 실패
    - 의료 정책 위반 가능성

## ⚠️ 원인

- LLM은 제약 없이 생성 → 결과 통제 불가
- 시스템 규칙(DB, 정책)이 반영되지 않음

### **🔍 해결 방법**

1️⃣ 프롬프트 기반 제약 설계 (핵심)

- 자유 생성 → 제한된 선택 문제로 변환

```python
system_instruction = f"""
- 지원 과 목록 중 ONLY 1개 선택
- 목록에 없는 과 선택 금지
- 없으면 "UNSUPPORTED"
- 진단/처방 금지
- 반드시 JSON으로만 응답

지원 과 목록:
{dept_prompt}
"""
```

2️⃣ 출력 구조 강제 + 파싱 안정화

- 코드블럭 제거 후 JSON 만 파싱

```python
cleaned = clean_json_block(raw_text)
result = json.loads(cleaned)
```

3️⃣서버 검증 로직 추가

- LLM 결과를 그대로 쓰지 않고 DB 로 검증

```python
matched_dept = Department.objects.filter(dep_code=department_code).first()
can_reserve = matched_dept is not None
```

## 🎯 결과

- 비밀번호 직접 노출 제거 → 보안 취약점 근본 차단
- 1회성 토큰 기반 인증으로 계정 탈취 위험 감소



