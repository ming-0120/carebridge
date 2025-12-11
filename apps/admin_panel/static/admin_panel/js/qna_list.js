// 1:1 문의 목록 페이지 JavaScript
// 공통 함수는 admin_common.js를 참조하세요

/**
 * 전체 선택/해제 토글 함수
 * 
 * 목적: '전체 선택' 체크박스의 상태에 따라 모든 문의 체크박스를 일괄 선택/해제
 *   - 사용자 경험(UX) 개선: 한 번의 클릭으로 모든 문의를 선택하거나 해제할 수 있어 편의성 제공
 *   - 일관성 유지: 전체 선택 체크박스와 개별 체크박스의 상태를 동기화
 *   - 시각적 피드백: 선택된 행에 'checkbox-checked' 클래스를 추가하여 시각적으로 표시
 * 
 * 동작 방식:
 *   1. '전체 선택' 체크박스 요소 찾기
 *   2. 모든 개별 문의 체크박스 요소 찾기
 *   3. 각 개별 체크박스의 상태를 '전체 선택' 체크박스의 상태와 동기화
 *   4. 각 체크박스에 대해 행의 CSS 클래스 업데이트 (시각적 피드백)
 *   5. 선택된 문의 ID 목록 업데이트
 * 
 * 사용 시점:
 *   - '전체 선택' 체크박스 클릭 시 (attachCheckboxListeners에서 호출)
 *   - 직접 호출 가능 (다른 이벤트 핸들러에서도 사용 가능)
 * 
 * 관련 함수:
 *   - updateRowCheckboxClass: 체크박스 상태에 따라 행의 CSS 클래스 업데이트
 *   - updateSelectedQnas: 선택된 문의 ID 목록 업데이트
 *   - attachCheckboxListeners: 체크박스 이벤트 리스너 연결
 * 
 * @returns {void} 반환값 없음
 * 
 * @example
 * // '전체 선택' 체크박스 클릭 시 자동 호출
 * toggleSelectAllQna();
 * // 결과:
 * // 1. 모든 문의 체크박스가 '전체 선택' 체크박스와 동일한 상태로 변경
 * // 2. 선택된 행에 'checkbox-checked' 클래스 추가/제거
 * // 3. 선택된 문의 ID 목록이 업데이트됨
 */
function toggleSelectAllQna() {
  // ========= '전체 선택' 체크박스 요소 조회 =========
  // 목적: '전체 선택' 체크박스 요소를 찾아서 현재 상태를 확인
  //   - 사용자 경험(UX) 개선: 사용자가 클릭한 '전체 선택' 체크박스의 상태를 확인
  // 
  // document.getElementById('selectAll'): '전체 선택' 체크박스 요소 찾기
  //   - getElementById: ID로 요소를 찾는 메서드
  //   - 'selectAll': '전체 선택' 체크박스의 ID 속성
  //   - 반환값: HTMLElement 객체 (HTMLInputElement)
  //     → 예: <input type="checkbox" id="selectAll">
  //   - 목적: '전체 선택' 체크박스의 현재 상태(checked)를 확인하여 모든 개별 체크박스와 동기화
  //   - 주의: 요소가 없으면 null이 반환되지만, 일반적으로 존재함
  const selectAllCheckbox = document.getElementById('selectAll');
  
  // ========= 모든 개별 문의 체크박스 요소 조회 =========
  // 목적: 모든 개별 문의 체크박스 요소를 찾아서 일괄 선택/해제 처리
  //   - 사용자 경험(UX) 개선: 한 번의 클릭으로 모든 문의를 선택하거나 해제
  // 
  // document.querySelectorAll('input[name="qna_checkbox"]'): 모든 개별 문의 체크박스 찾기
  //   - querySelectorAll: CSS 선택자로 모든 요소를 찾는 메서드
  //   - 'input[name="qna_checkbox"]': CSS 선택자
  //     → input: <input> 태그
  //     → [name="qna_checkbox"]: name 속성이 "qna_checkbox"인 요소
  //     → 두 조건을 모두 만족하는 요소만 선택
  //   - 반환값: NodeList 객체 (유사 배열)
  //     → 예: NodeList(10) [input, input, input, ...]
  //     → forEach 메서드를 사용하여 각 체크박스를 순회할 수 있음
  //   - 목적: 모든 개별 문의 체크박스를 찾아서 '전체 선택' 체크박스와 동기화
  //   - 주의: name 속성이 "qna_checkbox"인 체크박스만 선택됨
  const checkboxes = document.querySelectorAll('input[name="qna_checkbox"]');
  
  // ========= 각 개별 체크박스 상태 동기화 =========
  // 목적: 전체 선택 체크박스가 체크된 경우, 답변 완료된 문의만 체크
  //   - 사용자 경험(UX) 개선: '전체 선택' 체크박스 클릭 시 답변 완료된 문의만 선택
  //   - 시각적 피드백: 선택된 행에 'checkbox-checked' 클래스를 추가하여 시각적으로 표시
  // 
  // checkboxes.forEach(checkbox => {...}): 각 개별 체크박스를 순회하며 상태 동기화
  //   - forEach: 배열 또는 유사 배열의 각 요소를 순회하는 메서드
  //   - checkbox: 현재 순회 중인 체크박스 요소 (HTMLInputElement 객체)
  //   - 화살표 함수: 각 체크박스에 대해 실행될 콜백 함수
  //   - 목적: 각 개별 체크박스의 상태를 '전체 선택' 체크박스와 동기화
  checkboxes.forEach(checkbox => {
    // ========= 체크박스 상태 동기화 =========
    // 전체 선택 체크박스가 체크된 경우:
    //   - 답변 완료된 문의(has_reply=true)만 체크
    //   - 대기 상태 문의(has_reply=false)는 체크하지 않음 (이미 disabled 상태)
    // 전체 선택 체크박스가 해제된 경우:
    //   - 모든 체크박스 해제
    if (selectAllCheckbox.checked) {
      // 답변 완료 여부 확인 (data-has-reply 속성)
      const hasReply = checkbox.getAttribute('data-has-reply') === 'true';
      // 답변 완료된 문의만 체크 (disabled된 체크박스는 자동으로 체크되지 않음)
      if (!checkbox.disabled && hasReply) {
        checkbox.checked = true;
      } else {
        checkbox.checked = false;
      }
    } else {
      // 전체 해제
      checkbox.checked = false;
    }
    
    // ========= 행의 CSS 클래스 업데이트 =========
    // 목적: 체크박스 상태에 따라 행의 CSS 클래스를 업데이트하여 시각적 피드백 제공
    //   - 사용자 경험(UX) 개선: 선택된 행을 시각적으로 구분하여 표시
    //   - 시각적 피드백: 'checkbox-checked' 클래스를 추가/제거하여 선택 상태를 표시
    // 
    // updateRowCheckboxClass(checkbox): 행의 CSS 클래스 업데이트 함수 호출
    //   - updateRowCheckboxClass: 앞서 정의한 함수
    //   - checkbox: 현재 순회 중인 체크박스 요소 (HTMLInputElement 객체)
    //   - 반환값: 없음 (void)
    //   - 동작:
    //     1. 체크박스의 부모 행 요소 찾기 (closest('tr'))
    //     2. 체크박스가 체크되어 있으면 행에 'checkbox-checked' 클래스 추가
    //     3. 체크박스가 체크 해제되어 있으면 행에서 'checkbox-checked' 클래스 제거
    //   - 목적: 체크박스 상태에 따라 행의 시각적 스타일 업데이트
    updateRowCheckboxClass(checkbox);
  });
  
  // ========= 선택된 문의 ID 목록 업데이트 =========
  // 목적: 선택된 문의 ID 목록을 업데이트하여 폼 제출 시 사용할 수 있도록 함
  //   - 사용자 경험(UX) 개선: 선택된 문의 ID를 숨겨진 입력 필드에 저장하여 일괄 삭제 등에 사용
  //   - 데이터 관리: 선택된 문의 ID를 쉼표로 구분된 문자열로 저장
  // 
  // updateSelectedQnas(): 선택된 문의 ID 목록 업데이트 함수 호출
  //   - updateSelectedQnas: 앞서 정의한 함수
  //   - 반환값: 없음 (void)
  //   - 동작:
  //     1. getSelectedItemIds('qna_checkbox')를 호출하여 선택된 문의 ID 배열 가져오기
  //     2. 선택된 문의 ID 배열을 쉼표로 구분된 문자열로 변환
  //     3. 숨겨진 입력 필드(qnaIdsInput)에 선택된 문의 ID 문자열 저장
  //     4. '전체 선택' 체크박스의 상태 업데이트
  //       → 모든 체크박스가 선택되어 있으면 '전체 선택' 체크박스도 체크
  //       → 일부만 선택되어 있으면 '전체 선택' 체크박스는 해제
  //   - 목적: 선택된 문의 ID 목록을 업데이트하여 폼 제출 시 사용
  //   - 주의: 이 함수는 개별 체크박스 상태 변경 시에도 호출됨
  updateSelectedQnas();
}

/**
 * 선택된 문의 ID 목록 업데이트 함수
 * 
 * 목적: 선택된 문의 체크박스의 ID를 수집하여 숨겨진 입력 필드에 저장하고, '전체 선택' 체크박스 상태를 업데이트
 *   - 사용자 경험(UX) 개선: 선택된 문의 ID를 저장하여 일괄 삭제 등에 사용
 *   - 데이터 관리: 선택된 문의 ID를 쉼표로 구분된 문자열로 저장하여 폼 제출 시 전달
 *   - 일관성 유지: 모든 체크박스가 선택되어 있으면 '전체 선택' 체크박스도 자동으로 체크
 * 
 * 동작 방식:
 *   1. 선택된 문의 체크박스의 ID를 배열로 수집 (getSelectedItemIds 함수 사용)
 *   2. 선택된 문의 ID 배열을 쉼표로 구분된 문자열로 변환
 *   3. 숨겨진 입력 필드(qnaIdsInput)에 선택된 문의 ID 문자열 저장
 *   4. '전체 선택' 체크박스 요소 찾기
 *   5. 모든 체크박스 요소 찾기
 *   6. 모든 체크박스가 선택되어 있으면 '전체 선택' 체크박스도 체크, 그렇지 않으면 해제
 * 
 * 사용 시점:
 *   - 개별 체크박스 상태 변경 시 (attachCheckboxListeners에서 호출)
 *   - '전체 선택' 체크박스 클릭 시 (toggleSelectAllQna에서 호출)
 *   - 테이블 행 클릭 이벤트 연결 시 (attachTableRowListeners에서 호출)
 *   - 직접 호출 가능 (다른 이벤트 핸들러에서도 사용 가능)
 * 
 * 관련 함수:
 *   - getSelectedItemIds (admin_common.js): 선택된 체크박스의 ID 배열 반환
 *   - toggleSelectAllQna: '전체 선택' 체크박스 상태에 따라 모든 체크박스 선택/해제
 *   - attachCheckboxListeners: 체크박스 이벤트 리스너 연결
 * 
 * @returns {void} 반환값 없음
 * 
 * @example
 * // 개별 체크박스 클릭 시 자동 호출
 * updateSelectedQnas();
 * // 결과:
 * // 1. 선택된 문의 ID가 쉼표로 구분된 문자열로 저장됨 (예: "1,2,3")
 * // 2. 모든 체크박스가 선택되어 있으면 '전체 선택' 체크박스도 자동으로 체크됨
 * // 3. 일부만 선택되어 있으면 '전체 선택' 체크박스는 해제됨
 */
