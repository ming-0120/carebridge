document.getElementById("goStat").addEventListener("click", function() {
    window.location.href = "{% url 'infectious_stat' %}";
});