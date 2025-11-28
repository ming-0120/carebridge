from django.db import models
from .choices import SLOT_STATUS_CHOICES


class TimeSlots(models.Model):
    slot_id = models.AutoField(primary_key=True)
    slot_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    status = models.CharField(
        max_length=10,
        choices=SLOT_STATUS_CHOICES,
        default='OPEN',
        null=True,
        blank=True,
    )
    capacity = models.IntegerField(default=1, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)

    doctor = models.ForeignKey('Doctors', on_delete=models.CASCADE)

    class Meta:
        db_table = 'time_slots'

    def __str__(self):
        return f'{self.slot_date} {self.start_time}-{self.end_time} ({self.doctor_id})'


class Reservations(models.Model):
    reservation_id = models.AutoField(primary_key=True)
    reserved_at = models.DateTimeField()
    reserved_end = models.DateTimeField()
    slot_type = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    notes = models.TextField(null=True, blank=True)

    user = models.ForeignKey('Users', on_delete=models.CASCADE)
    slot = models.ForeignKey('TimeSlots', on_delete=models.CASCADE)

    class Meta:
        db_table = 'reservations'

    def __str__(self):
        return f'Reservation#{self.reservation_id}'