function updateSelectedQnas() {
  // ========= 선택된 문의 ID 배열 수집 =========
  // 목적: 선택된 문의 체크박스의 ID를 배열로 수집
  //   - 데이터 수집: 선택된 문의의 ID를 수집하여 일괄 처리에 사용
  //   - 사용자 경험(UX) 개선: 선택된 문의 ID를 저장하여 일괄 삭제 등에 사용
  // 
  // getSelectedItemIds('qna_checkbox'): 선택된 문의 체크박스의 ID 배열 반환
  //   - getSelectedItemIds: admin_common.js에 정의된 공통 함수
  //   - 'qna_checkbox': 체크박스의 name 속성 값
  //     → name 속성이 "qna_checkbox"인 체크박스 중에서 체크된 것만 선택
  //   - 반환값: 선택된 체크박스의 value 속성 값 배열 (문자열 배열)
  //     → 예: ["1", "2", "3"] (문의 ID가 1, 2, 3인 체크박스가 선택된 경우)
  //     → 예: [] (선택된 체크박스가 없는 경우)
  //   - 목적: 선택된 문의 ID를 배열로 수집하여 이후 처리에 사용
  //   - 주의: admin_common.js가 로드되어 있어야 함
  const qnaIds = getSelectedItemIds('qna_checkbox');
  
  // ========= 숨겨진 입력 필드에 선택된 문의 ID 저장 =========
  // 목적: 선택된 문의 ID를 쉼표로 구분된 문자열로 변환하여 숨겨진 입력 필드에 저장
  //   - 데이터 저장: 선택된 문의 ID를 폼 제출 시 전달할 수 있도록 저장
  //   - 사용자 경험(UX) 개선: 일괄 삭제 등 작업 시 선택된 문의 ID를 쉽게 전달
  // 
  // document.getElementById('qnaIdsInput').value = qnaIds.join(','): 선택된 문의 ID 문자열 저장
  //   - getElementById: ID로 요소를 찾는 메서드
  //   - 'qnaIdsInput': 숨겨진 입력 필드의 ID 속성
  //     → 예: <input type="hidden" id="qnaIdsInput" name="qna_ids">
  //   - .value: 입력 필드의 값 속성
  //   - qnaIds.join(','): 배열을 쉼표로 구분된 문자열로 변환
  //     → join: 배열의 모든 요소를 지정된 구분자로 연결하여 문자열로 만드는 메서드
  //     → ',': 구분자 (쉼표)
  //     → 예: ["1", "2", "3"].join(',') → "1,2,3"
  //     → 예: [].join(',') → "" (빈 문자열)
  //   - 목적: 선택된 문의 ID를 쉼표로 구분된 문자열로 변환하여 폼 제출 시 전달
  //   - 주의: qnaIdsInput 요소가 존재해야 함
  document.getElementById('qnaIdsInput').value = qnaIds.join(',');
  
  // ========= '전체 선택' 체크박스 상태 업데이트 =========
  // 목적: 모든 체크박스가 선택되어 있는지 확인하여 '전체 선택' 체크박스 상태를 업데이트
  //   - 사용자 경험(UX) 개선: 모든 체크박스가 선택되어 있으면 '전체 선택' 체크박스도 자동으로 체크
  //   - 일관성 유지: '전체 선택' 체크박스와 개별 체크박스의 상태를 동기화
  // 
  // const selectAllCheckbox = document.getElementById('selectAll'): '전체 선택' 체크박스 요소 찾기
  //   - getElementById: ID로 요소를 찾는 메서드
  //   - 'selectAll': '전체 선택' 체크박스의 ID 속성
  //   - 반환값: HTMLElement 객체 (HTMLInputElement)
  //     → 예: <input type="checkbox" id="selectAll">
  //   - 목적: '전체 선택' 체크박스의 상태를 업데이트하기 위해 요소 찾기
  //   - 주의: 요소가 없으면 null이 반환되지만, 일반적으로 존재함
  const selectAllCheckbox = document.getElementById('selectAll');
  
  // ========= 모든 체크박스 요소 조회 =========
  // 목적: 모든 개별 문의 체크박스 요소를 찾아서 개수를 확인
  //   - 개수 확인: 전체 체크박스 개수와 선택된 체크박스 개수를 비교하기 위함
  // 
  // document.querySelectorAll('input[name="qna_checkbox"]'): 모든 개별 문의 체크박스 찾기
  //   - querySelectorAll: CSS 선택자로 모든 요소를 찾는 메서드
  //   - 'input[name="qna_checkbox"]': CSS 선택자
  //     → input: <input> 태그
  //     → [name="qna_checkbox"]: name 속성이 "qna_checkbox"인 요소
  //     → 두 조건을 모두 만족하는 요소만 선택
  //   - 반환값: NodeList 객체 (유사 배열)
  //     → 예: NodeList(10) [input, input, input, ...]
  //     → length 속성을 사용하여 개수를 확인할 수 있음
  //   - 목적: 전체 체크박스 개수를 확인하여 '전체 선택' 체크박스 상태를 결정
  //   - 주의: name 속성이 "qna_checkbox"인 체크박스만 선택됨
  const allCheckboxes = document.querySelectorAll('input[name="qna_checkbox"]');
  
  // ========= '전체 선택' 체크박스 상태 결정 =========
  // 전체 선택 체크박스는 답변 완료된 문의만 모두 선택되었을 때 체크됨
  //   - 답변 완료된 문의만 선택 가능하므로, 해당 문의들이 모두 선택되었는지 확인
  //   - 대기 상태 문의는 선택 불가능하므로 전체 선택 체크박스 상태 결정에 포함하지 않음
  const completedCheckboxes = Array.from(allCheckboxes).filter(
    checkbox => !checkbox.disabled && checkbox.getAttribute('data-has-reply') === 'true'
  );
  const selectedCompletedCount = Array.from(completedCheckboxes)
    .filter(checkbox => checkbox.checked)
    .length;
  
  // 답변 완료된 문의가 있고, 모두 선택되었을 때만 전체 선택 체크박스 체크
  selectAllCheckbox.checked = completedCheckboxes.length > 0 && 
                              selectedCompletedCount === completedCheckboxes.length;
}

/**
 * 선택된 문의 삭제 함수
 * 
 * 목적: 선택된 문의를 삭제하기 전 확인 메시지를 표시하고, 사용자가 확인하면 삭제 폼을 제출
 *   - 사용자 경험(UX) 개선: 실수로 데이터를 삭제하는 것을 방지하기 위한 확인 절차 제공
 *   - 데이터 보호: 중요한 데이터 삭제 전 사용자 확인을 통해 실수 방지
 *   - 명확한 의사 표현: 사용자가 의도적으로 삭제를 원하는지 확인
 * 
 * 동작 방식:
 *   1. 숨겨진 입력 필드에서 선택된 문의 ID 목록 가져오기
 *   2. 선택된 문의가 없으면 경고 메시지 표시하고 함수 종료
 *   3. 선택된 문의가 있으면 확인 대화상자 표시
 *   4. 사용자가 '확인'을 클릭하면 삭제 폼 제출
 *   5. 사용자가 '취소'를 클릭하면 삭제 취소
 * 
 * 사용 시점:
 *   - 삭제 버튼 클릭 시 (attachButtonListeners에서 호출)
 *   - 직접 호출 가능 (다른 이벤트 핸들러에서도 사용 가능)
 * 
 * 관련 함수:
 *   - attachButtonListeners: 삭제 버튼에 이벤트 리스너 연결
 *   - updateSelectedQnas: 선택된 문의 ID 목록 업데이트
 * 
 * @returns {void} 반환값 없음
 * 
 * @example
 * // 삭제 버튼 클릭 시 자동 호출
 * deleteSelected();
 * // 결과:
 * // 1. 선택된 문의가 없으면 경고 메시지 표시
 * // 2. 선택된 문의가 있으면 확인 대화상자 표시
 * // 3. 사용자가 '확인' 클릭 → 삭제 폼 제출 → 선택된 문의 삭제
 * // 4. 사용자가 '취소' 클릭 → 삭제 취소
 */
function deleteSelected() {
  // ========= 선택된 문의 ID 목록 가져오기 =========
  // 목적: 숨겨진 입력 필드에서 선택된 문의 ID 목록을 가져와서 삭제할 문의 확인
  //   - 데이터 확인: 삭제할 문의가 있는지 확인
  // 
  // document.getElementById('qnaIdsInput').value: 숨겨진 입력 필드에서 선택된 문의 ID 목록 가져오기
  //   - getElementById: ID로 요소를 찾는 메서드
  //   - 'qnaIdsInput': 숨겨진 입력 필드의 ID 속성
  //     → 예: <input type="hidden" id="qnaIdsInput" name="qna_ids" value="1,2,3">
  //   - .value: 입력 필드의 값 속성
  //   - 반환값: 선택된 문의 ID 목록 (쉼표로 구분된 문자열)
  //     → 예: "1,2,3" (문의 ID가 1, 2, 3인 경우)
  //     → 예: "" (선택된 문의가 없는 경우)
  //   - 목적: 삭제할 문의 ID 목록을 가져와서 확인
  //   - 주의: qnaIdsInput 요소가 존재해야 함
  const qnaIds = document.getElementById('qnaIdsInput').value;
  
  // ========= 선택된 문의 확인 =========
  // 목적: 선택된 문의가 있는지 확인하고, 없으면 경고 메시지를 표시하고 함수 종료
  //   - 사용자 경험(UX) 개선: 선택된 문의가 없을 때 명확한 안내 메시지 제공
  //   - 데이터 보호: 선택된 문의가 없으면 삭제 작업을 수행하지 않음
  // 
  // if (!qnaIds): 선택된 문의가 없는지 확인
  //   - !qnaIds: qnaIds의 논리 부정
  //     → qnaIds가 빈 문자열("")이면 true (선택된 문의가 없음)
  //     → qnaIds가 값이 있으면 false (선택된 문의가 있음)
  //   - 목적: 선택된 문의가 없는 경우에만 처리
  if (!qnaIds) {
    // ========= 경고 메시지 표시 =========
    // 목적: 선택된 문의가 없을 때 사용자에게 경고 메시지를 표시하고 함수 종료
    //   - 사용자 경험(UX) 개선: 선택된 문의가 없을 때 명확한 안내 메시지 제공
    // 
    // alert('삭제할 문의를 선택해주세요.'): 경고 대화상자 표시
    //   - alert: 브라우저의 내장 함수로 경고 대화상자를 표시
    //   - '삭제할 문의를 선택해주세요.': 표시할 메시지
    //   - 동작: 경고 대화상자를 표시하고 사용자가 '확인' 버튼을 클릭할 때까지 대기
    //   - 목적: 사용자에게 선택된 문의가 없음을 알림
    //   - 주의: alert()는 동기적으로 동작하므로 사용자가 버튼을 클릭할 때까지 코드 실행이 중단됨
    alert('삭제할 문의를 선택해주세요.');
    
    // ========= 함수 종료 =========
    // 목적: 선택된 문의가 없으므로 함수를 종료하고 삭제 작업을 수행하지 않음
    // 
    // return: 함수를 즉시 종료
    //   - 목적: 선택된 문의가 없으므로 삭제 작업을 수행하지 않고 함수 종료
    //   - 주의: 이후 코드는 실행되지 않음
    return;
  }
  
  // ========= 삭제 확인 대화상자 표시 =========
  // 목적: 사용자에게 삭제 확인 메시지를 표시하고, 사용자가 확인하면 삭제 폼을 제출
  //   - 사용자 경험(UX) 개선: 실수로 데이터를 삭제하는 것을 방지하기 위한 확인 절차 제공
  //   - 데이터 보호: 중요한 데이터 삭제 전 사용자 확인을 통해 실수 방지
  // 
  // if (confirm('이 게시물을 삭제 하시겠습니까?')): 확인 대화상자 표시
  //   - confirm: 브라우저의 내장 함수로 확인 대화상자를 표시
  //   - '이 게시물을 삭제 하시겠습니까?': 표시할 메시지
  //   - 반환값: boolean
  //     → true: 사용자가 '확인'을 클릭한 경우
  //     → false: 사용자가 '취소'를 클릭한 경우
  //   - 목적: 사용자가 삭제를 확인한 경우에만 삭제 폼을 제출
  //   - 주의: confirm()은 동기적으로 동작하므로 사용자가 버튼을 클릭할 때까지 코드 실행이 중단됨
  if (confirm('이 게시물을 삭제 하시겠습니까?')) {
    // ========= 삭제 폼 제출 =========
    // 목적: 사용자가 확인을 클릭한 경우 삭제 폼을 제출하여 선택된 문의 삭제
    //   - 사용자 경험(UX) 개선: 사용자가 확인한 경우에만 삭제 작업 수행
    //   - 데이터 삭제: 선택된 문의를 서버로 전송하여 삭제 처리
    // 
    // document.getElementById('deleteForm').submit(): 삭제 폼 제출
    //   - getElementById: ID로 요소를 찾는 메서드
    //   - 'deleteForm': 삭제 폼의 ID 속성
    //     → 예: <form id="deleteForm" method="POST" action="/admin_panel/qna/delete/">
    //   - .submit(): 폼 제출 메서드
    //     → 폼의 action 속성에 지정된 URL로 폼 데이터를 전송
    //     → 폼의 method 속성에 지정된 HTTP 메서드(POST)로 전송
    //     → 선택된 문의 ID 목록(qna_ids)이 폼 데이터로 전송됨
    //   - 반환값: 없음 (void)
    //   - 동작:
    //     1. 폼 데이터를 서버로 전송
    //     2. 서버에서 선택된 문의를 삭제 처리
    //     3. 페이지가 새로고침되거나 리다이렉트됨
    //   - 목적: 선택된 문의를 삭제하기 위해 폼 제출
    //   - 주의: deleteForm 요소가 존재해야 함
    document.getElementById('deleteForm').submit();
  }
  // 주의: 사용자가 '취소'를 클릭한 경우 삭제 폼을 제출하지 않음
}

/**
 * 문의 상세 페이지로 이동 함수
 * 
 * 목적: 특정 문의의 상세 페이지로 이동
 *   - 사용자 경험(UX) 개선: 테이블 행 클릭 시 해당 문의의 상세 정보를 확인할 수 있도록 함
 *   - 네비게이션: 문의 목록에서 문의 상세 페이지로 이동
 * 
 * 동작 방식:
 *   1. 문의 ID(qnaId) 파라미터 확인
 *   2. 문의 ID가 없으면 에러 로그 출력하고 함수 종료
 *   3. 문의 상세 페이지 URL 생성
 *   4. 생성된 URL로 페이지 이동
 * 
 * 사용 시점:
 *   - 테이블 행 클릭 시 (attachTableRowListeners에서 호출)
 *   - 직접 호출 가능 (다른 이벤트 핸들러에서도 사용 가능)
 * 
 * 관련 함수:
 *   - attachTableRowListeners: 테이블 행 클릭 이벤트 연결
 * 
 * @param {number|string} qnaId - 이동할 문의의 ID
 *   - 숫자 또는 숫자 문자열 형태
 *   - URL에 포함되어 문의 상세 페이지를 식별하는 데 사용됨
 *   - 예: 1, 2, 3, "1", "2", "3"
 * 
 * @returns {void} 반환값 없음
 * 
 * @example
 * // 테이블 행 클릭 시 자동 호출
 * goToQnaDetail(1);
 * // 결과:
 * // 1. 문의 ID 1의 상세 페이지 URL 생성: /admin_panel/qna_detail/1/
 * // 2. 해당 URL로 페이지 이동
 */
