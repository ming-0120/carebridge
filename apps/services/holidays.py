import logging
import os
import urllib.parse
from datetime import date
from functools import lru_cache

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


def _get_openapi_service_key() -> str:
    raw_key = (
        os.getenv("API_KEY")
        or os.getenv("OPENAPI_SERVICE_KEY")
        or getattr(settings, "OPENAPI_SERVICE_KEY", "")
        or ""
    )
    raw_key = raw_key.strip().strip('"').strip("'")
    if not raw_key:
        return ""
    if "%" in raw_key:
        return raw_key
    return urllib.parse.quote(raw_key, safe="")


@lru_cache(maxsize=16)
def _fetch_holidays_for_year(year: int) -> list[dict]:
    service_key = _get_openapi_service_key()
    if not service_key:
        return []

    base_url = "https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo"
    params = {
        "solYear": year,
        "numOfRows": 100,
        "serviceKey": service_key,
        "_type": "json",
    }

    query = urllib.parse.urlencode(params, safe="%")
    url = f"{base_url}?{query}"
    res = requests.get(url, timeout=10)
    res.raise_for_status()
    payload = res.json()

    items = (
        payload.get("response", {})
        .get("body", {})
        .get("items", {})
        .get("item")
    ) or []
    if isinstance(items, dict):
        items = [items]

    holidays: list[dict] = []
    for item in items:
        locdate = str(item.get("locdate") or "")
        if len(locdate) != 8:
            continue
        holidays.append(
            {
                "date": f"{locdate[:4]}-{locdate[4:6]}-{locdate[6:8]}",
                "name": item.get("dateName") or "",
            }
        )
    return holidays


def get_holidays_for_year(year: int) -> list[dict]:
    try:
        return _fetch_holidays_for_year(year)
    except Exception:
        logger.exception("Failed to fetch holidays for year=%s", year)
        return []


def get_holidays_for_years(start_year: int, years: int = 2) -> list[dict]:
    merged: list[dict] = []
    for offset in range(max(0, years)):
        merged.extend(get_holidays_for_year(start_year + offset))
    return merged


def is_holiday_date(target: date) -> bool:
    holidays = get_holidays_for_year(target.year)
    target_str = target.isoformat()
    return any(h.get("date") == target_str for h in holidays)
