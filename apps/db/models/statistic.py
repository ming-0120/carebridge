from django.db import models
from .choices import DIM_TYPE_CHOICES


class InfectiousStat(models.Model):
    infectious_id = models.AutoField(primary_key=True)
    disease_code = models.ForeignKey('DimDisease', on_delete=models.CASCADE)
    disease_name = models.CharField(max_length=100)
    stat_date = models.DateField()
    dim_type = models.CharField(max_length=10, choices=DIM_TYPE_CHOICES)
    dim_code = models.CharField(max_length=20)
    dim_label = models.CharField(max_length=50)
    result_val = models.IntegerField()
    ptnt_val = models.IntegerField(null=True, blank=True)
    dbtptnt_val = models.IntegerField(null=True, blank=True)
    holder_val = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'infectious_stat'

    def __str__(self):
        return f'{self.disease_name} - {self.stat_date} ({self.dim_type})'
