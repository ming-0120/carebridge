// --------------------------------------
// 현재 위치를 받아 세션에 저장 (URL 수정 없음)
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

      // 세션 스토리지 저장
      sessionStorage.setItem("user_lat", lat);
      sessionStorage.setItem("user_lng", lng);

      console.log("위치 저장 완료:", lat, lng);
    },
    (err) => {
      console.warn("위치정보 가져오기 실패:", err.message);
    }
  );
}

window.addEventListener("DOMContentLoaded", () => {
  const storedLat = sessionStorage.getItem("user_lat");
  const storedLng = sessionStorage.getItem("user_lng");

  // 기존 저장된 위치가 없으면 처음 한 번만 요청
  if (!storedLat || !storedLng) {
    saveUserLocation();
  }
});
