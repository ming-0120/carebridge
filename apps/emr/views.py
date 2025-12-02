from django.shortcuts import render

def doctor_screen_dashboard(request):
    return render(request, 'emr/doctor_screen_dashboard.html')
def hospital_staff_dashboard(request):
    return render(request, 'emr/hospital_staff_dashboard.html')
def lab_record_creation(request):
    return render(request, 'emr/lab_record_creation.html')
def medical_record_creation(request):
    return render(request, 'emr/medical_record_creation.html')
def medical_record_inquiry(request):
    return render(request, 'emr/medical_record_inquiry.html')
def patient_search_list(request):
    return render(request, 'emr/patient_search_list.html')
def today_patient_list(request):
    return render(request, 'emr/today_patient_list.html')
def treatment_record_verification(request):
    return render(request, 'emr/treatment_record_verification.html')
def view_previous_medical_records(request):
    return render(request, 'emr/view_previous_medical_records.html')

