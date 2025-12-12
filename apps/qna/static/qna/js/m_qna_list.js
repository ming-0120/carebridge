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
function goToQnaDetail(qnaId) {
  if (!qnaId) {
    console.error('qnaId가 없습니다.');
    return;
  }
  
  const url = `/qna/${qnaId}/`;
  console.log('이동할 URL:', url);
  window.location.href = url;
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
 * 페이지네이션 POST 방식 처리
 * 
 * 목적: 페이지네이션 링크를 POST 방식으로 처리
 */
function handlePaginationClick(e) {
  e.preventDefault();
  const page = e.target.getAttribute('data-page');
  const search = e.target.getAttribute('data-search') || '';
  
  if (!page) return;
  
  // POST 방식으로 폼 생성 및 제출
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = window.location.pathname;
  
  // CSRF 토큰 추가
  const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]');
  if (csrfToken) {
    const csrfInput = document.createElement('input');
    csrfInput.type = 'hidden';
    csrfInput.name = 'csrfmiddlewaretoken';
    csrfInput.value = csrfToken.value;
    form.appendChild(csrfInput);
  } else {
    // 검색 폼에서 CSRF 토큰 가져오기
    const searchForm = document.querySelector('.search-form');
    if (searchForm) {
      const searchCsrf = searchForm.querySelector('[name=csrfmiddlewaretoken]');
      if (searchCsrf) {
        const csrfInput = document.createElement('input');
        csrfInput.type = 'hidden';
        csrfInput.name = 'csrfmiddlewaretoken';
        csrfInput.value = searchCsrf.value;
        form.appendChild(csrfInput);
      }
    }
  }
  
  // 페이지 번호 추가
  const pageInput = document.createElement('input');
  pageInput.type = 'hidden';
  pageInput.name = 'page';
  pageInput.value = page;
  form.appendChild(pageInput);
  
  // 검색 키워드 추가
  if (search) {
    const searchInput = document.createElement('input');
    searchInput.type = 'hidden';
    searchInput.name = 'search';
    searchInput.value = search;
    form.appendChild(searchInput);
  }
  
  document.body.appendChild(form);
  form.submit();
}

document.addEventListener('DOMContentLoaded', function() {
  attachTableRowListeners();
  
  // 페이지네이션 링크에 이벤트 리스너 연결
  const paginationLinks = document.querySelectorAll('.pagination .page-link[data-page]');
  paginationLinks.forEach(link => {
    link.addEventListener('click', handlePaginationClick);
  });
});


