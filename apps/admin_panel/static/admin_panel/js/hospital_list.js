// 병원 목록 페이지 JavaScript
// 공통 함수는 admin_common.js를 참조하세요

/**
 * 병원 선택 함수
 * 
 * 목적: 병원 목록에서 특정 병원을 선택하고 상세 정보를 표시
 */
function selectHospital(event, hospitalId) {
  selectItem(event, hospitalId, 'hospital_id');
}

// 테이블 행 클릭 이벤트 연결은 admin_common.js의 attachTableRowListeners 함수 사용
// 정렬 링크 이벤트 연결은 admin_common.js의 attachSortListeners 함수 사용

/**
 * 페이지 로드 시 초기화 함수
 */
document.addEventListener('DOMContentLoaded', function() {
  // 공통 함수 사용
  attachTableRowListeners('.hospital-row[data-hospital-id]', 'data-hospital-id', selectHospital);
  
  // ========= 페이지네이션 후 이벤트 리스너 재연결 함수 =========
  // 목적: 페이지네이션 완료 후 테이블 행 클릭 이벤트 리스너를 다시 연결
  //   - handlePaginationAjax 함수에서 호출됨
  //   - 페이지네이션으로 새로운 HTML이 추가되면 기존 이벤트 리스너가 사라지므로 다시 연결 필요
  window.reattachTableRowListeners = function() {
    attachTableRowListeners('.hospital-row[data-hospital-id]', 'data-hospital-id', selectHospital);
  };
  
  attachSortListeners();
  
  // URL 파라미터에서 선택된 병원 ID 확인
  const urlParams = new URLSearchParams(window.location.search);
  const selectedHospitalId = urlParams.get('hospital_id');
  
  // 선택된 병원 행에 'selected' 클래스 추가
  if (selectedHospitalId) {
    const selectedRow = document.querySelector(`[data-hospital-id="${selectedHospitalId}"]`);
    if (selectedRow) {
      selectedRow.classList.add('selected');
    }
  }
  
  // 검색조건 변경 시 검색어 초기화
  const searchTypeSelect = document.querySelector('select[name="search_type"]');
  if (searchTypeSelect) {
    searchTypeSelect.addEventListener('change', function() {
      const searchKeywordInput = document.querySelector('input[name="search_keyword"]');
      if (searchKeywordInput) {
        searchKeywordInput.value = '';
      }
      
      // 검색조건이 "검색조건" (빈 값)인 경우 전체 목록으로 이동
      if (!this.value || this.value === '') {
        window.location.href = window.location.pathname;
      }
    });
  }
});
