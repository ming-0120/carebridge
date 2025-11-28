from django.db import models


class DimDisease(models.Model):
    disease_code = models.CharField(max_length=50, primary_key=True)
    disease_name = models.CharField(max_length=100)
    icd_group_name = models.CharField(max_length=50, null=True, blank=True)
    ai_summary = models.TextField(null=True, blank=True)
    ai_updated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'dim_disease'

    def __str__(self):
        return f'{self.disease_code} - {self.disease_name}'
