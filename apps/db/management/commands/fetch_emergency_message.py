import requests
import xmltodict
from datetime import datetime

from django.core.management.base import BaseCommand
from django.db import transaction
from django.conf import settings
from django.utils import timezone

from apps.db.models.emergency import ErInfo, ErMessage


API_KEY = settings.OPENAPI_SERVICE_KEY

# ---------------------------------------------------------
# 공통 요청 함수
# ---------------------------------------------------------
def fetch_api(url, params):
    params["serviceKey"] = API_KEY

    try:
        response = requests.get(url, params=params, timeout=10)
    except Exception as e:
        print(f"[ERROR] 요청 실패: {e}")
        return None

    if response.status_code != 200:
        print(f"[ERROR] API 상태 코드: {response.status_code}")
        return None

    try:
        data = xmltodict.parse(response.text)
    except Exception:
        print("[ERROR] XML 파싱 실패")
        return None

    return data


# ---------------------------------------------------------
# 메시지 API 데이터 파싱 (최적화 버전)
# ---------------------------------------------------------
def request_message_api(hpid):
    """
    HPID만 사용해서 메시지 조회 → 실제 데이터가 가장 잘 나오는 방식.
    """

    url = (
        "https://apis.data.go.kr/B552657/ErmctInfoInqireService/"
        "getEmrrmSrsillDissMsgInqire"
    )

    params = {
        "pageNo": 1,
        "numOfRows": 50,
        "HPID": hpid,     # 핵심: HPID만 사용
    }

    raw = fetch_api(url, params)
    if not raw:
        return []

    body = raw.get("response", {}).get("body", {})
    items = body.get("items")
    if not items:
        return []

    item = items.get("item")
    if not item:
        return []

    # item이 dict이면 list로 변환
    if isinstance(item, dict):
        item = [item]

    parsed = []

    for it in item:

        # -------- 핵심 필드 --------
        msg_text = it.get("symBlkMsg")
        msg_time = it.get("symBlkSttDtm") or it.get("symBlkEndDtm")
        hpid_value = it.get("hpid")
        msg_type = it.get("symBlkMsgTyp")   # 응급 / 소아 / 분만 / 격리 / 일반 등

        # 필드 없으면 skip
        if not (msg_text and msg_time and hpid_value):
            continue

        # 시간 파싱 (YYYYMMDDHHMMSS)
        try:
            msg_dt = datetime.strptime(msg_time, "%Y%m%d%H%M%S")
        except Exception:
            continue

        # timezone aware 변환
        msg_dt = timezone.make_aware(msg_dt, timezone.get_default_timezone())

        parsed.append(
            {
                "hpid": hpid_value,
                "message": msg_text,
                "message_type": msg_type,
                "message_time": msg_dt,
            }
        )

    return parsed



# ---------------------------------------------------------
# Django Command
# ---------------------------------------------------------
class Command(BaseCommand):
    help = "응급실 메시지 (병원별 최신 1건만 저장)"

    @transaction.atomic
    def handle(self, *args, **options):

        print("[1] 메시지 수집 시작…")

        hospital_qs = ErInfo.objects.all()

        total_insert = 0
        total_update = 0

        for hos in hospital_qs:
            hpid = hos.hpid

            rows = request_message_api(hpid)
            if not rows:
                continue

            # 최신순 정렬 (message_time 내림차순)
            rows.sort(key=lambda x: x["message_time"], reverse=True)

            latest = rows[0]
            incoming_time = latest["message_time"]
            msg_text = latest["message"]
            msg_type = latest.get("message_type")

            existing = ErMessage.objects.filter(hospital=hos).first()

            if existing:
                # 더 최신 메시지가 아니면 skip
                if existing.message_time and existing.message_time >= incoming_time:
                    continue

                existing.message = msg_text
                existing.message_time = incoming_time
                # existing.message_type = msg_type
                existing.save()
                total_update += 1

            else:
                ErMessage.objects.create(
                    hospital=hos,
                    message=msg_text,
                    message_time=incoming_time,
                    # message_type=msg_type,
                )
                total_insert += 1

        print(f"[2] 신규 메시지 저장: {total_insert}건")
        print(f"[3] 기존 메시지 갱신: {total_update}건")
        print("[완료] 메시지 업데이트 종료")
