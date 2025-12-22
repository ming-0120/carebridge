// ========= 관리자 페이지 공통 JavaScript =========
// 버전: 2024-12-20 (페이지네이션 오류 수정)

/**
 * URL 파라미터를 유지하면서 페이지 이동
 * 
 * @param {string} url - 이동할 페이지의 URL (상대 경로 또는 절대 경로)
 * @param {Object} params - URL에 추가하거나 제거할 파라미터 객체
 *   - 키: 파라미터 이름 (예: 'search_type', 'search_keyword', 'page')
 *   - 값: 파라미터 값 (문자열, 숫자 등)
 *   - 값이 truthy인 경우: URL에 파라미터 추가 또는 업데이트
 *   - 값이 falsy인 경우 (null, undefined, '', 0, false 등): URL에서 파라미터 제거
 * 
 * @example
 * // 검색 조건과 페이지 번호를 유지하면서 목록 페이지로 이동
 * navigateWithParams('/admin_panel/users/', {
 *   search_type: 'name',
 *   search_keyword: '김철수',
 *   page: 2
 * });
 * 
 * @example
 * // 특정 파라미터를 제거하면서 이동 (검색어 제거)
 * navigateWithParams('/admin_panel/users/', {
 *   search_type: '',  // falsy 값이므로 파라미터 제거
 *   search_keyword: ''  // falsy 값이므로 파라미터 제거
 * });
 */
function navigateWithParams(url, params) {
  // ========= URL 객체 생성 =========
  // new URL(url, window.location.origin): URL 객체 생성
  //   - url: 이동할 페이지의 URL (상대 경로 또는 절대 경로)
  //     → 예: '/admin_panel/users/', 'http://example.com/admin_panel/users/'
  //   - window.location.origin: 현재 페이지의 origin (프로토콜 + 호스트 + 포트)
  //     → 예: 'http://localhost:8000', 'https://example.com'
  //   - 목적: 상대 경로인 경우 현재 origin을 기준으로 절대 URL 생성
  //     → 예: url='/admin_panel/users/', origin='http://localhost:8000'
  //     → 결과: 'http://localhost:8000/admin_panel/users/'
  //   - 반환값: URL 객체 (URL의 각 부분에 접근 가능)
  //     → urlObj.searchParams: URL의 쿼리 파라미터를 관리하는 URLSearchParams 객체
  const urlObj = new URL(url, window.location.origin);
  
  // ========= 파라미터 추가 또는 제거 =========
  // Object.keys(params): params 객체의 모든 키를 배열로 반환
  //   → 예: params = {search_type: 'name', search_keyword: '김철수', page: 2}
  //   → 결과: ['search_type', 'search_keyword', 'page']
  // 
  // .forEach(key => {...}): 각 키를 순회하며 처리
  //   - key: 현재 처리 중인 파라미터 이름 (예: 'search_type')
  Object.keys(params).forEach(key => {
    // ========= 파라미터 값 확인 =========
    // params[key]: 현재 파라미터의 값
    //   - truthy 값: null이 아니고, undefined가 아니고, 빈 문자열이 아닌 값
    //     → 예: 'name', '김철수', 2, true 등
    //   - falsy 값: null, undefined, '', 0, false, NaN 등
    if (params[key]) {
      // ========= 파라미터 추가 또는 업데이트 =========
      // urlObj.searchParams.set(key, params[key]): URL에 파라미터 추가 또는 업데이트
      //   - key: 파라미터 이름 (예: 'search_type')
      //   - params[key]: 파라미터 값 (예: 'name')
      //   - 동작:
      //     → 파라미터가 이미 존재하면 값 업데이트
      //     → 파라미터가 없으면 새로 추가
      //   - 예: urlObj.searchParams.set('search_type', 'name')
      //     → URL: 'http://localhost:8000/admin_panel/users/?search_type=name'
      //   - 예: 기존에 search_type='email'이 있으면 'name'으로 업데이트
      urlObj.searchParams.set(key, params[key]);
    } else {
      // ========= 파라미터 제거 =========
      // urlObj.searchParams.delete(key): URL에서 파라미터 제거
      //   - key: 제거할 파라미터 이름 (예: 'search_type')
      //   - 동작: 파라미터가 존재하면 제거, 없으면 아무 동작 안 함
      //   - 예: urlObj.searchParams.delete('search_type')
      //     → URL: 'http://localhost:8000/admin_panel/users/?search_keyword=김철수'
      //     → search_type 파라미터가 제거됨
      //   - 목적: 검색 조건 초기화, 페이지 번호 제거 등에 사용
      //     → 예: 검색어를 지우고 싶을 때 search_keyword: ''로 설정하면 파라미터 제거
      urlObj.searchParams.delete(key);
    }
  });
  
  // ========= 페이지 이동 =========
  // window.location.href: 브라우저의 현재 URL을 변경하여 페이지 이동
  //   - urlObj.toString(): URL 객체를 문자열로 변환
  //     → 예: 'http://localhost:8000/admin_panel/users/?search_type=name&search_keyword=김철수&page=2'
  //   - 동작: 브라우저가 해당 URL로 페이지를 이동 (전체 페이지 새로고침)
  //   - 결과: 새로운 URL로 페이지가 로드되고, 브라우저 히스토리에 추가됨
  //   - 주의: AJAX가 아닌 일반 페이지 이동이므로 전체 페이지가 새로고침됨
  //     → 스크롤 위치는 페이지 상단으로 이동
  //     → 페이지 상태는 초기화됨
  window.location.href = urlObj.toString();
}

/**
 * 선택된 항목의 ID를 URL 파라미터로 설정하고 AJAX로 상세 정보 업데이트
 * @param {Event} event - 클릭 이벤트 객체
 * @param {number} itemId - 선택된 항목의 ID
 * @param {string} paramName - URL 파라미터 이름 (기본값: 'id')
 */
function selectItem(event, itemId, paramName = 'id') {
  // 이벤트가 있으면 기본 동작 차단 (추가 보안)
  if (event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }
  
  try {
    const url = new URL(window.location.href);
    url.searchParams.set(paramName, itemId);
  
  // ========= 상세 정보 섹션으로 스크롤 이동 함수 =========
  // 목적: 상세 정보 섹션이 보이도록 스크롤을 이동
  //   - 사용자 경험(UX) 개선: 행 클릭 시 상세 정보가 보이도록 자동으로 스크롤
  //   - Promise 기반으로 비동기 처리하여 DOM 업데이트 완료 후 실행
  // 
  // @param {HTMLElement} detailSection - 상세 정보 섹션 요소
  //   - 스크롤을 이동할 대상 요소
  // 
  // @returns {Promise<boolean>} - 스크롤 이동 완료를 나타내는 Promise
  //   - resolve(true): 스크롤 이동 성공
  const scrollToDetailSection = (detailSection) => {
    if (!detailSection) {
      return;
    }
    
    const scrollToElement = () => {
      const rect = detailSection.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop;
      const targetPosition = rect.top + scrollTop - 20;
      
      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });
    };
    
    scrollToElement();
    setTimeout(scrollToElement, 100);
    requestAnimationFrame(() => {
      setTimeout(scrollToElement, 50);
    });
  };
  
  // ========= AJAX로 상세 정보만 업데이트 (페이지 새로고침 없음) =========
  // CSRF 토큰 가져오기
  const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || 
                    document.querySelector('input[name="csrfmiddlewaretoken"]')?.value ||
                    '';
  
  // FormData 생성 (POST 요청용)
  const formData = new FormData();
  formData.append(paramName, itemId);
  if (csrfToken) {
    formData.append('csrfmiddlewaretoken', csrfToken);
  }
  
  fetch(url.pathname, {
    // ========= HTTP 요청 설정 =========
    // method: HTTP 요청 메서드
    //   - 'POST': 서버에 데이터를 전송하는 요청
    //   - POST 요청은 데이터를 요청 본문(body)에 전달
    method: 'POST',
    
    // body: 요청 본문 데이터
    //   - FormData: 폼 데이터를 전송하기 위한 객체
    body: formData,
    
    // headers: HTTP 요청 헤더 설정
    //   - 서버에 추가 정보를 전달하는 키-값 쌍
    headers: {
      // 'X-Requested-With': 'XMLHttpRequest': AJAX 요청임을 서버에 알림
      //   - Django 등 일부 서버 프레임워크에서 AJAX 요청을 구분하기 위해 사용
      //   - 서버는 이 헤더를 확인하여 JSON 응답을 반환할지 HTML 응답을 반환할지 결정
      //   - 예: Django views.py에서 request.headers.get('X-Requested-With') == 'XMLHttpRequest'로 확인
      //   - 목적: AJAX 요청인 경우 상세 정보 HTML만 반환, 일반 요청인 경우 전체 페이지 반환
      'X-Requested-With': 'XMLHttpRequest',
    }
  })
  // ========= 응답 처리 (첫 번째 then) =========
  // .then(response => {...}): fetch 요청이 성공적으로 완료되면 실행
  //   - response: Response 객체 (HTTP 응답 정보를 담고 있음)
  //     → status: HTTP 상태 코드 (200, 404, 500 등)
  //     → ok: 요청이 성공했는지 여부 (status가 200-299 범위)
  //     → headers: 응답 헤더 정보
  //     → json(): JSON 형식의 응답 본문을 파싱하여 Promise 반환
  //     → text(): 텍스트 형식의 응답 본문을 반환하는 Promise
  .then(response => {
    return response.json();
  })
  .catch(error => {
    console.error('fetch 에러 발생:', error);
    throw error;
  })
  .then(async (data) => {
    
    // ========= 상세 정보 영역 요소 조회 =========
    // 목적: DOM 업데이트를 위해 필요한 요소들을 미리 조회
    //   - 상세 정보를 표시할 영역을 찾아서 내용을 업데이트
    //   - 요소가 없으면 새로 생성
    
    const currentDetailSection = document.querySelector('.user-detail-section');
    
    // document.querySelector('.container'): 컨테이너 요소 조회
    //   - .container: 페이지의 메인 컨테이너 요소
    //   - 반환값: 첫 번째로 일치하는 요소 (Element 객체) 또는 null (없으면)
    // 
    // 목적: 상세 정보 영역이 없을 때 추가할 위치를 찾기 위함
    //   - currentDetailSection이 없으면 container에 새로 추가
    //   - container는 페이지의 메인 레이아웃 컨테이너
    const container = document.querySelector('.container');
    
    // ========= 서버에서 받은 HTML 데이터로 DOM 업데이트 =========
    // data.detail_html: 서버에서 반환한 상세 정보 HTML 문자열
    //   - 예: '<div class="user-detail-section">...</div>'
    //   - 존재 여부 확인: 서버에서 상세 정보를 반환했는지 확인
    //   - 빈 문자열 체크: 상세 정보가 없으면 기존 상세 정보 섹션 제거
    if (data.detail_html && data.detail_html.trim()) {
      // ========= 임시 DOM 요소 생성 및 HTML 파싱 =========
      // 목적: 서버에서 받은 HTML 문자열을 실제 DOM 요소로 변환
      //   - innerHTML을 직접 사용하면 보안 위험(XSS)이 있지만, 서버에서 신뢰할 수 있는 데이터이므로 사용
      //   - 임시 div 요소를 생성하여 HTML을 파싱한 후 필요한 부분만 추출
      
      // document.createElement('div'): 새로운 div 요소 생성
      //   - 'div': 생성할 요소의 태그 이름
      //   - 반환값: HTMLDivElement 객체 (아직 DOM에 추가되지 않은 상태)
      //   - 목적: HTML 문자열을 파싱하기 위한 임시 컨테이너
      const tempDiv = document.createElement('div');
      
      // tempDiv.innerHTML: 요소의 내부 HTML을 설정
      //   - data.detail_html: 서버에서 받은 HTML 문자열
      //   - 동작: HTML 문자열을 파싱하여 DOM 요소로 변환
      //   - 예: '<div class="user-detail-section">...</div>' → 실제 DOM 요소로 변환
      //   - 주의: XSS 공격에 취약하지만, 서버에서 신뢰할 수 있는 데이터이므로 사용
      tempDiv.innerHTML = data.detail_html;
      
      const newDetailSection = tempDiv.querySelector('.user-detail-section');
      
      // ========= 상세 정보 영역이 있는 경우 =========
      // newDetailSection: 서버에서 받은 HTML에 상세 정보 영역이 있는지 확인
      if (newDetailSection) {
        // ========= 기존 상세 정보 영역이 있는 경우 =========
        // currentDetailSection: 현재 페이지에 상세 정보 영역이 이미 존재하는지 확인
        if (currentDetailSection) {
          // ========= 모든 목록의 경우 (일반 처리) =========
          {
            // ========= 다른 목록의 경우 (일반 처리) =========
            // 다른 목록은 innerHTML만 업데이트하여 스크롤 이동 방지
            // 클래스와 구조는 유지하고 내용만 변경
            
            // 현재 클래스명 저장 (나중에 비교하기 위함)
            const currentClasses = currentDetailSection.className;
            
            // 새 클래스명 저장
            const newClasses = newDetailSection.className;
            
            // innerHTML 업데이트
            currentDetailSection.innerHTML = newDetailSection.innerHTML;
            
            // 클래스 업데이트 (변경된 경우)
            if (currentClasses !== newClasses) {
              currentDetailSection.className = newClasses;
            }
            
            // 상세 정보 섹션으로 스크롤 이동
            scrollToDetailSection(currentDetailSection);
          }
        } else if (container) {
          // ========= 상세 정보 영역이 없으면 추가 (스크롤 위치 고정하면서) =========
          // currentDetailSection이 없고 container가 있는 경우
          //   - 상세 정보 영역이 아직 생성되지 않았으므로 새로 추가해야 함
          //   - container에 추가하여 레이아웃 유지
          
          const hiddenPlaceholder = container.querySelector('.user-detail-section.placeholder-hidden');
          
          if (hiddenPlaceholder) {
            // 플레이스홀더가 있으면 내용만 업데이트
            hiddenPlaceholder.innerHTML = newDetailSection.innerHTML;
            hiddenPlaceholder.className = newDetailSection.className;
            
            // 상세 정보 섹션으로 스크롤 이동
            scrollToDetailSection(hiddenPlaceholder);
          } else {
            // 플레이스홀더가 없으면 새로 추가
            container.appendChild(newDetailSection);
            
            // 상세 정보 섹션으로 스크롤 이동
            scrollToDetailSection(newDetailSection);
          }
        }
      } else if (currentDetailSection) {
        // 상세 정보가 없으면 제거
        currentDetailSection.remove();
      }
    } else {
      // ========= 상세 정보가 없을 때 기존 상세 정보 섹션 제거 =========
      // 목적: 선택이 해제되었거나 상세 정보가 없을 때 상세 정보 섹션을 완전히 숨김
      //   - 사용자 경험(UX) 개선: 선택이 해제되면 상세 정보도 함께 사라지도록 함
      if (currentDetailSection) {
        currentDetailSection.remove();
      }
    }
    
    // ========= 선택된 행 스타일 업데이트 =========
    // 목적: 사용자가 클릭한 행을 시각적으로 강조 표시
    //   - 선택된 행에 'selected' 클래스를 추가하여 하이라이트
    //   - 다른 행에서 'selected' 클래스를 제거하여 단일 선택 유지
    //   - 사용자 경험(UX) 개선: 현재 선택된 항목을 명확하게 표시
    // 
    // updateSelectedRowStyle(itemId, paramName): 선택된 행의 스타일을 업데이트하는 함수 호출
    //   - itemId: 선택된 항목의 ID (예: 사용자 ID, 의사 ID, 병원 ID)
    //   - paramName: URL 파라미터 이름 (예: 'user_id', 'doctor_id', 'hospital_id')
    //   - 동작:
    //     1. 모든 행에서 'selected' 클래스 제거
    //     2. 선택된 행에 'selected' 클래스 추가
    //   - 반환값: 없음 (void)
    updateSelectedRowStyle(itemId, paramName);
    
    // ========= 정렬 버튼 이벤트 리스너 재연결 =========
    // 목적: 상세 정보 업데이트 후 정렬 버튼 이벤트 리스너를 다시 연결
    //   - DOM 업데이트 후에도 정렬 버튼이 정상적으로 작동하도록 보장
    //   - 사용자 경험(UX) 개선: 상세 정보가 표시되어도 정렬 기능이 계속 작동
    if (typeof attachSortListeners === 'function') {
      // DOM 업데이트가 완전히 완료된 후 실행하기 위해 requestAnimationFrame 사용
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          attachSortListeners();
        });
      });
    }
    
    // ========= URL 업데이트 (히스토리 관리, 페이지 새로고침 없음) =========
    // 목적: 브라우저 히스토리에 새로운 상태를 추가하여 URL을 업데이트
    //   - 페이지 새로고침 없이 URL만 변경
    //   - 브라우저의 뒤로가기/앞으로가기 버튼으로 이전 상태로 돌아갈 수 있음
    //   - 사용자 경험(UX) 개선: URL이 현재 상태를 반영하여 북마크/공유 가능
    // 
    // window.history.pushState(state, title, url): 브라우저 히스토리에 새로운 상태 추가
    //   - state: 상태 객체 (현재는 빈 객체 {}, 나중에 popstate 이벤트에서 사용 가능)
    //     → 예: {selectedItemId: 123, page: 2} 등
    //     → 현재는 사용하지 않으므로 빈 객체
    //   - title: 페이지 제목 (현재는 빈 문자열, 대부분의 브라우저에서 무시됨)
    //     → HTML의 <title> 태그는 변경되지 않음
    //   - url: 새로운 URL (문자열)
    //     → url.toString(): URL 객체를 문자열로 변환
    //     → 예: 'http://localhost:8000/admin_panel/users/?user_id=123&page=2'
    //   - 동작:
    //     → 브라우저 히스토리 스택에 새로운 항목 추가
    //     → URL 표시줄의 URL 변경 (페이지 새로고침 없음)
    //     → 페이지는 그대로 유지되고 URL만 변경됨
    //   - 장점:
    //     → 사용자가 뒤로가기 버튼을 눌러도 이전 상태로 돌아갈 수 있음
    //     → URL을 복사하여 다른 사람과 공유 가능
    //     → 북마크를 추가하면 현재 상태가 저장됨
    window.history.pushState({}, '', url.toString());
    
  })
  // ========= 에러 처리 (catch 블록) =========
  // 목적: AJAX 요청이나 데이터 처리 중 발생한 에러를 처리
  //   - 네트워크 오류, 서버 오류, JSON 파싱 오류 등 모든 에러를 처리
  //   - 사용자 경험(UX) 개선: 에러 발생 시에도 페이지가 정상적으로 동작하도록 보장
  // 
  // .catch(error => {...}): Promise 체인에서 발생한 에러를 처리
  //   - error: 발생한 에러 객체
  //     → Error 객체 또는 네트워크 오류 등
  //     → 예: TypeError, NetworkError, SyntaxError 등
  //   - 동작: 이전 then 블록에서 에러가 발생하면 이 catch 블록이 실행됨
  .catch(error => {
    // ========= 에러 로깅 =========
    // console.error(...): 콘솔에 에러 메시지 출력
    //   - '상세 정보 로드 오류:': 에러 메시지 접두사
    //   - error: 실제 에러 객체 (스택 트레이스 포함)
    //   - 목적: 개발자가 에러를 디버깅할 수 있도록 정보 제공
    //   - 주의: 프로덕션 환경에서는 사용자에게 친화적인 메시지를 표시하는 것이 좋음
    console.error('상세 정보 로드 오류:', error);
    
    // ========= 폴백: 일반 페이지 이동 =========
    // 목적: AJAX 요청이 실패했을 때 일반 페이지 이동으로 대체
    //   - AJAX가 실패해도 사용자가 원하는 페이지로 이동할 수 있도록 보장
    //   - 사용자 경험(UX) 개선: 에러 발생 시에도 기능이 동작하도록 보장
    // 
    // window.location.href: 브라우저의 현재 URL을 변경하여 페이지 이동
    //   - url.toString(): URL 객체를 문자열로 변환
    //     → 예: 'http://localhost:8000/admin_panel/users/?user_id=123'
    //   - 동작: 브라우저가 해당 URL로 전체 페이지를 새로고침하여 이동
    //     → 서버에서 전체 HTML 페이지를 받아와서 렌더링
    //     → 스크롤 위치는 페이지 상단으로 이동
    //     → 페이지 상태는 초기화됨
    //   - 장점:
    //     → AJAX가 실패해도 기능이 동작함
    //     → 서버에서 항상 최신 데이터를 받아올 수 있음
    //   - 단점:
    //     → 페이지 새로고침으로 인한 사용자 경험 저하
    //     → 스크롤 위치가 초기화됨
    //     → 네트워크 트래픽 증가
    // 오류 발생 시 일반 페이지 이동으로 폴백
    window.location.href = url.toString();
  });
  } catch (error) {
    console.error('selectItem 에러:', error);
    // 에러 발생 시에도 페이지 이동 시도
    try {
      const url = new URL(window.location.href);
      url.searchParams.set(paramName, itemId);
      window.location.href = url.toString();
    } catch (urlError) {
      console.error('URL 생성 에러:', urlError);
    }
  }
}

