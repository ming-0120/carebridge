// QnA 목록 페이지 JavaScript
// 공통 함수는 m_qna_common.js를 참조하세요

/**
 * QnA 상세 페이지로 이동 함수
 * 
 * 목적: 특정 QnA의 상세 페이지로 이동
 *   - 사용자 경험(UX) 개선: 테이블 행 클릭 시 해당 QnA의 상세 정보를 확인할 수 있도록 함
 *   - 네비게이션: QnA 목록에서 QnA 상세 페이지로 이동
 * 
 * 동작 방식:
 *   1. QnA ID(qnaId) 파라미터 확인
 *   2. QnA ID가 없으면 에러 로그 출력하고 함수 종료
 *   3. QnA 상세 페이지 URL 생성
 *   4. 생성된 URL로 페이지 이동
 * 
 * 사용 시점:
 *   - 테이블 행 클릭 시 (attachTableRowListeners에서 호출)
 *   - 직접 호출 가능 (다른 이벤트 핸들러에서도 사용 가능)
 * 
 * 관련 함수:
 *   - attachTableRowListeners: 테이블 행 클릭 이벤트 연결
 * 
 * @param {number|string} qnaId - 이동할 QnA의 ID
 *   - 숫자 또는 숫자 문자열 형태
 *   - URL에 포함되어 QnA 상세 페이지를 식별하는 데 사용됨
 *   - 예: 1, 2, 3, "1", "2", "3"
 * 
 * @returns {void} 반환값 없음
 * 
 * @example
 * // 테이블 행 클릭 시 자동 호출
 * goToQnaDetail(1);
 * // 결과:
 * // 1. QnA ID 1의 상세 페이지 URL 생성: /qna/1/
 * // 2. 해당 URL로 페이지 이동
 */
function goToQnaDetail(qnaId, source) {
  if (!qnaId) {
    console.error('qnaId가 없습니다.');
    return;
  }
  
  // POST 방식으로 qna_id를 전송하여 URL에 노출되지 않도록 함
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = '/qna/detail/';
  
  // CSRF 토큰 추가
  const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || 
                    document.querySelector('input[name="csrfmiddlewaretoken"]')?.value ||
                    '';
  if (csrfToken) {
    const csrfInput = document.createElement('input');
    csrfInput.type = 'hidden';
    csrfInput.name = 'csrfmiddlewaretoken';
    csrfInput.value = csrfToken;
    form.appendChild(csrfInput);
  }
  
  // qna_id 추가
  const qnaIdInput = document.createElement('input');
  qnaIdInput.type = 'hidden';
  qnaIdInput.name = 'qna_id';
  qnaIdInput.value = qnaId;
  form.appendChild(qnaIdInput);
  
  if (source) {
    const src = document.createElement('input');
    src.type = 'hidden';
    src.name = 'from_page';
    src.value = source;           // 'mypage' 등
    form.appendChild(src);
  }

  document.body.appendChild(form);
  form.submit();
}

/**
 * 테이블 행 클릭 이벤트 연결 함수
 * 
 * 목적: QnA 목록 테이블의 각 행에 클릭 이벤트 리스너를 연결하여 QnA 상세 페이지로 이동 기능 제공
 *   - 사용자 경험(UX) 개선: 테이블 행 클릭 시 해당 QnA의 상세 정보를 확인할 수 있도록 직관적인 인터페이스 제공
 *   - 동적 이벤트 관리: AJAX 페이지네이션 후 새로 로드된 행에도 이벤트 리스너를 재연결
 * 
 * 동작 방식:
 *   1. QnA 목록 테이블의 모든 행을 찾기
 *   2. 각 행에 대해 기존 이벤트 리스너 제거 (중복 방지)
 *   3. 행의 data-qna-id 속성에서 QnA ID 추출
 *   4. 클릭 이벤트 핸들러 생성 및 연결
 *   5. 행 클릭 시 goToQnaDetail 함수 호출
 * 
 * 사용 시점:
 *   - 페이지 로드 시 (DOMContentLoaded 이벤트)
 *   - AJAX 페이지네이션 후 (필요시)
 *   - 테이블 내용이 동적으로 변경된 후
 * 
 * 관련 함수:
 *   - goToQnaDetail: QnA 상세 페이지로 이동
 * 
 * @returns {void} 반환값 없음
 * 
 * @example
 * // 페이지 로드 시 자동 호출
 * attachTableRowListeners();
 * // 결과:
 * // 1. 모든 QnA 목록 행에 클릭 이벤트 리스너 연결
 * // 2. 행 클릭 시 해당 QnA의 상세 페이지로 이동
 */
