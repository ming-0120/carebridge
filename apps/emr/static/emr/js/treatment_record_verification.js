let selectedProcedure = null;

// 현재 시간
function getCurrentTime() {
    const now = new Date();
    const pad = (n) => n.toString().padStart(2,'0');
    return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

// 모달 열기
function openProcedureSearchModal() {
    if (currentState !== 'Pending') {
        alert('시술이 이미 시작되어 변경할 수 없습니다.');
        return;
    }

    document.getElementById('procedureSearchModal').style.visibility = 'visible';
    selectedProcedure = null;
    document.querySelectorAll('#procedureResultTable tbody tr').forEach(r => r.classList.remove('selected'));

    $('#procedureNameInput').val('');
    $('#procedureResultTable tbody').html('');
    $('#procedureNameInput').focus();
}

function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

const debouncedTreatmentPerformSearch = debounce(function () {
  treatmentPerformSearch(document.getElementById('procedureNameInput').value);
}, 300);


// 상태 업데이트
function updateStatus(newStatus) {
    const startTime = document.getElementById('startTime');
    const completionTime = document.getElementById('completionTime');

    if (newStatus === 'In progress') {
        // startTime.value = getCurrentTime();
        // currentState = 'In progress';

        if ($('#procedureName').val().trim() == '' && $('#procedureCode').val().trim() == '') {
            alert('처치항목은 필수값입니다.')
            return;
        }

        if ($('#procedureSite').val().trim() == '') {
            alert('처치부위는 필수 입력값입니다.')
            return;
        }
        $('#procedureSite').attr("disabled", false);
        $("form[name='frmTreatment']").submit();

    } else if (newStatus === 'Completed') {
        $('#procedureSite').attr("disabled", false);
        $("form[name='frmTreatment']").submit();
    }

    // updateButtonVisibility();
}

// UI 업데이트
function updateButtonVisibility() {
    const btnStart = document.getElementById('btnStart');
    const btnComplete = document.getElementById('btnComplete');
    // const btnNext = document.getElementById('btnNext');
    const site = document.getElementById('procedureSite');
    const searchBtn = document.getElementById('searchProcedureBtn');

    btnStart.style.display = 'none';
    btnComplete.style.display = 'none';
    // btnNext.style.display = 'none';
    site.disabled = false;
    searchBtn.disabled = false;

    if (currentState === 'Pending') {
        btnStart.style.display = 'inline-block';
    } else if (currentState === 'In progress') {
        btnComplete.style.display = 'inline-block';
        site.disabled = true;
        searchBtn.disabled = true;
    } else if (currentState === 'Completed') {
        // btnNext.style.display = 'inline-block';
        site.disabled = true;
        searchBtn.disabled = true;
    }
}

// // 다음 환자 이동
function goToCatalogPatient() {
    window.location.href = "/mstaff/hospital_dashboard/";
}

// 모달 닫기
function closeModal(id) {
    document.getElementById(id).style.visibility = 'hidden';
    document.querySelectorAll('#procedureResultTable tbody tr')
        .forEach(r => r.classList.remove('selected'));
}

// 모달 검색
async function treatmentPerformSearch(query) {
    const q = query;
    url = `/mstaff/treatment_data_search/?search=${q}`;

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

    confirmSelection();
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

document.getElementById('procedureNameInput').addEventListener('input', debouncedTreatmentPerformSearch)

// 초기 실행
document.addEventListener('DOMContentLoaded', updateButtonVisibility);
