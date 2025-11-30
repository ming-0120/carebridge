# hospitals/views.py
from django.shortcuts import render
from apps.db.models.statistic import InfectiousStat

def infectious_stat(request):
    data = InfectiousStat.objects.filter()
    return render(data, "hospitals/infectious_stat.html")

