let selectedPatientId = null;

function searchPatients() {
    const query = document.getElementById('searchQuery').value;

    fetch(`/mstaff/api/today-patients/?q=${encodeURIComponent(query)}`)
        .then(res => res.json())
        .then(data => renderPatientList(data.patients));
}

function renderPatientList(patients) {
    const tbody = document.getElementById('patientListBody');
    tbody.innerHTML = "";

    patients.forEach(p => {
        const tr = document.createElement('tr');

        tr.onclick = () => selectPatient(
            tr,
            p.name,
            p.gender,
            p.dob,
            p.visit,
            p.dept,
            p.doctor,
            p.recent_diag,
            p.order_detail,
            p.patient_id
        );

        tr.innerHTML = `
            <td>${p.name}</td>
            <td>${p.gender}</td>
            <td>${p.dob}</td>
            <td>${p.visit}</td>
        `;

        tbody.appendChild(tr);
    });
}

function selectPatient(row, name, gender, dob, lastVisit, dept, doctor, recentDiag, orderDetail, patientId) {

    selectedPatientId = patientId;

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

    document.getElementById('summaryOrderExists').innerHTML =
        `<strong>오더 유무:</strong> ${orderDetail}`;
}

function goToCreateRecord() {
    if (!selectedPatientId) return;
    window.location.href = `/mstaff/medical_record/?patient_id=${selectedPatientId}`;
}

function goToPreviousRecords() {
    if (!selectedPatientId) return;
    window.location.href = `/mstaff/previous_records/?patient_id=${selectedPatientId}`;
}