/**
 * 선택된 행 스타일 업데이트
 * 
 * 목적: 사용자가 클릭한 행을 시각적으로 강조 표시하여 현재 선택된 항목을 명확하게 표시
 *   - 단일 선택 모드: 한 번에 하나의 행만 선택 가능
 *   - 시각적 피드백: 선택된 행에 'selected' 클래스를 추가하여 하이라이트
 *   - 사용자 경험(UX) 개선: 현재 선택된 항목을 쉽게 식별 가능
 * 
 * @param {number|string} itemId - 선택된 항목의 ID
 *   - 예: 사용자 ID (123), 의사 ID (456), 병원 ID (789)
 *   - 숫자 또는 문자열 형식
 * 
 * @param {string} paramName - URL 파라미터 이름
 *   - 'user_id': 사용자 목록 페이지
 *   - 'doctor_id': 의사 목록 페이지
 *   - 'hospital_id': 병원 목록 페이지
 *   - 목적: 어떤 타입의 항목인지 구분하여 올바른 data 속성 생성
 * 
 * @returns {void} - 반환값 없음
 */
function updateSelectedRowStyle(itemId, paramName) {
  // ========= 모든 행에서 selected 클래스 제거 =========
  // 목적: 단일 선택 모드를 구현하기 위해 모든 행에서 선택 표시 제거
  //   - 이전에 선택된 행이 있으면 선택 표시를 제거
  //   - 새로 선택된 행만 선택 표시를 추가
  //   - 사용자 경험(UX) 개선: 한 번에 하나의 행만 선택되도록 보장
  
  // document.querySelectorAll(...): CSS 선택자로 모든 일치하는 요소를 찾는 메서드
  //   - '.user-row, .doctor-row, .hospital-row, .approval-row': 여러 클래스 중 하나라도 일치하는 요소 선택
  //     → 쉼표(,)로 구분된 선택자는 OR 조건 (하나라도 일치하면 선택)
  //   - 반환값: NodeList 객체 (유사 배열, 모든 일치하는 요소들의 집합)
  //   - 예: [<tr class="user-row">, <tr class="doctor-row">, ...]
  const allRows = document.querySelectorAll('.user-row, .doctor-row, .hospital-row, .approval-row');
  
  // allRows.forEach(row => {...}): NodeList의 각 요소를 순회하며 처리
  //   - row: 현재 처리 중인 행 요소 (Element 객체)
  //   - 화살표 함수: 간결한 함수 표현식
  allRows.forEach(row => {
    // row.classList.remove('selected'): 요소에서 'selected' 클래스 제거
    //   - classList: 요소의 클래스 목록을 관리하는 DOMTokenList 객체
    //   - remove('selected'): 'selected' 클래스를 제거
    //   - 동작: 클래스가 없으면 아무 동작도 하지 않음 (에러 발생 안 함)
    //   - 목적: 모든 행에서 선택 표시를 제거하여 초기화
    row.classList.remove('selected');
  });
  
  // ========= 선택된 행에 selected 클래스 추가 =========
  // 목적: 사용자가 클릭한 행에 'selected' 클래스를 추가하여 시각적으로 강조 표시
  //   - data 속성을 사용하여 특정 ID를 가진 행을 찾음
  //   - 찾은 행에 'selected' 클래스를 추가
  
  // dataAttribute: 선택된 행을 찾기 위한 data 속성 문자열
  //   - 초기값: 빈 문자열 (아직 설정되지 않음)
  //   - 나중에 paramName에 따라 적절한 data 속성으로 설정됨
  let dataAttribute = '';
  
  // ========= paramName에 따라 data 속성 생성 =========
  // 목적: 어떤 타입의 항목인지에 따라 올바른 data 속성 이름 생성
  //   - HTML 요소에 data-* 속성으로 ID가 저장되어 있음
  //   - 예: <tr data-user-id="123">, <tr data-doctor-id="456">
  
  // paramName === 'user_id': 사용자 목록 페이지인 경우
  if (paramName === 'user_id') {
    // data-user-id="${itemId}": 사용자 ID를 가진 data 속성 생성
    //   - 템플릿 리터럴: 백틱(`)을 사용한 문자열 보간
    //   - ${itemId}: itemId 변수의 값을 문자열에 삽입
    //   - 예: itemId=123 → 'data-user-id="123"'
    dataAttribute = `data-user-id="${itemId}"`;
  } else if (paramName === 'doctor_id') {
    // paramName === 'doctor_id': 의사 목록 페이지인 경우
    // data-doctor-id="${itemId}": 의사 ID를 가진 data 속성 생성
    //   - 예: itemId=456 → 'data-doctor-id="456"'
    dataAttribute = `data-doctor-id="${itemId}"`;
  } else if (paramName === 'hospital_id') {
    // paramName === 'hospital_id': 병원 목록 페이지인 경우
    // data-hospital-id="${itemId}": 병원 ID를 가진 data 속성 생성
    //   - 예: itemId=789 → 'data-hospital-id="789"'
    dataAttribute = `data-hospital-id="${itemId}"`;
  }
  // 주의: paramName이 위의 세 가지 중 하나가 아니면 dataAttribute는 빈 문자열로 유지됨
  
  // ========= 선택된 행 찾기 및 selected 클래스 추가 =========
  // dataAttribute: data 속성이 생성되었는지 확인
  //   - 빈 문자열('')이 아니면 truthy이므로 true
  //   - 빈 문자열이면 falsy이므로 false
  //   - 목적: 유효한 paramName인 경우에만 행을 찾도록 보장
  if (dataAttribute) {
    // document.querySelector(`[${dataAttribute}]`): 속성 선택자로 요소 찾기
    //   - `[${dataAttribute}]`: 속성 선택자 (대괄호 사용)
    //   - 예: '[data-user-id="123"]' → data-user-id 속성이 "123"인 요소 선택
    //   - 반환값: 첫 번째로 일치하는 요소 (Element 객체) 또는 null (없으면)
    //   - 목적: 선택된 항목의 ID를 가진 행을 찾기
    const selectedRow = document.querySelector(`[${dataAttribute}]`);
    
    // selectedRow: 행이 존재하는지 확인
    //   - null이 아니면 truthy이므로 true
    //   - null이면 falsy이므로 false
    //   - 목적: 행이 실제로 존재하는 경우에만 클래스 추가
    //   - 이유: 페이지네이션 등으로 인해 해당 행이 현재 페이지에 없을 수 있음
    if (selectedRow) {
      // selectedRow.classList.add('selected'): 요소에 'selected' 클래스 추가
      //   - classList: 요소의 클래스 목록을 관리하는 DOMTokenList 객체
      //   - add('selected'): 'selected' 클래스를 추가
      //   - 동작: 클래스가 이미 있으면 중복 추가하지 않음
      //   - 목적: 선택된 행을 시각적으로 강조 표시
      //   - CSS에서 .selected 클래스로 스타일링 (예: 배경색 변경, 테두리 추가 등)
      selectedRow.classList.add('selected');
    }
    // 주의: selectedRow가 null이면 아무 동작도 하지 않음 (에러 발생 안 함)
    //   - 페이지네이션으로 인해 해당 행이 다른 페이지에 있을 수 있음
  }
  // 주의: dataAttribute가 빈 문자열이면 아무 동작도 하지 않음
  //   - paramName이 'user_id', 'doctor_id', 'hospital_id' 중 하나가 아닌 경우
}

