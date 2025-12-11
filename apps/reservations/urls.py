# apps/reservations/urls.py  또는 reservations/urls.py
from django.urls import path
from . import views


urlpatterns = [
    path("main/", views.main_view, name="reservation_main"),
    path("", views.reservation_page, name="reservation_page"),
    path("submit/", views.reserve_submit, name="reserve_submit"),
    path("confirm/", views.reservation_confirm, name="reservation_confirm"),
    path("api/doctor-reservations/", views.doctor_reservations_api, name="doctor_reservations_api"),
    path("favorite/toggle/", views.toggle_favorite, name="toggle_favorite"),
    path("api/doctor-slots/", views.doctor_slots_api, name="doctor_slots_api"),
]