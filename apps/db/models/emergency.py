from django.db import models


class ErInfo(models.Model):
    er_id = models.AutoField(primary_key=True)
    hpid = models.CharField(max_length=20, unique=True)
    er_name = models.CharField(max_length=100)
    er_address = models.CharField(max_length=255)
    er_sido = models.CharField(max_length=30)
    er_sigungu = models.CharField(max_length=30)
    er_lat = models.FloatField(null=True, blank=True)
    er_lng = models.FloatField(null=True, blank=True)

    class Meta:
        db_table = 'er_info'

    def __str__(self):
        return self.er_name


class ErStatus(models.Model):
    status_id = models.AutoField(primary_key=True)
    er = models.ForeignKey('ErInfo', on_delete=models.CASCADE)
    hpid = models.CharField(max_length=20)
    hvdate = models.DateTimeField()
    update_at = models.DateTimeField(auto_now=True)

    er_general_available = models.IntegerField(null=True, blank=True)
    er_general_total = models.IntegerField(null=True, blank=True)
    er_child_available = models.IntegerField(null=True, blank=True)
    er_child_total = models.IntegerField(null=True, blank=True)
    birth_available = models.IntegerField(null=True, blank=True)
    birth_total = models.IntegerField(null=True, blank=True)
    negative_pressure_available = models.IntegerField(null=True, blank=True)
    negative_pressure_total = models.IntegerField(null=True, blank=True)
    isolation_available = models.IntegerField(null=True, blank=True)
    isolation_total = models.IntegerField(null=True, blank=True)
    cohort_available = models.IntegerField(null=True, blank=True)
    cohort_total = models.IntegerField(null=True, blank=True)
    has_ct = models.BooleanField(null=True)
    has_mri = models.BooleanField(null=True)
    has_ventilator = models.BooleanField(null=True)
    has_angio = models.BooleanField(null=True)

    class Meta:
        db_table = 'er_status'

    def __str__(self):
        return f'{self.er} @ {self.hvdate}'


class ErMessage(models.Model):
    msg_id = models.AutoField(primary_key=True)
    status = models.ForeignKey('ErStatus', on_delete=models.CASCADE)
    # ENUM('MKioskTy1','MKioskTy2',...,'MKioskTy7')
    type_code = models.CharField(max_length=20, null=True, blank=True)
    message = models.TextField(null=True, blank=True)
    updated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'er_message'

    def __str__(self):
        return f'{self.type_code} - {self.status_id}'


class ErStatusStaging(models.Model):
    hos_id = models.CharField(max_length=20)
    hvdate = models.DateTimeField(null=True, blank=True)
    hv31 = models.IntegerField()
    hv36 = models.IntegerField(null=True, blank=True)
    hv7 = models.IntegerField(null=True, blank=True)
    hv5 = models.IntegerField(null=True, blank=True)
    hv11 = models.IntegerField(null=True, blank=True)
    hv10 = models.IntegerField(null=True, blank=True)
    hvs03 = models.IntegerField(null=True, blank=True)
    hvs04 = models.IntegerField(null=True, blank=True)
    hvs05 = models.IntegerField(null=True, blank=True)
    hvs06 = models.IntegerField(null=True, blank=True)
    hvs07 = models.IntegerField(null=True, blank=True)
    hwventisoayn = models.BooleanField(null=True)
    hwventiayn = models.BooleanField(null=True)
    hvctayn = models.BooleanField(null=True)
    hvmriayn = models.BooleanField(null=True)
    hvangioayn = models.BooleanField(null=True)
    has_ventilator = models.BooleanField(null=True)

    class Meta:
        db_table = 'er_status_staging'
        unique_together = ('hos_id', 'hvdate')

    def __str__(self):
        return f'{self.hos_id} @ {self.hvdate}'
