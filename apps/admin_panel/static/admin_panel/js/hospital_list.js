// 병원 목록 페이지 JavaScript
// 공통 함수는 admin_common.js를 참조하세요

function selectHospital(event, hospitalId) {
  selectItem(event, hospitalId, 'hospital_id');
}

// 테이블 행 클릭 이벤트 연결 (AJAX 페이지네이션 후 재연결용)
function attachTableRowListeners() {
  const hospitalRows = document.querySelectorAll('.user-row[data-hospital-id]');
  hospitalRows.forEach(row => {
    // 기존 이벤트 리스너 제거 후 새로 추가
    row.removeEventListener('click', row._clickHandler);
    const hospitalId = row.getAttribute('data-hospital-id');
    if (hospitalId) {
      row._clickHandler = function(e) {
        // 체크박스나 버튼 클릭이 아닌 경우에만 처리
        const target = e.target;
        if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.closest('input, button')) {
          return; // 체크박스나 버튼 클릭은 무시
        }
        
        // 이벤트 기본 동작 및 전파 방지
        e.preventDefault();
        e.stopPropagation();
        
        // 이벤트 객체를 selectHospital에 전달
        selectHospital(e, parseInt(hospitalId));
      };
      row.addEventListener('click', row._clickHandler);
    }
  });
}

// 정렬 링크 이벤트 연결
function attachSortListeners() {
  const sortLinks = document.querySelectorAll('a[data-sort-field]');
  sortLinks.forEach(link => {
    link.removeEventListener('click', link._sortHandler);
    link._sortHandler = function(e) {
      e.preventDefault();
      const sortField = link.getAttribute('data-sort-field');
      const currentSort = link.getAttribute('data-current-sort') || '';
      const currentOrder = link.getAttribute('data-current-order') || 'desc';
      handleSortClick(sortField, currentSort, currentOrder);
    };
    link.addEventListener('click', link._sortHandler);
  });
}

// 페이지 로드 시 이벤트 연결
document.addEventListener('DOMContentLoaded', function() {
  attachTableRowListeners();
  attachSortListeners();
  
  // 초기 선택된 병원 행에 selected 클래스 추가
  const urlParams = new URLSearchParams(window.location.search);
  const selectedHospitalId = urlParams.get('hospital_id');
  if (selectedHospitalId) {
    const selectedRow = document.querySelector(`[data-hospital-id="${selectedHospitalId}"]`);
    if (selectedRow) {
      selectedRow.classList.add('selected');
    }
  }
});



