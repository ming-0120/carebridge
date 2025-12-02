"""
1:1 문의 더미 데이터 생성 관리 명령어
사용법: python manage.py create_qna_dummy
"""
from django.core.management.base import BaseCommand
from apps.db.models import Users, Qna
from django.utils import timezone
from datetime import timedelta
import random


class Command(BaseCommand):
    help = '1:1 문의 더미 데이터를 생성합니다.'

    def handle(self, *args, **options):
        # 더미 문의 데이터
        qna_data = [
            {
                'title': '버튼 클릭이 잘 안돼요~',
                'content': '홈페이지에서 응급실 이동 버튼이 클릭이 잘 안돼요~!',
                'has_reply': False
            },
            {
                'title': '병원 예약 관련 문의드립니다.',
                'content': '병원 예약을 하고 싶은데 어떻게 해야 하나요?',
                'has_reply': True,
                'reply': '병원 예약은 병원 목록에서 원하는 병원을 선택하신 후 예약 버튼을 클릭하시면 됩니다.'
            },
            {
                'title': '응급실 정보가 이상해요',
                'content': '응급실 정보가 실제와 다르게 표시되는 것 같습니다.',
                'has_reply': False
            },
            {
                'title': '로그인이 안됩니다',
                'content': '로그인을 시도하는데 계속 실패합니다.',
                'has_reply': True,
                'reply': '비밀번호를 확인해주시고, 그래도 안되시면 비밀번호 찾기를 이용해주세요.'
            },
            {
                'title': '회원가입 문의',
                'content': '회원가입 시 이메일 인증이 안됩니다.',
                'has_reply': False
            },
            {
                'title': '의사 정보 수정 요청',
                'content': '의사 정보에 오류가 있어서 수정 요청드립니다.',
                'has_reply': True,
                'reply': '의사 정보 수정 요청을 접수했습니다. 검토 후 수정하겠습니다.'
            },
            {
                'title': '예약 취소 방법',
                'content': '예약을 취소하고 싶은데 어떻게 해야 하나요?',
                'has_reply': False
            },
            {
                'title': '결제 오류 문의',
                'content': '결제 과정에서 오류가 발생했습니다.',
                'has_reply': False
            },
        ]

        # 사용자 조회
        users = list(Users.objects.all())
        
        if not users:
            self.stdout.write(
                self.style.ERROR('사용자가 없습니다. 먼저 사용자 데이터를 생성해주세요.')
            )
            return
        
        self.stdout.write(f'사용자 수: {len(users)}')
        self.stdout.write('더미 문의 데이터 생성 중...\n')
        
        created_count = 0
        for i, data in enumerate(qna_data):
            # 사용자 순환 할당
            user = users[i % len(users)]
            
            # 이미 존재하는지 확인
            if Qna.objects.filter(title=data['title'], user=user).exists():
                self.stdout.write(f'이미 존재: {data["title"]}')
                continue
            
            # 문의 생성
            qna = Qna.objects.create(
                title=data['title'],
                content=data['content'],
                user=user,
                created_at=timezone.now() - timedelta(days=random.randint(0, 10))
            )
            
            # 답변이 있는 경우 추가
            if data.get('has_reply') and data.get('reply'):
                qna.reply = data['reply']
                qna.save()
            
            created_count += 1
            status = '답변 완료' if qna.reply else '대기'
            self.stdout.write(
                self.style.SUCCESS(f'✓ 생성: {qna.title} ({status}) - 작성자: {user.name}')
            )
        
        self.stdout.write(f'\n총 {created_count}개의 문의가 생성되었습니다.')
        self.stdout.write(f'전체 문의 수: {Qna.objects.count()}')
        self.stdout.write(
            f'답변 완료: {Qna.objects.exclude(reply__isnull=True).exclude(reply="").count()}개'
        )
        self.stdout.write(
            f'답변 대기: {Qna.objects.filter(reply__isnull=True).count() + Qna.objects.filter(reply="").count()}개'
        )