function attachTableRowListeners() {
  const qnaRows = document.querySelectorAll('.qna-row[data-qna-id]');
  
  qnaRows.forEach(row => {
    row.removeEventListener('click', row._clickHandler);
    
    const qnaId = row.getAttribute('data-qna-id');
    
    if (qnaId) {
      row._clickHandler = function(e) {
        goToQnaDetail(parseInt(qnaId));
      };
      
      row.addEventListener('click', row._clickHandler);
    }
  });
}

/**
 * 페이지 로드 시 초기화 함수
 * 
 * 목적: DOM이 완전히 로드된 후 QnA 목록 페이지 초기화 작업 수행
 *   - 사용자 경험(UX) 개선: 페이지 로드 시 필요한 이벤트 리스너를 연결하여 기능 활성화
 *   - 이벤트 연결: 테이블 행 클릭 이벤트 연결
 * 
 * 동작 방식:
 *   1. DOMContentLoaded 이벤트 발생 시 실행
 *   2. 테이블 행 클릭 이벤트 리스너 연결 (attachTableRowListeners)
 * 
 * 사용 시점:
 *   - 페이지 로드 시 (DOMContentLoaded 이벤트 발생 시 자동 실행)
 *   - 스크립트가 실행되기 전에 DOM이 준비되어 있어야 함
 * 
 * 관련 함수:
 *   - attachTableRowListeners: 테이블 행 클릭 이벤트 연결
 * 
 * @example
 * // 자동 실행 (페이지 로드 시)
 * // 결과:
 * // 1. 테이블 행 클릭 이벤트 리스너 연결
 */
/**
 * 정렬 링크 클릭 처리 함수 (AJAX 방식)
 * 
 * 목적: 정렬 링크 클릭 시 AJAX로 정렬 파라미터를 전송하여 테이블만 업데이트
 */
