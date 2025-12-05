// ========= 관리자 페이지 공통 JavaScript =========

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
  const url = new URL(window.location.href);
  url.searchParams.set(paramName, itemId);
  // 페이지 파라미터 유지 (현재 페이지에서 선택)
  
  // 이벤트 발생 시점의 스크롤 위치 저장
  const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop;
  
  // ========= 스크롤 위치를 강제로 고정하는 함수 (Promise 기반) =========
  // 목적: AJAX로 DOM을 업데이트한 후에도 스크롤 위치를 원래대로 복원
  //   - DOM 업데이트 시 브라우저가 자동으로 스크롤 위치를 조정하는 것을 방지
  //   - 사용자가 보고 있던 위치를 유지하여 UX 개선
  //   - Promise 기반으로 비동기 처리하여 DOM 업데이트 완료 후 실행
  // 
  // @param {number} position - 복원할 스크롤 위치 (픽셀 단위)
  //   - 예: 500 (페이지 상단에서 500px 아래)
  //   - 0이면 페이지 상단
  // 
  // @returns {Promise<boolean>} - 스크롤 복원 완료를 나타내는 Promise
  //   - resolve(true): 스크롤 복원 성공
  //   - 비동기 처리로 DOM 업데이트와 스크롤 복원을 분리
  const restoreScroll = (position) => {
    // ========= Promise로 스크롤 복원 로직 감싸기 =========
    // new Promise(resolve => {...}): Promise 객체 생성
    //   - resolve: Promise를 성공 상태로 만드는 함수
    //   - 목적: 비동기 작업을 Promise로 처리하여 DOM 업데이트 완료 후 실행
    //   - 장점: await 또는 .then()으로 스크롤 복원 완료를 기다릴 수 있음
    return new Promise(resolve => {
      // ========= 실제 스크롤 복원 로직 =========
      // doRestore: 스크롤 위치를 복원하는 내부 함수
      //   - setTimeout으로 감싸져 있어 DOM 업데이트 완료 후 실행됨
      const doRestore = () => {
        // ========= 모든 가능한 방법으로 스크롤 위치 설정 =========
        // 브라우저마다 스크롤 위치를 설정하는 방법이 다를 수 있으므로
        // 여러 방법을 모두 시도하여 호환성 확보
        
        // window.scrollTo(x, y): 윈도우를 지정된 좌표로 스크롤
        //   - x: 가로 스크롤 위치 (0 = 왼쪽 끝)
        //   - y: 세로 스크롤 위치 (position = 복원할 위치)
        //   - 표준 방법이지만 모든 브라우저에서 완벽하게 동작하지 않을 수 있음
        window.scrollTo(0, position);
        
        // document.documentElement.scrollTop: HTML 요소의 스크롤 위치 설정
        //   - document.documentElement: <html> 요소
        //   - scrollTop: 요소의 상단에서 스크롤된 거리 (픽셀 단위)
        //   - 일부 브라우저(특히 구형 브라우저)에서 사용
        document.documentElement.scrollTop = position;
        
        // document.body.scrollTop: body 요소의 스크롤 위치 설정
        //   - document.body: <body> 요소
        //   - scrollTop: 요소의 상단에서 스크롤된 거리 (픽셀 단위)
        //   - 일부 브라우저(특히 구형 브라우저)에서 사용
        //   - 주의: 최신 브라우저에서는 document.documentElement.scrollTop을 사용
        document.body.scrollTop = position;
        
        // ========= 현재 스크롤 위치 확인 =========
        // window.pageYOffset: 현재 세로 스크롤 위치 (픽셀 단위)
        //   - 표준 방법이지만 구형 브라우저에서는 지원하지 않을 수 있음
        //   - || 연산자로 대체 방법 제공 (fallback)
        // 
        // document.documentElement.scrollTop: HTML 요소의 현재 스크롤 위치
        //   - 최신 브라우저에서 주로 사용
        // 
        // document.body.scrollTop: body 요소의 현재 스크롤 위치
        //   - 구형 브라우저에서 사용
        // 
        // || 연산자: 첫 번째 truthy 값을 반환
        //   - 예: window.pageYOffset이 0이면 falsy이므로 다음 값 확인
        //   - 예: window.pageYOffset이 500이면 truthy이므로 500 반환
        // 목적: 브라우저 호환성을 위해 여러 방법을 시도
        const currentPos = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop;
        
        // ========= 복원 성공 여부 확인 =========
        // Math.abs(currentPos - position): 현재 위치와 목표 위치의 차이 (절댓값)
        //   - 예: currentPos=505, position=500 → 차이=5
        //   - 예: currentPos=510, position=500 → 차이=10
        // 
        // <= 5: 차이가 5픽셀 이하이면 성공으로 간주
        //   - 이유: 브라우저의 반올림, 픽셀 단위 변환 등으로 정확히 일치하지 않을 수 있음
        //   - 5픽셀 이내의 오차는 허용 (사용자가 느끼기 어려운 수준)
        if (Math.abs(currentPos - position) <= 5) {
          // ========= 스크롤 복원 성공 =========
          // resolve(true): Promise를 성공 상태로 만들고 true 반환
          //   - .then() 또는 await로 이 함수를 호출한 곳에서 성공을 감지할 수 있음
          //   - 스크롤 위치가 정확히 복원되었음을 알림
          resolve(true); // 성공
        } else {
          // ========= 스크롤 복원 실패 시 재시도 =========
          // 스크롤 위치가 정확히 복원되지 않은 경우
          //   - DOM 업데이트가 완전히 끝나지 않았을 수 있음
          //   - 브라우저의 레이아웃 재계산이 아직 진행 중일 수 있음
          // 
          // requestAnimationFrame(callback): 다음 리페인트 전에 콜백 실행
          //   - 브라우저의 렌더링 사이클과 동기화
          //   - DOM 업데이트와 레이아웃 재계산이 완료된 후 실행됨
          //   - 목적: 브라우저가 레이아웃을 완전히 계산한 후 다시 스크롤 복원 시도
          requestAnimationFrame(() => {
            // ========= 재시도: 다시 모든 방법으로 스크롤 위치 설정 =========
            // requestAnimationFrame 내부에서 다시 스크롤 위치 설정
            //   - 브라우저의 레이아웃 재계산이 완료된 후이므로 성공 확률이 높음
            window.scrollTo(0, position);
            document.documentElement.scrollTop = position;
            document.body.scrollTop = position;
            
            // ========= 재시도 후 성공으로 간주 =========
            // resolve(true): 재시도 후 성공으로 간주
            //   - 실제로 정확히 복원되었는지 다시 확인하지 않음
            //   - requestAnimationFrame 후에는 대부분 성공하므로 추가 확인 생략
            //   - 성능 최적화: 무한 루프 방지
            resolve(true); // 재시도 후 성공으로 간주
          });
        }
      };
      
      // ========= DOM 업데이트 완료 대기 =========
      // setTimeout(doRestore, 50): 50ms 후에 doRestore 함수 실행
      //   - 50ms: DOM 업데이트가 완료되기까지의 최소 대기 시간
      //   - 목적: DOM 업데이트와 레이아웃 재계산이 완료된 후 스크롤 복원
      //   - 이유:
      //     → DOM을 업데이트하면 브라우저가 레이아웃을 재계산함
      //     → 레이아웃 재계산 중에는 스크롤 위치가 불안정할 수 있음
      //     → 50ms 지연으로 레이아웃 재계산 완료를 기다림
      //   - 트레이드오프:
      //     → 너무 짧으면: 레이아웃 재계산이 완료되지 않아 스크롤 복원 실패 가능
      //     → 너무 길면: 사용자가 스크롤 이동을 느낄 수 있음 (UX 저하)
      //     → 50ms는 대부분의 경우 적절한 균형점
      // DOM 업데이트가 완료된 후 실행되도록 50ms 지연
      setTimeout(doRestore, 50);
    });
  };
  
  // ========= AJAX로 상세 정보만 업데이트 (페이지 새로고침 없음) =========
  // 목적: 전체 페이지를 새로고침하지 않고 상세 정보 영역만 동적으로 업데이트
  //   - 사용자 경험(UX) 개선: 페이지 새로고침 없이 빠른 응답
  //   - 스크롤 위치 유지: 페이지 새로고침 시 스크롤이 상단으로 이동하는 것을 방지
  //   - 네트워크 효율: 필요한 데이터만 요청하여 대역폭 절약
  // 
  // fetch API: 네트워크 요청을 수행하는 최신 JavaScript API
  //   - XMLHttpRequest의 현대적인 대안
  //   - Promise 기반으로 비동기 처리
  //   - 더 간결하고 읽기 쉬운 코드
  fetch(url.toString(), {
    // ========= HTTP 요청 설정 =========
    // method: HTTP 요청 메서드
    //   - 'GET': 서버에서 데이터를 가져오는 요청 (읽기 전용)
    //   - POST, PUT, DELETE 등 다른 메서드도 사용 가능
    //   - GET 요청은 데이터를 URL 파라미터로 전달
    method: 'GET',
    
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
    // ========= 응답 본문을 JSON으로 파싱 =========
    // response.json(): 응답 본문을 JSON 형식으로 파싱
    //   - 반환값: Promise<Object> (파싱된 JSON 객체를 담은 Promise)
    //   - 서버에서 JSON 형식으로 데이터를 반환한다고 가정
    //   - 예: {'detail_html': '<div>...</div>', 'status': 'success'} 형식
    //   - 주의: 응답이 유효한 JSON이 아니면 에러 발생
    //   - 비동기 처리: JSON 파싱이 완료될 때까지 기다림
    return response.json();
  })
  // ========= JSON 데이터 처리 (두 번째 then) =========
  // .then(async (data) => {...}): JSON 파싱이 완료되면 실행
  //   - data: 서버에서 반환한 JSON 객체 (파싱된 데이터)
  //     → 예: {detail_html: '<div>...</div>', status: 'success'}
  //     → detail_html: 상세 정보를 표시할 HTML 문자열
  //   - async: 비동기 함수로 선언 (await 사용 가능)
  //   - 목적: 서버에서 받은 데이터를 사용하여 DOM을 업데이트
  .then(async (data) => {
    // ========= 스크롤 위치 다시 확인 (DOM 업데이트 전) =========
    // 목적: DOM 업데이트 전에 현재 스크롤 위치를 최종적으로 확인
    //   - AJAX 요청 중에 사용자가 스크롤을 움직였을 수 있음
    //   - 최신 스크롤 위치를 반영하여 정확한 복원 보장
    
    // window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop
    //   - 현재 스크롤 위치를 가져오는 방법 (브라우저 호환성 고려)
    //   - window.pageYOffset: 표준 방법 (최신 브라우저)
    //   - document.documentElement.scrollTop: HTML 요소의 스크롤 위치
    //   - document.body.scrollTop: body 요소의 스크롤 위치 (구형 브라우저)
    //   - || 연산자: 첫 번째 truthy 값을 반환
    //   - 반환값: 현재 스크롤 위치 (픽셀 단위, 숫자)
    const scrollBeforeUpdate = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop;
    
    // ========= 최종 스크롤 위치 결정 =========
    // finalScrollPosition: DOM 업데이트 후 복원할 최종 스크롤 위치
    //   - scrollBeforeUpdate > 0: 현재 스크롤 위치가 0보다 크면 (스크롤이 내려가 있으면)
    //     → scrollBeforeUpdate 사용 (최신 스크롤 위치 반영)
    //   - scrollBeforeUpdate <= 0: 현재 스크롤 위치가 0이면 (페이지 상단에 있으면)
    //     → currentScrollPosition 사용 (이벤트 발생 시점의 스크롤 위치)
    // 
    // 목적: 사용자가 스크롤을 움직이지 않았으면 이벤트 발생 시점의 위치 사용,
    //       사용자가 스크롤을 움직였으면 최신 위치 사용
    // 
    // 예시:
    //   - 이벤트 발생 시점: currentScrollPosition = 500
    //   - AJAX 요청 중 사용자가 스크롤: scrollBeforeUpdate = 600
    //   - 결과: finalScrollPosition = 600 (최신 위치 사용)
    // 
    //   - 이벤트 발생 시점: currentScrollPosition = 500
    //   - AJAX 요청 중 사용자가 스크롤 안 함: scrollBeforeUpdate = 500
    //   - 결과: finalScrollPosition = 500 (원래 위치 사용)
    const finalScrollPosition = scrollBeforeUpdate > 0 ? scrollBeforeUpdate : currentScrollPosition;
    
    // ========= MutationObserver로 DOM 변경 감지하여 스크롤 복원 =========
    // 목적: DOM이 변경될 때마다 자동으로 스크롤 위치를 복원
    //   - DOM 업데이트는 비동기적으로 발생할 수 있음
    //   - MutationObserver는 DOM 변경을 감지하여 콜백 실행
    //   - DOM 변경이 완료된 후 스크롤 복원을 보장
    // 
    // MutationObserver: DOM 트리의 변경사항을 감지하는 API
    //   - 생성자: new MutationObserver(callback)
    //   - callback: DOM 변경이 감지되면 실행되는 함수
    //   - 장점: DOM 변경을 실시간으로 감지하여 반응 가능
    //   - 사용 예: 요소 추가/제거, 속성 변경, 텍스트 변경 등
    const observer = new MutationObserver(() => {
      // ========= DOM 변경 감지 시 스크롤 복원 =========
      // restoreScroll(finalScrollPosition): 스크롤 위치를 복원하는 함수 호출
      //   - finalScrollPosition: 복원할 스크롤 위치
      //   - 반환값: Promise<boolean> (비동기 처리)
      // 
      // .catch(() => {}): Promise가 실패해도 에러를 무시
      //   - catch: Promise가 reject되면 실행되는 핸들러
      //   - () => {}: 빈 함수 (에러를 무시하고 아무 동작도 하지 않음)
      //   - 목적: 스크롤 복원 실패가 전체 로직을 중단시키지 않도록 함
      //   - 이유: 스크롤 복원은 부가 기능이므로 실패해도 페이지 동작에는 영향 없음
      restoreScroll(finalScrollPosition).catch(() => {}); // 에러 무시
    });
    
    // ========= 상세 정보 영역 요소 조회 =========
    // 목적: DOM 업데이트를 위해 필요한 요소들을 미리 조회
    //   - 상세 정보를 표시할 영역을 찾아서 내용을 업데이트
    //   - 요소가 없으면 새로 생성
    
    // document.querySelector(...): CSS 선택자로 요소를 찾는 메서드
    //   - '.user-detail-section, .doctor-detail-section, ...': 여러 클래스 중 하나라도 일치하는 요소 선택
    //     → 쉼표(,)로 구분된 선택자는 OR 조건 (하나라도 일치하면 선택)
    //   - 반환값: 첫 번째로 일치하는 요소 (Element 객체) 또는 null (없으면)
    // 
    // 선택자 설명:
    //   - .user-detail-section: 사용자 목록의 상세 정보 영역
    //   - .doctor-detail-section: 의사 목록의 상세 정보 영역
    //   - .hospital-detail-section: 병원 목록의 상세 정보 영역
    //   - .approval-detail-section: 승인 대기 목록의 상세 정보 영역
    // 
    // 목적: 현재 페이지의 상세 정보 영역을 찾아서 업데이트할 준비
    //   - 요소가 있으면: 기존 내용을 새 내용으로 교체
    //   - 요소가 없으면: 새로 생성하여 추가
    const currentDetailSection = document.querySelector('.user-detail-section, .doctor-detail-section, .hospital-detail-section, .approval-detail-section');
    
    // document.querySelector('.container'): 컨테이너 요소 조회
    //   - .container: 페이지의 메인 컨테이너 요소
    //   - 반환값: 첫 번째로 일치하는 요소 (Element 객체) 또는 null (없으면)
    // 
    // 목적: 상세 정보 영역이 없을 때 추가할 위치를 찾기 위함
    //   - currentDetailSection이 없으면 container에 새로 추가
    //   - container는 페이지의 메인 레이아웃 컨테이너
    const container = document.querySelector('.container');
    
    // ========= MutationObserver 관찰 시작 =========
    // 목적: DOM 변경을 감지하여 스크롤 위치를 자동으로 복원
    //   - observer.observe(): MutationObserver가 특정 요소의 변경을 감지하기 시작
    //   - DOM 업데이트가 발생하면 자동으로 스크롤 복원 함수 호출
    // 
    // 조건: currentDetailSection 또는 container가 존재할 때만 관찰 시작
    //   - currentDetailSection || container: 둘 중 하나라도 존재하면 true
    //   - 이유: 관찰할 요소가 없으면 에러 발생하므로 사전 확인 필요
    if (currentDetailSection || container) {
      // observer.observe(target, options): MutationObserver가 특정 요소를 관찰하기 시작
      //   - target: 관찰할 요소 (currentDetailSection 또는 container)
      //     → currentDetailSection || container: currentDetailSection이 있으면 사용, 없으면 container 사용
      //   - options: 관찰할 변경사항의 종류를 지정하는 객체
      observer.observe(currentDetailSection || container, {
        // childList: true - 자식 요소의 추가/제거를 감지
        //   - 예: 요소가 추가되거나 제거될 때 콜백 실행
        //   - 목적: 상세 정보 영역이 추가/제거될 때 스크롤 복원
        childList: true,
        
        // subtree: true - 하위 트리 전체의 변경을 감지
        //   - 예: 자식 요소의 자식 요소까지 모두 감지
        //   - 목적: 상세 정보 영역 내부의 내용 변경도 감지
        //   - 주의: 성능에 영향을 줄 수 있으므로 필요한 경우에만 사용
        subtree: true,
        
        // attributes: false - 속성 변경을 감지하지 않음
        //   - 예: class, id, data-* 속성 변경은 감지하지 않음
        //   - 목적: 속성 변경은 스크롤에 영향을 주지 않으므로 불필요한 감지 방지
        //   - 성능 최적화: 불필요한 콜백 호출 방지
        attributes: false
      });
    }
    
    // ========= 서버에서 받은 HTML 데이터로 DOM 업데이트 =========
    // data.detail_html: 서버에서 반환한 상세 정보 HTML 문자열
    //   - 예: '<div class="user-detail-section">...</div>'
    //   - 존재 여부 확인: 서버에서 상세 정보를 반환했는지 확인
    if (data.detail_html) {
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
      
      // tempDiv.querySelector(...): 파싱된 HTML에서 상세 정보 영역 요소 찾기
      //   - '.user-detail-section, .doctor-detail-section, ...': 여러 클래스 중 하나라도 일치하는 요소 선택
      //   - 반환값: 첫 번째로 일치하는 요소 (Element 객체) 또는 null (없으면)
      //   - 목적: 서버에서 받은 HTML에서 실제 상세 정보 영역만 추출
      const newDetailSection = tempDiv.querySelector('.user-detail-section, .doctor-detail-section, .hospital-detail-section, .approval-detail-section');
      
      // ========= 상세 정보 영역이 있는 경우 =========
      // newDetailSection: 서버에서 받은 HTML에 상세 정보 영역이 있는지 확인
      if (newDetailSection) {
        // ========= 기존 상세 정보 영역이 있는 경우 =========
        // currentDetailSection: 현재 페이지에 상세 정보 영역이 이미 존재하는지 확인
        if (currentDetailSection) {
          // ========= 승인 대기 목록의 경우 (특별 처리) =========
          // currentDetailSection.classList.contains('approval-detail-section')
          //   - 승인 대기 목록의 상세 정보 영역인지 확인
          //   - 승인 대기 목록은 항상 상세 정보 영역이 존재하므로 구조를 유지하고 내용만 업데이트
          if (currentDetailSection.classList.contains('approval-detail-section')) {
            // 승인대기 목록은 섹션이 항상 존재하므로 내용만 업데이트
            // currentDetailSection.innerHTML: 기존 상세 정보 영역의 내용을 새 내용으로 교체
            //   - newDetailSection.innerHTML: 서버에서 받은 새로운 상세 정보 내용
            //   - 동작: 기존 내용을 완전히 제거하고 새 내용으로 교체
            //   - 목적: 구조는 유지하고 내용만 업데이트하여 스크롤 이동 최소화
            currentDetailSection.innerHTML = newDetailSection.innerHTML;
            
            // DOM 업데이트 후 비동기 스크롤 복원
            // restoreScroll(finalScrollPosition): 스크롤 위치를 복원하는 함수 호출
            //   - finalScrollPosition: 복원할 스크롤 위치
            //   - .then(): Promise가 완료되면 실행 (비동기 처리)
            restoreScroll(finalScrollPosition).then(() => {
              // 복원 완료 후 추가 안전장치 (선택 사항)
            });
          } else {
            // ========= 다른 목록의 경우 (일반 처리) =========
            // 다른 목록은 innerHTML만 업데이트하여 스크롤 이동 방지
            // 클래스와 구조는 유지하고 내용만 변경
            
            // 현재 클래스명 저장 (나중에 비교하기 위함)
            // currentDetailSection.className: 요소의 모든 클래스 이름을 문자열로 반환
            //   - 예: 'user-detail-section active'
            //   - 목적: 클래스가 변경되었는지 확인하여 필요시 업데이트
            const currentClasses = currentDetailSection.className;
            
            // 새 클래스명 저장
            // newDetailSection.className: 서버에서 받은 새 요소의 클래스 이름
            //   - 예: 'user-detail-section'
            //   - 목적: 기존 클래스와 비교하여 변경사항 반영
            const newClasses = newDetailSection.className;
            
            // 스크롤 위치 저장 (DOM 업데이트 전에 저장)
            // finalScrollPosition: 복원할 최종 스크롤 위치
            const savedScroll = finalScrollPosition;
            
            // ========= 스크롤 동작을 일시적으로 비활성화 =========
            // 목적: 브라우저의 자동 스크롤 동작을 방지하여 스크롤 위치 유지
            //   - scroll-behavior: CSS 속성으로 스크롤 동작 방식을 제어
            //   - 'smooth': 부드러운 스크롤 (기본값일 수 있음)
            //   - 'auto': 즉시 스크롤 (자동 조정 방지)
            
            // 원래 스크롤 동작 저장 (나중에 복원하기 위함)
            // document.documentElement.style.scrollBehavior: HTML 요소의 스크롤 동작 설정
            const originalScrollBehavior = document.documentElement.style.scrollBehavior;
            
            // 스크롤 동작을 'auto'로 설정 (자동 조정 방지)
            document.documentElement.style.scrollBehavior = 'auto';
            document.body.style.scrollBehavior = 'auto';
            
            // ========= 핵심 개선: DOM 변경 전에 위치를 고정하고, 변경 직후 복원 시도를 비동기적으로 처리 =========
            // currentDetailSection.innerHTML: 기존 상세 정보 영역의 내용을 새 내용으로 교체
            //   - newDetailSection.innerHTML: 서버에서 받은 새로운 상세 정보 내용
            //   - 동작: 기존 내용을 완전히 제거하고 새 내용으로 교체
            //   - 주의: 이 시점에 브라우저가 레이아웃을 재계산하므로 스크롤 위치가 변경될 수 있음
            //   - 해결: 스크롤 동작을 'auto'로 설정하여 자동 조정 방지
            currentDetailSection.innerHTML = newDetailSection.innerHTML;
            
            // ========= 클래스 업데이트 (변경된 경우) =========
            // currentClasses !== newClasses: 클래스가 변경되었는지 확인
            //   - 예: 'user-detail-section' → 'user-detail-section active'
            //   - 목적: 서버에서 받은 새 클래스를 반영
            if (currentClasses !== newClasses) {
              // currentDetailSection.className: 요소의 클래스 이름을 새 클래스로 교체
              //   - newClasses: 서버에서 받은 새 클래스 이름
              //   - 동작: 기존 클래스를 모두 제거하고 새 클래스로 교체
              currentDetailSection.className = newClasses;
            }
            
            // ========= 스크롤 동작 복원 =========
            // 원래 스크롤 동작으로 복원 (사용자 경험 유지)
            document.documentElement.style.scrollBehavior = originalScrollBehavior;
            document.body.style.scrollBehavior = originalScrollBehavior;
            
            // innerHTML 업데이트 후 비동기 복원 호출
            // restoreScroll(savedScroll): 스크롤 위치를 복원하는 함수 호출
            //   - savedScroll: DOM 업데이트 전에 저장한 스크롤 위치
            //   - .then(): Promise가 완료되면 실행 (비동기 처리)
            restoreScroll(savedScroll).then(() => {
              // 복원 완료 후 추가 안전장치 (선택 사항)
            });
          }
        } else if (container) {
          // ========= 상세 정보 영역이 없으면 추가 (스크롤 위치 고정하면서) =========
          // currentDetailSection이 없고 container가 있는 경우
          //   - 상세 정보 영역이 아직 생성되지 않았으므로 새로 추가해야 함
          //   - container에 추가하여 레이아웃 유지
          
          // 숨겨진 플레이스홀더가 있는지 확인 (placeholder-hidden 클래스 사용)
          // container.querySelector(...): 컨테이너 내에서 숨겨진 플레이스홀더 찾기
          //   - '.user-detail-section.placeholder-hidden, ...': 여러 클래스 조합 중 하나라도 일치하는 요소 선택
          //   - placeholder-hidden: 숨겨진 플레이스홀더를 나타내는 클래스
          //   - 목적: 페이지네이션 등으로 인해 숨겨진 플레이스홀더가 있을 수 있음
          const hiddenPlaceholder = container.querySelector('.user-detail-section.placeholder-hidden, .doctor-detail-section.placeholder-hidden, .hospital-detail-section.placeholder-hidden');
          
          if (hiddenPlaceholder) {
            // ========= 플레이스홀더가 있으면 내용만 업데이트 =========
            // 숨겨진 플레이스홀더가 존재하는 경우
            //   - 플레이스홀더의 내용을 새 상세 정보로 교체
            //   - placeholder-hidden 클래스를 제거하여 표시
            
            // 스크롤 위치 저장
            const savedScroll = finalScrollPosition;
            
            // 스크롤 동작을 일시적으로 비활성화
            const originalScrollBehavior = document.documentElement.style.scrollBehavior;
            document.documentElement.style.scrollBehavior = 'auto';
            document.body.style.scrollBehavior = 'auto';
            
            // 내용 업데이트 (placeholder-hidden 클래스 제거)
            // hiddenPlaceholder.innerHTML: 플레이스홀더의 내용을 새 상세 정보로 교체
            //   - newDetailSection.innerHTML: 서버에서 받은 새로운 상세 정보 내용
            hiddenPlaceholder.innerHTML = newDetailSection.innerHTML;
            
            // 클래스명 업데이트 (placeholder-hidden 제거, 실제 클래스만 유지)
            // hiddenPlaceholder.className: 플레이스홀더의 클래스를 새 클래스로 교체
            //   - newDetailSection.className: 서버에서 받은 새 클래스 이름
            //   - 동작: placeholder-hidden 클래스가 제거되고 실제 클래스만 유지
            //   - 예: 'user-detail-section placeholder-hidden' → 'user-detail-section'
            hiddenPlaceholder.className = newDetailSection.className;
            
            // 스크롤 동작 복원
            document.documentElement.style.scrollBehavior = originalScrollBehavior;
            document.body.style.scrollBehavior = originalScrollBehavior;
            
            // 업데이트 후 비동기 스크롤 복원
            restoreScroll(savedScroll).then(() => {
              // 복원 완료 후 추가 안전장치 (선택 사항)
            });
          } else {
            // ========= 플레이스홀더가 없으면 새로 추가 =========
            // 숨겨진 플레이스홀더가 없는 경우
            //   - 상세 정보 영역을 처음부터 새로 생성하여 추가
            //   - container에 추가하여 레이아웃 유지
            
            // 스크롤 위치 저장
            const savedScroll = finalScrollPosition;
            
            // 요소 추가 전에 스크롤을 완전히 고정
            // 스크롤 동작을 일시적으로 비활성화
            const originalScrollBehavior = document.documentElement.style.scrollBehavior;
            document.documentElement.style.scrollBehavior = 'auto';
            document.body.style.scrollBehavior = 'auto';
            
            // 요소 추가
            // container.appendChild(newDetailSection): 컨테이너에 새 상세 정보 영역 추가
            //   - newDetailSection: 서버에서 받은 새 상세 정보 영역 요소
            //   - 동작: 컨테이너의 마지막 자식으로 추가
            //   - 주의: 이 시점에 브라우저가 레이아웃을 재계산하므로 스크롤 위치가 변경될 수 있음
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
        // ========= 상세 정보가 없으면 제거 =========
        // newDetailSection이 없고 currentDetailSection이 있는 경우
        //   - 서버에서 상세 정보를 반환하지 않았으므로 기존 상세 정보 영역 제거
        //   - 승인 대기 목록은 제외 (항상 상세 정보 영역이 존재해야 함)
        // 
        // 조건:
        //   - currentDetailSection: 기존 상세 정보 영역이 존재
        //   - !currentDetailSection.classList.contains('approval-detail-section'): 승인 대기 목록이 아님
        
        // currentDetailSection.remove(): 요소를 DOM에서 제거
        //   - 동작: 요소와 모든 자식 요소를 DOM 트리에서 제거
        //   - 주의: 이 시점에 브라우저가 레이아웃을 재계산하므로 스크롤 위치가 변경될 수 있음
        currentDetailSection.remove();
        
        // 제거 후 비동기 스크롤 복원
        restoreScroll(finalScrollPosition).then(() => {
          // 복원 완료 후 추가 안전장치 (선택 사항)
        });
      }
    }
    
    // ========= MutationObserver 관찰 중지 =========
    // observer.disconnect(): MutationObserver의 관찰을 중지
    //   - 목적: DOM 업데이트가 완료되었으므로 더 이상 관찰할 필요 없음
    //   - 성능 최적화: 불필요한 콜백 호출 방지
    //   - 메모리 관리: Observer를 정리하여 메모리 누수 방지
    observer.disconnect();
    
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
    //   - 주의: 페이지 새로고침을 하면 서버에서 해당 URL로 페이지를 로드함
    window.history.pushState({}, '', url.toString());
    
    // ========= 최종 스크롤 복원 (DOM 안정화 후) =========
    // 목적: DOM 업데이트가 완전히 안정화된 후 최종적으로 스크롤 위치를 한 번 더 복원
    //   - DOM 업데이트, 레이아웃 재계산, 리페인트 등이 모두 완료된 후 실행
    //   - 이전의 스크롤 복원 시도들이 실패했을 경우를 대비한 안전장치
    //   - 사용자 경험(UX) 개선: 스크롤 위치가 정확히 유지되도록 보장
    // 
    // restoreScroll(finalScrollPosition): 스크롤 위치를 복원하는 함수 호출
    //   - finalScrollPosition: 복원할 최종 스크롤 위치 (픽셀 단위)
    //   - 반환값: Promise<boolean> (비동기 처리)
    //   - 동작:
    //     1. 50ms 지연 후 스크롤 위치 복원 시도
    //     2. 모든 가능한 방법으로 스크롤 위치 설정
    //     3. 복원 성공 여부 확인
    //     4. 실패 시 requestAnimationFrame으로 재시도
    //   - 주의: 이 함수는 Promise를 반환하지만 여기서는 await하지 않음
    //     → 비동기로 실행되므로 다른 코드 실행을 블로킹하지 않음
    //     → DOM 안정화를 기다리기 위해 약간의 지연이 있지만, 전체 로직은 계속 진행됨
    // **개선: DOM이 안정화될 때까지 기다렸다가 최종적으로 한 번 더 복원**
    restoreScroll(finalScrollPosition);
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
  
  // url.searchParams.delete('page'): 페이지 번호 파라미터 제거
  //   - 'page': 페이지 번호 파라미터 이름
  //   - 동작: 파라미터가 있으면 제거, 없으면 아무 동작 안 함
  //   - 목적: 정렬을 변경하면 첫 페이지로 이동
  //   - 이유: 정렬이 변경되면 데이터 순서가 바뀌므로 첫 페이지부터 보여주는 것이 자연스러움
  //   - 예: '?sort=name&order=asc&page=3' → '?sort=name&order=asc' (page 제거)
  url.searchParams.delete('page'); // 정렬 시 첫 페이지로
  
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
  
  // ========= 정렬 URL 생성 =========
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
  
  // ========= 페이지 이동 =========
  // window.location.href: 브라우저의 현재 URL을 변경하여 페이지 이동
  //   - url: 생성된 정렬 URL (문자열)
  //   - 동작: 브라우저가 해당 URL로 전체 페이지를 새로고침하여 이동
  //     → 서버에서 정렬된 데이터를 포함한 전체 HTML 페이지를 받아와서 렌더링
  //     → 스크롤 위치는 페이지 상단으로 이동
  //     → 페이지 상태는 초기화됨
  //   - 결과: 정렬된 목록이 표시됨 (검색 조건은 유지됨)
  //   - 주의: AJAX가 아닌 일반 페이지 이동이므로 전체 페이지가 새로고침됨
  //     → 스크롤 위치는 초기화됨
  //     → 페이지 상태는 초기화됨
  window.location.href = url;
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
 *   - 예: <a href="/admin_panel/users/?page=2" class="page-link">2</a> 클릭 시
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
  // ========= 기본 동작 차단 =========
  // e.preventDefault(): 링크의 기본 동작(페이지 이동) 차단
  //   - 목적: 전체 페이지 새로고침 없이 AJAX로 처리하기 위함
  //   - 기본 동작: <a> 태그 클릭 시 href로 페이지 이동
  //   - 차단 후: AJAX로 필요한 부분만 업데이트
  //   - 사용자 경험(UX) 개선: 빠른 페이지 이동, 스크롤 위치 유지
  e.preventDefault();
  
  // ========= 현재 스크롤 위치 저장 =========
  // 목적: 페이지네이션 후에도 사용자가 보고 있던 스크롤 위치를 유지
  //   - 사용자 경험(UX) 개선: 페이지 이동 후에도 같은 위치에서 계속 볼 수 있음
  //   - 예: 목록 중간 부분을 보고 있다가 다음 페이지로 이동해도 같은 위치 유지
  // 
  // window.pageYOffset || document.documentElement.scrollTop: 크로스 브라우저 호환 스크롤 위치
  //   - window.pageYOffset: 표준 속성 (IE9+)
  //     → 현재 스크롤된 픽셀 수 (세로 스크롤)
  //     → 예: 500 (페이지 상단에서 500px 아래)
  //   - document.documentElement.scrollTop: 대체 속성 (구형 브라우저)
  //     → <html> 요소의 스크롤 위치
  //   - || 연산자: 첫 번째 값이 falsy(0, null, undefined 등)이면 두 번째 값 사용
  //   - 목적: 브라우저 호환성 확보 (모든 브라우저에서 동작)
  //   - 반환값: 스크롤 위치 (숫자, 픽셀 단위)
  //     → 예: 500 (페이지 상단에서 500px 아래)
  //     → 예: 0 (페이지 상단)
  const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
  
  // ========= DOM 요소 조회 (업데이트할 컨테이너) =========
  // 목적: 페이지네이션 후 업데이트할 DOM 요소를 미리 찾아두기
  //   - 성능 최적화: 나중에 여러 번 찾을 필요 없이 한 번만 찾기
  //   - 안전성: 요소가 없으면 업데이트하지 않음 (에러 방지)
  // 
  // document.querySelector('.table-container'): 테이블 목록 컨테이너 찾기
  //   - '.table-container': CSS 선택자
  //   - 반환값: 첫 번째로 일치하는 요소 (HTMLElement 객체) 또는 null (없으면)
  //   - 예: <div class="table-container"><table>...</table></div>
  //   - 목적: 테이블 목록 부분만 업데이트하기 위함
  //   - 주의: 로딩 표시는 현재 구현되지 않았지만, 향후 확장 가능성을 위해 주석에 표시
  const tableContainer = document.querySelector('.table-container');
  
  // document.querySelector('.pagination'): 페이지네이션 컨테이너 찾기
  //   - '.pagination': CSS 선택자
  //   - 반환값: 첫 번째로 일치하는 요소 (HTMLElement 객체) 또는 null (없으면)
  //   - 예: <div class="pagination"><a href="?page=1">1</a><a href="?page=2">2</a>...</div>
  //   - 목적: 페이지네이션 링크 부분만 업데이트하기 위함
  const paginationContainer = document.querySelector('.pagination');
  
  // ========= AJAX 요청 =========
  // 목적: 서버에 요청하여 새로운 페이지의 HTML 받아오기
  //   - 전체 페이지 새로고침 없이 필요한 데이터만 받아오기
  //   - 사용자 경험(UX) 개선: 빠른 페이지 이동
  // 
  // fetch(url, {...}): Fetch API를 사용한 HTTP 요청
  //   - url: 요청할 URL (문자열)
  //     → 예: 'http://localhost:8000/admin_panel/users/?page=2&search_type=name&search_keyword=김'
  //   - 두 번째 인자: 요청 옵션 객체
  //     → method: HTTP 메서드 ('GET', 'POST' 등)
  //     → headers: HTTP 헤더 객체
  //   - 반환값: Promise 객체 (비동기 처리)
  //   - 동작: 서버에 요청을 보내고 응답을 기다림
  fetch(url, {
    // method: 'GET': HTTP GET 메서드 사용
    //   - GET: 서버에서 데이터를 가져오는 요청
    //   - 목적: 페이지네이션은 데이터를 조회하는 것이므로 GET 사용
    method: 'GET',
    
    // headers: HTTP 요청 헤더 설정
    //   - 목적: 서버에 AJAX 요청임을 알리기 위함
    headers: {
      // 'X-Requested-With': 'XMLHttpRequest': AJAX 요청임을 나타내는 헤더
      //   - 'X-Requested-With': 커스텀 HTTP 헤더 이름
      //   - 'XMLHttpRequest': 값 (일반적으로 사용되는 값)
      //   - 목적: 서버에서 일반 페이지 요청과 AJAX 요청을 구분하기 위함
      //   - Django 뷰에서 request.headers.get('X-Requested-With') == 'XMLHttpRequest'로 확인 가능
      //   - 결과: 서버가 JSON 또는 HTML 일부만 반환할 수 있음
      'X-Requested-With': 'XMLHttpRequest',
    }
  })
  // ========= 응답 처리 (첫 번째 .then()) =========
  // 목적: 서버 응답을 받아서 적절한 형식으로 변환
  //   - JSON 응답과 HTML 응답을 구분하여 처리
  //   - 에러 처리: JSON 응답은 페이지네이션이 아니므로 예외 발생
  // 
  // .then(response => {...}): Promise 체이닝 (응답 처리)
  //   - response: 서버 응답 객체 (Response)
  //   - 반환값: Promise 객체 (다음 .then()으로 전달)
  .then(response => {
    // ========= Content-Type 확인 =========
    // 목적: 서버 응답의 형식(JSON 또는 HTML)을 확인
    //   - JSON 응답: 상세 정보만 반환하는 경우 (행 클릭 등)
    //   - HTML 응답: 전체 페이지 HTML (페이지네이션)
    // 
    // response.headers.get('content-type'): 응답의 Content-Type 헤더 읽기
    //   - 'content-type': HTTP 헤더 이름
    //   - 반환값: Content-Type 값 (문자열) 또는 null (없으면)
    //   - 예: 'text/html; charset=utf-8' (HTML 응답)
    //   - 예: 'application/json' (JSON 응답)
    //   - 목적: 응답 형식을 확인하여 적절히 처리
    const contentType = response.headers.get('content-type');
    
    // ========= JSON 응답 처리 =========
    // 조건: Content-Type이 'application/json'을 포함하는 경우
    //   - JSON 응답은 페이지네이션이 아니라 상세 정보만 반환하는 경우
    //   - 예: 행 클릭 시 상세 정보만 AJAX로 받아오는 경우
    //   - 목적: 페이지네이션과 상세 정보 요청을 구분
    // 
    // contentType && contentType.includes('application/json'): JSON 응답인지 확인
    //   - contentType: Content-Type 헤더 값 (문자열 또는 null)
    //   - &&: 논리 AND 연산자 (두 조건이 모두 true여야 true)
    //   - contentType.includes('application/json'): 문자열에 'application/json'이 포함되는지 확인
    //   - 예: contentType='application/json' → true
    //   - 예: contentType='text/html; charset=utf-8' → false
    if (contentType && contentType.includes('application/json')) {
      // ========= JSON 파싱 및 예외 발생 =========
      // 목적: JSON 응답을 파싱하고 예외를 발생시켜서 페이지네이션 처리 건너뛰기
      //   - JSON 응답은 handlePaginationAjax에서 처리하지 않음
      //   - 다른 함수(selectItem 등)에서 처리해야 함
      // 
      // response.json(): 응답 본문을 JSON으로 파싱
      //   - 반환값: Promise 객체 (파싱된 JSON 데이터)
      //   - .then(data => {...}): 파싱 완료 후 실행
      //     → data: 파싱된 JSON 객체
      //   - throw new Error('JSON_RESPONSE'): 예외 발생
      //     → 'JSON_RESPONSE': 예외 메시지 (에러 타입 식별용)
      //     → 목적: .catch() 블록에서 이 예외를 잡아서 처리
      //     → 결과: 페이지네이션 처리를 건너뛰고 에러 처리로 이동
      return response.json().then(data => {
        throw new Error('JSON_RESPONSE'); // JSON 응답은 handlePaginationAjax에서 처리하지 않음
      });
    }
    
    // ========= HTML 응답 처리 =========
    // 목적: HTML 응답을 텍스트로 변환하여 반환
    //   - HTML 응답은 페이지네이션 요청의 정상적인 응답
    //   - 전체 페이지 HTML을 받아서 필요한 부분만 추출
    // 
    // response.text(): 응답 본문을 텍스트(문자열)로 변환
    //   - 반환값: Promise 객체 (텍스트 문자열)
    //   - 예: '<html><body><div class="table-container">...</div></body></html>'
    //   - 목적: HTML 문자열을 받아서 DOM 조작에 사용
    //   - 다음 .then()으로 HTML 문자열이 전달됨
    return response.text();
  })
  // ========= HTML 처리 및 DOM 업데이트 (두 번째 .then()) =========
  // 목적: 받아온 HTML을 파싱하여 필요한 부분만 추출하고 현재 페이지 업데이트
  //   - 임시 DOM 요소를 생성하여 HTML 파싱
  //   - 테이블 목록과 페이지네이션 부분만 추출
  //   - 현재 페이지의 해당 부분만 업데이트
  //   - 스크롤 위치 유지
  // 
  // .then(html => {...}): HTML 문자열 처리
  //   - html: 서버에서 받아온 HTML 문자열
  //     → 예: '<html><body><div class="table-container"><table>...</table></div><div class="pagination">...</div></body></html>'
  //   - 반환값: 없음 (비동기 처리 완료)
  .then(html => {
    // ========= 임시 DOM 요소 생성 =========
    // 목적: HTML 문자열을 파싱하여 DOM 요소로 변환
    //   - document.createElement()로 임시 컨테이너 생성
    //   - innerHTML에 HTML 문자열을 할당하여 파싱
    //   - querySelector()로 필요한 부분만 추출
    // 
    // document.createElement('div'): 임시 div 요소 생성
    //   - 'div': 요소 태그 이름
    //   - 반환값: HTMLDivElement 객체
    //   - 목적: HTML 문자열을 파싱하기 위한 임시 컨테이너
    //   - 주의: 이 요소는 실제 DOM에 추가하지 않음 (메모리에만 존재)
    const tempDiv = document.createElement('div');
    
    // tempDiv.innerHTML = html: HTML 문자열을 할당하여 파싱
    //   - innerHTML: 요소의 내부 HTML 내용을 설정하는 속성
    //   - html: 서버에서 받아온 HTML 문자열
    //   - 동작: 브라우저가 HTML 문자열을 파싱하여 DOM 트리로 변환
    //   - 예: tempDiv.innerHTML = '<div class="table-container">...</div>'
    //     → tempDiv 내부에 실제 DOM 요소들이 생성됨
    //   - 목적: 파싱된 DOM 요소에서 필요한 부분만 추출하기 위함
    tempDiv.innerHTML = html;
    
    // ========= 업데이트할 요소 추출 =========
    // 목적: 파싱된 HTML에서 필요한 부분만 추출
    //   - 테이블 목록 컨테이너와 페이지네이션 컨테이너만 추출
    //   - 전체 HTML이 아닌 필요한 부분만 업데이트
    // 
    // tempDiv.querySelector('.table-container'): 테이블 목록 컨테이너 찾기
    //   - '.table-container': CSS 선택자
    //   - tempDiv: 임시 DOM 요소 내에서 검색
    //   - 반환값: 첫 번째로 일치하는 요소 (HTMLElement 객체) 또는 null (없으면)
    //   - 예: <div class="table-container"><table>...</table></div>
    //   - 목적: 새로운 페이지의 테이블 목록 부분만 추출
    const newTableContainer = tempDiv.querySelector('.table-container');
    
    // tempDiv.querySelector('.pagination'): 페이지네이션 컨테이너 찾기
    //   - '.pagination': CSS 선택자
    //   - tempDiv: 임시 DOM 요소 내에서 검색
    //   - 반환값: 첫 번째로 일치하는 요소 (HTMLElement 객체) 또는 null (없으면)
    //   - 예: <div class="pagination"><a href="?page=1">1</a><a href="?page=2">2</a>...</div>
    //   - 목적: 새로운 페이지의 페이지네이션 링크 부분만 추출
    const newPagination = tempDiv.querySelector('.pagination');
    
    // ========= 상세 정보 영역 확인 =========
    // 목적: 페이지네이션 후에도 상세 정보 영역을 유지하기 위함
    //   - 사용자가 행을 클릭하여 상세 정보를 보고 있는 경우
    //   - 페이지네이션 후에도 상세 정보가 사라지지 않도록 함
    //   - 사용자 경험(UX) 개선: 페이지 이동 후에도 상세 정보 유지
    // 
    // document.querySelector('.user-detail-section, .doctor-detail-section, ...'): 상세 정보 영역 찾기
    //   - '.user-detail-section, .doctor-detail-section, ...': CSS 선택자 (여러 클래스 중 하나)
    //   - 반환값: 첫 번째로 일치하는 요소 (HTMLElement 객체) 또는 null (없으면)
    //   - 예: <div class="user-detail-section">...</div> (사용자 목록)
    //   - 예: <div class="doctor-detail-section">...</div> (의사 목록)
    //   - 예: <div class="hospital-detail-section">...</div> (병원 목록)
    //   - 예: <div class="approval-detail-section">...</div> (승인대기 목록)
    //   - 목적: 페이지네이션 후에도 상세 정보 영역이 있는지 확인
    const currentDetailSection = document.querySelector('.user-detail-section, .doctor-detail-section, .hospital-detail-section, .approval-detail-section');
    
    // document.querySelector('.container'): 메인 컨테이너 찾기
    //   - '.container': CSS 선택자
    //   - 반환값: 첫 번째로 일치하는 요소 (HTMLElement 객체) 또는 null (없으면)
    //   - 예: <div class="container">...</div>
    //   - 목적: 상세 정보 영역이 없을 때 플레이스홀더를 추가하기 위함
    const container = document.querySelector('.container');
    
    // ========= 스크롤 동작 일시적 비활성화 =========
    // 목적: DOM 업데이트 중 브라우저의 자동 스크롤 조정을 방지
    //   - 브라우저는 DOM 변경 시 자동으로 스크롤 위치를 조정할 수 있음
    //   - 스크롤 동작을 'auto'로 설정하여 부드러운 스크롤 효과 비활성화
    //   - 사용자 경험(UX) 개선: 스크롤 위치가 갑자기 변경되지 않도록 함
    // 
    // document.documentElement.style.scrollBehavior: <html> 요소의 스크롤 동작 설정
    //   - scrollBehavior: CSS 속성 ('auto', 'smooth', 'instant')
    //   - 'auto': 기본 동작 (브라우저 기본)
    //   - 'smooth': 부드러운 스크롤 (애니메이션)
    //   - originalScrollBehavior: 원래 값 저장 (나중에 복원하기 위함)
    //   - 목적: DOM 업데이트 중 스크롤 동작을 제어
    const originalScrollBehavior = document.documentElement.style.scrollBehavior;
    
    // document.documentElement.style.scrollBehavior = 'auto': 스크롤 동작을 'auto'로 설정
    //   - 'auto': 기본 동작 (부드러운 스크롤 효과 없음)
    //   - 목적: DOM 업데이트 중 스크롤 위치가 갑자기 변경되지 않도록 함
    document.documentElement.style.scrollBehavior = 'auto';
    
    // document.body.style.scrollBehavior = 'auto': <body> 요소의 스크롤 동작도 'auto'로 설정
    //   - 일부 브라우저에서는 <body> 요소의 스크롤 동작도 설정해야 함
    //   - 목적: 크로스 브라우저 호환성 확보
    document.body.style.scrollBehavior = 'auto';
    
    // ========= 테이블 목록 업데이트 =========
    // 조건: 새로운 테이블 컨테이너와 현재 테이블 컨테이너가 모두 존재하는 경우
    //   - 안전성: 요소가 없으면 업데이트하지 않음 (에러 방지)
    // 
    // newTableContainer && tableContainer: 두 요소가 모두 존재하는지 확인
    //   - newTableContainer: 파싱된 HTML에서 추출한 새로운 테이블 컨테이너
    //   - tableContainer: 현재 페이지의 테이블 컨테이너
    //   - &&: 논리 AND 연산자 (두 조건이 모두 true여야 true)
    //   - 목적: 안전하게 업데이트하기 위함
    if (newTableContainer && tableContainer) {
      // ========= 테이블 목록 내용 교체 =========
      // tableContainer.innerHTML = newTableContainer.innerHTML: 테이블 목록 내용 교체
      //   - tableContainer.innerHTML: 현재 테이블 컨테이너의 내부 HTML
      //   - newTableContainer.innerHTML: 새로운 테이블 컨테이너의 내부 HTML
      //   - 동작: 현재 테이블 목록을 새로운 테이블 목록으로 완전히 교체
      //   - 예: 기존 <table>...</table> → 새로운 <table>...</table>
      //   - 목적: 페이지네이션된 새로운 목록으로 업데이트
      //   - 주의: 이 작업은 DOM을 변경하므로 브라우저가 레이아웃을 다시 계산할 수 있음
      tableContainer.innerHTML = newTableContainer.innerHTML;
      
      // ========= 스크롤 위치 강제 고정 =========
      // 목적: 테이블 목록 업데이트 직후 스크롤 위치를 즉시 복원
      //   - DOM 업데이트 후 브라우저가 자동으로 스크롤 위치를 조정할 수 있음
      //   - 사용자가 보고 있던 위치를 유지하기 위해 즉시 복원
      //   - 사용자 경험(UX) 개선: 페이지 이동 후에도 같은 위치에서 계속 볼 수 있음
      // 
      // window.scrollTo(0, currentScrollPosition): window 객체의 스크롤 위치 설정
      //   - scrollTo(x, y): 스크롤 위치를 지정된 좌표로 이동
      //   - 0: 가로 스크롤 위치 (항상 0, 세로 스크롤만 고려)
      //   - currentScrollPosition: 저장된 세로 스크롤 위치 (픽셀 단위)
      //   - 예: window.scrollTo(0, 500) → 페이지 상단에서 500px 아래로 스크롤
      //   - 목적: 스크롤 위치를 즉시 복원
      window.scrollTo(0, currentScrollPosition);
      
      // document.documentElement.scrollTop = currentScrollPosition: <html> 요소의 스크롤 위치 설정
      //   - scrollTop: 요소의 세로 스크롤 위치 (픽셀 단위)
      //   - currentScrollPosition: 저장된 스크롤 위치
      //   - 목적: 크로스 브라우저 호환성 확보 (일부 브라우저에서 필요)
      document.documentElement.scrollTop = currentScrollPosition;
      
      // document.body.scrollTop = currentScrollPosition: <body> 요소의 스크롤 위치 설정
      //   - scrollTop: 요소의 세로 스크롤 위치 (픽셀 단위)
      //   - currentScrollPosition: 저장된 스크롤 위치
      //   - 목적: 크로스 브라우저 호환성 확보 (구형 브라우저에서 필요)
      document.body.scrollTop = currentScrollPosition;
    }
    
    // ========= 페이지네이션 업데이트 =========
    // 조건: 새로운 페이지네이션 컨테이너와 현재 페이지네이션 컨테이너가 모두 존재하는 경우
    //   - 안전성: 요소가 없으면 업데이트하지 않음 (에러 방지)
    // 
    // newPagination && paginationContainer: 두 요소가 모두 존재하는지 확인
    //   - newPagination: 파싱된 HTML에서 추출한 새로운 페이지네이션 컨테이너
    //   - paginationContainer: 현재 페이지의 페이지네이션 컨테이너
    //   - &&: 논리 AND 연산자 (두 조건이 모두 true여야 true)
    //   - 목적: 안전하게 업데이트하기 위함
    if (newPagination && paginationContainer) {
      // ========= 페이지네이션 내용 교체 =========
      // paginationContainer.innerHTML = newPagination.innerHTML: 페이지네이션 내용 교체
      //   - paginationContainer.innerHTML: 현재 페이지네이션 컨테이너의 내부 HTML
      //   - newPagination.innerHTML: 새로운 페이지네이션 컨테이너의 내부 HTML
      //   - 동작: 현재 페이지네이션 링크를 새로운 페이지네이션 링크로 완전히 교체
      //   - 예: 기존 <a href="?page=1">1</a><a href="?page=2">2</a> → 새로운 <a href="?page=2">2</a><a href="?page=3">3</a>
      //   - 목적: 페이지네이션된 새로운 링크로 업데이트
      //   - 주의: 이 작업은 DOM을 변경하므로 새로 추가된 링크에 이벤트 리스너를 다시 연결해야 함
      paginationContainer.innerHTML = newPagination.innerHTML;
    }
    
    // ========= 스크롤 동작 복원 =========
    // 목적: DOM 업데이트 완료 후 원래 스크롤 동작 설정으로 복원
    //   - DOM 업데이트 중에는 'auto'로 설정했던 스크롤 동작을 원래대로 되돌림
    //   - 사용자 경험(UX) 개선: 부드러운 스크롤 효과가 다시 작동하도록 함
    // 
    // document.documentElement.style.scrollBehavior = originalScrollBehavior: <html> 요소의 스크롤 동작 복원
    //   - originalScrollBehavior: DOM 업데이트 전에 저장했던 원래 스크롤 동작 값
    //     → 예: 'smooth' (부드러운 스크롤)
    //     → 예: '' (기본값, 브라우저 기본 동작)
    //   - 목적: 원래 스크롤 동작으로 복원하여 사용자 경험 유지
    //   - 주의: 원래 값이 없었으면 빈 문자열('')로 설정되어 기본 동작으로 복원됨
    document.documentElement.style.scrollBehavior = originalScrollBehavior;
    
    // document.body.style.scrollBehavior = originalScrollBehavior: <body> 요소의 스크롤 동작도 복원
    //   - originalScrollBehavior: 원래 스크롤 동작 값
    //   - 목적: 크로스 브라우저 호환성 확보 (일부 브라우저에서 <body> 요소도 설정 필요)
    document.body.style.scrollBehavior = originalScrollBehavior;
    
    // ========= DOM 업데이트 직후 스크롤 복원 (핵심 개선) =========
    // 목적: DOM 업데이트 직후 즉시 스크롤 위치를 복원하여 브라우저의 자동 스크롤 조정 방지
    //   - 브라우저는 DOM 변경 시 자동으로 스크롤 위치를 조정할 수 있음
    //   - 특히 테이블 목록이나 페이지네이션이 업데이트되면 레이아웃이 변경되어 스크롤 위치가 바뀔 수 있음
    //   - 사용자가 보고 있던 위치를 유지하기 위해 즉시 복원
    //   - 사용자 경험(UX) 개선: 페이지 이동 후에도 같은 위치에서 계속 볼 수 있음
    //   - 핵심: 여러 방법으로 스크롤 위치를 설정하여 크로스 브라우저 호환성 확보
    // 
    // window.scrollTo(0, currentScrollPosition): window 객체의 스크롤 위치 설정
    //   - scrollTo(x, y): 스크롤 위치를 지정된 좌표로 이동
    //   - 0: 가로 스크롤 위치 (항상 0, 세로 스크롤만 고려)
    //   - currentScrollPosition: 저장된 세로 스크롤 위치 (픽셀 단위)
    //     → 예: 500 (페이지 상단에서 500px 아래)
    //   - 예: window.scrollTo(0, 500) → 페이지 상단에서 500px 아래로 스크롤
    //   - 목적: 표준 방법으로 스크롤 위치를 즉시 복원
    //   - 동작: 브라우저가 스크롤 위치를 즉시 변경 (애니메이션 없음)
    window.scrollTo(0, currentScrollPosition);
    
    // document.documentElement.scrollTop = currentScrollPosition: <html> 요소의 스크롤 위치 설정
    //   - scrollTop: 요소의 세로 스크롤 위치 (픽셀 단위)
    //   - currentScrollPosition: 저장된 스크롤 위치
    //   - 목적: 크로스 브라우저 호환성 확보 (일부 브라우저에서 <html> 요소의 scrollTop 사용)
    //   - 동작: <html> 요소의 스크롤 위치를 직접 설정
    //   - 주의: window.scrollTo()와 함께 사용하여 확실하게 스크롤 위치 설정
    document.documentElement.scrollTop = currentScrollPosition;
    
    // document.body.scrollTop = currentScrollPosition: <body> 요소의 스크롤 위치 설정
    //   - scrollTop: 요소의 세로 스크롤 위치 (픽셀 단위)
    //   - currentScrollPosition: 저장된 스크롤 위치
    //   - 목적: 크로스 브라우저 호환성 확보 (구형 브라우저에서 <body> 요소의 scrollTop 사용)
    //   - 동작: <body> 요소의 스크롤 위치를 직접 설정
    //   - 주의: 구형 브라우저(IE 등)에서는 <body> 요소의 scrollTop을 사용해야 함
    //   - 주의: 최신 브라우저에서는 무시될 수 있지만, 호환성을 위해 설정
    document.body.scrollTop = currentScrollPosition;
    
    // ========= 페이지네이션 후 상세 정보 영역 플레이스홀더 추가 =========
    // 목적: 페이지네이션 후 상세 정보 영역이 없어졌다면 플레이스홀더를 추가하여 스크롤 이동 방지
    //   - 사용자가 행을 클릭하여 상세 정보를 보고 있는 경우
    //   - 페이지네이션 후 새로운 페이지에는 해당 행이 없어서 상세 정보 영역이 사라질 수 있음
    //   - 상세 정보 영역이 사라지면 레이아웃이 변경되어 스크롤 위치가 바뀔 수 있음
    //   - 플레이스홀더를 추가하여 레이아웃을 유지하고 스크롤 위치를 보존
    //   - 사용자 경험(UX) 개선: 페이지 이동 후에도 스크롤 위치가 유지됨
    // 
    // 조건: container가 존재하고, currentDetailSection이 없는 경우
    //   - container: 메인 컨테이너 요소 (플레이스홀더를 추가할 위치)
    //   - !currentDetailSection: 상세 정보 영역이 없는 경우 (사라진 경우)
    //   - &&: 논리 AND 연산자 (두 조건이 모두 true여야 true)
    //   - 목적: 상세 정보 영역이 사라진 경우에만 플레이스홀더 추가
    if (container && !currentDetailSection) {
      // ========= 숨겨진 플레이스홀더 확인 =========
      // 목적: 이미 숨겨진 플레이스홀더가 있는지 확인
      //   - 중복으로 플레이스홀더를 추가하지 않기 위함
      //   - placeholder-hidden 클래스: 플레이스홀더를 숨기는 CSS 클래스
      //     → 예: .placeholder-hidden { display: none; } 또는 높이 0
      //   - 목적: 레이아웃은 유지하되 시각적으로는 보이지 않게 함
      // 
      // container.querySelector('.user-detail-section.placeholder-hidden, ...'): 숨겨진 플레이스홀더 찾기
      //   - '.user-detail-section.placeholder-hidden': CSS 선택자 (두 클래스 모두 가진 요소)
      //     → user-detail-section 클래스와 placeholder-hidden 클래스를 모두 가진 요소
      //   - '.doctor-detail-section.placeholder-hidden': 의사 목록용 플레이스홀더
      //   - '.hospital-detail-section.placeholder-hidden': 병원 목록용 플레이스홀더
      //   - 반환값: 첫 번째로 일치하는 요소 (HTMLElement 객체) 또는 null (없으면)
      //   - 예: <div class="user-detail-section placeholder-hidden"></div>
      //   - 목적: 이미 플레이스홀더가 있으면 추가하지 않음
      const hiddenPlaceholder = container.querySelector('.user-detail-section.placeholder-hidden, .doctor-detail-section.placeholder-hidden, .hospital-detail-section.placeholder-hidden');
      
      // ========= 플레이스홀더 추가 =========
      // 조건: 숨겨진 플레이스홀더가 없는 경우
      //   - !hiddenPlaceholder: hiddenPlaceholder가 null인 경우 (플레이스홀더가 없음)
      //   - 목적: 중복으로 플레이스홀더를 추가하지 않기 위함
      if (!hiddenPlaceholder) {
        // ========= 플레이스홀더 요소 생성 =========
        // document.createElement('div'): 플레이스홀더 div 요소 생성
        //   - 'div': 요소 태그 이름
        //   - 반환값: HTMLDivElement 객체
        //   - 목적: 상세 정보 영역의 공간을 차지할 플레이스홀더 생성
        const placeholder = document.createElement('div');
        
        // placeholder.className = 'user-detail-section placeholder-hidden': 플레이스홀더에 클래스 추가
        //   - className: 요소의 클래스 속성 (문자열)
        //   - 'user-detail-section placeholder-hidden': 두 개의 클래스 이름 (공백으로 구분)
        //     → user-detail-section: 상세 정보 영역 클래스 (레이아웃 유지)
        //     → placeholder-hidden: 숨김 클래스 (시각적으로 숨김)
        //   - 목적: 상세 정보 영역과 동일한 레이아웃을 유지하되 시각적으로는 보이지 않게 함
        //   - 주의: 'user-detail-section'을 기본으로 사용하지만, 실제로는 어떤 목록이든 동일하게 작동
        //     → CSS에서 .placeholder-hidden으로 숨김 처리
        placeholder.className = 'user-detail-section placeholder-hidden';
        
        // container.appendChild(placeholder): 플레이스홀더를 컨테이너에 추가
        //   - appendChild(): 부모 요소의 마지막 자식으로 요소 추가
        //   - container: 메인 컨테이너 요소
        //   - placeholder: 생성한 플레이스홀더 요소
        //   - 동작: 플레이스홀더가 DOM에 추가되어 레이아웃에 영향을 줌
        //   - 목적: 상세 정보 영역이 있던 공간을 유지하여 스크롤 위치가 변경되지 않도록 함
        //   - 결과: 레이아웃이 유지되어 스크롤 위치가 보존됨
        container.appendChild(placeholder);
      }
      // 주의: 이미 숨겨진 플레이스홀더가 있으면 추가하지 않음 (중복 방지)
    }
    // 주의: container가 없거나 currentDetailSection이 있으면 플레이스홀더를 추가하지 않음
    //   - container가 없으면: 플레이스홀더를 추가할 위치가 없음
    //   - currentDetailSection이 있으면: 상세 정보 영역이 이미 존재하므로 플레이스홀더 불필요
    
    // ========= 비동기 스크롤 복원 (브라우저 자동 조정 완료 후) =========
    // 목적: 브라우저의 자동 스크롤 조정이 완료된 후 스크롤 위치를 최종적으로 복원
    //   - 브라우저는 DOM 업데이트 후 레이아웃을 다시 계산하고 스크롤 위치를 조정할 수 있음
    //   - 이 과정이 완료된 후에 스크롤 위치를 복원하여 확실하게 유지
    //   - 사용자 경험(UX) 개선: 브라우저의 자동 조정을 고려한 안정적인 스크롤 복원
    // 
    // restoreScroll(currentScrollPosition): Promise 기반 스크롤 복원 함수 호출
    //   - restoreScroll(): 스크롤 위치를 복원하는 유틸리티 함수 (Promise 반환)
    //   - currentScrollPosition: 저장된 스크롤 위치 (픽셀 단위)
    //   - 반환값: Promise 객체 (비동기 처리)
    //   - 동작:
    //     1. DOM 업데이트가 완료될 때까지 대기 (50ms 지연)
    //     2. 여러 방법으로 스크롤 위치 설정 (window.scrollTo, scrollTop 등)
    //     3. 복원 성공 여부 확인
    //     4. 실패 시 requestAnimationFrame으로 재시도
    //   - 목적: 브라우저의 자동 조정을 고려한 안정적인 스크롤 복원
    //   - .then(() => {...}): 복원 완료 후 실행
    //     → 복원 완료 후 추가 안전장치를 실행할 수 있음 (현재는 비어있음)
    restoreScroll(currentScrollPosition).then(() => {
      // 복원 완료 후 추가 안전장치 (선택 사항)
      //   - 현재는 비어있지만, 향후 추가 로직을 넣을 수 있음
      //   - 예: 스크롤 위치 확인, 추가 복원 시도 등
    });
    
    // ========= 이벤트 리스너 재연결 =========
    // 목적: DOM 업데이트 후 새로 추가된 요소들에 이벤트 리스너를 다시 연결
    //   - 페이지네이션으로 새로운 HTML이 추가되면 기존 이벤트 리스너가 사라짐
    //   - 새로 추가된 요소들에 이벤트 리스너를 다시 연결하여 기능 유지
    //   - 사용자 경험(UX) 개선: 페이지 이동 후에도 모든 기능이 정상 작동
    // 
    // attachPaginationListeners(): 페이지네이션 링크에 AJAX 이벤트 리스너 연결
    //   - 목적: 새로 추가된 페이지네이션 링크에 클릭 이벤트 리스너 연결
    //   - 동작: 모든 페이지네이션 링크를 찾아서 각각에 이벤트 리스너 추가
    //   - 결과: 페이지네이션 링크 클릭 시 AJAX로 페이지 이동
    //   - 주의: 이 함수는 DOM 업데이트 후 반드시 호출해야 함
    attachPaginationListeners();
    
    // ========= 테이블 행 클릭 이벤트 다시 연결 =========
    // 목적: 새로 추가된 테이블 행에 클릭 이벤트 리스너를 다시 연결
    //   - 페이지네이션으로 새로운 테이블 행이 추가되면 기존 이벤트 리스너가 사라짐
    //   - 새로 추가된 행에 클릭 이벤트를 다시 연결하여 상세 정보 표시 기능 유지
    //   - 사용자 경험(UX) 개선: 페이지 이동 후에도 행 클릭 기능이 정상 작동
    // 
    // typeof attachTableRowListeners === 'function': 함수 존재 여부 확인
    //   - typeof: 변수의 타입을 확인하는 연산자
    //   - attachTableRowListeners: 테이블 행에 이벤트 리스너를 연결하는 함수
    //   - 'function': 함수 타입을 나타내는 문자열
    //   - 목적: 함수가 정의되어 있는지 확인 (안전성)
    //   - 이유: 모든 페이지에 이 함수가 정의되어 있지 않을 수 있음
    //   - 예: 일부 페이지는 테이블 행 클릭 기능이 없을 수 있음
    if (typeof attachTableRowListeners === 'function') {
      // attachTableRowListeners(): 테이블 행에 클릭 이벤트 리스너 연결
      //   - 목적: 새로 추가된 테이블 행에 클릭 이벤트 리스너 연결
      //   - 동작: 모든 테이블 행을 찾아서 각각에 클릭 이벤트 리스너 추가
      //   - 결과: 행 클릭 시 상세 정보가 AJAX로 표시됨
      attachTableRowListeners();
    }
    // 주의: attachTableRowListeners 함수가 없으면 실행하지 않음 (에러 방지)
    
    // ========= 체크박스 이벤트 다시 연결 =========
    // 목적: 새로 추가된 체크박스에 이벤트 리스너를 다시 연결
    //   - 페이지네이션으로 새로운 체크박스가 추가되면 기존 이벤트 리스너가 사라짐
    //   - 새로 추가된 체크박스에 이벤트 리스너를 다시 연결하여 기능 유지
    //   - 사용자 경험(UX) 개선: 페이지 이동 후에도 체크박스 기능이 정상 작동
    //   - 예: 승인대기 목록의 체크박스, 1:1 문의 목록의 체크박스 등
    // 
    // typeof attachCheckboxListeners === 'function': 함수 존재 여부 확인
    //   - typeof: 변수의 타입을 확인하는 연산자
    //   - attachCheckboxListeners: 체크박스에 이벤트 리스너를 연결하는 함수
    //   - 'function': 함수 타입을 나타내는 문자열
    //   - 목적: 함수가 정의되어 있는지 확인 (안전성)
    //   - 이유: 모든 페이지에 이 함수가 정의되어 있지 않을 수 있음
    //   - 예: 일부 페이지는 체크박스 기능이 없을 수 있음
    if (typeof attachCheckboxListeners === 'function') {
      // attachCheckboxListeners(): 체크박스에 이벤트 리스너 연결
      //   - 목적: 새로 추가된 체크박스에 이벤트 리스너 연결
      //   - 동작: 모든 체크박스를 찾아서 각각에 이벤트 리스너 추가
      //   - 결과: 체크박스 선택/해제 기능이 정상 작동
      //   - 예: 승인대기 목록에서 여러 의사 선택, 1:1 문의 목록에서 여러 문의 선택 등
      attachCheckboxListeners();
    }
    // 주의: attachCheckboxListeners 함수가 없으면 실행하지 않음 (에러 방지)
    
    // ========= URL 업데이트 (히스토리 관리) =========
    // 목적: 브라우저의 URL과 히스토리를 업데이트하여 페이지 새로고침 없이 URL 변경
    //   - AJAX로 페이지를 이동했지만 URL은 변경되지 않았으므로 수동으로 업데이트
    //   - 사용자 경험(UX) 개선: URL이 현재 페이지를 반영하여 북마크, 공유 등이 가능
    //   - 브라우저 히스토리 관리: 뒤로 가기/앞으로 가기 버튼이 정상 작동
    // 
    // window.history.pushState({}, '', url): 브라우저 히스토리에 새 항목 추가
    //   - pushState(): History API의 메서드 (브라우저 히스토리에 항목 추가)
    //   - 첫 번째 인자 {}: 상태 객체 (현재는 빈 객체, 필요시 데이터 저장 가능)
    //     → 예: {page: 2, search: '김철수'} 등
    //   - 두 번째 인자 '': 제목 (현재는 빈 문자열, 대부분의 브라우저에서 무시됨)
    //   - 세 번째 인자 url: 새로운 URL (문자열)
    //     → 예: 'http://localhost:8000/admin_panel/users/?page=2&search_type=name&search_keyword=김'
    //   - 동작:
    //     1. 브라우저의 URL을 변경 (페이지 새로고침 없음)
    //     2. 브라우저 히스토리에 새 항목 추가
    //     3. 뒤로 가기 버튼을 사용할 수 있게 됨
    //   - 목적: URL이 현재 페이지를 반영하도록 업데이트
    //   - 결과: 사용자가 URL을 복사하거나 북마크할 수 있음
    //   - 주의: 페이지 새로고침은 발생하지 않음 (AJAX 처리)
    window.history.pushState({}, '', url);
    
    // ========= 스크롤 위치 강제 유지 (여러 번 복원하여 확실하게) =========
    // 목적: 여러 시점에서 스크롤 위치를 복원하여 브라우저의 자동 조정을 확실하게 방지
    //   - 브라우저는 DOM 업데이트, 레이아웃 계산, 렌더링 등 여러 단계에서 스크롤 위치를 조정할 수 있음
    //   - 각 단계에서 스크롤 위치를 복원하여 확실하게 유지
    //   - 사용자 경험(UX) 개선: 어떤 상황에서도 스크롤 위치가 유지됨
    //   - 핵심: 여러 번 복원하여 확실하게 보장
    // 
    // 즉시 복원: DOM 업데이트 직후 즉시 복원
    //   - window.scrollTo(0, currentScrollPosition): 스크롤 위치를 즉시 복원
    //   - 목적: DOM 업데이트 직후 브라우저가 자동으로 조정하기 전에 복원
    //   - 동작: 동기적으로 실행되어 즉시 스크롤 위치 설정
    window.scrollTo(0, currentScrollPosition);
    
    // ========= DOM 업데이트 후 복원 =========
    // 목적: 브라우저가 DOM 업데이트와 레이아웃 계산을 완료한 후 스크롤 위치 복원
    //   - requestAnimationFrame(): 브라우저의 다음 리페인트 전에 실행되는 콜백
    //   - 브라우저는 매 프레임마다 DOM 변경사항을 렌더링함 (일반적으로 60fps)
    //   - 목적: 브라우저가 레이아웃을 다시 계산한 후 스크롤 위치 복원
    //   - 사용자 경험(UX) 개선: 레이아웃 변경 후에도 스크롤 위치 유지
    // 
    // requestAnimationFrame(() => {...}): 다음 리페인트 전에 실행
    //   - requestAnimationFrame(): 브라우저의 애니메이션 프레임 요청
    //   - 반환값: 요청 ID (취소 시 사용)
    //   - 동작: 브라우저가 다음 화면을 그리기 전에 콜백 함수 실행
    //   - 목적: DOM 업데이트와 레이아웃 계산이 완료된 후 스크롤 위치 복원
    //   - 예: 60fps인 경우 약 16.67ms 후 실행
    //   - 주의: 브라우저가 활성화되어 있을 때만 실행됨 (백그라운드에서는 일시 중지)
    requestAnimationFrame(() => {
      // window.scrollTo(0, currentScrollPosition): 스크롤 위치 복원
      //   - 목적: 레이아웃 계산 완료 후 스크롤 위치 복원
      window.scrollTo(0, currentScrollPosition);
    });
    
    // ========= 레이아웃 변경 후 복원 =========
    // 목적: 레이아웃 변경이 완전히 완료된 후 스크롤 위치 복원
    //   - setTimeout(..., 0): 현재 실행 중인 코드가 완료된 후 실행
    //   - 목적: 모든 동기 작업이 완료된 후 비동기로 스크롤 위치 복원
    //   - 사용자 경험(UX) 개선: 레이아웃 변경 후에도 스크롤 위치 유지
    // 
    // setTimeout(() => {...}, 0): 다음 이벤트 루프에서 실행
    //   - setTimeout(): 지정된 시간 후에 함수를 실행하는 타이머
    //   - 0: 지연 시간 (밀리초) - 즉시 실행이 아니라 다음 이벤트 루프에서 실행
    //   - 동작: 현재 실행 중인 코드가 모두 완료된 후 콜백 함수 실행
    //   - 목적: 모든 동기 작업(DOM 업데이트, 레이아웃 계산 등)이 완료된 후 실행
    //   - 예: 약 0-4ms 후 실행 (브라우저에 따라 다름)
    //   - 주의: 정확한 시간이 아니라 "가능한 빨리" 실행됨
    setTimeout(() => {
      // window.scrollTo(0, currentScrollPosition): 스크롤 위치 복원
      //   - 목적: 레이아웃 변경 완료 후 스크롤 위치 복원
      window.scrollTo(0, currentScrollPosition);
    }, 0);
    
    // ========= 추가 안전장치 (100ms 후) =========
    // 목적: 모든 작업이 완료된 후 최종적으로 스크롤 위치를 확인하고 필요시 복원
    //   - 브라우저의 자동 조정이 완료된 후 스크롤 위치를 확인
    //   - 스크롤 위치가 변경되었다면 다시 복원
    //   - 사용자 경험(UX) 개선: 어떤 상황에서도 스크롤 위치가 유지됨
    //   - 핵심: 최종 안전장치로 확실하게 보장
    // 
    // setTimeout(() => {...}, 100): 100ms 후 실행
    //   - 100: 지연 시간 (밀리초)
    //   - 목적: 모든 DOM 업데이트, 레이아웃 계산, 렌더링이 완료된 후 실행
    //   - 동작: 브라우저의 모든 자동 조정이 완료된 후 스크롤 위치 확인
    setTimeout(() => {
      // ========= 현재 스크롤 위치 확인 =========
      // window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop: 현재 스크롤 위치
      //   - window.pageYOffset: 표준 속성 (IE9+)
      //   - document.documentElement.scrollTop: <html> 요소의 스크롤 위치
      //   - document.body.scrollTop: <body> 요소의 스크롤 위치 (구형 브라우저)
      //   - || 연산자: 첫 번째 truthy 값을 반환
      //   - 목적: 크로스 브라우저 호환성 확보
      //   - 반환값: 현재 스크롤 위치 (픽셀 단위)
      const newScrollPosition = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop;
      
      // ========= 스크롤 위치 차이 확인 및 복원 =========
      // Math.abs(newScrollPosition - currentScrollPosition) > 10: 스크롤 위치 차이가 10px 이상인지 확인
      //   - Math.abs(): 절댓값 계산
      //   - newScrollPosition: 현재 스크롤 위치
      //   - currentScrollPosition: 저장된 스크롤 위치
      //   - 10: 허용 오차 (픽셀 단위)
      //   - 목적: 작은 차이는 무시하고 큰 차이만 복원
      //   - 이유: 브라우저의 렌더링 오차로 인한 작은 차이는 허용
      //   - 예: newScrollPosition=500, currentScrollPosition=505 → 차이=5px → 복원 안 함
      //   - 예: newScrollPosition=500, currentScrollPosition=520 → 차이=20px → 복원함
      if (Math.abs(newScrollPosition - currentScrollPosition) > 10) {
        // window.scrollTo(0, currentScrollPosition): 스크롤 위치 복원
        //   - 목적: 스크롤 위치가 변경되었다면 다시 복원
        //   - 조건: 차이가 10px 이상인 경우에만 복원
        window.scrollTo(0, currentScrollPosition);
      }
      // 주의: 차이가 10px 이하면 복원하지 않음 (작은 오차는 허용)
    }, 100);
  })
  // ========= 에러 처리 (.catch()) =========
  // 목적: AJAX 요청 중 발생한 에러를 처리하여 사용자 경험 유지
  //   - 네트워크 오류, 서버 오류 등으로 AJAX 요청이 실패할 수 있음
  //   - 에러 발생 시 일반 페이지 이동으로 폴백하여 기능 유지
  //   - 사용자 경험(UX) 개선: 에러 발생 시에도 페이지 이동이 가능
  // 
  // .catch(error => {...}): Promise 체이닝의 에러 처리
  //   - catch(): Promise가 거부(reject)되었을 때 실행되는 핸들러
  //   - error: 에러 객체 (Error 객체 또는 기타 값)
  //   - 반환값: 없음 (에러 처리 완료)
  .catch(error => {
    // ========= JSON 응답 예외 처리 =========
    // 목적: JSON 응답은 페이지네이션이 아니므로 무시
    //   - JSON 응답은 상세 정보만 반환하는 경우 (행 클릭 등)
    //   - handlePaginationAjax에서 JSON 응답을 처리하지 않음
    //   - 다른 함수(selectItem 등)에서 처리해야 함
    //   - 목적: JSON 응답을 에러로 처리하지 않음
    // 
    // error.message === 'JSON_RESPONSE': 에러 메시지가 'JSON_RESPONSE'인지 확인
    //   - error.message: 에러 객체의 메시지 속성
    //   - 'JSON_RESPONSE': 첫 번째 .then()에서 throw한 예외 메시지
    //   - 목적: JSON 응답 예외를 일반 에러와 구분
    //   - 결과: JSON 응답은 에러로 처리하지 않고 무시
    if (error.message === 'JSON_RESPONSE') {
      // return: 함수 종료 (에러 처리 건너뛰기)
      //   - 목적: JSON 응답은 정상적인 응답이므로 에러 처리하지 않음
      //   - 결과: 에러 로그를 출력하지 않고 함수 종료
      return;
    }
    
    // ========= 일반 에러 처리 =========
    // console.error('페이지네이션 오류:', error): 에러 로그 출력
    //   - console.error(): 콘솔에 에러 메시지 출력
    //   - '페이지네이션 오류:': 에러 메시지
    //   - error: 에러 객체 (상세 정보 포함)
    //   - 목적: 개발자가 에러를 확인할 수 있도록 로그 출력
    //   - 주의: 프로덕션 환경에서는 사용자에게는 보이지 않음
    console.error('페이지네이션 오류:', error);
    
    // ========= 일반 페이지 이동으로 폴백 =========
    // 목적: AJAX 요청이 실패했을 때 일반 페이지 이동으로 폴백하여 기능 유지
    //   - AJAX로 페이지 이동이 실패했지만 사용자는 여전히 페이지를 이동할 수 있어야 함
    //   - 사용자 경험(UX) 개선: 에러 발생 시에도 페이지 이동이 가능
    //   - 결과: 전체 페이지가 새로고침되어 이동 (AJAX가 아닌 일반 이동)
    // 
    // window.location.href = url: 브라우저의 현재 URL을 변경하여 페이지 이동
    //   - window.location.href: 브라우저의 현재 URL (읽기/쓰기 가능)
    //   - url: 이동할 페이지의 URL (문자열)
    //     → 예: 'http://localhost:8000/admin_panel/users/?page=2&search_type=name&search_keyword=김'
    //   - 동작: 브라우저가 해당 URL로 전체 페이지를 새로고침하여 이동
    //     → 서버에서 전체 HTML 페이지를 받아와서 렌더링
    //     → 스크롤 위치는 페이지 상단으로 이동
    //     → 페이지 상태는 초기화됨
    //   - 목적: AJAX 실패 시 일반 페이지 이동으로 폴백
    //   - 결과: 페이지가 정상적으로 이동됨 (스크롤 위치는 초기화됨)
    //   - 주의: AJAX가 아닌 일반 페이지 이동이므로 전체 페이지가 새로고침됨
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
  // ========= 페이지네이션 링크 조회 =========
  // 목적: 페이지에 있는 모든 페이지네이션 링크를 찾기
  //   - DOM에서 페이지네이션 링크를 모두 찾아서 이벤트 리스너 연결
  //   - 성능 최적화: 한 번에 모든 링크를 찾아서 처리
  // 
  // document.querySelectorAll('.pagination a.page-link'): 모든 페이지네이션 링크 찾기
  //   - '.pagination a.page-link': CSS 선택자
  //     → .pagination: 페이지네이션 컨테이너
  //     → a: 링크 요소
  //     → .page-link: 페이지 링크 클래스
  //   - 반환값: NodeList 객체 (유사 배열, 모든 일치하는 요소)
  //   - 예: <div class="pagination">
  //          <a href="?page=1" class="page-link">1</a>
  //          <a href="?page=2" class="page-link">2</a>
  //          ...
  //        </div>
  //   - 목적: 모든 페이지네이션 링크를 찾아서 이벤트 리스너 연결
  const paginationLinks = document.querySelectorAll('.pagination a.page-link');
  
  // ========= 각 링크에 이벤트 리스너 연결 =========
  // 목적: 각 페이지네이션 링크에 AJAX 클릭 이벤트 리스너 연결
  //   - forEach(): 배열의 각 요소에 대해 함수 실행
  //   - paginationLinks: 모든 페이지네이션 링크 (NodeList)
  //   - link: 현재 처리 중인 링크 요소
  //   - 동작: 각 링크에 대해 이벤트 리스너 연결
  paginationLinks.forEach(link => {
    // ========= 기존 이벤트 리스너 제거 =========
    // 목적: 기존 이벤트 리스너를 제거하여 중복 연결 방지
    //   - DOM 업데이트 후 이벤트 리스너를 다시 연결할 때 중복 방지
    //   - 안전성: 기존 리스너가 있으면 제거 후 새로 추가
    // 
    // link.removeEventListener('click', link._ajaxHandler): 기존 클릭 이벤트 리스너 제거
    //   - removeEventListener(): 이벤트 리스너 제거
    //   - 'click': 이벤트 타입
    //   - link._ajaxHandler: 제거할 이벤트 핸들러 함수
    //     → _ajaxHandler: 링크 요소에 저장된 이벤트 핸들러 (이전에 추가한 것)
    //     → _ 접두사: 내부 사용을 나타냄 (private 속성 관례)
    //   - 목적: 기존 리스너가 있으면 제거 (없으면 에러 없이 무시됨)
    //   - 주의: 같은 함수 참조를 사용해야 제거됨 (그래서 _ajaxHandler에 저장)
    link.removeEventListener('click', link._ajaxHandler);
    
    // ========= 새로운 이벤트 핸들러 생성 및 저장 =========
    // 목적: AJAX 페이지네이션을 처리하는 이벤트 핸들러 생성 및 저장
    //   - link._ajaxHandler: 링크 요소에 이벤트 핸들러를 저장
    //   - 목적: 나중에 removeEventListener로 제거할 수 있도록 함수 참조 저장
    // 
    // link._ajaxHandler = function(e) {...}: 이벤트 핸들러 함수 생성 및 저장
    //   - _ajaxHandler: 링크 요소의 커스텀 속성 (이벤트 핸들러 저장)
    //   - function(e) {...}: 이벤트 핸들러 함수
    //     → e: 이벤트 객체 (Event)
    //   - handlePaginationAjax(e, link.href): AJAX 페이지네이션 처리 함수 호출
    //     → e: 이벤트 객체 (preventDefault 등에 사용)
    //     → link.href: 링크의 href 속성 (이동할 URL)
    //       → 예: 'http://localhost:8000/admin_panel/users/?page=2'
    //   - 목적: 링크 클릭 시 AJAX로 페이지 이동 처리
    link._ajaxHandler = function(e) {
      handlePaginationAjax(e, link.href);
    };
    
    // ========= 이벤트 리스너 추가 =========
    // 목적: 링크에 클릭 이벤트 리스너 추가
    //   - addEventListener(): 이벤트 리스너 추가
    //   - 'click': 이벤트 타입 (마우스 클릭)
    //   - link._ajaxHandler: 이벤트 핸들러 함수 (위에서 생성한 것)
    //   - 동작: 링크 클릭 시 handlePaginationAjax 함수가 호출됨
    //   - 결과: 페이지 새로고침 없이 AJAX로 페이지 이동
    link.addEventListener('click', link._ajaxHandler);
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
        // ========= 폼 제출 차단 =========
        // e.preventDefault(): 폼의 기본 동작(제출) 차단
        //   - preventDefault(): 이벤트의 기본 동작을 취소
        //   - 목적: 검증 실패 시 폼 제출을 막음
        //   - 결과: 서버로 요청이 전송되지 않음
        e.preventDefault();
        
        // return false: 함수 종료 및 false 반환
        //   - false: 검증 실패를 나타냄
        //   - 목적: 폼 제출을 확실하게 차단
        //   - 주의: preventDefault()와 함께 사용하여 이중으로 차단
        return false;
      }
      // 주의: 검증이 통과하면 폼이 정상적으로 제출됨
    });
  });
  
  // ========= 페이지네이션 링크에 AJAX 이벤트 리스너 추가 =========
  // 목적: 페이지네이션 링크에 AJAX 클릭 이벤트 리스너를 연결하여 페이지 새로고침 없이 페이지 이동
  //   - 사용자 경험(UX) 개선: 페이지 새로고침 없이 빠른 페이지 이동
  //   - 스크롤 위치 유지: 페이지 이동 후에도 사용자가 보고 있던 위치 유지
  //   - 성능 최적화: 전체 HTML 대신 필요한 부분만 업데이트
  // 
  // attachPaginationListeners(): 페이지네이션 링크에 이벤트 리스너 연결 함수 호출
  //   - 목적: 모든 페이지네이션 링크를 찾아서 각각에 AJAX 이벤트 리스너 추가
  //   - 동작:
  //     1. 모든 페이지네이션 링크를 찾기
  //     2. 각 링크에 대해 기존 이벤트 리스너 제거 (중복 방지)
  //     3. 새로운 이벤트 리스너 추가 (AJAX 처리)
  //     4. 링크 클릭 시 handlePaginationAjax 함수 호출
  //   - 결과: 페이지네이션 링크 클릭 시 AJAX로 페이지 이동
  attachPaginationListeners();
  
  // ========= 컨테이너 내부 휠 스크롤 방지 =========
  // 목적: 컨테이너 내부에서 마우스 휠 스크롤을 방지하는 기능 호출 (현재는 비활성화됨)
  //   - preventContainerWheelScroll(): 컨테이너 내부 휠 스크롤 방지 함수 호출
  //   - 현재 상태: 기능이 비활성화되어 있음 (빈 함수)
  //   - 이유: 대시보드 페이지에서도 스크롤이 필요하여 기능을 비활성화
  //   - 결과: 모든 페이지에서 스크롤이 정상적으로 작동함
  //   - 향후 확장: 필요시 함수 내부에 스크롤 방지 로직 추가 가능
  preventContainerWheelScroll();
});


