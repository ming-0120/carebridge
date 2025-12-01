# hospitals/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('', views.emergency_main, name='emergency_main'),
    path("infectious/", views.infectious_stat, name="infectious_stat"),
]
