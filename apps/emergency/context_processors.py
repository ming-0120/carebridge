# core/context_processors.py
from django.conf import settings

def kakao_keys(request):
    return {
        "KAKAO_MAP_JS_KEY": settings.KAKAO_MAP_JS_KEY,
    }
