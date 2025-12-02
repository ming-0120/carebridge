# apps/newsletter/urls.py

from django.urls import path
from .views import newsletter_list

urlpatterns = [
    path("newsletter/", newsletter_list, name="newsletter_list"),
]