/**
 * 체크박스 전체 선택/해제
 * 
 * 목적: "전체 선택" 체크박스를 클릭하면 모든 개별 체크박스를 한 번에 선택/해제
 *   - 사용자 경험(UX) 개선: 여러 항목을 빠르게 선택할 수 있음
 *   - 일괄 작업 지원: 선택된 항목들을 한 번에 삭제, 승인, 거절 등 처리 가능
 *   - 사용 예: 승인 대기 목록에서 여러 의사를 한 번에 승인/거절
 *            1:1 문의 목록에서 여러 문의를 한 번에 삭제
 * 
 * @param {string} selectAllId - "전체 선택" 체크박스의 ID
 *   - 예: 'select-all-users', 'select-all-doctors', 'select-all-qnas'
 *   - document.getElementById()로 요소를 찾기 위해 사용
 * 
 * @param {string} checkboxName - 개별 체크박스의 name 속성 값
 *   - 예: 'user_ids', 'doctor_ids', 'qna_ids'
 *   - document.querySelectorAll()로 모든 개별 체크박스를 찾기 위해 사용
 *   - 같은 name을 가진 모든 체크박스를 선택
 * 
 * @returns {void} - 반환값 없음
 */
function toggleSelectAll(selectAllId, checkboxName) {
  // ========= "전체 선택" 체크박스 요소 조회 =========
  // 목적: 사용자가 클릭한 "전체 선택" 체크박스의 상태를 확인
  //   - 이 체크박스의 checked 상태에 따라 모든 개별 체크박스를 동기화
  // 
  // document.getElementById(selectAllId): ID로 요소를 찾는 메서드
  //   - selectAllId: 찾을 요소의 ID (문자열)
  //   - 반환값: 첫 번째로 일치하는 요소 (Element 객체) 또는 null (없으면)
  //   - 예: selectAllId='select-all-users' → <input type="checkbox" id="select-all-users">
  //   - 주의: ID는 문서 내에서 고유해야 함
  const selectAllCheckbox = document.getElementById(selectAllId);
  
  // ========= 모든 개별 체크박스 요소 조회 =========
  // 목적: 선택/해제할 모든 개별 체크박스를 찾기
  //   - 같은 name 속성을 가진 모든 체크박스를 선택
  //   - 예: name="user_ids"인 모든 체크박스
  // 
  // document.querySelectorAll(`input[name="${checkboxName}"]`): CSS 선택자로 모든 일치하는 요소를 찾는 메서드
  //   - `input[name="${checkboxName}"]`: 속성 선택자
  //     → input: input 요소
  //     → [name="${checkboxName}"]: name 속성이 checkboxName과 일치하는 요소
  //     → 템플릿 리터럴: 백틱(`)을 사용한 문자열 보간
  //     → ${checkboxName}: checkboxName 변수의 값을 문자열에 삽입
  //   - 예: checkboxName='user_ids' → 'input[name="user_ids"]'
  //   - 반환값: NodeList 객체 (유사 배열, 모든 일치하는 요소들의 집합)
  //   - 예: [<input name="user_ids" value="1">, <input name="user_ids" value="2">, ...]
  const checkboxes = document.querySelectorAll(`input[name="${checkboxName}"]`);
  
  // ========= 모든 개별 체크박스 상태 동기화 =========
  // 목적: "전체 선택" 체크박스의 상태에 따라 모든 개별 체크박스를 선택/해제
  //   - "전체 선택"이 체크되면 → 모든 개별 체크박스 체크
  //   - "전체 선택"이 해제되면 → 모든 개별 체크박스 해제
  // 
  // checkboxes.forEach(checkbox => {...}): NodeList의 각 요소를 순회하며 처리
  //   - checkbox: 현재 처리 중인 체크박스 요소 (HTMLInputElement 객체)
  //   - 화살표 함수: 간결한 함수 표현식
  checkboxes.forEach(checkbox => {
    // checkbox.checked: 체크박스의 선택 상태를 설정
    //   - selectAllCheckbox.checked: "전체 선택" 체크박스의 현재 상태 (true 또는 false)
    //   - true: 체크됨 (선택됨)
    //   - false: 체크 해제됨 (선택 안 됨)
    //   - 동작: 개별 체크박스의 상태를 "전체 선택" 체크박스의 상태와 동일하게 설정
    //   - 예: selectAllCheckbox.checked=true → checkbox.checked=true (모든 체크박스 선택)
    //   - 예: selectAllCheckbox.checked=false → checkbox.checked=false (모든 체크박스 해제)
    checkbox.checked = selectAllCheckbox.checked;
  });
  
  // ========= 선택된 항목 업데이트 (선택적) =========
  // 목적: 체크박스 상태가 변경되었으므로 선택된 항목 목록을 업데이트
  //   - 일부 페이지에서는 선택된 항목의 개수나 목록을 표시할 수 있음
  //   - 예: "3개 항목 선택됨" 같은 메시지 표시
  //   - 예: 선택된 항목 ID 목록을 저장하여 삭제/승인 등에 사용
  // 
  // typeof updateSelectedItems === 'function': updateSelectedItems 함수가 존재하는지 확인
  //   - typeof: 변수나 표현식의 타입을 반환하는 연산자
  //   - 'function': 함수 타입을 나타내는 문자열
  //   - === 'function': 타입이 함수인지 확인
  //   - 목적: updateSelectedItems 함수가 정의되어 있는지 확인 (옵셔널 체이닝)
  //   - 이유: 모든 페이지에서 이 함수가 정의되어 있지 않을 수 있음
  //     → 함수가 없으면 에러 발생하지 않도록 사전 확인
  if (typeof updateSelectedItems === 'function') {
    // updateSelectedItems(): 선택된 항목 목록을 업데이트하는 함수 호출
    //   - 이 함수는 각 페이지에서 별도로 정의될 수 있음
    //   - 예: 선택된 항목의 개수를 표시하는 함수
    //   - 예: 선택된 항목 ID 목록을 저장하는 함수
    //   - 예: 삭제/승인 버튼의 활성화 상태를 업데이트하는 함수
    //   - 반환값: 없음 (void) 또는 업데이트된 항목 목록
    updateSelectedItems();
  }
  // 주의: updateSelectedItems 함수가 없으면 아무 동작도 하지 않음 (에러 발생 안 함)
  //   - 일부 페이지에서는 이 함수가 필요하지 않을 수 있음
}

/**
 * 선택된 항목 ID 목록 반환
 * 
 * 목적: 체크박스로 선택된 모든 항목의 ID를 배열로 반환
 *   - 일괄 작업(삭제, 승인, 거절 등)을 위해 선택된 항목 ID 목록이 필요할 때 사용
 *   - 사용 예: 승인 대기 목록에서 여러 의사를 한 번에 승인/거절
 *            1:1 문의 목록에서 여러 문의를 한 번에 삭제
 *   - 서버로 전송할 때 쉼표로 구분된 문자열로 변환 가능
 * 
 * @param {string} checkboxName - 개별 체크박스의 name 속성 값
 *   - 예: 'user_ids', 'doctor_ids', 'qna_ids'
 *   - document.querySelectorAll()로 모든 선택된 체크박스를 찾기 위해 사용
 * 
 * @returns {Array<string>} - 선택된 항목 ID들의 배열
 *   - 예: ['1', '2', '3'] (체크박스의 value 속성 값들)
 *   - 빈 배열: 선택된 항목이 없으면 []
 *   - 주의: value는 문자열이므로 숫자로 변환이 필요하면 parseInt() 또는 Number() 사용
 * 
 * @example
 * // 사용 예시
 * const selectedIds = getSelectedItemIds('user_ids');
 * // selectedIds = ['1', '2', '3']
 * 
 * // 서버로 전송할 때 쉼표로 구분된 문자열로 변환
 * const idsString = selectedIds.join(',');
 * // idsString = '1,2,3'
 */
function getSelectedItemIds(checkboxName) {
  // ========= 선택된 체크박스 요소 조회 =========
  // 목적: 체크된(checked) 상태인 모든 체크박스를 찾기
  //   - :checked 가상 클래스 선택자를 사용하여 선택된 체크박스만 필터링
  // 
  // document.querySelectorAll(`input[name="${checkboxName}"]:checked`)
  //   - `input[name="${checkboxName}"]:checked`: CSS 선택자
  //     → input: input 요소
  //     → [name="${checkboxName}"]: name 속성이 checkboxName과 일치하는 요소
  //     → :checked: 체크된(checked) 상태인 요소만 선택 (가상 클래스 선택자)
  //     → 템플릿 리터럴: 백틱(`)을 사용한 문자열 보간
  //     → ${checkboxName}: checkboxName 변수의 값을 문자열에 삽입
  //   - 예: checkboxName='user_ids' → 'input[name="user_ids"]:checked'
  //   - 반환값: NodeList 객체 (유사 배열, 모든 일치하는 요소들의 집합)
  //   - 예: [<input name="user_ids" value="1" checked>, <input name="user_ids" value="2" checked>, ...]
  //   - 주의: 선택된 체크박스가 없으면 빈 NodeList 반환
  const checkboxes = document.querySelectorAll(`input[name="${checkboxName}"]:checked`);
  
  // ========= 체크박스 value 값들을 배열로 변환 =========
  // Array.from(checkboxes): NodeList를 배열로 변환
  //   - NodeList는 유사 배열이지만 배열 메서드(map, filter 등)를 직접 사용할 수 없음
  //   - Array.from(): 유사 배열을 실제 배열로 변환
  //   - 반환값: 배열 [<input>, <input>, ...]
  // 
  // .map(cb => cb.value): 각 체크박스의 value 속성 값을 추출
  //   - map(): 배열의 각 요소를 변환하여 새 배열 생성
  //   - cb: 현재 처리 중인 체크박스 요소 (HTMLInputElement 객체)
  //   - cb.value: 체크박스의 value 속성 값 (문자열)
  //     → 예: <input name="user_ids" value="1"> → '1'
  //     → 예: <input name="user_ids" value="123"> → '123'
  //   - 반환값: value 값들의 배열
  //   - 예: ['1', '2', '3']
  // 
  // 최종 반환값: 선택된 항목 ID들의 배열
  //   - 예: ['1', '2', '3'] (선택된 항목이 3개인 경우)
  //   - 예: [] (선택된 항목이 없는 경우)
  return Array.from(checkboxes).map(cb => cb.value);
}

/**
 * 정렬 URL 생성
 * 
 * 목적: 정렬 기능을 위한 URL을 생성하면서 검색 파라미터를 유지
 *   - 사용자가 정렬 버튼을 클릭하면 새로운 정렬 URL로 이동
 *   - 검색 조건은 유지하면서 정렬만 변경
 *   - 정렬 시 첫 페이지로 이동 (페이지 번호 제거)
 *   - 사용자 경험(UX) 개선: 검색 결과를 정렬할 때 검색어가 유지됨
 * 
 * @param {string} sortField - 정렬할 필드 이름
 *   - 예: 'name', 'created_at', 'email', 'doctor_id' 등
 *   - 서버에서 이 필드를 기준으로 정렬
 * 
 * @param {string} currentSort - 현재 정렬 필드 이름
 *   - 예: 'name', 'created_at' 등
 *   - 빈 문자열일 수 있음 (정렬이 선택되지 않은 경우)
 *   - 목적: 같은 필드를 다시 클릭하면 정렬 방향을 토글하기 위함
 * 
 * @param {string} currentOrder - 현재 정렬 방향
 *   - 'asc': 오름차순 (작은 값 → 큰 값)
 *   - 'desc': 내림차순 (큰 값 → 작은 값)
 *   - 기본값: 'desc' (최신순)
 *   - 목적: 같은 필드를 다시 클릭하면 정렬 방향을 토글하기 위함
 * 
 * @returns {string} - 정렬 파라미터가 추가된 URL 문자열
 *   - 예: 'http://localhost:8000/admin_panel/users/?sort=name&order=asc&search_type=name&search_keyword=김'
 *   - 검색 파라미터가 유지됨
 *   - 페이지 번호는 제거됨 (정렬 시 첫 페이지로)
 * 
 * @example
 * // 사용 예시
 * const url = getSortUrl('name', 'created_at', 'desc');
 * // 현재 정렬: created_at (내림차순)
 * // 새 정렬: name (오름차순) - 다른 필드이므로 오름차순으로 시작
 * 
 * const url2 = getSortUrl('name', 'name', 'asc');
 * // 현재 정렬: name (오름차순)
 * // 새 정렬: name (내림차순) - 같은 필드이므로 토글
 */
