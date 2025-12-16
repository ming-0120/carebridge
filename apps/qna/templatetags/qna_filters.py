"""
QnA 앱 커스텀 템플릿 필터
- 작성자 이름 마스킹 등 템플릿 유틸리티 필터 제공
"""

from django import template

register = template.Library()


@register.filter
def mask_last_char(value):
    """
    문자열의 마지막 글자를 *로 마스킹
    예: "나나" -> "나*", "홍길동" -> "홍길*"
    
    Args:
        value: 마스킹할 문자열
        
    Returns:
        마지막 글자가 *로 마스킹된 문자열
    """
    if not value or len(value) == 0:
        return value
    
    if len(value) == 1:
        return "*"
    
    return value[:-1] + "*"

