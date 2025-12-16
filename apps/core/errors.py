from django.shortcuts import render


def custom_403(request, exception, template_name="errors/403.html"):
    """Render the custom 403 page."""
    return render(request, template_name, status=403)


def custom_404(request, exception, template_name="errors/404.html"):
    """Render the custom 404 page."""
    return render(request, template_name, status=404)


def custom_500(request, template_name="errors/500.html"):
    """Render the custom 500 page."""
    return render(request, template_name, status=500)
