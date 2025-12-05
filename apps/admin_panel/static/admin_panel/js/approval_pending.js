// 의사 승인 대기 페이지 JavaScript
// 공통 함수는 admin_common.js를 참조하세요

/**
 * 의사 선택 함수 (승인대기 페이지)
 * 
 * 목적: 승인대기 목록에서 의사를 선택하여 상세 정보를 표시
 *   - 사용자 경험(UX) 개선: 행 클릭 시 상세 정보를 AJAX로 표시
 *   - 스크롤 위치 유지: 페이지 새로고침 없이 상세 정보만 업데이트
 *   - 공통 함수 활용: admin_common.js의 selectItem 함수를 사용
 * 
 * 동작 방식:
 *   1. 행 클릭 이벤트 발생 시 호출
 *   2. admin_common.js의 selectItem 함수 호출
 *   3. AJAX로 상세 정보만 업데이트 (페이지 새로고침 없음)
 *   4. 스크롤 위치 유지
 * 
 * @param {Event} event - 클릭 이벤트 객체
 *   - event.preventDefault(): 기본 동작(링크 이동) 차단에 사용
 *   - event.stopPropagation(): 이벤트 전파 방지에 사용
 *   - 예: 행 클릭 시 발생하는 click 이벤트
 * 
 * @param {number|string} doctorId - 선택할 의사의 ID
 *   - doctorId: 의사 고유 식별자
 *   - 예: 1, 2, 3 등
 *   - 목적: 어떤 의사의 상세 정보를 표시할지 지정
 * 
 * @example
 * // 사용 예시 (행 클릭 시)
 * selectDoctor(event, 123);
 * // 결과: 의사 ID 123의 상세 정보가 AJAX로 표시됨
 */
function selectDoctor(event, doctorId) {
  // ========= 공통 함수 호출 =========
  // selectItem(event, doctorId, 'doctor_id'): 공통 선택 함수 호출
  //   - selectItem(): admin_common.js에 정의된 공통 함수
  //   - event: 클릭 이벤트 객체 (preventDefault 등에 사용)
  //   - doctorId: 선택할 의사의 ID
  //   - 'doctor_id': URL 파라미터 이름 (예: ?doctor_id=123)
  //   - 목적: 공통 로직을 재사용하여 코드 중복 방지
  //   - 동작:
  //     1. AJAX로 상세 정보 요청
  //     2. 상세 정보 영역만 업데이트 (페이지 새로고침 없음)
  //     3. 스크롤 위치 유지
  //     4. URL 업데이트 (히스토리 관리)
  //   - 결과: 의사 상세 정보가 표시됨
  selectItem(event, doctorId, 'doctor_id');
}

/**
 * 전체 선택/해제 토글 함수 (승인대기 페이지)
 * 
 * 목적: 승인대기 목록에서 모든 의사를 한 번에 선택하거나 해제
 *   - 사용자 경험(UX) 개선: 전체 선택 체크박스로 모든 항목을 빠르게 선택/해제
 *   - 일괄 처리 지원: 여러 의사를 한 번에 승인/거절할 수 있도록 함
 *   - 시각적 피드백: 선택된 행의 스타일을 업데이트하여 시각적 피드백 제공
 * 
 * 동작 방식:
 *   1. 전체 선택 체크박스의 상태 확인
 *   2. 모든 개별 체크박스의 상태를 전체 선택 체크박스와 동일하게 설정
 *   3. 각 행의 스타일 업데이트 (checkbox-checked 클래스 추가/제거)
 *   4. 선택된 의사 목록 업데이트
 * 
 * 사용 시점:
 *   - 전체 선택 체크박스 클릭 시
 *   - attachCheckboxListeners()에서 이벤트 리스너로 연결됨
 * 
 * @example
 * // 사용 예시 (전체 선택 체크박스 클릭 시)
 * toggleSelectAllApproval();
 * // 결과: 모든 의사가 선택되거나 해제됨
 */
function toggleSelectAllApproval() {
  // ========= 전체 선택 체크박스 조회 =========
  // 목적: 전체 선택 체크박스 요소를 찾아서 상태 확인
  //   - 전체 선택 체크박스: 모든 항목을 한 번에 선택/해제하는 체크박스
  //   - 예: <input type="checkbox" id="selectAll">
  // 
  // document.getElementById('selectAll'): 전체 선택 체크박스 찾기
  //   - 'selectAll': 체크박스의 ID 속성
  //   - 반환값: HTMLInputElement 객체 또는 null (없으면)
  //   - 예: <input type="checkbox" id="selectAll">
  //   - 목적: 전체 선택 체크박스의 상태(checked)를 확인
  //   - checked 속성: true (선택됨) 또는 false (해제됨)
  const selectAllCheckbox = document.getElementById('selectAll');
  
  // ========= 모든 개별 체크박스 조회 =========
  // 목적: 승인대기 목록의 모든 개별 체크박스를 찾기
  //   - 개별 체크박스: 각 의사 행에 있는 체크박스
  //   - 예: <input type="checkbox" name="doctor_checkbox" value="123">
  // 
  // document.querySelectorAll('input[name="doctor_checkbox"]'): 모든 개별 체크박스 찾기
  //   - 'input[name="doctor_checkbox"]': CSS 선택자
  //     → input: <input> 요소
  //     → [name="doctor_checkbox"]: name 속성이 "doctor_checkbox"인 요소
  //   - 반환값: NodeList 객체 (유사 배열, 모든 일치하는 요소)
  //   - 예: <input type="checkbox" name="doctor_checkbox" value="1">
  //        <input type="checkbox" name="doctor_checkbox" value="2">
  //        ...
  //   - 목적: 모든 개별 체크박스의 상태를 업데이트하기 위함
  const checkboxes = document.querySelectorAll('input[name="doctor_checkbox"]');
  
  // ========= 각 체크박스 상태 업데이트 =========
  // 목적: 모든 개별 체크박스의 상태를 전체 선택 체크박스와 동일하게 설정
  //   - forEach(): 배열의 각 요소에 대해 함수 실행
  //   - checkboxes: 모든 개별 체크박스 (NodeList)
  //   - checkbox: 현재 처리 중인 체크박스 요소
  //   - 동작: 각 체크박스에 대해 상태 업데이트 및 스타일 업데이트
  checkboxes.forEach(checkbox => {
    // ========= 체크박스 상태 동기화 =========
    // checkbox.checked = selectAllCheckbox.checked: 체크박스 상태를 전체 선택 체크박스와 동일하게 설정
    //   - checkbox.checked: 개별 체크박스의 선택 상태 (true 또는 false)
    //   - selectAllCheckbox.checked: 전체 선택 체크박스의 선택 상태 (true 또는 false)
    //   - 동작: 개별 체크박스의 상태를 전체 선택 체크박스와 동일하게 설정
    //   - 예: selectAllCheckbox.checked=true → 모든 checkbox.checked=true (전체 선택)
    //   - 예: selectAllCheckbox.checked=false → 모든 checkbox.checked=false (전체 해제)
    //   - 목적: 전체 선택/해제 기능 구현
    checkbox.checked = selectAllCheckbox.checked;
    
    // ========= 행 스타일 업데이트 =========
    // updateRowCheckboxClass(checkbox): 체크박스가 속한 행의 스타일 업데이트
    //   - updateRowCheckboxClass(): 체크박스 상태에 따라 행에 클래스 추가/제거하는 함수
    //   - checkbox: 현재 처리 중인 체크박스 요소
    //   - 동작:
    //     → checkbox.checked=true → 행에 'checkbox-checked' 클래스 추가
    //     → checkbox.checked=false → 행에서 'checkbox-checked' 클래스 제거
    //   - 목적: 선택된 행을 시각적으로 표시하여 사용자에게 피드백 제공
    //   - 결과: 선택된 행이 하이라이트됨 (CSS 스타일 적용)
    updateRowCheckboxClass(checkbox);
  });
  
  // ========= 선택된 의사 목록 업데이트 =========
  // updateSelectedDoctors(): 선택된 의사 목록을 업데이트하는 함수 호출
  //   - updateSelectedDoctors(): 선택된 의사 ID들을 수집하여 hidden input에 저장
  //   - 동작:
  //     1. 선택된 모든 체크박스의 value 값을 수집
  //     2. 쉼표로 구분된 문자열로 변환
  //     3. hidden input (doctorIdsInput)에 저장
  //     4. 전체 선택 체크박스 상태 업데이트 (모든 항목이 선택되었는지 확인)
  //   - 목적: 선택된 의사 ID들을 폼 제출 시 서버로 전송하기 위함
  //   - 결과: 선택된 의사 ID들이 hidden input에 저장됨
  //   - 예: '1,2,3' (의사 ID 1, 2, 3이 선택됨)
  updateSelectedDoctors();
}

/**
 * 선택된 의사 목록 업데이트 함수 (승인대기 페이지)
 * 
 * 목적: 선택된 의사 ID들을 수집하여 hidden input에 저장하고, 전체 선택 체크박스 상태를 업데이트
 *   - 데이터 수집: 선택된 모든 체크박스의 value 값을 수집
 *   - 데이터 저장: 쉼표로 구분된 문자열로 변환하여 hidden input에 저장
 *   - UI 동기화: 전체 선택 체크박스 상태를 실제 선택 상태와 동기화
 *   - 폼 제출 준비: 선택된 의사 ID들을 서버로 전송할 수 있도록 준비
 * 
 * 동작 방식:
 *   1. 선택된 모든 체크박스의 value 값을 수집 (getSelectedItemIds 함수 사용)
 *   2. 배열을 쉼표로 구분된 문자열로 변환
 *   3. hidden input (doctorIdsInput)에 저장
 *   4. 전체 선택 체크박스 상태 업데이트 (모든 항목이 선택되었는지 확인)
 * 
 * 사용 시점:
 *   - 개별 체크박스 선택/해제 시 (attachCheckboxListeners에서 호출)
 *   - 전체 선택/해제 시 (toggleSelectAllApproval에서 호출)
 *   - 페이지 로드 시 (초기 상태 설정)
 * 
 * @example
 * // 사용 예시 (체크박스 선택 시)
 * updateSelectedDoctors();
 * // 결과:
 * // 1. 선택된 의사 ID들이 '1,2,3' 형식으로 hidden input에 저장됨
 * // 2. 전체 선택 체크박스가 모든 항목이 선택되었으면 체크됨
 */
