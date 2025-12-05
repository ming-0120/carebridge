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
            # 서울(110000), 경기(410000)는 200개, 나머지는 100개
            limit = 200 if sido_cd in ("110000", "410000") else 100

            self.stdout.write(
                self.style.NOTICE(
                    f"[{sido_name}] 시도 코드 {sido_cd} → 최대 {limit}개만 가져옵니다."
                )
            )

            params = {
                "serviceKey": SERVICE_KEY,
                "pageNo": 1,
                "numOfRows": limit,
                "_type": "json",
                "sidoCd": sido_cd,
                "dgsbjtCd": CODES,
            }

            try:
                resp = requests.get(base_url, params=params, timeout=10)
                resp.raise_for_status()
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"[{sido_name}] API 요청 실패: {e}")
                )
                continue

            try:
                data = resp.json()
            except ValueError:
                self.stdout.write(
                    self.style.ERROR(
                        f"[{sido_name}] JSON 파싱 실패:\n{resp.text[:300]}"
                    )
                )
                continue

            header = data.get("response", {}).get("header", {})
            if header.get("resultCode") != "00":
                self.stdout.write(
                    self.style.ERROR(
                        f"[{sido_name}] API 오류: {header.get('resultCode')} / {header.get('resultMsg')}"
                    )
                )
                continue

            # 🔽 기존:
            # body = data.get("response", {}).get("body", {})
            # if isinstance(items, dict):
            #     items = [items]

            # 🔽 수정 버전
            response_node = data.get("response")
            if not isinstance(response_node, dict):
                self.stdout.write(
                    self.style.ERROR(
                        f"[{sido_name}] response 형식 이상: {type(response_node)} / {repr(response_node)[:200]}"
                    )
                )
                continue

            body = response_node.get("body")

            # 🔐 body가 dict가 아니면 여기서 걸러서 넘어가도록 (여기서 AttributeError 방지)
            if not isinstance(body, dict):
                self.stdout.write(
                    self.style.ERROR(
                        f"[{sido_name}] body 가 dict 가 아님: {type(body)} / {repr(body)[:200]}"
                    )
                )
                continue

            items_node = body.get("items")

            # items_node 타입에 따라 분기
            if isinstance(items_node, dict):
                # 일반적인 케이스: {"items": {"item": [ {...}, {...} ] }}
                items = items_node.get("item", [])
            elif isinstance(items_node, list):
                # 혹시 바로 리스트로 오는 특이 케이스
                items = items_node
            elif items_node is None:
                self.stdout.write(
                    self.style.WARNING(
                        f"[{sido_name}] items 가 없습니다. (병원 데이터 0개) body: {repr(body)[:200]}"
                    )
                )
                continue
            else:
                self.stdout.write(
                    self.style.ERROR(
                        f"[{sido_name}] items 형식이 예상과 다름: {type(items_node)} / {repr(items_node)[:200]}"
                    )
                )
                continue

            # item 이 dict 하나만 오는 경우 → 리스트로 감싸기
            if isinstance(items, dict):
                items = [items]
            elif not isinstance(items, list):
                self.stdout.write(
                    self.style.ERROR(
                        f"[{sido_name}] item 형식이 이상함: {type(items)} / {repr(items)[:200]}"
                    )
                )
                continue


            saved_for_sido = 0
            for item in items[:limit]:
                if self._save_item(item):
                    saved_for_sido += 1

            total_saved += saved_for_sido
            self.stdout.write(
                self.style.SUCCESS(
                    f"[{sido_name}] {saved_for_sido}개 저장/업데이트 완료"
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
        HIRA 병원정보 v2 item 하나를 받아 Hospital 레코드로 upsert.
        """
        try:
            x_pos = self._to_float(item.get("XPos"))  # 경도
            y_pos = self._to_float(item.get("YPos"))  # 위도

            hpid = item.get("ykiho")
            if not hpid:
                return False

            Hospital.objects.update_or_create(
                hpid=hpid,
                defaults={
                    "name": item.get("yadmNm") or "",
                    "address": item.get("addr") or "",
                    "lat": y_pos,
                    "lng": x_pos,
                    "tel": item.get("telno"),
                    # "category": item.get("dgsbjtCd"),
                    # "category_name": item.get("dgsbjtCd"),
                    "homepage": item.get("hospUrl"),
                    "estb_date": item.get("estbDd"),
                    "sido": item.get("sidoCd"),
                    "sggu": item.get("sgguCdNm"),
                    "dr_total": self._to_int(item.get("drTotCnt")),
                    "hos_name": "",
                    "hos_password": "",
                },
            )
            return True
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
