// 사용자 목록 페이지 JavaScript
// 공통 함수는 admin_common.js를 참조하세요

/**
 * 사용자 선택 함수
 * 
 * 목적: 사용자 목록에서 특정 사용자를 선택하고 상세 정보를 표시
 *   - 사용자 경험(UX) 개선: 테이블 행 클릭 시 해당 사용자의 상세 정보를 AJAX로 로드하여 페이지 새로고침 없이 표시
 *   - 데이터 로딩: admin_common.js의 selectItem 함수를 호출하여 사용자 상세 정보를 AJAX로 가져옴
 *   - URL 관리: 선택된 사용자 ID를 URL 파라미터로 추가하여 상태를 유지
 * 
 * 동작 방식:
 *   1. admin_common.js의 selectItem 함수를 호출
 *   2. selectItem 함수가 AJAX 요청을 통해 사용자 상세 정보를 가져옴
 *   3. 상세 정보 영역을 업데이트하고 스크롤 위치를 유지
 *   4. URL 파라미터를 업데이트하여 선택된 사용자 ID를 유지
 *   5. 선택된 행에 'selected' 클래스를 추가하여 시각적으로 표시
 * 
 * 사용 시점:
 *   - 테이블 행 클릭 시 (attachTableRowListeners에서 호출)
 *   - 직접 호출 가능 (다른 이벤트 핸들러에서도 사용 가능)
 * 
 * 관련 함수:
 *   - selectItem (admin_common.js): 실제 상세 정보 로딩 및 업데이트 처리
 *   - attachTableRowListeners (admin_common.js): 테이블 행 클릭 이벤트 연결
 * 
 * @param {Event} event - 클릭 이벤트 객체
 *   - 이벤트 객체를 selectItem 함수에 전달하여 스크롤 위치 복원 등에 사용
 *   - preventDefault() 및 stopPropagation()은 호출 전에 처리되어야 함
 * @param {number|string} userId - 선택할 사용자의 ID
 *   - 숫자 또는 숫자 문자열 형태
 *   - selectItem 함수에서 'user_id' 파라미터로 URL에 추가됨
 *   - 예: 1, 2, 3, "1", "2", "3"
 * 
 * @returns {void} 반환값 없음
 * 
 * @example
 * // 테이블 행 클릭 시 자동 호출
 * selectUser(event, 1);
 * // 결과:
 * // 1. 사용자 ID 1의 상세 정보를 AJAX로 로드
 * // 2. 상세 정보 영역을 업데이트
 * // 3. URL에 ?user_id=1 추가
 * // 4. 선택된 행에 'selected' 클래스 추가
 */
function selectUser(event, userId) {
  // ========= admin_common.js의 selectItem 함수 호출 =========
  // 목적: 공통 함수를 사용하여 사용자 선택 및 상세 정보 표시
  //   - 코드 재사용: admin_common.js의 selectItem 함수를 재사용하여 중복 코드 방지
  //   - 일관성 유지: 의사 목록, 병원 목록 등과 동일한 방식으로 동작
  //   - 유지보수성: 공통 로직 변경 시 모든 목록 페이지에 자동 반영
  // 
  // selectItem(event, userId, 'user_id'): 공통 선택 함수 호출
  //   - event: 클릭 이벤트 객체
  //     → selectItem 함수에서 스크롤 위치 복원 등에 사용
  //     → preventDefault() 및 stopPropagation()은 호출 전에 처리되어야 함
  //   - userId: 선택할 사용자의 ID (숫자 또는 숫자 문자열)
  //     → 예: 1, 2, 3, "1", "2", "3"
  //     → selectItem 함수에서 숫자로 변환하여 사용
  //   - 'user_id': URL 파라미터 이름
  //     → URL에 ?user_id=1 형태로 추가됨
  //     → 다른 목록 페이지와 구분하기 위한 파라미터 이름
  //     → 예: 의사 목록은 'doctor_id', 병원 목록은 'hospital_id'
  //   - 반환값: 없음 (void)
  //   - 동작:
  //     1. AJAX 요청을 통해 사용자 상세 정보를 가져옴
  //     2. 상세 정보 영역을 업데이트
  //     3. URL 파라미터를 업데이트 (?user_id=1)
  //     4. 선택된 행에 'selected' 클래스를 추가
  //     5. 스크롤 위치를 유지
  //   - 목적: 사용자 선택 및 상세 정보 표시
  //   - 주의: admin_common.js가 로드되어 있어야 함
  selectItem(event, userId, 'user_id');
}

