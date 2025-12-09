  document.addEventListener("DOMContentLoaded", function () {
    var header = document.querySelector(".header");
    var toggle = document.querySelector(".menu-toggle");

    if (!header || !toggle) return;

    toggle.addEventListener("click", function () {
      header.classList.toggle("menu-open");
    });
  });

  // 카카오 로그인 팝업 열기
function openKakaoLogin() {
  const url = KAKAO_LOGIN_URL;  // 템플릿에서 주입 (아래 참고)
  const name = "kakao_login_popup";
  const options = "width=480,height=640,scrollbars=yes,resizable=yes";

  const popup = window.open(url, name, options);
  if (!popup || popup.closed || typeof popup.closed === "undefined") {
    alert("팝업이 차단되었습니다. 팝업 허용 후 다시 시도해주세요.");
  }
}

// 카카오 로그인 성공 메시지 수신 → 페이지 새로고침
window.addEventListener("message", function (event) {
  // 필요하면 origin 체크 가능: if (event.origin !== "http://127.0.0.1:8000") return;
  if (!event.data || typeof event.data !== "object") return;

  if (event.data.type === "kakao-login-success") {
    window.location.reload();
  }
});