function getSortUrl(sortField, currentSort, currentOrder) {
  // ========= 현재 URL 객체 생성 =========
  // new URL(window.location.href): 현재 페이지의 URL을 URL 객체로 변환
  //   - window.location.href: 현재 페이지의 전체 URL (문자열)
  //     → 예: 'http://localhost:8000/admin_panel/users/?search_type=name&search_keyword=김&page=2'
  //   - 반환값: URL 객체 (URL의 각 부분에 접근 가능)
  //     → url.searchParams: URL의 쿼리 파라미터를 관리하는 URLSearchParams 객체
  //   - 목적: 현재 URL의 파라미터를 읽고 수정하기 위함
  const url = new URL(window.location.href);
  
  // ========= 검색 파라미터 읽기 (나중에 유지하기 위함) =========
  // 목적: 정렬을 변경해도 검색 조건은 유지
  //   - 사용자가 검색한 후 정렬을 변경하면 검색 결과가 유지되어야 함
  //   - 사용자 경험(UX) 개선: 검색과 정렬을 함께 사용 가능
  // 
  // url.searchParams.get('search_type'): URL에서 'search_type' 파라미터 값 가져오기
  //   - 반환값: 파라미터 값 (문자열) 또는 null (없으면)
  //   - || '': null이면 빈 문자열로 변환 (나중에 조건문에서 사용하기 위함)
  //   - 예: '?search_type=name' → 'name'
  //   - 예: 파라미터 없음 → ''
  const searchType = url.searchParams.get('search_type') || '';
  
  // url.searchParams.get('search_keyword'): URL에서 'search_keyword' 파라미터 값 가져오기
  //   - 반환값: 파라미터 값 (문자열) 또는 null (없으면)
  //   - || '': null이면 빈 문자열로 변환
  //   - 예: '?search_keyword=김철수' → '김철수'
  //   - 예: 파라미터 없음 → ''
  const searchKeyword = url.searchParams.get('search_keyword') || '';
  
  // ========= 정렬 방향 결정 (같은 필드면 토글, 다르면 오름차순) =========
  // 목적: 사용자가 같은 정렬 필드를 다시 클릭하면 정렬 방향을 토글
  //   - 예: 'name' 오름차순 → 'name' 내림차순
  //   - 예: 'name' 내림차순 → 'name' 오름차순
  //   - 다른 필드를 클릭하면 오름차순으로 시작
  //   - 사용자 경험(UX) 개선: 직관적인 정렬 동작
  // 
  // newOrder: 새로운 정렬 방향 (기본값: 'asc' 오름차순)
  //   - 'asc': 오름차순 (작은 값 → 큰 값, A → Z, 오래된 것 → 최신)
  //   - 'desc': 내림차순 (큰 값 → 작은 값, Z → A, 최신 → 오래된 것)
  let newOrder = 'asc';
  
  // currentSort === sortField && currentOrder === 'asc': 같은 필드이고 오름차순인 경우
  //   - currentSort === sortField: 현재 정렬 필드와 새 정렬 필드가 같음
  //     → 예: currentSort='name', sortField='name' → true
  //   - currentOrder === 'asc': 현재 정렬 방향이 오름차순
  //     → 예: currentOrder='asc' → true
  //   - &&: 두 조건이 모두 true여야 true
  //   - 목적: 같은 필드를 오름차순으로 정렬 중이면 내림차순으로 토글
  if (currentSort === sortField && currentOrder === 'asc') {
    // newOrder = 'desc': 정렬 방향을 내림차순으로 변경
    //   - 같은 필드를 다시 클릭했고 현재 오름차순이므로 내림차순으로 토글
    //   - 예: 'name' 오름차순 → 'name' 내림차순
    newOrder = 'desc';
  }
  // 주의: 다른 필드를 클릭하거나 현재 내림차순이면 newOrder는 'asc'로 유지됨
  //   - 다른 필드: 오름차순으로 시작
  //   - 같은 필드 + 내림차순: 오름차순으로 토글 (다음 클릭 시)
  
  // ========= URL 파라미터 설정 =========
  // url.searchParams.set('sort', sortField): 정렬 필드 파라미터 설정
  //   - 'sort': URL 파라미터 이름
  //   - sortField: 정렬할 필드 이름 (예: 'name', 'created_at')
  //   - 동작: 파라미터가 이미 있으면 업데이트, 없으면 추가
  //   - 예: url.searchParams.set('sort', 'name') → '?sort=name'
  url.searchParams.set('sort', sortField);
  
  // url.searchParams.set('order', newOrder): 정렬 방향 파라미터 설정
  //   - 'order': URL 파라미터 이름
  //   - newOrder: 정렬 방향 ('asc' 또는 'desc')
  //   - 동작: 파라미터가 이미 있으면 업데이트, 없으면 추가
  //   - 예: url.searchParams.set('order', 'asc') → '?sort=name&order=asc'
  url.searchParams.set('order', newOrder);
  
  // ⭐ 중요: 정렬 시 상세 정보 ID 파라미터 제거
  // 목적: 정렬 시 상세 정보가 열린 상태를 초기화하여 목록 중심으로 동작하도록 함
  //   - 정렬 = "목록 기준 동작"으로 강제
  //   - 상세 정보가 열려있어도 정렬 시 닫히고 정렬된 목록만 표시
  url.searchParams.delete('user_id');
  url.searchParams.delete('doctor_id');
  url.searchParams.delete('hospital_id');
  
  // ⭐ 수정: 정렬 시 현재 페이지 번호 유지
  //   - 목적: 사용자가 현재 보고 있는 페이지를 유지하면서 정렬 변경
  //   - 사용자 경험(UX) 개선: 3페이지에서 정렬하면 3페이지를 유지하면서 정렬된 결과 표시
  //   - 예: '?sort=name&order=asc&page=3' → '?sort=name&order=asc&page=3' (page 유지)
  //   - 주의: 페이지 번호를 제거하지 않으므로 현재 페이지가 URL에 있으면 그대로 유지됨
  // url.searchParams.delete('page'); // 정렬 시 첫 페이지로 (주석 처리: 현재 페이지 유지)
  
  // ========= 검색 파라미터 유지 =========
  // 목적: 정렬을 변경해도 검색 조건은 유지
  //   - 사용자가 검색한 후 정렬을 변경하면 검색 결과가 유지되어야 함
  //   - 사용자 경험(UX) 개선: 검색과 정렬을 함께 사용 가능
  // 
  // searchType: 검색 타입이 있는 경우에만 URL에 추가
  //   - truthy 값이면 파라미터 추가, falsy 값('', null, undefined)이면 추가 안 함
  if (searchType) {
    // url.searchParams.set('search_type', searchType): 검색 타입 파라미터 설정
    //   - 'search_type': URL 파라미터 이름
    //   - searchType: 검색 타입 (예: 'name', 'email', 'phone')
    //   - 동작: 파라미터가 이미 있으면 업데이트, 없으면 추가
    //   - 예: url.searchParams.set('search_type', 'name') → '?sort=name&order=asc&search_type=name'
    url.searchParams.set('search_type', searchType);
  }
  
  // searchKeyword: 검색어가 있는 경우에만 URL에 추가
  //   - truthy 값이면 파라미터 추가, falsy 값('', null, undefined)이면 추가 안 함
  if (searchKeyword) {
    // url.searchParams.set('search_keyword', searchKeyword): 검색어 파라미터 설정
    //   - 'search_keyword': URL 파라미터 이름
    //   - searchKeyword: 검색어 (예: '김철수', 'test@example.com')
    //   - 동작: 파라미터가 이미 있으면 업데이트, 없으면 추가
    //   - 예: url.searchParams.set('search_keyword', '김철수') → '?sort=name&order=asc&search_type=name&search_keyword=김철수'
    url.searchParams.set('search_keyword', searchKeyword);
  }
  
  // ========= URL 문자열로 변환하여 반환 =========
  // url.toString(): URL 객체를 문자열로 변환
  //   - 반환값: 전체 URL 문자열
  //   - 예: 'http://localhost:8000/admin_panel/users/?sort=name&order=asc&search_type=name&search_keyword=김철수'
  //   - 목적: window.location.href에 할당하거나 링크의 href 속성에 사용
  return url.toString();
}

/**
 * 정렬 링크 클릭 핸들러
 * 
 * 목적: 정렬 버튼 클릭 시 정렬 URL을 생성하고 페이지를 이동
 *   - 사용자가 테이블 헤더의 정렬 버튼을 클릭하면 실행
 *   - 검색 조건을 유지하면서 정렬만 변경
 *   - 사용자 경험(UX) 개선: 검색 결과를 정렬할 때 검색어가 유지됨
 * 
 * @param {string} sortField - 정렬할 필드 이름
 *   - 예: 'name', 'created_at', 'email', 'doctor_id' 등
 *   - 사용자가 클릭한 정렬 버튼의 필드
 * 
 * @param {string} currentSortField - 현재 정렬 필드 이름
 *   - 예: 'name', 'created_at' 등
 *   - 빈 문자열일 수 있음 (정렬이 선택되지 않은 경우)
 *   - 템플릿에서 전달되는 값 (Django context)
 * 
 * @param {string} currentSortOrder - 현재 정렬 방향
 *   - 'asc': 오름차순
 *   - 'desc': 내림차순
 *   - 빈 문자열일 수 있음 (정렬이 선택되지 않은 경우)
 *   - 템플릿에서 전달되는 값 (Django context)
 * 
 * @returns {void} - 반환값 없음 (페이지 이동으로 함수 종료)
 */
function handleSortClick(sortField, currentSortField, currentSortOrder) {
  // ========= 파라미터 기본값 처리 =========
  // 목적: 템플릿에서 전달된 값이 빈 문자열이거나 undefined일 수 있으므로 기본값 설정
  //   - Django 템플릿에서 변수가 없으면 빈 문자열('')로 전달될 수 있음
  //   - JavaScript에서 빈 문자열은 falsy이므로 || 연산자로 기본값 설정 가능
  // 
  // currentSortField || '': currentSortField가 falsy이면 빈 문자열 사용
  //   - falsy 값: '', null, undefined, 0, false, NaN
  //   - truthy 값: 'name', 'created_at' 등
  //   - 예: currentSortField='' → actualCurrentSort=''
  //   - 예: currentSortField='name' → actualCurrentSort='name'
  //   - 예: currentSortField=null → actualCurrentSort=''
  //   - 목적: getSortUrl 함수에 안전하게 전달하기 위함
  const actualCurrentSort = currentSortField || '';
  
  // currentSortOrder || 'desc': currentSortOrder가 falsy이면 'desc' 사용
  //   - falsy 값: '', null, undefined, 0, false, NaN
  //   - truthy 값: 'asc', 'desc'
  //   - 예: currentSortOrder='' → actualCurrentOrder='desc' (기본값)
  //   - 예: currentSortOrder='asc' → actualCurrentOrder='asc'
  //   - 예: currentSortOrder=null → actualCurrentOrder='desc' (기본값)
  //   - 목적: 정렬이 선택되지 않은 경우 기본적으로 내림차순(최신순)으로 설정
  //   - 이유: 대부분의 경우 최신 데이터를 먼저 보여주는 것이 자연스러움
  const actualCurrentOrder = currentSortOrder || 'desc';
  
  // 정렬 방향 결정 (같은 필드면 토글, 다르면 오름차순)
  const nextOrder = (actualCurrentSort === sortField && actualCurrentOrder === 'asc') ? 'desc' : 'asc';
  
  // ========= 승인대기 페이지 정렬 처리 (목록 AJAX 갱신) =========
  // 목적: 승인대기 페이지는 정렬 시 상세 영역만 갱신되는 구조라서
  //       목록을 강제로 AJAX로 갱신하도록 분기 처리
  //   - 승인대기 페이지: selectItem() 기반으로 상세 영역만 갱신하는 구조
  //   - 정렬 시 목록이 갱신되지 않는 문제 해결
  //   - doctor_id 파라미터를 제거하여 상세 열린 상태를 초기화
  //   - 검색 파라미터는 자동으로 유지됨 (URLSearchParams가 현재 URL의 모든 파라미터를 포함)
  if (window.location.pathname.includes('approval_pending')) {
    // URL 파라미터 생성 (현재 URL의 모든 파라미터 포함, 검색 파라미터 자동 유지)
    const params = new URLSearchParams(window.location.search);
    params.set('sort', sortField);
    params.set('order', nextOrder);
    params.delete('doctor_id'); // ⭐ 중요: 상세 열린 상태 제거 (정렬 = "목록 기준 동작"으로 강제)
    // ⭐ 수정: 정렬 시 현재 페이지 번호 유지
    //   - 목적: 사용자가 현재 보고 있는 페이지를 유지하면서 정렬 변경
    //   - 사용자 경험(UX) 개선: 3페이지에서 정렬하면 3페이지를 유지하면서 정렬된 결과 표시
    // params.delete('page'); // 정렬 시 첫 페이지로 (주석 처리: 현재 페이지 유지)
    
    // AJAX 요청으로 목록 갱신
    fetch(window.location.pathname + '?' + params.toString(), {
      headers: {
        'X-Requested-With': 'XMLHttpRequest'
      }
    })
    .then(res => res.text())
    .then(html => {
      // 임시 DOM 요소 생성 및 HTML 파싱
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      
      // 테이블 컨테이너 업데이트
      const tableContainer = document.querySelector('.table-container');
      const newTableContainer = tempDiv.querySelector('.table-container');
      if (tableContainer && newTableContainer) {
        tableContainer.innerHTML = newTableContainer.innerHTML;
      }
      
      // 페이지네이션 업데이트
      const paginationContainer = document.querySelector('.pagination, nav[aria-label="Page navigation"]');
      const newPaginationContainer = tempDiv.querySelector('.pagination, nav[aria-label="Page navigation"]');
      if (paginationContainer && newPaginationContainer) {
        paginationContainer.innerHTML = newPaginationContainer.innerHTML;
      } else if (paginationContainer && !newPaginationContainer) {
        paginationContainer.innerHTML = '';
      }
      
      // 상세 정보 섹션 제거 (정렬 시 초기화)
      const detailSection = document.querySelector('.approval-detail-section');
      if (detailSection) {
        detailSection.remove();
      }
      
      // 이벤트 리스너 재연결
      if (typeof window.reattachTableRowListeners === 'function') {
        window.reattachTableRowListeners();
      }
      if (paginationContainer) {
        attachPaginationListeners();
      }
      attachSortListeners();
      if (typeof attachCheckboxListeners === 'function') {
        attachCheckboxListeners();
      }
      if (typeof attachButtonListeners === 'function') {
        attachButtonListeners();
      }
      
      // URL 업데이트
      window.history.pushState({}, '', window.location.pathname + '?' + params.toString());
    })
    .catch(error => {
      console.error('정렬 요청 오류:', error);
    });
    
    return; // 승인대기 페이지 처리는 여기서 종료
  }
  
  // ========= 정렬 URL 생성 (그 외 페이지) =========
  // getSortUrl(sortField, actualCurrentSort, actualCurrentOrder): 정렬 URL 생성 함수 호출
  //   - sortField: 정렬할 필드 이름
  //   - actualCurrentSort: 현재 정렬 필드 (기본값 처리됨)
  //   - actualCurrentOrder: 현재 정렬 방향 (기본값 처리됨)
  //   - 반환값: 정렬 파라미터가 추가된 URL 문자열
  //     → 예: 'http://localhost:8000/admin_panel/users/?sort=name&order=asc&search_type=name&search_keyword=김'
  //   - 동작:
  //     1. 현재 URL의 검색 파라미터 읽기
  //     2. 정렬 방향 결정 (같은 필드면 토글, 다르면 오름차순)
  //     3. 정렬 파라미터 설정
  //     4. 페이지 번호 제거 (정렬 시 첫 페이지로)
  //     5. 검색 파라미터 유지
  const url = getSortUrl(sortField, actualCurrentSort, actualCurrentOrder);
  
  // ========= AJAX POST 요청으로 정렬 처리 =========
  // URL 파싱 및 FormData 생성
  const urlObj = new URL(url, window.location.origin);
  const formData = new FormData();
  
  // URL 파라미터를 FormData에 추가
  urlObj.searchParams.forEach((value, key) => {
    formData.append(key, value);
  });
  
  // CSRF 토큰 추가
  const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || 
                    document.querySelector('input[name="csrfmiddlewaretoken"]')?.value ||
                    '';
  if (csrfToken) {
    formData.append('csrfmiddlewaretoken', csrfToken);
  }
  
  // 현재 스크롤 위치 저장
  const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
  
  // AJAX 요청
  fetch(urlObj.pathname, {
    method: 'POST',
    body: formData,
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
    }
  })
  .then(response => {
    if (response.headers.get('content-type')?.includes('text/html')) {
      return response.text();
    }
    return response.json();
  })
  .then(data => {
    // HTML 응답인 경우
    if (typeof data === 'string') {
      // 임시 DOM 요소 생성 및 HTML 파싱
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = data;
      
      // 테이블 컨테이너 업데이트
      const tableContainer = document.querySelector('.table-container');
      const newTableContainer = tempDiv.querySelector('.table-container');
      if (tableContainer && newTableContainer) {
        tableContainer.innerHTML = newTableContainer.innerHTML;
      }
      
      // 페이지네이션 업데이트
      const paginationContainer = document.querySelector('.pagination, nav[aria-label="Page navigation"]');
      const newPaginationContainer = tempDiv.querySelector('.pagination, nav[aria-label="Page navigation"]');
      if (paginationContainer && newPaginationContainer) {
        paginationContainer.innerHTML = newPaginationContainer.innerHTML;
      } else if (paginationContainer && !newPaginationContainer) {
        paginationContainer.innerHTML = '';
      }
      
      // 상세 정보 섹션 제거 (정렬 시 초기화)
      const detailSection = document.querySelector('.user-detail-section, .doctor-detail-section, .hospital-detail-section, .approval-detail-section');
      if (detailSection) {
        detailSection.remove();
      }
      
      // 페이지네이션 리스너 재연결 (페이지네이션 컨테이너가 있을 때만)
      // paginationContainer는 위에서 이미 선언되었으므로 재사용
      if (paginationContainer) {
        attachPaginationListeners();
      }
      
      // 정렬 링크 리스너 재연결
      attachSortListeners();
      
      // 테이블 행 리스너 재연결
      if (typeof window.reattachTableRowListeners === 'function') {
        window.reattachTableRowListeners();
      }
      
      // 스크롤 위치 복원
      window.scrollTo(0, currentScrollPosition);
      
      // URL 업데이트 (히스토리 관리, 쿼리 파라미터 유지)
      // urlObj.toString() 또는 url을 사용하여 정렬 파라미터를 URL에 유지
      window.history.pushState({}, '', urlObj.toString());
    }
  })
  .catch(error => {
    console.error('정렬 요청 오류:', error);
    // 에러 발생 시 기본 이동으로 폴백
    window.location.href = url;
  });
}

