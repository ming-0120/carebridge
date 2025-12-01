// 의사 목록 페이지 JavaScript

function selectDoctor(doctorId) {
  const url = new URL(window.location.href);
  url.searchParams.set('doctor_id', doctorId);
  window.location.href = url.toString();
}