function goToQnaDetail(qnaId) {
  // ========= 문의 ID 확인 =========
  // 목적: 문의 ID 파라미터가 유효한지 확인하고, 없으면 에러 로그를 출력하고 함수 종료
  //   - 안전성: 문의 ID가 없으면 잘못된 URL로 이동하는 것을 방지
  //   - 디버깅: 문의 ID가 없을 때 에러 로그를 출력하여 문제를 쉽게 파악
  // 
  // if (!qnaId): 문의 ID가 없는지 확인
  //   - !qnaId: qnaId의 논리 부정
  //     → qnaId가 null, undefined, 0, "", false 등 falsy 값이면 true
  //     → qnaId가 truthy 값이면 false
  //   - 목적: 문의 ID가 없는 경우에만 처리
  if (!qnaId) {
    // ========= 에러 로그 출력 =========
    // 목적: 문의 ID가 없을 때 콘솔에 에러 메시지를 출력하여 디버깅에 도움
    //   - 디버깅: 개발자 도구의 콘솔에서 에러를 확인할 수 있음
    // 
    // console.error('qnaId가 없습니다.'): 에러 로그 출력
    //   - console.error: 콘솔에 에러 메시지를 출력하는 메서드
    //   - 'qnaId가 없습니다.': 출력할 에러 메시지
    //   - 목적: 문의 ID가 없을 때 에러를 로그로 출력
    //   - 주의: 프로덕션 환경에서는 사용자에게 보이지 않음 (개발자 도구에서만 확인 가능)
    console.error('qnaId가 없습니다.');
    
    // ========= 함수 종료 =========
    // 목적: 문의 ID가 없으므로 함수를 종료하고 페이지 이동을 수행하지 않음
    // 
    // return: 함수를 즉시 종료
    //   - 목적: 문의 ID가 없으므로 페이지 이동을 수행하지 않고 함수 종료
    //   - 주의: 이후 코드는 실행되지 않음
    return;
  }
  
  // ========= 문의 상세 페이지 URL 생성 =========
  // 목적: 문의 ID를 사용하여 문의 상세 페이지 URL을 생성
  //   - URL 생성: 템플릿 리터럴을 사용하여 동적으로 URL 생성
  //   - 네비게이션: 생성된 URL로 페이지 이동
  // 
  // const url = `/admin_panel/qna_detail/${qnaId}/`: 문의 상세 페이지 URL 생성
  //   - 템플릿 리터럴: 백틱(`)을 사용하여 문자열과 변수를 결합
  //   - `/admin_panel/qna_detail/`: 문의 상세 페이지의 기본 경로
  //   - ${qnaId}: 문의 ID 변수를 문자열에 삽입
  //   - `/`: URL 경로의 끝
  //   - 반환값: 문의 상세 페이지 URL (문자열)
  //     → 예: "/admin_panel/qna_detail/1/" (문의 ID가 1인 경우)
  //     → 예: "/admin_panel/qna_detail/2/" (문의 ID가 2인 경우)
  //   - 목적: 문의 상세 페이지로 이동하기 위한 URL 생성
  const url = `/admin_panel/qna_detail/${qnaId}/`;
  
  // ========= 이동할 URL 로그 출력 =========
  // 목적: 생성된 URL을 콘솔에 출력하여 디버깅에 도움
  //   - 디버깅: 개발자 도구의 콘솔에서 이동할 URL을 확인할 수 있음
  // 
  // console.log('이동할 URL:', url): 로그 출력
  //   - console.log: 콘솔에 로그 메시지를 출력하는 메서드
  //   - '이동할 URL:': 로그 메시지
  //   - url: 이동할 URL (변수)
  //   - 목적: 이동할 URL을 로그로 출력하여 디버깅에 도움
  //   - 주의: 프로덕션 환경에서는 사용자에게 보이지 않음 (개발자 도구에서만 확인 가능)
  console.log('이동할 URL:', url);
  
  // ========= 페이지 이동 =========
  // 목적: 생성된 URL로 페이지 이동
  //   - 사용자 경험(UX) 개선: 테이블 행 클릭 시 해당 문의의 상세 정보를 확인할 수 있도록 함
  //   - 네비게이션: 문의 목록에서 문의 상세 페이지로 이동
  // 
  // window.location.href = url: 페이지 이동
  //   - window.location: 현재 페이지의 위치 정보를 담고 있는 객체
  //   - .href: 현재 페이지의 URL을 설정하거나 가져오는 속성
  //   - url: 이동할 URL (문자열)
  //   - 동작:
  //     1. window.location.href에 새로운 URL을 할당
  //     2. 브라우저가 해당 URL로 페이지 이동
  //     3. 페이지가 새로고침되며 문의 상세 페이지가 로드됨
  //   - 목적: 문의 상세 페이지로 이동
  //   - 주의: 페이지 이동 시 현재 페이지의 상태는 유지되지 않음 (새로고침됨)
  window.location.href = url;
}

/**
 * 테이블 행 클릭 이벤트 연결 함수
 * 
 * 목적: 문의 목록 테이블의 각 행에 클릭 이벤트 리스너를 연결하여 문의 상세 페이지로 이동 기능 제공
 *   - 사용자 경험(UX) 개선: 테이블 행 클릭 시 해당 문의의 상세 정보를 확인할 수 있도록 직관적인 인터페이스 제공
 *   - 동적 이벤트 관리: AJAX 페이지네이션 후 새로 로드된 행에도 이벤트 리스너를 재연결
 *   - 이벤트 충돌 방지: 체크박스나 체크박스 셀 클릭 시에는 행 클릭 이벤트가 발생하지 않도록 처리
 * 
 * 동작 방식:
 *   1. 선택된 문의 ID 목록 업데이트 (updateSelectedQnas)
 *   2. 문의 목록 테이블의 모든 행을 찾기
 *   3. 각 행에 대해 기존 이벤트 리스너 제거 (중복 방지)
 *   4. 행의 data-qna-id 속성에서 문의 ID 추출
 *   5. 클릭 이벤트 핸들러 생성 및 연결
 *   6. 체크박스나 체크박스 셀 클릭 시에는 이벤트 무시
 *   7. 행 클릭 시 goToQnaDetail 함수 호출
 * 
 * 사용 시점:
 *   - 페이지 로드 시 (DOMContentLoaded 이벤트)
 *   - AJAX 페이지네이션 후 (handlePaginationAjax에서 호출)
 *   - 테이블 내용이 동적으로 변경된 후
 * 
 * 관련 함수:
 *   - goToQnaDetail: 문의 상세 페이지로 이동
 *   - updateSelectedQnas: 선택된 문의 ID 목록 업데이트
 *   - handlePaginationAjax (admin_common.js): AJAX 페이지네이션 처리 후 이 함수 호출
 * 
 * @returns {void} 반환값 없음
 * 
 * @example
 * // 페이지 로드 시 자동 호출
 * attachTableRowListeners();
 * // 결과:
 * // 1. 모든 문의 목록 행에 클릭 이벤트 리스너 연결
 * // 2. 행 클릭 시 해당 문의의 상세 페이지로 이동
 * // 3. 체크박스나 체크박스 셀 클릭 시에는 행 클릭 이벤트 무시
 */
