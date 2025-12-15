# apps/db/management/commands/fetch_emergency.py

import requests
import xmltodict
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
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

# 기본정보 API (분만실 여부 확인용 - 시설 유무)
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
    except Exception:
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
    except Exception:
        return timezone.now()

    return timezone.make_aware(dt)


def fetch_api(url, params):
    """공통 API 호출 + XML 파싱"""
    params["serviceKey"] = API_KEY

    try:
        response = requests.get(url, params=params, timeout=10)
    except Exception as e:
        print(f"[ERROR] 요청 실패: {url} / {e}")
        return []

    # 디버그 출력 (필요시 주석 처리)
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
    except Exception:
        print("[ERROR] XML 파싱 실패")
        return []

    response_root = data.get("response")
    if not response_root:
        return []

    body = response_root.get("body")
    if not body:
        return []

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
# 기본정보 API - 분만실 시설 유무 (보조 용도)
###########################################################

def get_basic_info(hpid):
    """단일 병원 기본정보 조회"""
    params = {
        "HPID": hpid,
        "pageNo": 1,
        "numOfRows": 1,
    }
    items = fetch_api(BASE_URL_BASIC, params)
    if not items:
        return {}
    return items[0]


def build_basic_info_map(hpids, max_workers=8):
    """
    Staging에 등장한 hpid 들에 대해
    기본정보 API를 병렬 호출 후 dict[hpid] 형태로 캐싱
    """
    hpids = list(set(hpids))
    basic_info_map = {}

    if not hpids:
        return basic_info_map

    print(f"[BASIC] 기본정보 API 병렬 호출 시작… 대상 병원 수: {len(hpids)}")

    def task(hpid):
        return hpid, get_basic_info(hpid)

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = [executor.submit(task, hpid) for hpid in hpids]
        for future in as_completed(futures):
            try:
                hpid, info = future.result()
                basic_info_map[hpid] = info or {}
            except Exception as e:
                print(f"[BASIC][ERROR] 기본정보 조회 실패: {e}")

    print(f"[BASIC] 기본정보 캐싱 완료: {len(basic_info_map)}개")
    return basic_info_map


###########################################################
# A. 실시간 병상 API 파싱 (지역 병렬 호출)
###########################################################

def _fetch_region_rows(sido, sigungu):
    """
    하나의 (시도, 시군구)에 대해 실시간 병상 API 호출 후
    row(dict) 리스트로 변환하여 반환
    """
    params = {
        "STAGE1": sido,
        "STAGE2": sigungu,
        "pageNo": 1,
        "numOfRows": 200,
    }

    print(f"[A] 요청 지역: {sido} {sigungu}")
    items = fetch_api(BASE_URL_A, params)

    rows = []
    if not items:
        print(f"[A] → 데이터 없음: {sido} {sigungu}")
        return rows

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

            # 분만실 (hv42: Y/N 또는 숫자, hvs26: 전체 병상 수)
            "hv42": (it.get("hv42")),           # raw 보관
            "hvs26": safe_int(it.get("hvs26")),

            # 음압 격리
            "hv29": safe_int(it.get("hv29")),
            "hvs03": safe_int(it.get("hvs03")),

            # 일반 격리
            "hv30": safe_int(it.get("hv30")),
            "hvs04": safe_int(it.get("hvs04")),

            # 코호트 격리 (hv27: 가용, hvs59: 전체 병상 수)
            "hv27": safe_int(it.get("hv27")),
            "hvs59": safe_int(it.get("hvs59")),

            # 장비
            "hvctayn": it.get("hvctayn"),
            "hvmriayn": it.get("hvmriayn"),
            "hvventiayn": it.get("hvventiayn"),
            "hvangioayn": it.get("hvangioayn"),
        }
        rows.append(row)

    return rows


