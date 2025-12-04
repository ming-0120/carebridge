from django.db import models
from .choices import (
    GENDER_CHOICES,
    MAIL_CONFIRM_CHOICES,
    PROVIDER_CHOICES,
    ROLE_CHOICES,
    WITHDRAWAL_CHOICES,
)


class Users(models.Model):
    user_id = models.AutoField(primary_key=True)
    username = models.CharField(max_length=50, unique=True)
    password = models.CharField(max_length=255)
    name = models.CharField(max_length=100)
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES)
    phone = models.CharField(max_length=20)
    email = models.CharField(max_length=100)
    resident_reg_no = models.CharField(max_length=20)
    mail_confirm = models.CharField(max_length=1, choices=MAIL_CONFIRM_CHOICES)
    address = models.CharField(max_length=500)
    provider = models.CharField(
        max_length=10,
        choices=PROVIDER_CHOICES,
        default='local',
    )
    provider_id = models.CharField(max_length=200, null=True, blank=True)
    provider_email = models.CharField(max_length=200, null=True, blank=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    withdrawal = models.CharField(
        max_length=1,
        choices=WITHDRAWAL_CHOICES,
        default='0',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'users'

    def __str__(self):
        return f'{self.username} ({self.name})'
