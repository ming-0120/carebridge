function selectPatient(rowElement) {

    document.querySelectorAll('#patientTable tbody tr').forEach(row => {
        row.classList.remove('selected');
    });

    rowElement.classList.add('selected');

    const cells = rowElement.querySelectorAll('td');
    const name = cells[1].textContent;
    const gender = cells[2].textContent;
    const dob = cells[3].textContent;
    const patientId = rowElement.getAttribute('data-patient-id');

    document.getElementById('pName').textContent = name;
    document.getElementById('pGender').textContent = gender;
    document.getElementById('pDOB').textContent = dob;

    if (patientId === 'P0000001') {
        document.getElementById('rConsult').textContent = '2025-03-14 / consult_note / 완료';
        document.getElementById('rPrescription').textContent = 'Amoxicillin / 2025-03-13 / 투여완료';
        document.getElementById('rLab').textContent = 'CBC / 2025-03-12 / 일반검사';
        document.getElementById('rTreatment').textContent = 'Dressing / 2025-03-10 / 완료';
    } else {
        document.getElementById('rConsult').textContent = '최근 진료 기록 없음';
        document.getElementById('rPrescription').textContent = '최근 처방 기록 없음';
        document.getElementById('rLab').textContent = '최근 검사 기록 없음';
        document.getElementById('rTreatment').textContent = '최근 치료 기록 없음';
    }

    document.getElementById('selectedPatientDetails').style.display = 'block';
}


function performSearch() {
    const keyword = document.getElementById('keyword').value;
    alert(`"${keyword}"로 환자 검색을 실행합니다.`);
}


function goToRecordPage() {
    const selectedRow = document.querySelector('#patientTable tr.selected');

    if (selectedRow) {
        const patientId = selectedRow.getAttribute('data-patient-id');
        const patientName = document.getElementById('pName').textContent;

        alert(`환자(${patientName}, ${patientId})의 진료기록 조회 화면으로 이동합니다.`);
    } else {
        alert('조회할 환자를 먼저 선택하십시오.');
    }
}
