from django.db import models


class MedicineOrders(models.Model):
    order_id = models.AutoField(primary_key=True)
    order_datetime = models.DateTimeField(auto_now_add=True)
    start_datetime = models.DateTimeField(null=True, blank=True)
    stop_datetime = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)

    medical_record = models.OneToOneField('MedicalRecord', on_delete=models.CASCADE)

    class Meta:
        db_table = 'medicine_orders'

    def __str__(self):
        return f'MedOrder#{self.order_id}'


class MedicineData(models.Model):
    md_id = models.AutoField(primary_key=True)
    order_code = models.CharField(max_length=50)
    order_name = models.CharField(max_length=50)
    dose = models.CharField(max_length=50)
    frequency = models.CharField(max_length=50)

    order = models.ForeignKey('MedicineOrders', on_delete=models.CASCADE)

    class Meta:
        db_table = 'medicine_data'

    def __str__(self):
        return f'{self.order_name} ({self.dose}, {self.frequency})'