/**
 * 범용 테이블 행 클릭 이벤트 연결 함수
 * 
 * 목적: 테이블 행에 클릭 이벤트 리스너를 연결하는 공통 함수
 *   - 코드 재사용: 여러 목록 페이지에서 동일한 로직을 재사용
 *   - 유지보수성: 공통 로직 변경 시 모든 페이지에 자동 반영
 * 
 * @param {string} rowSelector - 테이블 행 선택자 (예: '.user-row[data-user-id]')
 * @param {string} dataAttrName - 데이터 속성 이름 (예: 'data-user-id')
 * @param {Function} selectFunction - 선택 함수 (예: selectUser, selectDoctor, selectHospital)
 * 
 * @example
 * attachTableRowListeners('.user-row[data-user-id]', 'data-user-id', selectUser);
 */
function attachTableRowListeners(rowSelector, dataAttrName, selectFunction) {
  const rows = document.querySelectorAll(rowSelector);

  rows.forEach((row) => {
    row.removeEventListener('click', row._clickHandler);
    const itemId = row.getAttribute(dataAttrName);

    if (itemId) {
      // 클릭 이벤트 핸들러
      row._clickHandler = function(e) {
        const target = e.target;
        
        // 체크박스나 버튼은 제외
        if (target.tagName === 'INPUT' || target.tagName === 'BUTTON') {
          return;
        }

        // ⭐️ 페이징 버튼 클릭은 row 클릭 이벤트 무시
        // 승인대기 페이지는 pagination-link 클래스를 사용하므로 추가 확인
        // target이 페이징 링크이거나 페이징 컨테이너 내부에 있으면 즉시 return
        if (target.closest('.pagination') || 
            target.closest('nav[aria-label="Page navigation"]') ||
            target.classList.contains('pagination-link') || 
            target.classList.contains('page-link') ||
            target.closest('.pagination-link') ||
            target.closest('.page-link') ||
            target.tagName === 'A' && (target.classList.contains('pagination-link') || target.classList.contains('page-link'))) {
          console.log('테이블 행 클릭 이벤트: 페이징 버튼 클릭 감지, 무시함', target);
          return; // stopImmediatePropagation 호출 전에 return
        }
        
        // ⭐️ 정렬 버튼 클릭은 row 클릭 이벤트 무시
        // 정렬 링크(a[data-sort-field])를 클릭한 경우 테이블 행 클릭 이벤트를 무시
        if (target.closest('a[data-sort-field]') || target.hasAttribute('data-sort-field')) {
          console.log('테이블 행 클릭 이벤트: 정렬 버튼 클릭 감지, 무시함', target);
          return; // stopImmediatePropagation 호출 전에 return
        }

        // 이벤트 기본 동작 차단
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        // selectFunction 호출
        selectFunction(e, parseInt(itemId));
        
        return false;
      };

      // capture 단계에서 이벤트 리스너 등록 (다른 리스너보다 먼저 실행)
      // 하지만 페이징 링크 클릭 이벤트도 capture 단계에서 실행되므로,
      // 페이징 링크 클릭 이벤트가 먼저 실행되도록 하기 위해 once 옵션 사용하지 않음
      row.addEventListener('click', row._clickHandler, { capture: true });
    }
  });
}

/**
 * 범용 정렬 링크 이벤트 연결 함수
 * 
 * 목적: 테이블 헤더의 정렬 링크에 클릭 이벤트 리스너를 연결하는 공통 함수
 *   - 코드 재사용: 여러 목록 페이지에서 동일한 로직을 재사용
 *   - 유지보수성: 공통 로직 변경 시 모든 페이지에 자동 반영
 * 
 * @example
 * attachSortListeners();
 */
function attachSortListeners() {
  // 이제는 이벤트 위임 방식으로 document에 한 번만 이벤트를 붙이므로
  // 이 함수는 기존 코드와의 호환성을 위해 유지하되, 실제로는 실행되지 않음
  // (이벤트 위임은 DOMContentLoaded에서 한 번만 설정됨)
  // 
  // 기존 코드 정리: 만약 기존에 개별 링크에 이벤트를 붙였다면 제거
  const existingLinks = document.querySelectorAll('a[data-sort-field]');
  existingLinks.forEach(link => {
    if (link._sortHandler) {
      // ✅ addEventListener capture=true로 달았으면, remove도 capture=true로!
      link.removeEventListener('click', link._sortHandler, true);
      link._sortHandler = null;
    }
  });
}

/**
 * 페이지네이션 링크 생성 (검색 파라미터 유지)
 * 
 * 목적: 페이지네이션 링크를 생성하면서 검색 및 정렬 파라미터를 유지
 *   - 사용자가 페이지 번호를 클릭하면 해당 페이지로 이동
 *   - 검색 조건과 정렬 조건은 유지하면서 페이지만 변경
 *   - 사용자 경험(UX) 개선: 검색/정렬 결과를 페이지네이션할 때 조건이 유지됨
 * 
 * @param {number|string} page - 이동할 페이지 번호
 *   - 예: 1, 2, 3 등
 *   - 숫자 또는 문자열 형식
 *   - URL 파라미터로 전달됨
 * 
 * @param {Object} searchParams - 추가로 유지할 파라미터 객체 (선택적)
 *   - 기본값: {} (빈 객체)
 *   - 키: 파라미터 이름 (예: 'search_type', 'search_keyword', 'sort', 'order')
 *   - 값: 파라미터 값 (문자열)
 *   - 목적: 검색, 정렬 등의 파라미터를 유지하기 위함
 *   - 예: {search_type: 'name', search_keyword: '김철수', sort: 'name', order: 'asc'}
 * 
 * @returns {string} - 페이지 번호가 추가된 URL 문자열
 *   - 예: 'http://localhost:8000/admin_panel/users/?page=2&search_type=name&search_keyword=김&sort=name&order=asc'
 *   - 검색 및 정렬 파라미터가 유지됨
 * 
 * @example
 * // 사용 예시
 * const url = getPaginationUrl(2, {
 *   search_type: 'name',
 *   search_keyword: '김철수',
 *   sort: 'name',
 *   order: 'asc'
 * });
 * // 결과: 'http://localhost:8000/admin_panel/users/?page=2&search_type=name&search_keyword=김철수&sort=name&order=asc'
 */
function getPaginationUrl(page, searchParams = {}) {
  // ========= 현재 URL 객체 생성 =========
  // new URL(window.location.href): 현재 페이지의 URL을 URL 객체로 변환
  //   - window.location.href: 현재 페이지의 전체 URL (문자열)
  //     → 예: 'http://localhost:8000/admin_panel/users/?search_type=name&search_keyword=김&page=1'
  //   - 반환값: URL 객체 (URL의 각 부분에 접근 가능)
  //     → url.searchParams: URL의 쿼리 파라미터를 관리하는 URLSearchParams 객체
  //   - 목적: 현재 URL의 파라미터를 읽고 수정하기 위함
  const url = new URL(window.location.href);
  
  // ========= 페이지네이션에 불필요한 파라미터 제거 (핵심 수정) =========
  // 목록을 조회할 때는 상세 정보 ID 파라미터(user_id, doctor_id, hospital_id)가 불필요합니다.
  // 이 파라미터가 포함되면 서버에서 목록 뷰가 아닌 다른 상세 정보 로직을 타거나
  // 잘못된 필터링/리다이렉션이 발생할 수 있습니다.
  url.searchParams.delete('user_id');
  url.searchParams.delete('doctor_id'); // <--- 이 라인을 추가하여 doctor_id 제거
  url.searchParams.delete('hospital_id');
  
  // ========= 페이지 번호 설정 =========
  // url.searchParams.set('page', page): 페이지 번호 파라미터 설정
  //   - 'page': URL 파라미터 이름
  //   - page: 이동할 페이지 번호 (숫자 또는 문자열)
  //   - 동작: 파라미터가 이미 있으면 업데이트, 없으면 추가
  //   - 예: url.searchParams.set('page', 2) → '?page=2'
  //   - 예: url.searchParams.set('page', '3') → '?page=3'
  //   - 주의: 숫자를 전달해도 문자열로 변환되어 저장됨
  url.searchParams.set('page', page);
  
  // ========= 추가 파라미터 설정 =========
  // 목적: 검색, 정렬 등의 파라미터를 URL에 추가
  //   - searchParams 객체에 있는 모든 파라미터를 URL에 추가
  //   - 사용자 경험(UX) 개선: 페이지네이션할 때 검색/정렬 조건이 유지됨
  // 
  // Object.keys(searchParams): searchParams 객체의 모든 키를 배열로 반환
  //   - 예: searchParams = {search_type: 'name', search_keyword: '김철수'}
  //   - 결과: ['search_type', 'search_keyword']
  //   - 목적: 각 파라미터를 순회하며 URL에 추가
  Object.keys(searchParams).forEach(key => {
    // searchParams[key]: 현재 파라미터의 값
    //   - truthy 값: null이 아니고, undefined가 아니고, 빈 문자열이 아닌 값
    //     → 예: 'name', '김철수', 'asc' 등
    //   - falsy 값: null, undefined, '', 0, false, NaN 등
    //   - 목적: 값이 있는 경우에만 URL에 추가 (빈 값은 제외)
    if (searchParams[key]) {
      // url.searchParams.set(key, searchParams[key]): 파라미터 추가 또는 업데이트
      //   - key: 파라미터 이름 (예: 'search_type', 'search_keyword', 'sort', 'order')
      //   - searchParams[key]: 파라미터 값 (예: 'name', '김철수', 'asc')
      //   - 동작:
      //     → 파라미터가 이미 존재하면 값 업데이트
      //     → 파라미터가 없으면 새로 추가
      //   - 예: url.searchParams.set('search_type', 'name')
      //     → URL: '?page=2&search_type=name'
      //   - 예: 기존에 search_type='email'이 있으면 'name'으로 업데이트
      url.searchParams.set(key, searchParams[key]);
    }
    // 주의: searchParams[key]가 falsy 값이면 파라미터를 추가하지 않음
    //   - 빈 문자열(''), null, undefined 등은 제외
    //   - 목적: 불필요한 빈 파라미터를 URL에 추가하지 않음
  });
  
  // ========= URL 문자열로 변환하여 반환 =========
  // url.toString(): URL 객체를 문자열로 변환
  //   - 반환값: 전체 URL 문자열
  //   - 예: 'http://localhost:8000/admin_panel/users/?page=2&search_type=name&search_keyword=김&sort=name&order=asc'
  //   - 목적: window.location.href에 할당하거나 링크의 href 속성에 사용
  //   - 사용 예: 페이지네이션 링크의 href 속성에 할당
  return url.toString();
}

