import requests
import xmltodict
from datetime import datetime
from django.core.management.base import BaseCommand
from django.conf import settings

from apps.db.models.emergency import ErStatusStaging

API_KEY = settings.OPENAPI_SERVICE_KEY


# ==========================================
# 공통 요청 함수
# ==========================================
def fetch_api(url, params):
    params["serviceKey"] = API_KEY
    response = requests.get(url, params=params, timeout=10)

    if response.status_code != 200:
        print(f"[ERROR] API 호출 실패: {url}")
        return []

    data = xmltodict.parse(response.text)
    items = (
        data.get("response", {})
            .get("body", {})
            .get("items", {})
            .get("item", [])
    )

    if isinstance(items, dict):
        items = [items]

    return items


# ==========================================
# A. 응급실 일반/소아/분만/격리 병상 API (전국 시도 반복 호출)
# ==========================================

SIDO_LIST = [
    "서울특별시", "부산광역시", "대구광역시", "인천광역시", "광주광역시",
    "대전광역시", "울산광역시", "세종특별자치시", "경기도", "강원특별자치도",
    "충청북도", "충청남도", "전라북도", "전라남도", "경상북도", "경상남도",
    "제주특별자치도"
]


def parse_api_A():
    url = "http://apis.data.go.kr/B552657/ErmctInfoInqireService/getEmrrmRltmUsefulSckbdInfo"
    parsed = []

    print("[A] 전국 17개 시도 반복 호출 시작")

    for sido in SIDO_LIST:
        params = {"STAGE1": sido}

        print(f"   - 지역 조회 중: {sido}")
        items = fetch_api(url, params)

        if not items:
            print(f"     → {sido} 지역 에서 데이터 없음 또는 API 오류")
            continue

        # 기존 데이터 구조와 매칭
        for item in items:
            parsed.append({
                "hpid": item.get("hpid"),
                "hvdate": item.get("hvidate"),

                "er_general_total": item.get("hv31"),
                "er_general_available": item.get("hvs03"),

                "er_child_total": item.get("hv36"),
                "er_child_available": item.get("hvs04"),

                "birth_total": item.get("hv7"),
                "birth_available": item.get("hvs05"),

                "negative_pressure_total": item.get("hv11"),
                "negative_pressure_available": item.get("hvs06"),

                "isolation_total": item.get("hv10"),
                "isolation_available": item.get("hvs07"),

                "cohort_total": item.get("hv5"),
                "cohort_available": item.get("hvs38"),
            })

    print(f"[A] 전국 병상 데이터 수집 완료 (총 {len(parsed)} 개)")
    return parsed



# ==========================================
# B. CT/MRI 보유 여부 API
# ==========================================
def parse_api_B():
    url = "http://apis.data.go.kr/B552657/ErmctInfoInqireService/getEgytListInfoInqire"
    params = {}

    items = fetch_api(url, params)
    parsed = []

    for item in items:
        parsed.append({
            "hpid": item.get("hpid"),
            "has_ct": item.get("hvctayn") == "Y",
            "has_mri": item.get("hvmriayn") == "Y",
        })

    return parsed


# ==========================================
# C. Angio 보유 여부 API
# ==========================================
def parse_api_C():
    url = "http://apis.data.go.kr/B552657/ErmctInfoInqireService/getEgytListInfoInqire"
    params = {}

    items = fetch_api(url, params)
    parsed = []

    for item in items:
        parsed.append({
            "hpid": item.get("hpid"),
            "has_angio": item.get("hvangioayn") == "Y",
        })

    return parsed


# ==========================================
# D. 인공호흡기 보유 여부 API
# ==========================================
def parse_api_D():
    url = "http://apis.data.go.kr/B552657/ErmctInfoInqireService/getEgytListInfoInqire"
    params = {}

    items = fetch_api(url, params)
    parsed = []

    for item in items:
        parsed.append({
            "hpid": item.get("hpid"),
            "has_ventilator": item.get("hvventiayn") == "Y",
        })

    return parsed


# ==========================================
# E. 응급실 메시지 API
# (이건 추후 필요 시 추가 — 현재는 A/B/C/D 먼저)
# ==========================================
def parse_api_E():
    url = "http://apis.data.go.kr/B552657/MesrstusService/getMsgInfoInqire"
    params = {}

    items = fetch_api(url, params)
    parsed = []

    for item in items:
        parsed.append({
            "hpid": item.get("hpid"),
            "type_code": item.get("dutyTime1"),
            "message": item.get("message"),
            "updated_at": item.get("updated_at"),
        })

    return parsed


# ==========================================
# 메인 실행 (Staging 테이블에 저장)
# ==========================================
class Command(BaseCommand):
    help = "Fetch ER realtime APIs and store into staging table"

    def handle(self, *args, **options):
        print("[1] A API 호출 중…")
        A = parse_api_A()

        print("[2] B API 호출 중…")
        B = parse_api_B()
        B_map = {b["hpid"]: b for b in B}

        print("[3] C API 호출 중…")
        C = parse_api_C()
        C_map = {c["hpid"]: c for c in C}

        print("[4] D API 호출 중…")
        D = parse_api_D()
        D_map = {d["hpid"]: d for d in D}

        # E API는 선택
        # print("[5] E API 호출 중…")
        # E = parse_api_E()
        # E_map = {e["hpid"]: e for e in E}

        print("[MERGE] 통합 병합 작업 시작")

        ErStatusStaging.objects.all().delete()  # staging 초기화

        count = 0

        for row in A:
            hpid = row.get("hpid")
            hvdate = row.get("hvdate")

            if not hpid or not hvdate:
                continue

            try:
                hvdate_dt = datetime.strptime(hvdate, "%Y%m%d%H%M%S")
            except:
                continue

            staging = ErStatusStaging(
                hos_id=hpid,
                hvdate=hvdate_dt,

                hv31=row["er_general_total"],
                hvs03=row["er_general_available"],

                hv36=row["er_child_total"],
                hvs04=row["er_child_available"],

                hv7=row["birth_total"],
                hvs05=row["birth_available"],

                hv11=row["negative_pressure_total"],
                hvs06=row["negative_pressure_available"],

                hv10=row["isolation_total"],
                hvs07=row["isolation_available"],

                hv5=row["cohort_total"],
                hvs38=row["cohort_available"],

                hvctayn="Y" if B_map.get(hpid, {}).get("has_ct") else "N",
                hvmriayn="Y" if B_map.get(hpid, {}).get("has_mri") else "N",
                hvangioayn="Y" if C_map.get(hpid, {}).get("has_angio") else "N",
                hvventiayn="Y" if D_map.get(hpid, {}).get("has_ventilator") else "N",
            )

            staging.save()
            count += 1

        print(f"[완료] 총 {count}개 병원 데이터 저장됨")
