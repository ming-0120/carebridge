from django import template

register = template.Library()

@register.filter
def status_color(value, arg=None):
    # arg는 현재 사용하지 않아도 기본 파라미터를 받아 예외 방지
    if value is None:
        return "gray"

    try:
        value = int(value)
    except:
        return "gray"

    if value >= 70:
        return "green"
    elif value >= 40:
        return "orange"
    else:
        return "red"



@register.filter
def status_label(value, arg=None):
    if value is None:
        return "정보없음"

    try:
        value = int(value)
    except:
        return "정보없음"

    if value >= 70:
        return "원활"
    elif value >= 40:
        return "보통"
    else:
        return "혼잡"