function updateSelectedDoctors() {
  // ========= 선택된 의사 ID 수집 =========
  // 목적: 선택된 모든 체크박스의 value 값을 수집하여 배열로 반환
  //   - getSelectedItemIds(): admin_common.js에 정의된 공통 함수
  //   - 선택된 체크박스의 value 값을 배열로 수집
  //   - 사용자 경험(UX) 개선: 선택된 항목을 자동으로 추적
  // 
  // getSelectedItemIds('doctor_checkbox'): 선택된 의사 ID 목록 반환
  //   - 'doctor_checkbox': 체크박스의 name 속성
  //     → 예: <input type="checkbox" name="doctor_checkbox" value="1">
  //   - 반환값: 선택된 체크박스의 value 값들의 배열
  //     → 예: ['1', '2', '3'] (의사 ID 1, 2, 3이 선택됨)
  //     → 예: [] (선택된 항목이 없음)
  //   - 동작:
  //     1. name="doctor_checkbox"인 모든 체크박스 중 checked=true인 것만 찾기
  //     2. 각 체크박스의 value 값을 배열로 수집
  //     3. 배열 반환
  //   - 목적: 선택된 의사 ID들을 수집하여 폼 제출 시 서버로 전송하기 위함
  const doctorIds = getSelectedItemIds('doctor_checkbox');
  
  // ========= Hidden Input에 선택된 의사 ID 저장 =========
  // 목적: 선택된 의사 ID들을 쉼표로 구분된 문자열로 변환하여 hidden input에 저장
  //   - 폼 제출 시 서버로 전송할 수 있도록 준비
  //   - 사용자 경험(UX) 개선: 선택된 항목이 자동으로 폼에 포함됨
  // 
  // document.getElementById('doctorIdsInput'): Hidden input 요소 찾기
  //   - 'doctorIdsInput': Hidden input의 ID 속성
  //   - 반환값: HTMLInputElement 객체 또는 null (없으면)
  //   - 예: <input type="hidden" id="doctorIdsInput" name="doctor_ids">
  //   - 목적: 선택된 의사 ID들을 저장할 hidden input 찾기
  // 
  // doctorIds.join(','): 배열을 쉼표로 구분된 문자열로 변환
  //   - join(','): 배열의 모든 요소를 쉼표로 연결하여 문자열로 변환
  //   - doctorIds: 선택된 의사 ID 배열
  //   - 반환값: 쉼표로 구분된 문자열
  //     → 예: '1,2,3' (의사 ID 1, 2, 3이 선택됨)
  //     → 예: '1' (의사 ID 1만 선택됨)
  //     → 예: '' (선택된 항목이 없음)
  //   - 목적: 서버로 전송하기 쉬운 형식으로 변환
  //   - 주의: 빈 배열이면 빈 문자열('')이 됨
  // 
  // .value = doctorIds.join(','): Hidden input의 value 속성에 저장
  //   - value: input 요소의 값 속성
  //   - 동작: hidden input의 value를 선택된 의사 ID 문자열로 설정
  //   - 목적: 폼 제출 시 서버로 전송할 수 있도록 준비
  //   - 결과: 선택된 의사 ID들이 hidden input에 저장됨
  //   - 예: <input type="hidden" id="doctorIdsInput" name="doctor_ids" value="1,2,3">
  document.getElementById('doctorIdsInput').value = doctorIds.join(',');
  
  // ========= 전체 선택 체크박스 상태 업데이트 =========
  // 목적: 전체 선택 체크박스의 상태를 실제 선택 상태와 동기화
  //   - 사용자 경험(UX) 개선: 전체 선택 체크박스가 실제 선택 상태를 정확히 반영
  //   - 시각적 피드백: 모든 항목이 선택되었을 때만 전체 선택 체크박스가 체크됨
  //   - 일관성 유지: UI 상태와 실제 데이터 상태를 일치시킴
  // 
  // document.getElementById('selectAll'): 전체 선택 체크박스 찾기
  //   - 'selectAll': 전체 선택 체크박스의 ID 속성
  //   - 반환값: HTMLInputElement 객체 또는 null (없으면)
  //   - 예: <input type="checkbox" id="selectAll">
  //   - 목적: 전체 선택 체크박스의 상태를 업데이트하기 위함
  const selectAllCheckbox = document.getElementById('selectAll');
  
  // document.querySelectorAll('input[name="doctor_checkbox"]'): 모든 개별 체크박스 찾기
  //   - 'input[name="doctor_checkbox"]': CSS 선택자
  //   - 반환값: NodeList 객체 (유사 배열, 모든 일치하는 요소)
  //   - 예: <input type="checkbox" name="doctor_checkbox" value="1">
  //        <input type="checkbox" name="doctor_checkbox" value="2">
  //        ...
  //   - 목적: 전체 체크박스 개수를 확인하기 위함
  const allCheckboxes = document.querySelectorAll('input[name="doctor_checkbox"]');
  
  // ========= 전체 선택 체크박스 상태 계산 및 설정 =========
  // selectAllCheckbox.checked = ...: 전체 선택 체크박스의 상태 설정
  //   - checked: 체크박스의 선택 상태 (true 또는 false)
  //   - 조건: allCheckboxes.length > 0 && doctorIds.length === allCheckboxes.length
  //     → allCheckboxes.length > 0: 체크박스가 하나 이상 존재하는지 확인
  //       → 목적: 체크박스가 없으면 전체 선택 체크박스를 체크하지 않음 (에러 방지)
  //       → 예: 체크박스가 0개 → false (전체 선택 체크박스 해제)
  //       → 예: 체크박스가 3개 → true (다음 조건 확인)
  //     → doctorIds.length === allCheckboxes.length: 선택된 항목 수가 전체 항목 수와 같은지 확인
  //       → 목적: 모든 항목이 선택되었는지 확인
  //       → 예: 체크박스 3개, 선택된 항목 3개 → true (전체 선택 체크박스 체크)
  //       → 예: 체크박스 3개, 선택된 항목 2개 → false (전체 선택 체크박스 해제)
  //       → 예: 체크박스 3개, 선택된 항목 0개 → false (전체 선택 체크박스 해제)
  //   - &&: 논리 AND 연산자 (두 조건이 모두 true여야 true)
  //   - 결과:
  //     → true: 모든 항목이 선택됨 → 전체 선택 체크박스 체크
  //     → false: 일부만 선택되거나 선택되지 않음 → 전체 선택 체크박스 해제
  //   - 목적: 전체 선택 체크박스가 실제 선택 상태를 정확히 반영하도록 함
  //   - 사용자 경험(UX) 개선: 사용자가 전체 선택 상태를 한눈에 파악할 수 있음
  //   - 주의: 체크박스가 없으면 항상 false (에러 방지)
  selectAllCheckbox.checked = allCheckboxes.length > 0 && doctorIds.length === allCheckboxes.length;
}

/**
 * 선택된 의사 승인 함수 (승인대기 페이지)
 * 
 * 목적: 선택된 의사들을 승인하여 verified=True로 업데이트
 *   - 사용자 경험(UX) 개선: 확인 대화상자로 실수 방지
 *   - 데이터 무결성: 선택된 의사 ID들을 서버로 전송하여 승인 처리
 *   - 일괄 처리 지원: 여러 의사를 한 번에 승인할 수 있음
 * 
 * 동작 방식:
 *   1. 선택된 의사 ID 확인 (hidden input에서 읽기)
 *   2. 선택된 의사가 없으면 경고 메시지 표시 및 함수 종료
 *   3. 확인 대화상자로 사용자 확인 요청
 *   4. 확인 시 action='approve'로 설정하고 폼 제출
 * 
 * 사용 시점:
 *   - 승인 버튼 클릭 시 (attachButtonListeners에서 호출)
 * 
 * @example
 * // 사용 예시 (승인 버튼 클릭 시)
 * approveSelected();
 * // 결과:
 * // 1. 선택된 의사가 없으면 경고 메시지 표시
 * // 2. 확인 대화상자 표시
 * // 3. 확인 시 폼 제출하여 서버로 승인 요청 전송
 */
function approveSelected() {
  // ========= 선택된 의사 ID 확인 =========
  // 목적: hidden input에서 선택된 의사 ID들을 읽어오기
  //   - updateSelectedDoctors() 함수에서 저장한 값을 읽음
  //   - 사용자 경험(UX) 개선: 선택된 항목을 자동으로 추적
  // 
  // document.getElementById('doctorIdsInput'): Hidden input 요소 찾기
  //   - 'doctorIdsInput': Hidden input의 ID 속성
  //   - 반환값: HTMLInputElement 객체 또는 null (없으면)
  //   - 예: <input type="hidden" id="doctorIdsInput" name="doctor_ids" value="1,2,3">
  //   - 목적: 선택된 의사 ID들을 읽어오기 위함
  // 
  // .value: Hidden input의 value 속성 읽기
  //   - value: input 요소의 값 (문자열)
  //   - 반환값: 쉼표로 구분된 의사 ID 문자열 또는 빈 문자열
  //     → 예: '1,2,3' (의사 ID 1, 2, 3이 선택됨)
  //     → 예: '1' (의사 ID 1만 선택됨)
  //     → 예: '' (선택된 항목이 없음)
  //   - 목적: 선택된 의사 ID들을 확인하기 위함
  const doctorIds = document.getElementById('doctorIdsInput').value;
  
  // ========= 선택된 의사 확인 =========
  // 목적: 선택된 의사가 있는지 확인하여 유효성 검사
  //   - 사용자 경험(UX) 개선: 선택된 항목이 없을 때 명확한 에러 메시지 제공
  //   - 데이터 무결성: 빈 요청을 서버로 전송하지 않음
  // 
  // !doctorIds: 선택된 의사가 없는지 확인
  //   - ! 연산자: 논리 부정
  //   - doctorIds: 선택된 의사 ID 문자열
  //   - 빈 문자열('')은 falsy이므로 !doctorIds는 true
  //   - 값이 있으면 truthy이므로 !doctorIds는 false
  //   - 예: doctorIds='' → !doctorIds=true (선택된 항목 없음)
  //   - 예: doctorIds='1,2,3' → !doctorIds=false (선택된 항목 있음)
  if (!doctorIds) {
    // ========= 경고 메시지 표시 =========
    // alert('승인할 의사를 선택해주세요.'): 사용자에게 경고 메시지 표시
    //   - alert(): 브라우저의 기본 알림 창 표시
    //   - '승인할 의사를 선택해주세요.': 경고 메시지
    //   - 목적: 사용자에게 무엇이 잘못되었는지 알림
    //   - 주의: alert()는 사용자 경험을 방해할 수 있으므로, 최신 웹에서는 커스텀 모달 사용 권장
    alert('승인할 의사를 선택해주세요.');
    
    // return: 함수 종료
    //   - 목적: 선택된 항목이 없으면 더 이상 진행하지 않음
    //   - 결과: 폼 제출이 취소됨
    return;
  }
  
  // ========= 사용자 확인 요청 =========
  // 목적: 사용자에게 승인 작업을 확인받아 실수 방지
  //   - 사용자 경험(UX) 개선: 중요한 작업 전에 확인 요청
  //   - 데이터 무결성: 실수로 인한 잘못된 승인 방지
  // 
  // confirm('선택한 의사를 승인하시겠습니까?'): 확인 대화상자 표시
  //   - confirm(): 브라우저의 기본 확인 대화상자 표시
  //   - '선택한 의사를 승인하시겠습니까?': 확인 메시지
  //   - 반환값: true (확인) 또는 false (취소)
  //   - 동작: 사용자가 확인 또는 취소 버튼을 클릭할 때까지 대기
  //   - 목적: 사용자에게 승인 작업을 확인받기 위함
  //   - 주의: confirm()은 사용자 경험을 방해할 수 있으므로, 최신 웹에서는 커스텀 모달 사용 권장
  if (confirm('선택한 의사를 승인하시겠습니까?')) {
    // ========= 액션 설정 =========
    // document.getElementById('actionInput'): 액션 input 요소 찾기
    //   - 'actionInput': 액션 input의 ID 속성
    //   - 반환값: HTMLInputElement 객체 또는 null (없으면)
    //   - 예: <input type="hidden" id="actionInput" name="action">
    //   - 목적: 서버에 어떤 작업을 수행할지 알리기 위함
    // 
    // .value = 'approve': 액션을 'approve'로 설정
    //   - 'approve': 승인 액션을 나타내는 값
    //   - 동작: hidden input의 value를 'approve'로 설정
    //   - 목적: 서버에서 이 값에 따라 승인 처리 수행
    //   - 결과: <input type="hidden" id="actionInput" name="action" value="approve">
    document.getElementById('actionInput').value = 'approve';
    
    // ========= 폼 제출 =========
    // document.getElementById('approvalForm'): 승인 폼 요소 찾기
    //   - 'approvalForm': 폼의 ID 속성
    //   - 반환값: HTMLFormElement 객체 또는 null (없으면)
    //   - 예: <form id="approvalForm" method="POST" action="/admin_panel/approval_pending/">
    //   - 목적: 폼을 제출하여 서버로 승인 요청 전송
    // 
    // .submit(): 폼 제출
    //   - submit(): 폼의 제출 이벤트를 발생시킴
    //   - 동작:
    //     1. 폼의 action 속성에 지정된 URL로 POST 요청 전송
    //     2. 폼의 모든 input 요소의 name과 value를 서버로 전송
    //     3. 서버에서 승인 처리 수행 (verified=True로 업데이트)
    //     4. 페이지가 새로고침되어 업데이트된 목록 표시
    //   - 전송되는 데이터:
    //     → action='approve' (승인 액션)
    //     → doctor_ids='1,2,3' (선택된 의사 ID들)
    //   - 목적: 선택된 의사들을 승인하기 위해 서버로 요청 전송
    //   - 결과: 서버에서 승인 처리 후 페이지 새로고침
    document.getElementById('approvalForm').submit();
  }
  // 주의: 사용자가 취소를 클릭하면 아무 동작도 하지 않음
}

/**
 * 선택된 의사 거절 함수 (승인대기 페이지)
 * 
 * 목적: 선택된 의사들의 승인을 거절하여 데이터 삭제
 *   - 사용자 경험(UX) 개선: 확인 대화상자로 실수 방지 (되돌릴 수 없음을 명시)
 *   - 데이터 무결성: 선택된 의사 ID들을 서버로 전송하여 거절 처리
 *   - 일괄 처리 지원: 여러 의사를 한 번에 거절할 수 있음
 *   - 주의: 이 작업은 되돌릴 수 없음 (데이터 삭제)
 * 
 * 동작 방식:
 *   1. 선택된 의사 ID 확인 (hidden input에서 읽기)
 *   2. 선택된 의사가 없으면 경고 메시지 표시 및 함수 종료
 *   3. 확인 대화상자로 사용자 확인 요청 (되돌릴 수 없음을 명시)
 *   4. 확인 시 action='reject'로 설정하고 폼 제출
 * 
 * 사용 시점:
 *   - 거절 버튼 클릭 시 (attachButtonListeners에서 호출)
 * 
 * 주의사항:
 *   - 이 작업은 되돌릴 수 없음 (데이터 삭제)
 *   - 확인 메시지에 "이 작업은 되돌릴 수 없습니다"를 명시하여 사용자에게 경고
 * 
 * @example
 * // 사용 예시 (거절 버튼 클릭 시)
 * rejectSelected();
 * // 결과:
 * // 1. 선택된 의사가 없으면 경고 메시지 표시
 * // 2. 확인 대화상자 표시 (되돌릴 수 없음을 명시)
 * // 3. 확인 시 폼 제출하여 서버로 거절 요청 전송
 */
