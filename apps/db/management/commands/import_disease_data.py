from datetime import date, datetime
from django.core.management.base import BaseCommand
from django.db import transaction
import requests
from apps.db.models.statistic import InfectiousStat
from apps.db.models.disease import DimDisease 
from django.core.management import call_command

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
        target_year = datetime.now().year
        self.stdout.write(self.style.NOTICE(f"[INFO] target_year = {target_year}"))

        gender_min_val = 10

        # 1) 성별 통계 먼저 저장
        self.fetch_and_save(
            dim_type="GENDER",
            url="https://apis.data.go.kr/1790387/EIDAPIService/Gender",
            year=target_year,
            extract_dim=lambda item: {
                "dim_code": item.get("sex"),
                "dim_label": item.get("sex"),
            },
            min_result_val=gender_min_val,
        )

        # 🔹 GENDER 에서 resultVal >= 10 인 질병들만 뽑기
        valid_disease_ids = set(
            InfectiousStat.objects.filter(
                dim_type="GENDER",
                result_val__gte=gender_min_val,
                stat_date__year=target_year,   # 해당 연도만
            ).values_list("disease_code_id", flat=True)
        )

        self.stdout.write(self.style.NOTICE(
            f"[FILTER] GENDER resultVal>={gender_min_val} 인 질병 수: {len(valid_disease_ids)}"
        ))

        # 2) 시도(지역) 통계 (원하면 여기에도 필터를 걸 수 있지만, 지금은 그대로 둠)
        self.fetch_and_save(
            dim_type="REGION",
            url="https://apis.data.go.kr/1790387/EIDAPIService/Region",
            year=target_year,
            extract_dim=lambda item: {
                "dim_code": item.get("sidoCd"),
                "dim_label": item.get("sidoNm"),
            },
            min_result_val=10,
        )

        # 3) 연령대 통계 - 🔹 여기서 valid_disease_ids 사용
        self.fetch_and_save(
            dim_type="AGE",
            url="https://apis.data.go.kr/1790387/EIDAPIService/Age",
            year=target_year,
            extract_dim=lambda item: {
                "dim_code": item.get("ageRange"),
                "dim_label": item.get("ageRange"),
            },
            min_result_val=10,
            valid_disease_ids=valid_disease_ids,   # ✅ GENDER 에서 살아남은 질병만 저장
        )
        call_command("generate_disease_ai_summary")


    def fetch_and_save(
        self,
        dim_type: str,
        url: str,
        year: int,
        extract_dim,
        min_result_val: int = 0,
        valid_disease_ids=None,   # 🔹 추가
        ):
        page_no = 1
        num_rows = 100  # 한 페이지당 조회 수

        # dim_type 에 따라 공통 파라미터 세팅 (pageNo, numOfRows 제외)
        base_params = {
            "serviceKey": SERVICE_KEY,
            "numOfRows": num_rows,
        }

        if dim_type in ("GENDER", "AGE"):
            base_params.update({
                "resType": "2",        # json
                "searchType": "1",     # 발생수
                "searchYear": str(year),
            })

        elif dim_type == "REGION":
            base_params.update({
                "resType": "2",
                "searchPeriodType": "1",          # 1: 연도별
                "searchStartYear": str(year - 1), # 문서 규격 맞춰 사용
                "searchEndYear": str(year),
            })

        total_processed = 0

        while True:
            params = {
                **base_params,
                "pageNo": page_no,
            }

            # ─────────────────────────────
            # 1. HTTP 호출
            # ─────────────────────────────
            try:
                resp = requests.get(url, params=params, timeout=10)
                resp.raise_for_status()
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"[{dim_type}] HTTP 요청 실패 (page={page_no}): {e}"))
                self.stdout.write(self.style.ERROR(f"[{dim_type}] 요청 URL = {url}"))
                self.stdout.write(self.style.ERROR(f"[{dim_type}] 요청 PARAMS = {params}"))
                return

            # ─────────────────────────────
            # 2. JSON 파싱
            # ─────────────────────────────
            try:
                data = resp.json()
            except ValueError:
                self.stdout.write(self.style.ERROR(f"[{dim_type}] JSON 파싱 실패 (page={page_no})"))
                self.stdout.write(self.style.ERROR(f"[{dim_type}] RAW RESPONSE = {resp.text[:500]}"))
                return

            root = data.get("response") or data

            header = root.get("header", {})
            result_code = header.get("resultCode")
            result_msg = header.get("resultMsg")

            if result_code not in ("00", "SUCCESS", "INFO-000", None):
                self.stdout.write(self.style.ERROR(
                    f"[{dim_type}] API 논리 오류 (page={page_no}) resultCode={result_code}, resultMsg={result_msg}"
                ))
                self.stdout.write(self.style.ERROR(f"[{dim_type}] 요청 URL = {resp.url}"))
                self.stdout.write(self.style.ERROR(
                    f"[{dim_type}] RAW RESPONSE = {resp.text[:500]}"
                ))
                return

            body = root.get("body", {}) or {}

            # totalCount 있으면 전체 페이지 계산에 활용
            total_count_raw = body.get("totalCount")
            try:
                total_count = int(total_count_raw) if total_count_raw is not None else None
            except (TypeError, ValueError):
                total_count = None

            raw_items = body.get("items", {})
            items = raw_items.get("item", []) if isinstance(raw_items, dict) else raw_items

            # item이 1개일 때 dict, 여러 개일 때 list인 케이스 대비
            if isinstance(items, dict):
                items = [items]

            count = len(items)
            self.stdout.write(self.style.NOTICE(f"[{dim_type}] page {page_no} - {count}건 수신"))

            # 첫 페이지부터 0건이면 진짜로 데이터 없는 상황이니 디버그 출력
            if count == 0:
                if page_no == 1:
                    self.stdout.write(self.style.ERROR(f"[{dim_type}] *** 0건 수신 - 디버그 정보 출력 ***"))
                    self.stdout.write(self.style.ERROR(f"[{dim_type}] 요청 URL = {resp.url}"))
                    self.stdout.write(self.style.ERROR(f"[{dim_type}] 요청 PARAMS = {params}"))
                    self.stdout.write(self.style.ERROR(f"[{dim_type}] HEADER = {header}"))
                    self.stdout.write(self.style.ERROR(f"[{dim_type}] BODY = {str(body)[:500]}"))
                break  # 페이지 끝

            # ─────────────────────────────
            # 3. DB 저장 (페이지 단위 트랜잭션)
            # ─────────────────────────────
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

                    # DimDisease 자동 생성 / 조회
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
                    # 🔹 여기 추가
                    if valid_disease_ids is not None and disease_obj.pk not in valid_disease_ids:
                        continue

                    # dim 매핑
                    dim_info = extract_dim(item)
                    dim_code = dim_info.get("dim_code")
                    dim_label = dim_info.get("dim_label")

                    if not dim_code:
                        self.stdout.write(
                            self.style.WARNING(f"[{dim_type}] dim_code 없음 → 스킵 (item={item})")
                        )
                        continue

                    # resultVal 파싱 + 최소값 필터
                    result_val_raw = item.get("resultVal")
                    try:
                        result_val = int(result_val_raw)
                    except (TypeError, ValueError):
                        self.stdout.write(
                            self.style.WARNING(f"[{dim_type}] resultVal 파싱 실패 → 스킵 (item={item})")
                        )
                        continue

                    # 🔹 여기서 10 미만이면 저장하지 않음
                    if result_val < min_result_val:
                        continue

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
                    total_processed += 1

            # ─────────────────────────────
            # 4. 다음 페이지로 넘어갈지 결정
            # ─────────────────────────────
            # totalCount 가 있으면 그것 기준으로, 없으면 "이 페이지가 비어있는 순간" 종료
            if total_count is not None:
                if page_no * num_rows >= total_count:
                    break
            else:
                # totalCount를 모르는 경우:
                # 이번 페이지에서 받은 건수가 num_rows 보다 작으면 마지막 페이지로 간주
                if count < num_rows:
                    break

            page_no += 1

        self.stdout.write(self.style.SUCCESS(
            f"[{dim_type}] 최종 저장 대상 resultVal>={min_result_val} 건수: {total_processed}"
        ))
