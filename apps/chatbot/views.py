import json
import requests
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings

from apps.db.models.department import Department  # 실제 경로 확인

GEMINI_API_KEY = settings.GEMINI_API_KEY  # settings에 추가할 예정
MODEL_NAME = "gemini-2.5-flash"
GEMINI_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/"
    f"{MODEL_NAME}:generateContent?key={GEMINI_API_KEY}"
)
def clean_json_block(raw_text: str) -> str:
    """
    Gemini가 ```json ... ``` 또는 ``` ... ``` 형식으로 감싼 문자열에서
    코드펜스(```` ``` ````)를 제거하고 순수 JSON만 남긴다.
    """
    if not raw_text:
        return raw_text

    text = raw_text.strip()

    # 시작이 ``` 또는 ```json 으로 시작하면 코드펜스 제거
    if text.startswith("```"):
        lines = text.splitlines()

        # 첫 줄은 ``` 또는 ```json 이라고 가정하고 제거
        if lines:
            lines = lines[1:]

        text = "\n".join(lines).strip()

        # 끝에 ``` 있으면 제거
        if text.endswith("```"):
            text = text[:-3].strip()

    return text

@csrf_exempt
@require_POST
def symptom_chat(request):
    user_text = request.POST.get("text", "").strip()
    if not user_text:
        return JsonResponse({"error": "empty_text"}, status=400)

    # 1) 우리 시스템에 등록된 과 목록
    departments = list(Department.objects.all().values("dep_id", "dep_code", "dep_name"))
    if not departments:
        return JsonResponse({"error": "no_departments"}, status=500)

    dept_lines = [f"- {d['dep_name']} (코드: {d['dep_code']})" for d in departments]
    dept_prompt = "\n".join(dept_lines)

    # 2) Gemini에 줄 시스템 지시
    system_instruction = f"""
너는 CareBridge 웹사이트의 '증상 상담 챗봇'이다.

- 사용자가 적은 증상을 바탕으로, 아래 '지원 과 목록' 중에서 ONLY 1개의 진료과만 선택한다.
- 지원 과 목록에 없는 진료과는 절대로 선택하지 않는다.
- 어떤 과도 적절하지 않다면 department_code 에 "UNSUPPORTED" 를 넣는다.
- 절대로 확정 진단, 처방, 약 이름, 검사 지시를 하지 않는다.
- 항상 "정확한 진단은 의료진의 대면 진료가 필요합니다."라는 문장을 마지막에 붙인다.
- 출력은 반드시 JSON 한 개만 반환한다. (설명 텍스트, 마크다운, 불릿 등 금지)

지원 과 목록:
{dept_prompt}

반환 JSON 형식:

{{
  "summary": "사용자에게 보여줄 친절한 한국어 설명 (3~5문장)",
  "department_code": "위 과 목록에서 고른 코드 또는 'UNSUPPORTED'",
  "reason": "이 과를 선택한 간단한 이유 (1~2문장)"
}}
"""

    body = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": system_instruction}],
            },
            {
                "role": "user",
                "parts": [{"text": f"사용자 증상: {user_text}"}],
            },
        ]
    }

    try:
        res = requests.post(GEMINI_URL, json=body, timeout=20)
        res.raise_for_status()
        data = res.json()
    except Exception as e:
        return JsonResponse({"error": "gemini_error", "detail": str(e)}, status=500)

    try:
        parts = data["candidates"][0]["content"]["parts"]
        raw_text = "".join(p.get("text", "") for p in parts).strip()
    except Exception:
        return JsonResponse({"error": "invalid_gemini_response"}, status=500)

    cleaned = clean_json_block(raw_text)
    try:
        result = json.loads(cleaned)
    except json.JSONDecodeError:
        return JsonResponse({"error": "parse_error", "raw": raw_text}, status=500)

    summary = result.get("summary", "").strip()
    department_code = result.get("department_code", "").strip()
    reason = result.get("reason", "").strip()

    matched_dept = None
    if department_code and department_code != "UNSUPPORTED":
        matched_dept = Department.objects.filter(dep_code=department_code).first()

    can_reserve = matched_dept is not None

    payload = {
        "summary": summary,
        "reason": reason,
        "can_reserve": can_reserve,
    }

    if can_reserve:
        payload["department"] = {
            "dep_id": matched_dept.dep_id,
            "dep_code": matched_dept.dep_code,
            "dep_name": matched_dept.dep_name,
        }

    return JsonResponse(payload)
