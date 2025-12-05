from django.db import models


# ==========================================
# 1. 병원 기본 정보
# ==========================================
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
        db_table = "er_info"

    def __str__(self):
        return self.er_name



# ==========================================
# 2. 실시간 응급실 상태 (메인 테이블)
# ==========================================
class ErStatus(models.Model):
    er = models.ForeignKey(ErInfo, on_delete=models.CASCADE, related_name="statuses")

    hvdate = models.DateTimeField(null=True)

    # ---- 일반 응급실 ----
    er_general_available = models.IntegerField(null=True)
    er_general_total = models.IntegerField(null=True)

    # ---- 소아 응급실 ----
    er_child_available = models.IntegerField(null=True)
    er_child_total = models.IntegerField(null=True)

    # ---- 분만실 ----
    birth_available = models.IntegerField(null=True)
    birth_total = models.IntegerField(null=True)

    # ---- 음압 격리 ----
    negative_pressure_available = models.IntegerField(null=True)
    negative_pressure_total = models.IntegerField(null=True)

    # ---- 일반 격리 ----
    isolation_general_available = models.IntegerField(null=True)
    isolation_general_total = models.IntegerField(null=True)

    # ---- 코호트 격리 ----
    isolation_cohort_available = models.IntegerField(null=True)
    isolation_cohort_total = models.IntegerField(null=True)

    # ---- 장비 여부 ----
    has_ct = models.BooleanField(null=True)
    has_mri = models.BooleanField(null=True)
    has_angio = models.BooleanField(null=True)
    has_ventilator = models.BooleanField(null=True)

    class Meta:
        db_table = "er_status"
        unique_together = ("er", "hvdate")

    def __str__(self):
        return f"{self.er.er_name} @ {self.hvdate}"



# ==========================================
# 3. 응급실 메시지 (선택사항)
# ==========================================
class ErMessage(models.Model):
    msg_id = models.AutoField(primary_key=True)
    status = models.ForeignKey('ErStatus', on_delete=models.CASCADE)
    # ENUM('MKioskTy1','MKioskTy2',...,'MKioskTy7')
    type_code = models.CharField(max_length=20, null=True, blank=True)
    message = models.TextField(null=True, blank=True)
    updated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "er_message"

    def __str__(self):
        return f"{self.type_code} - {self.status_id}"



# ==========================================
# 4. Staging 테이블 (API 로우 데이터 저장)
# ==========================================
class ErStatusStaging(models.Model):
    hospital = models.ForeignKey(
        ErInfo, to_field="hpid", db_column="hpid", on_delete=models.CASCADE)
    hvdate = models.DateTimeField(null=True)

    # 일반 응급실
    hv31 = models.IntegerField(null=True)   # available
    hvs03 = models.IntegerField(null=True)  # total

    # 소아 응급실
    hv36 = models.IntegerField(null=True)   # available
    hvs04 = models.IntegerField(null=True)  # total

    # 분만실
    hv7 = models.IntegerField(null=True)
    hvs05 = models.IntegerField(null=True)

    # 음압 격리
    hv11 = models.IntegerField(null=True)
    hvs06 = models.IntegerField(null=True)

    # 코호트 격리
    hv5 = models.IntegerField(null=True)
    hvs38 = models.IntegerField(null=True)

    # 장비 여부
    hvctayn = models.CharField(max_length=10, null=True, blank=True)
    hvmriayn = models.CharField(max_length=10, null=True, blank=True)
    hvangioayn = models.CharField(max_length=10, null=True, blank=True)
    hvventiayn = models.CharField(max_length=10, null=True, blank=True)

    class Meta:
        db_table = "er_status_staging"
        unique_together = ("hospital", "hvdate")

    def __str__(self):
        return f"{self.hospital.hpid} @ {self.hvdate}"