/**
 * 더미 사용자 데이터 삭제 확인 함수
 * 
 * 목적: 더미 사용자 데이터 삭제 전 사용자에게 확인 메시지를 표시
 *   - 사용자 경험(UX) 개선: 실수로 데이터를 삭제하는 것을 방지하기 위한 확인 절차 제공
 *   - 데이터 보호: 중요한 데이터 삭제 전 사용자 확인을 통해 실수 방지
 *   - 명확한 의사 표현: 사용자가 의도적으로 삭제를 원하는지 확인
 * 
 * 동작 방식:
 *   1. 브라우저의 confirm() 함수를 사용하여 확인 대화상자 표시
 *   2. 사용자가 '확인'을 클릭하면 true 반환
 *   3. 사용자가 '취소'를 클릭하면 false 반환
 * 
 * 사용 시점:
 *   - 더미 데이터 삭제 버튼 클릭 시 (DOMContentLoaded 이벤트 리스너에서 호출)
 *   - 폼 제출 전 확인이 필요한 경우
 * 
 * 관련 함수:
 *   - DOMContentLoaded 이벤트 리스너: 더미 데이터 삭제 버튼에 이 함수를 연결
 * 
 * @returns {boolean} 사용자 확인 결과
 *   - true: 사용자가 '확인'을 클릭한 경우 (삭제 진행)
 *   - false: 사용자가 '취소'를 클릭한 경우 (삭제 취소)
 * 
 * @example
 * // 더미 데이터 삭제 버튼 클릭 시
 * if (confirmDeleteUserDummy()) {
 *   // 삭제 진행
 * } else {
 *   // 삭제 취소
 * }
 * // 결과:
 * // 1. 확인 대화상자 표시: "더미 사용자 데이터를 모두 삭제하시겠습니까?"
 * // 2. 사용자가 '확인' 클릭 → true 반환 → 삭제 진행
 * // 3. 사용자가 '취소' 클릭 → false 반환 → 삭제 취소
 */
function confirmDeleteUserDummy() {
  // ========= 확인 대화상자 표시 =========
  // 목적: 사용자에게 더미 사용자 데이터 삭제 확인 메시지를 표시
  //   - 사용자 경험(UX) 개선: 실수로 데이터를 삭제하는 것을 방지하기 위한 확인 절차 제공
  //   - 데이터 보호: 중요한 데이터 삭제 전 사용자 확인을 통해 실수 방지
  // 
  // confirm('더미 사용자 데이터를 모두 삭제하시겠습니까?'): 확인 대화상자 표시
  //   - confirm: 브라우저의 내장 함수로 확인 대화상자를 표시
  //   - '더미 사용자 데이터를 모두 삭제하시겠습니까?': 표시할 메시지
  //     → 사용자에게 삭제 작업의 내용을 명확히 전달
  //   - 반환값: boolean
  //     → true: 사용자가 '확인'을 클릭한 경우
  //     → false: 사용자가 '취소'를 클릭한 경우
  //   - 동작:
  //     1. 브라우저에 확인 대화상자 표시
  //     2. 사용자가 '확인' 또는 '취소' 버튼을 클릭할 때까지 대기
  //     3. 사용자의 선택에 따라 true 또는 false 반환
  //   - 목적: 사용자 확인을 통해 실수로 데이터를 삭제하는 것을 방지
  //   - 주의: confirm()은 동기적으로 동작하므로 사용자가 버튼을 클릭할 때까지 코드 실행이 중단됨
  return confirm('더미 사용자 데이터를 모두 삭제하시겠습니까?');
}