function handleSortClick(e) {
  e.preventDefault();
  const sortLink = e.target.closest('.sort-link');
  let sortField = sortLink.getAttribute('data-sort-field');
  const currentSort = sortLink.getAttribute('data-current-sort') || '';
  const currentOrder = sortLink.getAttribute('data-current-order') || 'desc';
  
  if (!sortField) return;
  
  // No. 컬럼 클릭 시 문의 일자로 정렬 (정렬 방향은 반대로)
  if (sortField === 'qna_id') {
    sortField = 'created_at';
    // No. 내림차순(6이 맨 위) = 문의 일자 오름차순(11일이 맨 위)
    // No. 오름차순(1이 맨 위) = 문의 일자 내림차순(15일이 맨 위)
    let newOrder;
    
    // 템플릿에서 No. 컬럼의 data-current-sort는 created_at일 때 'qna_id'로 표시됨
    // data-current-order는 문의 일자의 실제 정렬 방향을 나타냄
    // currentSort가 'qna_id'이거나 빈 문자열이면 실제로는 'created_at'으로 정렬된 상태
    if (currentSort === 'qna_id' || currentSort === '') {
      // 문의 일자 정렬 상태에서 No. 클릭: 반대 방향으로 토글
      // currentOrder는 문의 일자의 실제 정렬 방향
      // currentOrder가 'desc'면 문의 일자는 내림차순, No.는 오름차순 → 토글하면 문의 일자는 오름차순, No.는 내림차순
      // currentOrder가 'asc'면 문의 일자는 오름차순, No.는 내림차순 → 토글하면 문의 일자는 내림차순, No.는 오름차순
      const actualOrder = (currentSort === 'qna_id' && currentOrder) ? currentOrder : 'desc'; // 기본 상태는 desc
      newOrder = actualOrder === 'desc' ? 'asc' : 'desc';
    } else {
      // 다른 정렬 상태에서 No. 클릭: 기본적으로 문의 일자 오름차순 (No.는 6부터 시작)
      newOrder = 'asc'; // 문의 일자 오름차순 = No. 내림차순
    }
    
    // 현재 스크롤 위치 저장
    const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    
    // FormData 생성
    const formData = new FormData();
    
    // CSRF 토큰 추가
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || 
                      document.querySelector('input[name="csrfmiddlewaretoken"]')?.value ||
                      '';
    if (csrfToken) {
      formData.append('csrfmiddlewaretoken', csrfToken);
    }
    
    // 정렬 파라미터 추가 (문의 일자로 정렬, 방향은 반대)
    formData.append('sort', sortField);
    formData.append('order', newOrder);
    
    // 검색 키워드 유지 (있는 경우)
    const searchInput = document.querySelector('.search-input');
    if (searchInput && searchInput.value) {
      formData.append('search', searchInput.value);
    }
    
    // AJAX 요청
    fetch(window.location.pathname, {
      method: 'POST',
      body: formData,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      // 테이블 업데이트
      const tableContainer = document.querySelector('.table-container');
      if (tableContainer && data.table_html) {
        tableContainer.outerHTML = data.table_html;
      }
      
      // 페이지네이션 업데이트
      const paginationContainer = document.querySelector('.pagination');
      if (paginationContainer && data.pagination_html) {
        paginationContainer.outerHTML = data.pagination_html;
      } else if (!paginationContainer && data.pagination_html) {
        const tableContainer = document.querySelector('.table-container');
        if (tableContainer) {
          tableContainer.insertAdjacentHTML('afterend', data.pagination_html);
        }
      } else if (paginationContainer && !data.pagination_html) {
        paginationContainer.remove();
      }
      
      // 스크롤 위치 복원
      window.scrollTo(0, currentScrollPosition);
      
      // 이벤트 리스너 재연결
      attachTableRowListeners();
      attachSortListeners();
      
      // 페이지네이션 링크에 이벤트 리스너 연결
      const paginationLinks = document.querySelectorAll('.pagination .page-link[data-page]');
      paginationLinks.forEach(link => {
        link.addEventListener('click', handlePaginationClick);
      });
    })
    .catch(error => {
      console.error('정렬 요청 실패:', error);
      window.location.reload();
    });
    
    return; // No. 컬럼 처리 완료, 함수 종료
  }
  
  // 정렬 방향 결정: 같은 필드를 클릭하면 토글, 다른 필드를 클릭하면 내림차순
  let newOrder = 'desc';
  if (sortField === currentSort) {
    newOrder = currentOrder === 'asc' ? 'desc' : 'asc';
  }
  
  // 현재 스크롤 위치 저장
  const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
  
  // FormData 생성
  const formData = new FormData();
  
  // CSRF 토큰 추가
  const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || 
                    document.querySelector('input[name="csrfmiddlewaretoken"]')?.value ||
                    '';
  if (csrfToken) {
    formData.append('csrfmiddlewaretoken', csrfToken);
  }
  
  // 정렬 파라미터 추가
  formData.append('sort', sortField);
  formData.append('order', newOrder);
  
  // 검색 키워드 유지 (있는 경우)
  const searchInput = document.querySelector('.search-input');
  if (searchInput && searchInput.value) {
    formData.append('search', searchInput.value);
  }
  
  // AJAX 요청
  fetch(window.location.pathname, {
    method: 'POST',
    body: formData,
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  })
  .then(data => {
    // 테이블 업데이트
    const tableContainer = document.querySelector('.table-container');
    if (tableContainer && data.table_html) {
      tableContainer.outerHTML = data.table_html;
    }
    
    // 페이지네이션 업데이트
    const paginationContainer = document.querySelector('.pagination');
    if (paginationContainer && data.pagination_html) {
      paginationContainer.outerHTML = data.pagination_html;
    } else if (!paginationContainer && data.pagination_html) {
      // 페이지네이션이 없었는데 생긴 경우
      const tableContainer = document.querySelector('.table-container');
      if (tableContainer) {
        tableContainer.insertAdjacentHTML('afterend', data.pagination_html);
      }
    } else if (paginationContainer && !data.pagination_html) {
      // 페이지네이션이 있었는데 사라진 경우
      paginationContainer.remove();
    }
    
    // 스크롤 위치 복원
    window.scrollTo(0, currentScrollPosition);
    
    // 이벤트 리스너 재연결
    attachTableRowListeners();
    attachSortListeners();
    
    // 페이지네이션 링크에 이벤트 리스너 연결
    const paginationLinks = document.querySelectorAll('.pagination .page-link[data-page]');
    paginationLinks.forEach(link => {
      link.addEventListener('click', handlePaginationClick);
    });
  })
  .catch(error => {
    console.error('정렬 요청 실패:', error);
    // 에러 발생 시 전체 페이지 새로고침
    window.location.reload();
  });
}

