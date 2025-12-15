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
    // 정렬 링크 이벤트 리스너 재연결
    attachSortListeners();
    // 중복 호출 방지: attachPaginationListeners는 admin_common.js의 handlePaginationAjax에서 이미 호출됨
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
  
  // ========= 병원추가 모달 관련 함수 =========
  
  /**
   * 모달 열기 함수
   * 
   * 목적: 병원추가 모달을 표시
   */
  function openAddHospitalModal() {
    const modal = document.getElementById('addHospitalModal');
    if (modal) {
      modal.classList.add('show');
      // 모달이 열릴 때 body 스크롤 방지
      document.body.style.overflow = 'hidden';
    }
  }
  
  /**
   * 모달 닫기 함수
   * 
   * 목적: 병원추가 모달을 숨김
   */
  function closeAddHospitalModal() {
    const modal = document.getElementById('addHospitalModal');
    if (modal) {
      modal.classList.remove('show');
      // 모달이 닫힐 때 body 스크롤 복원
      document.body.style.overflow = '';
      // 폼 초기화
      const form = document.getElementById('addHospitalForm');
      if (form) {
        form.reset();
      }
    }
  }
  
  // 병원추가 버튼 클릭 이벤트
  const openAddHospitalBtn = document.getElementById('openAddHospitalModal');
  if (openAddHospitalBtn) {
    openAddHospitalBtn.addEventListener('click', function(e) {
      e.preventDefault();
      openAddHospitalModal();
    });
  }
  
  // 모달 닫기 버튼 클릭 이벤트
  const closeAddHospitalBtn = document.getElementById('closeAddHospitalModal');
  if (closeAddHospitalBtn) {
    closeAddHospitalBtn.addEventListener('click', function(e) {
      e.preventDefault();
      closeAddHospitalModal();
    });
  }
  
  // 취소 버튼 클릭 이벤트
  const cancelAddHospitalBtn = document.getElementById('cancelAddHospital');
  if (cancelAddHospitalBtn) {
    cancelAddHospitalBtn.addEventListener('click', function(e) {
      e.preventDefault();
      closeAddHospitalModal();
    });
  }
  
  // 모달 배경 클릭 시 닫기
  const modal = document.getElementById('addHospitalModal');
  if (modal) {
    modal.addEventListener('click', function(e) {
      // 모달 배경(modal)을 클릭했을 때만 닫기
      if (e.target === modal) {
        closeAddHospitalModal();
      }
    });
  }
  
  // ESC 키로 모달 닫기
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      const modal = document.getElementById('addHospitalModal');
      if (modal && modal.classList.contains('show')) {
        closeAddHospitalModal();
      }
    }
  });
  
  // 폼 제출 이벤트 (AJAX 처리)
  const addHospitalForm = document.getElementById('addHospitalForm');
  if (addHospitalForm) {
    addHospitalForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // 폼 데이터 수집
      const formData = new FormData(addHospitalForm);
      
      // AJAX 요청
      fetch(addHospitalForm.action, {
        method: 'POST',
        body: formData,
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      })
      .then(response => {
        if (response.ok) {
          return response.json();
        }
        throw new Error('Network response was not ok');
      })
      .then(data => {
        if (data.success) {
          // 성공 시 모달 닫기 및 페이지 새로고침
          closeAddHospitalModal();
          window.location.reload();
        } else {
          // 실패 시 에러 메시지 표시
          alert(data.message || '병원 추가에 실패했습니다.');
        }
      })
      .catch(error => {
        console.error('Error:', error);
        alert('병원 추가 중 오류가 발생했습니다.');
      });
    });
  }
});
