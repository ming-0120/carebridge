# apps/services/ai_analysis.py

import json
import time
import random
from collections import defaultdict
import requests
from django.conf import settings

GEMINI_API_KEY = settings.GEMINI_API_KEY
MODEL_NAME = "gemini-2.5-flash"
API_ENDPOINT = (
    f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent"
    f"?key={GEMINI_API_KEY}"
)

# ============================================================
# 1) JSON 파싱 안전장치 (문자열 내부 개행/코드블럭/잘림 대응)
# ============================================================
def _sanitize_newlines_inside_json_strings(s: str) -> str:
    out = []
    in_string = False
    escape = False

    for ch in s:
        if escape:
            out.append(ch)
            escape = False
            continue

        if ch == "\\":
            out.append(ch)
            escape = True
            continue

        if ch == '"':
            out.append(ch)
            in_string = not in_string
            continue

        if in_string and ch == "\n":
            out.append("\\n")
            continue
        if in_string and ch == "\r":
            out.append("\\r")
            continue

        out.append(ch)

    return "".join(out)


def safe_json_parse(raw_text: str) -> dict:
    s = (raw_text or "").strip()

    # 코드블럭 제거(혹시 섞일 때 대비)
    if s.startswith("```"):
        s = s.strip("` \n")
        if "\n" in s:
            _, s = s.split("\n", 1)

    start = s.find("{")
    end = s.rfind("}")

    if start == -1:
        raise ValueError(f"Model returned no JSON object. preview={s[:200]!r}")
    if end == -1 or end <= start:
        raise ValueError(f"Model returned truncated JSON. preview={s[:200]!r}")

    candidate = s[start : end + 1]

    try:
        return json.loads(candidate)
    except json.JSONDecodeError:
        fixed = _sanitize_newlines_inside_json_strings(candidate)
        return json.loads(fixed)


# ============================================================
# 2) 통계 입력 축소(가장 중요): stats_rows -> top3 + 비율만
#    모델이 계산하지 않게 해서 토큰/오류 확 줄임
# ============================================================
def _round1(x: float) -> float:
    return round(x + 1e-12, 1)


def _build_compact_stats(stats_rows: list[dict]) -> dict:
    """
    stats_rows는 커맨드에서 만든 형태를 가정:
      - keys: dim_type, dim_label, cases (또는 result_val)
    """
    by_type = defaultdict(lambda: defaultdict(int))  # {dim_type: {label: sum_cases}}
    stat_dates = set()

    for r in stats_rows or []:
        dim_type = str(r.get("dim_type") or "")
        label = str(r.get("dim_label") or "")
        if not dim_type or not label:
            continue
        if label == "계":
            continue

        # cases 우선, 없으면 result_val
        v = r.get("cases", None)
        if v is None:
            v = r.get("result_val", 0)

        try:
            cases = int(v or 0)
        except (TypeError, ValueError):
            cases = 0

        if cases <= 0:
            continue

        by_type[dim_type][label] += cases

        sd = r.get("stat_date")
        if sd:
            stat_dates.add(str(sd))

    def top3_list(dim_type: str):
        m = by_type.get(dim_type, {})
        total = sum(m.values())
        if total <= 0:
            return {"total_cases": 0, "top3": []}

        items = sorted(m.items(), key=lambda x: x[1], reverse=True)[:3]
        out = []
        for label, cases in items:
            pct = _round1((cases / total) * 100.0)
            out.append({"label": label, "cases": cases, "share_pct": pct})
        return {"total_cases": total, "top3": out}

    return {
        "stat_dates": sorted(stat_dates)[:5],  # 너무 길면 의미 없어서 상위 몇 개만
        "gender": top3_list("GENDER"),
        "age": top3_list("AGE"),
        "region": top3_list("REGION"),
        "rules": {
            "share_pct": "dim_type 내부 total_cases 대비 비율(%)",
            "excluded": "label='계' 제외",
            "note": "top3만 제공(모델이 원본 전체를 볼 필요 없음)",
        },
    }


# ============================================================
# 3) 429/503 대응: Retry-After 우선 + 지수 백오프
# ============================================================
def _post_with_backoff(url: str, payload: dict, max_retries: int = 8) -> dict:
    last_status = None
    last_text = None

    for attempt in range(max_retries):
        resp = requests.post(url, json=payload, timeout=30)
        last_status = resp.status_code
        last_text = resp.text[:500]

        if resp.status_code < 400:
            return resp.json()

        if resp.status_code in (429, 503):
            retry_after = resp.headers.get("Retry-After")
            if retry_after:
                try:
                    sleep_s = float(retry_after)
                except ValueError:
                    sleep_s = 2.0
            else:
                sleep_s = min(60.0, (2 ** attempt) + random.uniform(0, 1.0))

            time.sleep(sleep_s)
            continue

        resp.raise_for_status()

    raise RuntimeError(f"Gemini retry exhausted. status={last_status}, body={last_text!r}")


