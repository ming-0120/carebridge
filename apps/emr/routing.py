from django.urls import re_path
from .import consumers

websocket_urlpatterns = [
    # 주소 예시: ws://127.0.0.1:8000/ws/hospital/1/
    re_path(r'ws/hospital_dashboard/(?P<hos_id>\w+)/$', consumers.HospitalConsumer.as_asgi()),
]