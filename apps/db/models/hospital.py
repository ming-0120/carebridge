from django.db import models


class Hospital(models.Model):
    hos_id = models.AutoField(primary_key=True)  # 그대로 유지

    hpid = models.CharField(max_length=400, unique=True)  # 길이만 400으로 늘림
    name = models.CharField(max_length=100)
    address = models.CharField(max_length=255)
    lat = models.FloatField(null=True, blank=True)
    lng = models.FloatField(null=True, blank=True)
    rating = models.PositiveSmallIntegerField(null=True, blank=True)  # null 허용으로 변경
    created_at = models.DateTimeField(auto_now_add=True)
    hos_name = models.CharField(max_length=50)
    hos_password = models.CharField(max_length=255)

    tel = models.CharField(max_length=50, null=True, blank=True)              # telno
    category = models.CharField(max_length=20, null=True, blank=True)         # clCd
    category_name = models.CharField(max_length=150, null=True, blank=True)   # clCdNm
    homepage = models.CharField(max_length=255, null=True, blank=True)        # hospUrl
    estb_date = models.CharField(max_length=20, null=True, blank=True)        # estbDd
    sido = models.CharField(max_length=6, null=True, blank=True)              # sidoCd
    sggu = models.CharField(max_length=20, null=True, blank=True)             # sgguCdNm (구 이름)
    dr_total = models.IntegerField(null=True, blank=True)                     # drTotCnt

    class Meta:
        db_table = "hospital" 

    def __str__(self):
        return self.name