def parse_api_A(max_workers=8):
    """
    실시간 병상 API 전체 호출 (지역 병렬 처리 버전)
    """
    print("[1] 실시간 병상 API 호출 시작…")

    results = []

    regions = (
        ErInfo.objects
        .values_list("er_sido", "er_sigungu")
        .distinct()
        .order_by("er_sido", "er_sigungu")
    )

    regions = list(regions)
    if not regions:
        print("[A] 요청할 지역이 없습니다.")
        return results

    print(f"[A] 총 지역 수: {len(regions)} (max_workers={max_workers})")

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = [
            executor.submit(_fetch_region_rows, sido, sigungu)
            for sido, sigungu in regions
        ]

        for future in as_completed(futures):
            try:
                rows = future.result()
                if rows:
                    results.extend(rows)
            except Exception as e:
                print(f"[A][ERROR] 지역 처리 실패: {e}")

    print(f"[A] 실시간 병상 데이터 수집 완료: {len(results)}건")
    return results


###########################################################
# 분만실 available/total 파싱 보조 함수
###########################################################

def parse_birth_beds(hv42_raw, hvs26):
    """
    hv42: 숫자 또는 Y/N
    hvs26: 전체 병상 수

    규칙:
    - hvs26 가 없으면 둘 다 None
    - hv42 가 숫자면 → 그 숫자를 available 로 사용
    - hv42 가 Y* 로 시작하면 → available = total
    - hv42 가 N* 로 시작하면 → available = 0
    - 그 외 값은 → available=None, total=hvs26
    """
    if hvs26 is None:
        return None, None

    total = hvs26
    if hv42_raw is None:
        return None, total

    s = str(hv42_raw).strip()
    if s == "":
        return None, total

    if s.isdigit():
        return int(s), total

    upper = s.upper()
    if upper.startswith("Y"):
        return total, total
    if upper.startswith("N"):
        return 0, total

    return None, total


###########################################################
# STAGING → MAIN 병합 (bulk 기반)
###########################################################

