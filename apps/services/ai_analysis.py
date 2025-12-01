import json
import requests  # pip install requests

GEMINI_API_KEY = "AIzaSyCkoBx6EvRQ3tkMBBSc2NozxKQn88iHWUg"
MODEL_NAME = "gemini-2.5-flash"
API_ENDPOINT = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent?key={GEMINI_API_KEY}"

def generate_disease_ai_summary(disease_name: str, stats_rows: list[dict]) -> str:
    stats_json = json.dumps(stats_rows, ensure_ascii=False)

    prompt = f"""
너는 감염병 정보를 '일반인이 가장 쉽게 이해할 수 있도록 설명하는 건강 안내서 작성자'야.  
분석 보고서나 통계 요약이 아니라, 오직 아래 질병 자체에 대한 설명만 작성해야 해.

[질병명]  
{disease_name}

[작성 목적]  
- 이 글은 일반인·보호자·학생 등이 읽는 "알기 쉬운 건강 설명서"다.  
- 전문 용어는 가능한 한 쓰지 말고, 꼭 필요할 경우 괄호 안에 쉬운 의미를 붙여라.  
  예: 잠복기(감염 후 증상이 나타나기까지 걸리는 기간)

[전체 분량]  
- A4 반 장 정도 분량 (8~12문장)  
- 문장은 짧고 간단하게 작성  
- 너무 어려운 의학 표현 금지  
- 숫자 남용 금지  

[구성 – 반드시 아래 순서로 작성]  

1. 한 줄 정의  
   - 이 질병이 무엇인지 20자 이내로 쉽게 설명해라.  

2. 원인  
   - 이 병은 무엇 때문에 생기는지  
   - 어떤 상황에서 감염되기 쉬운지  
   - 어린이·노약자 등 취약군이 있으면 간단히 언급  

3. 주요 증상  
   - 일반인이 알아야 할 대표 증상 3~5개만  
   - “가벼운 증상 → 심해질 수 있는 증상” 순으로 소개  

4. 위험성  
   - 왜 조심해야 하는 질병인지  
   - 어떤 경우에 병원 진료가 필요한지  
   - 합병증(있다면 쉬운 표현)  

5. 예방 방법  
   - 바로 실천할 수 있는 일상 행동 3~5개  
   - 특히 예방접종 여부를 명확하게 설명  

6. 필요 시 병원에 가야 하는 경우  
   - 일반인이 참고할 수 있는 간단한 체크 기준  
   - 예: “고열이 48시간 이상 지속되면”  

[중요 규칙]  
- 통계 분석, 증가·감소 추세, 숫자 기반 설명 절대 금지  
- 데이터 기반 문장은 쓰지 마라  
- 오직 질병 기본 정보만 쉽고 깔끔하게 전달해라  
"""

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt}],
            }
        ]
    }

    resp = requests.post(API_ENDPOINT, json=payload, timeout=30)
    resp.raise_for_status()
    data = resp.json()

    # Gemini 응답 구조: candidates[0].content.parts[0].text
    text = data["candidates"][0]["content"]["parts"][0]["text"]
    return text