function attachTableRowListeners() {
  // ========= 선택된 문의 ID 목록 업데이트 =========
  // 목적: 선택된 문의 ID 목록을 업데이트하여 현재 상태를 반영
  //   - 상태 동기화: AJAX 페이지네이션 후 선택된 문의 ID 목록을 업데이트
  //   - 사용자 경험(UX) 개선: 페이지네이션 후에도 선택된 문의 상태를 유지
  // 
  // updateSelectedQnas(): 선택된 문의 ID 목록 업데이트 함수 호출
  //   - updateSelectedQnas: 앞서 정의한 함수
  //   - 반환값: 없음 (void)
  //   - 동작: 선택된 문의 ID 목록을 업데이트하고 '전체 선택' 체크박스 상태를 업데이트
  //   - 목적: AJAX 페이지네이션 후 선택된 문의 상태를 동기화
  updateSelectedQnas();
  
  // ========= 문의 목록 테이블 행 조회 =========
  // 목적: 문의 목록 테이블의 모든 행을 찾기
  //   - 사용자 경험(UX) 개선: 모든 행에 클릭 이벤트를 연결하여 직관적인 인터페이스 제공
  // 
  // document.querySelectorAll('.qna-row[data-qna-id]'): 문의 목록 행 찾기
  //   - querySelectorAll: CSS 선택자로 모든 요소를 찾는 메서드
  //   - '.qna-row[data-qna-id]': CSS 선택자
  //     → .qna-row: qna-row 클래스를 가진 요소
  //     → [data-qna-id]: data-qna-id 속성을 가진 요소
  //     → 두 조건을 모두 만족하는 요소만 선택
  //   - 반환값: NodeList 객체 (유사 배열)
  //     → 예: NodeList(10) [tr.qna-row, tr.qna-row, ...]
  //     → forEach 메서드를 사용하여 각 행을 순회할 수 있음
  //   - 목적: 문의 목록 테이블의 모든 행을 찾아 이벤트 리스너를 연결
  //   - 주의: data-qna-id 속성이 없는 행은 선택되지 않음
  const qnaRows = document.querySelectorAll('.qna-row[data-qna-id]');
  
  // ========= 각 행에 클릭 이벤트 리스너 연결 =========
  // 목적: 각 문의 목록 행에 클릭 이벤트 리스너를 연결
  //   - 사용자 경험(UX) 개선: 행 클릭 시 해당 문의의 상세 페이지로 이동
  //   - 동적 이벤트 관리: AJAX 페이지네이션 후 새로 로드된 행에도 이벤트 리스너를 재연결
  // 
  // qnaRows.forEach(row => {...}): 각 행을 순회하며 이벤트 리스너 연결
  //   - forEach: 배열 또는 유사 배열의 각 요소를 순회하는 메서드
  //   - row: 현재 순회 중인 행 요소 (HTMLElement 객체)
  //   - 화살표 함수: 각 행에 대해 실행될 콜백 함수
  //   - 목적: 각 행에 클릭 이벤트 리스너를 연결
  qnaRows.forEach(row => {
    // ========= 기존 이벤트 리스너 제거 =========
    // 목적: 중복 이벤트 리스너 방지를 위해 기존 리스너 제거
    //   - 메모리 누수 방지: 이벤트 리스너가 중복으로 등록되는 것을 방지
    //   - 동적 이벤트 관리: AJAX 페이지네이션 후 같은 행에 다시 이벤트 리스너를 연결할 때 중복 방지
    // 
    // row.removeEventListener('click', row._clickHandler): 기존 클릭 이벤트 리스너 제거
    //   - removeEventListener: 이벤트 리스너를 제거하는 메서드
    //   - 'click': 제거할 이벤트 타입
    //   - row._clickHandler: 제거할 이벤트 핸들러 함수
    //     → _clickHandler: 행 요소에 저장된 이벤트 핸들러 함수 참조
    //     → 커스텀 속성으로 저장하여 나중에 제거할 수 있도록 함
    //   - 목적: 기존 이벤트 리스너가 있으면 제거하여 중복 방지
    //   - 주의: _clickHandler가 없으면 에러가 발생하지 않음 (무시됨)
    row.removeEventListener('click', row._clickHandler);
    
    // ========= 행의 문의 ID 추출 =========
    // 목적: 행 요소에서 문의 ID를 추출하여 goToQnaDetail 함수에 전달
    //   - 데이터 추출: HTML data 속성에서 문의 ID를 읽어옴
    // 
    // row.getAttribute('data-qna-id'): data-qna-id 속성 값 읽기
    //   - getAttribute: 요소의 속성 값을 읽는 메서드
    //   - 'data-qna-id': 읽을 속성 이름
    //   - 반환값: 속성 값 (문자열) 또는 null (속성이 없으면)
    //     → 예: "1", "2", "3" 또는 null
    //   - 목적: 행 요소에서 문의 ID를 추출
    //   - 주의: 속성이 없으면 null이 반환됨
    const qnaId = row.getAttribute('data-qna-id');
    
    // ========= 문의 ID 존재 확인 및 이벤트 핸들러 생성 =========
    // 목적: 문의 ID가 있는 경우에만 클릭 이벤트 핸들러를 생성하고 연결
    //   - 안전성: 문의 ID가 없는 행은 이벤트 리스너를 연결하지 않음
    //   - 데이터 무결성: 유효한 문의 ID가 있는 경우에만 처리
    // 
    // if (qnaId): 문의 ID가 존재하는지 확인
    //   - qnaId: 문의 ID (문자열) 또는 null
    //   - truthy 값이면 true (문의 ID가 있음)
    //   - falsy 값(null)이면 false (문의 ID가 없음)
    //   - 목적: 문의 ID가 있는 경우에만 이벤트 핸들러 생성
    if (qnaId) {
      // ========= 클릭 이벤트 핸들러 함수 생성 =========
      // 목적: 행 클릭 시 실행될 이벤트 핸들러 함수 생성
      //   - 사용자 경험(UX) 개선: 행 클릭 시 해당 문의의 상세 페이지로 이동
      //   - 이벤트 충돌 방지: 체크박스나 체크박스 셀 클릭 시에는 행 클릭 이벤트가 발생하지 않도록 처리
      // 
      // row._clickHandler = function(e) {...}: 클릭 이벤트 핸들러 함수 생성 및 저장
      //   - _clickHandler: 행 요소에 저장될 이벤트 핸들러 함수 참조
      //     → 커스텀 속성으로 저장하여 나중에 제거할 수 있도록 함
      //   - function(e): 이벤트 핸들러 함수
      //     → e: 클릭 이벤트 객체 (Event 객체)
      //     → 이벤트 객체를 통해 클릭된 요소, 이벤트 타입 등을 확인할 수 있음
      //   - 목적: 행 클릭 시 goToQnaDetail 함수를 호출하여 문의 상세 페이지로 이동
      row._clickHandler = function(e) {
        // ========= 체크박스나 체크박스 셀 클릭 확인 =========
        // 목적: 클릭된 요소가 체크박스나 체크박스 셀인 경우 행 클릭 이벤트를 무시
        //   - 사용자 경험(UX) 개선: 체크박스나 체크박스 셀 클릭 시에는 행 클릭 이벤트가 발생하지 않도록 함
        //   - 이벤트 충돌 방지: 체크박스의 고유 기능이 정상적으로 동작하도록 함
        // 
        // if (e.target.type === 'checkbox' || e.target.closest('td:first-child')): 체크박스나 체크박스 셀 클릭 확인
        //   - e.target: 클릭 이벤트가 발생한 요소 (HTMLElement 객체)
        //   - e.target.type === 'checkbox': 클릭된 요소가 체크박스인지 확인
        //     → type: 요소의 type 속성
        //     → 'checkbox': 체크박스 타입
        //     → 목적: 체크박스를 직접 클릭한 경우를 감지
        //   - e.target.closest('td:first-child'): 클릭된 요소의 부모 요소 중 첫 번째 셀(td:first-child)이 있는지 확인
        //     → closest: 가장 가까운 부모 요소를 찾는 메서드
        //     → 'td:first-child': 첫 번째 자식인 <td> 요소
        //     → 목적: 체크박스 셀(첫 번째 셀)을 클릭한 경우를 감지
        //     → 예: <td class="checkbox-cell"><input type="checkbox"></td>에서 <td>를 클릭한 경우
        //   - ||: 논리 OR 연산자
        //     → 두 조건 중 하나라도 true이면 true 반환
        //   - 목적: 체크박스나 체크박스 셀 클릭 시 행 클릭 이벤트를 무시
        //   - 주의: 체크박스 셀의 자식 요소를 클릭한 경우도 포함됨
        if (e.target.type === 'checkbox' || e.target.closest('td:first-child')) {
          // ========= 이벤트 무시 =========
          // 목적: 체크박스나 체크박스 셀 클릭 시 행 클릭 이벤트를 무시하고 함수 종료
          //   - 사용자 경험(UX) 개선: 체크박스의 고유 기능이 정상적으로 동작하도록 함
          //   - 이벤트 충돌 방지: 행 클릭 이벤트가 체크박스 클릭을 방해하지 않도록 함
          // 
          // return: 함수를 즉시 종료
          //   - 목적: 행 클릭 이벤트 처리를 중단하고 함수 종료
          //   - 주의: 이후 코드는 실행되지 않음
          return;
        }
        
        // ========= 문의 상세 페이지로 이동 =========
        // 목적: goToQnaDetail 함수를 호출하여 문의 상세 페이지로 이동
        //   - 사용자 경험(UX) 개선: 행 클릭 시 해당 문의의 상세 정보를 확인할 수 있도록 함
        //   - 네비게이션: 문의 목록에서 문의 상세 페이지로 이동
        // 
        // goToQnaDetail(parseInt(qnaId)): 문의 상세 페이지로 이동 함수 호출
        //   - goToQnaDetail: 앞서 정의한 함수
        //   - parseInt(qnaId): 문의 ID를 숫자로 변환
        //     → parseInt: 문자열을 정수로 변환하는 함수
        //     → qnaId: 행 요소에서 추출한 문의 ID (문자열)
        //     → 예: "1" → 1, "2" → 2, "3" → 3
        //     → 목적: goToQnaDetail 함수에서 숫자 형태의 문의 ID를 사용
        //   - 반환값: 없음 (void)
        //   - 동작:
        //     1. 문의 ID를 사용하여 문의 상세 페이지 URL 생성
        //     2. 생성된 URL로 페이지 이동
        //   - 목적: 문의 상세 페이지로 이동
        goToQnaDetail(parseInt(qnaId));
      };
      
      // ========= 클릭 이벤트 리스너 연결 =========
      // 목적: 생성한 이벤트 핸들러 함수를 행 요소에 연결
      //   - 사용자 경험(UX) 개선: 행 클릭 시 이벤트 핸들러가 실행되어 문의 상세 페이지로 이동 기능 제공
      // 
      // row.addEventListener('click', row._clickHandler): 클릭 이벤트 리스너 연결
      //   - addEventListener: 이벤트 리스너를 추가하는 메서드
      //   - 'click': 이벤트 타입 (클릭 이벤트)
      //   - row._clickHandler: 이벤트 핸들러 함수
      //     → 앞서 생성한 이벤트 핸들러 함수 참조
      //     → _clickHandler 속성에 저장하여 나중에 제거할 수 있도록 함
      //   - 목적: 행 클릭 시 이벤트 핸들러가 실행되도록 연결
      //   - 주의: 같은 핸들러 함수를 여러 번 추가하면 중복 실행됨 (따라서 앞서 removeEventListener로 제거)
      row.addEventListener('click', row._clickHandler);
    }
    // 주의: qnaId가 null이면 이벤트 리스너를 연결하지 않음
  });
}

/**
 * 정렬 링크 이벤트 연결 함수
 * 
 * 목적: 테이블 헤더의 정렬 링크에 클릭 이벤트 리스너를 연결하여 정렬 기능 제공
 *   - 사용자 경험(UX) 개선: 정렬 링크 클릭 시 해당 필드로 정렬하여 데이터를 쉽게 정렬할 수 있도록 함
 *   - 동적 이벤트 관리: AJAX 페이지네이션 후 새로 로드된 정렬 링크에도 이벤트 리스너를 재연결
 *   - 정렬 상태 관리: 현재 정렬 필드와 정렬 방향을 확인하여 올바른 정렬 URL 생성
 * 
 * 동작 방식:
 *   1. 정렬 링크 요소들을 모두 찾기 (data-sort-field 속성을 가진 <a> 태그)
 *   2. 각 정렬 링크에 대해 기존 이벤트 리스너 제거 (중복 방지)
 *   3. 클릭 이벤트 핸들러 생성 및 연결
 *   4. 정렬 링크 클릭 시 정렬 필드, 현재 정렬 필드, 현재 정렬 방향 추출
 *   5. admin_common.js의 handleSortClick 함수를 호출하여 정렬 URL 생성 및 이동
 * 
 * 사용 시점:
 *   - 페이지 로드 시 (DOMContentLoaded 이벤트)
 *   - AJAX 페이지네이션 후 (handlePaginationAjax에서 호출)
 *   - 테이블 헤더가 동적으로 변경된 후
 * 
 * 관련 함수:
 *   - handleSortClick (admin_common.js): 정렬 URL 생성 및 페이지 이동 처리
 *   - getSortUrl (admin_common.js): 정렬 URL 생성 (handleSortClick 내부에서 호출)
 * 
 * @returns {void} 반환값 없음
 * 
 * @example
 * // 페이지 로드 시 자동 호출
 * attachSortListeners();
 * // 결과:
 * // 1. 모든 정렬 링크에 클릭 이벤트 리스너 연결
 * // 2. 정렬 링크 클릭 시 해당 필드로 정렬
 * // 3. 정렬 방향 토글 (오름차순 ↔ 내림차순)
 * // 4. 검색 파라미터 유지하면서 정렬
 */
