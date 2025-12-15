"""
ASGI config for config project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import apps.emr.routing as route


os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = ProtocolTypeRouter({
    # 1. 일반 HTTP 요청 -> Django가 처리
    "http": get_asgi_application(),

    # 2. WebSocket 요청 -> Channels가 처리 (로그인 정보 포함)
    "websocket": AuthMiddlewareStack(
        URLRouter(
            route.websocket_urlpatterns
        )
    ),
})
