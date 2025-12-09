from django import template

register = template.Library()


@register.filter
def percent(available, total):
    """
    병상 가용률 (0~100) 반환
    (available / total) * 100
    """
    try:
        if available is None or total is None:
            return 0
        available = int(available) if available else 0
        total = int(total) if total else 0
        if total <= 0:
            return 0
        return round((available / total) * 100)
    except (ValueError, TypeError, ZeroDivisionError):
        return 0


@register.filter
def circle_dasharray(available, total):
    """
    SVG 원형 그래프용 stroke-dasharray 값 계산
    원주 = 2 * π * r = 2 * π * 20 ≈ 125.66
    """
    import math
    try:
        if available is None or total is None:
            return "0, 125.66"
        available = int(available) if available else 0
        total = int(total) if total else 0
        if total <= 0:
            return "0, 125.66"
        
        circumference = 2 * math.pi * 20  # r = 20
        pct = available / total
        dash_length = pct * circumference
        return f"{dash_length:.2f}, {circumference:.2f}"
    except (ValueError, TypeError, ZeroDivisionError):
        return "0, 125.66"


@register.filter
def status_color(st, field):
    if not st:
        return "empty"

    avail = getattr(st, f"{field}_available", None)
    total = getattr(st, f"{field}_total", None)

    # total이 None이어도 available 값만으로 판단
    if avail is None:
        return "empty"

    if avail == 0:
        return "full"

    # total 제공 안 되면 available 기준으로 “주의/여유” 처리
    if total in [None, 0]:
        return "warn" if avail == 1 else "free"

    ratio = avail / total
    if ratio < 0.3:
        return "warn"

    return "free"


@register.filter
def status_label(st, field):
    if not st:
        return "정보없음"

    avail = getattr(st, f"{field}_available", None)
    total = getattr(st, f"{field}_total", None)

    if avail is None:
        return "정보없음"

    if avail == 0:
        return "포화"

    if total in [None, 0]:
        # total을 모르는 경우 available 기준으로 판단
        return "주의" if avail == 1 else "여유"

    ratio = avail / total
    if ratio < 0.3:
        return "주의"

    return "여유"

@register.filter
def status_badge_color(available, total):
    if available is None:
        return "badge-none"   # 회색

    if available == 0:
        return "badge-full"   # 빨강

    if total in [None, 0]:
        return "badge-mid"    # 주의(주황)

    ratio = available / total
    if ratio < 0.3:
        return "badge-mid"

    return "badge-good"        # 초록


@register.filter
def status_badge_text(available, total):
    if available is None:
        return "정보없음"

    if available == 0:
        return "포화"

    if total in [None, 0]:
        return "보통"

    ratio = available / total

    if ratio < 0.3:
        return "주의"

    return "원활"
