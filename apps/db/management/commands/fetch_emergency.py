# apps/db/management/commands/fetch_emergency.py

import requests
import xmltodict
from datetime import datetime
from django.core.management.base import BaseCommand
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.db.models.emergency import (
    ErInfo,
    ErStatus,
    ErStatusStaging,
)

API_KEY = settings.OPENAPI_SERVICE_KEY

# 실시간 병상 API (V4 최신)
BASE_URL_A = (
    "https://apis.data.go.kr/B552657/ErmctInfoInqireService/"
    "getEmrrmRltmUsefulSckbdInfoInqire"
)

# 기본정보 API (분만실 여부 확인용)
BASE_URL_BASIC = (
    "https://apis.data.go.kr/B552657/ErmctInfoInqireService/"
    "getEgytBassInfoInqire"
)

###########################################################
# 공통 함수
###########################################################

def safe_int(value):
    """정수 변환. '', None, 이상값 → None"""
    if value is None:
        return None
    try:
        s = str(value).strip()
        if s == "":
            return None
        return int(s)
    except:
        return None


def yn_to_bool(value):
    """Y/N → True/False/None"""
    if value is None:
        return None
    v = str(value).strip().upper()
    if v == "Y":
        return True
    if v == "N":
        return False
    return None


def parse_hvdate(item):
    """hvidate → datetime 변환"""
    raw = item.get("hvidate") or item.get("hvdate")
    if not raw:
        return timezone.now()

    raw = str(raw).strip()
    try:
        dt = datetime.strptime(raw, "%Y%m%d%H%M%S")
    except:
        return timezone.now()

    return timezone.make_aware(dt)


def fetch_api(url, params):
    params["serviceKey"] = API_KEY

    try:
        response = requests.get(url, params=params, timeout=10)
    except Exception as e:
        print(f"[ERROR] 요청 실패: {url} / {e}")
        return []

    # 디버그 출력 유지
    print("\n=== REQUEST URL ===")
    print(response.url)
    print("=== STATUS ===")
    print(response.status_code)
    print("=== RAW XML (앞부분) ===")
    print(response.text[:2000])
    print("==========================\n")

    if response.status_code != 200:
        print(f"[ERROR] HTTP {response.status_code}")
        return []

    try:
        data = xmltodict.parse(response.text)
    except:
        print("[ERROR] XML 파싱 실패")
        return []

    response_root = data.get("response")
    if not response_root:
        return []

    body = response_root.get("body")
    if not body:
        return []

    # items가 없으면 → 빈 리스트 반환
    items_root = body.get("items")
    if not items_root:
        return []

    items = items_root.get("item")
    if not items:
        return []

    if isinstance(items, dict):
        return [items]

    return items



###########################################################
# 기본정보 API - 분만실 여부
###########################################################

def get_basic_info(hpid):
    params = {
        "HPID": hpid,
        "pageNo": 1,
        "numOfRows": 1,
    }
    items = fetch_api(BASE_URL_BASIC, params)
    if not items:
        return {}
    return items[0]


###########################################################
# A. 실시간 병상 API 파싱
###########################################################

def parse_api_A():
    print("[1] 실시간 병상 API 호출 시작…")

    results = []

    regions = (
        ErInfo.objects
        .values_list("er_sido", "er_sigungu")
        .distinct()
        .order_by("er_sido", "er_sigungu")
    )

    for sido, sigungu in regions:
        params = {
            "STAGE1": sido,
            "STAGE2": sigungu,
            "pageNo": 1,
            "numOfRows": 200,
        }

        print(f"[A] 요청 지역: {sido} {sigungu}")
        items = fetch_api(BASE_URL_A, params)

        if not items:
            print(f"[A] → 데이터 없음: {sido} {sigungu}")
            continue

        for it in items:
            hpid = it.get("hpid")
            if not hpid:
                continue

            row = {
                "hpid": hpid,
                "hvdate": parse_hvdate(it),

                # 일반 응급실
                "hvec": safe_int(it.get("hvec")),
                "hvs01": safe_int(it.get("hvs01")),

                # 소아 응급실
                "hv28": safe_int(it.get("hv28")),
                "hvs02": safe_int(it.get("hvs02")),

                # 분만실(숫자 없음 → Boolean 후보)
                "birth_flag": it.get("hv7"),

                # 음압 격리
                "hv29": safe_int(it.get("hv29")),
                "hvs03": safe_int(it.get("hvs03")),

                # 일반 격리
                "hv30": safe_int(it.get("hv30")),
                "hvs04": safe_int(it.get("hvs04")),

                # 코호트 격리
                "hv27": safe_int(it.get("hv27")),

                # 장비
                "hvctayn": it.get("hvctayn"),
                "hvmriayn": it.get("hvmriayn"),
                "hvecmoayn": it.get("hvecmoayn"),
                "hvventiayn": it.get("hvventiayn"),
            }

            results.append(row)

    print(f"[A] 실시간 병상 데이터 수집 완료: {len(results)}건")
    return results


