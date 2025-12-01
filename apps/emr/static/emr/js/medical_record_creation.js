let selectedDrug = null;
window.prescriptionList = [];

/* 처방 추가 */
function addPrescription() {
    const name = document.getElementById('drugName').value;
    const code = document.getElementById('drugCode').value;
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;

    if (!name || !code) {
        alert("약품명을 먼저 선택하세요.");
        return;
    }

    window.prescriptionList.push({
        drug_name: name,
        drug_code: code,
        start_date: start,
        end_date: end
    });

    alert(`[${name}] 처방이 추가되었습니다.`);
}

/* DB 저장 */
async function saveRecord() {

    const note_special = document.querySelector('input[placeholder="특이사항을 직접 입력하세요"]').value;
    const note_type = document.querySelector('input[placeholder="기록유형을 직접 입력하세요"]').value;
    const patient_type = document.querySelector('select').value;

    const sNote = document.getElementById('sNote').value;
    const oNote = document.getElementById('oNote').value;
    const aNote = document.getElementById('aNote').value;
    const pNote = document.getElementById('pNote').value;

    const payload = {
        patient_id: 123,
        doctor_id: 5,
        note_special: note_special,
        note_type: note_type,
        patient_type: patient_type,
        soap: {
            s: sNote,
            o: oNote,
            a: aNote,
            p: pNote
        },
        prescriptions: window.prescriptionList
    };

    const res = await fetch("/api/medical-record/create/", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(payload)
    });

    alert(res.ok ? "DB 저장 완료" : "오류 발생");
}

/* 모달 */
function openDrugSearchModal() {
    document.getElementById('drugSearchModal').style.visibility = 'visible';
    selectedDrug = null;
    document.querySelectorAll('#drugResultTable tbody tr').forEach(r => r.classList.remove('selected'));
}

function performSearch() {
    const query = document.getElementById('drugNameInput').value;
    alert(`"${query}" 검색 실행`);
}

function selectDrug(row) {
    document.querySelectorAll('#drugResultTable tbody tr').forEach(r => r.classList.remove('selected'));
    row.classList.add('selected');

    selectedDrug = {
        code: row.getAttribute('data-code'),
        name: row.getAttribute('data-name')
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
