"""
DB에 있는 모든 병원 데이터를 API로 검색하여 전화번호와 개원일을 동기화하는 명령어
기존 값이 있어도 API에서 가져온 값으로 업데이트 (덮어쓰기)
"""
from django.core.management.base import BaseCommand
from apps.db.models.hospital import Hospital
import requests
import time

SERVICE_KEY = "8661f2737274c1d3578553e84076849efd87c7076b1cc5c8fe54183dae94c09c"
BASE_URL = "https://apis.data.go.kr/B551182/hospInfoServicev2/getHospBasisList"


class Command(BaseCommand):
    help = "DB에 있는 모든 병원 데이터를 API로 검색하여 전화번호와 개원일을 동기화"

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='실제로 업데이트하지 않고 확인만 함',
        )
        parser.add_argument(
            '--skip-existing',
            action='store_true',
            help='기존 값이 있으면 스킵 (덮어쓰지 않음)',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        skip_existing = options['skip_existing']
        
        # 모든 병원 조회
        hospitals = Hospital.objects.all().order_by('hos_id')
        total_count = hospitals.count()
        
        self.stdout.write(f"전체 병원 수: {total_count}개")
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY-RUN 모드: 실제로 업데이트하지 않습니다."))
        if skip_existing:
            self.stdout.write(self.style.WARNING("기존 값이 있으면 스킵합니다."))
        
        self.stdout.write("=" * 60)
        
        updated_count = 0
        skipped_count = 0
        failed_count = 0
        not_found_count = 0
        
        for idx, hospital in enumerate(hospitals, 1):
            try:
                # 기존 값이 있고 skip_existing이 True이면 스킵
                if skip_existing:
                    # tel과 estb_date가 문자열이 아니면 문자열로 변환하여 확인
                    tel_str = str(hospital.tel).strip() if hospital.tel else ""
                    estb_date_str = str(hospital.estb_date).strip() if hospital.estb_date else ""
                    if tel_str and estb_date_str:
                        skipped_count += 1
                        if idx % 10 == 0:
                            self.stdout.write(f"[{idx}/{total_count}] {hospital.name} - 스킵 (기존 값 있음)")
                        continue
                
                self.stdout.write(f"\n[{idx}/{total_count}] {hospital.name} (hpid: {hospital.hpid})")
                
                # 병원명으로 API 검색
                params = {
                    "serviceKey": SERVICE_KEY,
                    "pageNo": "1",
                    "numOfRows": "50",
                    "_type": "json",
                    "yadmNm": hospital.name,
                }
                
                resp = requests.get(BASE_URL, params=params, timeout=30)
                resp.raise_for_status()
                
                data = resp.json()
                
                if "response" not in data:
                    self.stdout.write(self.style.WARNING(f"  → API 응답 형식 오류"))
                    failed_count += 1
                    continue
                
                header = data.get("response", {}).get("header", {})
                body = data.get("response", {}).get("body", {})
                
                result_code = header.get("resultCode")
                if result_code != "00":
                    self.stdout.write(self.style.WARNING(f"  → API 에러: {header.get('resultMsg', '알 수 없는 오류')}"))
                    failed_count += 1
                    continue
                
                items_node = body.get("items")
                if isinstance(items_node, dict):
                    items = items_node.get("item", [])
                elif isinstance(items_node, list):
                    items = items_node
                else:
                    items = []
                
                if isinstance(items, dict):
                    items = [items]
                elif not isinstance(items, list):
                    items = []
                
                if not items:
                    self.stdout.write(self.style.WARNING(f"  → API에서 데이터를 찾을 수 없습니다."))
                    not_found_count += 1
                    continue
                
                # hpid가 정확히 일치하는 항목 찾기
                item = None
                for it in items:
                    if it.get("ykiho") == hospital.hpid:
                        item = it
                        break
                
                # hpid가 일치하지 않으면 병원명이 정확히 일치하는 항목 찾기
                if not item:
                    for it in items:
                        if it.get("yadmNm") == hospital.name:
                            # 주소도 확인하여 더 정확하게 매칭
                            api_address = it.get("addr", "")
                            if api_address and hospital.address:
                                # 주소의 첫 부분이 일치하면 사용
                                if api_address[:10] in hospital.address or hospital.address[:10] in api_address:
                                    item = it
                                    break
                            else:
                                item = it
                                break
                
                if not item:
                    self.stdout.write(self.style.WARNING(f"  → hpid와 병원명이 일치하는 항목을 찾을 수 없습니다."))
                    not_found_count += 1
                    continue
                
                # 전화번호 업데이트
                tel = item.get("telno")
                tel_updated = False
                if tel:
                    # tel이 문자열이 아니면 문자열로 변환
                    tel_str = str(tel).strip() if tel else ""
                    if tel_str:
                        old_tel = str(hospital.tel) if hospital.tel else "(없음)"
                        if not dry_run:
                            hospital.tel = tel_str
                        tel_updated = True
                        self.stdout.write(f"  전화번호: '{old_tel}' → '{tel_str}'")
                    else:
                        self.stdout.write(f"  전화번호: API에서 값 없음 (현재: '{str(hospital.tel) if hospital.tel else '(없음)'}')")
                else:
                    self.stdout.write(f"  전화번호: API에서 값 없음 (현재: '{str(hospital.tel) if hospital.tel else '(없음)'}')")
                
                # 개원일 업데이트
                estb_date = item.get("estbDd")
                estb_date_updated = False
                if estb_date:
                    # estb_date가 문자열이 아니면 문자열로 변환 (정수형일 수 있음)
                    estb_date_str = str(estb_date).strip() if estb_date else ""
                    if estb_date_str:
                        old_estb_date = str(hospital.estb_date) if hospital.estb_date else "(없음)"
                        if not dry_run:
                            hospital.estb_date = estb_date_str
                        estb_date_updated = True
                        self.stdout.write(f"  개원일: '{old_estb_date}' → '{estb_date_str}'")
                    else:
                        self.stdout.write(f"  개원일: API에서 값 없음 (현재: '{str(hospital.estb_date) if hospital.estb_date else '(없음)'}')")
                else:
                    self.stdout.write(f"  개원일: API에서 값 없음 (현재: '{str(hospital.estb_date) if hospital.estb_date else '(없음)'}')")
                
                # 다른 필드도 업데이트 (없는 경우만)
                if not hospital.dr_total:
                    dr_total = item.get("drTotCnt")
                    if dr_total:
                        try:
                            if not dry_run:
                                hospital.dr_total = int(dr_total)
                            self.stdout.write(f"  의사 수: {dr_total}명")
                        except (ValueError, TypeError):
                            pass
                
                if not hospital.sido or (isinstance(hospital.sido, str) and hospital.sido.strip() == ''):
                    sido = item.get("sidoCd")
                    if sido:
                        sido_str = str(sido).strip() if sido else ""
                        if sido_str:
                            if not dry_run:
                                hospital.sido = sido_str
                
                if not hospital.sggu or (isinstance(hospital.sggu, str) and hospital.sggu.strip() == ''):
                    sggu = item.get("sgguCdNm")
                    if sggu:
                        sggu_str = str(sggu).strip() if sggu else ""
                        if sggu_str:
                            if not dry_run:
                                hospital.sggu = sggu_str
                
                # 업데이트된 경우만 저장
                if tel_updated or estb_date_updated:
                    if not dry_run:
                        hospital.save()
                    updated_count += 1
                    self.stdout.write(self.style.SUCCESS(f"  ✓ 업데이트 완료"))
                else:
                    self.stdout.write(self.style.WARNING(f"  → 업데이트할 항목 없음"))
                
                # API 호출 제한을 위한 딜레이 (너무 빠르게 호출하면 차단될 수 있음)
                time.sleep(0.1)
                
            except requests.exceptions.Timeout:
                self.stdout.write(self.style.ERROR(f"  → API 요청 타임아웃"))
                failed_count += 1
                continue
            except requests.exceptions.RequestException as e:
                self.stdout.write(self.style.ERROR(f"  → API 요청 실패: {str(e)}"))
                failed_count += 1
                continue
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  → 오류 발생: {str(e)}"))
                failed_count += 1
                continue
        
        # 결과 요약
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write("동기화 완료")
        self.stdout.write("=" * 60)
        self.stdout.write(f"전체 병원 수: {total_count}개")
        self.stdout.write(self.style.SUCCESS(f"업데이트 성공: {updated_count}개"))
        if skip_existing:
            self.stdout.write(f"스킵 (기존 값 있음): {skipped_count}개")
        self.stdout.write(self.style.WARNING(f"API에서 찾을 수 없음: {not_found_count}개"))
        self.stdout.write(self.style.ERROR(f"실패: {failed_count}개"))
        
        if dry_run:
            self.stdout.write(self.style.WARNING("\nDRY-RUN 모드였습니다. 실제로 업데이트하려면 --dry-run 옵션을 제거하세요."))