function rejectSelected() {
  // ========= 선택된 의사 ID 확인 =========
  // 목적: hidden input에서 선택된 의사 ID들을 읽어오기
  //   - updateSelectedDoctors() 함수에서 저장한 값을 읽음
  //   - 사용자 경험(UX) 개선: 선택된 항목을 자동으로 추적
  // 
  // document.getElementById('doctorIdsInput'): Hidden input 요소 찾기
  //   - 'doctorIdsInput': Hidden input의 ID 속성
  //   - 반환값: HTMLInputElement 객체 또는 null (없으면)
  //   - 예: <input type="hidden" id="doctorIdsInput" name="doctor_ids" value="1,2,3">
  //   - 목적: 선택된 의사 ID들을 읽어오기 위함
  // 
  // .value: Hidden input의 value 속성 읽기
  //   - value: input 요소의 값 (문자열)
  //   - 반환값: 쉼표로 구분된 의사 ID 문자열 또는 빈 문자열
  //     → 예: '1,2,3' (의사 ID 1, 2, 3이 선택됨)
  //     → 예: '1' (의사 ID 1만 선택됨)
  //     → 예: '' (선택된 항목이 없음)
  //   - 목적: 선택된 의사 ID들을 확인하기 위함
  const doctorIds = document.getElementById('doctorIdsInput').value;
  
  // ========= 선택된 의사 확인 =========
  // 목적: 선택된 의사가 있는지 확인하여 유효성 검사
  //   - 사용자 경험(UX) 개선: 선택된 항목이 없을 때 명확한 에러 메시지 제공
  //   - 데이터 무결성: 빈 요청을 서버로 전송하지 않음
  // 
  // !doctorIds: 선택된 의사가 없는지 확인
  //   - ! 연산자: 논리 부정
  //   - doctorIds: 선택된 의사 ID 문자열
  //   - 빈 문자열('')은 falsy이므로 !doctorIds는 true
  //   - 값이 있으면 truthy이므로 !doctorIds는 false
  //   - 예: doctorIds='' → !doctorIds=true (선택된 항목 없음)
  //   - 예: doctorIds='1,2,3' → !doctorIds=false (선택된 항목 있음)
  if (!doctorIds) {
    // ========= 경고 메시지 표시 =========
    // alert('거절할 의사를 선택해주세요.'): 사용자에게 경고 메시지 표시
    //   - alert(): 브라우저의 기본 알림 창 표시
    //   - '거절할 의사를 선택해주세요.': 경고 메시지
    //   - 목적: 사용자에게 무엇이 잘못되었는지 알림
    //   - 주의: alert()는 사용자 경험을 방해할 수 있으므로, 최신 웹에서는 커스텀 모달 사용 권장
    alert('거절할 의사를 선택해주세요.');
    
    // return: 함수 종료
    //   - 목적: 선택된 항목이 없으면 더 이상 진행하지 않음
    //   - 결과: 폼 제출이 취소됨
    return;
  }
  
  // ========= 사용자 확인 요청 (되돌릴 수 없음을 명시) =========
  // 목적: 사용자에게 거절 작업을 확인받아 실수 방지
  //   - 사용자 경험(UX) 개선: 중요한 작업 전에 확인 요청
  //   - 데이터 무결성: 실수로 인한 잘못된 거절 방지
  //   - 주의: 이 작업은 되돌릴 수 없음 (데이터 삭제)
  // 
  // confirm('선택한 의사의 승인을 거절하시겠습니까? 이 작업은 되돌릴 수 없습니다.'): 확인 대화상자 표시
  //   - confirm(): 브라우저의 기본 확인 대화상자 표시
  //   - '선택한 의사의 승인을 거절하시겠습니까? 이 작업은 되돌릴 수 없습니다.': 확인 메시지
  //     → "이 작업은 되돌릴 수 없습니다"를 명시하여 사용자에게 경고
  //   - 반환값: true (확인) 또는 false (취소)
  //   - 동작: 사용자가 확인 또는 취소 버튼을 클릭할 때까지 대기
  //   - 목적: 사용자에게 거절 작업을 확인받기 위함 (되돌릴 수 없음을 명시)
  //   - 주의: confirm()은 사용자 경험을 방해할 수 있으므로, 최신 웹에서는 커스텀 모달 사용 권장
  if (confirm('선택한 의사의 승인을 거절하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
    // ========= 액션 설정 =========
    // document.getElementById('actionInput'): 액션 input 요소 찾기
    //   - 'actionInput': 액션 input의 ID 속성
    //   - 반환값: HTMLInputElement 객체 또는 null (없으면)
    //   - 예: <input type="hidden" id="actionInput" name="action">
    //   - 목적: 서버에 어떤 작업을 수행할지 알리기 위함
    // 
    // .value = 'reject': 액션을 'reject'로 설정
    //   - 'reject': 거절 액션을 나타내는 값
    //   - 동작: hidden input의 value를 'reject'로 설정
    //   - 목적: 서버에서 이 값에 따라 거절 처리 수행
    //   - 결과: <input type="hidden" id="actionInput" name="action" value="reject">
    document.getElementById('actionInput').value = 'reject';
    
    // ========= 폼 제출 =========
    // document.getElementById('approvalForm'): 승인 폼 요소 찾기
    //   - 'approvalForm': 폼의 ID 속성
    //   - 반환값: HTMLFormElement 객체 또는 null (없으면)
    //   - 예: <form id="approvalForm" method="POST" action="/admin_panel/approval_pending/">
    //   - 목적: 폼을 제출하여 서버로 거절 요청 전송
    // 
    // .submit(): 폼 제출
    //   - submit(): 폼의 제출 이벤트를 발생시킴
    //   - 동작:
    //     1. 폼의 action 속성에 지정된 URL로 POST 요청 전송
    //     2. 폼의 모든 input 요소의 name과 value를 서버로 전송
    //     3. 서버에서 거절 처리 수행 (의사 데이터 삭제)
    //     4. 페이지가 새로고침되어 업데이트된 목록 표시
    //   - 전송되는 데이터:
    //     → action='reject' (거절 액션)
    //     → doctor_ids='1,2,3' (선택된 의사 ID들)
    //   - 목적: 선택된 의사들을 거절하기 위해 서버로 요청 전송
    //   - 결과: 서버에서 거절 처리 후 페이지 새로고침
    //   - 주의: 이 작업은 되돌릴 수 없음 (데이터 삭제)
    document.getElementById('approvalForm').submit();
  }
  // 주의: 사용자가 취소를 클릭하면 아무 동작도 하지 않음
}

/**
 * 정렬 링크 이벤트 연결 함수 (승인대기 페이지)
 * 
 * 목적: 테이블 헤더의 정렬 링크에 클릭 이벤트 리스너를 연결하여 정렬 기능 제공
 *   - 사용자 경험(UX) 개선: 클릭 한 번으로 데이터 정렬 가능
 *   - 동적 이벤트 연결: DOM 업데이트 후에도 정렬 기능이 계속 작동하도록 보장
 *   - 중복 방지: 기존 이벤트 리스너를 제거한 후 새로 추가하여 중복 연결 방지
 * 
 * 동작 방식:
 *   1. 모든 정렬 링크 요소 찾기 (data-sort-field 속성을 가진 <a> 태그)
 *   2. 각 링크에 대해:
 *      a. 기존 이벤트 리스너 제거 (중복 방지)
 *      b. 새로운 이벤트 핸들러 생성 및 저장
 *      c. 이벤트 리스너 추가
 *   3. 링크 클릭 시:
 *      a. 기본 동작 차단 (페이지 이동 방지)
 *      b. 정렬 필드 및 현재 정렬 상태 읽기
 *      c. handleSortClick() 함수 호출하여 정렬 처리
 * 
 * 사용 시점:
 *   - 페이지 로드 시 (DOMContentLoaded 이벤트)
 *   - AJAX로 페이지네이션 후 (handlePaginationAjax에서 호출)
 *   - DOM 업데이트 후 정렬 기능을 다시 활성화할 때
 * 
 * 관련 함수:
 *   - handleSortClick(): admin_common.js에 정의된 정렬 처리 함수
 * 
 * @example
 * // 사용 예시 (페이지 로드 시)
 * attachSortListeners();
 * // 결과:
 * // 1. 모든 정렬 링크에 이벤트 리스너 연결
 * // 2. 링크 클릭 시 정렬 처리 수행
 */
function attachSortListeners() {
  // ========= 정렬 링크 요소 조회 =========
  // 목적: 페이지에 있는 모든 정렬 링크를 찾기
  //   - DOM에서 정렬 링크를 모두 찾아서 이벤트 리스너 연결
  //   - 성능 최적화: 한 번에 모든 링크를 찾아서 처리
  // 
  // document.querySelectorAll('a[data-sort-field]'): 모든 정렬 링크 찾기
  //   - 'a[data-sort-field]': CSS 선택자
  //     → a: 링크 요소 (<a> 태그)
  //     → [data-sort-field]: data-sort-field 속성을 가진 요소
  //   - 반환값: NodeList 객체 (유사 배열, 모든 일치하는 요소)
  //   - 예: <a href="#" data-sort-field="name" data-current-sort="name" data-current-order="asc">이름</a>
  //        <a href="#" data-sort-field="created_at" data-current-sort="" data-current-order="asc">등록일</a>
  //   - 목적: 모든 정렬 링크를 찾아서 이벤트 리스너 연결
  const sortLinks = document.querySelectorAll('a[data-sort-field]');
  
  // ========= 각 링크에 이벤트 리스너 연결 =========
  // 목적: 각 정렬 링크에 클릭 이벤트 리스너 연결
  //   - forEach(): 배열의 각 요소에 대해 함수 실행
  //   - sortLinks: 모든 정렬 링크 (NodeList)
  //   - link: 현재 처리 중인 링크 요소
  //   - 동작: 각 링크에 대해 이벤트 리스너 연결
  sortLinks.forEach(link => {
    // ========= 기존 이벤트 리스너 제거 =========
    // 목적: 기존 이벤트 리스너를 제거하여 중복 연결 방지
    //   - DOM 업데이트 후 이벤트 리스너를 다시 연결할 때 중복 방지
    //   - 안전성: 기존 리스너가 있으면 제거 후 새로 추가
    // 
    // link.removeEventListener('click', link._sortHandler): 기존 클릭 이벤트 리스너 제거
    //   - removeEventListener(): 이벤트 리스너 제거
    //   - 'click': 이벤트 타입
    //   - link._sortHandler: 제거할 이벤트 핸들러 함수
    //     → _sortHandler: 링크 요소에 저장된 이벤트 핸들러 (이전에 추가한 것)
    //     → _ 접두사: 내부 사용을 나타냄 (private 속성 관례)
    //   - 목적: 기존 리스너가 있으면 제거 (없으면 에러 없이 무시됨)
    //   - 주의: 같은 함수 참조를 사용해야 제거됨 (그래서 _sortHandler에 저장)
    link.removeEventListener('click', link._sortHandler);
    
    // ========= 새로운 이벤트 핸들러 생성 및 저장 =========
    // 목적: 정렬 처리를 수행하는 이벤트 핸들러 생성 및 저장
    //   - link._sortHandler: 링크 요소에 이벤트 핸들러를 저장
    //   - 목적: 나중에 removeEventListener로 제거할 수 있도록 함수 참조 저장
    // 
    // link._sortHandler = function(e) {...}: 이벤트 핸들러 함수 생성 및 저장
    //   - _sortHandler: 링크 요소의 커스텀 속성 (이벤트 핸들러 저장)
    //   - function(e) {...}: 이벤트 핸들러 함수
    //     → e: 이벤트 객체 (Event)
    //   - 동작: 링크 클릭 시 정렬 처리 수행
    link._sortHandler = function(e) {
      // ========= 기본 동작 차단 =========
      // e.preventDefault(): 이벤트의 기본 동작(링크 클릭 시 페이지 이동) 차단
      //   - e: 이벤트 객체 (Event)
      //   - preventDefault(): 이벤트의 기본 동작을 막는 메서드
      //   - 목적: 전체 페이지 새로고침 없이 정렬 처리하기 위함
      //   - 사용자 경험(UX) 개선: 페이지 새로고침 없이 빠른 정렬
      //   - 동작: 링크의 기본 동작(페이지 이동)을 막고 JavaScript로 처리
      e.preventDefault();
      
      // ========= 정렬 필드 읽기 =========
      // 목적: 링크의 data-sort-field 속성에서 정렬할 필드 이름 읽기
      //   - 사용자 경험(UX) 개선: 어떤 필드로 정렬할지 자동으로 파악
      // 
      // link.getAttribute('data-sort-field'): data-sort-field 속성 값 읽기
      //   - getAttribute(): 요소의 속성 값을 읽는 메서드
      //   - 'data-sort-field': 속성 이름
      //   - 반환값: 속성 값 (문자열) 또는 null (없으면)
      //   - 예: <a data-sort-field="name"> → 'name'
      //   - 예: <a data-sort-field="created_at"> → 'created_at'
      //   - 목적: 어떤 필드로 정렬할지 결정하기 위함
      const sortField = link.getAttribute('data-sort-field');
      
      // ========= 현재 정렬 필드 읽기 =========
      // 목적: 링크의 data-current-sort 속성에서 현재 정렬 필드 읽기
      //   - 사용자 경험(UX) 개선: 현재 정렬 상태를 파악하여 정렬 방향 토글 가능
      // 
      // link.getAttribute('data-current-sort') || '': data-current-sort 속성 값 읽기 (기본값: '')
      //   - getAttribute(): 요소의 속성 값을 읽는 메서드
      //   - 'data-current-sort': 속성 이름
      //   - || '': 속성이 없으면 빈 문자열 사용 (기본값)
      //   - 반환값: 속성 값 (문자열) 또는 '' (없으면)
      //   - 예: <a data-current-sort="name"> → 'name'
      //   - 예: <a> (속성 없음) → '' (기본값)
      //   - 목적: 현재 정렬 필드를 파악하여 같은 필드면 정렬 방향 토글
      //   - 주의: 빈 문자열('')은 정렬이 선택되지 않았음을 의미
      const currentSort = link.getAttribute('data-current-sort') || '';
      
      // ========= 현재 정렬 방향 읽기 =========
      // 목적: 링크의 data-current-order 속성에서 현재 정렬 방향 읽기
      //   - 사용자 경험(UX) 개선: 현재 정렬 방향을 파악하여 토글 가능
      // 
      // link.getAttribute('data-current-order') || 'asc': data-current-order 속성 값 읽기 (기본값: 'asc')
      //   - getAttribute(): 요소의 속성 값을 읽는 메서드
      //   - 'data-current-order': 속성 이름
      //   - || 'asc': 속성이 없으면 'asc' 사용 (기본값: 오름차순)
      //   - 반환값: 속성 값 (문자열) 또는 'asc' (없으면)
      //   - 예: <a data-current-order="asc"> → 'asc' (오름차순)
      //   - 예: <a data-current-order="desc"> → 'desc' (내림차순)
      //   - 예: <a> (속성 없음) → 'asc' (기본값: 오름차순)
      //   - 목적: 현재 정렬 방향을 파악하여 같은 필드면 방향 토글
      //   - 주의: 기본값은 'asc' (오름차순)로 설정
      const currentOrder = link.getAttribute('data-current-order') || 'asc';
      
      // ========= 정렬 처리 함수 호출 =========
      // handleSortClick(sortField, currentSort, currentOrder): 정렬 처리 함수 호출
      //   - handleSortClick(): admin_common.js에 정의된 공통 정렬 처리 함수
      //   - sortField: 정렬할 필드 이름 (예: 'name', 'created_at')
      //   - currentSort: 현재 정렬 필드 (예: 'name', '')
      //   - currentOrder: 현재 정렬 방향 (예: 'asc', 'desc')
      //   - 동작:
      //     1. 정렬 방향 결정 (같은 필드면 토글, 다르면 오름차순)
      //     2. 정렬 URL 생성 (검색 파라미터 유지)
      //     3. 페이지 이동 (전체 페이지 새로고침)
      //   - 목적: 선택된 필드로 데이터 정렬
      //   - 결과: 정렬된 목록이 표시됨
      handleSortClick(sortField, currentSort, currentOrder);
    };
    
    // ========= 이벤트 리스너 추가 =========
    // 목적: 링크에 클릭 이벤트 리스너 추가
    //   - addEventListener(): 이벤트 리스너 추가
    //   - 'click': 이벤트 타입 (마우스 클릭)
    //   - link._sortHandler: 이벤트 핸들러 함수 (위에서 생성한 것)
    //   - 동작: 링크 클릭 시 link._sortHandler 함수가 호출됨
    //   - 결과: 정렬 링크 클릭 시 정렬 처리 수행
    link.addEventListener('click', link._sortHandler);
  });
}

/**
 * 테이블 행 클릭 이벤트 연결 함수 (승인대기 페이지)
 * 
 * 목적: 테이블의 각 의사 행에 클릭 이벤트 리스너를 연결하여 상세 정보 표시 기능 제공
 *   - 사용자 경험(UX) 개선: 행 클릭 한 번으로 의사 상세 정보 표시
 *   - 동적 이벤트 연결: DOM 업데이트 후에도 행 클릭 기능이 계속 작동하도록 보장
 *   - 중복 방지: 기존 이벤트 리스너를 제거한 후 새로 추가하여 중복 연결 방지
 *   - 이벤트 충돌 방지: 체크박스나 버튼 클릭 시에는 행 클릭 이벤트가 발생하지 않도록 처리
 * 
 * 동작 방식:
 *   1. 모든 의사 행 요소 찾기 (data-doctor-id 속성을 가진 <tr> 태그)
 *   2. 각 행에 대해:
 *      a. 기존 이벤트 리스너 제거 (중복 방지)
 *      b. 의사 ID 읽기 (data-doctor-id 속성)
 *      c. 의사 ID가 있으면:
 *         - 새로운 이벤트 핸들러 생성 및 저장
 *         - 이벤트 리스너 추가
 *   3. 행 클릭 시:
 *      a. 클릭된 요소 확인 (체크박스나 버튼인지 확인)
 *      b. 체크박스나 버튼이면 이벤트 처리 취소
 *      c. 그 외의 경우:
 *         - 기본 동작 차단
 *         - 이벤트 전파 방지
 *         - selectDoctor() 함수 호출하여 상세 정보 표시
 * 
 * 사용 시점:
 *   - 페이지 로드 시 (DOMContentLoaded 이벤트)
 *   - AJAX로 페이지네이션 후 (handlePaginationAjax에서 호출)
 *   - DOM 업데이트 후 행 클릭 기능을 다시 활성화할 때
 * 
 * 관련 함수:
 *   - selectDoctor(): 의사 상세 정보를 표시하는 함수
 * 
 * 주의사항:
 *   - 체크박스나 버튼 클릭 시에는 행 클릭 이벤트가 발생하지 않음
 *   - 이는 체크박스 선택/해제나 버튼 클릭 기능과의 충돌을 방지하기 위함
 * 
 * @example
 * // 사용 예시 (페이지 로드 시)
 * attachTableRowListeners();
 * // 결과:
 * // 1. 모든 의사 행에 클릭 이벤트 리스너 연결
 * // 2. 행 클릭 시 의사 상세 정보 표시
 * // 3. 체크박스나 버튼 클릭 시에는 행 클릭 이벤트 발생 안 함
 */
function attachTableRowListeners() {
  // ========= 의사 행 요소 조회 =========
  // 목적: 페이지에 있는 모든 의사 행을 찾기
  //   - DOM에서 의사 행을 모두 찾아서 이벤트 리스너 연결
  //   - 성능 최적화: 한 번에 모든 행을 찾아서 처리
  // 
  // document.querySelectorAll('tr[data-doctor-id]'): 모든 의사 행 찾기
  //   - 'tr[data-doctor-id]': CSS 선택자
  //     → tr: 테이블 행 요소 (<tr> 태그)
  //     → [data-doctor-id]: data-doctor-id 속성을 가진 요소
  //   - 반환값: NodeList 객체 (유사 배열, 모든 일치하는 요소)
  //   - 예: <tr data-doctor-id="1">...</tr>
  //        <tr data-doctor-id="2">...</tr>
  //   - 목적: 모든 의사 행을 찾아서 이벤트 리스너 연결
  const doctorRows = document.querySelectorAll('tr[data-doctor-id]');
  
  // ========= 각 행에 이벤트 리스너 연결 =========
  // 목적: 각 의사 행에 클릭 이벤트 리스너 연결
  //   - forEach(): 배열의 각 요소에 대해 함수 실행
  //   - doctorRows: 모든 의사 행 (NodeList)
  //   - row: 현재 처리 중인 행 요소
  //   - 동작: 각 행에 대해 이벤트 리스너 연결
  doctorRows.forEach(row => {
    // ========= 기존 이벤트 리스너 제거 =========
    // 목적: 기존 이벤트 리스너를 제거하여 중복 연결 방지
    //   - DOM 업데이트 후 이벤트 리스너를 다시 연결할 때 중복 방지
    //   - 안전성: 기존 리스너가 있으면 제거 후 새로 추가
    // 
    // row.removeEventListener('click', row._clickHandler): 기존 클릭 이벤트 리스너 제거
    //   - removeEventListener(): 이벤트 리스너 제거
    //   - 'click': 이벤트 타입
    //   - row._clickHandler: 제거할 이벤트 핸들러 함수
    //     → _clickHandler: 행 요소에 저장된 이벤트 핸들러 (이전에 추가한 것)
    //     → _ 접두사: 내부 사용을 나타냄 (private 속성 관례)
    //   - 목적: 기존 리스너가 있으면 제거 (없으면 에러 없이 무시됨)
    //   - 주의: 같은 함수 참조를 사용해야 제거됨 (그래서 _clickHandler에 저장)
    row.removeEventListener('click', row._clickHandler);
    
    // ========= 의사 ID 읽기 =========
    // 목적: 행의 data-doctor-id 속성에서 의사 ID 읽기
    //   - 사용자 경험(UX) 개선: 어떤 의사의 상세 정보를 표시할지 자동으로 파악
    // 
    // row.getAttribute('data-doctor-id'): data-doctor-id 속성 값 읽기
    //   - getAttribute(): 요소의 속성 값을 읽는 메서드
    //   - 'data-doctor-id': 속성 이름
    //   - 반환값: 속성 값 (문자열) 또는 null (없으면)
    //   - 예: <tr data-doctor-id="1"> → '1'
    //   - 예: <tr data-doctor-id="123"> → '123'
    //   - 목적: 어떤 의사의 상세 정보를 표시할지 결정하기 위함
    const doctorId = row.getAttribute('data-doctor-id');
    
    // ========= 의사 ID 확인 및 이벤트 핸들러 생성 =========
    // 목적: 의사 ID가 있는 경우에만 이벤트 핸들러 생성 및 연결
    //   - 안전성: 의사 ID가 없으면 이벤트 리스너를 연결하지 않음
    //   - 데이터 무결성: 유효한 의사 ID가 있는 경우에만 상세 정보 표시 가능
    // 
    // if (doctorId): 의사 ID가 있는지 확인
    //   - doctorId: 의사 ID 문자열 또는 null
    //   - truthy 값이면 true (의사 ID가 있음)
    //   - falsy 값(null, '')이면 false (의사 ID가 없음)
    //   - 목적: 의사 ID가 있는 경우에만 이벤트 핸들러 생성
    if (doctorId) {
      // ========= 새로운 이벤트 핸들러 생성 및 저장 =========
      // 목적: 행 클릭 시 의사 상세 정보를 표시하는 이벤트 핸들러 생성 및 저장
      //   - row._clickHandler: 행 요소에 이벤트 핸들러를 저장
      //   - 목적: 나중에 removeEventListener로 제거할 수 있도록 함수 참조 저장
      // 
      // row._clickHandler = function(e) {...}: 이벤트 핸들러 함수 생성 및 저장
      //   - _clickHandler: 행 요소의 커스텀 속성 (이벤트 핸들러 저장)
      //   - function(e) {...}: 이벤트 핸들러 함수
      //     → e: 이벤트 객체 (Event)
      //   - 동작: 행 클릭 시 의사 상세 정보 표시
      row._clickHandler = function(e) {
        // ========= 클릭된 요소 확인 =========
        // 목적: 클릭된 요소가 체크박스나 버튼인지 확인하여 이벤트 충돌 방지
        //   - 사용자 경험(UX) 개선: 체크박스 선택/해제나 버튼 클릭 시 행 클릭 이벤트가 발생하지 않도록 함
        //   - 이벤트 충돌 방지: 체크박스나 버튼의 고유 기능과 행 클릭 기능이 충돌하지 않도록 함
        // 
        // e.target: 클릭 이벤트가 발생한 요소
        //   - target: 이벤트 객체의 속성 (Event.target)
        //   - 반환값: 클릭된 요소 (HTMLElement 객체)
        //   - 예: 체크박스를 클릭하면 → <input type="checkbox">
        //   - 예: 버튼을 클릭하면 → <button>
        //   - 예: 행의 다른 부분을 클릭하면 → <td> 또는 <tr>
        //   - 목적: 클릭된 요소를 확인하여 체크박스나 버튼인지 판단
        const target = e.target;
        
        // ========= 체크박스나 버튼 클릭 확인 =========
        // 목적: 클릭된 요소가 체크박스나 버튼인지 확인하여 이벤트 처리 취소
        //   - 사용자 경험(UX) 개선: 체크박스 선택/해제나 버튼 클릭 시 행 클릭 이벤트가 발생하지 않도록 함
        //   - 이벤트 충돌 방지: 체크박스나 버튼의 고유 기능과 행 클릭 기능이 충돌하지 않도록 함
        // 
        // target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.closest('input, button')
        //   - target.tagName: 요소의 태그 이름 (대문자)
        //     → 예: 'INPUT', 'BUTTON', 'TD', 'TR' 등
        //   - target.tagName === 'INPUT': 클릭된 요소가 <input> 태그인지 확인
        //     → 예: 체크박스, 텍스트 입력 필드 등
        //   - target.tagName === 'BUTTON': 클릭된 요소가 <button> 태그인지 확인
        //     → 예: 버튼 요소
        //   - target.closest('input, button'): 클릭된 요소의 부모 요소 중 <input>이나 <button>이 있는지 확인
        //     → closest(): 가장 가까운 부모 요소를 찾는 메서드
        //     → 'input, button': CSS 선택자 (input 또는 button 요소)
        //     → 반환값: 일치하는 요소 (HTMLElement 객체) 또는 null (없으면)
        //     → 예: <td><input type="checkbox"></td>에서 <td>를 클릭하면 → <input> 요소 반환
        //   - ||: 논리 OR 연산자 (하나라도 true이면 true)
        //   - 목적: 클릭된 요소가 체크박스나 버튼이거나, 그 안에 체크박스나 버튼이 있는지 확인
        //   - 예: 체크박스를 클릭 → true (이벤트 처리 취소)
        //   - 예: 버튼을 클릭 → true (이벤트 처리 취소)
        //   - 예: 행의 다른 부분을 클릭 → false (이벤트 처리 계속)
        if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.closest('input, button')) {
          // ========= 이벤트 처리 취소 =========
          // return: 함수 종료 (이벤트 처리 취소)
          //   - 목적: 체크박스나 버튼 클릭 시 행 클릭 이벤트를 처리하지 않음
          //   - 결과: 체크박스 선택/해제나 버튼 클릭 기능이 정상적으로 작동함
          //   - 사용자 경험(UX) 개선: 체크박스나 버튼의 고유 기능이 방해받지 않음
          return; // 체크박스나 버튼 클릭은 무시
        }
        
        // ========= 이벤트 기본 동작 차단 =========
        // e.preventDefault(): 이벤트의 기본 동작 차단
        //   - e: 이벤트 객체 (Event)
        //   - preventDefault(): 이벤트의 기본 동작을 막는 메서드
        //   - 목적: 행 클릭 시 기본 동작(링크 이동 등)을 막고 JavaScript로 처리
        //   - 사용자 경험(UX) 개선: 전체 페이지 새로고침 없이 상세 정보 표시
        //   - 주의: 행에 링크가 있는 경우 기본 동작(페이지 이동)을 막음
        e.preventDefault();
        
        // ========= 이벤트 전파 방지 =========
        // e.stopPropagation(): 이벤트 전파(버블링) 방지
        //   - e: 이벤트 객체 (Event)
        //   - stopPropagation(): 이벤트가 부모 요소로 전파되는 것을 막는 메서드
        //   - 목적: 행 클릭 이벤트가 부모 요소(테이블, 컨테이너 등)로 전파되지 않도록 함
        //   - 사용자 경험(UX) 개선: 의도하지 않은 이벤트 발생 방지
        //   - 주의: 이벤트 버블링을 방지하여 부모 요소의 이벤트 리스너가 실행되지 않음
        e.stopPropagation();
        
        // ========= 의사 상세 정보 표시 함수 호출 =========
        // selectDoctor(e, parseInt(doctorId)): 의사 상세 정보를 표시하는 함수 호출
        //   - selectDoctor(): 의사 상세 정보를 표시하는 함수 (이 파일에 정의됨)
        //   - e: 이벤트 객체 (Event)
        //     → selectItem() 함수에 전달되어 스크롤 위치 저장 등에 사용됨
        //   - parseInt(doctorId): 의사 ID를 정수로 변환
        //     → parseInt(): 문자열을 정수로 변환하는 함수
        //     → doctorId: 의사 ID 문자열 (예: '1', '123')
        //     → 반환값: 정수 (예: 1, 123)
        //     → 목적: 숫자 타입으로 변환하여 서버로 전송
        //   - 동작:
        //     1. AJAX로 의사 상세 정보 요청
        //     2. 상세 정보 영역만 업데이트 (페이지 새로고침 없음)
        //     3. 스크롤 위치 유지
        //     4. URL 업데이트 (히스토리 관리)
        //   - 목적: 선택된 의사의 상세 정보를 표시
        //   - 결과: 의사 상세 정보가 표시됨
        selectDoctor(e, parseInt(doctorId));
      };
      
      // ========= 이벤트 리스너 추가 =========
      // 목적: 행에 클릭 이벤트 리스너 추가
      //   - addEventListener(): 이벤트 리스너 추가
      //   - 'click': 이벤트 타입 (마우스 클릭)
      //   - row._clickHandler: 이벤트 핸들러 함수 (위에서 생성한 것)
      //   - 동작: 행 클릭 시 row._clickHandler 함수가 호출됨
      //   - 결과: 행 클릭 시 의사 상세 정보 표시
      row.addEventListener('click', row._clickHandler);
    }
    // 주의: doctorId가 없으면 이벤트 리스너를 연결하지 않음
  });
}

