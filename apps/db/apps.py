from django.apps import AppConfig


class DbConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.db'
    label = 'carebridge_db'  # 기존 'db' 앱과 충돌 방지용
