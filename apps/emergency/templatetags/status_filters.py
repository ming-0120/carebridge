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
    퍼센트 기반으로 계산 (available / total * 100)
    """
    import math
    try:
        if available is None or total is None:
            return "0, 125.66"
        # available이 음수인 경우 0으로 처리
        available = max(0, int(available) if available else 0)
        total = int(total) if total else 0
        if total <= 0:
            return "0, 125.66"
        
        circumference = 2 * math.pi * 20  # r = 20
        # 퍼센트 계산: available / total
        pct = available / total
        # 퍼센트를 0~1 범위로 제한 (available이 total보다 큰 경우 방지)
        pct = max(0.0, min(1.0, pct))
        dash_length = pct * circumference
        return f"{dash_length:.2f}, {circumference:.2f}"
    except (ValueError, TypeError, ZeroDivisionError):
        return "0, 125.66"


@register.filter
def circle_dashoffset(available, total):
    """
    SVG 원형 그래프용 stroke-dashoffset 값 계산
    12시 기준 시계방향으로 채워지도록 offset 계산
    원주 = 2 * π * r = 2 * π * 20 ≈ 125.66
    available이 많을수록 offset이 작아져서 더 많이 채워짐
    offset = circumference * (1 - pct)
    """
    import math
    try:
        if available is None or total is None:
            return 125.66  # 완전히 비어있음
        # available이 음수인 경우 0으로 처리
        available = max(0, int(available) if available else 0)
        total = int(total) if total else 0
        if total <= 0:
            return 125.66  # 완전히 비어있음
        
        circumference = 2 * math.pi * 20  # r = 20
        # 퍼센트 계산: available / total
        pct = available / total
        # 퍼센트를 0~1 범위로 제한
        pct = max(0.0, min(1.0, pct))
        # offset 계산: 전체 원주에서 채워진 부분을 뺀 값
        # available이 0이면 offset = circumference (비어있음)
        # available이 total이면 offset = 0 (가득 참)
        dash_offset = circumference * (1 - pct)
        return f"{dash_offset:.2f}"
    except (ValueError, TypeError, ZeroDivisionError):
        return "125.66"


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


@register.simple_tag
def congestion_text(available, total, type_name):
    """
    범례 기준 혼잡도 텍스트 반환
    type_name: "er_general", "er_child", "isolation", "birth"
    """
    if available is None:
        return "-"
    
    # available이 음수인 경우 0으로 처리
    if available < 0:
        available = 0
    
    # 분만실 특수 처리: 현재 가용수 기준
    if type_name == "birth":
        if available >= 1:
            return "가능"
        else:
            return "불가능"
    
    # available이 0이면 혼잡
    if available == 0:
        return "혼잡"
    
    # total이 None이거나 0이면 보통
    if total is None or total <= 0:
        return "보통"
    
    pct = (available / total) * 100
    
    # 응급실일반/소아: 80% 이상=원활, 50~79%=보통, 50% 미만=혼잡
    if type_name in ["er_general", "er_child"]:
        if pct >= 80:
            return "원활"
        elif pct >= 50:
            return "보통"
        else:
            return "혼잡"
    
    # 음압/일반/코호트격리: 100%=원활, 50~99%=보통, 50% 미만=혼잡
    if type_name in ["isolation", "negative_pressure", "isolation_general", "isolation_cohort"]:
        if pct >= 100:
            return "원활"
        elif pct >= 50:
            return "보통"
        else:
            return "혼잡"
    
    # 기본값
    return "보통"


@register.simple_tag
def congestion_color_class(available, total, type_name):
    """
    범례 기준 색상 클래스 반환
    type_name: "er_general", "er_child", "isolation", "birth"
    """
    if available is None:
        return "none"
    
    # available이 음수인 경우 0으로 처리
    if available < 0:
        available = 0
    
    # 분만실 특수 처리: 현재 가용수 기준
    if type_name == "birth":
        if available >= 1:
            return "green"
        else:
            return "red"
    
    # available이 0이면 빨강
    if available == 0:
        return "red"
    
    # total이 None이거나 0이면 회색
    if total is None or total <= 0:
        return "none"
    
    pct = (available / total) * 100
    
    # 응급실일반/소아: 80% 이상=초록, 50~79%=주황, 50% 미만=빨강
    if type_name in ["er_general", "er_child"]:
        if pct >= 80:
            return "green"
        elif pct >= 50:
            return "orange"
        else:
            return "red"
    
    # 음압/일반/코호트격리: 100%=초록, 50~99%=주황, 50% 미만=빨강
    if type_name in ["isolation", "negative_pressure", "isolation_general", "isolation_cohort"]:
        if pct >= 100:
            return "green"
        elif pct >= 50:
            return "orange"
        else:
            return "red"
    
    # 기본값
    return "none"