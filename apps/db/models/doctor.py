from django.db import models


class Doctors(models.Model):
    doctor_id = models.AutoField(primary_key=True)
    license_no = models.CharField(max_length=50)
    verified = models.BooleanField()
    memo = models.TextField(null=True, blank=True)
    profil_url = models.CharField(max_length=255, null=True, blank=True)

    hos = models.ForeignKey('Hospital', on_delete=models.CASCADE)
    user = models.OneToOneField('Users', on_delete=models.CASCADE)
    dep = models.ForeignKey('Department', on_delete=models.CASCADE)

    class Meta:
        db_table = 'doctors'

    def __str__(self):
        return f'{self.user.name} ({self.license_no})'
