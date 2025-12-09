from django.db import models
from .choices import LAB_STATUS_CHOICES


class LabData(models.Model):
    lab_id = models.AutoField(primary_key=True)
    lab_code = models.CharField(max_length=20)
    lab_name = models.CharField(max_length=50)

    class Meta:
        db_table = 'lab_data'

    def __str__(self):
        return f'{self.lab_code} - {self.lab_name}'


class LabOrders(models.Model):
    lab_order_id = models.AutoField(primary_key=True)
    order_datetime = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=LAB_STATUS_CHOICES, default='Pending')
    status_datetime = models.DateTimeField(null=True, blank=True)
    requisition_note = models.TextField(null=True, blank=True)
    is_urgent = models.BooleanField()
    lab_cd = models.CharField(max_length=10, null=True, blank=True)
    lab_nm = models.CharField(max_length=100, null=True, blank=True)
    specimen_cd = models.CharField(max_length=10, null=True, blank=True)

    medical_record = models.OneToOneField('MedicalRecord', on_delete=models.CASCADE)

    class Meta:
        db_table = 'lab_orders'

    def __str__(self):
        return f'LabOrder#{self.lab_order_id}'


class LabUpload(models.Model):
    lab_upload_id = models.AutoField(primary_key=True)
    uploadedFile = models.FileField(upload_to="lab/")
    original_name = models.CharField(max_length=255)
    datetimeOfUpload = models.DateTimeField(auto_now_add=True)
    lab_order = models.ForeignKey('LabOrders', on_delete=models.CASCADE)

    class Meta:
        db_table = 'lab_upload'

    def __str__(self):
        return self.original_name