###########################################################
# 메인 Command
###########################################################

class Command(BaseCommand):
    help = "실시간 병상 데이터 → staging → main 병합"

    @transaction.atomic
    def handle(self, *args, **options):

        ####################################################
        # 1) 실시간 병상 데이터 A API 수집
        ####################################################
        rows_A = parse_api_A()

        ####################################################
        # 2) STAGING 초기화 후 INSERT
        ####################################################
        ErStatusStaging.objects.all().delete()
        staging_bulk = []
        seen = set()

        for row in rows_A:

            key = (row["hpid"], row["hvdate"])
            if key in seen:
                continue
            seen.add(key)

            try:
                er = ErInfo.objects.get(hpid=row["hpid"])
            except ErInfo.DoesNotExist:
                continue

            staging_bulk.append(
                ErStatusStaging(
                    hospital=er,
                    hvdate=row["hvdate"],

                    hvec=row["hvec"],
                    hvs01=row["hvs01"],

                    hv28=row["hv28"],
                    hvs02=row["hvs02"],

                    birth_flag=row["birth_flag"],

                    hv29=row["hv29"],
                    hvs03=row["hvs03"],

                    hv30=row["hv30"],
                    hvs04=row["hvs04"],

                    hv27=row["hv27"],

                    hvctayn=row["hvctayn"],
                    hvmriayn=row["hvmriayn"],
                    hvecmoayn=row["hvecmoayn"],
                    hvventiayn=row["hvventiayn"],
                )
            )

        ErStatusStaging.objects.bulk_create(staging_bulk, batch_size=400)
        print(f"[STAGING] 저장 완료: {len(staging_bulk)}건")

        ####################################################
        # 3) STAGING → MAIN 병합
        ####################################################
        for st in ErStatusStaging.objects.select_related("hospital"):

            # 기본정보 API 기반 최종 분만실 여부
            basic = get_basic_info(st.hospital.hpid)

            obst_raw = (
                basic.get("dutyObstYn")
                or basic.get("hperyn")
                or basic.get("dutyHayn")
            )

            if obst_raw:
                birth_bool = yn_to_bool(obst_raw)
            else:
                birth_bool = yn_to_bool(st.birth_flag)

            ErStatus.objects.update_or_create(
                er=st.hospital,
                hvdate=st.hvdate,
                defaults={
                    # 일반 응급실
                    "er_general_available": st.hvec,
                    "er_general_total": st.hvs01,

                    # 소아 응급실
                    "er_child_available": st.hv28,
                    "er_child_total": st.hvs02,

                    # 분만실 Boolean
                    "birth_available": birth_bool,

                    # 음압 격리
                    "negative_pressure_available": st.hv29,
                    "negative_pressure_total": st.hvs03,

                    # 일반 격리
                    "isolation_general_available": st.hv30,
                    "isolation_general_total": st.hvs04,

                    # 코호트 격리
                    "isolation_cohort_available": st.hv27,
                    # "isolation_cohort_total": None,

                    # 장비 여부
                    "has_ct": yn_to_bool(st.hvctayn),
                    "has_mri": yn_to_bool(st.hvmriayn),
                    "has_ecmo": yn_to_bool(st.hvecmoayn),
                    "has_ventilator": yn_to_bool(st.hvventiayn),
                }
            )

        total = ErStatus.objects.count()
        print(f"[MAIN] 병합 완료 – 총 {total}개 저장됨")
