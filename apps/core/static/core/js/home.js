// --------------------------------------
// 현재 위치를 받아 세션에 저장 (URL에는 추가하지 않음)
// --------------------------------------
function saveUserLocation() {
  if (!navigator.geolocation) {
    console.warn("이 브라우저는 위치 정보를 지원하지 않습니다.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      // 세션 스토리지에만 저장 (URL에는 추가하지 않음)
      sessionStorage.setItem("user_lat", lat);
      sessionStorage.setItem("user_lng", lng);

      console.log("위치 저장 완료:", lat, lng);
      
      // emergency 페이지인 경우 페이지 새로고침하여 위치 정보 반영
      if (window.location.pathname.includes('/emergency/')) {
        // URL 파라미터는 유지하면서 새로고침
        window.location.reload();
      }
    },
    (err) => {
      console.warn("위치정보 가져오기 실패:", err.message);
    }
  );
}

window.addEventListener("DOMContentLoaded", () => {
  const storedLat = sessionStorage.getItem("user_lat");
  const storedLng = sessionStorage.getItem("user_lng");

  // 기존 저장 값이 없으면 위치 요청하여 sessionStorage에만 저장
  if (!storedLat || !storedLng) {
    saveUserLocation();
  }
});
