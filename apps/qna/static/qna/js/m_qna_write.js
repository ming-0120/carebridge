// QnA 작성 페이지 JavaScript
// 공통 함수는 m_qna_common.js를 참조하세요

/**
 * 페이지 로드 시 초기화 함수
 *
 * 목적: DOM이 완전히 로드된 후 QnA 작성 페이지 초기화 작업 수행
 *   - 사용자 경험(UX) 개선: 페이지 로드 시 필요한 이벤트 리스너를 연결하여 기능 활성화
 *   - 폼 유효성 검사: 클라이언트 측 유효성 검사 수행
 *
 * 동작 방식:
 *   1. DOMContentLoaded 이벤트 발생 시 실행
 *   2. 폼 제출 이벤트 리스너 연결
 *   3. 클라이언트 측 유효성 검사 수행
 *
 * 사용 시점:
 *   - 페이지 로드 시 (DOMContentLoaded 이벤트 발생 시 자동 실행)
 *   - 스크립트가 실행되기 전에 DOM이 준비되어 있어야 함
 */
document.addEventListener('DOMContentLoaded', function() {
  // ========= 폼 제출 이벤트 리스너 연결 =========
  // 목적: 폼 제출 시 클라이언트 측 유효성 검사 수행
  //   - 사용자 경험(UX) 개선: 서버로 전송하기 전에 클라이언트에서 유효성 검사하여 즉시 피드백 제공
  //
  // const form = document.querySelector('.qna-form'): 폼 요소 찾기
  //   - querySelector: CSS 선택자로 첫 번째 요소를 찾는 메서드
  //   - '.qna-form': QnA 작성 폼의 클래스명
  //   - 반환값: HTMLElement 객체 또는 null (요소가 없으면)
  //   - 목적: 폼 제출 이벤트 리스너를 연결하기 위해 폼 요소 찾기
  const form = document.querySelector('.qna-form');

  // ========= 폼 요소 존재 확인 및 이벤트 리스너 연결 =========
  // 목적: 폼 요소가 있는 경우에만 이벤트 리스너 연결
  //   - 안전성: 폼 요소가 없으면 에러가 발생하지 않도록 처리
  //
  // if (form): 폼 요소가 존재하는지 확인
  //   - form: 폼 요소 (HTMLElement 객체) 또는 null
  //   - truthy 값이면 true (폼 요소가 있음)
  //   - falsy 값(null)이면 false (폼 요소가 없음)
  //   - 목적: 폼 요소가 있는 경우에만 이벤트 리스너 연결
  if (form) {
    // ========= 폼 제출 이벤트 리스너 연결 =========
    // 목적: 폼 제출 시 클라이언트 측 유효성 검사 수행
    //   - 사용자 경험(UX) 개선: 서버로 전송하기 전에 클라이언트에서 유효성 검사하여 즉시 피드백 제공
    //
    // form.addEventListener('submit', function(e) {...}): 폼 제출 이벤트 리스너 연결
    //   - addEventListener: 이벤트 리스너를 추가하는 메서드
    //   - 'submit': 이벤트 타입 (폼 제출 이벤트)
    //   - function(e): 이벤트 핸들러 함수
    //     → e: 제출 이벤트 객체 (Event 객체)
    //     → 이벤트 객체를 통해 폼 제출을 취소할 수 있음 (e.preventDefault())
    //   - 목적: 폼 제출 시 클라이언트 측 유효성 검사 수행
    form.addEventListener('submit', function(e) {
      // ========= 폼 입력 필드 조회 =========
      // 목적: 폼의 제목과 내용 입력 필드를 찾아 유효성 검사 수행
      //   - 데이터 무결성: 필수 입력 필드가 비어있지 않은지 확인
      //
      // const title = form.querySelector('#title'): 제목 입력 필드 찾기
      //   - querySelector: CSS 선택자로 첫 번째 요소를 찾는 메서드
      //   - '#title': 제목 입력 필드의 ID
      //   - 반환값: HTMLElement 객체 또는 null (요소가 없으면)
      //   - 목적: 제목 입력 필드의 값을 확인하기 위해 요소 찾기
      const title = form.querySelector('#title');
      // const content = form.querySelector('#content'): 내용 입력 필드 찾기
      //   - querySelector: CSS 선택자로 첫 번째 요소를 찾는 메서드
      //   - '#content': 내용 입력 필드의 ID
      //   - 반환값: HTMLElement 객체 또는 null (요소가 없으면)
      //   - 목적: 내용 입력 필드의 값을 확인하기 위해 요소 찾기
      const content = form.querySelector('#content');

      // ========= 제목 유효성 검사 =========
      // 목적: 제목 입력 필드가 비어있지 않은지 확인
      //   - 데이터 무결성: 제목이 필수 입력 필드이므로 비어있으면 안 됨
      //
      // if (!title || !title.value.trim()): 제목이 없거나 비어있는지 확인
      //   - !title: 제목 입력 필드가 없는지 확인
      //   - !title.value.trim(): 제목 입력 필드의 값이 비어있는지 확인
      //     → title.value: 입력 필드의 값 (문자열)
      //     → .trim(): 문자열 앞뒤 공백 제거
      //     → !: 논리 부정 연산자 (비어있으면 true)
      //   - 목적: 제목이 비어있으면 유효성 검사 실패
      if (!title || !title.value.trim()) {
        // ========= 폼 제출 취소 =========
        // 목적: 제목이 비어있으면 폼 제출을 취소하고 사용자에게 알림
        //   - 사용자 경험(UX) 개선: 서버로 전송하기 전에 클라이언트에서 즉시 피드백 제공
        //
        // e.preventDefault(): 폼 제출 이벤트 취소
        //   - preventDefault: 이벤트의 기본 동작을 취소하는 메서드
        //   - 목적: 폼 제출을 취소하여 서버로 전송하지 않음
        e.preventDefault();
        // alert('제목을 입력해주세요.'): 사용자에게 알림 표시
        //   - alert: 브라우저의 알림 창을 표시하는 함수
        //   - '제목을 입력해주세요.': 알림 메시지
        //   - 목적: 사용자에게 제목이 필요하다는 것을 알림
        alert('제목을 입력해주세요.');
        // return: 함수 종료
        //   - 목적: 이후 코드를 실행하지 않고 함수 종료
        return;
      }

      // ========= 내용 유효성 검사 =========
      // 목적: 내용 입력 필드가 비어있지 않은지 확인
      //   - 데이터 무결성: 내용이 필수 입력 필드이므로 비어있으면 안 됨
      //
      // if (!content || !content.value.trim()): 내용이 없거나 비어있는지 확인
      //   - !content: 내용 입력 필드가 없는지 확인
      //   - !content.value.trim(): 내용 입력 필드의 값이 비어있는지 확인
      //     → content.value: 입력 필드의 값 (문자열)
      //     → .trim(): 문자열 앞뒤 공백 제거
      //     → !: 논리 부정 연산자 (비어있으면 true)
      //   - 목적: 내용이 비어있으면 유효성 검사 실패
      if (!content || !content.value.trim()) {
        // ========= 폼 제출 취소 =========
        // 목적: 내용이 비어있으면 폼 제출을 취소하고 사용자에게 알림
        //   - 사용자 경험(UX) 개선: 서버로 전송하기 전에 클라이언트에서 즉시 피드백 제공
        //
        // e.preventDefault(): 폼 제출 이벤트 취소
        //   - preventDefault: 이벤트의 기본 동작을 취소하는 메서드
        //   - 목적: 폼 제출을 취소하여 서버로 전송하지 않음
        e.preventDefault();
        // alert('내용을 입력해주세요.'): 사용자에게 알림 표시
        //   - alert: 브라우저의 알림 창을 표시하는 함수
        //   - '내용을 입력해주세요.': 알림 메시지
        //   - 목적: 사용자에게 내용이 필요하다는 것을 알림
        alert('내용을 입력해주세요.');
        // return: 함수 종료
        //   - 목적: 이후 코드를 실행하지 않고 함수 종료
        return;
      }

      // ========= 유효성 검사 통과 =========
      // 목적: 모든 유효성 검사를 통과했으므로 폼 제출 허용
      //   - 사용자 경험(UX) 개선: 유효한 데이터만 서버로 전송
      //   - 주의: 이 함수가 종료되면 폼이 정상적으로 제출됨 (e.preventDefault()를 호출하지 않았으므로)
    });
  }

  // ========= 개인정보 동의 시 자동 입력 기능 =========
  // 목적: 개인정보 수집 동의 라디오 버튼을 체크하면 작성자 정보 필드가 활성화되고 자동 입력됨
  
  const privacyConsentAgree = document.querySelector('input[name="privacy_consent"][value="agree"]');
  const privacyConsentDisagree = document.querySelector('input[name="privacy_consent"][value="disagree"]');
  const writerInfoGroup = document.getElementById('writer-info-group');
  const formContentGroups = document.querySelectorAll('.form-content-group');
  const formActionsGroup = document.querySelector('.form-actions-group');
  
  // 작성자 정보 섹션 및 폼 내용 숨기기
  function hideWriterInfoSection() {
    if (writerInfoGroup) {
      writerInfoGroup.style.display = 'none';
    }
    // 제목, 내용, 공개 설정 숨기기
    formContentGroups.forEach(group => {
      if (group) group.style.display = 'none';
    });
    // 등록/취소 버튼 숨기기
    if (formActionsGroup) {
      formActionsGroup.style.display = 'none';
    }
  }
  
  // 작성자 정보 섹션 및 폼 내용 보이기
  function showWriterInfoSection() {
    if (writerInfoGroup) {
      writerInfoGroup.style.display = 'block';
    }
    // 제목, 내용, 공개 설정 보이기
    formContentGroups.forEach(group => {
      if (group) group.style.display = 'block';
    });
    // 등록/취소 버튼 보이기
    if (formActionsGroup) {
      formActionsGroup.style.display = 'flex';
    }
  }
  
  // DB 값으로 복원 함수 (이제 텍스트로만 표시되므로 빈 함수)
  function restoreOriginalValues() {
    // HTML에서 이미 텍스트로 표시되므로 추가 작업 불필요
  }
  
  // 초기 상태: 작성자 정보 섹션 및 폼 내용 숨김 (CSS에서 이미 숨김 처리되어 있지만 명시적으로 호출)
  hideWriterInfoSection();
  
  // 개인정보 수집 동의 체크 시
  if (privacyConsentAgree) {
    privacyConsentAgree.addEventListener('change', function() {
      if (this.checked) {
        showWriterInfoSection();
        restoreOriginalValues();
      }
    });
  }
  
  // 개인정보 수집 동의 불가 체크 시
  if (privacyConsentDisagree) {
    privacyConsentDisagree.addEventListener('change', function() {
      if (this.checked) {
        hideWriterInfoSection();
      }
    });
  }

  // ========= 초기화 완료 로그 =========
  // 목적: 페이지 초기화가 완료되었음을 콘솔에 로그로 출력
  //   - 디버깅: 개발자 도구의 콘솔에서 초기화 상태를 확인할 수 있음
  //
  // console.log('QnA 작성 페이지 JavaScript 로드 완료'): 로그 출력
  //   - console.log: 콘솔에 로그 메시지를 출력하는 메서드
  //   - 'QnA 작성 페이지 JavaScript 로드 완료': 출력할 로그 메시지
  //   - 목적: 페이지 초기화가 완료되었음을 로그로 출력
  //   - 주의: 프로덕션 환경에서는 사용자에게 보이지 않음 (개발자 도구에서만 확인 가능)
  console.log('QnA 작성 페이지 JavaScript 로드 완료');
});

