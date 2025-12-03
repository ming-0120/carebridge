let currentState = 'PENDING';
let selectedProcedure = null;

// 현재 시간
function getCurrentTime() {
    const now = new Date();
    const pad = (n) => n.toString().padStart(2,'0');
    return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

// 모달 열기
function openProcedureSearchModal() {
    if (currentState !== 'PENDING') {
        alert('시술이 이미 시작되어 변경할 수 없습니다.');
        return;
    }
    document.getElementById('procedureSearchModal').style.visibility = 'visible';
    selectedProcedure = null;
    document.querySelectorAll('#procedureResultTable tbody tr').forEach(r => r.classList.remove('selected'));
}

// 상태 업데이트
function updateStatus(newStatus) {
    const startTime = document.getElementById('startTime');
    const completionTime = document.getElementById('completionTime');

    if (newStatus === 'IN_PROGRESS') {
        startTime.value = getCurrentTime();
        currentState = 'IN_PROGRESS';
        alert('시술이 시작되었습니다.');
    } else if (newStatus === 'COMPLETED') {
        completionTime.value = getCurrentTime();
        currentState = 'COMPLETED';
        alert('시술이 완료되었습니다.');
    }

    updateButtonVisibility();
}

// UI 업데이트
function updateButtonVisibility() {
    const btnStart = document.getElementById('btnStart');
    const btnComplete = document.getElementById('btnComplete');
    const btnNext = document.getElementById('btnNext');
    const site = document.getElementById('procedureSite');
    const searchBtn = document.getElementById('searchProcedureBtn');

    btnStart.style.display = 'none';
    btnComplete.style.display = 'none';
    btnNext.style.display = 'none';
    site.disabled = false;
    searchBtn.disabled = false;

    if (currentState === 'PENDING') {
        btnStart.style.display = 'inline-block';
    } else if (currentState === 'IN_PROGRESS') {
        btnComplete.style.display = 'inline-block';
        site.disabled = true;
        searchBtn.disabled = true;
    } else if (currentState === 'COMPLETED') {
        btnNext.style.display = 'inline-block';
        site.disabled = true;
        searchBtn.disabled = true;
    }
}

// 다음 환자 이동
function goToNextPatient() {
    alert('다음 환자의 치료기록 화면으로 이동합니다.');
}

// 모달 닫기
function closeModal(id) {
    document.getElementById(id).style.visibility = 'hidden';
    document.querySelectorAll('#procedureResultTable tbody tr')
        .forEach(r => r.classList.remove('selected'));
}

// 모달 검색
async function treatmentPerformSearch() {
    const q = document.getElementById('procedureNameInput').value;
    url = `http://127.0.0.1:8000/mstaff/treatment_data_search/?search=${q}`
    
    const response = await fetch(url);
    const datas = await response.json();
    const table = [];

    for(row of datas.treatment_datas) {
        table.push(`
            <tr data-code="${row.sickCd}" data-name="${row.sickNm}" onclick="selectProcedure(this)">
                <td>${row.sickNm}</td>
                <td>${row.sickCd}</td>
            </tr>
        `);
    }

    $('#procedureResultTable tbody').html(table.join('\n'));
}

// 모달 항목 선택
function selectProcedure(row) {
    document.querySelectorAll('#procedureResultTable tbody tr')
        .forEach(r => r.classList.remove('selected'));
    row.classList.add('selected');

    selectedProcedure = {
        code: row.getAttribute('data-code'),
        name: row.getAttribute('data-name')
    };
}

// 모달 확인 → 입력란 반영
function confirmSelection() {
    if (!selectedProcedure) {
        alert('항목을 선택하세요.');
        return;
    }

    document.getElementById('procedureName').value = selectedProcedure.name;
    document.getElementById('procedureCode').value = selectedProcedure.code;

    closeModal('procedureSearchModal');
}

// 초기 실행
document.addEventListener('DOMContentLoaded', updateButtonVisibility);
