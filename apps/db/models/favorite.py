from django.db import models


class UserFavorite(models.Model):
    fav_id = models.AutoField(primary_key=True)
    memo = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    er = models.ForeignKey('ErInfo', on_delete=models.CASCADE, null=True, blank=True)
    hos = models.ForeignKey('Hospital', on_delete=models.CASCADE, null=True, blank=True)
    user = models.ForeignKey('Users', on_delete=models.CASCADE)

    class Meta:
        db_table = 'user_favorite'

    def __str__(self):
        return f'Fav#{self.fav_id} - user {self.user_id}'
