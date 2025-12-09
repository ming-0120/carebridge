// 병원 목록 페이지 JavaScript
// 공통 함수는 admin_common.js를 참조하세요

/**
 * 병원 선택 함수
 * 
 * 목적: 병원 목록에서 특정 병원을 선택하고 상세 정보를 표시
 *   - 사용자 경험(UX) 개선: 테이블 행 클릭 시 해당 병원의 상세 정보를 AJAX로 로드하여 페이지 새로고침 없이 표시
 *   - 데이터 로딩: admin_common.js의 selectItem 함수를 호출하여 병원 상세 정보를 AJAX로 가져옴
 *   - URL 관리: 선택된 병원 ID를 URL 파라미터로 추가하여 상태를 유지
 * 
 * 동작 방식:
 *   1. admin_common.js의 selectItem 함수를 호출
 *   2. selectItem 함수가 AJAX 요청을 통해 병원 상세 정보를 가져옴
 *   3. 상세 정보 영역을 업데이트하고 스크롤 위치를 유지
 *   4. URL 파라미터를 업데이트하여 선택된 병원 ID를 유지
 *   5. 선택된 행에 'selected' 클래스를 추가하여 시각적으로 표시
 * 
 * 사용 시점:
 *   - 테이블 행 클릭 시 (attachTableRowListeners에서 호출)
 *   - 직접 호출 가능 (다른 이벤트 핸들러에서도 사용 가능)
 * 
 * 관련 함수:
 *   - selectItem (admin_common.js): 실제 상세 정보 로딩 및 업데이트 처리
 *   - attachTableRowListeners: 테이블 행 클릭 이벤트 연결
 * 
 * @param {Event} event - 클릭 이벤트 객체
 *   - 이벤트 객체를 selectItem 함수에 전달하여 스크롤 위치 복원 등에 사용
 *   - preventDefault() 및 stopPropagation()은 호출 전에 처리되어야 함
 * @param {number|string} hospitalId - 선택할 병원의 ID
 *   - 숫자 또는 숫자 문자열 형태
 *   - selectItem 함수에서 'hospital_id' 파라미터로 URL에 추가됨
 *   - 예: 1, 2, 3, "1", "2", "3"
 * 
 * @returns {void} 반환값 없음
 * 
 * @example
 * // 테이블 행 클릭 시 자동 호출
 * selectHospital(event, 1);
 * // 결과:
 * // 1. 병원 ID 1의 상세 정보를 AJAX로 로드
 * // 2. 상세 정보 영역을 업데이트
 * // 3. URL에 ?hospital_id=1 추가
 * // 4. 선택된 행에 'selected' 클래스 추가
 */
function selectHospital(event, hospitalId) {
  // ========= admin_common.js의 selectItem 함수 호출 =========
  // 목적: 공통 함수를 사용하여 병원 선택 및 상세 정보 표시
  //   - 코드 재사용: admin_common.js의 selectItem 함수를 재사용하여 중복 코드 방지
  //   - 일관성 유지: 사용자 목록, 의사 목록 등과 동일한 방식으로 동작
  //   - 유지보수성: 공통 로직 변경 시 모든 목록 페이지에 자동 반영
  // 
  // selectItem(event, hospitalId, 'hospital_id'): 공통 선택 함수 호출
  //   - event: 클릭 이벤트 객체
  //     → selectItem 함수에서 스크롤 위치 복원 등에 사용
  //     → preventDefault() 및 stopPropagation()은 호출 전에 처리되어야 함
  //   - hospitalId: 선택할 병원의 ID (숫자 또는 숫자 문자열)
  //     → 예: 1, 2, 3, "1", "2", "3"
  //     → selectItem 함수에서 숫자로 변환하여 사용
  //   - 'hospital_id': URL 파라미터 이름
  //     → URL에 ?hospital_id=1 형태로 추가됨
  //     → 다른 목록 페이지와 구분하기 위한 파라미터 이름
  //     → 예: 사용자 목록은 'user_id', 의사 목록은 'doctor_id'
  //   - 반환값: 없음 (void)
  //   - 동작:
  //     1. AJAX 요청을 통해 병원 상세 정보를 가져옴
  //     2. 상세 정보 영역을 업데이트
  //     3. URL 파라미터를 업데이트 (?hospital_id=1)
  //     4. 선택된 행에 'selected' 클래스를 추가
  //     5. 스크롤 위치를 유지
  //   - 목적: 병원 선택 및 상세 정보 표시
  //   - 주의: admin_common.js가 로드되어 있어야 함
  selectItem(event, hospitalId, 'hospital_id');
}