function attachSortListeners() {
  // ========= 정렬 링크 요소 조회 =========
  // 목적: 테이블 헤더의 모든 정렬 링크를 찾기
  //   - 사용자 경험(UX) 개선: 모든 정렬 링크에 클릭 이벤트를 연결하여 정렬 기능 제공
  // 
  // document.querySelectorAll('a[data-sort-field]'): 정렬 링크 요소 찾기
  //   - 'a[data-sort-field]': CSS 선택자
  //     → a: <a> 태그 (링크 요소)
  //     → [data-sort-field]: data-sort-field 속성을 가진 요소
  //     → 두 조건을 모두 만족하는 요소만 선택
  //   - 반환값: NodeList 객체 (유사 배열)
  //     → 예: NodeList(5) [a, a, a, a, a]
  //     → forEach 메서드를 사용하여 각 링크를 순회할 수 있음
  //   - 목적: 테이블 헤더의 모든 정렬 링크를 찾아 이벤트 리스너를 연결
  //   - 주의: data-sort-field 속성이 없는 링크는 선택되지 않음
  //   - 예시 HTML:
  //     <a href="#" data-sort-field="title" data-current-sort="title" data-current-order="asc">제목</a>
  const sortLinks = document.querySelectorAll('a[data-sort-field]');
  
  // ========= 각 정렬 링크에 클릭 이벤트 리스너 연결 =========
  // 목적: 각 정렬 링크에 클릭 이벤트 리스너를 연결
  //   - 사용자 경험(UX) 개선: 정렬 링크 클릭 시 해당 필드로 정렬
  //   - 동적 이벤트 관리: AJAX 페이지네이션 후 새로 로드된 정렬 링크에도 이벤트 리스너를 재연결
  // 
  // sortLinks.forEach(link => {...}): 각 정렬 링크를 순회하며 이벤트 리스너 연결
  //   - forEach: 배열 또는 유사 배열의 각 요소를 순회하는 메서드
  //   - link: 현재 순회 중인 링크 요소 (HTMLAnchorElement 객체)
  //   - 화살표 함수: 각 링크에 대해 실행될 콜백 함수
  //   - 목적: 각 정렬 링크에 클릭 이벤트 리스너를 연결
  sortLinks.forEach(link => {
    // ========= 기존 이벤트 리스너 제거 =========
    // 목적: 중복 이벤트 리스너 방지를 위해 기존 리스너 제거
    //   - 메모리 누수 방지: 이벤트 리스너가 중복으로 등록되는 것을 방지
    //   - 동적 이벤트 관리: AJAX 페이지네이션 후 같은 링크에 다시 이벤트 리스너를 연결할 때 중복 방지
    // 
    // link.removeEventListener('click', link._sortHandler): 기존 클릭 이벤트 리스너 제거
    //   - removeEventListener: 이벤트 리스너를 제거하는 메서드
    //   - 'click': 제거할 이벤트 타입
    //   - link._sortHandler: 제거할 이벤트 핸들러 함수
    //     → _sortHandler: 링크 요소에 저장된 이벤트 핸들러 함수 참조
    //     → 커스텀 속성으로 저장하여 나중에 제거할 수 있도록 함
    //   - 목적: 기존 이벤트 리스너가 있으면 제거하여 중복 방지
    //   - 주의: _sortHandler가 없으면 에러가 발생하지 않음 (무시됨)
    link.removeEventListener('click', link._sortHandler);
    
    // ========= 클릭 이벤트 핸들러 함수 생성 =========
    // 목적: 정렬 링크 클릭 시 실행될 이벤트 핸들러 함수 생성
    //   - 사용자 경험(UX) 개선: 정렬 링크 클릭 시 해당 필드로 정렬하여 데이터를 쉽게 정렬할 수 있도록 함
    //   - 정렬 상태 관리: 현재 정렬 필드와 정렬 방향을 확인하여 올바른 정렬 URL 생성
    // 
    // link._sortHandler = function(e) {...}: 클릭 이벤트 핸들러 함수 생성 및 저장
    //   - _sortHandler: 링크 요소에 저장될 이벤트 핸들러 함수 참조
    //     → 커스텀 속성으로 저장하여 나중에 제거할 수 있도록 함
    //   - function(e): 이벤트 핸들러 함수
    //     → e: 클릭 이벤트 객체 (Event 객체)
    //     → 이벤트 객체를 통해 클릭된 요소, 이벤트 타입 등을 확인할 수 있음
    //   - 목적: 정렬 링크 클릭 시 handleSortClick 함수를 호출하여 정렬 처리
    link._sortHandler = function(e) {
      // ========= 이벤트 기본 동작 방지 =========
      // 목적: 링크의 기본 동작(페이지 이동)을 방지하여 AJAX 정렬 처리
      //   - 사용자 경험(UX) 개선: 페이지 새로고침 없이 정렬 처리
      //   - AJAX 처리: 페이지 이동 대신 JavaScript로 정렬 처리
      // 
      // e.preventDefault(): 이벤트의 기본 동작 방지
      //   - preventDefault: 이벤트의 기본 동작을 방지하는 메서드
      //   - <a> 태그의 기본 동작: href 속성에 지정된 URL로 페이지 이동
      //   - 목적: 링크 클릭 시 페이지 이동을 방지하고 JavaScript로 정렬 처리
      //   - 주의: preventDefault를 호출하지 않으면 링크의 기본 동작(페이지 이동)이 실행됨
      e.preventDefault();
      
      // ========= 정렬 필드 추출 =========
      // 목적: 링크 요소에서 정렬할 필드 이름을 추출
      //   - 데이터 추출: HTML data 속성에서 정렬 필드 이름을 읽어옴
      // 
      // link.getAttribute('data-sort-field'): data-sort-field 속성 값 읽기
      //   - getAttribute: 요소의 속성 값을 읽는 메서드
      //   - 'data-sort-field': 읽을 속성 이름
      //   - 반환값: 속성 값 (문자열) 또는 null (속성이 없으면)
      //     → 예: "title", "created_at", "user" 등
      //   - 목적: 정렬할 필드 이름을 추출하여 handleSortClick 함수에 전달
      //   - 주의: 속성이 없으면 null이 반환됨 (하지만 data-sort-field 속성이 있는 링크만 선택했으므로 null이 아닐 것)
      const sortField = link.getAttribute('data-sort-field');
      
      // ========= 현재 정렬 필드 추출 =========
      // 목적: 링크 요소에서 현재 정렬된 필드 이름을 추출
      //   - 정렬 상태 확인: 현재 어떤 필드로 정렬되어 있는지 확인
      //   - 정렬 방향 토글: 같은 필드를 클릭하면 정렬 방향을 토글하기 위함
      // 
      // link.getAttribute('data-current-sort') || '': data-current-sort 속성 값 읽기 (기본값: 빈 문자열)
      //   - getAttribute: 요소의 속성 값을 읽는 메서드
      //   - 'data-current-sort': 읽을 속성 이름
      //   - || '': 속성이 없거나 null이면 빈 문자열('')을 반환
      //   - 반환값: 속성 값 (문자열) 또는 빈 문자열('')
      //     → 예: "title", "created_at", "" 등
      //   - 목적: 현재 정렬된 필드 이름을 추출하여 handleSortClick 함수에 전달
      //   - 주의: 속성이 없으면 빈 문자열이 반환됨 (정렬되지 않은 상태)
      const currentSort = link.getAttribute('data-current-sort') || '';
      
      // ========= 현재 정렬 방향 추출 =========
      // 목적: 링크 요소에서 현재 정렬 방향을 추출
      //   - 정렬 방향 확인: 현재 오름차순(asc)인지 내림차순(desc)인지 확인
      //   - 정렬 방향 토글: 같은 필드를 클릭하면 정렬 방향을 토글하기 위함
      // 
      // link.getAttribute('data-current-order') || 'asc': data-current-order 속성 값 읽기 (기본값: 'asc')
      //   - getAttribute: 요소의 속성 값을 읽는 메서드
      //   - 'data-current-order': 읽을 속성 이름
      //   - || 'asc': 속성이 없거나 null이면 'asc'를 반환
      //   - 반환값: 속성 값 (문자열) 또는 'asc'
      //     → 예: "asc", "desc", "asc" (기본값) 등
      //   - 목적: 현재 정렬 방향을 추출하여 handleSortClick 함수에 전달
      //   - 주의: 속성이 없으면 'asc'가 반환됨 (기본값: 오름차순)
      //   - 참고: 문의 목록은 기본적으로 오름차순 정렬을 사용
      const currentOrder = link.getAttribute('data-current-order') || 'asc';
      
      // ========= 정렬 처리 함수 호출 =========
      // 목적: admin_common.js의 handleSortClick 함수를 호출하여 정렬 URL 생성 및 페이지 이동
      //   - 사용자 경험(UX) 개선: 정렬 링크 클릭 시 해당 필드로 정렬하여 데이터를 쉽게 정렬할 수 있도록 함
      //   - 정렬 상태 관리: 현재 정렬 필드와 정렬 방향을 확인하여 올바른 정렬 URL 생성
      //   - 검색 파라미터 유지: 정렬 시 검색 조건을 유지하여 사용자 경험 개선
      // 
      // handleSortClick(sortField, currentSort, currentOrder): 정렬 처리 함수 호출
      //   - handleSortClick: admin_common.js에 정의된 정렬 처리 함수
      //   - sortField: 정렬할 필드 이름 (문자열)
      //     → 예: "title", "created_at", "user" 등
      //     → 링크 요소에서 추출한 정렬 필드 이름
      //   - currentSort: 현재 정렬된 필드 이름 (문자열)
      //     → 예: "title", "created_at", "" 등
      //     → 링크 요소에서 추출한 현재 정렬 필드 이름
      //     → 같은 필드를 클릭하면 정렬 방향을 토글하기 위해 사용
      //   - currentOrder: 현재 정렬 방향 (문자열)
      //     → 예: "asc", "desc" 등
      //     → 링크 요소에서 추출한 현재 정렬 방향
      //     → 같은 필드를 클릭하면 정렬 방향을 토글하기 위해 사용
      //   - 반환값: 없음 (void)
      //   - 동작:
      //     1. getSortUrl 함수를 호출하여 정렬 URL 생성
      //     2. 같은 필드를 클릭하면 정렬 방향을 토글 (asc ↔ desc)
      //     3. 다른 필드를 클릭하면 해당 필드로 오름차순 정렬
      //     4. 검색 파라미터를 유지하면서 정렬 URL 생성
      //     5. 생성된 URL로 페이지 이동 (window.location.href)
      //   - 목적: 정렬 처리 및 페이지 이동
      //   - 주의: admin_common.js가 로드되어 있어야 함
      handleSortClick(sortField, currentSort, currentOrder);
    };
    
    // ========= 클릭 이벤트 리스너 연결 =========
    // 목적: 생성한 이벤트 핸들러 함수를 링크 요소에 연결
    //   - 사용자 경험(UX) 개선: 정렬 링크 클릭 시 이벤트 핸들러가 실행되어 정렬 기능 제공
    // 
    // link.addEventListener('click', link._sortHandler): 클릭 이벤트 리스너 연결
    //   - addEventListener: 이벤트 리스너를 추가하는 메서드
    //   - 'click': 이벤트 타입 (클릭 이벤트)
    //   - link._sortHandler: 이벤트 핸들러 함수
    //     → 앞서 생성한 이벤트 핸들러 함수 참조
    //     → _sortHandler 속성에 저장하여 나중에 제거할 수 있도록 함
    //   - 목적: 정렬 링크 클릭 시 이벤트 핸들러가 실행되도록 연결
    //   - 주의: 같은 핸들러 함수를 여러 번 추가하면 중복 실행됨 (따라서 앞서 removeEventListener로 제거)
    link.addEventListener('click', link._sortHandler);
  });
}

/**
 * 체크박스 체크 상태에 따라 행 클래스 업데이트 함수
 * 
 * 목적: 체크박스의 체크 상태에 따라 해당 행의 CSS 클래스를 추가하거나 제거하여 시각적 피드백 제공
 *   - 사용자 경험(UX) 개선: 선택된 행을 시각적으로 구분하여 표시
 *   - 시각적 피드백: 'checkbox-checked' 클래스를 추가/제거하여 선택 상태를 표시
 *   - CSS 스타일링: CSS를 사용하여 선택된 행을 스타일링할 수 있도록 함
 * 
 * 동작 방식:
 *   1. 체크박스의 부모 행 요소 찾기 (closest('tr'))
 *   2. 행 요소가 존재하는지 확인
 *   3. 체크박스가 체크되어 있으면 행에 'checkbox-checked' 클래스 추가
 *   4. 체크박스가 체크 해제되어 있으면 행에서 'checkbox-checked' 클래스 제거
 * 
 * 사용 시점:
 *   - 체크박스 상태 변경 시 (attachCheckboxListeners에서 호출)
 *   - '전체 선택' 체크박스 클릭 시 (toggleSelectAllQna에서 호출)
 *   - 체크박스 이벤트 리스너 연결 시 (초기 상태 설정)
 * 
 * 관련 함수:
 *   - attachCheckboxListeners: 체크박스 이벤트 리스너 연결
 *   - toggleSelectAllQna: '전체 선택' 체크박스 상태에 따라 모든 체크박스 선택/해제
 * 
 * @param {HTMLInputElement} checkbox - 상태를 확인할 체크박스 요소
 *   - 체크박스 요소 (HTMLInputElement 객체)
 *   - type 속성이 "checkbox"인 <input> 요소
 *   - 예: <input type="checkbox" name="qna_checkbox" value="1">
 * 
 * @returns {void} 반환값 없음
 * 
 * @example
 * // 체크박스 상태 변경 시 자동 호출
 * updateRowCheckboxClass(checkbox);
 * // 결과:
 * // 1. 체크박스가 체크되어 있으면 행에 'checkbox-checked' 클래스 추가
 * // 2. 체크박스가 체크 해제되어 있으면 행에서 'checkbox-checked' 클래스 제거
 */
function updateRowCheckboxClass(checkbox) {
  // ========= 체크박스의 부모 행 요소 찾기 =========
  // 목적: 체크박스가 속한 테이블 행 요소를 찾아서 CSS 클래스를 업데이트
  //   - DOM 탐색: 체크박스의 부모 요소 중 가장 가까운 <tr> 요소를 찾기
  // 
  // checkbox.closest('tr'): 체크박스의 부모 요소 중 가장 가까운 <tr> 요소 찾기
  //   - closest: 현재 요소부터 시작하여 부모 요소를 거슬러 올라가며 지정된 선택자와 일치하는 가장 가까운 요소를 찾는 메서드
  //   - 'tr': 찾을 요소의 선택자 (<tr> 태그)
  //   - 반환값: HTMLElement 객체 (HTMLTableRowElement) 또는 null (요소가 없으면)
  //     → 예: <tr class="qna-row">...</tr>
  //   - 목적: 체크박스가 속한 테이블 행 요소를 찾아서 CSS 클래스를 업데이트
  //   - 주의: <tr> 요소가 없으면 null이 반환됨
  const row = checkbox.closest('tr');
  
  // ========= 행 요소 존재 확인 및 CSS 클래스 업데이트 =========
  // 목적: 행 요소가 존재하는 경우에만 CSS 클래스를 업데이트
  //   - 안전성: 행 요소가 없으면 에러 발생 방지
  //   - 데이터 무결성: 유효한 행 요소가 있는 경우에만 처리
  // 
  // if (row): 행 요소가 존재하는지 확인
  //   - row: 행 요소 (HTMLTableRowElement 객체) 또는 null
  //   - truthy 값이면 true (행 요소가 존재함)
  //   - falsy 값(null)이면 false (행 요소가 없음)
  //   - 목적: 행 요소가 있는 경우에만 CSS 클래스 업데이트
  if (row) {
    // ========= 체크박스 상태 확인 및 CSS 클래스 업데이트 =========
    // 목적: 체크박스의 체크 상태에 따라 행의 CSS 클래스를 추가하거나 제거
    //   - 사용자 경험(UX) 개선: 선택된 행을 시각적으로 구분하여 표시
    //   - 시각적 피드백: 'checkbox-checked' 클래스를 추가/제거하여 선택 상태를 표시
    // 
    // if (checkbox.checked): 체크박스가 체크되어 있는지 확인
    //   - checkbox.checked: 체크박스의 checked 속성 (boolean)
    //     → true: 체크됨
    //     → false: 체크 해제됨
    //   - 목적: 체크박스 상태에 따라 다른 동작 수행
    if (checkbox.checked) {
      // ========= 'checkbox-checked' 클래스 추가 =========
      // 목적: 체크박스가 체크되어 있으면 행에 'checkbox-checked' 클래스를 추가하여 시각적으로 표시
      //   - 사용자 경험(UX) 개선: 선택된 행을 시각적으로 구분하여 표시
      //   - CSS 스타일링: CSS를 사용하여 선택된 행을 스타일링할 수 있도록 함
      // 
      // row.classList.add('checkbox-checked'): 'checkbox-checked' 클래스 추가
      //   - classList: 요소의 클래스 목록을 조작하는 객체
      //   - add: 클래스를 추가하는 메서드
      //   - 'checkbox-checked': 추가할 클래스 이름
      //   - 목적: 선택된 행에 'checkbox-checked' 클래스를 추가하여 CSS로 스타일링
      //   - 주의: 이미 'checkbox-checked' 클래스가 있으면 중복 추가되지 않음
      row.classList.add('checkbox-checked');
    } else {
      // ========= 'checkbox-checked' 클래스 제거 =========
      // 목적: 체크박스가 체크 해제되어 있으면 행에서 'checkbox-checked' 클래스를 제거
      //   - 사용자 경험(UX) 개선: 선택 해제된 행의 시각적 표시를 제거
      //   - CSS 스타일링: 선택 해제된 행의 스타일을 기본 상태로 복원
      // 
      // row.classList.remove('checkbox-checked'): 'checkbox-checked' 클래스 제거
      //   - classList: 요소의 클래스 목록을 조작하는 객체
      //   - remove: 클래스를 제거하는 메서드
      //   - 'checkbox-checked': 제거할 클래스 이름
      //   - 목적: 선택 해제된 행에서 'checkbox-checked' 클래스를 제거하여 기본 스타일로 복원
      //   - 주의: 'checkbox-checked' 클래스가 없으면 에러가 발생하지 않음 (무시됨)
      row.classList.remove('checkbox-checked');
    }
  }
  // 주의: row가 null이면 CSS 클래스를 업데이트하지 않음
}

