# apps/db/management/commands/import_er_status.py

import urllib.parse
import requests
import xml.etree.ElementTree as ET
from datetime import datetime
from django.core.management.base import BaseCommand
from apps.db.models.emergency import ErStatusStaging

RAW_KEY = "6bb7b35c939d7b0b8e7f7476593f0a3e6fd0fa209cef8d926086600acc1c3cbf"
SERVICE_KEY = urllib.parse.quote(RAW_KEY)


class Command(BaseCommand):
    help = "Fetch ER real-time status XML and load into staging table"

    def handle(self, *args, **options):

        url = (
            "https://apis.data.go.kr/B552657/ErmctInfoInqireService/"
            "getEmrrmRltmUsefulSckbdInfoInqire"
            f"?serviceKey={SERVICE_KEY}&pageNo=1&numOfRows=999"
        )

        print(f"[요청 URL] {url}")
        response = requests.get(url)
        print(f"[HTTP STATUS] {response.status_code}")

        if response.status_code != 200:
            print("HTTP 오류 발생")
            return

        root = ET.fromstring(response.content)

        result_code = root.findtext(".//resultCode")
        result_msg = root.findtext(".//resultMsg")
        print(f"[resultCode] {result_code}")
        print(f"[resultMsg] {result_msg}")

        if result_code != "00":
            print(f"API 오류 발생: {result_msg}")
            return

        items = root.findall(".//item")

        ErStatusStaging.objects.all().delete()

        count = 0

        for item in items:
            hpid = item.findtext("hpid")
            if not hpid:
                continue

            # 날짜 파싱
            hv_raw = item.findtext("hvidate")
            try:
                hvdate = datetime.strptime(hv_raw, "%Y%m%d%H%M%S")
            except:
                continue

            ErStatusStaging.objects.create(
                hos_id=hpid,
                hvdate=hvdate,

                # API raw 값 그대로 저장
                hv31=self._to_int(item.findtext("hv31")),
                hvs03=self._to_int(item.findtext("hvs03")),

                hv36=self._to_int(item.findtext("hv36")),
                hvs04=self._to_int(item.findtext("hvs04")),

                hv7=self._to_int(item.findtext("hv7")),
                hvs05=self._to_int(item.findtext("hvs05")),

                hv11=self._to_int(item.findtext("hv11")),
                hvs06=self._to_int(item.findtext("hvs06")),

                hv10=self._to_int(item.findtext("hv10")),
                hvs07=self._to_int(item.findtext("hvs07")),

                hv5=self._to_int(item.findtext("hv5")),
                hvs38=self._to_int(item.findtext("hvs38")),

                hvctayn=item.findtext("hvctayn"),
                hvmriayn=item.findtext("hvmriayn"),
                hvangioayn=item.findtext("hvangioayn"),
                hvventiayn=item.findtext("hvventiayn"),
            )
            count += 1

        print(f"[완료] Staging 저장: {count} rows")

    @staticmethod
    def _to_int(value):
        try:
            return int(value)
        except:
            return None