def merge_staging_to_main(basic_info_map):
    """
    ErStatusStaging 전체를 ErStatus로 병합.
    - 기존 레코드는 bulk_update
    - 신규 레코드는 bulk_create
    - 단, 병합 시작 시 MAIN 전체 삭제 → 항상 최신 스냅샷만 유지
    """
    print("[MERGE] STAGING → MAIN 병합 시작…")

    # 1) Staging 전체 로드 (select_related로 hospital join)
    staging_list = list(
        ErStatusStaging.objects.select_related("hospital")
    )
    if not staging_list:
        print("[MERGE] STAGING 데이터가 없습니다.")
        return

    # 1.5) STAGING 중복 제거 (er_id, hvdate 기준)
    unique_map = {}
    for st in staging_list:
        key = (st.hospital.er_id, st.hvdate)
        if key not in unique_map:
            unique_map[key] = st

    staging_list = list(unique_map.values())
    print(f"[MERGE] 중복 제거 후 STAGING 개수: {len(staging_list)}")

    # 최신 스냅샷만 유지: MAIN 전체 삭제
    ErStatus.objects.all().delete()
    print("[MERGE] 기존 MAIN 전체 삭제 완료")

    er_ids = {st.hospital.er_id for st in staging_list}
    hvdates = {st.hvdate for st in staging_list}
    hpids = {st.hospital.hpid for st in staging_list}

    print(f"[MERGE] 대상 병원 수: {len(er_ids)}, hvdate 수: {len(hvdates)}")

    existing_qs = ErStatus.objects.filter(
        er_id__in=er_ids,
        hvdate__in=hvdates,
    ).select_related("er")

    existing_map = {
        (obj.er_id, obj.hvdate): obj
        for obj in existing_qs
    }

    print(f"[MERGE] 기존 MAIN 레코드 수(삭제 후): {len(existing_map)}")

    to_create = []
    to_update = []

    # 3) 병합 로직
    for st in staging_list:
        key = (st.hospital.er_id, st.hvdate)

        # 기본정보 API 캐시에서 분만실 시설 유무 (보조 정보)
        basic = basic_info_map.get(st.hospital.hpid, {}) or {}
        obst_raw = (
            basic.get("dutyObstYn")
            or basic.get("hperyn")
            or basic.get("dutyHayn")
        )
        obst_bool = yn_to_bool(obst_raw)

        # 분만실 available/total 계산
        birth_available, birth_total = parse_birth_beds(st.hv42, st.hvs26)

        if key in existing_map:
            # (이론상 거의 없음, 구조 유지용)
            obj = existing_map[key]

            obj.er_general_available = st.hvec
            obj.er_general_total = st.hvs01

            obj.er_child_available = st.hv28
            obj.er_child_total = st.hvs02

            obj.birth_available = birth_available
            obj.birth_total = birth_total

            obj.negative_pressure_available = st.hv29
            obj.negative_pressure_total = st.hvs03

            obj.isolation_general_available = st.hv30
            obj.isolation_general_total = st.hvs04

            obj.isolation_cohort_available = st.hv27
            obj.isolation_cohort_total = st.hvs59

            obj.has_ct = yn_to_bool(st.hvctayn)
            obj.has_mri = yn_to_bool(st.hvmriayn)
            obj.has_angio = yn_to_bool(st.hvangioayn)
            obj.has_ventilator = yn_to_bool(st.hvventiayn)

            to_update.append(obj)
        else:
            obj = ErStatus(
                er=st.hospital,
                hvdate=st.hvdate,

                er_general_available=st.hvec,
                er_general_total=st.hvs01,

                er_child_available=st.hv28,
                er_child_total=st.hvs02,

                birth_available=birth_available,
                birth_total=birth_total,

                negative_pressure_available=st.hv29,
                negative_pressure_total=st.hvs03,

                isolation_general_available=st.hv30,
                isolation_general_total=st.hvs04,

                isolation_cohort_available=st.hv27,
                isolation_cohort_total=st.hvs59,

                has_ct=yn_to_bool(st.hvctayn),
                has_mri=yn_to_bool(st.hvmriayn),
                has_angio = yn_to_bool(st.hvangioayn),
                has_ventilator=yn_to_bool(st.hvventiayn),
            )
            to_create.append(obj)

    # 4) bulk_create / bulk_update 실행
    if to_create:
        ErStatus.objects.bulk_create(to_create, batch_size=400)
        print(f"[MERGE] 신규 생성: {len(to_create)}건")

    if to_update:
        fields = [
            "er_general_available",
            "er_general_total",
            "er_child_available",
            "er_child_total",
            "birth_available",
            "birth_total",
            "negative_pressure_available",
            "negative_pressure_total",
            "isolation_general_available",
            "isolation_general_total",
            "isolation_cohort_available",
            "isolation_cohort_total",
            "has_ct",
            "has_mri",
            "has_angio",
            "has_ventilator",
        ]
        ErStatus.objects.bulk_update(to_update, fields, batch_size=400)
        print(f"[MERGE] 기존 업데이트: {len(to_update)}건")

    total = ErStatus.objects.count()
    print(f"[MAIN] 병합 완료 - 총 {total}개 저장됨")



###########################################################
# 메인 Command
###########################################################

class Command(BaseCommand):
    help = "실시간 병상 데이터 → staging → main 병합 (최적화 버전)"

    @transaction.atomic
    def handle(self, *args, **options):

        # 1) 실시간 병상 데이터 A API 수집 (지역 병렬 호출)
        rows_A = parse_api_A(max_workers=8)

        # 2) STAGING 초기화 후 INSERT (bulk_create)
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

                    hv42=row.get("hv42"),
                    hvs26=row["hvs26"],

                    hv29=row["hv29"],
                    hvs03=row["hvs03"],

                    hv30=row["hv30"],
                    hvs04=row["hvs04"],

                    hv27=row["hv27"],
                    hvs59=row["hvs59"],

                    hvctayn=row["hvctayn"],
                    hvmriayn=row["hvmriayn"],
                    hvangioayn=row["hvangioayn"],
                    hvventiayn=row["hvventiayn"],
                )
            )

        if staging_bulk:
            ErStatusStaging.objects.bulk_create(staging_bulk, batch_size=400)
        print(f"[STAGING] 저장 완료: {len(staging_bulk)}건")

        # 3) 기본정보 API 병렬 호출 + 캐싱
        hpids = (
            ErStatusStaging.objects
            .values_list("hospital__hpid", flat=True)
            .distinct()
        )
        basic_info_map = build_basic_info_map(hpids, max_workers=8)

        # 4) STAGING → MAIN bulk 병합
        merge_staging_to_main(basic_info_map)