# newsletter/models.py
from django.db import models


class MedicalNewsletter(models.Model):
    title = models.CharField(max_length=255)      # 기사 제목
    published_at = models.DateTimeField()        # 2025-12-02 11:10:28
    category = models.CharField(
        max_length=50,
        blank=True,
    )                                            # 중소병원 / 개원가 등
    summary = models.TextField(blank=True)       # 목록의 요약(list_txt)
    body = models.TextField(blank=True)          # 상세 본문
    url = models.URLField(unique=True)           # 상세 페이지 URL (중복 방지)
    created_at = models.DateTimeField(auto_now_add=True)  # 레코드 생성 시점
    updated_at = models.DateTimeField(auto_now=True)      # 레코드 수정 시점
    image_url = models.URLField(max_length=500, blank=True, null=True, verbose_name="이미지 URL")
    class Meta:
        db_table = "medical_newsletter"   # ← 여기!! 원하는 테이블명 지정

    def __str__(self):
        return self.title