// 테이블 행 클릭 이벤트 연결은 admin_common.js의 attachTableRowListeners 함수 사용
// 정렬 링크 이벤트 연결은 admin_common.js의 attachSortListeners 함수 사용

/**
 * 페이지 로드 시 초기화 함수

/**
 * 페이지 로드 시 초기화 함수
 * 
 * 목적: DOM이 완전히 로드된 후 페이지 초기화 작업 수행
 *   - 사용자 경험(UX) 개선: 페이지 로드 시 필요한 이벤트 리스너를 연결하여 기능 활성화
 *   - 상태 복원: URL 파라미터를 확인하여 이전에 선택된 병원 행에 'selected' 클래스 추가
 *   - 이벤트 연결: 테이블 행 클릭, 정렬 링크 클릭 이벤트 연결
 * 
 * 동작 방식:
 *   1. DOMContentLoaded 이벤트 발생 시 실행
 *   2. 테이블 행 클릭 이벤트 리스너 연결 (attachTableRowListeners)
 *   3. 정렬 링크 클릭 이벤트 리스너 연결 (attachSortListeners)
 *   4. URL 파라미터에서 선택된 병원 ID 확인
 *   5. 선택된 병원 행에 'selected' 클래스 추가
 * 
 * 사용 시점:
 *   - 페이지 로드 시 (DOMContentLoaded 이벤트 발생 시 자동 실행)
 *   - 스크립트가 실행되기 전에 DOM이 준비되어 있어야 함
 * 
 * 관련 함수:
 *   - attachTableRowListeners: 테이블 행 클릭 이벤트 연결
 *   - attachSortListeners: 정렬 링크 클릭 이벤트 연결
 * 
 * @example
 * // 자동 실행 (페이지 로드 시)
 * // 결과:
 * // 1. 테이블 행 클릭 이벤트 리스너 연결
 * // 2. 정렬 링크 클릭 이벤트 리스너 연결
 * // 3. URL 파라미터에서 선택된 병원 ID 확인 및 'selected' 클래스 추가
 */