/**
 * 체크박스 이벤트 연결 함수
 * 
 * 목적: 모든 체크박스(전체 선택 및 개별 체크박스)에 이벤트 리스너를 연결하여 체크박스 기능 제공
 *   - 사용자 경험(UX) 개선: 체크박스 클릭 시 선택 상태를 업데이트하고 시각적 피드백 제공
 *   - 동적 이벤트 관리: AJAX 페이지네이션 후 새로 로드된 체크박스에도 이벤트 리스너를 재연결
 *   - 이벤트 충돌 방지: 체크박스 셀 클릭 시 이벤트 전파를 방지하여 행 클릭 이벤트와 충돌 방지
 * 
 * 동작 방식:
 *   1. '전체 선택' 체크박스 요소 찾기
 *   2. '전체 선택' 체크박스에 change 이벤트 리스너 연결
 *   3. 모든 개별 문의 체크박스 요소 찾기
 *   4. 각 개별 체크박스의 초기 상태 설정 (updateRowCheckboxClass)
 *   5. 각 개별 체크박스에 change 이벤트 리스너 연결
 *   6. 체크박스 셀에 클릭 이벤트 리스너 연결하여 이벤트 전파 방지
 * 
 * 사용 시점:
 *   - 페이지 로드 시 (DOMContentLoaded 이벤트)
 *   - AJAX 페이지네이션 후 (handlePaginationAjax에서 호출)
 *   - 테이블 내용이 동적으로 변경된 후
 * 
 * 관련 함수:
 *   - toggleSelectAllQna: '전체 선택' 체크박스 상태에 따라 모든 체크박스 선택/해제
 *   - updateRowCheckboxClass: 체크박스 상태에 따라 행의 CSS 클래스 업데이트
 *   - updateSelectedQnas: 선택된 문의 ID 목록 업데이트
 * 
 * @returns {void} 반환값 없음
 * 
 * @example
 * // 페이지 로드 시 자동 호출
 * attachCheckboxListeners();
 * // 결과:
 * // 1. '전체 선택' 체크박스에 이벤트 리스너 연결
 * // 2. 모든 개별 체크박스에 이벤트 리스너 연결
 * // 3. 체크박스 셀에 이벤트 전파 방지 리스너 연결
 */
function attachCheckboxListeners() {
  // ========= '전체 선택' 체크박스 이벤트 연결 =========
  // 목적: '전체 선택' 체크박스에 change 이벤트 리스너를 연결하여 모든 체크박스를 일괄 선택/해제
  //   - 사용자 경험(UX) 개선: 한 번의 클릭으로 모든 문의를 선택하거나 해제할 수 있도록 함
  // 
  // const selectAllCheckbox = document.getElementById('selectAll'): '전체 선택' 체크박스 요소 찾기
  //   - getElementById: ID로 요소를 찾는 메서드
  //   - 'selectAll': '전체 선택' 체크박스의 ID 속성
  //   - 반환값: HTMLElement 객체 (HTMLInputElement) 또는 null (요소가 없으면)
  //     → 예: <input type="checkbox" id="selectAll">
  //   - 목적: '전체 선택' 체크박스 요소를 찾아서 이벤트 리스너를 연결
  //   - 주의: 요소가 없으면 null이 반환됨
  const selectAllCheckbox = document.getElementById('selectAll');
  
  // ========= '전체 선택' 체크박스 존재 확인 및 이벤트 리스너 연결 =========
  // 목적: '전체 선택' 체크박스가 존재하는 경우에만 이벤트 리스너를 연결
  //   - 안전성: 체크박스가 없으면 에러 발생 방지
  //   - 사용자 경험(UX) 개선: '전체 선택' 체크박스 클릭 시 모든 체크박스를 일괄 선택/해제
  // 
  // if (selectAllCheckbox): '전체 선택' 체크박스가 존재하는지 확인
  //   - selectAllCheckbox: 체크박스 요소 (HTMLInputElement 객체) 또는 null
  //   - truthy 값이면 true (체크박스가 존재함)
  //   - falsy 값(null)이면 false (체크박스가 없음)
  //   - 목적: 체크박스가 있는 경우에만 이벤트 리스너 연결
  if (selectAllCheckbox) {
    // ========= 기존 이벤트 리스너 제거 =========
    // 목적: 중복 이벤트 리스너 방지를 위해 기존 리스너 제거
    //   - 메모리 누수 방지: 이벤트 리스너가 중복으로 등록되는 것을 방지
    //   - 동적 이벤트 관리: AJAX 페이지네이션 후 같은 체크박스에 다시 이벤트 리스너를 연결할 때 중복 방지
    // 
    // selectAllCheckbox.removeEventListener('change', selectAllCheckbox._changeHandler): 기존 change 이벤트 리스너 제거
    //   - removeEventListener: 이벤트 리스너를 제거하는 메서드
    //   - 'change': 제거할 이벤트 타입
    //   - selectAllCheckbox._changeHandler: 제거할 이벤트 핸들러 함수
    //     → _changeHandler: 체크박스 요소에 저장된 이벤트 핸들러 함수 참조
    //     → 커스텀 속성으로 저장하여 나중에 제거할 수 있도록 함
    //   - 목적: 기존 이벤트 리스너가 있으면 제거하여 중복 방지
    //   - 주의: _changeHandler가 없으면 에러가 발생하지 않음 (무시됨)
    selectAllCheckbox.removeEventListener('change', selectAllCheckbox._changeHandler);
    
    // ========= change 이벤트 핸들러 함수 생성 =========
    // 목적: '전체 선택' 체크박스 상태 변경 시 실행될 이벤트 핸들러 함수 생성
    //   - 사용자 경험(UX) 개선: '전체 선택' 체크박스 클릭 시 모든 체크박스를 일괄 선택/해제
    // 
    // selectAllCheckbox._changeHandler = function() {...}: change 이벤트 핸들러 함수 생성 및 저장
    //   - _changeHandler: 체크박스 요소에 저장될 이벤트 핸들러 함수 참조
    //     → 커스텀 속성으로 저장하여 나중에 제거할 수 있도록 함
    //   - function(): 이벤트 핸들러 함수
    //     → change 이벤트는 이벤트 객체를 파라미터로 받지 않아도 됨
    //   - 목적: '전체 선택' 체크박스 상태 변경 시 toggleSelectAllQna 함수를 호출
    selectAllCheckbox._changeHandler = function() {
      // ========= '전체 선택' 체크박스 상태에 따라 모든 체크박스 선택/해제 =========
      // 목적: '전체 선택' 체크박스 상태에 따라 모든 개별 체크박스를 선택하거나 해제
      //   - 사용자 경험(UX) 개선: 한 번의 클릭으로 모든 문의를 선택하거나 해제할 수 있도록 함
      // 
      // toggleSelectAllQna(): '전체 선택' 체크박스 상태에 따라 모든 체크박스 선택/해제 함수 호출
      //   - toggleSelectAllQna: 앞서 정의한 함수
      //   - 반환값: 없음 (void)
      //   - 동작:
      //     1. '전체 선택' 체크박스의 상태를 확인
      //     2. 모든 개별 체크박스의 상태를 '전체 선택' 체크박스와 동기화
      //     3. 각 체크박스에 대해 행의 CSS 클래스 업데이트
      //     4. 선택된 문의 ID 목록 업데이트
      //   - 목적: '전체 선택' 체크박스 상태에 따라 모든 체크박스를 일괄 선택/해제
      toggleSelectAllQna();
    };
    
    // ========= change 이벤트 리스너 연결 =========
    // 목적: 생성한 이벤트 핸들러 함수를 '전체 선택' 체크박스에 연결
    //   - 사용자 경험(UX) 개선: '전체 선택' 체크박스 클릭 시 이벤트 핸들러가 실행되어 모든 체크박스를 일괄 선택/해제
    // 
    // selectAllCheckbox.addEventListener('change', selectAllCheckbox._changeHandler): change 이벤트 리스너 연결
    //   - addEventListener: 이벤트 리스너를 추가하는 메서드
    //   - 'change': 이벤트 타입 (체크박스 상태 변경 이벤트)
    //   - selectAllCheckbox._changeHandler: 이벤트 핸들러 함수
    //     → 앞서 생성한 이벤트 핸들러 함수 참조
    //     → _changeHandler 속성에 저장하여 나중에 제거할 수 있도록 함
    //   - 목적: '전체 선택' 체크박스 상태 변경 시 이벤트 핸들러가 실행되도록 연결
    //   - 주의: 같은 핸들러 함수를 여러 번 추가하면 중복 실행됨 (따라서 앞서 removeEventListener로 제거)
    selectAllCheckbox.addEventListener('change', selectAllCheckbox._changeHandler);
  }
  
  // ========= 모든 개별 문의 체크박스 요소 조회 =========
  // 목적: 모든 개별 문의 체크박스 요소를 찾아서 이벤트 리스너를 연결
  //   - 사용자 경험(UX) 개선: 각 체크박스 클릭 시 선택 상태를 업데이트하고 시각적 피드백 제공
  // 
  // document.querySelectorAll('input[name="qna_checkbox"]'): 모든 개별 문의 체크박스 찾기
  //   - querySelectorAll: CSS 선택자로 모든 요소를 찾는 메서드
  //   - 'input[name="qna_checkbox"]': CSS 선택자
  //     → input: <input> 태그
  //     → [name="qna_checkbox"]: name 속성이 "qna_checkbox"인 요소
  //     → 두 조건을 모두 만족하는 요소만 선택
  //   - 반환값: NodeList 객체 (유사 배열)
  //     → 예: NodeList(10) [input, input, input, ...]
  //     → forEach 메서드를 사용하여 각 체크박스를 순회할 수 있음
  //   - 목적: 모든 개별 문의 체크박스를 찾아서 이벤트 리스너를 연결
  //   - 주의: name 속성이 "qna_checkbox"인 체크박스만 선택됨
  const checkboxes = document.querySelectorAll('input[name="qna_checkbox"]');
  
  // ========= 각 개별 체크박스에 이벤트 리스너 연결 =========
  // 목적: 각 개별 문의 체크박스에 change 이벤트 리스너를 연결
  //   - 사용자 경험(UX) 개선: 체크박스 클릭 시 선택 상태를 업데이트하고 시각적 피드백 제공
  //   - 동적 이벤트 관리: AJAX 페이지네이션 후 새로 로드된 체크박스에도 이벤트 리스너를 재연결
  // 
  // checkboxes.forEach(checkbox => {...}): 각 개별 체크박스를 순회하며 이벤트 리스너 연결
  //   - forEach: 배열 또는 유사 배열의 각 요소를 순회하는 메서드
  //   - checkbox: 현재 순회 중인 체크박스 요소 (HTMLInputElement 객체)
  //   - 화살표 함수: 각 체크박스에 대해 실행될 콜백 함수
  //   - 목적: 각 개별 체크박스에 change 이벤트 리스너를 연결
  checkboxes.forEach(checkbox => {
    // ========= 초기 상태 설정 =========
    // 목적: 체크박스의 현재 상태에 따라 행의 CSS 클래스를 초기화
    //   - 사용자 경험(UX) 개선: 페이지 로드 시 또는 AJAX 페이지네이션 후 체크박스 상태를 시각적으로 표시
    //   - 상태 동기화: 체크박스의 실제 상태와 시각적 표시를 동기화
    // 
    // updateRowCheckboxClass(checkbox): 체크박스 상태에 따라 행의 CSS 클래스 업데이트 함수 호출
    //   - updateRowCheckboxClass: 앞서 정의한 함수
    //   - checkbox: 현재 순회 중인 체크박스 요소
    //   - 반환값: 없음 (void)
    //   - 동작: 체크박스의 현재 상태에 따라 행에 'checkbox-checked' 클래스를 추가하거나 제거
    //   - 목적: 체크박스의 초기 상태를 시각적으로 표시
    updateRowCheckboxClass(checkbox);
    
    // ========= 기존 이벤트 리스너 제거 =========
    // 목적: 중복 이벤트 리스너 방지를 위해 기존 리스너 제거
    //   - 메모리 누수 방지: 이벤트 리스너가 중복으로 등록되는 것을 방지
    //   - 동적 이벤트 관리: AJAX 페이지네이션 후 같은 체크박스에 다시 이벤트 리스너를 연결할 때 중복 방지
    // 
    // checkbox.removeEventListener('change', checkbox._changeHandler): 기존 change 이벤트 리스너 제거
    //   - removeEventListener: 이벤트 리스너를 제거하는 메서드
    //   - 'change': 제거할 이벤트 타입
    //   - checkbox._changeHandler: 제거할 이벤트 핸들러 함수
    //     → _changeHandler: 체크박스 요소에 저장된 이벤트 핸들러 함수 참조
    //     → 커스텀 속성으로 저장하여 나중에 제거할 수 있도록 함
    //   - 목적: 기존 이벤트 리스너가 있으면 제거하여 중복 방지
    //   - 주의: _changeHandler가 없으면 에러가 발생하지 않음 (무시됨)
    checkbox.removeEventListener('change', checkbox._changeHandler);
    
    // ========= change 이벤트 핸들러 함수 생성 =========
    // 목적: 개별 체크박스 상태 변경 시 실행될 이벤트 핸들러 함수 생성
    //   - 사용자 경험(UX) 개선: 체크박스 클릭 시 선택 상태를 업데이트하고 시각적 피드백 제공
    // 
    // checkbox._changeHandler = function() {...}: change 이벤트 핸들러 함수 생성 및 저장
    //   - _changeHandler: 체크박스 요소에 저장될 이벤트 핸들러 함수 참조
    //     → 커스텀 속성으로 저장하여 나중에 제거할 수 있도록 함
    //   - function(): 이벤트 핸들러 함수
    //     → change 이벤트는 이벤트 객체를 파라미터로 받지 않아도 됨
    //   - 목적: 개별 체크박스 상태 변경 시 행의 CSS 클래스를 업데이트하고 선택된 문의 ID 목록을 업데이트
    checkbox._changeHandler = function() {
      // ========= 행의 CSS 클래스 업데이트 =========
      // 목적: 체크박스 상태에 따라 행의 CSS 클래스를 업데이트하여 시각적 피드백 제공
      //   - 사용자 경험(UX) 개선: 선택된 행을 시각적으로 구분하여 표시
      // 
      // updateRowCheckboxClass(checkbox): 체크박스 상태에 따라 행의 CSS 클래스 업데이트 함수 호출
      //   - updateRowCheckboxClass: 앞서 정의한 함수
      //   - checkbox: 현재 순회 중인 체크박스 요소
      //   - 반환값: 없음 (void)
      //   - 동작: 체크박스의 현재 상태에 따라 행에 'checkbox-checked' 클래스를 추가하거나 제거
      //   - 목적: 체크박스 상태 변경 시 행의 시각적 표시를 업데이트
      updateRowCheckboxClass(checkbox);
      
      // ========= 선택된 문의 ID 목록 업데이트 =========
      // 목적: 선택된 문의 ID 목록을 업데이트하여 폼 제출 시 사용할 수 있도록 함
      //   - 사용자 경험(UX) 개선: 선택된 문의 ID를 저장하여 일괄 삭제 등에 사용
      // 
      // updateSelectedQnas(): 선택된 문의 ID 목록 업데이트 함수 호출
      //   - updateSelectedQnas: 앞서 정의한 함수
      //   - 반환값: 없음 (void)
      //   - 동작:
      //     1. 선택된 체크박스의 ID를 배열로 수집
      //     2. 선택된 문의 ID 배열을 쉼표로 구분된 문자열로 변환
      //     3. 숨겨진 입력 필드에 선택된 문의 ID 문자열 저장
      //     4. '전체 선택' 체크박스 상태 업데이트
      //   - 목적: 체크박스 상태 변경 시 선택된 문의 ID 목록을 업데이트
      updateSelectedQnas();
    };
    
    // ========= change 이벤트 리스너 연결 =========
    // 목적: 생성한 이벤트 핸들러 함수를 개별 체크박스에 연결
    //   - 사용자 경험(UX) 개선: 체크박스 클릭 시 이벤트 핸들러가 실행되어 선택 상태를 업데이트
    // 
    // checkbox.addEventListener('change', checkbox._changeHandler): change 이벤트 리스너 연결
    //   - addEventListener: 이벤트 리스너를 추가하는 메서드
    //   - 'change': 이벤트 타입 (체크박스 상태 변경 이벤트)
    //   - checkbox._changeHandler: 이벤트 핸들러 함수
    //     → 앞서 생성한 이벤트 핸들러 함수 참조
    //     → _changeHandler 속성에 저장하여 나중에 제거할 수 있도록 함
    //   - 목적: 체크박스 상태 변경 시 이벤트 핸들러가 실행되도록 연결
    //   - 주의: 같은 핸들러 함수를 여러 번 추가하면 중복 실행됨 (따라서 앞서 removeEventListener로 제거)
    checkbox.addEventListener('change', checkbox._changeHandler);
  });
  
  // ========= 체크박스 셀 클릭 시 이벤트 전파 방지 =========
  // 목적: 체크박스 셀 클릭 시 이벤트가 부모 요소(행)로 전파되는 것을 방지하여 행 클릭 이벤트와 충돌 방지
  //   - 사용자 경험(UX) 개선: 체크박스 셀 클릭 시에는 행 클릭 이벤트가 발생하지 않도록 함
  //   - 이벤트 충돌 방지: 체크박스 셀 클릭과 행 클릭 이벤트가 충돌하지 않도록 함
  // 
  // const checkboxCells = document.querySelectorAll('.checkbox-cell'): 체크박스 셀 요소 찾기
  //   - querySelectorAll: CSS 선택자로 모든 요소를 찾는 메서드
  //   - '.checkbox-cell': CSS 선택자 (checkbox-cell 클래스를 가진 요소)
  //   - 반환값: NodeList 객체 (유사 배열)
  //     → 예: NodeList(10) [td.checkbox-cell, td.checkbox-cell, ...]
  //     → forEach 메서드를 사용하여 각 셀을 순회할 수 있음
  //   - 목적: 체크박스 셀 요소를 찾아서 이벤트 전파 방지 리스너를 연결
  //   - 주의: checkbox-cell 클래스를 가진 셀만 선택됨
  const checkboxCells = document.querySelectorAll('.checkbox-cell');
  
  // ========= 각 체크박스 셀에 이벤트 전파 방지 리스너 연결 =========
  // 목적: 각 체크박스 셀에 클릭 이벤트 리스너를 연결하여 이벤트 전파를 방지
  //   - 사용자 경험(UX) 개선: 체크박스 셀 클릭 시에는 행 클릭 이벤트가 발생하지 않도록 함
  //   - 이벤트 충돌 방지: 체크박스 셀 클릭과 행 클릭 이벤트가 충돌하지 않도록 함
  // 
  // checkboxCells.forEach(cell => {...}): 각 체크박스 셀을 순회하며 이벤트 리스너 연결
  //   - forEach: 배열 또는 유사 배열의 각 요소를 순회하는 메서드
  //   - cell: 현재 순회 중인 셀 요소 (HTMLTableCellElement 객체)
  //   - 화살표 함수: 각 셀에 대해 실행될 콜백 함수
  //   - 목적: 각 체크박스 셀에 클릭 이벤트 리스너를 연결하여 이벤트 전파 방지
  checkboxCells.forEach(cell => {
    // ========= 클릭 이벤트 리스너 연결 =========
    // 목적: 체크박스 셀 클릭 시 이벤트 전파를 방지하여 행 클릭 이벤트와 충돌 방지
    //   - 사용자 경험(UX) 개선: 체크박스 셀 클릭 시에는 행 클릭 이벤트가 발생하지 않도록 함
    // 
    // cell.addEventListener('click', function(e) {...}): 클릭 이벤트 리스너 연결
    //   - addEventListener: 이벤트 리스너를 추가하는 메서드
    //   - 'click': 이벤트 타입 (클릭 이벤트)
    //   - function(e): 이벤트 핸들러 함수
    //     → e: 클릭 이벤트 객체 (Event 객체)
    //   - 목적: 체크박스 셀 클릭 시 이벤트 전파를 방지
    cell.addEventListener('click', function(e) {
      // ========= 이벤트 전파 방지 =========
      // 목적: 이벤트가 부모 요소(행)로 전파되는 것을 방지하여 행 클릭 이벤트와 충돌 방지
      //   - 사용자 경험(UX) 개선: 체크박스 셀 클릭 시에는 행 클릭 이벤트가 발생하지 않도록 함
      //   - 이벤트 충돌 방지: 체크박스 셀 클릭과 행 클릭 이벤트가 충돌하지 않도록 함
      // 
      // e.stopPropagation(): 이벤트 전파 방지
      //   - stopPropagation: 이벤트가 부모 요소로 전파되는 것을 방지하는 메서드
      //   - 예: <td> 클릭 시 <tr>로 이벤트가 전파되는 것을 방지
      //   - 목적: 체크박스 셀 클릭 시 이벤트가 부모 요소(행)로 전파되어 행 클릭 이벤트가 발생하는 것을 방지
      //   - 주의: 이벤트 캡처링 단계에서는 영향을 주지 않음
      e.stopPropagation();
    });
  });
}

