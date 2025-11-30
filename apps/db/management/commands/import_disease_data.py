from datetime import date, datetime
from django.core.management.base import BaseCommand
from django.db import transaction
import requests

from apps.db.models.statistic import InfectiousStat
from apps.db.models.disease import DimDisease  # FK 기준 테이블

SERVICE_KEY = "8661f2737274c1d3578553e84076849efd87c7076b1cc5c8fe54183dae94c09c"


class Command(BaseCommand):
    help = "감염병 통계 (성별/연령/시도) 데이터를 수집해 infectious_stat에 적재"

    BASE_PARAMS = {
        "serviceKey": SERVICE_KEY,
        "pageNo": 1,
        "resType": 2,     # JSON
        "searchType": 1,  # 발생수
        "numOfRows": 100,
    }

    def handle(self, *args, **options):
        target_year = datetime.now().year - 1
        self.stdout.write(self.style.NOTICE(f"[INFO] target_year = {target_year}"))

        # 1) 성별 통계
        self.fetch_and_save(
            dim_type="GENDER",   # DIM_TYPE_CHOICES = (GENDER, AGE, REGION)
            url="https://apis.data.go.kr/1790387/EIDAPIService/Gender",
            year=target_year,
            extract_dim=lambda item: {
                "dim_code": item.get("sex"),
                "dim_label": item.get("sex"),
            },
        )

        # 2) 시도(지역) 통계
        self.fetch_and_save(
            dim_type="REGION",
            url="https://apis.data.go.kr/1790387/EIDAPIService/Region",
            year=target_year,
            extract_dim=lambda item: {
                "dim_code": item.get("sidoCd"),
                "dim_label": item.get("sidoNm"),
            },
        )

        # 3) 연령대 통계
        self.fetch_and_save(
            dim_type="AGE",
            url="https://apis.data.go.kr/1790387/EIDAPIService/Age",
            year=target_year,
            extract_dim=lambda item: {
                "dim_code": item.get("ageRange"),
                "dim_label": item.get("ageRange"),
            },
        )

    def fetch_and_save(self, dim_type, url, year, extract_dim):
        params = {
            "serviceKey": SERVICE_KEY,
            "pageNo": 1,
            "numOfRows": 100,
        }
    
        if dim_type in ("GENDER", "AGE"):
            params.update({
                "resType": "2",        # json
                "searchType": "1",     # 발생수 (이건 GENDER/AGE 문서에 나오는 애)
                "searchYear": str(year),
            })
    
        elif dim_type == "REGION":
            # 문서에 나온 것 그대로 세팅
            params.update({
                "resType": "2",             # 또는 "1" (xml) – 문서 기준
                "searchPeriodType": "1",    # 1: 연도별
                "searchStartYear": str(year - 1),
                "searchEndYear": str(year),
            })


        # ─────────────────────────────────────
        # 1. HTTP 호출
        # ─────────────────────────────────────
        try:
            resp = requests.get(url, params=params, timeout=10)
            resp.raise_for_status()
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"[{dim_type}] HTTP 요청 실패: {e}"))
            self.stdout.write(self.style.ERROR(f"[{dim_type}] 요청 URL = {url}"))
            self.stdout.write(self.style.ERROR(f"[{dim_type}] 요청 PARAMS = {params}"))
            return

        # ─────────────────────────────────────
        # 2. JSON 파싱
        # ─────────────────────────────────────
        try:
            data = resp.json()
        except ValueError:
            self.stdout.write(self.style.ERROR(f"[{dim_type}] JSON 파싱 실패"))
            self.stdout.write(self.style.ERROR(f"[{dim_type}] RAW RESPONSE = {resp.text[:500]}"))
            return

        # GENDER / AGE : {"response": {"header": ..., "body": ...}}
        # REGION       : {"header": ...} 형식이므로 둘 다 대응
        root = data.get("response") or data

        header = root.get("header", {})
        result_code = header.get("resultCode")
        result_msg = header.get("resultMsg")

        if result_code not in ("00", "SUCCESS", "INFO-000"):
            self.stdout.write(self.style.ERROR(
                f"[{dim_type}] API 논리 오류 resultCode={result_code}, resultMsg={result_msg}"
            ))
            self.stdout.write(self.style.ERROR(f"[{dim_type}] 요청 URL = {resp.url}"))
            self.stdout.write(self.style.ERROR(
                f"[{dim_type}] RAW RESPONSE = {resp.text[:500]}"
            ))
            return

        body = root.get("body", {})
        items = body.get("items", {}).get("item", [])

        # item이 1개일 때 dict, 여러 개일 때 list인 케이스 대비
        if isinstance(items, dict):
            items = [items]

        count = len(items)
        self.stdout.write(self.style.NOTICE(f"[{dim_type}] {count}건 수신"))

        if count == 0:
            self.stdout.write(self.style.ERROR(f"[{dim_type}] *** 0건 수신 - 디버그 정보 출력 ***"))
            self.stdout.write(self.style.ERROR(f"[{dim_type}] 요청 URL = {resp.url}"))
            self.stdout.write(self.style.ERROR(f"[{dim_type}] 요청 PARAMS = {params}"))
            self.stdout.write(self.style.ERROR(f"[{dim_type}] HEADER = {header}"))
            self.stdout.write(self.style.ERROR(f"[{dim_type}] BODY = {str(body)[:500]}"))
            return

        # ─────────────────────────────────────
        # 3. DB 저장 (DimDisease 없는 경우 자동 생성 후 FK 연결)
        # ─────────────────────────────────────
        with transaction.atomic():
            for item in items:
                # year: "2024년" 형태라면 '년' 제거
                item_year = item.get("year")
                try:
                    if isinstance(item_year, str) and item_year.endswith("년"):
                        year_int = int(item_year.replace("년", ""))
                    else:
                        year_int = int(item_year)
                except (TypeError, ValueError):
                    year_int = year

                # 연 단위 통계 → 1월 1일로 고정
                stat_date = date(year_int, 1, 1)

                # 질병명 / 그룹명
                icd_name = item.get("icdNm")          # 예: "에볼라바이러스병"
                icd_group_name = item.get("icdGroupNm")  # 예: "1급", "제1급" 등

                if not icd_name:
                    self.stdout.write(self.style.WARNING(
                        f"[{dim_type}] icdNm 없음 → 스킵 (item={item})"
                    ))
                    continue

                # 여기서는 별도 코드 필드(icdCd)가 없으므로 병명 자체를 코드로 사용
                disease_code = icd_name

                # 🔹 DimDisease 자동 생성 (없으면 생성, 있으면 조회)
                #   DimDisease 모델이 대략 아래처럼 생겼다고 가정:
                #   disease_code, disease_name, icd_group_name, ai_summary, ai_updated_at
                disease_obj, created = DimDisease.objects.get_or_create(
                    disease_code=disease_code,
                    defaults={
                        "disease_name": icd_name,
                        "icd_group_name": icd_group_name,
                    },
                )
                if created:
                    self.stdout.write(self.style.NOTICE(
                        f"[{dim_type}] DimDisease 신규 생성: {disease_code} / {icd_name}"
                    ))

                # dim 매핑
                dim_info = extract_dim(item)
                dim_code = dim_info.get("dim_code")
                dim_label = dim_info.get("dim_label")

                if not dim_code:
                    self.stdout.write(
                        self.style.WARNING(f"[{dim_type}] dim_code 없음 → 스킵 (item={item})")
                    )
                    continue

                # resultVal → int
                result_val_raw = item.get("resultVal")
                try:
                    result_val = int(result_val_raw)
                except (TypeError, ValueError):
                    result_val = 0

                InfectiousStat.objects.update_or_create(
                    disease_code=disease_obj,   # FK: DimDisease 인스턴스
                    stat_date=stat_date,
                    dim_type=dim_type,
                    dim_code=dim_code,
                    defaults={
                        "disease_name": icd_name,
                        "dim_label": dim_label,
                        "result_val": result_val,
                        "ptnt_val": None,
                        "dbtptnt_val": None,
                        "holder_val": None,
                        "updated_at": datetime.now(),
                    },
                )
