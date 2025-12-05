from django.db import models
from .choices import TREATMENT_STATUS_CHOICES


class TreatmentProcedures(models.Model):
    treatment_id = models.AutoField(primary_key=True)
    procedure_code = models.CharField(max_length=50, null=True, blank=True)
    procedure_name = models.CharField(max_length=255, null=True, blank=True)
    execution_datetime = models.DateTimeField(null=True, blank=True)
    completion_datetime = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=TREATMENT_STATUS_CHOICES, default='Pending')
    treatment_site = models.CharField(max_length=100, null=True, blank=True)
    result_notes = models.TextField(null=True, blank=True)

    medical_record = models.OneToOneField('MedicalRecord', on_delete=models.CASCADE)

    class Meta:
        db_table = 'treatment_procedures'

    def __str__(self):
        return f'Treatment#{self.treatment_id}'
