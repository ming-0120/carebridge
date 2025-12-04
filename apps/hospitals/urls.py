# hospitals/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # 감염병
    path("infectious/", views.infectious_stat, name="infectious_stat"),
    path("hospitals/search/", views.hospital_search, name="hospital_search"),
]