/**
 * 삭제 버튼 이벤트 연결 함수
 * 
 * 목적: 삭제 버튼에 클릭 이벤트 리스너를 연결하여 선택된 문의 삭제 기능 제공
 *   - 사용자 경험(UX) 개선: 삭제 버튼 클릭 시 선택된 문의를 삭제할 수 있도록 함
 *   - 이벤트 연결: 삭제 버튼에 클릭 이벤트 리스너를 연결하여 deleteSelected 함수 호출
 * 
 * 동작 방식:
 *   1. 삭제 버튼 요소 찾기
 *   2. 삭제 버튼이 존재하는지 확인
 *   3. 삭제 버튼에 클릭 이벤트 리스너 연결
 *   4. 클릭 시 deleteSelected 함수 호출
 * 
 * 사용 시점:
 *   - 페이지 로드 시 (DOMContentLoaded 이벤트)
 *   - AJAX 페이지네이션 후 (handlePaginationAjax에서 호출)
 *   - 삭제 버튼이 동적으로 추가된 후
 * 
 * 관련 함수:
 *   - deleteSelected: 선택된 문의 삭제 처리
 * 
 * @returns {void} 반환값 없음
 * 
 * @example
 * // 페이지 로드 시 자동 호출
 * attachButtonListeners();
 * // 결과:
 * // 1. 삭제 버튼에 클릭 이벤트 리스너 연결
 * // 2. 삭제 버튼 클릭 시 선택된 문의 삭제 처리
 */
function attachButtonListeners() {
  // ========= 삭제 버튼 요소 조회 =========
  // 목적: 삭제 버튼 요소를 찾아서 이벤트 리스너를 연결
  //   - 사용자 경험(UX) 개선: 삭제 버튼 클릭 시 선택된 문의를 삭제할 수 있도록 함
  // 
  // document.getElementById('deleteSelectedBtn'): 삭제 버튼 요소 찾기
  //   - getElementById: ID로 요소를 찾는 메서드
  //   - 'deleteSelectedBtn': 삭제 버튼의 ID 속성
  //   - 반환값: HTMLElement 객체 (HTMLButtonElement) 또는 null (요소가 없으면)
  //     → 예: <button id="deleteSelectedBtn" type="button">삭제</button>
  //   - 목적: 삭제 버튼 요소를 찾아서 이벤트 리스너를 연결
  //   - 주의: 요소가 없으면 null이 반환됨
  const deleteBtn = document.getElementById('deleteSelectedBtn');
  
  // ========= 삭제 버튼 존재 확인 및 이벤트 리스너 연결 =========
  // 목적: 삭제 버튼이 존재하는 경우에만 이벤트 리스너를 연결
  //   - 안전성: 버튼이 없으면 에러 발생 방지
  //   - 사용자 경험(UX) 개선: 삭제 버튼 클릭 시 선택된 문의를 삭제할 수 있도록 함
  // 
  // if (deleteBtn): 삭제 버튼이 존재하는지 확인
  //   - deleteBtn: 버튼 요소 (HTMLButtonElement 객체) 또는 null
  //   - truthy 값이면 true (버튼이 존재함)
  //   - falsy 값(null)이면 false (버튼이 없음)
  //   - 목적: 버튼이 있는 경우에만 이벤트 리스너 연결
  if (deleteBtn) {
    // ========= 클릭 이벤트 리스너 연결 =========
    // 목적: 삭제 버튼 클릭 시 deleteSelected 함수를 호출하여 선택된 문의 삭제 처리
    //   - 사용자 경험(UX) 개선: 삭제 버튼 클릭 시 선택된 문의를 삭제할 수 있도록 함
    // 
    // deleteBtn.addEventListener('click', deleteSelected): 클릭 이벤트 리스너 연결
    //   - addEventListener: 이벤트 리스너를 추가하는 메서드
    //   - 'click': 이벤트 타입 (클릭 이벤트)
    //   - deleteSelected: 이벤트 핸들러 함수
    //     → 앞서 정의한 함수 참조
    //     → 삭제 버튼 클릭 시 실행될 함수
    //   - 반환값: 없음 (void)
    //   - 동작:
    //     1. 선택된 문의 ID 목록 확인
    //     2. 선택된 문의가 없으면 경고 메시지 표시
    //     3. 선택된 문의가 있으면 확인 대화상자 표시
    //     4. 사용자가 확인하면 삭제 폼 제출
    //   - 목적: 삭제 버튼 클릭 시 선택된 문의 삭제 처리
    deleteBtn.addEventListener('click', deleteSelected);
  }
  // 주의: deleteBtn이 null이면 이벤트 리스너를 연결하지 않음
}

/**
 * 더미 문의 데이터 삭제 확인 함수
 * 
 * 목적: 더미 문의 데이터 삭제 전 사용자에게 확인 메시지를 표시
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
 * if (confirmDeleteQnaDummy()) {
 *   // 삭제 진행
 * } else {
 *   // 삭제 취소
 * }
 * // 결과:
 * // 1. 확인 대화상자 표시: "더미 문의 데이터를 모두 삭제하시겠습니까?"
 * // 2. 사용자가 '확인' 클릭 → true 반환 → 삭제 진행
 * // 3. 사용자가 '취소' 클릭 → false 반환 → 삭제 취소
 */
