document.addEventListener("DOMContentLoaded", function() {
    const forms = document.querySelectorAll(".cancel-form");
    forms.forEach(function(form) {
        form.addEventListener("submit", function(e) {
            const ok = confirm("해당 예약을 취소하시겠습니까?");
            if (!ok) {
                e.preventDefault();
            }
        });
    });
});