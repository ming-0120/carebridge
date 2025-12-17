from django.db import models


class MedicalRecordReservationMap(models.Model):
    reservation = models.OneToOneField(
        "Reservations",
        on_delete=models.CASCADE,
        primary_key=True,
    )
    medical_record = models.OneToOneField(
        "MedicalRecord",
        on_delete=models.CASCADE,
    )
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)

    class Meta:
        db_table = "medical_record_reservation_map"

    def __str__(self) -> str:
        return f"MRMap(reservation={self.reservation_id}, mr={self.medical_record_id})"

