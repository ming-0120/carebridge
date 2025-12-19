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


def debug_403(request):
    return custom_403(request, exception=Exception("debug_403"))


def debug_404(request):
    return custom_404(request, exception=Exception("debug_404"))


def debug_500(request):
    return custom_500(request)
