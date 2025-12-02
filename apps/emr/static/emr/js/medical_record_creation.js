/* --------------------------
   전역 리스트
-------------------------- */
let prescriptionList = [];
let orderList = [];

/* --------------------------
   처방 추가
-------------------------- */
function addPrescription() {
    const name = document.getElementById('drugName').value;
    const code = document.getElementById('drugCode').value;
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;
    const freq = document.getElementById('freqInput').value;
    const dose = document.getElementById('doseInput').value;
    const note = document.getElementById('noteInput').value;

    if (!name || !code) {
        alert("약품명을 먼저 선택하세요.");
        return;
    }

    const data = {
        drug_name: name,
        drug_code: code,
        start_date: start,
        end_date: end,
        frequency: freq,
        dose: dose,
        note: note
    };

    prescriptionList.push(data);

    document.getElementById('prescriptions').value = JSON.stringify(prescriptionList);

    alert(`[${name}] 처방이 추가되었습니다.`);
}

/* --------------------------
   폼 제출
-------------------------- */
function prepareSubmit() {
    document.getElementById('orders').value = JSON.stringify(orderList);
    document.getElementById('recordForm').submit();
}

/* --------------------------
   약품 검색 모달
-------------------------- */
let selectedDrug = null;

function openDrugSearchModal() {
    document.getElementById('drugSearchModal').style.visibility = 'visible';
    selectedDrug = null;
    document.querySelectorAll('#drugResultTable tbody tr')
        .forEach(r => r.classList.remove('selected'));
}

function performSearch() {
    const query = document.getElementById('drugNameInput').value;
    alert(`"${query}" 검색 실행`);
}

function selectDrug(row) {
    document.querySelectorAll('#drugResultTable tbody tr')
        .forEach(r => r.classList.remove('selected'));

    row.classList.add('selected');

    selectedDrug = {
        code: row.dataset.code,
        name: row.dataset.name
    };
}

function confirmSelection() {
    if (!selectedDrug) {
        alert("약품을 선택하세요.");
        return;
    }

    document.getElementById('drugName').value = selectedDrug.name;
    document.getElementById('drugCode').value = selectedDrug.code;

    closeModal('drugSearchModal');
}

function closeModal(id) {
    document.getElementById(id).style.visibility = 'hidden';
}