/**
 * 검색 폼 유효성 검사
 * 
 * 목적: 검색 폼 제출 전에 입력값의 유효성을 검사하여 잘못된 검색 요청을 방지
 *   - 사용자 경험(UX) 개선: 잘못된 입력을 사전에 차단하여 명확한 에러 메시지 제공
 *   - 서버 부하 감소: 유효하지 않은 요청을 클라이언트에서 차단
 *   - 데이터 무결성: 올바른 형식의 검색어만 서버로 전송
 * 
 * 검사 항목:
 *   1. 검색 조건 선택 여부 확인
 *   2. 검색어 입력 여부 확인
 *   3. 전화번호 검색 시 숫자 형식 검증
 * 
 * @param {HTMLElement} formElement - 검증할 폼 요소
 *   - 예: <form class="search-form"> 요소
 *   - formElement.querySelector()로 내부 요소를 찾기 위해 사용
 * 
 * @returns {boolean} - 검증 결과
 *   - true: 검증 통과 (폼 제출 가능)
 *   - false: 검증 실패 (폼 제출 차단, 에러 메시지 표시)
 * 
 * @example
 * // 사용 예시 (HTML)
 * <form class="search-form" onsubmit="return validateSearchForm(this)">
 *   <select name="search_type">...</select>
 *   <input name="search_keyword">...</input>
 * </form>
 * 
 * // 또는 JavaScript
 * form.addEventListener('submit', function(e) {
 *   if (!validateSearchForm(form)) {
 *     e.preventDefault(); // 폼 제출 차단
 *   }
 * });
 */
function validateSearchForm(formElement) {
  // ========= 검색 폼 요소 조회 =========
  // 목적: 검증할 폼 내부의 입력 요소들을 찾기
  //   - 검색 타입 선택 박스와 검색어 입력 필드를 찾아서 값 검증
  // 
  // formElement.querySelector('select[name="search_type"]'): 폼 내에서 검색 타입 선택 박스 찾기
  //   - 'select[name="search_type"]': CSS 선택자
  //     → select: <select> 요소
  //     → [name="search_type"]: name 속성이 "search_type"인 요소
  //   - 반환값: 첫 번째로 일치하는 요소 (HTMLSelectElement 객체) 또는 null (없으면)
  //   - 예: <select name="search_type"><option value="name">이름</option>...</select>
  //   - 목적: 검색 타입(이름, 이메일, 전화번호 등)이 선택되었는지 확인
  const searchType = formElement.querySelector('select[name="search_type"]');
  
  // formElement.querySelector('input[name="search_keyword"]'): 폼 내에서 검색어 입력 필드 찾기
  //   - 'input[name="search_keyword"]': CSS 선택자
  //     → input: <input> 요소
  //     → [name="search_keyword"]: name 속성이 "search_keyword"인 요소
  //   - 반환값: 첫 번째로 일치하는 요소 (HTMLInputElement 객체) 또는 null (없으면)
  //   - 예: <input name="search_keyword" type="text" placeholder="검색어 입력">
  //   - 목적: 검색어가 입력되었는지 확인
  const searchKeyword = formElement.querySelector('input[name="search_keyword"]');
  
  // ========= 검색 조건 선택 여부 확인 =========
  // 목적: 검색 조건을 선택하지 않고 검색어만 입력한 경우를 차단
  //   - 검색 타입이 선택되지 않으면 어떤 필드로 검색할지 알 수 없음
  //   - 사용자 경험(UX) 개선: 명확한 에러 메시지 제공
  // 
  // !searchType.value: 검색 타입이 선택되지 않았는지 확인
  //   - searchType.value: 선택된 옵션의 value 값 (문자열)
  //   - 빈 문자열('')이면 선택되지 않음 (falsy)
  //   - 값이 있으면 선택됨 (truthy)
  //   - ! 연산자: 논리 부정 (true → false, false → true)
  //   - 예: searchType.value='' → !searchType.value=true (선택 안 됨)
  //   - 예: searchType.value='name' → !searchType.value=false (선택됨)
  // 
  // searchKeyword.value.trim(): 검색어가 입력되었는지 확인
  //   - searchKeyword.value: 입력 필드의 값 (문자열)
  //   - .trim(): 문자열 앞뒤 공백 제거
  //     → 예: '  김철수  ' → '김철수'
  //     → 예: '   ' → '' (빈 문자열)
  //   - 빈 문자열('')이면 입력 안 됨 (falsy)
  //   - 값이 있으면 입력됨 (truthy)
  //   - 예: searchKeyword.value='  김철수  ' → searchKeyword.value.trim()='김철수' (입력됨)
  //   - 예: searchKeyword.value='   ' → searchKeyword.value.trim()='' (입력 안 됨)
  // 
  // &&: 두 조건이 모두 true여야 true
  //   - !searchType.value && searchKeyword.value.trim()
  //   - 조건: 검색 타입이 선택되지 않았고, 검색어는 입력됨
  //   - 예: 검색 타입='', 검색어='김철수' → true (에러 발생)
  if (!searchType.value && searchKeyword.value.trim()) {
    // ========= 에러 메시지 표시 및 포커스 이동 =========
    // alert('검색 조건을 선택해주세요.'): 사용자에게 에러 메시지 표시
    //   - alert(): 브라우저의 기본 알림 창 표시
    //   - '검색 조건을 선택해주세요.': 에러 메시지
    //   - 목적: 사용자에게 무엇이 잘못되었는지 알림
    //   - 주의: alert()는 사용자 경험을 방해할 수 있으므로, 최신 웹에서는 커스텀 모달 사용 권장
    alert('검색 조건을 선택해주세요.');
    
    // searchType.focus(): 검색 타입 선택 박스에 포커스 이동
    //   - focus(): 요소에 키보드 포커스를 설정
    //   - 목적: 사용자가 바로 검색 조건을 선택할 수 있도록 포커스 이동
    //   - 사용자 경험(UX) 개선: 에러 발생 시 해당 입력 필드로 자동 이동
    searchType.focus();
    
    // return false: 검증 실패를 나타내고 함수 종료
    //   - false: 검증 실패 (폼 제출 차단)
    //   - 폼의 onsubmit 이벤트에서 false를 반환하면 폼 제출이 취소됨
    //   - 예: <form onsubmit="return validateSearchForm(this)"> → false 반환 시 제출 안 됨
    return false;
  }
  
  // ========= 검색어 입력 여부 확인 =========
  // 목적: 검색 조건은 선택했지만 검색어가 비어있는 경우를 차단
  //   - 검색 타입만 선택하고 검색어를 입력하지 않으면 검색할 수 없음
  //   - 사용자 경험(UX) 개선: 명확한 에러 메시지 제공
  // 
  // searchType.value: 검색 타입이 선택되었는지 확인
  //   - truthy 값이면 선택됨
  //   - 예: searchType.value='name' → true (선택됨)
  // 
  // !searchKeyword.value.trim(): 검색어가 입력되지 않았는지 확인
  //   - searchKeyword.value.trim(): 검색어에서 공백 제거
  //   - 빈 문자열('')이면 입력 안 됨 (falsy)
  //   - ! 연산자: 논리 부정
  //   - 예: searchKeyword.value='   ' → searchKeyword.value.trim()='' → !true (입력 안 됨)
  // 
  // &&: 두 조건이 모두 true여야 true
  //   - searchType.value && !searchKeyword.value.trim()
  //   - 조건: 검색 타입은 선택되었고, 검색어는 입력 안 됨
  //   - 예: 검색 타입='name', 검색어='   ' → true (에러 발생)
  if (searchType.value && !searchKeyword.value.trim()) {
    // ========= 에러 메시지 표시 및 포커스 이동 =========
    // alert('검색어를 입력해주세요.'): 사용자에게 에러 메시지 표시
    //   - '검색어를 입력해주세요.': 에러 메시지
    alert('검색어를 입력해주세요.');
    
    // searchKeyword.focus(): 검색어 입력 필드에 포커스 이동
    //   - 목적: 사용자가 바로 검색어를 입력할 수 있도록 포커스 이동
    searchKeyword.focus();
    
    // return false: 검증 실패를 나타내고 함수 종료
    return false;
  }
  
  // ========= 전화번호 검색 시 숫자 형식 검증 =========
  // 목적: 전화번호 검색 시 올바른 형식의 입력만 허용
  //   - 전화번호는 숫자, 하이픈(-), 공백만 허용
  //   - 다른 문자가 포함되면 검색 결과가 부정확할 수 있음
  //   - 사용자 경험(UX) 개선: 잘못된 입력을 사전에 차단
  // 
  // searchType.value === 'phone': 검색 타입이 'phone'인지 확인
  //   - 'phone': 전화번호 검색 타입
  //   - 예: searchType.value='phone' → true
  //   - 예: searchType.value='name' → false
  // 
  // searchKeyword.value.trim(): 검색어가 입력되었는지 확인
  //   - 빈 문자열이 아니면 입력됨 (truthy)
  //   - &&: 두 조건이 모두 true여야 true
  //   - 조건: 검색 타입이 'phone'이고, 검색어가 입력됨
  if (searchType.value === 'phone' && searchKeyword.value.trim()) {
    // ========= 검색어에서 공백 제거 =========
    // phoneValue: 검색어에서 앞뒤 공백을 제거한 값
    //   - searchKeyword.value.trim(): 문자열 앞뒤 공백 제거
    //   - 예: '  010-1234-5678  ' → '010-1234-5678'
    //   - 예: '010 1234 5678' → '010 1234 5678' (중간 공백은 유지)
    //   - 목적: 앞뒤 공백은 제거하되, 중간 공백은 허용 (전화번호 형식 다양성 고려)
    const phoneValue = searchKeyword.value.trim();
    
    // ========= 정규표현식으로 전화번호 형식 검증 =========
    // phonePattern: 전화번호 형식을 검증하는 정규표현식
    //   - /^[0-9\s\-]+$/: 정규표현식 패턴
    //     → /: 정규표현식 리터럴 시작/끝
    //     → ^: 문자열의 시작
    //     → [0-9\s\-]: 문자 클래스
    //       → 0-9: 숫자 (0부터 9까지)
    //       → \s: 공백 문자 (스페이스, 탭 등)
    //       → \-: 하이픈(-) (이스케이프 필요)
    //     → +: 하나 이상의 문자 (최소 1개)
    //     → $: 문자열의 끝
    //   - 의미: 숫자, 공백, 하이픈만 허용하고 다른 문자는 허용하지 않음
    //   - 예: '010-1234-5678' → 매칭됨 (통과)
    //   - 예: '010 1234 5678' → 매칭됨 (통과)
    //   - 예: '01012345678' → 매칭됨 (통과)
    //   - 예: '010-1234-5678a' → 매칭 안 됨 (실패, 알파벳 포함)
    //   - 예: '010-1234-5678@' → 매칭 안 됨 (실패, 특수문자 포함)
    const phonePattern = /^[0-9\s\-]+$/;
    
    // phonePattern.test(phoneValue): 정규표현식으로 검증
    //   - test(): 정규표현식이 문자열과 일치하는지 확인하는 메서드
    //   - phoneValue: 검증할 문자열
    //   - 반환값: true (일치) 또는 false (불일치)
    //   - 예: phonePattern.test('010-1234-5678') → true
    //   - 예: phonePattern.test('010-1234-5678a') → false
    // 
    // !phonePattern.test(phoneValue): 검증 실패인지 확인
    //   - ! 연산자: 논리 부정
    //   - 조건: 정규표현식과 일치하지 않음 (잘못된 형식)
    if (!phonePattern.test(phoneValue)) {
      // ========= 에러 메시지 표시 및 포커스 이동 =========
      // alert('전화번호는 숫자만 입력해주세요.'): 사용자에게 에러 메시지 표시
      //   - '전화번호는 숫자만 입력해주세요.': 에러 메시지
      //   - 주의: 실제로는 숫자, 하이픈, 공백을 허용하지만 사용자에게는 간단하게 "숫자만"이라고 표시
      alert('전화번호는 숫자만 입력해주세요.');
      
      // searchKeyword.focus(): 검색어 입력 필드에 포커스 이동
      //   - 목적: 사용자가 바로 검색어를 수정할 수 있도록 포커스 이동
      searchKeyword.focus();
      
      // return false: 검증 실패를 나타내고 함수 종료
      return false;
    }
  }
  // 주의: 검색 타입이 'phone'이 아니면 이 검증은 건너뜀
  //   - 예: 검색 타입='name'이면 전화번호 형식 검증 안 함
  
  // ========= 검증 통과 =========
  // return true: 검증 통과를 나타내고 함수 종료
  //   - true: 검증 성공 (폼 제출 허용)
  //   - 폼의 onsubmit 이벤트에서 true를 반환하면 폼 제출이 진행됨
  //   - 예: <form onsubmit="return validateSearchForm(this)"> → true 반환 시 제출됨
  //   - 모든 검증을 통과했으므로 폼을 제출할 수 있음
  return true;
}

/**
 * AJAX로 페이지네이션 처리 (스크롤 위치 유지)
 * 
 * 목적: 페이지네이션 링크 클릭 시 전체 페이지 새로고침 없이 AJAX로 목록만 업데이트
 *   - 사용자 경험(UX) 개선: 페이지 새로고침 없이 빠른 페이지 이동
 *   - 스크롤 위치 유지: 페이지네이션 후에도 사용자가 보고 있던 위치 유지
 *   - 성능 최적화: 전체 HTML 대신 필요한 부분만 업데이트
 *   - 검색/정렬 조건 유지: 페이지 이동 시에도 검색 및 정렬 조건 유지
 * 
 * 동작 방식:
 *   1. 페이지네이션 링크 클릭 이벤트를 가로채서 기본 동작(페이지 이동) 차단
 *   2. AJAX로 서버에 요청하여 새로운 페이지의 HTML 받아오기
 *   3. 받아온 HTML에서 테이블 목록과 페이지네이션 부분만 추출
 *   4. 현재 페이지의 해당 부분만 업데이트 (DOM 조작)
 *   5. 스크롤 위치를 복원하여 사용자가 보고 있던 위치 유지
 *   6. 이벤트 리스너 재연결 (새로 추가된 페이지네이션 링크에 이벤트 연결)
 * 
 * @param {Event} e - 페이지네이션 링크 클릭 이벤트 객체
 *   - e.preventDefault(): 기본 동작(페이지 이동) 차단
 *   - 예: <a href="/admin_panel/users/?page=2" class="pagination-link">2</a> 클릭 시
 * 
 * @param {string} url - 이동할 페이지의 URL
 *   - 예: 'http://localhost:8000/admin_panel/users/?page=2&search_type=name&search_keyword=김'
 *   - 검색 및 정렬 파라미터가 포함된 전체 URL
 * 
 * @example
 * // 사용 예시 (attachPaginationListeners 함수에서 호출)
 * link.addEventListener('click', function(e) {
 *   handlePaginationAjax(e, link.href);
 * });
 */
