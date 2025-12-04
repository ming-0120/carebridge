// 사용자 목록 페이지 JavaScript
// 공통 함수는 admin_common.js를 참조하세요

function selectUser(event, userId) {
  selectItem(event, userId, 'user_id');
}

// 테이블 행 클릭 이벤트 연결 (AJAX 페이지네이션 후 재연결용)
function attachTableRowListeners() {
  const userRows = document.querySelectorAll('.user-row[data-user-id]');
  userRows.forEach(row => {
    // 기존 이벤트 리스너 제거 후 새로 추가
    row.removeEventListener('click', row._clickHandler);
    const userId = row.getAttribute('data-user-id');
    if (userId) {
      row._clickHandler = function(e) {
        // 체크박스나 버튼 클릭이 아닌 경우에만 처리
        const target = e.target;
        if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.closest('input, button')) {
          return; // 체크박스나 버튼 클릭은 무시
        }
        
        // 이벤트 기본 동작 및 전파 방지
        e.preventDefault();
        e.stopPropagation();
        
        // 이벤트 객체를 selectUser에 전달
        selectUser(e, parseInt(userId));
      };
      row.addEventListener('click', row._clickHandler);
    }
  });
}

// 정렬 링크 이벤트 연결
function attachSortListeners() {
  const sortLinks = document.querySelectorAll('a[data-sort-field]');
  sortLinks.forEach(link => {
    link.removeEventListener('click', link._sortHandler);
    link._sortHandler = function(e) {
      e.preventDefault();
      const sortField = link.getAttribute('data-sort-field');
      const currentSort = link.getAttribute('data-current-sort') || '';
      const currentOrder = link.getAttribute('data-current-order') || 'desc';
      handleSortClick(sortField, currentSort, currentOrder);
    };
    link.addEventListener('click', link._sortHandler);
  });
}

// 더미 데이터 삭제 확인
function confirmDeleteUserDummy() {
  return confirm('더미 사용자 데이터를 모두 삭제하시겠습니까?');
}

// 페이지 로드 시 이벤트 연결
document.addEventListener('DOMContentLoaded', function() {
  attachTableRowListeners();
  attachSortListeners();
  
  // 초기 선택된 사용자 행에 selected 클래스 추가
  const urlParams = new URLSearchParams(window.location.search);
  const selectedUserId = urlParams.get('user_id');
  if (selectedUserId) {
    const selectedRow = document.querySelector(`[data-user-id="${selectedUserId}"]`);
    if (selectedRow) {
      selectedRow.classList.add('selected');
    }
  }
  
  // 더미 데이터 삭제 버튼 이벤트
  const deleteBtn = document.getElementById('deleteUserDummyBtn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', function(e) {
      if (!confirmDeleteUserDummy()) {
        e.preventDefault();
      }
    });
  }
});



