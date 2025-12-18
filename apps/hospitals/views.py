# hospitals/views.py
from django.http import JsonResponse
from django.shortcuts import render
import json
import requests
from apps.db.models.disease import DimDisease
from apps.db.models.statistic import InfectiousStat
from apps.db.models.hospital import Hospital
from django.views.decorators.http import require_GET
from django.db.models import Q

def infectious_stat(request):
    qs = InfectiousStat.objects.all().values(
        "disease_name",
        "stat_date",
        "dim_type",
        "dim_label",
        "result_val",
    )
    rows = list(qs)

    # JS 차트 코드가 기대하는 형태로 변환
    data = []
    for row in rows:
        data.append({
            "disease": row["disease_name"],
            "stdDate": row["stat_date"].strftime("%Y-%m-%d"),
            "statType": row["dim_type"],
            "groupName": row["dim_label"],
            "count": row["result_val"] or 0,
        })

    json_data = json.dumps(data, ensure_ascii=False)

    # DimDisease에서 요약까지 가져오기
    diseases = list(
        DimDisease.objects.values(
            "disease_code",
            "disease_name",
            "ai_summary",
            "ai_updated_at",
        )
    )

    for d in diseases:
        # datetime -> iso
        if d["ai_updated_at"] is not None:
            d["ai_updated_at"] = d["ai_updated_at"].isoformat()

        # ai_summary: JSON 문자열 -> dict 변환
        s = d.get("ai_summary")
        if not s:
            d["ai_summary"] = None
        elif isinstance(s, dict):
            # JSONField 등 이미 dict인 경우
            d["ai_summary"] = s
        else:
            # TextField에 JSON 문자열로 저장된 경우
            try:
                d["ai_summary"] = json.loads(s)
            except json.JSONDecodeError:
                d["ai_summary"] = None

    diseases_json = json.dumps(diseases, ensure_ascii=False)

    return render(
        request,
        "hospitals/infectious_stat.html",
        {
            "raw_data_json": json_data,
            "diseases_json": diseases_json,
        },
    )