/**
 * 페이지 로드 시 초기화 함수
 * 
 * 목적: DOM이 완전히 로드된 후 사용자 목록 페이지 초기화 작업 수행
 *   - 사용자 경험(UX) 개선: 페이지 로드 시 필요한 이벤트 리스너를 연결하여 기능 활성화
 *   - 상태 복원: URL 파라미터를 확인하여 이전에 선택된 사용자 행에 'selected' 클래스 추가
 *   - 이벤트 연결: 테이블 행 클릭, 정렬 링크 클릭, 더미 데이터 삭제 버튼 클릭 이벤트 연결
 * 
 * 동작 방식:
 *   1. DOMContentLoaded 이벤트 발생 시 실행
 *   2. 테이블 행 클릭 이벤트 리스너 연결 (attachTableRowListeners - 공통 함수 사용)
 *   3. 정렬 링크 클릭 이벤트 리스너 연결 (attachSortListeners - 공통 함수 사용)
 *   4. URL 파라미터에서 선택된 사용자 ID 확인
 *   5. 선택된 사용자 행에 'selected' 클래스 추가
 *   6. 더미 데이터 삭제 버튼에 클릭 이벤트 리스너 연결
 * 
 * 사용 시점:
 *   - 페이지 로드 시 (DOMContentLoaded 이벤트 발생 시 자동 실행)
 *   - 스크립트가 실행되기 전에 DOM이 준비되어 있어야 함
 * 
 * 관련 함수:
 *   - attachTableRowListeners (admin_common.js): 테이블 행 클릭 이벤트 연결 (공통 함수)
 *   - attachSortListeners (admin_common.js): 정렬 링크 클릭 이벤트 연결 (공통 함수)
 *   - selectUser: 사용자 선택 및 상세 정보 표시
 *   - confirmDeleteUserDummy: 더미 데이터 삭제 확인
 * 
 * @example
 * // 자동 실행 (페이지 로드 시)
 * // 결과:
 * // 1. 테이블 행 클릭 이벤트 리스너 연결
 * // 2. 정렬 링크 클릭 이벤트 리스너 연결
 * // 3. URL 파라미터에서 선택된 사용자 ID 확인 및 'selected' 클래스 추가
 * // 4. 더미 데이터 삭제 버튼 이벤트 리스너 연결
 */
