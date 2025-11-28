from django.db import models
from .choices import PTNT_DIV_CHOICES


class MedicalRecord(models.Model):
    medical_record_id = models.AutoField(primary_key=True)
    record_type = models.CharField(max_length=50)
    ptnt_div_cd = models.CharField(max_length=1, choices=PTNT_DIV_CHOICES)
    record_datetime = models.DateTimeField()
    record_content = models.TextField(null=True, blank=True)
    subjective = models.TextField(null=True, blank=True)
    objective = models.TextField(null=True, blank=True)
    assessment = models.TextField(null=True, blank=True)
    plan = models.TextField(null=True, blank=True)

    doctor = models.ForeignKey('Doctors', on_delete=models.CASCADE)
    user = models.ForeignKey('Users', on_delete=models.CASCADE)
    hos = models.ForeignKey('Hospital', on_delete=models.CASCADE)

    class Meta:
        db_table = 'medical_record'

    def __str__(self):
        return f'MR#{self.medical_record_id} ({self.record_datetime})'