@require_GET
def hospital_search(request):
    """
    HIRA 병원정보 API를 사용하여 실시간으로 병원을 검색합니다.
    검색 결과에 DB 등록 여부를 함께 반환합니다.
    """
    q = request.GET.get("q", "").strip()

    if not q:
        return JsonResponse({"results": []})

    # HIRA 병원정보 API 서비스 키
    SERVICE_KEY = "9767c8cf570c27ef856b2b355630a0d4a5701223a487b61faf3d9b3950c7b9d1"
    
    # API 엔드포인트 (병원 기본 정보 조회)
    base_url = "https://apis.data.go.kr/B551182/hospInfoServicev2/getHospBasisList"
    
    # API 요청 파라미터 (문서 예시에 따름)
    # requests.get()의 params는 자동으로 URL 인코딩하므로 원본 값을 넣어야 함
    params = {
        "ServiceKey": SERVICE_KEY,  # 문서 예시에 따르면 ServiceKey (대문자 S)
        "pageNo": "1",
        "numOfRows": "50",  # 검색 결과 최대 50개
        "_type": "json",  # JSON 형식 응답 요청
        "yadmNm": q,  # 병원명으로 검색 (requests가 자동으로 UTF-8 인코딩)
    }

    results = []

    try:
        # 외부 API 호출 (타임아웃 30초로 증가)
        resp = requests.get(base_url, params=params, timeout=30)
        
        # 500 에러인 경우 (이 API는 검색 결과 없음, 모호한 검색어 등에서 500 반환)
        if resp.status_code == 500:
            return JsonResponse({
                "results": [],
                "error": "검색 결과가 없거나 서버 오류가 발생했습니다. 정확한 병원명으로 다시 검색해주세요."
            })
        
        resp.raise_for_status()
        
        # JSON 응답 파싱
        data = resp.json()
        
        # 응답 구조 확인 (문서 및 import_hospital_data.py 참고)
        items = []
        if "response" in data:
            header = data.get("response", {}).get("header", {})
            body = data.get("response", {}).get("body", {})
            
            # API 응답 에러 체크 (문서: resultCode "00"이면 정상)
            result_code = header.get("resultCode")
            if result_code != "00":
                error_msg = header.get("resultMsg") or "API 요청 실패"
                return JsonResponse({
                    "results": [],
                    "error": f"API 에러 (코드: {result_code}): {error_msg}"
                })
            
            # items 추출 (import_hospital_data.py와 동일한 로직)
            items_node = body.get("items")
            
            # items_node 타입에 따라 분기
            if isinstance(items_node, dict):
                # 일반적인 케이스: {"items": {"item": [ {...}, {...} ] }}
                items = items_node.get("item", [])
            elif isinstance(items_node, list):
                # 혹시 바로 리스트로 오는 특이 케이스
                items = items_node
            elif items_node is None:
                # 데이터 없음
                items = []
            else:
                items = []
        
        # item이 dict 하나만 오는 경우 → 리스트로 감싸기
        if isinstance(items, dict):
            items = [items]
        elif not isinstance(items, list):
            items = []
        
        # 검색 결과가 없는 경우
        if not items:
            return JsonResponse({
                "results": [],
                "error": "검색 결과가 없습니다."
            })

        # DB에서 등록된 병원의 병원명 목록 조회 (hos_name이 있는 병원만)
        # 병원명으로 비교하여 등록 여부 확인 (hpid는 UUID로 자동 생성되므로 API의 ykiho와 일치하지 않음)
        # distinct()로 중복 제거하여 쿼리 최적화
        registered_names = set(
            Hospital.objects
            .filter(hos_name__isnull=False)
            .exclude(hos_name="")
            .values_list("name", flat=True)
            .distinct()
        )

        # API 응답 데이터를 결과 형식으로 변환
        for item in items:
            # ykiho: 암호화된 요양기호
            hpid = item.get("ykiho") or item.get("ykihoEncpt")
            if not hpid:
                continue

            # yadmNm: 병원명
            name = item.get("yadmNm") or ""
            
            # addr: 주소
            address = item.get("addr") or ""
            
            # telno: 전화번호 (None이면 빈 문자열로 변환)
            tel = item.get("telno") or ""
            if tel:
                tel = str(tel).strip()
            else:
                tel = ""
            
            # estbDd: 개설일자 (개원일)
            estb_date = item.get("estbDd")
            
            # 개원일 포맷팅 (YYYYMMDD -> YYYY.MM.DD)
            estb_date_formatted = ""
            if estb_date:
                estb_date_str = str(estb_date).strip()
                if len(estb_date_str) == 8 and estb_date_str.isdigit():
                    year = estb_date_str[:4]
                    month = estb_date_str[4:6]
                    day = estb_date_str[6:8]
                    estb_date_formatted = f'{year}.{month}.{day}'

            # 위도/경도 (YPos: 위도, XPos: 경도) - import_hospital_data.py 참고
            lat = item.get("YPos") or item.get("yPos") or item.get("ypos") or item.get("y_pos")
            lng = item.get("XPos") or item.get("xPos") or item.get("xpos") or item.get("x_pos")
            
            # 숫자로 변환 (None이면 None 유지)
            lat_float = None
            lng_float = None
            if lat:
                try:
                    lat_float = float(lat)
                except (ValueError, TypeError):
                    lat_float = None
            if lng:
                try:
                    lng_float = float(lng)
                except (ValueError, TypeError):
                    lng_float = None
            
            # 의사 총 수 (drTotCnt)
            dr_total = item.get("drTotCnt") or item.get("drTotcnt") or item.get("dr_total")
            dr_total_int = None
            if dr_total:
                try:
                    dr_total_int = int(dr_total)
                except (ValueError, TypeError):
                    dr_total_int = None
            
            # 시도 코드 (sidoCd)
            sido = item.get("sidoCd") or item.get("sido") or None
            
            # 시군구 코드/명 (sgguCd 또는 sgguCdNm)
            sggu = item.get("sgguCdNm") or item.get("sgguCd") or item.get("sggu") or None

            result = {
                "id": None,  # API에서 가져온 데이터는 DB ID가 없음
                "hpid": hpid,
                "name": name,
                "address": address,
                "tel": tel if tel else "",  # None이면 빈 문자열로 변환
                "estb_date": estb_date_formatted if estb_date_formatted else "",  # None이면 빈 문자열로 변환
                "lat": lat_float,
                "lng": lng_float,
                "dr_total": dr_total_int,
                "sggu": sggu if sggu else "",  # None이면 빈 문자열로 변환
                "sido": sido if sido else "",  # None이면 빈 문자열로 변환
                "is_registered": name in registered_names,  # DB에 등록된 병원인지 확인 (병원명 기준)
            }
            
            results.append(result)

    except requests.exceptions.Timeout as e:
        # 타임아웃 에러 처리
        return JsonResponse({
            "results": [], 
            "error": "API 요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요."
        })
    except requests.exceptions.RequestException as e:
        # API 요청 실패 시 에러 반환 (타임아웃 제외)
        error_msg = str(e)
        # 너무 긴 에러 메시지는 간단하게 표시
        if "timeout" in error_msg.lower() or "timed out" in error_msg.lower():
            error_msg = "API 요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요."
        elif len(error_msg) > 200:
            error_msg = "API 요청 중 오류가 발생했습니다."
        return JsonResponse({"results": [], "error": f"API 요청 실패: {error_msg}"})
    except Exception as e:
        # 기타 에러 처리
        error_msg = str(e)
        if len(error_msg) > 200:
            error_msg = "처리 중 오류가 발생했습니다."
        return JsonResponse({"results": [], "error": f"처리 중 오류 발생: {error_msg}"})

    return JsonResponse({"results": results})
