from django.db import models


class DailyVisit(models.Model):
    visit_date = models.DateField(primary_key=True)
    visit_count = models.IntegerField(default=0)

    class Meta:
        db_table = 'daily_visit'

    def __str__(self):
        return f'{self.visit_date}: {self.visit_count}'
