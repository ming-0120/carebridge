let selectedLabItem = null;

/* 파일 첨부 */
function addAttachment(input) {
    const file = input.files[0];
    if (file) {
        const list = document.getElementById('attachmentList');
        const li = document.createElement('li');
        li.setAttribute('data-filename', file.name);
        li.innerHTML = `
            <span>${file.name}</span>
            <button class="delete-btn" onclick="removeAttachment(this)">x</button>
        `;
        list.appendChild(li);
        alert(`${file.name} 파일이 첨부되었습니다.`);
    }
}

function removeAttachment(btn) {
    const li = btn.parentNode;
    alert(`${li.getAttribute('data-filename')} 파일을 삭제합니다.`);
    li.remove();
}

/* 검사 상태 업데이트 */
function updateStatus(newStatus) {
    const completedBtn = document.getElementById('btnCompleted');
    const sampledBtn = document.getElementById('btnSampled');

    alert(`검사 상태가 [${newStatus}]로 변경됩니다.`);

    if (newStatus === 'SAMPLED') {
        completedBtn.disabled = false;
        sampledBtn.disabled = true;
    } else if (newStatus === 'COMPLETED') {
        sampledBtn.disabled = true;
        completedBtn.disabled = true;
    }
}

function goToNextPatient() {
    alert('다음 대기 환자 기록 작성 화면으로 이동합니다.');
}

/* 모달 열기 */
function openLabSearchModal() {
    document.getElementById('labSearchModal').style.visibility = 'visible';
}

/* 모달 닫기 */
function closeModal(id) {
    document.getElementById(id).style.visibility = 'hidden';
    selectedLabItem = null;
    document.querySelectorAll('#labResultTable tbody tr').forEach(r => r.classList.remove('selected'));
}

/* 검색 기능 (Mock) */
function performSearch() {
    const query = document.getElementById('labNameInput').value;
    alert(`"${query}" 검색 실행`);
}

/* 항목 선택 */
function selectLabItem(row) {
    document.querySelectorAll('#labResultTable tbody tr').forEach(r => r.classList.remove('selected'));
    row.classList.add('selected');

    selectedLabItem = {
        code: row.getAttribute('data-code'),
        name: row.getAttribute('data-name')
    };
}

/* 선택 항목을 main UI에 반영 */
function confirmSelection() {
    if (!selectedLabItem) {
        alert('검사항목을 선택해야 합니다.');
        return;
    }

    document.getElementById('labName').value = selectedLabItem.name;
    document.getElementById('labCode').value = selectedLabItem.code;

    closeModal('labSearchModal');
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnCompleted').disabled = true;
});
