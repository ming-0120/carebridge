from django.urls import path
from . import views

urlpatterns = [
    path('', views.emergency_main, name='emergency_main'),
    path('detail/<int:er_id>/', views.hospital_detail_json, name='hospital_detail'),
    path('get_sigungu/', views.get_sigungu, name='get_sigungu'),
    path('update_preferences/', views.update_preferences, name='update_preferences'),
    path('toggle_favorite/', views.toggle_er_favorite, name='toggle_er_favorite'),
]


