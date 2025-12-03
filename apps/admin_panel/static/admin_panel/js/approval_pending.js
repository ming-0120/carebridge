// 의사 승인 대기 페이지 JavaScript
// 공통 함수는 admin_common.js를 참조하세요

function selectDoctor(event, doctorId) {
  selectItem(event, doctorId, 'doctor_id');
}

function toggleSelectAllApproval() {
  const selectAllCheckbox = document.getElementById('selectAll');
  const checkboxes = document.querySelectorAll('input[name="doctor_checkbox"]');
  
  checkboxes.forEach(checkbox => {
    checkbox.checked = selectAllCheckbox.checked;
  });
  
  updateSelectedDoctors();
}

function updateSelectedDoctors() {
  const doctorIds = getSelectedItemIds('doctor_checkbox');
  document.getElementById('doctorIdsInput').value = doctorIds.join(',');
  
  // 전체 선택 체크박스 상태 업데이트
  const selectAllCheckbox = document.getElementById('selectAll');
  const allCheckboxes = document.querySelectorAll('input[name="doctor_checkbox"]');
  selectAllCheckbox.checked = allCheckboxes.length > 0 && doctorIds.length === allCheckboxes.length;
}

function approveSelected() {
  const doctorIds = document.getElementById('doctorIdsInput').value;
  if (!doctorIds) {
    alert('승인할 의사를 선택해주세요.');
    return;
  }
  
  if (confirm('선택한 의사를 승인하시겠습니까?')) {
    document.getElementById('actionInput').value = 'approve';
    document.getElementById('approvalForm').submit();
  }
}

function rejectSelected() {
  const doctorIds = document.getElementById('doctorIdsInput').value;
  if (!doctorIds) {
    alert('거절할 의사를 선택해주세요.');
    return;
  }
  
  if (confirm('선택한 의사의 승인을 거절하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
    document.getElementById('actionInput').value = 'reject';
    document.getElementById('approvalForm').submit();
  }
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
      const currentOrder = link.getAttribute('data-current-order') || 'asc';
      handleSortClick(sortField, currentSort, currentOrder);
    };
    link.addEventListener('click', link._sortHandler);
  });
}

// 테이블 행 클릭 이벤트 연결
function attachTableRowListeners() {
  const doctorRows = document.querySelectorAll('tr[data-doctor-id]');
  doctorRows.forEach(row => {
    row.removeEventListener('click', row._clickHandler);
    const doctorId = row.getAttribute('data-doctor-id');
    if (doctorId) {
      row._clickHandler = function(e) {
        // 체크박스나 버튼 클릭이 아닌 경우에만 처리
        const target = e.target;
        if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.closest('input, button')) {
          return; // 체크박스나 버튼 클릭은 무시
        }
        
        // 이벤트 기본 동작 및 전파 방지
        e.preventDefault();
        e.stopPropagation();
        
        // 이벤트 객체를 selectDoctor에 전달
        selectDoctor(e, parseInt(doctorId));
      };
      row.addEventListener('click', row._clickHandler);
    }
  });
}

// 체크박스 이벤트 연결
function attachCheckboxListeners() {
  const selectAllCheckbox = document.getElementById('selectAll');
  if (selectAllCheckbox) {
    selectAllCheckbox.removeEventListener('change', selectAllCheckbox._changeHandler);
    selectAllCheckbox._changeHandler = function() {
      toggleSelectAllApproval();
    };
    selectAllCheckbox.addEventListener('change', selectAllCheckbox._changeHandler);
  }
  
  const checkboxes = document.querySelectorAll('input[name="doctor_checkbox"]');
  checkboxes.forEach(checkbox => {
    checkbox.removeEventListener('change', checkbox._changeHandler);
    checkbox._changeHandler = function() {
      updateSelectedDoctors();
    };
    checkbox.addEventListener('change', checkbox._changeHandler);
  });
  
  // 체크박스 셀 클릭 시 이벤트 전파 방지
  const checkboxCells = document.querySelectorAll('.checkbox-cell');
  checkboxCells.forEach(cell => {
    cell.addEventListener('click', function(e) {
      e.stopPropagation();
    });
  });
}

// 버튼 이벤트 연결
function attachButtonListeners() {
  const approveBtn = document.getElementById('approveBtn');
  if (approveBtn) {
    approveBtn.removeEventListener('click', approveBtn._clickHandler);
    approveBtn._clickHandler = approveSelected;
    approveBtn.addEventListener('click', approveBtn._clickHandler);
  }
  
  const rejectBtn = document.getElementById('rejectBtn');
  if (rejectBtn) {
    rejectBtn.removeEventListener('click', rejectBtn._clickHandler);
    rejectBtn._clickHandler = rejectSelected;
    rejectBtn.addEventListener('click', rejectBtn._clickHandler);
  }
}

// 페이지 로드 시 선택된 의사 행에 selected 클래스 추가
document.addEventListener('DOMContentLoaded', function() {
  updateSelectedDoctors();
  attachSortListeners();
  attachTableRowListeners();
  attachCheckboxListeners();
  attachButtonListeners();
  
  // 초기 선택된 의사 행에 selected 클래스 추가
  const urlParams = new URLSearchParams(window.location.search);
  const selectedDoctorId = urlParams.get('doctor_id');
  if (selectedDoctorId) {
    const selectedRow = document.querySelector(`[data-doctor-id="${selectedDoctorId}"]`);
    if (selectedRow) {
      selectedRow.classList.add('selected');
    }
  }
});


