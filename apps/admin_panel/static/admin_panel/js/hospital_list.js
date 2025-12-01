// 병원 목록 페이지 JavaScript

function selectHospital(hospitalId) {
  const url = new URL(window.location.href);
  url.searchParams.set('hospital_id', hospitalId);
  window.location.href = url.toString();
}


