from django import template

register = template.Library()


@register.filter
def mask_resident_reg_no(reg_no):
    """
    주민번호 마스킹 필터
    뒷자리 앞자리만 보이고 나머지는 *로 표시
    예: "870513-1082018" → "870513-1******"
    """
    if not reg_no:
        return "-"
    
    reg_no = str(reg_no).strip()
    
    # 하이픈 제거
    reg_no_clean = reg_no.replace("-", "")
    
    # 주민번호 형식 확인 (최소 13자리)
    if len(reg_no_clean) < 13 or not reg_no_clean[:13].isdigit():
        return reg_no  # 형식이 맞지 않으면 원본 반환
    
    # 앞 6자리 + "-" + 7번째 자리 + "******"
    front = reg_no_clean[:6]
    first_digit = reg_no_clean[6] if len(reg_no_clean) > 6 else ""
    
    return f"{front}-{first_digit}******"


@register.filter
def mask_phone(phone):
    """
    전화번호 마스킹 필터
    예: "010-7751-7593" → "010 - 7*** - ****"
    """
    if not phone:
        return "-"
    
    phone = str(phone).strip()
    
    # 하이픈 제거
    phone_clean = phone.replace("-", "").replace(" ", "")
    
    # 전화번호 형식 확인 (010으로 시작하는 11자리)
    if len(phone_clean) < 11 or not phone_clean.isdigit():
        return phone  # 형식이 맞지 않으면 원본 반환
    
    # 010으로 시작하는지 확인
    if not phone_clean.startswith("010"):
        return phone  # 010으로 시작하지 않으면 원본 반환
    
    # 010 - 첫 번째 숫자*** - ****
    area_code = phone_clean[:3]  # 010
    first_digit = phone_clean[3] if len(phone_clean) > 3 else ""
    
    return f"{area_code} - {first_digit}*** - ****"


@register.filter
def format_resident_reg_no(reg_no):
    """
    주민번호 포맷팅 필터
    하이픈 없이 저장된 주민번호를 하이픈이 있는 형식으로 변환
    예: "8705131234567" → "870513-1234567"
    예: "870513-1234567" → "870513-1234567" (이미 하이픈이 있으면 그대로 반환)
    """
    if not reg_no:
        return "-"
    
    reg_no = str(reg_no).strip()
    
    # 이미 하이픈이 있으면 그대로 반환
    if "-" in reg_no:
        return reg_no
    
    # 하이픈 제거
    reg_no_clean = reg_no.replace("-", "").replace(" ", "")
    
    # 주민번호 형식 확인 (13자리 숫자)
    if len(reg_no_clean) < 13 or not reg_no_clean[:13].isdigit():
        return reg_no  # 형식이 맞지 않으면 원본 반환
    
    # 앞 6자리 + "-" + 나머지 7자리
    front = reg_no_clean[:6]
    back = reg_no_clean[6:13]
    
    return f"{front}-{back}"
