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
  // 기존 저장 값이 없으면 위치 요청
  if (!sessionStorage.getItem("user_lat")) {
    saveUserLocation();
  }
});
