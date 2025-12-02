// 의사 승인 대기 페이지 JavaScript
// 공통 함수는 admin_common.js를 참조하세요

function selectDoctor(doctorId) {
  selectItem(doctorId, 'doctor_id');
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

// 페이지 로드 시 선택된 의사 행에 selected 클래스 추가
document.addEventListener('DOMContentLoaded', function() {
  updateSelectedDoctors();
});