/**
 * 체크박스 체크 상태에 따라 행 클래스 업데이트 함수 (승인대기 페이지)
 * 
 * 목적: 체크박스의 선택 상태에 따라 행에 'checkbox-checked' 클래스를 추가/제거하여 시각적 피드백 제공
 *   - 사용자 경험(UX) 개선: 선택된 행을 시각적으로 강조 표시하여 사용자가 선택 상태를 쉽게 파악
 *   - 시각적 피드백: CSS 스타일을 통해 선택된 행을 하이라이트
 *   - 일관성 유지: 체크박스 상태와 행 스타일을 동기화
 * 
 * 동작 방식:
 *   1. 체크박스가 속한 행 요소 찾기 (closest('tr'))
 *   2. 행이 존재하는지 확인
 *   3. 체크박스 상태에 따라:
 *      - checked=true → 행에 'checkbox-checked' 클래스 추가
 *      - checked=false → 행에서 'checkbox-checked' 클래스 제거
 * 
 * 사용 시점:
 *   - 체크박스 상태 변경 시 (attachCheckboxListeners에서 호출)
 *   - 전체 선택/해제 시 (toggleSelectAllApproval에서 호출)
 *   - 페이지 로드 시 초기 상태 설정 (attachCheckboxListeners에서 호출)
 * 
 * 관련 CSS:
 *   - .checkbox-checked: 선택된 행에 적용되는 CSS 클래스
 *     → 예: 배경색 변경, 테두리 추가 등
 * 
 * @param {HTMLInputElement} checkbox - 상태를 확인할 체크박스 요소
 * 
 * @example
 * // 사용 예시 (체크박스 상태 변경 시)
 * updateRowCheckboxClass(checkbox);
 * // 결과:
 * // 1. 체크박스가 체크되면 → 행에 'checkbox-checked' 클래스 추가
 * // 2. 체크박스가 해제되면 → 행에서 'checkbox-checked' 클래스 제거
 */
