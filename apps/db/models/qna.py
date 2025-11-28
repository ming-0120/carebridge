from django.db import models
from .choices import QNA_PRIVACY_CHOICES


class Qna(models.Model):
    qna_id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=255)
    content = models.TextField()
    reply = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    privacy = models.CharField(
        max_length=10,
        choices=QNA_PRIVACY_CHOICES,
        default='PUBLIC',
    )
    user = models.ForeignKey('Users', on_delete=models.CASCADE)

    class Meta:
        db_table = 'qna'

    def __str__(self):
        return self.title
