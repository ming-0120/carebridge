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
    birth_date_part = rrn_string[:6]
    gender_code = rrn_string[7]

    if gender_code in ('1', '2', '5', '6', '9', '0'):
        if gender_code in ('1', '2', '9', '0'):
            century_prefix = 19
        else:
            century_prefix = 18
    else:
        century_prefix = 20

    birth_year = int(f"{century_prefix}{birth_date_part[:2]}")
    birth_month = int(birth_date_part[2:4])
    birth_day = int(birth_date_part[4:6])

    today = date.today()

  
    return today.year - birth_year + 1