const roleSwitch = document.getElementById("roleSwitch");
const roleInput = document.getElementById("roleInput");

if (roleSwitch && roleInput) {
    roleInput.value = "patient";

    roleSwitch.addEventListener("change", () => {
        const role = roleSwitch.checked ? "doctor" : "patient";
        if(role == 'doctor')
          document.getElementById("social_section").style.display = 'none'
        else
          document.getElementById("social_section").style.display = 'block'       
        roleInput.value = role;
    });
}
document.addEventListener('DOMContentLoaded', function () {
  const link = document.getElementById('registerLink');
  const roleSwitch = document.getElementById('roleSwitch');

  if (!link || !roleSwitch) return;

  const baseHref = link.getAttribute('href');

  link.addEventListener('click', function (e) {
    e.preventDefault();

    const role = roleSwitch.checked ? 'doctor' : 'patient';

    const url = baseHref.split('?')[0] + '?role=' + encodeURIComponent(role);

    window.location.href = url;
  });
});