function handlePaginationAjax(e, url) {
  e.preventDefault();
  
  // 현재 스크롤 위치 저장
  const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
  
  // DOM 요소 조회
  const tableContainer = document.querySelector('.table-container');
  const paginationContainer = document.querySelector('.pagination, nav[aria-label="Page navigation"]');
  
  // URL 파싱 및 FormData 생성
  const urlObj = new URL(url, window.location.origin);
  const currentUrl = new URL(window.location.href);
  // ========= 페이지네이션에 필요한 파라미터만 유지 =========
  // doctor_id, user_id, hospital_id는 목록 조회에 불필요하므로 제외
  ['sort', 'order', 'search_type', 'search_keyword'].forEach(key => {
    const currentValue = currentUrl.searchParams.get(key);
    if (currentValue && !urlObj.searchParams.has(key)) {
      urlObj.searchParams.set(key, currentValue);
    }
  });
  
  const formData = new FormData();
  urlObj.searchParams.forEach((value, key) => {
    formData.append(key, value);
  });
  
  // CSRF 토큰 추가
  const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || 
                    document.querySelector('input[name="csrfmiddlewaretoken"]')?.value ||
                    '';
  if (csrfToken) {
    formData.append('csrfmiddlewaretoken', csrfToken);
  }
  
  // AJAX 요청
  console.log('AJAX 요청 시작:', urlObj.pathname, 'FormData:', Object.fromEntries(formData));
  fetch(urlObj.pathname, {
    method: 'POST',
    body: formData,
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
    }
  })
  .then(response => {
    console.log('AJAX 응답 받음:', response.status, response.statusText, 'Content-Type:', response.headers.get('content-type'));
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json().then(data => {
        throw new Error('JSON_RESPONSE');
      });
    }
    return response.text();
  })
  .then(html => {
    console.log('HTML 응답 받음, 길이:', html.length);
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    const newTableContainer = tempDiv.querySelector('.table-container');
    const newPagination = tempDiv.querySelector('.pagination, nav[aria-label="Page navigation"]');
    
    console.log('새로운 테이블 컨테이너:', newTableContainer ? '찾음' : '없음');
    console.log('새로운 페이지네이션:', newPagination ? '찾음' : '없음');
    
    // 테이블 목록 업데이트
    if (newTableContainer && tableContainer) {
      console.log('테이블 컨테이너 업데이트 시작');
      console.log('기존 테이블 내용 길이:', tableContainer.innerHTML.length);
      console.log('새로운 테이블 내용 길이:', newTableContainer.innerHTML.length);
      tableContainer.innerHTML = newTableContainer.innerHTML;
      console.log('테이블 컨테이너 업데이트 완료');
      window.scrollTo(0, currentScrollPosition);
      document.documentElement.scrollTop = currentScrollPosition;
      document.body.scrollTop = currentScrollPosition;
    } else {
      console.warn('테이블 컨테이너 업데이트 실패:', {
        newTableContainer: !!newTableContainer,
        tableContainer: !!tableContainer
      });
    }
    
    // ========== 페이지네이션 업데이트 ==========
    // 조건: 새로운 페이지네이션 컨테이너와 현재 페이지네이션 컨테이너가 모두 존재하는 경우
    if (newPagination && paginationContainer) {
      // [admin_common.js:1494] 페이지네이션 내용 교체
      paginationContainer.innerHTML = newPagination.innerHTML;
      
      // ************************************************
      // !!! 핵심: DOM 업데이트 직후, 단 한 번의 호출로 이벤트 연결 보장 !!!
      // ************************************************
      if (typeof attachPaginationListeners === 'function') {
        attachPaginationListeners(); // <--- 이 위치에만 남기고 다른 곳에서는 모두 제거
        console.log('페이지네이션 업데이트 후 attachPaginationListeners 즉시 호출');
      }
    } else {
      console.warn('페이지네이션 컨테이너 업데이트 실패:', {
        newPagination: !!newPagination,
        paginationContainer: !!paginationContainer
      });
    }
    
    // 이벤트 리스너 재연결
    console.log('이벤트 리스너 재연결 시작');
    console.log('window.reattachTableRowListeners 존재:', typeof window.reattachTableRowListeners === 'function');
    requestAnimationFrame(() => {
      setTimeout(() => {
        if (typeof window.reattachTableRowListeners === 'function') {
          console.log('window.reattachTableRowListeners 호출');
          window.reattachTableRowListeners();
        } else {
          console.log('window.reattachTableRowListeners 없음');
          // 중복 호출 방지: attachPaginationListeners는 이미 위에서 호출됨
        }
      }, 50);
    });
    
    console.log('attachSortListeners 호출');
    attachSortListeners();
    if (typeof attachCheckboxListeners === 'function') {
      console.log('attachCheckboxListeners 호출');
      attachCheckboxListeners();
    }
    
    // URL 업데이트
    console.log('URL 업데이트:', url);
    window.history.pushState({}, '', url);
    
    // ========= AJAX 업데이트 후 페이지별 이벤트 리스너 재연결 =========
    console.log('페이지별 이벤트 리스너 재연결 시작');
    console.log('selectDoctor 존재:', typeof selectDoctor === 'function');
    console.log('attachCheckboxListeners 존재:', typeof attachCheckboxListeners === 'function');
    console.log('attachButtonListeners 존재:', typeof attachButtonListeners === 'function');
    
    // 1. 정렬 리스너 재연결 (모든 목록 페이지 공통)
    if (typeof attachSortListeners === 'function') {
      attachSortListeners();
    }
    
    // 2. 의사 승인 대기 페이지 로직 (approval_pending.js)
    //    - 승인 대기 페이지 고유 함수(selectDoctor, attachCheckboxListeners, attachButtonListeners)를 확인하여 재연결
    if (typeof selectDoctor === 'function' && 
        typeof attachCheckboxListeners === 'function' && 
        typeof attachButtonListeners === 'function') {
      
      console.log('승인 대기 페이지 로직 실행');
      
      // 테이블 행 클릭 이벤트 리스너 재연결
      // (선택자: tr[data-doctor-id], 속성 이름: data-doctor-id, 핸들러: selectDoctor)
      // approval_pending.js의 DOMContentLoaded에서 사용된 선택자를 사용합니다.
      const approvalRows = document.querySelectorAll('tr[data-doctor-id]');
      console.log('승인 대기 페이지 행 개수:', approvalRows.length);
      if (approvalRows.length > 0) {
        attachTableRowListeners('tr[data-doctor-id]', 'data-doctor-id', selectDoctor);
        console.log('테이블 행 클릭 이벤트 리스너 재연결 완료');
      }
      
      // 체크박스 이벤트 리스너 재연결
      attachCheckboxListeners();
      console.log('체크박스 이벤트 리스너 재연결 완료');
      
      // 버튼 이벤트 리스너 재연결 (승인/거절 버튼)
      attachButtonListeners();
      console.log('버튼 이벤트 리스너 재연결 완료');
    } else {
      console.log('승인 대기 페이지 조건 불일치:', {
        selectDoctor: typeof selectDoctor === 'function',
        attachCheckboxListeners: typeof attachCheckboxListeners === 'function',
        attachButtonListeners: typeof attachButtonListeners === 'function'
      });
    }
    
    // 3. 의사 목록 페이지 로직 (doctor_list.js)
    // doctor_list.js에서 selectDoctor 함수가 정의되어 있으면 재연결합니다.
    if (typeof selectDoctor === 'function' && 
        document.querySelector('.doctor-row[data-doctor-id]') &&
        !(typeof attachCheckboxListeners === 'function' && typeof attachButtonListeners === 'function')) {
      // 의사 목록 페이지에서 테이블 행 클릭 이벤트 리스너를 다시 연결합니다.
      // doctor_list.js의 DOMContentLoaded에서 사용하는 선택자: '.doctor-row[data-doctor-id]'
      attachTableRowListeners('.doctor-row[data-doctor-id]', 'data-doctor-id', selectDoctor);
    }
    // ... (이 외의 다른 페이지(예: user_list, hospital_list)에 대한 재연결 로직이 있다면 여기에 추가)
    
    // ========= 최종 스크롤 복원 (DOM 안정화 후) =========
    // 스크롤 위치 복원
    window.scrollTo(0, currentScrollPosition);
    requestAnimationFrame(() => {
      window.scrollTo(0, currentScrollPosition);
    });
  })
  .catch(error => {
    if (error.message === 'JSON_RESPONSE') {
      return;
    }
    console.error('페이지네이션 오류:', error);
    window.location.href = url;
  });
}

/**
 * 페이지네이션 링크에 이벤트 리스너 연결
 * 
 * 목적: 페이지네이션 링크에 AJAX 클릭 이벤트 리스너를 연결하여 페이지 새로고침 없이 페이지 이동
 *   - 사용자 경험(UX) 개선: 페이지 새로고침 없이 빠른 페이지 이동
 *   - 스크롤 위치 유지: 페이지 이동 후에도 사용자가 보고 있던 위치 유지
 *   - 성능 최적화: 전체 HTML 대신 필요한 부분만 업데이트
 * 
 * 동작 방식:
 *   1. 모든 페이지네이션 링크를 찾기
 *   2. 각 링크에 대해 기존 이벤트 리스너 제거 (중복 방지)
 *   3. 새로운 이벤트 리스너 추가 (AJAX 처리)
 *   4. 링크 클릭 시 handlePaginationAjax 함수 호출
 * 
 * 사용 시점:
 *   - 페이지 로드 시 (DOMContentLoaded 이벤트)
 *   - 페이지네이션 후 DOM 업데이트 시 (새로 추가된 링크에 이벤트 연결)
 * 
 * @example
 * // 사용 예시
 * attachPaginationListeners();
 * // 결과: 모든 페이지네이션 링크에 AJAX 이벤트 리스너가 연결됨
 */
function attachPaginationListeners() {
  // ========= 페이지네이션 컨테이너 조회 =========
  const paginationContainer = document.querySelector('.pagination, nav[aria-label="Page navigation"]');
  
  // 페이지네이션 컨테이너가 없으면 함수 종료 (페이지네이션이 없는 경우)
  // 조용히 종료 (대시보드 등 페이지네이션이 없는 페이지는 정상)
  if (!paginationContainer) {
    return;
  }
  
  // ========= 페이지네이션 링크 조회 =========
  // **핵심 수정: data-page 속성을 가진 링크를 우선적으로 찾고, 
  //              href 속성이 있는 링크도 포함하여 더 포괄적으로 검색합니다.**
  
  // 방법 1: data-page 속성을 가진 링크 찾기 (가장 확실한 방법)
  let paginationLinks = paginationContainer.querySelectorAll('a[data-page]');
  
  // 방법 2: data-page가 없으면 클래스 기반으로 찾기
  if (paginationLinks.length === 0) {
    paginationLinks = paginationContainer.querySelectorAll(
      'a.page-link, ' + // .page-link 클래스를 가진 링크
      'a.pagination-link' // .pagination-link 클래스를 가진 링크
    );
  }
  
  // 방법 3: 여전히 없으면 href 속성이 있는 모든 링크 찾기
  if (paginationLinks.length === 0) {
    paginationLinks = paginationContainer.querySelectorAll('a[href]');
  }
  
  // 찾은 링크가 0개인 경우 조용히 종료
  // (페이지네이션 컨테이너는 있지만 링크가 없는 경우는 정상일 수 있음 - 예: 1페이지만 있는 경우)
  if (paginationLinks.length === 0) {
    return;
  }
  
  // ========= 각 링크에 이벤트 리스너 연결 =========
  paginationLinks.forEach(link => {
    // 기존 이벤트 리스너 제거
    if (link._ajaxHandler) {
      link.removeEventListener('click', link._ajaxHandler, { capture: true });
      link._ajaxHandler = null;
    }
    
    // 링크가 AJAX 핸들러를 가졌는지 확인하는 디버깅 코드 추가
    if (!link._ajaxHandler) {
      // 처음 이벤트 연결 시에만 로그 출력
      console.log('이벤트 리스너 새로 연결:', link.href);
    }
    
    // 새로운 이벤트 핸들러 생성 및 저장
    link._ajaxHandler = function(e) {
      console.log('페이지네이션 클릭 핸들러 작동:', link.href); // 클릭 시 작동 확인 로그
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      console.log('페이징 링크 클릭됨:', link, 'page:', link.dataset.page, 'href:', link.href);
      
      // data-page 속성이 있으면 data 속성으로 URL 생성, 없으면 기존 href 사용
      const page = link.dataset.page;
      if (page) {
        const url = new URL(window.location.href);
        // ========= 페이지네이션에 불필요한 파라미터 제거 (핵심 수정) =========
        // 목록을 조회할 때는 상세 정보 ID 파라미터가 불필요합니다.
        url.searchParams.delete('user_id');
        url.searchParams.delete('doctor_id'); // doctor_id 제거
        url.searchParams.delete('hospital_id');
        
        url.searchParams.set('page', String(page));
        if (link.dataset.sort) url.searchParams.set('sort', link.dataset.sort);
        if (link.dataset.order) url.searchParams.set('order', link.dataset.order);
        if (link.dataset.searchType) url.searchParams.set('search_type', link.dataset.searchType);
        if (link.dataset.searchKeyword) url.searchParams.set('search_keyword', link.dataset.searchKeyword);
        // doctor_id는 목록 조회에 불필요하므로 제거됨
        console.log('페이징 URL 생성:', url.toString());
        handlePaginationAjax(e, url.toString());
      } else if (link.href && link.href !== '#' && !link.href.endsWith('#')) {
        console.log('기존 href 사용:', link.href);
      handlePaginationAjax(e, link.href);
      } else {
        console.warn('페이징 링크에 유효한 page 속성 또는 href가 없습니다:', link);
      }
      
      return false;
    };
    
    // 이벤트 리스너 추가
    link.addEventListener('click', link._ajaxHandler, { capture: true, passive: false });
  });
}

