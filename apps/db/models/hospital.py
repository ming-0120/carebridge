from django.db import models


class Hospital(models.Model):
    hos_id = models.AutoField(primary_key=True)
    hpid = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=100)
    address = models.CharField(max_length=255)
    lat = models.FloatField(null=True, blank=True)
    lng = models.FloatField(null=True, blank=True)
    rating = models.PositiveSmallIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    hos_name = models.CharField(max_length=50)
    hos_password = models.CharField(max_length=255)

    class Meta:
        db_table = 'hospital'

    def __str__(self):
        return self.name
