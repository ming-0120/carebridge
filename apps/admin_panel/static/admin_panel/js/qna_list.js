// 1:1 문의 목록 페이지 JavaScript
// 공통 함수는 admin_common.js를 참조하세요

function toggleSelectAllQna() {
  const selectAllCheckbox = document.getElementById('selectAll');
  const checkboxes = document.querySelectorAll('input[name="qna_checkbox"]');
  
  checkboxes.forEach(checkbox => {
    checkbox.checked = selectAllCheckbox.checked;
  });
  
  updateSelectedQnas();
}

function updateSelectedQnas() {
  const qnaIds = getSelectedItemIds('qna_checkbox');
  document.getElementById('qnaIdsInput').value = qnaIds.join(',');
  
  // 전체 선택 체크박스 상태 업데이트
  const selectAllCheckbox = document.getElementById('selectAll');
  const allCheckboxes = document.querySelectorAll('input[name="qna_checkbox"]');
  selectAllCheckbox.checked = allCheckboxes.length > 0 && qnaIds.length === allCheckboxes.length;
}

function deleteSelected() {
  const qnaIds = document.getElementById('qnaIdsInput').value;
  if (!qnaIds) {
    alert('삭제할 문의를 선택해주세요.');
    return;
  }
  
  if (confirm('이 게시물을 삭제 하시겠습니까?')) {
    document.getElementById('deleteForm').submit();
  }
}

// 문의 상세 페이지로 이동
function goToQnaDetail(qnaId) {
  if (!qnaId) {
    console.error('qnaId가 없습니다.');
    return;
  }
  const url = `/admin_panel/qna/${qnaId}/`;
  console.log('이동할 URL:', url);
  window.location.href = url;
}

// 테이블 행 클릭 이벤트 연결 (AJAX 페이지네이션 후 재연결용)
function attachTableRowListeners() {
  updateSelectedQnas();
  
  // 모든 문의 행에 클릭 이벤트 추가
  const qnaRows = document.querySelectorAll('.qna-row[data-qna-id]');
  qnaRows.forEach(row => {
    // 기존 이벤트 리스너 제거 후 새로 추가
    row.removeEventListener('click', row._clickHandler);
    const qnaId = row.getAttribute('data-qna-id');
    if (qnaId) {
      row._clickHandler = function(e) {
        // 체크박스나 체크박스 셀을 클릭한 경우는 무시
        if (e.target.type === 'checkbox' || e.target.closest('td:first-child')) {
          return;
        }
        goToQnaDetail(parseInt(qnaId));
      };
      row.addEventListener('click', row._clickHandler);
    }
  });
}

// 페이지 로드 시 선택된 항목 업데이트 및 행 클릭 이벤트 설정
document.addEventListener('DOMContentLoaded', function() {
  attachTableRowListeners();
});