/**
 * 정렬 링크 이벤트 연결 함수
 * 
 * 목적: 정렬 링크에 클릭 이벤트 리스너 연결
 */
function attachSortListeners() {
  const sortLinks = document.querySelectorAll('.sort-link');
  sortLinks.forEach(link => {
    link.removeEventListener('click', link._sortHandler);
    link._sortHandler = function(e) {
      handleSortClick(e);
    };
    link.addEventListener('click', link._sortHandler);
  });
}

/**
 * 페이지네이션 AJAX 처리
 * 
 * 목적: 페이지네이션 링크를 AJAX로 처리하여 테이블만 업데이트
 */
function handlePaginationClick(e) {
  e.preventDefault();
  const page = e.target.getAttribute('data-page');
  const search = e.target.getAttribute('data-search') || '';
  const sort = e.target.getAttribute('data-sort') || '';
  const order = e.target.getAttribute('data-order') || '';
  
  if (!page) return;
  
  // 현재 스크롤 위치 저장
  const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
  
  // FormData 생성
  const formData = new FormData();
  
  // CSRF 토큰 추가
  const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || 
                    document.querySelector('input[name="csrfmiddlewaretoken"]')?.value ||
                    '';
  if (csrfToken) {
    formData.append('csrfmiddlewaretoken', csrfToken);
  }
  
  // 페이지 번호 추가
  formData.append('page', page);
  
  // 검색 키워드 추가
  if (search) {
    formData.append('search', search);
  } else {
    // 검색 입력 필드에서 가져오기
    const searchInput = document.querySelector('.search-input');
    if (searchInput && searchInput.value) {
      formData.append('search', searchInput.value);
    }
  }
  
  // 정렬 파라미터 추가
  if (sort) {
    formData.append('sort', sort);
  } else {
    // 현재 정렬 상태에서 가져오기
    const currentSortLink = document.querySelector('.sort-link[data-current-sort]');
    if (currentSortLink) {
      const sortField = currentSortLink.getAttribute('data-current-sort');
      const sortOrder = currentSortLink.getAttribute('data-current-order');
      if (sortField) {
        formData.append('sort', sortField);
      }
      if (sortOrder) {
        formData.append('order', sortOrder);
      }
    }
  }
  
  if (order) {
    formData.append('order', order);
  }
  
  // AJAX 요청
  fetch(window.location.pathname, {
    method: 'POST',
    body: formData,
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  })
  .then(data => {
    // 테이블 업데이트
    const tableContainer = document.querySelector('.table-container');
    if (tableContainer && data.table_html) {
      tableContainer.outerHTML = data.table_html;
    }
    
    // 페이지네이션 업데이트
    const paginationContainer = document.querySelector('.pagination');
    if (paginationContainer && data.pagination_html) {
      paginationContainer.outerHTML = data.pagination_html;
    } else if (!paginationContainer && data.pagination_html) {
      // 페이지네이션이 없었는데 생긴 경우
      const tableContainer = document.querySelector('.table-container');
      if (tableContainer) {
        tableContainer.insertAdjacentHTML('afterend', data.pagination_html);
      }
    } else if (paginationContainer && !data.pagination_html) {
      // 페이지네이션이 있었는데 사라진 경우
      paginationContainer.remove();
    }
    
    // 스크롤 위치 복원
    window.scrollTo(0, currentScrollPosition);
    
    // 이벤트 리스너 재연결
    attachTableRowListeners();
    attachSortListeners();
    
    // 페이지네이션 링크에 이벤트 리스너 연결
    const paginationLinks = document.querySelectorAll('.pagination .page-link[data-page]');
    paginationLinks.forEach(link => {
      link.addEventListener('click', handlePaginationClick);
    });
  })
  .catch(error => {
    console.error('페이지네이션 요청 실패:', error);
    // 에러 발생 시 전체 페이지 새로고침
    window.location.reload();
  });
}

