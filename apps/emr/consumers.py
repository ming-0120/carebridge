import json
from channels.generic.websocket import AsyncWebsocketConsumer

class HospitalConsumer(AsyncWebsocketConsumer):
    # 1. 연결 시 실행
    async def connect(self):
        self.hospital_id = self.scope['url_route']['kwargs']['hos_id']

        self.room_group_name = f'hospital_group_{self.hospital_id}'

        # [Redis 동작] 
        # Redis에게 "현재 접속한 이 소켓(channel_name)을 'hospital_group_1'에 넣어줘"라고 요청
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept() # 연결 승인

    # 2. 연결 종료 시 실행
    async def disconnect(self, close_code):
        # [Redis 동작] Redis에게 "이 소켓을 그룹에서 빼줘"라고 요청
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    # 3. 그룹 메시지 수신 (View에서 보낸 신호를 Redis가 여기로 배달해줌)
    async def chart_update_event(self, event):
        message = event['message']

        # 최종적으로 JS(브라우저)에게 전송
        await self.send(text_data=json.dumps({
            'type': 'UPDATE_REQUIRED',
            'message': message
        }))