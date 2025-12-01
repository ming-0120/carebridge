from django.urls import path
import apps.emr.views as views

urlpatterns = [
    path('', views.test, name='test')
]