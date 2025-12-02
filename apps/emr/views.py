from django.shortcuts import render
import os
from dotenv import load_dotenv
from django.views.decorators.csrf import csrf_exempt
from datetime import datetime
import requests, json

# .env 파일 로드
load_dotenv()

def doctor_screen_dashboard(request):
    currentYear = datetime.now().year

    items = []
    for i in range(2):
         url = f'https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo?solYear={currentYear}&numOfRows=100&ServiceKey={os.getenv("API_KEY")}&_type=json'
         response = requests.get(url)
         item = response.json()
         if item['response']['body']['items']['item']:
            items += item['response']['body']['items']['item']
         currentYear += 1

    holidays = []
    for data in items:
        y = str(data['locdate'])[0:4]
        m = str(data['locdate'])[4:6]
        d = str(data['locdate'])[6:8]

        holidays.append({
            'date': f'{y}-{m}-{d}',
            'name': data['dateName']
        })

    datas = {
        'holidays': json.dumps(holidays)
    }


    return render(request, 'emr/doctor_screen_dashboard.html', datas)
