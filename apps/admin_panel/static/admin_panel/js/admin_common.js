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

