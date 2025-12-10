const roleSwitch = document.getElementById("roleSwitch");
const doctorSection = document.getElementById("doctor_section");
const errBox = document.querySelector('.auth-messages');
document.addEventListener('DOMContentLoaded', function () {
  const link = document.getElementById('registerLink');
  const roleSwitch = document.getElementById('roleSwitch');

  if (!link || !roleSwitch) return;

  const baseHref = link.getAttribute('href');

  link.addEventListener('click', function (e) {
    e.preventDefault();

    const role = roleSwitch.checked ? 'DOCTOR' : 'PATIENT';

    const url = baseHref.split('?')[0] + '?role=' + encodeURIComponent(role);

    window.location.href = url;
  });
    const roleInput = document.getElementById("roleInput");
    const socialSection = document.getElementById("social_section");

    if (!roleSwitch || !roleInput || !socialSection) {
        return;
    }

    // 1) 서버에서 받은 role 값 기준으로 초기 상태 세팅
    let currentRole = (typeof initialRole === "string" ? initialRole : "PATIENT").toUpperCase();

    function applyRoleUI(role) {
        // hidden input 값 세팅 (서버로 나갈 값)
        roleInput.value = role;

        if (role === "DOCTOR") {
            roleSwitch.checked = true;
            socialSection.style.display = "none";   // 의사는 소셜 로그인 숨김
        } else {
            roleSwitch.checked = false;
            socialSection.style.display = "block";  // 환자는 소셜 로그인 보이기
        }
    }

    // 초기 1회 적용
    applyRoleUI(currentRole);

    // 2) 스위치 움직일 때마다 반영
    roleSwitch.addEventListener("change", () => {
      if(errBox)
        errBox.style.display = 'none';
      const newRole = roleSwitch.checked ? "DOCTOR" : "PATIENT";
      applyRoleUI(newRole);
    });
});