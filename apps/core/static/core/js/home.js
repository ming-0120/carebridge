// --------------------------------------
// 현재 위치를 받아 세션에 저장 + URL에 lat/lng 반영
// --------------------------------------
function updateUrlWithLocation(lat, lng) {
  try {
    if (!lat || !lng) return;

    const url = new URL(window.location.href);
    const currentLat = url.searchParams.get("lat");
    const currentLng = url.searchParams.get("lng");

    // 이미 같은 값이 들어있으면 다시 리다이렉트하지 않음
    if (currentLat === String(lat) && currentLng === String(lng)) {
      return;
    }

    url.searchParams.set("lat", lat);
    url.searchParams.set("lng", lng);

    // lat/lng를 포함한 URL로 이동
    window.location.href = url.toString();
  } catch (e) {
    console.warn("URL 업데이트 중 오류:", e);
  }
}

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

  // 기존 저장 값이 없으면 위치 요청
  if (!storedLat || !storedLng) {
    saveUserLocation();
  }
});