function confirmDeleteQnaDummy() {
  // ========= 확인 대화상자 표시 =========
  // 목적: 사용자에게 더미 문의 데이터 삭제 확인 메시지를 표시
  //   - 사용자 경험(UX) 개선: 실수로 데이터를 삭제하는 것을 방지하기 위한 확인 절차 제공
  //   - 데이터 보호: 중요한 데이터 삭제 전 사용자 확인을 통해 실수 방지
  // 
  // confirm('더미 문의 데이터를 모두 삭제하시겠습니까?'): 확인 대화상자 표시
  //   - confirm: 브라우저의 내장 함수로 확인 대화상자를 표시
  //   - '더미 문의 데이터를 모두 삭제하시겠습니까?': 표시할 메시지
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
  return confirm('더미 문의 데이터를 모두 삭제하시겠습니까?');
}

// 페이지 로드 시 선택된 항목 업데이트 및 행 클릭 이벤트 설정

/**
 * 1:1 문의 목록 페이지 JavaScript
 * 
 * 문의 목록 페이지의 JavaScript 로직
 * 공통 함수는 admin_common.js를 참조하세요
 */

/**
 * 페이지 로드 시 초기화 함수
 * 
 * 목적: DOM이 완전히 로드된 후 1:1 문의 목록 페이지 초기화 작업 수행
 *   - 사용자 경험(UX) 개선: 페이지 로드 시 필요한 이벤트 리스너를 연결하여 기능 활성화
 *   - 상태 복원: 페이지 로드 시 선택된 문의 상태를 업데이트
 *   - 이벤트 연결: 테이블 행 클릭, 정렬 링크 클릭, 체크박스, 삭제 버튼, 더미 데이터 삭제 버튼 이벤트 연결
 * 
 * 동작 방식:
 *   1. DOMContentLoaded 이벤트 발생 시 실행
 *   2. 테이블 행 클릭 이벤트 리스너 연결 (attachTableRowListeners)
 *   3. 정렬 링크 클릭 이벤트 리스너 연결 (attachSortListeners)
 *   4. 체크박스 이벤트 리스너 연결 (attachCheckboxListeners)
 *   5. 삭제 버튼 이벤트 리스너 연결 (attachButtonListeners)
 *   6. 더미 데이터 삭제 버튼에 클릭 이벤트 리스너 연결
 * 
 * 사용 시점:
 *   - 페이지 로드 시 (DOMContentLoaded 이벤트 발생 시 자동 실행)
 *   - 스크립트가 실행되기 전에 DOM이 준비되어 있어야 함
 * 
 * 관련 함수:
 *   - attachTableRowListeners: 테이블 행 클릭 이벤트 연결
 *   - attachSortListeners: 정렬 링크 클릭 이벤트 연결
 *   - attachCheckboxListeners: 체크박스 이벤트 리스너 연결
 *   - attachButtonListeners: 삭제 버튼 이벤트 연결
 *   - confirmDeleteQnaDummy: 더미 데이터 삭제 확인
 * 
 * @example
 * // 자동 실행 (페이지 로드 시)
 * // 결과:
 * // 1. 테이블 행 클릭 이벤트 리스너 연결
 * // 2. 정렬 링크 클릭 이벤트 리스너 연결
 * // 3. 체크박스 이벤트 리스너 연결
 * // 4. 삭제 버튼 이벤트 리스너 연결
 * // 5. 더미 데이터 삭제 버튼 이벤트 리스너 연결
 */
document.addEventListener('DOMContentLoaded', function() {
  // ========= 테이블 행 클릭 이벤트 리스너 연결 =========
  // 목적: 문의 목록 테이블의 각 행에 클릭 이벤트 리스너를 연결
  //   - 사용자 경험(UX) 개선: 테이블 행 클릭 시 해당 문의의 상세 정보를 확인할 수 있도록 함
  // 
  // attachTableRowListeners(): 테이블 행 클릭 이벤트 리스너 연결 함수 호출
  //   - attachTableRowListeners: 앞서 정의한 함수
  //   - 반환값: 없음 (void)
  //   - 동작:
  //     1. 선택된 문의 ID 목록 업데이트
  //     2. 모든 문의 목록 행에 클릭 이벤트 리스너 연결
  //     3. 행 클릭 시 해당 문의의 상세 페이지로 이동
  //   - 목적: 페이지 로드 시 테이블 행 클릭 기능 활성화
  attachTableRowListeners();
  
  // ========= 페이지네이션 후 이벤트 리스너 재연결 함수 =========
  // 목적: 페이지네이션 완료 후 테이블 행 클릭 이벤트 리스너를 다시 연결
  //   - handlePaginationAjax 함수에서 호출됨
  //   - 페이지네이션으로 새로운 HTML이 추가되면 기존 이벤트 리스너가 사라지므로 다시 연결 필요
  window.reattachTableRowListeners = function() {
    attachTableRowListeners();
    // 체크박스 이벤트 리스너 재연결
    attachCheckboxListeners();
    // 정렬 링크 이벤트 리스너 재연결
    attachSortListeners();
    // 삭제 버튼 이벤트 리스너 재연결
    attachButtonListeners();
    // 페이지네이션 링크 이벤트 리스너 재연결
    if (typeof attachPaginationListeners === 'function') {
      attachPaginationListeners();
    }
  };
  
  // ========= 정렬 링크 클릭 이벤트 리스너 연결 =========
  // 목적: 테이블 헤더의 정렬 링크에 클릭 이벤트 리스너를 연결
  //   - 사용자 경험(UX) 개선: 정렬 링크 클릭 시 해당 필드로 정렬
  // 
  // attachSortListeners(): 정렬 링크 클릭 이벤트 리스너 연결 함수 호출
  //   - attachSortListeners: 앞서 정의한 함수
  //   - 반환값: 없음 (void)
  //   - 동작: 모든 정렬 링크에 클릭 이벤트 리스너를 연결
  //   - 목적: 페이지 로드 시 정렬 기능 활성화
  attachSortListeners();
  
  // ========= 체크박스 이벤트 리스너 연결 =========
  // 목적: 모든 체크박스(전체 선택 및 개별 체크박스)에 이벤트 리스너를 연결
  //   - 사용자 경험(UX) 개선: 체크박스 클릭 시 선택 상태를 업데이트하고 시각적 피드백 제공
  // 
  // attachCheckboxListeners(): 체크박스 이벤트 리스너 연결 함수 호출
  //   - attachCheckboxListeners: 앞서 정의한 함수
  //   - 반환값: 없음 (void)
  //   - 동작:
  //     1. '전체 선택' 체크박스에 change 이벤트 리스너 연결
  //     2. 모든 개별 체크박스에 change 이벤트 리스너 연결
  //     3. 체크박스 셀에 클릭 이벤트 리스너 연결하여 이벤트 전파 방지
  //   - 목적: 페이지 로드 시 체크박스 기능 활성화
  attachCheckboxListeners();
  
  // ========= 삭제 버튼 이벤트 리스너 연결 =========
  // 목적: 삭제 버튼에 클릭 이벤트 리스너를 연결하여 선택된 문의 삭제 기능 제공
  //   - 사용자 경험(UX) 개선: 삭제 버튼 클릭 시 선택된 문의를 삭제할 수 있도록 함
  // 
  // attachButtonListeners(): 삭제 버튼 이벤트 리스너 연결 함수 호출
  //   - attachButtonListeners: 앞서 정의한 함수
  //   - 반환값: 없음 (void)
  //   - 동작: 삭제 버튼에 클릭 이벤트 리스너를 연결하여 deleteSelected 함수 호출
  //   - 목적: 페이지 로드 시 삭제 버튼 기능 활성화
  attachButtonListeners();
  
  // ========= 더미 데이터 삭제 버튼 이벤트 연결 =========
  // 목적: 더미 데이터 삭제 버튼에 클릭 이벤트 리스너를 연결
  //   - 사용자 경험(UX) 개선: 더미 데이터 삭제 전 확인 메시지를 표시하여 실수 방지
  //   - 데이터 보호: 중요한 데이터 삭제 전 사용자 확인을 통해 실수 방지
  // 
  // const deleteBtn = document.getElementById('deleteQnaDummyBtn'): 더미 데이터 삭제 버튼 찾기
  //   - getElementById: ID로 요소를 찾는 메서드
  //   - 'deleteQnaDummyBtn': 버튼 요소의 ID 속성
  //   - 반환값: HTMLElement 객체 또는 null (요소가 없으면)
  //   - 목적: 더미 데이터 삭제 버튼을 찾기
  //   - 주의: 요소가 없으면 null이 반환됨
  const deleteBtn = document.getElementById('deleteQnaDummyBtn');
  
  // ========= 더미 데이터 삭제 폼 존재 확인 및 이벤트 리스너 연결 =========
  // 목적: 더미 데이터 삭제 폼이 존재하는 경우에만 submit 이벤트 리스너를 연결
  //   - 안전성: 폼이 없으면 에러 발생 방지
  //   - 데이터 보호: 폼 제출 시 확인 메시지를 표시하여 실수 방지
  // 
  // const deleteForm = document.getElementById('deleteQnaDummyForm'): 더미 데이터 삭제 폼 찾기
  //   - getElementById: ID로 요소를 찾는 메서드
  //   - 'deleteQnaDummyForm': 폼 요소의 ID 속성
  //   - 반환값: HTMLElement 객체 (HTMLFormElement) 또는 null (요소가 없으면)
  //   - 목적: 더미 데이터 삭제 폼을 찾기
  //   - 주의: 요소가 없으면 null이 반환됨
  const deleteForm = document.getElementById('deleteQnaDummyForm');
  
  // if (deleteForm): 더미 데이터 삭제 폼이 존재하는지 확인
  //   - deleteForm: 폼 요소 (HTMLFormElement 객체) 또는 null
  //   - truthy 값이면 true (폼이 존재함)
  //   - falsy 값(null)이면 false (폼이 없음)
  //   - 목적: 폼이 있는 경우에만 이벤트 리스너 연결
  if (deleteForm) {
    // ========= 폼 제출 이벤트 리스너 연결 =========
    // 목적: 더미 데이터 삭제 폼 제출 시 확인 메시지를 표시하고 사용자가 취소하면 폼 제출 방지
    //   - 사용자 경험(UX) 개선: 더미 데이터 삭제 전 확인 메시지를 표시하여 실수 방지
    //   - 데이터 보호: 사용자가 취소하면 폼 제출을 방지하여 데이터 삭제 방지
    // 
    // deleteForm.addEventListener('submit', function(e) {...}): 폼 제출 이벤트 리스너 연결
    //   - addEventListener: 이벤트 리스너를 추가하는 메서드
    //   - 'submit': 이벤트 타입 (폼 제출 이벤트)
    //   - function(e): 이벤트 핸들러 함수
    //     → e: 폼 제출 이벤트 객체 (SubmitEvent 객체)
    //     → 이벤트 객체를 통해 preventDefault() 등을 호출할 수 있음
    //   - 목적: 폼 제출 시 확인 메시지를 표시하고 사용자가 취소하면 폼 제출 방지
    deleteForm.addEventListener('submit', function(e) {
      // ========= 확인 메시지 표시 및 폼 제출 방지 =========
      // 목적: 사용자가 확인 메시지에서 '취소'를 클릭한 경우 폼 제출을 방지
      //   - 사용자 경험(UX) 개선: 사용자가 취소하면 데이터 삭제를 방지
      //   - 데이터 보호: 사용자의 의도와 다르게 데이터가 삭제되는 것을 방지
      // 
      // if (!confirmDeleteQnaDummy()): 확인 메시지에서 '취소'를 클릭한 경우
      //   - !confirmDeleteQnaDummy(): confirmDeleteQnaDummy()의 반대값
      //     → confirmDeleteQnaDummy()가 false를 반환하면 true (취소 클릭)
      //     → confirmDeleteQnaDummy()가 true를 반환하면 false (확인 클릭)
      //   - confirmDeleteQnaDummy(): 더미 데이터 삭제 확인 함수 호출
      //     → 확인 대화상자를 표시하고 사용자의 선택에 따라 true 또는 false 반환
      //   - 목적: 사용자가 '취소'를 클릭한 경우에만 처리
      if (!confirmDeleteQnaDummy()) {
        // ========= 폼 제출 방지 =========
        // 목적: 사용자가 '취소'를 클릭한 경우 폼 제출을 방지하여 데이터 삭제 방지
        //   - 사용자 경험(UX) 개선: 사용자가 취소하면 데이터 삭제를 방지
        //   - 데이터 보호: 사용자의 의도와 다르게 데이터가 삭제되는 것을 방지
        // 
        // e.preventDefault(): 이벤트의 기본 동작 방지
        //   - preventDefault: 이벤트의 기본 동작을 방지하는 메서드
        //   - <form>의 기본 동작: 폼 제출
        //   - 목적: 사용자가 '취소'를 클릭한 경우 폼 제출을 방지하여 데이터 삭제 방지
        //   - 주의: preventDefault를 호출하지 않으면 폼이 제출되어 데이터가 삭제됨
        e.preventDefault();
      }
      // 주의: 사용자가 '확인'을 클릭한 경우 폼이 정상적으로 제출됨
    });
  }
  // 주의: deleteForm이 null이면 이벤트 리스너를 연결하지 않음
});
