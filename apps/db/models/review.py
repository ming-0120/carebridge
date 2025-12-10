from django.db import models


class RawReview(models.Model):
    review_id = models.AutoField(primary_key=True)
    er = models.ForeignKey('ErInfo', on_delete=models.CASCADE, related_name='raw_reviews')
    # on_delete=models.CASCADE => 병원이 삭제되면 해당 리뷰들도 자동 삭제

    review_text = models.TextField() # 리뷰의 본문 텍스트
    review_time = models.DateTimeField(null=True, blank=True) # 리뷰 작성 날짜/시간 => 최신성 평가

    unique_hash = models.CharField(max_length=255, unique=True) # 리뷰 중복 방지용 필드

    class Meta:
        db_table = 'raw_review'

    def __str__(self):
        return f'Review for {self.er.er_name}'


class AiReview(models.Model):
    rev_id = models.AutoField(primary_key=True)

    summary = models.TextField() # 해당 병원 리뷰 전체에 대한 AI 요약
    positive_ratio = models.FloatField(null=True, blank=True) # 긍정 리뷰 비율
    negative_ratio = models.FloatField(null=True, blank=True) # 부정 리뷰 비율
 
    last_updated = models.DateTimeField(auto_now=True) # 요약이 언제 최신화되었는지 확인

    er = models.OneToOneField('ErInfo', on_delete=models.CASCADE, null=True, blank=True)

    class Meta:
        db_table = 'ai_review'

    def __str__(self):
        return f'AI Review for {self.er.er_name}'

