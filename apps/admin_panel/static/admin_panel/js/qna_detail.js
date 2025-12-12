/**
 * 1:1 문의 상세 페이지 JavaScript
 * 
 * 문의 상세 페이지의 JavaScript 로직
 * 공통 함수는 admin_common.js를 참조하세요
 */

/**
 * 페이지 로드 시 초기화 함수
 * 
 * 목적: DOM이 완전히 로드된 후 1:1 문의 상세 페이지 초기화 작업 수행
 *   - 사용자 경험(UX) 개선: 페이지 로드 시 필요한 초기화 작업을 수행하여 기능 활성화
 *   - 확장성: 향후 추가 초기화 로직을 쉽게 추가할 수 있도록 구조 제공
 *   - 일관성 유지: 다른 목록 페이지와 동일한 초기화 패턴 사용
 * 
 * 동작 방식:
 *   1. DOMContentLoaded 이벤트 발생 시 실행
 *   2. 현재는 공통 함수(admin_common.js)만 사용하므로 별도 초기화 로직 없음
 *   3. 향후 추가 초기화 로직이 필요하면 이 함수 내부에 작성
 * 
 * 사용 시점:
 *   - 페이지 로드 시 (DOMContentLoaded 이벤트 발생 시 자동 실행)
 *   - 스크립트가 실행되기 전에 DOM이 준비되어 있어야 함
 * 
 * 관련 함수:
 *   - admin_common.js의 공통 함수들: 페이지네이션, 검색 등 공통 기능 사용
 * 
 * 현재 상태:
 *   - 초기화 로직 없음: 현재는 공통 함수만 사용하므로 별도 초기화 로직이 필요하지 않음
 *   - 확장 가능: 향후 문의 상세 페이지에 특화된 기능이 필요하면 이 함수에 추가 가능
 * 
 * @example
 * // 자동 실행 (페이지 로드 시)
 * // 결과:
 * // 1. DOM이 완전히 로드된 후 실행
 * // 2. 현재는 별도 초기화 로직 없음 (공통 함수만 사용)
 * // 3. 향후 추가 초기화 로직이 필요하면 이 함수 내부에 작성
 */
document.addEventListener('DOMContentLoaded', function() {
  // ========= 답변 폼 제출 확인 처리 =========
  // 목적: 답변 완료/취소 버튼 클릭 시 confirm 창을 띄워서 확인
  //   - 사용자 경험(UX) 개선: 실수로 답변을 완료하거나 취소하는 것을 방지
  //   - 안전성: 중요한 작업 전에 한 번 더 확인하는 절차 제공
  
  // const replyForm = document.querySelector('form[method="post"]');
  // if (!replyForm) {
  //   return;
  // }
  
  // 답변 완료 버튼 클릭 이벤트
  const replyButton = document.getElementById('replyBtn');
  if (replyButton) {
    replyButton.addEventListener('click', function(e) {
      e.preventDefault();
      // const replyForm = document.querySelector('form[method="post"]');
      const replyForm = document.getElementById('qndFrom');
      
      const replyContent = document.querySelector('textarea[name="reply_content"]').value.trim();
      
      // 답변 내용이 비어있으면 확인 없이 경고만 표시
      if (!replyContent) {
        alert('답변 내용을 입력해주세요.');
        return;
      }
      
      // confirm 창 표시
      if (confirm('답변을 완료하시겠습니까?')) {
        // 기존 action 필드 제거 (중복 방지)
        const existingAction = replyForm.querySelector('input[name="action"]');
        if (existingAction) {
          existingAction.remove();
        }
        
        // 확인을 누르면 action 필드를 추가하고 폼 제출
        const actionInput = document.createElement('input');
        actionInput.type = 'hidden';
        actionInput.name = 'action';
        actionInput.value = 'reply';
        replyForm.appendChild(actionInput);
        
        console.log('답변 완료 폼 제출:', replyForm.action);
        replyForm.submit();
      }
    });
  }
  
  // 답변 취소 버튼 클릭 이벤트
  const cancelButton = document.getElementById('cancelBtn');
  if (cancelButton) {
    cancelButton.addEventListener('click', function(e) {
      e.preventDefault();
      const replyForm = document.querySelector('form[method="post"]');
      
      // confirm 창 표시
      if (confirm('답변을 취소하시겠습니까?\n작성한 답변 내용이 삭제됩니다.')) {
        // 기존 action 필드 제거 (중복 방지)
        const existingAction = replyForm.querySelector('input[name="action"]');
        if (existingAction) {
          existingAction.remove();
        }
        
        // 확인을 누르면 action 필드를 추가하고 폼 제출
        const actionInput = document.createElement('input');
        actionInput.type = 'hidden';
        actionInput.name = 'action';
        actionInput.value = 'cancel';
        replyForm.appendChild(actionInput);
        
        console.log('답변 취소 폼 제출:', replyForm.action);
        replyForm.submit();
      }
    });
  }
});