function updateRowCheckboxClass(checkbox) {
  // ========= 체크박스가 속한 행 요소 찾기 =========
  // 목적: 체크박스가 속한 테이블 행 요소를 찾기
  //   - 사용자 경험(UX) 개선: 체크박스와 같은 행의 스타일을 업데이트
  // 
  // checkbox.closest('tr'): 체크박스의 가장 가까운 부모 <tr> 요소 찾기
  //   - closest(): 가장 가까운 부모 요소를 찾는 메서드
  //   - 'tr': 찾을 요소의 선택자 (테이블 행)
  //   - 반환값: 가장 가까운 <tr> 요소 (HTMLElement 객체) 또는 null (없으면)
  //   - 예: <tr><td><input type="checkbox"></td></tr> → <tr> 요소 반환
  //   - 목적: 체크박스가 속한 행을 찾아서 클래스를 추가/제거하기 위함
  const row = checkbox.closest('tr');
  
  // ========= 행 존재 확인 및 클래스 업데이트 =========
  // 목적: 행이 존재하는 경우에만 클래스를 업데이트
  //   - 안전성: 행이 없으면 에러 발생 방지
  //   - 데이터 무결성: 유효한 행이 있는 경우에만 스타일 업데이트
  // 
  // if (row): 행이 존재하는지 확인
  //   - row: 행 요소 (HTMLElement 객체) 또는 null
  //   - truthy 값이면 true (행이 존재함)
  //   - falsy 값(null)이면 false (행이 없음)
  //   - 목적: 행이 있는 경우에만 클래스 업데이트
  if (row) {
    // ========= 체크박스 상태 확인 및 클래스 업데이트 =========
    // 목적: 체크박스의 선택 상태에 따라 행에 클래스를 추가하거나 제거
    //   - 사용자 경험(UX) 개선: 선택된 행을 시각적으로 강조 표시
    //   - 시각적 피드백: CSS 스타일을 통해 선택 상태를 명확하게 표시
    // 
    // if (checkbox.checked): 체크박스가 선택되었는지 확인
    //   - checkbox.checked: 체크박스의 선택 상태 (true 또는 false)
    //   - true: 체크박스가 선택됨 (checked)
    //   - false: 체크박스가 선택 안 됨 (unchecked)
    //   - 목적: 체크박스 상태에 따라 다른 동작 수행
    if (checkbox.checked) {
      // ========= 선택된 행에 클래스 추가 =========
      // row.classList.add('checkbox-checked'): 행에 'checkbox-checked' 클래스 추가
      //   - classList: 요소의 클래스 목록을 관리하는 DOMTokenList 객체
      //   - add('checkbox-checked'): 'checkbox-checked' 클래스를 추가
      //   - 동작: 클래스가 이미 있으면 중복 추가하지 않음 (에러 발생 안 함)
      //   - 목적: 선택된 행을 시각적으로 강조 표시
      //   - 결과: CSS에서 .checkbox-checked 클래스로 스타일링 (예: 배경색 변경, 테두리 추가 등)
      //   - 예: <tr class="checkbox-checked">...</tr>
      row.classList.add('checkbox-checked');
    } else {
      // ========= 선택 해제된 행에서 클래스 제거 =========
      // row.classList.remove('checkbox-checked'): 행에서 'checkbox-checked' 클래스 제거
      //   - classList: 요소의 클래스 목록을 관리하는 DOMTokenList 객체
      //   - remove('checkbox-checked'): 'checkbox-checked' 클래스를 제거
      //   - 동작: 클래스가 없으면 아무 동작도 하지 않음 (에러 발생 안 함)
      //   - 목적: 선택 해제된 행의 강조 표시를 제거
      //   - 결과: 행이 일반 스타일로 돌아감
      //   - 예: <tr>...</tr> (클래스 제거됨)
      row.classList.remove('checkbox-checked');
    }
  }
  // 주의: row가 null이면 아무 동작도 하지 않음 (에러 발생 안 함)
}

