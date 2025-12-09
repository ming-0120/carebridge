from django.db import models


class AiReview(models.Model):
    rev_id = models.AutoField(primary_key=True)
    summary = models.TextField()
    positive_ratio = models.FloatField(null=True, blank=True)
    negative_ratio = models.FloatField(null=True, blank=True)
    last_updated = models.DateTimeField(auto_now=True)
    er = models.OneToOneField('ErInfo', on_delete=models.CASCADE, null=True, blank=True)

    class Meta:
        db_table = 'ai_review'

    def __str__(self):
        return f'AI Review for {self.er_id}'