document.addEventListener('DOMContentLoaded', function() {
  // ========= 테이블 행 클릭 이벤트 리스너 연결 (공통 함수 사용) =========
  // 목적: 사용자 목록 테이블의 각 행에 클릭 이벤트 리스너를 연결
  //   - 사용자 경험(UX) 개선: 테이블 행 클릭 시 해당 사용자의 상세 정보를 표시
  //   - 코드 재사용: admin_common.js의 공통 함수를 사용하여 중복 코드 방지
  // 
  // attachTableRowListeners('.user-row[data-user-id]', 'data-user-id', selectUser): 테이블 행 클릭 이벤트 리스너 연결 함수 호출
  //   - attachTableRowListeners: admin_common.js에 정의된 공통 함수
  //   - '.user-row[data-user-id]': CSS 선택자 (테이블 행을 찾기 위한 선택자)
  //     → .user-row: user-row 클래스를 가진 요소
  //     → [data-user-id]: data-user-id 속성을 가진 요소
  //     → 두 조건을 모두 만족하는 요소만 선택
  //   - 'data-user-id': 사용자 ID를 추출하기 위한 data 속성 이름
  //     → 행 요소에서 사용자 ID를 읽어오기 위한 속성 이름
  //   - selectUser: 행 클릭 시 호출할 함수
  //     → 앞서 정의한 selectUser 함수
  //     → 사용자 선택 및 상세 정보 표시를 처리
  //   - 반환값: 없음 (void)
  //   - 동작:
  //     1. CSS 선택자로 모든 사용자 목록 행을 찾기
  //     2. 각 행에 클릭 이벤트 리스너 연결
  //     3. 행 클릭 시 selectUser 함수 호출
  //   - 목적: 페이지 로드 시 테이블 행 클릭 기능 활성화
  //   - 주의: admin_common.js가 로드되어 있어야 함
  attachTableRowListeners('.user-row[data-user-id]', 'data-user-id', selectUser);
  
  // ========= 페이지네이션 후 이벤트 리스너 재연결 함수 =========
  // 목적: 페이지네이션 완료 후 테이블 행 클릭 이벤트 리스너를 다시 연결
  //   - handlePaginationAjax 함수에서 호출됨
  //   - 페이지네이션으로 새로운 HTML이 추가되면 기존 이벤트 리스너가 사라지므로 다시 연결 필요
  window.reattachTableRowListeners = function() {
    attachTableRowListeners('.user-row[data-user-id]', 'data-user-id', selectUser);
    // 정렬 링크 이벤트 리스너 재연결
    attachSortListeners();
    // 중복 호출 방지: attachPaginationListeners는 admin_common.js의 handlePaginationAjax에서 이미 호출됨
  };
  
  // ========= 정렬 링크 클릭 이벤트 리스너 연결 (공통 함수 사용) =========
  // 목적: 테이블 헤더의 정렬 링크에 클릭 이벤트 리스너를 연결
  //   - 사용자 경험(UX) 개선: 정렬 링크 클릭 시 해당 필드로 정렬
  //   - 코드 재사용: admin_common.js의 공통 함수를 사용하여 중복 코드 방지
  // 
  // attachSortListeners(): 정렬 링크 클릭 이벤트 리스너 연결 함수 호출
  //   - attachSortListeners: admin_common.js에 정의된 공통 함수
  //   - 반환값: 없음 (void)
  //   - 동작: 모든 정렬 링크에 클릭 이벤트 리스너를 연결
  //   - 목적: 페이지 로드 시 정렬 기능 활성화
  //   - 주의: admin_common.js가 로드되어 있어야 함
  attachSortListeners();
  
  // ========= URL 파라미터에서 선택된 사용자 ID 확인 =========
  // 목적: URL 파라미터에서 선택된 사용자 ID를 확인하여 해당 행에 'selected' 클래스 추가
  //   - 사용자 경험(UX) 개선: 페이지 새로고침 후에도 이전에 선택된 사용자 행을 시각적으로 표시
  //   - 상태 복원: URL 파라미터를 통해 이전 상태를 복원
  // 
  // const urlParams = new URLSearchParams(window.location.search): URL 파라미터 객체 생성
  //   - URLSearchParams: URL의 쿼리 문자열을 파싱하고 조작하는 객체
  //   - window.location.search: 현재 URL의 쿼리 문자열 부분
  //     → 예: "?user_id=1&page=2" → "?user_id=1&page=2"
  //   - new URLSearchParams(): URLSearchParams 객체 생성
  //   - 반환값: URLSearchParams 객체
  //     → get() 메서드를 사용하여 파라미터 값을 읽을 수 있음
  //   - 목적: URL 파라미터를 쉽게 읽기 위한 객체 생성
  const urlParams = new URLSearchParams(window.location.search);
  
  // ========= 선택된 사용자 ID 추출 =========
  // 목적: URL 파라미터에서 선택된 사용자 ID를 추출
  //   - 상태 복원: 이전에 선택된 사용자 ID를 확인하여 해당 행에 'selected' 클래스 추가
  // 
  // urlParams.get('user_id'): 'user_id' 파라미터 값 읽기
  //   - get: URLSearchParams 객체의 메서드로 파라미터 값을 읽음
  //   - 'user_id': 읽을 파라미터 이름
  //   - 반환값: 파라미터 값 (문자열) 또는 null (파라미터가 없으면)
  //     → 예: "1", "2", "3" 또는 null
  //   - 목적: URL 파라미터에서 선택된 사용자 ID를 추출
  //   - 주의: 파라미터가 없으면 null이 반환됨
  const selectedUserId = urlParams.get('user_id');
  
  // ========= 선택된 사용자 행에 'selected' 클래스 추가 =========
  // 목적: URL 파라미터에 선택된 사용자 ID가 있는 경우 해당 행에 'selected' 클래스 추가
  //   - 사용자 경험(UX) 개선: 페이지 새로고침 후에도 이전에 선택된 사용자 행을 시각적으로 표시
  //   - 상태 복원: URL 파라미터를 통해 이전 상태를 복원
  // 
  // if (selectedUserId): 선택된 사용자 ID가 존재하는지 확인
  //   - selectedUserId: 사용자 ID (문자열) 또는 null
  //   - truthy 값이면 true (사용자 ID가 있음)
  //   - falsy 값(null)이면 false (사용자 ID가 없음)
  //   - 목적: 선택된 사용자 ID가 있는 경우에만 처리
  if (selectedUserId) {
    // ========= 선택된 사용자 행 찾기 =========
    // 목적: 선택된 사용자 ID에 해당하는 테이블 행을 찾기
    //   - DOM 조작: 선택된 사용자 행에 'selected' 클래스를 추가하기 위함
    // 
    // document.querySelector(`[data-user-id="${selectedUserId}"]`): 선택된 사용자 행 찾기
    //   - querySelector: CSS 선택자로 요소를 찾는 메서드
    //   - `[data-user-id="${selectedUserId}"]`: CSS 선택자
    //     → [data-user-id="1"]: data-user-id 속성이 "1"인 요소
    //     → 템플릿 리터럴을 사용하여 동적으로 선택자 생성
    //   - 반환값: HTMLElement 객체 또는 null (요소가 없으면)
    //   - 목적: 선택된 사용자 ID에 해당하는 테이블 행을 찾기
    //   - 주의: 요소가 없으면 null이 반환됨
    const selectedRow = document.querySelector(`[data-user-id="${selectedUserId}"]`);
    
    // ========= 선택된 사용자 행에 'selected' 클래스 추가 =========
    // 목적: 선택된 사용자 행이 존재하는 경우 'selected' 클래스를 추가하여 시각적으로 표시
    //   - 사용자 경험(UX) 개선: 선택된 사용자 행을 시각적으로 구분하여 표시
    // 
    // if (selectedRow): 선택된 사용자 행이 존재하는지 확인
    //   - selectedRow: 테이블 행 요소 (HTMLElement 객체) 또는 null
    //   - truthy 값이면 true (행이 존재함)
    //   - falsy 값(null)이면 false (행이 없음)
    //   - 목적: 선택된 사용자 행이 있는 경우에만 처리
    if (selectedRow) {
      // ========= 'selected' 클래스 추가 =========
      // 목적: 선택된 사용자 행에 'selected' 클래스를 추가하여 시각적으로 표시
      //   - 사용자 경험(UX) 개선: 선택된 사용자 행을 시각적으로 구분하여 표시
      // 
      // selectedRow.classList.add('selected'): 'selected' 클래스 추가
      //   - classList: 요소의 클래스 목록을 조작하는 객체
      //   - add: 클래스를 추가하는 메서드
      //   - 'selected': 추가할 클래스 이름
      //   - 목적: 선택된 사용자 행에 'selected' 클래스를 추가하여 CSS로 스타일링
      //   - 주의: 이미 'selected' 클래스가 있으면 중복 추가되지 않음
      selectedRow.classList.add('selected');
    }
    // 주의: selectedRow가 null이면 'selected' 클래스를 추가하지 않음
  }
  // 주의: selectedUserId가 null이면 처리하지 않음
  
  // ========= 더미 데이터 삭제 버튼 이벤트 연결 =========
  // 목적: 더미 데이터 삭제 버튼에 클릭 이벤트 리스너를 연결
  //   - 사용자 경험(UX) 개선: 더미 데이터 삭제 전 확인 메시지를 표시하여 실수 방지
  //   - 데이터 보호: 중요한 데이터 삭제 전 사용자 확인을 통해 실수 방지
  // 
  // const deleteBtn = document.getElementById('deleteUserDummyBtn'): 더미 데이터 삭제 버튼 찾기
  //   - getElementById: ID로 요소를 찾는 메서드
  //   - 'deleteUserDummyBtn': 버튼 요소의 ID 속성
  //   - 반환값: HTMLElement 객체 또는 null (요소가 없으면)
  //   - 목적: 더미 데이터 삭제 버튼을 찾기
  //   - 주의: 요소가 없으면 null이 반환됨
  const deleteBtn = document.getElementById('deleteUserDummyBtn');
  
  // ========= 더미 데이터 삭제 버튼 존재 확인 및 이벤트 리스너 연결 =========
  // 목적: 더미 데이터 삭제 버튼이 존재하는 경우에만 클릭 이벤트 리스너를 연결
  //   - 안전성: 버튼이 없으면 에러 발생 방지
  //   - 데이터 보호: 버튼 클릭 시 확인 메시지를 표시하여 실수 방지
  // 
  // if (deleteBtn): 더미 데이터 삭제 버튼이 존재하는지 확인
  //   - deleteBtn: 버튼 요소 (HTMLElement 객체) 또는 null
  //   - truthy 값이면 true (버튼이 존재함)
  //   - falsy 값(null)이면 false (버튼이 없음)
  //   - 목적: 버튼이 있는 경우에만 이벤트 리스너 연결
  if (deleteBtn) {
    // ========= 클릭 이벤트 리스너 연결 =========
    // 목적: 더미 데이터 삭제 버튼 클릭 시 확인 메시지를 표시하고 사용자가 취소하면 폼 제출 방지
    //   - 사용자 경험(UX) 개선: 더미 데이터 삭제 전 확인 메시지를 표시하여 실수 방지
    //   - 데이터 보호: 사용자가 취소하면 폼 제출을 방지하여 데이터 삭제 방지
    // 
    // deleteBtn.addEventListener('click', function(e) {...}): 클릭 이벤트 리스너 연결
    //   - addEventListener: 이벤트 리스너를 추가하는 메서드
    //   - 'click': 이벤트 타입 (클릭 이벤트)
    //   - function(e): 이벤트 핸들러 함수
    //     → e: 클릭 이벤트 객체 (Event 객체)
    //     → 이벤트 객체를 통해 preventDefault() 등을 호출할 수 있음
    //   - 목적: 버튼 클릭 시 확인 메시지를 표시하고 사용자가 취소하면 폼 제출 방지
    deleteBtn.addEventListener('click', function(e) {
      // ========= 확인 메시지 표시 및 폼 제출 방지 =========
      // 목적: 사용자가 확인 메시지에서 '취소'를 클릭한 경우 폼 제출을 방지
      //   - 사용자 경험(UX) 개선: 사용자가 취소하면 데이터 삭제를 방지
      //   - 데이터 보호: 사용자의 의도와 다르게 데이터가 삭제되는 것을 방지
      // 
      // if (!confirmDeleteUserDummy()): 확인 메시지에서 '취소'를 클릭한 경우
      //   - !confirmDeleteUserDummy(): confirmDeleteUserDummy()의 반대값
      //     → confirmDeleteUserDummy()가 false를 반환하면 true (취소 클릭)
      //     → confirmDeleteUserDummy()가 true를 반환하면 false (확인 클릭)
      //   - confirmDeleteUserDummy(): 더미 데이터 삭제 확인 함수 호출
      //     → 확인 대화상자를 표시하고 사용자의 선택에 따라 true 또는 false 반환
      //   - 목적: 사용자가 '취소'를 클릭한 경우에만 처리
      if (!confirmDeleteUserDummy()) {
        // ========= 폼 제출 방지 =========
        // 목적: 사용자가 '취소'를 클릭한 경우 폼 제출을 방지하여 데이터 삭제 방지
        //   - 사용자 경험(UX) 개선: 사용자가 취소하면 데이터 삭제를 방지
        //   - 데이터 보호: 사용자의 의도와 다르게 데이터가 삭제되는 것을 방지
        // 
        // e.preventDefault(): 이벤트의 기본 동작 방지
        //   - preventDefault: 이벤트의 기본 동작을 방지하는 메서드
        //   - <button> 또는 <form>의 기본 동작: 폼 제출
        //   - 목적: 사용자가 '취소'를 클릭한 경우 폼 제출을 방지하여 데이터 삭제 방지
        //   - 주의: preventDefault를 호출하지 않으면 폼이 제출되어 데이터가 삭제됨
        e.preventDefault();
      }
      // 주의: 사용자가 '확인'을 클릭한 경우 폼이 정상적으로 제출됨
    });
  }
  // 주의: deleteBtn이 null이면 이벤트 리스너를 연결하지 않음
  
  // ========= 검색조건 변경 시 검색어 초기화 =========
  // 목적: 검색조건 드롭다운이 변경되면 검색어를 초기화하고 전체 목록으로 이동
  //   - 사용자 경험(UX) 개선: 검색조건 변경 시 이전 검색어를 자동으로 초기화하여 혼란 방지
  // 
  // const searchTypeSelect = document.querySelector('select[name="search_type"]'): 검색조건 드롭다운 찾기
  //   - querySelector: CSS 선택자로 요소를 찾는 메서드
  //   - 'select[name="search_type"]': name 속성이 "search_type"인 select 요소
  //   - 반환값: HTMLElement 객체 또는 null (요소가 없으면)
  const searchTypeSelect = document.querySelector('select[name="search_type"]');
  
  // 검색조건 드롭다운이 존재하는 경우에만 이벤트 리스너 연결
  if (searchTypeSelect) {
    // ========= change 이벤트 리스너 연결 =========
    // 목적: 검색조건이 변경되면 검색어를 초기화하고 전체 목록으로 이동
    // 이벤트 캡처 단계에서 먼저 실행되도록 true로 설정하여 다른 이벤트 리스너보다 먼저 실행
    searchTypeSelect.addEventListener('change', function(e) {
      // 이벤트 전파 중지 (필요한 경우)
      // e.stopPropagation();
      
      // ========= 검색어 입력 필드 초기화 =========
      // 목적: 검색조건이 변경되면 검색어 입력 필드를 비워서 초기 상태로 복원
      // 
      // const searchKeywordInput = document.querySelector('input[name="search_keyword"]'): 검색어 입력 필드 찾기
      //   - querySelector: CSS 선택자로 요소를 찾는 메서드
      //   - 'input[name="search_keyword"]': name 속성이 "search_keyword"인 input 요소
      //   - 반환값: HTMLElement 객체 또는 null (요소가 없으면)
      const searchKeywordInput = document.querySelector('input[name="search_keyword"]');
      
      // 검색어 입력 필드가 존재하면 값 초기화
      if (searchKeywordInput) {
        // ========= 검색어 입력 필드 값 초기화 =========
        // 목적: 검색어 입력 필드의 값을 빈 문자열로 설정하여 초기화
        //   - value: input 요소의 value 속성을 빈 문자열('')로 설정
        //   - 목적: 검색조건이 변경되면 이전 검색어를 제거
        searchKeywordInput.value = '';
      }
      
      // ========= 검색조건이 "검색조건" (빈 값)인 경우 전체 목록으로 이동 =========
      // 목적: 검색조건이 "검색조건" (value="")으로 변경되면 검색어 없이 전체 목록을 보여주기 위해 페이지 이동
      // 
      // if (!this.value || this.value === ''): 검색조건이 빈 값인지 확인
      //   - this.value: 현재 선택된 옵션의 value 속성
      //   - 빈 문자열('')이면 검색조건이 "검색조건" (기본값)으로 설정된 것
      //   - 목적: 검색조건이 "검색조건"으로 변경되면 전체 목록으로 이동
      if (!this.value || this.value === '') {
        // ========= URL에서 검색 파라미터 제거하고 전체 목록으로 이동 =========
        // 목적: 검색조건이 "검색조건"으로 변경되면 검색 파라미터를 제거하고 전체 목록을 보여주기 위해 페이지 이동
        // 
        // window.location.href = window.location.pathname: 현재 URL에서 쿼리 파라미터를 제거하고 기본 경로로 이동
        //   - window.location.pathname: 현재 URL의 경로 부분만 가져옴 (예: '/admin_panel/user_list/')
        //   - window.location.href: 전체 URL을 설정하여 페이지 이동
        //   - 목적: 검색 파라미터를 제거하고 전체 목록을 보여주기 위해 페이지 이동
        //   - 결과: 검색조건과 검색어가 모두 제거된 상태로 페이지가 다시 로드됨
        window.location.href = window.location.pathname;
        // return: 이벤트 핸들러 종료 (다른 이벤트 리스너 실행 방지)
        return false;
      }
      // 주의: 검색조건이 실제 값(예: 'username', 'name' 등)으로 선택된 경우에는 페이지 이동하지 않음
      //   - 사용자가 새로운 검색어를 입력할 수 있도록 검색어 입력 필드만 초기화
    }, true); // 캡처 단계에서 이벤트 리스너 등록 (다른 이벤트 리스너보다 먼저 실행)
  }
  // 주의: searchTypeSelect가 null이면 이벤트 리스너를 연결하지 않음
});