/**
 * 체크박스 이벤트 연결 함수 (승인대기 페이지)
 * 
 * 목적: 모든 체크박스(전체 선택 및 개별 체크박스)에 이벤트 리스너를 연결하여 선택/해제 기능 제공
 *   - 사용자 경험(UX) 개선: 체크박스 선택/해제 시 자동으로 행 스타일 업데이트 및 선택된 항목 목록 갱신
 *   - 동적 이벤트 연결: DOM 업데이트 후에도 체크박스 기능이 계속 작동하도록 보장
 *   - 중복 방지: 기존 이벤트 리스너를 제거한 후 새로 추가하여 중복 연결 방지
 *   - 이벤트 전파 방지: 체크박스 셀 클릭 시 행 클릭 이벤트가 발생하지 않도록 처리
 * 
 * 동작 방식:
 *   1. 전체 선택 체크박스에 이벤트 리스너 연결
 *      a. 기존 이벤트 리스너 제거 (중복 방지)
 *      b. 새로운 이벤트 핸들러 생성 및 저장
 *      c. 이벤트 리스너 추가
 *   2. 모든 개별 체크박스에 이벤트 리스너 연결
 *      a. 각 체크박스의 초기 상태 설정 (행 클래스 업데이트)
 *      b. 기존 이벤트 리스너 제거 (중복 방지)
 *      c. 새로운 이벤트 핸들러 생성 및 저장
 *      d. 이벤트 리스너 추가
 *   3. 체크박스 셀에 이벤트 전파 방지 리스너 연결
 *      a. 모든 체크박스 셀 찾기
 *      b. 각 셀에 클릭 이벤트 리스너 추가 (이벤트 전파 방지)
 * 
 * 사용 시점:
 *   - 페이지 로드 시 (DOMContentLoaded 이벤트)
 *   - AJAX로 페이지네이션 후 (handlePaginationAjax에서 호출)
 *   - DOM 업데이트 후 체크박스 기능을 다시 활성화할 때
 * 
 * 관련 함수:
 *   - toggleSelectAllApproval(): 전체 선택/해제 함수
 *   - updateRowCheckboxClass(): 행 클래스 업데이트 함수
 *   - updateSelectedDoctors(): 선택된 의사 목록 업데이트 함수
 * 
 * 주의사항:
 *   - 체크박스 셀 클릭 시 이벤트 전파를 방지하여 행 클릭 이벤트와 충돌하지 않도록 함
 * 
 * @example
 * // 사용 예시 (페이지 로드 시)
 * attachCheckboxListeners();
 * // 결과:
 * // 1. 전체 선택 체크박스에 이벤트 리스너 연결
 * // 2. 모든 개별 체크박스에 이벤트 리스너 연결
 * // 3. 체크박스 셀에 이벤트 전파 방지 리스너 연결
 */
function attachCheckboxListeners() {
  // ========= 전체 선택 체크박스 요소 조회 =========
  // 목적: 전체 선택 체크박스 요소를 찾아서 이벤트 리스너 연결
  //   - 사용자 경험(UX) 개선: 전체 선택/해제 기능 제공
  // 
  // document.getElementById('selectAll'): 전체 선택 체크박스 찾기
  //   - 'selectAll': 전체 선택 체크박스의 ID 속성
  //   - 반환값: HTMLInputElement 객체 또는 null (없으면)
  //   - 예: <input type="checkbox" id="selectAll">
  //   - 목적: 전체 선택 체크박스에 이벤트 리스너 연결하기 위함
  const selectAllCheckbox = document.getElementById('selectAll');
  
  // ========= 전체 선택 체크박스 이벤트 리스너 연결 =========
  // 목적: 전체 선택 체크박스가 존재하는 경우에만 이벤트 리스너 연결
  //   - 안전성: 체크박스가 없으면 에러 발생 방지
  //   - 데이터 무결성: 유효한 체크박스가 있는 경우에만 이벤트 리스너 연결
  // 
  // if (selectAllCheckbox): 전체 선택 체크박스가 존재하는지 확인
  //   - selectAllCheckbox: 체크박스 요소 (HTMLInputElement 객체) 또는 null
  //   - truthy 값이면 true (체크박스가 존재함)
  //   - falsy 값(null)이면 false (체크박스가 없음)
  //   - 목적: 체크박스가 있는 경우에만 이벤트 리스너 연결
  if (selectAllCheckbox) {
    // ========= 기존 이벤트 리스너 제거 =========
    // 목적: 기존 이벤트 리스너를 제거하여 중복 연결 방지
    //   - DOM 업데이트 후 이벤트 리스너를 다시 연결할 때 중복 방지
    //   - 안전성: 기존 리스너가 있으면 제거 후 새로 추가
    // 
    // selectAllCheckbox.removeEventListener('change', selectAllCheckbox._changeHandler): 기존 change 이벤트 리스너 제거
    //   - removeEventListener(): 이벤트 리스너 제거
    //   - 'change': 이벤트 타입 (체크박스 상태 변경)
    //   - selectAllCheckbox._changeHandler: 제거할 이벤트 핸들러 함수
    //     → _changeHandler: 체크박스 요소에 저장된 이벤트 핸들러 (이전에 추가한 것)
    //     → _ 접두사: 내부 사용을 나타냄 (private 속성 관례)
    //   - 목적: 기존 리스너가 있으면 제거 (없으면 에러 없이 무시됨)
    //   - 주의: 같은 함수 참조를 사용해야 제거됨 (그래서 _changeHandler에 저장)
    selectAllCheckbox.removeEventListener('change', selectAllCheckbox._changeHandler);
    
    // ========= 새로운 이벤트 핸들러 생성 및 저장 =========
    // 목적: 전체 선택/해제를 처리하는 이벤트 핸들러 생성 및 저장
    //   - selectAllCheckbox._changeHandler: 체크박스 요소에 이벤트 핸들러를 저장
    //   - 목적: 나중에 removeEventListener로 제거할 수 있도록 함수 참조 저장
    // 
    // selectAllCheckbox._changeHandler = function() {...}: 이벤트 핸들러 함수 생성 및 저장
    //   - _changeHandler: 체크박스 요소의 커스텀 속성 (이벤트 핸들러 저장)
    //   - function() {...}: 이벤트 핸들러 함수
    //   - 동작: 체크박스 상태 변경 시 전체 선택/해제 처리
    selectAllCheckbox._changeHandler = function() {
      // ========= 전체 선택/해제 함수 호출 =========
      // toggleSelectAllApproval(): 전체 선택/해제 함수 호출
      //   - toggleSelectAllApproval(): 이 파일에 정의된 전체 선택/해제 함수
      //   - 동작:
      //     1. 전체 선택 체크박스의 상태 확인
      //     2. 모든 개별 체크박스의 상태를 전체 선택 체크박스와 동기화
      //     3. 각 행의 클래스 업데이트 (시각적 피드백)
      //     4. 선택된 의사 목록 업데이트
      //   - 목적: 전체 선택/해제 기능 구현
      //   - 결과: 모든 체크박스가 선택되거나 해제됨
      toggleSelectAllApproval();
    };
    
    // ========= 이벤트 리스너 추가 =========
    // 목적: 전체 선택 체크박스에 change 이벤트 리스너 추가
    //   - addEventListener(): 이벤트 리스너 추가
    //   - 'change': 이벤트 타입 (체크박스 상태 변경)
    //   - selectAllCheckbox._changeHandler: 이벤트 핸들러 함수 (위에서 생성한 것)
    //   - 동작: 체크박스 상태 변경 시 selectAllCheckbox._changeHandler 함수가 호출됨
    //   - 결과: 전체 선택/해제 기능이 정상 작동
    selectAllCheckbox.addEventListener('change', selectAllCheckbox._changeHandler);
  }
  
  // ========= 개별 체크박스 요소 조회 =========
  // 목적: 페이지에 있는 모든 개별 체크박스를 찾기
  //   - DOM에서 개별 체크박스를 모두 찾아서 이벤트 리스너 연결
  //   - 성능 최적화: 한 번에 모든 체크박스를 찾아서 처리
  // 
  // document.querySelectorAll('input[name="doctor_checkbox"]'): 모든 개별 체크박스 찾기
  //   - 'input[name="doctor_checkbox"]': CSS 선택자
  //     → input: 입력 요소 (<input> 태그)
  //     → [name="doctor_checkbox"]: name 속성이 "doctor_checkbox"인 요소
  //   - 반환값: NodeList 객체 (유사 배열, 모든 일치하는 요소)
  //   - 예: <input type="checkbox" name="doctor_checkbox" value="1">
  //        <input type="checkbox" name="doctor_checkbox" value="2">
  //   - 목적: 모든 개별 체크박스를 찾아서 이벤트 리스너 연결
  const checkboxes = document.querySelectorAll('input[name="doctor_checkbox"]');
  
  // ========= 각 개별 체크박스에 이벤트 리스너 연결 =========
  // 목적: 각 개별 체크박스에 change 이벤트 리스너 연결
  //   - forEach(): 배열의 각 요소에 대해 함수 실행
  //   - checkboxes: 모든 개별 체크박스 (NodeList)
  //   - checkbox: 현재 처리 중인 체크박스 요소
  //   - 동작: 각 체크박스에 대해 이벤트 리스너 연결
  checkboxes.forEach(checkbox => {
    // ========= 초기 상태 설정 =========
    // 목적: 페이지 로드 시 체크박스의 초기 상태에 따라 행 클래스를 설정
    //   - 사용자 경험(UX) 개선: 페이지 로드 시 이미 선택된 체크박스의 행이 하이라이트됨
    //   - 일관성 유지: 초기 상태와 행 스타일을 동기화
    // 
    // updateRowCheckboxClass(checkbox): 체크박스 상태에 따라 행 클래스 업데이트
    //   - updateRowCheckboxClass(): 위에 정의된 함수
    //   - checkbox: 현재 처리 중인 체크박스 요소
    //   - 동작:
    //     → checkbox.checked=true → 행에 'checkbox-checked' 클래스 추가
    //     → checkbox.checked=false → 행에서 'checkbox-checked' 클래스 제거
    //   - 목적: 초기 상태에 맞게 행 스타일 설정
    //   - 결과: 이미 선택된 체크박스의 행이 하이라이트됨
    updateRowCheckboxClass(checkbox);
    
    // ========= 기존 이벤트 리스너 제거 =========
    // 목적: 기존 이벤트 리스너를 제거하여 중복 연결 방지
    //   - DOM 업데이트 후 이벤트 리스너를 다시 연결할 때 중복 방지
    //   - 안전성: 기존 리스너가 있으면 제거 후 새로 추가
    // 
    // checkbox.removeEventListener('change', checkbox._changeHandler): 기존 change 이벤트 리스너 제거
    //   - removeEventListener(): 이벤트 리스너 제거
    //   - 'change': 이벤트 타입 (체크박스 상태 변경)
    //   - checkbox._changeHandler: 제거할 이벤트 핸들러 함수
    //     → _changeHandler: 체크박스 요소에 저장된 이벤트 핸들러 (이전에 추가한 것)
    //     → _ 접두사: 내부 사용을 나타냄 (private 속성 관례)
    //   - 목적: 기존 리스너가 있으면 제거 (없으면 에러 없이 무시됨)
    //   - 주의: 같은 함수 참조를 사용해야 제거됨 (그래서 _changeHandler에 저장)
    checkbox.removeEventListener('change', checkbox._changeHandler);
    
    // ========= 새로운 이벤트 핸들러 생성 및 저장 =========
    // 목적: 체크박스 상태 변경을 처리하는 이벤트 핸들러 생성 및 저장
    //   - checkbox._changeHandler: 체크박스 요소에 이벤트 핸들러를 저장
    //   - 목적: 나중에 removeEventListener로 제거할 수 있도록 함수 참조 저장
    // 
    // checkbox._changeHandler = function() {...}: 이벤트 핸들러 함수 생성 및 저장
    //   - _changeHandler: 체크박스 요소의 커스텀 속성 (이벤트 핸들러 저장)
    //   - function() {...}: 이벤트 핸들러 함수
    //   - 동작: 체크박스 상태 변경 시 행 클래스 업데이트 및 선택된 의사 목록 갱신
    checkbox._changeHandler = function() {
      // ========= 행 클래스 업데이트 =========
      // updateRowCheckboxClass(checkbox): 체크박스 상태에 따라 행 클래스 업데이트
      //   - updateRowCheckboxClass(): 위에 정의된 함수
      //   - checkbox: 현재 처리 중인 체크박스 요소
      //   - 동작:
      //     → checkbox.checked=true → 행에 'checkbox-checked' 클래스 추가
      //     → checkbox.checked=false → 행에서 'checkbox-checked' 클래스 제거
      //   - 목적: 체크박스 상태 변경 시 행 스타일 업데이트 (시각적 피드백)
      //   - 결과: 선택된 행이 하이라이트됨
      updateRowCheckboxClass(checkbox);
      
      // ========= 선택된 의사 목록 업데이트 =========
      // updateSelectedDoctors(): 선택된 의사 목록을 업데이트하는 함수 호출
      //   - updateSelectedDoctors(): 이 파일에 정의된 함수
      //   - 동작:
      //     1. 선택된 모든 체크박스의 value 값을 수집
      //     2. 쉼표로 구분된 문자열로 변환
      //     3. hidden input (doctorIdsInput)에 저장
      //     4. 전체 선택 체크박스 상태 업데이트 (모든 항목이 선택되었는지 확인)
      //   - 목적: 선택된 의사 ID들을 폼 제출 시 서버로 전송하기 위함
      //   - 결과: 선택된 의사 ID들이 hidden input에 저장됨
      updateSelectedDoctors();
    };
    
    // ========= 이벤트 리스너 추가 =========
    // 목적: 개별 체크박스에 change 이벤트 리스너 추가
    //   - addEventListener(): 이벤트 리스너 추가
    //   - 'change': 이벤트 타입 (체크박스 상태 변경)
    //   - checkbox._changeHandler: 이벤트 핸들러 함수 (위에서 생성한 것)
    //   - 동작: 체크박스 상태 변경 시 checkbox._changeHandler 함수가 호출됨
    //   - 결과: 체크박스 선택/해제 기능이 정상 작동
    checkbox.addEventListener('change', checkbox._changeHandler);
  });
  
  // ========= 체크박스 셀 클릭 시 이벤트 전파 방지 =========
  // 목적: 체크박스 셀 클릭 시 이벤트가 행으로 전파되지 않도록 방지
  //   - 사용자 경험(UX) 개선: 체크박스 셀 클릭 시 행 클릭 이벤트가 발생하지 않도록 함
  //   - 이벤트 충돌 방지: 체크박스 선택/해제 기능과 행 클릭 기능이 충돌하지 않도록 함
  // 
  // document.querySelectorAll('.checkbox-cell'): 모든 체크박스 셀 찾기
  //   - '.checkbox-cell': CSS 선택자
  //   - 반환값: NodeList 객체 (유사 배열, 모든 일치하는 요소)
  //   - 예: <td class="checkbox-cell"><input type="checkbox"></td>
  //   - 목적: 모든 체크박스 셀을 찾아서 이벤트 전파 방지 리스너 연결
  const checkboxCells = document.querySelectorAll('.checkbox-cell');
  
  // ========= 각 체크박스 셀에 이벤트 전파 방지 리스너 연결 =========
  // 목적: 각 체크박스 셀에 클릭 이벤트 리스너를 연결하여 이벤트 전파 방지
  //   - forEach(): 배열의 각 요소에 대해 함수 실행
  //   - checkboxCells: 모든 체크박스 셀 (NodeList)
  //   - cell: 현재 처리 중인 셀 요소
  //   - 동작: 각 셀에 대해 이벤트 전파 방지 리스너 연결
  checkboxCells.forEach(cell => {
    // ========= 이벤트 전파 방지 리스너 추가 =========
    // 목적: 체크박스 셀 클릭 시 이벤트가 부모 요소(행)로 전파되지 않도록 방지
    //   - 사용자 경험(UX) 개선: 체크박스 셀 클릭 시 행 클릭 이벤트가 발생하지 않도록 함
    //   - 이벤트 충돌 방지: 체크박스 선택/해제 기능과 행 클릭 기능이 충돌하지 않도록 함
    // 
    // cell.addEventListener('click', function(e) {...}): 셀에 클릭 이벤트 리스너 추가
    //   - addEventListener(): 이벤트 리스너 추가
    //   - 'click': 이벤트 타입 (마우스 클릭)
    //   - function(e) {...}: 이벤트 핸들러 함수
    //     → e: 이벤트 객체 (Event)
    //   - 동작: 셀 클릭 시 이벤트 전파 방지
    cell.addEventListener('click', function(e) {
      // ========= 이벤트 전파 방지 =========
      // e.stopPropagation(): 이벤트 전파(버블링) 방지
      //   - e: 이벤트 객체 (Event)
      //   - stopPropagation(): 이벤트가 부모 요소로 전파되는 것을 막는 메서드
      //   - 목적: 체크박스 셀 클릭 이벤트가 부모 요소(행)로 전파되지 않도록 함
      //   - 사용자 경험(UX) 개선: 체크박스 셀 클릭 시 행 클릭 이벤트가 발생하지 않도록 함
      //   - 결과: 체크박스 선택/해제 기능이 정상적으로 작동하고 행 클릭 이벤트와 충돌하지 않음
      e.stopPropagation();
    });
  });
}

