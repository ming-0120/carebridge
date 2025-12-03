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
 * 선택된 항목의 ID를 URL 파라미터로 설정하고 AJAX로 상세 정보 업데이트
 * @param {Event} event - 클릭 이벤트 객체
 * @param {number} itemId - 선택된 항목의 ID
 * @param {string} paramName - URL 파라미터 이름 (기본값: 'id')
 */
function selectItem(event, itemId, paramName = 'id') {
  const url = new URL(window.location.href);
  url.searchParams.set(paramName, itemId);
  // 페이지 파라미터 유지 (현재 페이지에서 선택)
  
  // 이벤트 발생 시점의 스크롤 위치 저장
  const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop;
  
  // 스크롤 위치를 강제로 고정하는 함수 (Promise 기반, 브라우저 자동 스크롤 조정 후 실행)
  const restoreScroll = (position) => {
    // 스크롤 복원 로직을 Promise로 감싸고, 최소 지연 시간을 줌
    return new Promise(resolve => {
      const doRestore = () => {
        // 모든 가능한 방법으로 스크롤 위치 설정
        window.scrollTo(0, position);
        document.documentElement.scrollTop = position;
        document.body.scrollTop = position;
        
        const currentPos = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop;
        
        // 복원 성공 여부 확인
        if (Math.abs(currentPos - position) <= 5) {
          resolve(true); // 성공
        } else {
          // 실패 시 requestAnimationFrame으로 재시도
          requestAnimationFrame(() => {
            window.scrollTo(0, position);
            document.documentElement.scrollTop = position;
            document.body.scrollTop = position;
            resolve(true); // 재시도 후 성공으로 간주
          });
        }
      };
      
      // DOM 업데이트가 완료된 후 실행되도록 50ms 지연
      setTimeout(doRestore, 50);
    });
  };
  
  // AJAX로 상세 정보만 업데이트 (페이지 새로고침 없음)
  fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
    }
  })
  .then(response => {4
    console.log(response.text)
    return response.json()
  })
  .then(async (data) => {
    // 스크롤 위치 다시 확인 (DOM 업데이트 전)
    const scrollBeforeUpdate = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop;
    const finalScrollPosition = scrollBeforeUpdate > 0 ? scrollBeforeUpdate : currentScrollPosition;
    
    // MutationObserver로 DOM 변경 감지하여 스크롤 복원 (비동기 처리)
    const observer = new MutationObserver(() => {
      restoreScroll(finalScrollPosition).catch(() => {}); // 에러 무시
    });
    
    // 상세 정보 영역 업데이트
    const currentDetailSection = document.querySelector('.user-detail-section, .doctor-detail-section, .hospital-detail-section, .approval-detail-section');
    const container = document.querySelector('.container');
    
    // 관찰 시작
    if (currentDetailSection || container) {
      observer.observe(currentDetailSection || container, {
        childList: true,
        subtree: true,
        attributes: false
      });
    }
    
    if (data.detail_html) {
      // 임시 DOM 요소 생성
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = data.detail_html;
      const newDetailSection = tempDiv.querySelector('.user-detail-section, .doctor-detail-section, .hospital-detail-section, .approval-detail-section');
      
      if (newDetailSection) {
        if (currentDetailSection) {
          // 기존 상세 정보 영역 교체
          if (currentDetailSection.classList.contains('approval-detail-section')) {
            // 승인대기 목록은 섹션이 항상 존재하므로 내용만 업데이트
            currentDetailSection.innerHTML = newDetailSection.innerHTML;
            // DOM 업데이트 후 비동기 스크롤 복원
            restoreScroll(finalScrollPosition).then(() => {
              // 복원 완료 후 추가 안전장치 (선택 사항)
            });
          } else {
            // 다른 목록은 innerHTML만 업데이트하여 스크롤 이동 방지
            // 클래스와 구조는 유지하고 내용만 변경
            const currentClasses = currentDetailSection.className;
            const newClasses = newDetailSection.className;
            
            // 스크롤 위치 저장
            const savedScroll = finalScrollPosition;
            
            // 스크롤 동작을 일시적으로 비활성화
            const originalScrollBehavior = document.documentElement.style.scrollBehavior;
            document.documentElement.style.scrollBehavior = 'auto';
            document.body.style.scrollBehavior = 'auto';
            
            // 🌟 핵심 개선: DOM 변경 전에 위치를 고정하고, 변경 직후 복원 시도를 비동기적으로 처리 🌟
            currentDetailSection.innerHTML = newDetailSection.innerHTML;
            
            // 클래스 업데이트 (변경된 경우)
            if (currentClasses !== newClasses) {
              currentDetailSection.className = newClasses;
            }
            
            // 스크롤 동작 복원
            document.documentElement.style.scrollBehavior = originalScrollBehavior;
            document.body.style.scrollBehavior = originalScrollBehavior;
            
            // innerHTML 업데이트 후 비동기 복원 호출
            restoreScroll(savedScroll).then(() => {
              // 복원 완료 후 추가 안전장치 (선택 사항)
            });
          }
        } else if (container) {
          // 상세 정보 영역이 없으면 추가 (스크롤 위치 고정하면서)
          // 숨겨진 플레이스홀더가 있는지 확인 (placeholder-hidden 클래스 사용)
          const hiddenPlaceholder = container.querySelector('.user-detail-section.placeholder-hidden, .doctor-detail-section.placeholder-hidden, .hospital-detail-section.placeholder-hidden');
          
          if (hiddenPlaceholder) {
            // 플레이스홀더가 있으면 내용만 업데이트
            const savedScroll = finalScrollPosition;
            
            // 스크롤 동작을 일시적으로 비활성화
            const originalScrollBehavior = document.documentElement.style.scrollBehavior;
            document.documentElement.style.scrollBehavior = 'auto';
            document.body.style.scrollBehavior = 'auto';
            
            // 내용 업데이트 (placeholder-hidden 클래스 제거)
            hiddenPlaceholder.innerHTML = newDetailSection.innerHTML;
            // 클래스명 업데이트 (placeholder-hidden 제거, 실제 클래스만 유지)
            hiddenPlaceholder.className = newDetailSection.className;
            
            // 스크롤 동작 복원
            document.documentElement.style.scrollBehavior = originalScrollBehavior;
            document.body.style.scrollBehavior = originalScrollBehavior;
            
            // 업데이트 후 비동기 스크롤 복원
            restoreScroll(savedScroll).then(() => {
              // 복원 완료 후 추가 안전장치 (선택 사항)
            });
          } else {
            // 플레이스홀더가 없으면 추가 (스크롤 위치 고정하면서)
            const savedScroll = finalScrollPosition;
            
            // 요소 추가 전에 스크롤을 완전히 고정
            const originalScrollBehavior = document.documentElement.style.scrollBehavior;
            document.documentElement.style.scrollBehavior = 'auto';
            document.body.style.scrollBehavior = 'auto';
            
            // 요소 추가
            container.appendChild(newDetailSection);
            
            // 스크롤 동작 복원
            document.documentElement.style.scrollBehavior = originalScrollBehavior;
            document.body.style.scrollBehavior = originalScrollBehavior;
            
            // 추가 후 비동기 스크롤 복원
            restoreScroll(savedScroll).then(() => {
              // 복원 완료 후 추가 안전장치 (선택 사항)
            });
          }
        }
      } else if (currentDetailSection && !currentDetailSection.classList.contains('approval-detail-section')) {
        // 상세 정보가 없으면 제거
        currentDetailSection.remove();
        // 제거 후 비동기 스크롤 복원
        restoreScroll(finalScrollPosition).then(() => {
          // 복원 완료 후 추가 안전장치 (선택 사항)
        });
      }
    }
    
    // 관찰 중지
    observer.disconnect();
    
    // 선택된 행 스타일 업데이트
    updateSelectedRowStyle(itemId, paramName);
    
    // URL 업데이트 (히스토리 관리, 페이지 새로고침 없음)
    window.history.pushState({}, '', url.toString());
    
    // **개선: DOM이 안정화될 때까지 기다렸다가 최종적으로 한 번 더 복원**
    restoreScroll(finalScrollPosition);
  })
  .catch(error => {
    console.error('상세 정보 로드 오류:', error);
    // 오류 발생 시 일반 페이지 이동으로 폴백
    window.location.href = url.toString();
  });
}

