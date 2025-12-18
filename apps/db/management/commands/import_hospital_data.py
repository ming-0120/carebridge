import requests
from django.core.management.base import BaseCommand
from apps.db.models.hospital import Hospital  # 경로: apps/db/models/hospital.py 기준

SERVICE_KEY = "8661f2737274c1d3578553e84076849efd87c7076b1cc5c8fe54183dae94c09c"

# 시도 코드 목록 (필요한 것만 써도 됨)
# HIRA 병원정보 v2 예: sidoCd=110000(서울), 410000(경기) ...
SIDO_CODES = [
    ("서울", "110000"),
    ("부산", "260000"),
    ("대구", "270000"),
    ("인천", "280000"),
    ("광주", "290000"),
    ("대전", "300000"),
    ("울산", "310000"),
    ("세종", "360000"),
    ("경기", "410000"),
    ("강원", "420000"),
    ("충북", "430000"),
    ("충남", "440000"),
    ("전북", "450000"),
    ("전남", "460000"),
    ("경북", "470000"),
    ("경남", "480000"),
    ("제주", "490000"),
]

# 진료과 코드
CODES = ["01", "04", "05", "11", "13"]


class Command(BaseCommand):
    help = "HIRA 병원정보 v2 API에서 시도별 병원 목록 일부만 가져와 hospital 테이블에 저장합니다."

    def handle(self, *args, **options):
        if not SERVICE_KEY:
            self.stdout.write(self.style.ERROR("SERVICE_KEY 채워주세요."))
            return

        base_url = "https://apis.data.go.kr/B551182/hospInfoServicev2/getHospBasisList"

        total_saved = 0

        for sido_name, sido_cd in SIDO_CODES:
            is_unlimited = sido_cd in ("110000", "410000")
            per_page = 100
            page_no = 1
            saved_for_sido = 0

            if is_unlimited:
                self.stdout.write(
                    self.style.NOTICE(
                        f"[{sido_name}] 시도 코드 {sido_cd} → 모든 페이지(전체 데이터)를 가져옵니다."
                    )
                )
            else:
                self.stdout.write(
                    self.style.NOTICE(
                        f"[{sido_name}] 시도 코드 {sido_cd} → 첫 페이지 최대 100개만 가져옵니다."
                    )
                )

            while True:
                # 서울/경기 아닌 지역은 첫 페이지만
                if (not is_unlimited) and page_no > 1:
                    break

                # 요청 파라미터
                params = {
                    "serviceKey": SERVICE_KEY,
                    "pageNo": page_no,
                    "numOfRows": per_page,
                    "_type": "json",
                    "sidoCd": sido_cd,
                    "dgsbjtCd": CODES,
                }

                try:
                    resp = requests.get(base_url, params=params, timeout=10)
                    resp.raise_for_status()
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f"[{sido_name}] (page {page_no}) API 요청 실패: {e}")
                    )
                    break

                try:
                    data = resp.json()
                except ValueError:
                    self.stdout.write(
                        self.style.ERROR(
                            f"[{sido_name}] (page {page_no}) JSON 파싱 실패:\n{resp.text[:300]}"
                        )
                    )
                    break

                header = data.get("response", {}).get("header", {})
                if header.get("resultCode") != "00":
                    self.stdout.write(
                        self.style.ERROR(
                            f"[{sido_name}] (page {page_no}) API 오류: "
                            f"{header.get('resultCode')} / {header.get('resultMsg')}"
                        )
                    )
                    break

                # response/body 안전 처리
                response_node = data.get("response")
                if not isinstance(response_node, dict):
                    self.stdout.write(
                        self.style.ERROR(
                            f"[{sido_name}] (page {page_no}) response 형식 이상: "
                            f"{type(response_node)} / {repr(response_node)[:200]}"
                        )
                    )
                    break

                body = response_node.get("body")

                if not isinstance(body, dict):
                    self.stdout.write(
                        self.style.ERROR(
                            f"[{sido_name}] (page {page_no}) body 가 dict 가 아님: "
                            f"{type(body)} / {repr(body)[:200]}"
                        )
                    )
                    break

                items_node = body.get("items")

                # items_node 타입에 따라 분기
                if isinstance(items_node, dict):
                    # 일반적인 케이스: {"items": {"item": [ {...}, {...} ] }}
                    items = items_node.get("item", [])
                elif isinstance(items_node, list):
                    # 혹시 바로 리스트로 오는 특이 케이스
                    items = items_node
                elif items_node is None:
                    # 더 이상 데이터 없음
                    if page_no == 1:
                        self.stdout.write(
                            self.style.WARNING(
                                f"[{sido_name}] (page {page_no}) items 가 없습니다. "
                                f"(병원 데이터 0개) body: {repr(body)[:200]}"
                            )
                        )
                    break
                else:
                    self.stdout.write(
                        self.style.ERROR(
                            f"[{sido_name}] (page {page_no}) items 형식이 예상과 다름: "
                            f"{type(items_node)} / {repr(items_node)[:200]}"
                        )
                    )
                    break

                # item 이 dict 하나만 오는 경우 → 리스트로 감싸기
                if isinstance(items, dict):
                    items = [items]
                elif not isinstance(items, list):
                    self.stdout.write(
                        self.style.ERROR(
                            f"[{sido_name}] (page {page_no}) item 형식이 이상함: "
                            f"{type(items)} / {repr(items)[:200]}"
                        )
                    )
                    break

                # 서울/경기가 아닌 경우: 첫 페이지라도 혹시 100개 초과 시 잘라주기
                if not is_unlimited:
                    items = items[:100]

                if not items:
                    break

                for item in items:
                    if self._save_item(item):
                        saved_for_sido += 1

                # 서울/경기 외에는 첫 페이지만 처리했으니 종료
                if not is_unlimited:
                    break

                # 서울/경기인데, 이번 페이지에서 per_page보다 적게 왔다 = 마지막 페이지
                if len(items) < per_page:
                    break

                # 다음 페이지로
                page_no += 1

            total_saved += saved_for_sido
            self.stdout.write(
                self.style.SUCCESS(
                    f"[{sido_name}] 총 {saved_for_sido}개 저장/업데이트 완료"
                )
            )

        self.stdout.write(
            self.style.SUCCESS(f"전체 시도 합계: {total_saved}개 병원 저장/업데이트 완료")
        )

    # ------------------------------------------------------------------
    # item → Hospital 저장 (필드 매핑)
    # ------------------------------------------------------------------
    def _save_item(self, item: dict) -> bool:
        """
        HIRA 병원정보 v2 item 하나를 받아 Hospital 레코드로 insert-only(upsert 아님).
        이미 존재(hpid 기준)하면 아무 것도 하지 않고 skip.
        """
        try:
            x_pos = self._to_float(item.get("XPos"))  # 경도
            y_pos = self._to_float(item.get("YPos"))  # 위도

            hpid = item.get("ykiho")
            if not hpid:
                return False

            defaults = {
                "name": item.get("yadmNm") or "",
                "address": item.get("addr") or "",
                "lat": y_pos,
                "lng": x_pos,
                "tel": item.get("telno") or None,  # None이면 None으로 저장 (빈 문자열 대신)
                # "category": item.get("dgsbjtCd"),
                # "category_name": item.get("dgsbjtCd"),
                "homepage": item.get("hospUrl") or None,
                "estb_date": item.get("estbDd") or None,  # None이면 None으로 저장
                "sido": item.get("sidoCd") or None,
                "sggu": item.get("sgguCdNm") or None,
                "dr_total": self._to_int(item.get("drTotCnt")),
                "hos_name": "",
                "hos_password": "",
            }

            # get_or_create를 사용하여 기존 데이터는 보존
            # 기존 병원의 tel, estb_date 등이 None이거나 빈 문자열인 경우만 업데이트
            obj, created = Hospital.objects.get_or_create(
                hpid=hpid,
                defaults=defaults,
            )
            
            # 기존 데이터인 경우에도 tel과 estb_date가 None이거나 빈 문자열이면 업데이트
            if not created:
                updated = False
                # tel이 None이거나 빈 문자열이고 API에서 값이 있으면 업데이트
                if (obj.tel is None or obj.tel == '') and defaults.get("tel"):
                    obj.tel = defaults["tel"]
                    updated = True
                # estb_date가 None이거나 빈 문자열이고 API에서 값이 있으면 업데이트
                if (obj.estb_date is None or obj.estb_date == '') and defaults.get("estb_date"):
                    obj.estb_date = defaults["estb_date"]
                    updated = True
                # dr_total이 None이고 API에서 값이 있으면 업데이트
                if obj.dr_total is None and defaults.get("dr_total"):
                    obj.dr_total = defaults["dr_total"]
                    updated = True
                # sido가 None이거나 빈 문자열이고 API에서 값이 있으면 업데이트
                if (obj.sido is None or obj.sido == '') and defaults.get("sido"):
                    obj.sido = defaults["sido"]
                    updated = True
                # sggu가 None이거나 빈 문자열이고 API에서 값이 있으면 업데이트
                if (obj.sggu is None or obj.sggu == '') and defaults.get("sggu"):
                    obj.sggu = defaults["sggu"]
                    updated = True
                if updated:
                    obj.save()

            # created == True  → 새로 insert
            # created == False → 이미 있어서 업데이트 또는 skip
            return created

        except Exception as e:
            # 특정 레코드 저장 실패해도 전체 배치가 죽지 않게 로그만 남김
            print(f"[WARN] 저장 실패: {e}")
            return False

    # ------------------------------------------------------------------
    # 숫자 변환 유틸
    # ------------------------------------------------------------------
    def _to_int(self, value):
        try:
            if value in (None, ""):
                return None
            return int(value)
        except (ValueError, TypeError):
            return None

    def _to_float(self, value):
        try:
            if value in (None, ""):
                return None
            return float(value)
        except (ValueError, TypeError):
            return None
