// ===== 공통 util =====
function qs(selector) { return document.querySelector(selector); }
function qsa(selector) { return document.querySelectorAll(selector); }

// ===============================
// GPS 호출 + URL 파라미터 전달
// ===============================
function requestUserLocation() {
  if (!navigator.geolocation) {
    alert("위치 정보를 지원하지 않습니다.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      console.log("현재 위치:", lat, lng);

      const url = new URL(window.location.href);
      url.searchParams.set("lat", lat.toString());
      url.searchParams.set("lng", lng.toString());
      url.searchParams.set("range", "30");   // 30km 범위 표시용

      window.location.href = url.toString();
    },
    (err) => {
      console.error("위치 획득 실패:", err.code, err.message);
      alert("GPS 실패 코드: " + err.code + "\n메시지: " + err.message);
    },
    {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 0
    }
  );
}

// ===============================
// 지역 초기화 → 위치 기반 조회
// ===============================
function resetRegion() {
  const url = new URL(window.location.href);

  url.searchParams.delete("sido");
  url.searchParams.delete("sigungu");

  // GPS 기능 비활성화
  // requestUserLocation();

  window.location.href = url.toString();
}

// ===============================
// ESC 처리 (지역: 닫기 / 필터: 초기화 + 닫기)
// ===============================
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;

  const regionModal = qs('#region-modal');
  const filterModal = qs('#filter-modal');

  if (regionModal && !regionModal.classList.contains('hidden')) {
    // region_modal.js에 정의된 함수
    closeRegionModal();
    return;
  }

  if (filterModal && !filterModal.classList.contains('hidden')) {
    // filter_modal.js에 정의된 함수들
    resetFilter();
    closeFilterModal();
  }
});

// ===============================
// (선택) 페이지 첫 진입 시 위치 없으면 GPS 요청
// ===============================
// document.addEventListener('DOMContentLoaded', () => {
//   const params = new URLSearchParams(window.location.search);
//   const hasLat = params.get('lat');
//   const hasLng = params.get('lng');

//   if (!hasLat && !hasLng) {
//     console.log("GPS 요청 시작");
//     requestUserLocation();
//   }
// });