# ============================================================
# 4) 메인 함수
# ============================================================
def generate_disease_ai_summary(disease_name: str, stats_rows: list[dict]) -> dict:
    # ✅ 입력을 축소해서 토큰 절약 + 잘림/오류 감소
    compact = _build_compact_stats(stats_rows)
    stats_json = json.dumps(compact, ensure_ascii=False)

    # ✅ 프롬프트도 짧게 유지(예시/장문 규칙 제거)
    prompt = f"""
너는 일반인을 위한 감염병 안내문과, 제공된 통계 요약을 쉬운 말로 설명하는 작성자다.

질병명: {disease_name}

통계 요약 JSON(이미 top3/비율 포함):
{stats_json}

반드시 아래 JSON 객체 1개만 출력(바깥 텍스트/코드블럭/주석 금지).
모든 문자열은 줄바꿈 없이 한 줄로 작성(개행 금지).

{{
  "medical_overview": {{
    "definition": "최대 2문장",
    "how_it_spreads": ["정확히 2문장"],
    "common_symptoms": ["정확히 4개"],
    "prevention": ["정확히 4개"],
    "when_to_see_doctor": ["정확히 3개"]
  }},
  "stats_summary": {{
    "period_note": "stat_dates를 근거로 1문장(없으면 '기간 정보 없음')",
    "gender_top3": [{{"label":"", "cases":0, "share_pct":0.0}}],
    "age_top3": [{{"label":"", "cases":0, "share_pct":0.0}}],
    "region_top3": [{{"label":"", "cases":0, "share_pct":0.0}}],
    "plain_explanation": "위 비율을 일반인이 이해할 수 있게 최대 3문장",
    "data_limits": ["정확히 2개(예: 지역 데이터 없음 등)"]
  }}
}}
""".strip()

    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "topP": 0.8,
            "topK": 40,
            "maxOutputTokens": 2048,
            "responseMimeType": "application/json",
            "responseSchema": {
                "type": "OBJECT",
                "properties": {
                    "medical_overview": {
                        "type": "OBJECT",
                        "properties": {
                            "definition": {"type": "STRING"},
                            "how_it_spreads": {"type": "ARRAY", "items": {"type": "STRING"}},
                            "common_symptoms": {"type": "ARRAY", "items": {"type": "STRING"}},
                            "prevention": {"type": "ARRAY", "items": {"type": "STRING"}},
                            "when_to_see_doctor": {"type": "ARRAY", "items": {"type": "STRING"}},
                        },
                        "required": [
                            "definition",
                            "how_it_spreads",
                            "common_symptoms",
                            "prevention",
                            "when_to_see_doctor",
                        ],
                    },
                    "stats_summary": {
                        "type": "OBJECT",
                        "properties": {
                            "period_note": {"type": "STRING"},
                            "gender_top3": {
                                "type": "ARRAY",
                                "items": {
                                    "type": "OBJECT",
                                    "properties": {
                                        "label": {"type": "STRING"},
                                        "cases": {"type": "INTEGER"},
                                        "share_pct": {"type": "NUMBER"},
                                    },
                                    "required": ["label", "cases", "share_pct"],
                                },
                            },
                            "age_top3": {
                                "type": "ARRAY",
                                "items": {
                                    "type": "OBJECT",
                                    "properties": {
                                        "label": {"type": "STRING"},
                                        "cases": {"type": "INTEGER"},
                                        "share_pct": {"type": "NUMBER"},
                                    },
                                    "required": ["label", "cases", "share_pct"],
                                },
                            },
                            "region_top3": {
                                "type": "ARRAY",
                                "items": {
                                    "type": "OBJECT",
                                    "properties": {
                                        "label": {"type": "STRING"},
                                        "cases": {"type": "INTEGER"},
                                        "share_pct": {"type": "NUMBER"},
                                    },
                                    "required": ["label", "cases", "share_pct"],
                                },
                            },
                            "plain_explanation": {"type": "STRING"},
                            "data_limits": {"type": "ARRAY", "items": {"type": "STRING"}},
                        },
                        "required": [
                            "period_note",
                            "gender_top3",
                            "age_top3",
                            "region_top3",
                            "plain_explanation",
                            "data_limits",
                        ],
                    },
                },
                "required": ["medical_overview", "stats_summary"],
            },
        },
    }

    # 1차 호출
    data = _post_with_backoff(API_ENDPOINT, payload)
    raw_text = (data["candidates"][0]["content"]["parts"][0]["text"] or "").strip()

    # 잘림 감지 -> 1회 재시도(온도 낮춤)
    if raw_text.count("{") > raw_text.count("}"):
        payload["generationConfig"]["temperature"] = 0.0
        data = _post_with_backoff(API_ENDPOINT, payload)
        raw_text = (data["candidates"][0]["content"]["parts"][0]["text"] or "").strip()

    return safe_json_parse(raw_text)
