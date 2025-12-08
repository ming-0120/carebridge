# apps/chatbot/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path("symptom/", views.symptom_chat, name="symptom_chat"),
]
