# apps/accounts/urls.py
from django.urls import path
from .views import reservation_list, reservation_cancel, my_qna_list, profile_edit, favorite_hospitals, update_favorite_memo,delete_favorite, account_withdraw


urlpatterns = [
    path("reservations/", reservation_list, name="reservation_list"),
    path("reservations/<int:pk>/cancel/", reservation_cancel, name="reservation_cancel"),
    path("qna/", my_qna_list, name="my_qna_list"),
    path("profile/", profile_edit, name="profile_edit"),
    path("hospitals/", favorite_hospitals, name="favorite_hospitals"),
    path(
        "<int:fav_id>/memo/",
        update_favorite_memo,
        name="update_favorite_memo",
    ),
    path("<int:fav_id>/delete/", delete_favorite, name="delete_favorite"),
    path("withdraw/", account_withdraw, name="account_withdraw"),
]