/**
 * FAQ 항목 아코디언 동작 제어 함수
 * 
 * 목적: FAQ 항목 중 하나가 열릴 때 다른 항목들을 자동으로 닫기
 *   - 사용자 경험(UX) 개선: 한 번에 하나의 FAQ 항목만 열리도록 하여 가독성 향상
 *   - 아코디언 패턴 구현: 전형적인 아코디언 UI 동작 제공
 * 
 * 동작 방식:
 *   1. 모든 FAQ 항목(.faq-item)에 toggle 이벤트 리스너 연결
 *   2. 항목이 열릴 때 (open 속성이 true가 될 때) 다른 모든 항목 닫기
 *   3. 현재 열린 항목은 그대로 유지
 * 
 * 사용 시점:
 *   - 페이지 로드 시 (DOMContentLoaded 이벤트)
 * 
 * @returns {void} 반환값 없음
 * 
 * @example
 * // 페이지 로드 시 자동 호출
 * attachFaqAccordionListeners();
 * // 결과:
 * // 1. 모든 FAQ 항목에 이벤트 리스너 연결
 * // 2. 하나가 열리면 다른 항목들 자동으로 닫힘
 */
function attachFaqAccordionListeners() {
  const faqItems = document.querySelectorAll('.faq-item');
  
  faqItems.forEach(item => {
    // 기존 이벤트 리스너 제거 (중복 방지)
    item.removeEventListener('toggle', item._toggleHandler);
    
    // toggle 이벤트 핸들러 생성 및 연결
    item._toggleHandler = function(e) {
      // 현재 항목이 열렸는지 확인
      if (item.open) {
        // 다른 모든 FAQ 항목 닫기
        faqItems.forEach(otherItem => {
          if (otherItem !== item && otherItem.open) {
            otherItem.open = false;
          }
        });
      }
    };
    
    item.addEventListener('toggle', item._toggleHandler);
  });
}

document.addEventListener('DOMContentLoaded', function() {
  attachTableRowListeners();
  attachSortListeners();
  attachFaqAccordionListeners(); // FAQ 아코디언 기능 추가
  
  // 페이지네이션 링크에 이벤트 리스너 연결
  const paginationLinks = document.querySelectorAll('.pagination .page-link[data-page]');
  paginationLinks.forEach(link => {
    link.addEventListener('click', handlePaginationClick);
  });
  
  // 검색 폼 제출 시 AJAX 처리
  const searchForm = document.querySelector('.search-form');
  if (searchForm) {
    searchForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // FormData 생성
      const formData = new FormData(searchForm);
      
      // 정렬 파라미터 유지
      const currentSortLink = document.querySelector('.sort-link[data-current-sort]');
      if (currentSortLink) {
        const sortField = currentSortLink.getAttribute('data-current-sort');
        const sortOrder = currentSortLink.getAttribute('data-current-order');
        if (sortField) {
          formData.append('sort', sortField);
        }
        if (sortOrder) {
          formData.append('order', sortOrder);
        }
      }
      
      // AJAX 요청
      fetch(window.location.pathname, {
        method: 'POST',
        body: formData,
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        }
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        // 테이블 업데이트
        const tableContainer = document.querySelector('.table-container');
        if (tableContainer && data.table_html) {
          tableContainer.outerHTML = data.table_html;
        }
        
        // 페이지네이션 업데이트
        const paginationContainer = document.querySelector('.pagination');
        if (paginationContainer && data.pagination_html) {
          paginationContainer.outerHTML = data.pagination_html;
        } else if (!paginationContainer && data.pagination_html) {
          // 페이지네이션이 없었는데 생긴 경우
          const tableContainer = document.querySelector('.table-container');
          if (tableContainer) {
            tableContainer.insertAdjacentHTML('afterend', data.pagination_html);
          }
        } else if (paginationContainer && !data.pagination_html) {
          // 페이지네이션이 있었는데 사라진 경우
          paginationContainer.remove();
        }
        
        // 이벤트 리스너 재연결
        attachTableRowListeners();
        attachSortListeners();
        
        // 페이지네이션 링크에 이벤트 리스너 연결
        const paginationLinks = document.querySelectorAll('.pagination .page-link[data-page]');
        paginationLinks.forEach(link => {
          link.addEventListener('click', handlePaginationClick);
        });
        
        // 검색 후 테이블 영역으로 스크롤 이동
        const updatedTableContainer = document.querySelector('.table-container');
        if (updatedTableContainer) {
          const offsetTop = updatedTableContainer.getBoundingClientRect().top + window.pageYOffset;
          window.scrollTo({
            top: offsetTop - 20, // 테이블 상단에 약간의 여백 추가
            behavior: 'smooth' // 부드러운 스크롤
          });
        }
      })
      .catch(error => {
        console.error('검색 요청 실패:', error);
        // 에러 발생 시 전체 페이지 새로고침
        searchForm.submit();
      });
    });
  }
});


