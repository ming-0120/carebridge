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


async function performSearch() {
    const keyword = document.getElementById('keyword').value.trim();

    if (!keyword) {
        alert("검색어를 입력하세요.");
        return;
    }

    const response = await fetch(`/mstaff/api/patient/search/?keyword=${keyword}`);
    const data = await response.json();

    const tbody = document.querySelector('#patientTable tbody');
    tbody.innerHTML = ""; // 기존 목록 초기화

    if (!data.results || data.results.length === 0) {
        tbody.innerHTML = "<tr><td colspan='5'>검색 결과 없음</td></tr>";
        return;
    }

    data.results.forEach(p => {
        const tr = document.createElement("tr");
        tr.setAttribute("data-patient-id", p.user_id);
        tr.onclick = function () { selectPatient(this); };

        tr.innerHTML = `
            <td>정약용</td>
            <td>${p.name}</td>
            <td>${p.gender}</td>
            <td>${p.birth_date}</td>
            <td>최근 방문 없음</td>
        `;
        tbody.appendChild(tr);
    });
}

