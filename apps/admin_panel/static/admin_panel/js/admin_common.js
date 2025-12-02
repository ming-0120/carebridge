// ========= 관리자 페이지 공통 JavaScript =========

/**
 * URL 파라미터를 유지하면서 페이지 이동
 */
function navigateWithParams(url, params) {
  const urlObj = new URL(url, window.location.origin);
  Object.keys(params).forEach(key => {
    if (params[key]) {
      urlObj.searchParams.set(key, params[key]);
    } else {
      urlObj.searchParams.delete(key);
    }
  });
  window.location.href = urlObj.toString();
}

/**
 * 선택된 항목의 ID를 URL 파라미터로 설정하고 페이지 이동
 */
function selectItem(itemId, paramName = 'id') {
  const url = new URL(window.location.href);
  url.searchParams.set(paramName, itemId);
  // 페이지 파라미터 제거 (선택 시 첫 페이지로)
  url.searchParams.delete('page');
  window.location.href = url.toString();
}

/**
 * 체크박스 전체 선택/해제
 */
function toggleSelectAll(selectAllId, checkboxName) {
  const selectAllCheckbox = document.getElementById(selectAllId);
  const checkboxes = document.querySelectorAll(`input[name="${checkboxName}"]`);
  
  checkboxes.forEach(checkbox => {
    checkbox.checked = selectAllCheckbox.checked;
  });
  
  if (typeof updateSelectedItems === 'function') {
    updateSelectedItems();
  }
}

/**
 * 선택된 항목 ID 목록 반환
 */
function getSelectedItemIds(checkboxName) {
  const checkboxes = document.querySelectorAll(`input[name="${checkboxName}"]:checked`);
  return Array.from(checkboxes).map(cb => cb.value);
}

/**
 * 페이지네이션 링크 생성 (검색 파라미터 유지)
 */
function getPaginationUrl(page, searchParams = {}) {
  const url = new URL(window.location.href);
  url.searchParams.set('page', page);
  
  Object.keys(searchParams).forEach(key => {
    if (searchParams[key]) {
      url.searchParams.set(key, searchParams[key]);
    }
  });
  
  return url.toString();
}

/**
 * 검색 폼 유효성 검사
 */
function validateSearchForm(formElement) {
  const searchType = formElement.querySelector('select[name="search_type"]');
  const searchKeyword = formElement.querySelector('input[name="search_keyword"]');
  
  // 검색 조건을 선택하지 않고 검색어만 입력한 경우
  if (!searchType.value && searchKeyword.value.trim()) {
    alert('검색 조건을 선택해주세요.');
    searchType.focus();
    return false;
  }
  
  // 검색 조건은 선택했지만 검색어가 비어있는 경우
  if (searchType.value && !searchKeyword.value.trim()) {
    alert('검색어를 입력해주세요.');
    searchKeyword.focus();
    return false;
  }
  
  // 전화번호 검색 시 숫자만 허용 (하이픈, 공백 제외)
  if (searchType.value === 'phone' && searchKeyword.value.trim()) {
    const phoneValue = searchKeyword.value.trim();
    // 숫자, 하이픈(-), 공백만 허용하는 정규표현식
    const phonePattern = /^[0-9\s\-]+$/;
    if (!phonePattern.test(phoneValue)) {
      alert('전화번호는 숫자만 입력해주세요.');
      searchKeyword.focus();
      return false;
    }
  }
  
  return true;
}

/**
 * AJAX로 페이지네이션 처리 (스크롤 위치 유지)
 */
function handlePaginationAjax(e, url) {
  e.preventDefault();
  
  // 현재 스크롤 위치 저장
  const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
  
  // 로딩 표시 (선택사항)
  const tableContainer = document.querySelector('.table-container');
  const paginationContainer = document.querySelector('.pagination');
  
  // AJAX 요청
  fetch(url, {
    method: 'GET',
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
    }
  })
  .then(response => response.text())
  .then(html => {
    // 임시 DOM 요소 생성
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // 테이블 컨테이너 업데이트
    const newTableContainer = tempDiv.querySelector('.table-container');
    const newPagination = tempDiv.querySelector('.pagination');
    
    if (newTableContainer && tableContainer) {
      tableContainer.innerHTML = newTableContainer.innerHTML;
    }
    
    if (newPagination && paginationContainer) {
      paginationContainer.innerHTML = newPagination.innerHTML;
    }
    
    // 페이지네이션 링크에 다시 이벤트 리스너 추가
    attachPaginationListeners();
    
    // 테이블 행 클릭 이벤트 다시 연결
    if (typeof attachTableRowListeners === 'function') {
      attachTableRowListeners();
    }
    
    // URL 업데이트 (히스토리 관리)
    window.history.pushState({}, '', url);
    
    // 스크롤 위치 유지
    window.scrollTo(0, currentScrollPosition);
  })
  .catch(error => {
    console.error('페이지네이션 오류:', error);
    // 오류 발생 시 일반 페이지 이동으로 폴백
    window.location.href = url;
  });
}

/**
 * 페이지네이션 링크에 이벤트 리스너 연결
 */
function attachPaginationListeners() {
  const paginationLinks = document.querySelectorAll('.pagination a.page-link');
  
  paginationLinks.forEach(link => {
    // 기존 이벤트 리스너 제거 후 새로 추가
    link.removeEventListener('click', link._ajaxHandler);
    link._ajaxHandler = function(e) {
      handlePaginationAjax(e, link.href);
    };
    link.addEventListener('click', link._ajaxHandler);
  });
}

/**
 * 컨테이너 내부 휠 스크롤 방지 (비활성화 - 대시보드도 스크롤 허용)
 */
function preventContainerWheelScroll() {
  // 대시보드 휠 스크롤 허용으로 변경
  // 필요시 여기에 다른 로직 추가 가능
}

/**
 * 페이지네이션 버튼 클릭 시 스크롤 위치 저장 및 복원
 */
document.addEventListener('DOMContentLoaded', function() {
  // 검색 폼에 유효성 검사 추가
  const searchForms = document.querySelectorAll('.search-form');
  searchForms.forEach(form => {
    form.addEventListener('submit', function(e) {
      if (!validateSearchForm(form)) {
        e.preventDefault();
        return false;
      }
    });
  });
  
  // 페이지네이션 링크에 AJAX 이벤트 리스너 추가
  attachPaginationListeners();
  
  // 컨테이너 내부 휠 스크롤 방지
  preventContainerWheelScroll();
});