/**
 * 선택된 행 스타일 업데이트
 */
function updateSelectedRowStyle(itemId, paramName) {
  // 모든 행에서 selected 클래스 제거
  const allRows = document.querySelectorAll('.user-row, .doctor-row, .hospital-row, .approval-row');
  allRows.forEach(row => {
    row.classList.remove('selected');
  });
  
  // 선택된 행에 selected 클래스 추가
  let dataAttribute = '';
  if (paramName === 'user_id') {
    dataAttribute = `data-user-id="${itemId}"`;
  } else if (paramName === 'doctor_id') {
    dataAttribute = `data-doctor-id="${itemId}"`;
  } else if (paramName === 'hospital_id') {
    dataAttribute = `data-hospital-id="${itemId}"`;
  }
  
  if (dataAttribute) {
    const selectedRow = document.querySelector(`[${dataAttribute}]`);
    if (selectedRow) {
      selectedRow.classList.add('selected');
    }
  }
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
 * 정렬 URL 생성
 */
function getSortUrl(sortField, currentSort, currentOrder) {
  const url = new URL(window.location.href);
  // 검색 파라미터 유지
  const searchType = url.searchParams.get('search_type') || '';
  const searchKeyword = url.searchParams.get('search_keyword') || '';
  
  // 정렬 방향 결정 (같은 필드면 토글, 다르면 오름차순)
  let newOrder = 'asc';
  if (currentSort === sortField && currentOrder === 'asc') {
    newOrder = 'desc';
  }
  
  // URL 파라미터 설정
  url.searchParams.set('sort', sortField);
  url.searchParams.set('order', newOrder);
  url.searchParams.delete('page'); // 정렬 시 첫 페이지로
  
  // 검색 파라미터 유지
  if (searchType) {
    url.searchParams.set('search_type', searchType);
  }
  if (searchKeyword) {
    url.searchParams.set('search_keyword', searchKeyword);
  }
  
  return url.toString();
}

/**
 * 정렬 링크 클릭 핸들러
 */
function handleSortClick(sortField, currentSortField, currentSortOrder) {
  // currentSortField와 currentSortOrder가 빈 문자열일 수 있으므로 처리
  const actualCurrentSort = currentSortField || '';
  const actualCurrentOrder = currentSortOrder || 'desc';
  const url = getSortUrl(sortField, actualCurrentSort, actualCurrentOrder);
  window.location.href = url;
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
  .then(response => {
    // Content-Type 확인
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      // JSON 응답인 경우 (상세 정보만 반환)
      return response.json().then(data => {
        throw new Error('JSON_RESPONSE'); // JSON 응답은 handlePaginationAjax에서 처리하지 않음
      });
    }
    // HTML 응답인 경우
    return response.text();
  })
  .then(html => {
    // 임시 DOM 요소 생성
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // 테이블 컨테이너 업데이트
    const newTableContainer = tempDiv.querySelector('.table-container');
    const newPagination = tempDiv.querySelector('.pagination');
    
    // 상세 정보 영역 확인 (페이지네이션 후에도 유지)
    const currentDetailSection = document.querySelector('.user-detail-section, .doctor-detail-section, .hospital-detail-section, .approval-detail-section');
    const container = document.querySelector('.container');
    
    // 스크롤 동작을 일시적으로 비활성화
    const originalScrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    document.body.style.scrollBehavior = 'auto';
    
    if (newTableContainer && tableContainer) {
      tableContainer.innerHTML = newTableContainer.innerHTML;
      // 🌟 추가: 테이블 목록 업데이트 직후 스크롤 위치 강제 고정 🌟
      window.scrollTo(0, currentScrollPosition);
      document.documentElement.scrollTop = currentScrollPosition;
      document.body.scrollTop = currentScrollPosition;
    }
    
    if (newPagination && paginationContainer) {
      paginationContainer.innerHTML = newPagination.innerHTML;
    }
    
    // 스크롤 동작 복원
    document.documentElement.style.scrollBehavior = originalScrollBehavior;
    document.body.style.scrollBehavior = originalScrollBehavior;
    
    // 🌟 핵심 개선: DOM 업데이트 직후 스크롤 복원 (브라우저 자동 조정 방지) 🌟
    window.scrollTo(0, currentScrollPosition);
    document.documentElement.scrollTop = currentScrollPosition;
    document.body.scrollTop = currentScrollPosition;
    
    // 페이지네이션 후 상세 정보 영역이 없어졌다면 플레이스홀더 추가 (스크롤 이동 방지)
    if (container && !currentDetailSection) {
      // 숨겨진 플레이스홀더가 있는지 확인 (placeholder-hidden 클래스 사용)
      const hiddenPlaceholder = container.querySelector('.user-detail-section.placeholder-hidden, .doctor-detail-section.placeholder-hidden, .hospital-detail-section.placeholder-hidden');
      if (!hiddenPlaceholder) {
        // 플레이스홀더가 없으면 추가 (placeholder-hidden 클래스 사용)
        const placeholder = document.createElement('div');
        placeholder.className = 'user-detail-section placeholder-hidden';
        container.appendChild(placeholder);
      }
    }
    
    // 비동기 스크롤 복원 (브라우저 자동 조정 완료 후)
    restoreScroll(currentScrollPosition).then(() => {
      // 복원 완료 후 추가 안전장치 (선택 사항)
    });
    
    // 페이지네이션 링크에 다시 이벤트 리스너 추가
    attachPaginationListeners();
    
    // 테이블 행 클릭 이벤트 다시 연결
    if (typeof attachTableRowListeners === 'function') {
      attachTableRowListeners();
    }
    
    // 체크박스 이벤트 다시 연결 (승인대기, 1:1문의 등)
    if (typeof attachCheckboxListeners === 'function') {
      attachCheckboxListeners();
    }
    
    // URL 업데이트 (히스토리 관리)
    window.history.pushState({}, '', url);
    
    // 스크롤 위치 강제 유지 (여러 번 복원하여 확실하게)
    // 즉시 복원
    window.scrollTo(0, currentScrollPosition);
    
    // DOM 업데이트 후 복원
    requestAnimationFrame(() => {
      window.scrollTo(0, currentScrollPosition);
    });
    
    // 레이아웃 변경 후 복원
    setTimeout(() => {
      window.scrollTo(0, currentScrollPosition);
    }, 0);
    
    // 추가 안전장치 (100ms 후)
    setTimeout(() => {
      const newScrollPosition = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop;
      if (Math.abs(newScrollPosition - currentScrollPosition) > 10) {
        window.scrollTo(0, currentScrollPosition);
      }
    }, 100);
  })
  .catch(error => {
    if (error.message === 'JSON_RESPONSE') {
      // JSON 응답은 페이지네이션이 아니므로 무시
      return;
    }
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


