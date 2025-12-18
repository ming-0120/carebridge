"""
기존 병원 데이터의 전화번호와 개원일을 API에서 다시 가져와서 업데이트하는 명령어
"""
from django.core.management.base import BaseCommand
from django.db import models
from apps.db.models.hospital import Hospital
import requests

SERVICE_KEY = "8661f2737274c1d3578553e84076849efd87c7076b1cc5c8fe54183dae94c09c"
BASE_URL = "https://apis.data.go.kr/B551182/hospInfoServicev2/getHospBasisList"


class Command(BaseCommand):
    help = "기존 병원 데이터의 전화번호와 개원일을 API에서 다시 가져와서 업데이트"

    def handle(self, *args, **options):
        # tel 또는 estb_date가 None인 병원들 조회
        hospitals_to_update = Hospital.objects.filter(
            models.Q(tel__isnull=True) | models.Q(tel='') | 
            models.Q(estb_date__isnull=True) | models.Q(estb_date='')
        )
        
        total_count = hospitals_to_update.count()
        self.stdout.write(f"업데이트 대상 병원 수: {total_count}개")
        
        if total_count == 0:
            self.stdout.write(self.style.SUCCESS("업데이트할 병원이 없습니다."))
            return
        
        updated_count = 0
        failed_count = 0
        
        for hospital in hospitals_to_update:
            try:
                # 병원명으로 API에서 병원 정보 조회 (ykiho로는 개별 검색이 안 될 수 있음)
                # 병원명으로 검색하여 hpid가 일치하는 것을 찾음
                params = {
                    "serviceKey": SERVICE_KEY,
                    "pageNo": "1",
                    "numOfRows": "50",  # 여러 결과가 나올 수 있으므로 50개까지
                    "_type": "json",
                    "yadmNm": hospital.name,  # 병원명으로 검색
                }
                
                resp = requests.get(BASE_URL, params=params, timeout=30)
                resp.raise_for_status()
                
                data = resp.json()
                
                if "response" in data:
                    header = data.get("response", {}).get("header", {})
                    body = data.get("response", {}).get("body", {})
                    
                    result_code = header.get("resultCode")
                    if result_code != "00":
                        self.stdout.write(
                            self.style.WARNING(
                                f"[{hospital.name}] API 에러: {header.get('resultMsg', '알 수 없는 오류')}"
                            )
                        )
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
                        self.stdout.write(
                            self.style.WARNING(f"[{hospital.name}] API에서 데이터를 찾을 수 없습니다.")
                        )
                        failed_count += 1
                        continue
                    
                    # hpid가 정확히 일치하는 항목만 찾기 (안전을 위해)
                    item = None
                    for it in items:
                        if it.get("ykiho") == hospital.hpid:
                            item = it
                            break
                    
                    # hpid가 일치하는 항목이 없으면 스킵 (잘못된 데이터 업데이트 방지)
                    if not item:
                        self.stdout.write(
                            self.style.WARNING(
                                f"[{hospital.name}] hpid({hospital.hpid})가 일치하는 항목을 찾을 수 없습니다. 스킵합니다."
                            )
                        )
                        failed_count += 1
                        continue
                    
                    # tel 업데이트 (현재 None이거나 빈 문자열인 경우만)
                    # 기존에 값이 있으면 절대 덮어쓰지 않음
                    tel = item.get("telno")
                    if tel and tel.strip() and (hospital.tel is None or hospital.tel == '' or hospital.tel.strip() == ''):
                        old_tel = hospital.tel
                        hospital.tel = tel.strip()
                        self.stdout.write(f"[{hospital.name}] 전화번호 업데이트: '{old_tel}' → '{hospital.tel}'")
                    elif hospital.tel and hospital.tel.strip():
                        self.stdout.write(f"[{hospital.name}] 전화번호 유지 (기존 값 있음): '{hospital.tel}'")
                    
                    # estb_date 업데이트 (현재 None이거나 빈 문자열인 경우만)
                    # 기존에 값이 있으면 절대 덮어쓰지 않음
                    estb_date = item.get("estbDd")
                    if estb_date and estb_date.strip() and (hospital.estb_date is None or hospital.estb_date == '' or hospital.estb_date.strip() == ''):
                        old_estb_date = hospital.estb_date
                        hospital.estb_date = estb_date.strip()
                        self.stdout.write(f"[{hospital.name}] 개원일 업데이트: '{old_estb_date}' → '{hospital.estb_date}'")
                    elif hospital.estb_date and hospital.estb_date.strip():
                        self.stdout.write(f"[{hospital.name}] 개원일 유지 (기존 값 있음): '{hospital.estb_date}'")
                    
                    # 다른 필드도 업데이트 (None이거나 빈 값인 경우만)
                    # 기존 값이 있으면 절대 덮어쓰지 않음
                    updated = False
                    
                    if not hospital.dr_total:
                        dr_total = item.get("drTotCnt")
                        if dr_total:
                            try:
                                hospital.dr_total = int(dr_total)
                                updated = True
                            except (ValueError, TypeError):
                                pass
                    
                    if not hospital.sido or hospital.sido.strip() == '':
                        sido = item.get("sidoCd")
                        if sido and sido.strip():
                            hospital.sido = sido.strip()
                            updated = True
                    
                    if not hospital.sggu or hospital.sggu.strip() == '':
                        sggu = item.get("sgguCdNm")
                        if sggu and sggu.strip():
                            hospital.sggu = sggu.strip()
                            updated = True
                    
                    # tel이나 estb_date가 업데이트되었거나 다른 필드가 업데이트된 경우만 save
                    if (tel and tel.strip() and (hospital.tel is None or hospital.tel == '' or hospital.tel.strip() == '')) or \
                       (estb_date and estb_date.strip() and (hospital.estb_date is None or hospital.estb_date == '' or hospital.estb_date.strip() == '')) or \
                       updated:
                        hospital.save()
                        updated_count += 1
                        self.stdout.write(
                            self.style.SUCCESS(f"[{hospital.name}] 업데이트 완료")
                        )
                    else:
                        self.stdout.write(
                            self.style.SUCCESS(f"[{hospital.name}] 업데이트할 항목 없음 (모든 필드에 값이 있음)")
                        )
                    
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"[{hospital.name}] 업데이트 실패: {str(e)}")
                )
                failed_count += 1
                continue
        
        self.stdout.write(
            self.style.SUCCESS(
                f"\n업데이트 완료: 성공 {updated_count}개, 실패 {failed_count}개"
            )
        )