document.addEventListener('DOMContentLoaded', function() {
  // 공통 함수 사용
  attachTableRowListeners('.user-row[data-hospital-id]', 'data-hospital-id', selectHospital);
  attachSortListeners();
  
  // ========= URL 파라미터에서 선택된 병원 ID 확인 =========
  // 목적: URL 파라미터에서 선택된 병원 ID를 확인하여 해당 행에 'selected' 클래스 추가
  //   - 사용자 경험(UX) 개선: 페이지 새로고침 후에도 이전에 선택된 병원 행을 시각적으로 표시
  //   - 상태 복원: URL 파라미터를 통해 이전 상태를 복원
  // 
  // const urlParams = new URLSearchParams(window.location.search): URL 파라미터 객체 생성
  //   - URLSearchParams: URL의 쿼리 문자열을 파싱하고 조작하는 객체
  //   - window.location.search: 현재 URL의 쿼리 문자열 부분
  //     → 예: "?hospital_id=1&page=2" → "?hospital_id=1&page=2"
  //   - new URLSearchParams(): URLSearchParams 객체 생성
  //   - 반환값: URLSearchParams 객체
  //     → get() 메서드를 사용하여 파라미터 값을 읽을 수 있음
  //   - 목적: URL 파라미터를 쉽게 읽기 위한 객체 생성
  const urlParams = new URLSearchParams(window.location.search);
  
  // ========= 선택된 병원 ID 추출 =========
  // 목적: URL 파라미터에서 선택된 병원 ID를 추출
  //   - 상태 복원: 이전에 선택된 병원 ID를 확인하여 해당 행에 'selected' 클래스 추가
  // 
  // urlParams.get('hospital_id'): 'hospital_id' 파라미터 값 읽기
  //   - get: URLSearchParams 객체의 메서드로 파라미터 값을 읽음
  //   - 'hospital_id': 읽을 파라미터 이름
  //   - 반환값: 파라미터 값 (문자열) 또는 null (파라미터가 없으면)
  //     → 예: "1", "2", "3" 또는 null
  //   - 목적: URL 파라미터에서 선택된 병원 ID를 추출
  //   - 주의: 파라미터가 없으면 null이 반환됨
  const selectedHospitalId = urlParams.get('hospital_id');
  
  // ========= 선택된 병원 행에 'selected' 클래스 추가 =========
  // 목적: URL 파라미터에 선택된 병원 ID가 있는 경우 해당 행에 'selected' 클래스 추가
  //   - 사용자 경험(UX) 개선: 페이지 새로고침 후에도 이전에 선택된 병원 행을 시각적으로 표시
  //   - 상태 복원: URL 파라미터를 통해 이전 상태를 복원
  // 
  // if (selectedHospitalId): 선택된 병원 ID가 존재하는지 확인
  //   - selectedHospitalId: 병원 ID (문자열) 또는 null
  //   - truthy 값이면 true (병원 ID가 있음)
  //   - falsy 값(null)이면 false (병원 ID가 없음)
  //   - 목적: 선택된 병원 ID가 있는 경우에만 처리
  if (selectedHospitalId) {
    // ========= 선택된 병원 행 찾기 =========
    // 목적: 선택된 병원 ID에 해당하는 테이블 행을 찾기
    //   - DOM 조작: 선택된 병원 행에 'selected' 클래스를 추가하기 위함
    // 
    // document.querySelector(`[data-hospital-id="${selectedHospitalId}"]`): 선택된 병원 행 찾기
    //   - querySelector: CSS 선택자로 요소를 찾는 메서드
    //   - `[data-hospital-id="${selectedHospitalId}"]`: CSS 선택자
    //     → [data-hospital-id="1"]: data-hospital-id 속성이 "1"인 요소
    //     → 템플릿 리터럴을 사용하여 동적으로 선택자 생성
    //   - 반환값: HTMLElement 객체 또는 null (요소가 없으면)
    //   - 목적: 선택된 병원 ID에 해당하는 테이블 행을 찾기
    //   - 주의: 요소가 없으면 null이 반환됨
    const selectedRow = document.querySelector(`[data-hospital-id="${selectedHospitalId}"]`);
    
    // ========= 선택된 병원 행에 'selected' 클래스 추가 =========
    // 목적: 선택된 병원 행이 존재하는 경우 'selected' 클래스를 추가하여 시각적으로 표시
    //   - 사용자 경험(UX) 개선: 선택된 병원 행을 시각적으로 구분하여 표시
    // 
    // if (selectedRow): 선택된 병원 행이 존재하는지 확인
    //   - selectedRow: 테이블 행 요소 (HTMLElement 객체) 또는 null
    //   - truthy 값이면 true (행이 존재함)
    //   - falsy 값(null)이면 false (행이 없음)
    //   - 목적: 선택된 병원 행이 있는 경우에만 처리
    if (selectedRow) {
      // ========= 'selected' 클래스 추가 =========
      // 목적: 선택된 병원 행에 'selected' 클래스를 추가하여 시각적으로 표시
      //   - 사용자 경험(UX) 개선: 선택된 병원 행을 시각적으로 구분하여 표시
      // 
      // selectedRow.classList.add('selected'): 'selected' 클래스 추가
      //   - classList: 요소의 클래스 목록을 조작하는 객체
      //   - add: 클래스를 추가하는 메서드
      //   - 'selected': 추가할 클래스 이름
      //   - 목적: 선택된 병원 행에 'selected' 클래스를 추가하여 CSS로 스타일링
      //   - 주의: 이미 'selected' 클래스가 있으면 중복 추가되지 않음
      selectedRow.classList.add('selected');
    }
    // 주의: selectedRow가 null이면 'selected' 클래스를 추가하지 않음
  }
  // 주의: selectedHospitalId가 null이면 처리하지 않음
});



