function searchPatients() {
    const query = document.getElementById('searchQuery').value;
    alert(`"${query}"(으)로 환자 리스트를 조회합니다.`);
}

function selectPatient(row, name, gender, dob, lastVisit, dept, doctor, recentDiag, ordersExist) {

    document.querySelectorAll('#patientListBody tr')
        .forEach(r => r.classList.remove('selected'));

    row.classList.add('selected');

    document.getElementById('selectedPatientInfo').style.display = 'block';
    document.getElementById('actionButtons').style.display = 'flex';

    document.getElementById('summaryPatientInfo').innerHTML =
        `<strong>환자정보:</strong> ${name} | ${gender} | ${dob} | ${lastVisit}`;

    document.getElementById('summaryDepartment').textContent = dept;
    document.getElementById('summaryDoctor').textContent = doctor;

    document.getElementById('summaryRecentDiagnosis').textContent = recentDiag;

    document.getElementById('summaryOrderExists').innerHTML = ordersExist
        ? `<strong>오더 유무:</strong> <span style="color:#dc3545;font-weight:bold;">처방·검사 있음</span>`
        : `<strong>오더 유무:</strong> 없음`;
}

function goToCreateRecord() {
    alert('진료기록작성 페이지로 이동합니다.');
}

function goToPreviousRecords() {
    alert('이전 진료기록 보기 페이지로 이동합니다.');
}
