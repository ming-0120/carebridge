# apps/newsletter/views.py

from django.shortcuts import render
from apps.db.models.medical_newsletter import MedicalNewsletter


def newsletter_list(request):
    items = (
        MedicalNewsletter.objects
        .order_by("-published_at")[:15]   # 최신 30개
    )
    return render(request, "newsletter/list.html", {"items": items})