/**
 * 버튼 이벤트 연결 함수 (승인대기 페이지)
 * 
 * 목적: 승인 버튼과 거절 버튼에 클릭 이벤트 리스너를 연결하여 승인/거절 기능 제공
 *   - 사용자 경험(UX) 개선: 버튼 클릭 한 번으로 선택된 의사들을 승인하거나 거절할 수 있음
 *   - 동적 이벤트 연결: DOM 업데이트 후에도 버튼 기능이 계속 작동하도록 보장
 *   - 중복 방지: 기존 이벤트 리스너를 제거한 후 새로 추가하여 중복 연결 방지
 *   - 일괄 처리 지원: 여러 의사를 한 번에 승인하거나 거절할 수 있음
 * 
 * 동작 방식:
 *   1. 승인 버튼에 이벤트 리스너 연결
 *      a. 승인 버튼 요소 찾기
 *      b. 버튼이 존재하는지 확인
 *      c. 기존 이벤트 리스너 제거 (중복 방지)
 *      d. 이벤트 핸들러 설정 (approveSelected 함수 참조)
 *      e. 이벤트 리스너 추가
 *   2. 거절 버튼에 이벤트 리스너 연결
 *      a. 거절 버튼 요소 찾기
 *      b. 버튼이 존재하는지 확인
 *      c. 기존 이벤트 리스너 제거 (중복 방지)
 *      d. 이벤트 핸들러 설정 (rejectSelected 함수 참조)
 *      e. 이벤트 리스너 추가
 * 
 * 사용 시점:
 *   - 페이지 로드 시 (DOMContentLoaded 이벤트)
 *   - AJAX로 페이지네이션 후 (handlePaginationAjax에서 호출)
 *   - DOM 업데이트 후 버튼 기능을 다시 활성화할 때
 * 
 * 관련 함수:
 *   - approveSelected(): 선택된 의사들을 승인하는 함수
 *   - rejectSelected(): 선택된 의사들을 거절하는 함수
 * 
 * 주의사항:
 *   - 승인/거절 작업 전에 사용자 확인을 요청함 (confirm 대화상자)
 *   - 거절 작업은 되돌릴 수 없음 (데이터 삭제)
 * 
 * @example
 * // 사용 예시 (페이지 로드 시)
 * attachButtonListeners();
 * // 결과:
 * // 1. 승인 버튼에 클릭 이벤트 리스너 연결
 * // 2. 거절 버튼에 클릭 이벤트 리스너 연결
 * // 3. 버튼 클릭 시 승인/거절 기능 수행
 */
function attachButtonListeners() {
  // ========= 승인 버튼 요소 조회 =========
  // 목적: 승인 버튼 요소를 찾아서 이벤트 리스너 연결
  //   - 사용자 경험(UX) 개선: 승인 기능 제공
  // 
  // document.getElementById('approveBtn'): 승인 버튼 찾기
  //   - 'approveBtn': 승인 버튼의 ID 속성
  //   - 반환값: HTMLButtonElement 객체 또는 null (없으면)
  //   - 예: <button id="approveBtn">승인</button>
  //   - 목적: 승인 버튼에 이벤트 리스너 연결하기 위함
  const approveBtn = document.getElementById('approveBtn');
  
  // ========= 승인 버튼 이벤트 리스너 연결 =========
  // 목적: 승인 버튼이 존재하는 경우에만 이벤트 리스너 연결
  //   - 안전성: 버튼이 없으면 에러 발생 방지
  //   - 데이터 무결성: 유효한 버튼이 있는 경우에만 이벤트 리스너 연결
  // 
  // if (approveBtn): 승인 버튼이 존재하는지 확인
  //   - approveBtn: 버튼 요소 (HTMLButtonElement 객체) 또는 null
  //   - truthy 값이면 true (버튼이 존재함)
  //   - falsy 값(null)이면 false (버튼이 없음)
  //   - 목적: 버튼이 있는 경우에만 이벤트 리스너 연결
  if (approveBtn) {
    // ========= 기존 이벤트 리스너 제거 =========
    // 목적: 기존 이벤트 리스너를 제거하여 중복 연결 방지
    //   - DOM 업데이트 후 이벤트 리스너를 다시 연결할 때 중복 방지
    //   - 안전성: 기존 리스너가 있으면 제거 후 새로 추가
    // 
    // approveBtn.removeEventListener('click', approveBtn._clickHandler): 기존 click 이벤트 리스너 제거
    //   - removeEventListener(): 이벤트 리스너 제거
    //   - 'click': 이벤트 타입 (마우스 클릭)
    //   - approveBtn._clickHandler: 제거할 이벤트 핸들러 함수
    //     → _clickHandler: 버튼 요소에 저장된 이벤트 핸들러 (이전에 추가한 것)
    //     → _ 접두사: 내부 사용을 나타냄 (private 속성 관례)
    //   - 목적: 기존 리스너가 있으면 제거 (없으면 에러 없이 무시됨)
    //   - 주의: 같은 함수 참조를 사용해야 제거됨 (그래서 _clickHandler에 저장)
    approveBtn.removeEventListener('click', approveBtn._clickHandler);
    
    // ========= 이벤트 핸들러 설정 =========
    // 목적: 승인 처리를 수행하는 함수를 이벤트 핸들러로 설정
    //   - approveBtn._clickHandler: 버튼 요소에 이벤트 핸들러를 저장
    //   - 목적: 나중에 removeEventListener로 제거할 수 있도록 함수 참조 저장
    // 
    // approveBtn._clickHandler = approveSelected: 이벤트 핸들러 함수 설정
    //   - _clickHandler: 버튼 요소의 커스텀 속성 (이벤트 핸들러 저장)
    //   - approveSelected: 승인 처리를 수행하는 함수 (이 파일에 정의됨)
    //   - 동작: 버튼 클릭 시 approveSelected 함수가 호출됨
    //   - 목적: 승인 기능 구현
    //   - 주의: 함수 참조를 직접 할당 (새로운 함수를 생성하지 않음)
    //     → 이렇게 하면 removeEventListener로 제거할 수 있음
    approveBtn._clickHandler = approveSelected;
    
    // ========= 이벤트 리스너 추가 =========
    // 목적: 승인 버튼에 click 이벤트 리스너 추가
    //   - addEventListener(): 이벤트 리스너 추가
    //   - 'click': 이벤트 타입 (마우스 클릭)
    //   - approveBtn._clickHandler: 이벤트 핸들러 함수 (위에서 설정한 것)
    //   - 동작: 버튼 클릭 시 approveBtn._clickHandler 함수가 호출됨
    //   - 결과: 승인 기능이 정상 작동
    approveBtn.addEventListener('click', approveBtn._clickHandler);
  }
  
  // ========= 거절 버튼 요소 조회 =========
  // 목적: 거절 버튼 요소를 찾아서 이벤트 리스너 연결
  //   - 사용자 경험(UX) 개선: 거절 기능 제공
  // 
  // document.getElementById('rejectBtn'): 거절 버튼 찾기
  //   - 'rejectBtn': 거절 버튼의 ID 속성
  //   - 반환값: HTMLButtonElement 객체 또는 null (없으면)
  //   - 예: <button id="rejectBtn">거절</button>
  //   - 목적: 거절 버튼에 이벤트 리스너 연결하기 위함
  const rejectBtn = document.getElementById('rejectBtn');
  
  // ========= 거절 버튼 이벤트 리스너 연결 =========
  // 목적: 거절 버튼이 존재하는 경우에만 이벤트 리스너 연결
  //   - 안전성: 버튼이 없으면 에러 발생 방지
  //   - 데이터 무결성: 유효한 버튼이 있는 경우에만 이벤트 리스너 연결
  // 
  // if (rejectBtn): 거절 버튼이 존재하는지 확인
  //   - rejectBtn: 버튼 요소 (HTMLButtonElement 객체) 또는 null
  //   - truthy 값이면 true (버튼이 존재함)
  //   - falsy 값(null)이면 false (버튼이 없음)
  //   - 목적: 버튼이 있는 경우에만 이벤트 리스너 연결
  if (rejectBtn) {
    // ========= 기존 이벤트 리스너 제거 =========
    // 목적: 기존 이벤트 리스너를 제거하여 중복 연결 방지
    //   - DOM 업데이트 후 이벤트 리스너를 다시 연결할 때 중복 방지
    //   - 안전성: 기존 리스너가 있으면 제거 후 새로 추가
    // 
    // rejectBtn.removeEventListener('click', rejectBtn._clickHandler): 기존 click 이벤트 리스너 제거
    //   - removeEventListener(): 이벤트 리스너 제거
    //   - 'click': 이벤트 타입 (마우스 클릭)
    //   - rejectBtn._clickHandler: 제거할 이벤트 핸들러 함수
    //     → _clickHandler: 버튼 요소에 저장된 이벤트 핸들러 (이전에 추가한 것)
    //     → _ 접두사: 내부 사용을 나타냄 (private 속성 관례)
    //   - 목적: 기존 리스너가 있으면 제거 (없으면 에러 없이 무시됨)
    //   - 주의: 같은 함수 참조를 사용해야 제거됨 (그래서 _clickHandler에 저장)
    rejectBtn.removeEventListener('click', rejectBtn._clickHandler);
    
    // ========= 이벤트 핸들러 설정 =========
    // 목적: 거절 처리를 수행하는 함수를 이벤트 핸들러로 설정
    //   - rejectBtn._clickHandler: 버튼 요소에 이벤트 핸들러를 저장
    //   - 목적: 나중에 removeEventListener로 제거할 수 있도록 함수 참조 저장
    // 
    // rejectBtn._clickHandler = rejectSelected: 이벤트 핸들러 함수 설정
    //   - _clickHandler: 버튼 요소의 커스텀 속성 (이벤트 핸들러 저장)
    //   - rejectSelected: 거절 처리를 수행하는 함수 (이 파일에 정의됨)
    //   - 동작: 버튼 클릭 시 rejectSelected 함수가 호출됨
    //   - 목적: 거절 기능 구현
    //   - 주의: 함수 참조를 직접 할당 (새로운 함수를 생성하지 않음)
    //     → 이렇게 하면 removeEventListener로 제거할 수 있음
    //   - 주의: 거절 작업은 되돌릴 수 없음 (데이터 삭제)
    rejectBtn._clickHandler = rejectSelected;
    
    // ========= 이벤트 리스너 추가 =========
    // 목적: 거절 버튼에 click 이벤트 리스너 추가
    //   - addEventListener(): 이벤트 리스너 추가
    //   - 'click': 이벤트 타입 (마우스 클릭)
    //   - rejectBtn._clickHandler: 이벤트 핸들러 함수 (위에서 설정한 것)
    //   - 동작: 버튼 클릭 시 rejectBtn._clickHandler 함수가 호출됨
    //   - 결과: 거절 기능이 정상 작동
    rejectBtn.addEventListener('click', rejectBtn._clickHandler);
  }
}

