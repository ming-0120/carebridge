from django.shortcuts import render

def test(request):
    return render(request, 'emr/doctor_screen_dashboard.html')

