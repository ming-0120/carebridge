from django.db import models

class MedicalRecord(models.Model):
    medical_record_id = models.AutoField(primary_key=True)
    record_type = models.CharField(max_length=50)
    ptnt_div_cd = models.CharField(max_length=1)
    record_datetime = models.DateTimeField()
    record_content = models.TextField(null=True, blank=True)
    subjective = models.TextField(null=True, blank=True)
    objective = models.TextField(null=True, blank=True)
    assessment = models.TextField(null=True, blank=True)
    plan = models.TextField(null=True, blank=True)
    doctor_id = models.IntegerField()
    hos_id = models.IntegerField()
    user_id = models.IntegerField()

    class Meta:
        db_table = 'medical_record'


class MedicineOrders(models.Model):
    order_id = models.AutoField(primary_key=True)
    order_datetime = models.DateTimeField()
    start_datetime = models.DateTimeField(null=True, blank=True)
    stop_datetime = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    medical_record_id = models.IntegerField(unique=True)  # ★ 여기 수정 필수

    class Meta:
        db_table = 'medicine_orders'


class MedicineData(models.Model):
    md_id = models.AutoField(primary_key=True)
    order_code = models.CharField(max_length=50)
    order_name = models.CharField(max_length=50)
    dose = models.CharField(max_length=50)
    frequency = models.CharField(max_length=50)
    order_id = models.IntegerField()

    class Meta:
        db_table = 'medicine_data'

class MedicalNewsletter(models.Model):
    title = models.CharField(max_length=255)
    url = models.URLField()
    category = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    image_url = models.CharField(max_length=500, null=True, blank=True)

    def __str__(self):
        return self.title