/**
 * 컨테이너 내부 휠 스크롤 방지 (비활성화 - 대시보드도 스크롤 허용)
 * 
 * 목적: 컨테이너 내부에서 마우스 휠 스크롤을 방지하는 기능 (현재는 비활성화됨)
 *   - 원래 목적: 특정 컨테이너 내부에서 스크롤을 방지하여 사용자 경험 개선
 *   - 현재 상태: 비활성화됨 (대시보드도 스크롤 허용)
 *   - 이유: 대시보드 페이지에서도 스크롤이 필요하여 기능을 비활성화
 *   - 향후 확장: 필요시 여기에 다른 로직 추가 가능
 * 
 * 사용 시점:
 *   - 페이지 로드 시 (DOMContentLoaded 이벤트)
 *   - 특정 컨테이너에서 스크롤을 제어해야 할 때
 * 
 * 주의사항:
 *   - 현재는 빈 함수로 구현되어 있음 (기능 비활성화)
 *   - 향후 필요시 스크롤 방지 로직을 추가할 수 있음
 * 
 * @example
 * // 사용 예시 (현재는 비활성화됨)
 * preventContainerWheelScroll();
 * // 결과: 아무 동작도 하지 않음 (기능 비활성화)
 */
function preventContainerWheelScroll() {
  // ========= 대시보드 휠 스크롤 허용으로 변경 =========
  // 목적: 대시보드 페이지에서도 스크롤이 필요하여 기능을 비활성화
  //   - 원래 목적: 컨테이너 내부에서 마우스 휠 스크롤을 방지
  //   - 현재 상태: 기능이 비활성화되어 있음
  //   - 이유: 대시보드 페이지에서 스크롤이 필요함
  //   - 결과: 모든 페이지에서 스크롤이 정상적으로 작동함
  // 
  // 주의: 현재는 빈 함수로 구현되어 있음
  //   - 향후 필요시 스크롤 방지 로직을 추가할 수 있음
  //   - 예: 특정 컨테이너에서만 스크롤 방지
  //   - 예: 특정 조건에서만 스크롤 방지
  // 대시보드 휠 스크롤 허용으로 변경
  
  // ========= 향후 확장 가능성 =========
  // 목적: 필요시 여기에 다른 로직 추가 가능
  //   - 예: 특정 컨테이너에서만 스크롤 방지
  //   - 예: 특정 조건에서만 스크롤 방지
  //   - 예: 스크롤 방지 대신 다른 동작 수행
  // 필요시 여기에 다른 로직 추가 가능
}

/**
 * 페이지 로드 시 초기화 (DOMContentLoaded 이벤트 리스너)
 * 
 * 목적: 페이지가 완전히 로드된 후 필요한 초기화 작업 수행
 *   - DOM 요소가 모두 준비된 후 실행
 *   - 검색 폼 유효성 검사 설정
 *   - 페이지네이션 링크에 AJAX 이벤트 리스너 연결
 *   - 컨테이너 내부 휠 스크롤 방지 (현재는 비활성화)
 * 
 * 동작 방식:
 *   1. DOMContentLoaded 이벤트 발생 시 실행
 *   2. 검색 폼에 유효성 검사 이벤트 리스너 추가
 *   3. 페이지네이션 링크에 AJAX 이벤트 리스너 연결
 *   4. 컨테이너 내부 휠 스크롤 방지 함수 호출 (현재는 비활성화)
 * 
 * 실행 시점:
 *   - HTML 문서가 완전히 로드되고 파싱된 후
 *   - 이미지, 스타일시트, 서브프레임 등의 로딩을 기다리지 않음
 *   - DOM이 준비되면 즉시 실행
 * 
 * 주의사항:
 *   - window.onload와는 다름 (이미지 등이 모두 로드될 때까지 기다리지 않음)
 *   - DOMContentLoaded는 더 빠르게 실행됨
 * 
 * @example
 * // 자동 실행 (페이지 로드 시)
 * // 결과:
 * // 1. 모든 검색 폼에 유효성 검사 추가
 * // 2. 모든 페이지네이션 링크에 AJAX 이벤트 리스너 연결
 * // 3. 컨테이너 내부 휠 스크롤 방지 함수 호출 (현재는 비활성화)
 */
document.addEventListener('DOMContentLoaded', function() {
  // ========= 검색 폼에 유효성 검사 추가 =========
  // 목적: 모든 검색 폼에 유효성 검사 이벤트 리스너를 추가하여 잘못된 검색 요청 방지
  //   - 사용자 경험(UX) 개선: 잘못된 입력을 사전에 차단하여 명확한 에러 메시지 제공
  //   - 서버 부하 감소: 유효하지 않은 요청을 클라이언트에서 차단
  //   - 데이터 무결성: 올바른 형식의 검색어만 서버로 전송
  // 
  // document.querySelectorAll('.search-form'): 모든 검색 폼 찾기
  //   - '.search-form': CSS 선택자 (검색 폼 클래스)
  //   - 반환값: NodeList 객체 (유사 배열, 모든 일치하는 요소)
  //   - 예: <form class="search-form">...</form>
  //   - 목적: 페이지에 있는 모든 검색 폼을 찾아서 이벤트 리스너 추가
  const searchForms = document.querySelectorAll('.search-form');
  
  // searchForms.forEach(form => {...}): 각 검색 폼에 대해 이벤트 리스너 추가
  //   - forEach(): 배열의 각 요소에 대해 함수 실행
  //   - searchForms: 모든 검색 폼 (NodeList)
  //   - form: 현재 처리 중인 검색 폼 요소
  //   - 동작: 각 검색 폼에 대해 이벤트 리스너 추가
  searchForms.forEach(form => {
    // form.addEventListener('submit', function(e) {...}): 폼 제출 이벤트 리스너 추가
    //   - addEventListener(): 이벤트 리스너 추가
    //   - 'submit': 이벤트 타입 (폼 제출)
    //   - function(e) {...}: 이벤트 핸들러 함수
    //     → e: 이벤트 객체 (Event)
    //   - 동작: 폼이 제출될 때 실행됨
    form.addEventListener('submit', function(e) {
      // ========= 기본 동작 차단 =========
      // e.preventDefault(): 폼의 기본 동작(제출) 차단
      //   - preventDefault(): 이벤트의 기본 동작을 취소
      //   - 목적: AJAX로 처리하기 위해 기본 제출 차단
      e.preventDefault();
      
      // ========= 검색 폼 유효성 검사 =========
      // validateSearchForm(form): 검색 폼의 유효성을 검사하는 함수 호출
      //   - form: 검증할 폼 요소
      //   - 반환값: true (검증 통과) 또는 false (검증 실패)
      //   - 목적: 검색 조건과 검색어의 유효성을 확인
      //   - 검사 항목:
      //     1. 검색 조건 선택 여부 확인
      //     2. 검색어 입력 여부 확인
      //     3. 전화번호 검색 시 숫자 형식 검증
      // 
      // !validateSearchForm(form): 검증 실패인지 확인
      //   - ! 연산자: 논리 부정
      //   - 조건: 검증이 실패한 경우 (false 반환)
      if (!validateSearchForm(form)) {
        // 검증 실패 시 아무 작업도 하지 않음 (이미 preventDefault로 차단됨)
        return false;
      }
      
      // ========= AJAX로 검색 폼 제출 =========
      // FormData 생성
      const formData = new FormData(form);
      
      // CSRF 토큰 확인 및 추가
      const csrfToken = formData.get('csrfmiddlewaretoken') || 
                        document.querySelector('[name=csrfmiddlewaretoken]')?.value || 
                        document.querySelector('input[name="csrfmiddlewaretoken"]')?.value ||
                        '';
      if (csrfToken && !formData.has('csrfmiddlewaretoken')) {
        formData.append('csrfmiddlewaretoken', csrfToken);
      }
      
      // AJAX 요청
      fetch(form.action || window.location.pathname, {
        method: 'POST',
        body: formData,
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        }
      })
      .then(response => {
        // HTML 응답 처리
        if (response.headers.get('content-type')?.includes('text/html')) {
          return response.text();
        }
        // JSON 응답 처리
        return response.json();
      })
      .then(data => {
        // HTML 응답인 경우 (전체 페이지 HTML)
        if (typeof data === 'string') {
          // 임시 DOM 요소 생성 및 HTML 파싱
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = data;
          
          // 테이블 컨테이너 업데이트
          const tableContainer = document.querySelector('.table-container');
          const newTableContainer = tempDiv.querySelector('.table-container');
          if (tableContainer && newTableContainer) {
            tableContainer.innerHTML = newTableContainer.innerHTML;
          }
          
          // 페이지네이션 업데이트
          const paginationContainer = document.querySelector('.pagination, nav[aria-label="Page navigation"]');
          const newPaginationContainer = tempDiv.querySelector('.pagination, nav[aria-label="Page navigation"]');
          if (paginationContainer && newPaginationContainer) {
            paginationContainer.innerHTML = newPaginationContainer.innerHTML;
          } else if (paginationContainer && !newPaginationContainer) {
            paginationContainer.innerHTML = '';
          }
          
          // 상세 정보 섹션 제거 (검색 시 초기화)
          const detailSection = document.querySelector('.user-detail-section, .doctor-detail-section, .hospital-detail-section, .approval-detail-section');
          if (detailSection) {
            detailSection.remove();
          }
          
          // 페이지네이션 리스너 재연결 (페이지네이션 컨테이너가 있을 때만)
          // paginationContainer는 위에서 이미 선언되었으므로 재사용
          if (paginationContainer) {
            attachPaginationListeners();
          }
          
          // 테이블 행 리스너 재연결
          if (typeof window.reattachTableRowListeners === 'function') {
            window.reattachTableRowListeners();
          }
          
          // URL 업데이트 (히스토리 관리)
          const url = new URL(form.action || window.location.href);
          url.searchParams.delete('page'); // 검색 시 페이지 초기화
          window.history.pushState({}, '', url.toString());
        } else {
          // JSON 응답인 경우 (상세 정보만)
          // selectItem 함수에서 처리하도록 함
          console.log('JSON 응답:', data);
        }
      })
      .catch(error => {
        console.error('검색 요청 오류:', error);
        // 에러 발생 시 기본 제출로 폴백
        form.submit();
      });
    });
  });
  
  // ========= 페이지네이션 링크에 AJAX 이벤트 리스너 추가 =========
  // 목적: 페이지네이션 링크에 AJAX 클릭 이벤트 리스너를 연결하여 페이지 새로고침 없이 페이지 이동
  //   - 사용자 경험(UX) 개선: 페이지 새로고침 없이 빠른 페이지 이동
  //   - 스크롤 위치 유지: 페이지 이동 후에도 사용자가 보고 있던 위치 유지
  //   - 성능 최적화: 전체 HTML 대신 필요한 부분만 업데이트
  // 
  // **핵심 수정: 페이지네이션 컨테이너가 있을 때만 호출**
  //   - 대시보드처럼 페이지네이션이 없는 페이지에서는 호출하지 않음
  //   - 불필요한 오류 메시지 방지
  const paginationContainer = document.querySelector('.pagination, nav[aria-label="Page navigation"]');
  if (paginationContainer) {
    attachPaginationListeners();
  }
  
  // ========= 로그아웃 버튼 이벤트 리스너 =========
  // 목적: 로그아웃 버튼 클릭 시 확인 창을 표시하고 로그아웃 처리
  const logoutBtn = document.getElementById('logoutBtn');
  
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function(e) {
      e.preventDefault();
      
      // 확인 창 표시
      if (confirm('로그아웃을 하시겠습니까?')) {
        // 예 버튼: 로그아웃 처리 (메인 화면으로 이동)
        window.location.href = '/accounts/logout/';
      }
      // 아니오 버튼: 아무 작업도 하지 않음 (현재 페이지 유지)
    });
  }
  
  // ========= 컨테이너 내부 휠 스크롤 방지 =========
  // 목적: 컨테이너 내부에서 마우스 휠 스크롤을 방지하는 기능 호출 (현재는 비활성화됨)
  //   - preventContainerWheelScroll(): 컨테이너 내부 휠 스크롤 방지 함수 호출
  //   - 현재 상태: 기능이 비활성화되어 있음 (빈 함수)
  //   - 이유: 대시보드 페이지에서도 스크롤이 필요하여 기능을 비활성화
  //   - 결과: 모든 페이지에서 스크롤이 정상적으로 작동함
  //   - 향후 확장: 필요시 함수 내부에 스크롤 방지 로직 추가 가능
  preventContainerWheelScroll();
  
  // ========= 정렬: 이벤트 위임 (AJAX로 DOM이 바뀌어도 항상 동작) =========
  // 목적: 테이블이 AJAX로 변경되어도 정렬 기능이 항상 작동하도록 이벤트 위임 방식 사용
  //   - 이벤트 위임: document에 한 번만 이벤트 리스너를 붙여서 DOM 변경과 무관하게 작동
  //   - 상세 정보 창이 열려있어도 정렬 버튼이 항상 작동
  //   - 리스너 누락/중복/삭제 실패 문제 방지
  // 
  // 한 번만 실행되도록 플래그 확인
  if (!window._sortDelegationBound) {
    window._sortDelegationBound = true;
    
    // document에 클릭 이벤트 위임
    document.addEventListener('click', function (e) {
      const link = e.target.closest('a[data-sort-field]');
      if (!link) return;

      e.preventDefault();
      e.stopPropagation();

      // (중요) stopImmediatePropagation은 부작용이 잦아서 여기선 빼는 걸 추천
      // e.stopImmediatePropagation();

      const sortField = link.getAttribute('data-sort-field');
      const currentSort = link.getAttribute('data-current-sort') || '';
      const currentOrder = link.getAttribute('data-current-order') || 'desc';

      // 디버깅 로그(이제는 무조건 찍혀야 함)
      console.log('[SORT CLICK]', sortField, currentSort, currentOrder);

      handleSortClick(sortField, currentSort, currentOrder);
    }, true); // capture 유지
  }
});


