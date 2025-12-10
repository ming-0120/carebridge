from django.db import models

# Qna 모델은 apps.db.models에서 import
from apps.db.models import Qna

# apps/qna 앱에서 사용할 모델들을 여기에 import하거나 정의
__all__ = ['Qna']