/**
 * 페이지 로드 시 초기화 이벤트 리스너 (승인대기 페이지)
 * 
 * 목적: DOM이 완전히 로드된 후 페이지의 모든 기능을 초기화하고 활성화
 *   - 사용자 경험(UX) 개선: 페이지 로드 즉시 모든 기능이 작동하도록 보장
 *   - 초기 상태 설정: 페이지 로드 시 필요한 초기 상태를 설정
 *   - 이벤트 리스너 연결: 모든 인터랙티브 요소에 이벤트 리스너 연결
 *   - URL 파라미터 처리: URL에 의사 ID가 있으면 해당 행을 선택 상태로 표시
 * 
 * 동작 방식:
 *   1. 선택된 의사 목록 업데이트 (체크박스 상태 동기화)
 *   2. 정렬 링크에 이벤트 리스너 연결
 *   3. 테이블 행에 클릭 이벤트 리스너 연결
 *   4. 체크박스에 이벤트 리스너 연결
 *   5. 버튼에 이벤트 리스너 연결
 *   6. URL 파라미터에서 의사 ID 읽기
 *   7. 해당 의사 행에 'selected' 클래스 추가 (시각적 피드백)
 * 
 * 실행 시점:
 *   - DOM이 완전히 로드된 후 (DOMContentLoaded 이벤트 발생 시)
 *   - 스크립트가 실행되기 전에 DOM이 준비되어 있어야 함
 * 
 * 관련 함수:
 *   - updateSelectedDoctors(): 선택된 의사 목록 업데이트
 *   - attachSortListeners(): 정렬 링크 이벤트 연결
 *   - attachTableRowListeners(): 테이블 행 클릭 이벤트 연결
 *   - attachCheckboxListeners(): 체크박스 이벤트 연결
 *   - attachButtonListeners(): 버튼 이벤트 연결
 * 
 * 주의사항:
 *   - DOMContentLoaded 이벤트는 DOM이 완전히 로드된 후에만 발생함
 *   - 스크립트가 <head>에 있거나 DOM 요소보다 먼저 실행되는 경우 필수
 *   - window.onload와 달리 이미지나 스타일시트 로드를 기다리지 않음
 * 
 * @example
 * // 자동 실행 (페이지 로드 시)
 * // 결과:
 * // 1. 모든 이벤트 리스너 연결
 * // 2. 초기 상태 설정
 * // 3. URL 파라미터에 따라 선택된 행 표시
 */
document.addEventListener('DOMContentLoaded', function() {
  // ========= 선택된 의사 목록 업데이트 =========
  // 목적: 페이지 로드 시 체크박스 상태에 따라 선택된 의사 목록을 초기화
  //   - 사용자 경험(UX) 개선: 페이지 로드 시 이미 선택된 체크박스의 상태를 반영
  //   - 일관성 유지: 초기 상태와 hidden input 값을 동기화
  // 
  // updateSelectedDoctors(): 선택된 의사 목록을 업데이트하는 함수 호출
  //   - updateSelectedDoctors(): 이 파일에 정의된 함수
  //   - 동작:
  //     1. 선택된 모든 체크박스의 value 값을 수집
  //     2. 쉼표로 구분된 문자열로 변환
  //     3. hidden input (doctorIdsInput)에 저장
  //     4. 전체 선택 체크박스 상태 업데이트 (모든 항목이 선택되었는지 확인)
  //   - 목적: 페이지 로드 시 초기 상태 설정
  //   - 결과: 선택된 의사 ID들이 hidden input에 저장됨
  updateSelectedDoctors();
  
  // ========= 정렬 링크 이벤트 리스너 연결 =========
  // attachSortListeners(): 정렬 링크에 이벤트 리스너를 연결하는 함수 호출
  //   - attachSortListeners(): 이 파일에 정의된 함수
  //   - 동작: 모든 정렬 링크에 클릭 이벤트 리스너 연결
  //   - 목적: 정렬 기능 활성화
  //   - 결과: 정렬 링크 클릭 시 정렬 처리 수행
  attachSortListeners();
  
  // ========= 테이블 행 클릭 이벤트 리스너 연결 =========
  // attachTableRowListeners(): 테이블 행에 클릭 이벤트 리스너를 연결하는 함수 호출
  //   - attachTableRowListeners(): 이 파일에 정의된 함수
  //   - 동작: 모든 의사 행에 클릭 이벤트 리스너 연결
  //   - 목적: 행 클릭 시 상세 정보 표시 기능 활성화
  //   - 결과: 행 클릭 시 의사 상세 정보 표시
  attachTableRowListeners();
  
  // ========= 체크박스 이벤트 리스너 연결 =========
  // attachCheckboxListeners(): 체크박스에 이벤트 리스너를 연결하는 함수 호출
  //   - attachCheckboxListeners(): 이 파일에 정의된 함수
  //   - 동작:
  //     1. 전체 선택 체크박스에 이벤트 리스너 연결
  //     2. 모든 개별 체크박스에 이벤트 리스너 연결
  //     3. 체크박스 셀에 이벤트 전파 방지 리스너 연결
  //   - 목적: 체크박스 선택/해제 기능 활성화
  //   - 결과: 체크박스 선택/해제 시 행 스타일 업데이트 및 선택된 항목 목록 갱신
  attachCheckboxListeners();
  
  // ========= 버튼 이벤트 리스너 연결 =========
  // attachButtonListeners(): 버튼에 이벤트 리스너를 연결하는 함수 호출
  //   - attachButtonListeners(): 이 파일에 정의된 함수
  //   - 동작:
  //     1. 승인 버튼에 클릭 이벤트 리스너 연결
  //     2. 거절 버튼에 클릭 이벤트 리스너 연결
  //   - 목적: 승인/거절 기능 활성화
  //   - 결과: 버튼 클릭 시 승인/거절 처리 수행
  attachButtonListeners();
  
  // ========= URL 파라미터에서 선택된 의사 ID 읽기 =========
  // 목적: URL에 의사 ID가 있으면 해당 의사 행을 선택 상태로 표시
  //   - 사용자 경험(UX) 개선: 페이지 새로고침 후에도 선택된 행이 유지됨
  //   - 상태 유지: URL 파라미터를 통해 선택 상태를 보존
  //   - 시각적 피드백: 선택된 행을 시각적으로 강조 표시
  // 
  // new URLSearchParams(window.location.search): URL의 쿼리 파라미터를 파싱하는 객체 생성
  //   - URLSearchParams: URL의 쿼리 문자열을 파싱하고 조작하는 API
  //   - window.location.search: 현재 페이지의 쿼리 문자열 (예: '?doctor_id=123')
  //   - 반환값: URLSearchParams 객체 (쿼리 파라미터를 읽고 수정할 수 있음)
  //   - 예: '?doctor_id=123&page=2' → URLSearchParams 객체
  //   - 목적: URL에서 의사 ID를 읽기 위함
  const urlParams = new URLSearchParams(window.location.search);
  
  // ========= 선택된 의사 ID 읽기 =========
  // urlParams.get('doctor_id'): URL에서 'doctor_id' 파라미터 값 읽기
  //   - get(): URLSearchParams 객체의 메서드 (파라미터 값 읽기)
  //   - 'doctor_id': 파라미터 이름
  //   - 반환값: 파라미터 값 (문자열) 또는 null (없으면)
  //   - 예: '?doctor_id=123' → '123'
  //   - 예: 파라미터 없음 → null
  //   - 목적: URL에 의사 ID가 있는지 확인
  const selectedDoctorId = urlParams.get('doctor_id');
  
  // ========= 선택된 의사 행에 selected 클래스 추가 =========
  // 목적: URL에 의사 ID가 있으면 해당 의사 행을 선택 상태로 표시
  //   - 사용자 경험(UX) 개선: 페이지 새로고침 후에도 선택된 행이 유지됨
  //   - 시각적 피드백: 선택된 행을 시각적으로 강조 표시
  // 
  // if (selectedDoctorId): 선택된 의사 ID가 있는지 확인
  //   - selectedDoctorId: 의사 ID 문자열 또는 null
  //   - truthy 값이면 true (의사 ID가 있음)
  //   - falsy 값(null)이면 false (의사 ID가 없음)
  //   - 목적: 의사 ID가 있는 경우에만 행을 선택 상태로 표시
  if (selectedDoctorId) {
    // ========= 선택된 의사 행 찾기 =========
    // document.querySelector(`[data-doctor-id="${selectedDoctorId}"]`): 선택된 의사 행 찾기
    //   - querySelector(): CSS 선택자로 요소를 찾는 메서드
    //   - `[data-doctor-id="${selectedDoctorId}"]`: 속성 선택자
    //     → 템플릿 리터럴: 백틱(`)을 사용한 문자열 보간
    //     → ${selectedDoctorId}: selectedDoctorId 변수의 값을 문자열에 삽입
    //     → 예: selectedDoctorId='123' → '[data-doctor-id="123"]'
    //   - 반환값: 첫 번째로 일치하는 요소 (HTMLElement 객체) 또는 null (없으면)
    //   - 예: <tr data-doctor-id="123">...</tr> → <tr> 요소 반환
    //   - 목적: 선택된 의사 ID를 가진 행을 찾기 위함
    //   - 주의: 페이지네이션으로 인해 해당 행이 현재 페이지에 없을 수 있음
    const selectedRow = document.querySelector(`[data-doctor-id="${selectedDoctorId}"]`);
    
    // ========= 행 존재 확인 및 selected 클래스 추가 =========
    // 목적: 행이 존재하는 경우에만 selected 클래스를 추가
    //   - 안전성: 행이 없으면 에러 발생 방지
    //   - 데이터 무결성: 유효한 행이 있는 경우에만 스타일 업데이트
    // 
    // if (selectedRow): 행이 존재하는지 확인
    //   - selectedRow: 행 요소 (HTMLElement 객체) 또는 null
    //   - truthy 값이면 true (행이 존재함)
    //   - falsy 값(null)이면 false (행이 없음)
    //   - 목적: 행이 있는 경우에만 selected 클래스 추가
    //   - 주의: 페이지네이션으로 인해 해당 행이 다른 페이지에 있을 수 있음
    if (selectedRow) {
      // ========= 선택된 행에 selected 클래스 추가 =========
      // selectedRow.classList.add('selected'): 행에 'selected' 클래스 추가
      //   - classList: 요소의 클래스 목록을 관리하는 DOMTokenList 객체
      //   - add('selected'): 'selected' 클래스를 추가
      //   - 동작: 클래스가 이미 있으면 중복 추가하지 않음 (에러 발생 안 함)
      //   - 목적: 선택된 행을 시각적으로 강조 표시
      //   - 결과: CSS에서 .selected 클래스로 스타일링 (예: 배경색 변경, 테두리 추가 등)
      //   - 예: <tr data-doctor-id="123" class="selected">...</tr>
      //   - 사용자 경험(UX) 개선: 페이지 새로고침 후에도 선택된 행이 유지됨
      selectedRow.classList.add('selected');
    }
    // 주의: selectedRow가 null이면 아무 동작도 하지 않음 (에러 발생 안 함)
    //   - 페이지네이션으로 인해 해당 행이 다른 페이지에 있을 수 있음
  }
  // 주의: selectedDoctorId가 null이면 아무 동작도 하지 않음 (에러 발생 안 함)
  //   - URL에 doctor_id 파라미터가 없는 경우
});
