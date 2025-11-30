# hospitals/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path("infectious/", views.infectious_stat, name="infectious_stat"),
]
