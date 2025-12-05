# apps/db/management/commands/fetch_emergency.py

import requests
import xmltodict
from datetime import datetime
from django.core.management.base import BaseCommand
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.db.models.emergency import (ErInfo,ErStatus,ErStatusStaging,)

API_KEY = settings.OPENAPI_SERVICE_KEY
BASE_URL_A = (
    "https://apis.data.go.kr/B552657/ErmctInfoInqireService/"
    "getEmrrmRltmUsefulSckbdInfoInqire"
)

###########################################################
# 공통 유틸
###########################################################
def safe_int(value):
    if value is None:
        return None
    if isinstance(value, int):
        return value
    s = str(value).strip()
    if s == "":
        return None
    try:
        return int(s)
    except ValueError:
        return None


def yn_to_bool(value):
    if value is None:
        return None
    s = str(value).strip().upper()
    if s == "Y":
        return True
    if s == "N":
        return False
    return None


def fetch_api(url, params):
    params["serviceKey"] = API_KEY

    try:
        response = requests.get(url, params=params, timeout=10)
    except Exception as e:
        print(f"[ERROR] 요청 실패: {url} / {e}")
        return []

    if response.status_code != 200:
        print(f"[ERROR] API HTTP 오류 {response.status_code}: {url}")
        return []

    try:
        data = xmltodict.parse(response.text)
    except Exception as e:
        print(f"[ERROR] XML 파싱 오류: {url} / {e}")
        return []

    root = data.get("response")
    if not root:
        return []

    body = root.get("body")
    if not body:
        return []

    items_root = body.get("items")
    if not items_root:
        return []

    items = items_root.get("item", [])
    if isinstance(items, dict):
        return [items]
    if items is None:
        return []

    return items


def get_region_pairs():
    return (
        ErInfo.objects
        .values_list("er_sido", "er_sigungu")
        .distinct()
        .order_by("er_sido", "er_sigungu")
    )


def parse_hvdate(item):
    raw = item.get("hvidate") or item.get("hvdate")
    if not raw:
        return timezone.now()

    raw = str(raw).strip()
    try:
        dt = datetime.strptime(raw, "%Y%m%d%H%M%S")
    except ValueError:
        return timezone.now()

    return timezone.make_aware(dt)


###########################################################
# A. 실시간 병상 API 파싱
###########################################################
def parse_api_A():
    print("[1] A API 호출…")
    print("[A] 시도 + 시군구 반복 호출 시작")

    results = []

    for sido, sigungu in get_region_pairs():
        params = {
            "STAGE1": sido,
            "STAGE2": sigungu,
            "pageNo": 1,
            "numOfRows": 100,
        }

        items = fetch_api(BASE_URL_A, params)
        if not items:
            print(f"[INFO] 데이터 없음: {sido} {sigungu}")
            continue

        for it in items:
            print("=== RAW XML ITEM ===")
            print(it)
            print("=====================")

            hpid = it.get("hpid")
            if not hpid:
                continue

            hvdate = parse_hvdate(it)

            row = {
                "hpid": hpid,
                "hvdate": hvdate,

                # 병상 데이터
                "hv2": safe_int(it.get("hv2")),
                "hv3": safe_int(it.get("hv3")),
                "hv4": safe_int(it.get("hv4")),
                "hv5": safe_int(it.get("hv5")),
                "hv6": safe_int(it.get("hv6")),
                "hv7": safe_int(it.get("hv7")),
                "hv8": safe_int(it.get("hv8")),
                "hv9": safe_int(it.get("hv9")),
                "hv11": safe_int(it.get("hv11")),
                "hvcc": safe_int(it.get("hvcc")),
                "hvncc": safe_int(it.get("hvncc")),
                "hvicc": safe_int(it.get("hvicc")),

                # 장비 여부
                "hvctayn": (it.get("hvctayn") or "").strip()[:1],
                "hvmriayn": (it.get("hvmriayn") or "").strip()[:1],
                "hvangioayn": (it.get("hvangioayn") or "").strip()[:1],
                "hvventiayn": (it.get("hvventiayn") or "").strip()[:1],
            }

            # 합산값
            row["sum_emer_all"] = (row["hv2"] or 0) + (row["hv3"] or 0)
            row["sum_emer_child"] = row["hv3"] or 0
            row["sum_birth"] = row["hv7"] or 0
            row["sum_iso_neg"] = row["hvcc"] or 0
            row["sum_iso_gen"] = row["hvncc"] or 0
            row["sum_iso_cohort"] = row["hvicc"] or 0

            results.append(row)

    print(f"[A] 병상 데이터 수집 완료 (총 {len(results)}개)")
    return results


###########################################################
# 메인 커맨드
###########################################################
class Command(BaseCommand):
    help = "실시간 응급실 병상/장비 정보 수집 (staging → main 병합)"

    @transaction.atomic
    def handle(self, *args, **options):

        rows_A = parse_api_A()

        print("[MERGE] Staging 초기화 후 병합")
        ErStatusStaging.objects.all().delete()

        seen = set()
        staging_objs = []

        # ----------------------------------------------------
        # STAGING INSERT
        # ----------------------------------------------------
        for row in rows_A:

            key = (row["hpid"], row["hvdate"])
            if key in seen:
                continue
            seen.add(key)

            try:
                er_info = ErInfo.objects.get(hpid=row["hpid"])
            except ErInfo.DoesNotExist:
                continue

            staging_objs.append(
                ErStatusStaging(
                    hospital=er_info,
                    hvdate=row["hvdate"],

                    hv31=row["hv2"],
                    hvs03=row["hv3"],

                    hv36=row["hv3"],
                    hvs04=row["hv3"],

                    hv7=row["hv7"],
                    hvs05=row["hv7"],

                    hv11=row["hv11"],
                    hvs06=row["hv11"],

                    hv5=row["hv5"],
                    hvs38=row["hv5"],

                    hvctayn=row["hvctayn"],
                    hvmriayn=row["hvmriayn"],
                    hvangioayn=row["hvangioayn"],
                    hvventiayn=row["hvventiayn"],
                )
            )

        ErStatusStaging.objects.bulk_create(staging_objs, batch_size=500)

        ###########################################################
        # MAIN 테이블 병합
        ###########################################################
        for st in ErStatusStaging.objects.select_related("hospital"):

            ErStatus.objects.update_or_create(
                er=st.hospital,
                hvdate=st.hvdate,
                defaults={

                    # 일반 응급실
                    "er_general_available": st.hv31,
                    "er_general_total": st.hvs03,

                    # 소아 응급실
                    "er_child_available": st.hv36,
                    "er_child_total": st.hvs04,

                    # 분만실
                    "birth_available": st.hv7,
                    "birth_total": st.hvs05,

                    # 음압 격리
                    "negative_pressure_available": st.hv11,
                    "negative_pressure_total": st.hvs06,

                    # 코호트 격리
                    "isolation_cohort_available": st.hv5,
                    "isolation_cohort_total": st.hvs38,

                    # 일반 격리 — API 제공 X → None
                    "isolation_general_available": None,
                    "isolation_general_total": None,

                    # 장비 여부
                    "has_ct": (st.hvctayn == "Y"),
                    "has_mri": (st.hvmriayn == "Y"),
                    "has_angio": (st.hvangioayn == "Y"),
                    "has_ventilator": (st.hvventiayn == "Y"),
                }
            )


            print(f"[완료] 총 {ErStatus.objects.count()}개 상태 데이터 저장/갱신 완료")
