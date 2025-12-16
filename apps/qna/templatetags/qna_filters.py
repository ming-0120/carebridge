"""
QnA 템플릿 필터
- 이름 마스킹: 마지막 글자를 *로 변경
"""

from django import template

register = template.Library()


@register.filter
def mask_name(name):
    """
    이름 마스킹 필터
    - 마지막 글자를 *로 변경
    - 예: "유현석" -> "유현*"
    - 예: "홍길동" -> "홍길*"
    - 이름이 없거나 빈 문자열인 경우 그대로 반환
    """
    if not name or len(name) == 0:
        return name
    
    # 한 글자인 경우 그대로 반환
    if len(name) == 1:
        return name
    
    # 마지막 글자를 *로 변경
    return name[:-1] + '*'

