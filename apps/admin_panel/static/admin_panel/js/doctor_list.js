// 의사 목록 페이지 JavaScript
// 공통 함수는 admin_common.js를 참조하세요

function selectDoctor(doctorId) {
  selectItem(doctorId, 'doctor_id');
}

// 테이블 행 클릭 이벤트 연결 (AJAX 페이지네이션 후 재연결용)
function attachTableRowListeners() {
  const doctorRows = document.querySelectorAll('.doctor-row');
  doctorRows.forEach(row => {
    // 기존 이벤트 리스너 제거 후 새로 추가
    row.removeEventListener('click', row._clickHandler);
    const doctorId = row.getAttribute('onclick')?.match(/\d+/)?.[0];
    if (doctorId) {
      row._clickHandler = function() {
        selectDoctor(parseInt(doctorId));
      };
      row.addEventListener('click', row._clickHandler);
    }
  });
}

// 페이지 로드 시 이벤트 연결
document.addEventListener('DOMContentLoaded', function() {
  attachTableRowListeners();
});



