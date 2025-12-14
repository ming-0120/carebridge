import json
from django.conf import settings
import requests  # pip install requests

GEMINI_API_KEY = settings.GEMINI_API_KEY
MODEL_NAME = "gemini-2.5-flash"
API_ENDPOINT = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent?key={GEMINI_API_KEY}"

def generate_disease_ai_summary(disease_name: str, stats_rows: list[dict]) -> str:
    stats_json = json.dumps(stats_rows, ensure_ascii=False)

    prompt = f"""
너는 감염병 정보를 일반인에게 쉽게 설명하는 건강 안내서 작성자다.

[질병명]
{disease_name}

아래 JSON 형식으로만 답변해라. JSON 바깥에 어떤 텍스트도 쓰지 마라.

{{
  "definition": "이 질병을 한 줄로, 20자 이내로 설명",
  "cause": ["원인을 설명하는 짧은 문장 2~3개"],
  "symptoms": ["대표 증상 3~5개"],
  "risk": ["위험성, 병원 진료가 필요한 경우를 설명하는 문장 2~3개"],
  "prevention": ["예방 방법 3~5개"],
  "when_to_see_doctor": ["병원에 가야 하는 기준 3~4개"]
}}

[중요 규칙]
- 통계, 증가/감소 추세, 숫자 기반 설명 절대 금지.
- 오직 질병의 일반적인 의학 정보를 설명.
- 각 배열 원소는 완전한 한 문장으로 작성.
"""

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt}],
            }
        ],
         "generationConfig": {
             "temperature": 0.2,       # 0에 가까울수록 결과가 규칙적/일관됨
             "topP": 0.8,
             "topK": 40,
             "maxOutputTokens": 512,
         },
    }

    resp = requests.post(API_ENDPOINT, json=payload, timeout=30)
    resp.raise_for_status()
    data = resp.json()

    raw_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()

    # 모델이 코드블럭 형태로 줄 수도 있으니 정리
    if raw_text.startswith("```"):
        raw_text = raw_text.strip("` \n")
        # 언어 표기(gjson, json 등)가 맨 앞에 붙어 있으면 제거
        if "\n" in raw_text:
            first_line, rest = raw_text.split("\n", 1)
            if first_line.strip().startswith("{"):
                # 이미 JSON이면 그대로
                rest = raw_text
            raw_text = rest

    summary = json.loads(raw_text)
    return summary
