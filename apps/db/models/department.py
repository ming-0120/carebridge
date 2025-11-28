from django.db import models


class Department(models.Model):
    dep_id = models.AutoField(primary_key=True)
    dep_name = models.CharField(max_length=255)
    dep_code = models.CharField(max_length=10)

    class Meta:
        db_table = 'department'

    def __str__(self):
        return self.dep_name
