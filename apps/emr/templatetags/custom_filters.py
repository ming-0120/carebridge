from django import template
from datetime import date


register = template.Library()

# @register.filter("birth_date_from_rrn")을 사용하면 템플릿에서 'birth_date_from_rrn'으로 사용 가능
@register.filter
def rrn_to_birthdate(reg_num):
    """주민등록번호 앞 7자리를 받아 생년월일 형식으로 반환합니다."""
    
    # 입력된 주민등록번호에서 하이픈(-) 등 비숫자 문자 제거
    reg_num = str(reg_num).replace('-', '').strip()

    if len(reg_num) < 7 or not reg_num.isdigit():
        # 추출에 필요한 최소 7자리가 아니거나 숫자가 아니면 원본 반환 또는 오류 처리
        return "정보 오류" 

    # 1. 생년월일 부분 (앞 6자리)
    yy = reg_num[0:2]
    mm = reg_num[2:4]
    dd = reg_num[4:6]
    
    # 2. 성별/세기 구분 번호 (7번째 자리)
    century_digit = reg_num[6]
    
    # 3. 세기 결정 (가장 일반적인 경우: 1900년대와 2000년대)
    if century_digit in ('1', '2', '7', '8'):
        year_prefix = '19'
    elif century_digit in ('3', '4', '5', '6'):
        year_prefix = '20'
    elif century_digit in ('9', '0'):
        year_prefix = '18'
    else:
        return "세기 오류"
    
    # 최종 생년월일 문자열 조합
    full_year = year_prefix + yy
    birth_date = f"{full_year}-{mm}-{dd}"
    
    return birth_date

@register.filter
def calculate_age_from_rrn(rrn_string):
    """
    주민등록번호로 (한국식) 나이 계산.
    입력값이 비어있거나 형식이 잘못된 경우 템플릿 렌더링이 깨지지 않도록 빈 문자열을 반환한다.

    허용 입력 예:
    - "870513-1082019"
    - "8705131082019"
    """
    if rrn_string is None:
        return ""

    rrn = str(rrn_string).strip().replace(" ", "")
    if not rrn:
        return ""

    # 하이픈 제거 후 숫자만 남겨 처리
    rrn = rrn.replace("-", "")

    # YYMMDD + 성별코드(7번째 자리) 최소 7자리 필요
    if len(rrn) < 7 or not rrn[:7].isdigit():
        return ""

    birth_date_part = rrn[:6]
    gender_code = rrn[6]

    # 세기 판별 로직은 rrn_to_birthdate와 동일하게 맞춘다.
    if gender_code in ("1", "2", "7", "8"):
        century_prefix = 19
    elif gender_code in ("3", "4", "5", "6"):
        century_prefix = 20
    elif gender_code in ("9", "0"):
        century_prefix = 18
    else:
        return ""

    try:
        birth_year = int(f"{century_prefix}{birth_date_part[:2]}")
        birth_month = int(birth_date_part[2:4])
        birth_day = int(birth_date_part[4:6])
        date(birth_year, birth_month, birth_day)  # 유효성 검증
    except Exception:
        return ""

    today = date.today()
    return today.year - birth_year + 1


@register.filter
def mask_last_char(name):
    """
    이름의 마지막 글자를 마스킹하는 필터
    예: "김철수" → "김철*", "홍길동" → "홍길*", "이름" → "이*"
    """
    if not name:
        return ""
    
    name = str(name)
    
    if len(name) == 1:
        return "*"
    else:
        return name[:-1] + "*"
