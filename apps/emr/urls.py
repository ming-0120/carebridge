from django.urls import path
import views

urlpatterns = [
    path('', home, name='home')
]