// -------------------------------
// URL 파라미터에서 doctor_id, date 읽기
// -------------------------------
const params = new URLSearchParams(window.location.search);
const doctorId = params.get("doctor_id");
const date = params.get("date");

// doctorId, date가 정상일 때 환자 목록 로드
document.addEventListener("DOMContentLoaded", () => {
    if (doctorId && date) {
        loadPatients(doctorId, date);
    }
});

async function loadPatientSummary(patientId) {
    const url = `/mstaff/api/patient/summary/?patient_id=${patientId}`;
    const res = await fetch(url);
    const data = await res.json();

    document.getElementById("summaryPanel").innerHTML = `
        <div class="detail-action-container">

            <div class="selected-patient-info">

                <div class="info-row">
                    <strong>환자명</strong> ${data.patient.name}
                </div>

                <div class="info-row">
                    <strong>성별</strong> ${data.patient.gender}
                </div>

                <div class="info-row">
                    <strong>생년월일</strong> ${data.patient.birth_date}
                </div>

                <div class="info-row">
                    <strong>최근 방문</strong> ${data.patient.recent_visit || "기록 없음"}
                </div>

                <div class="summary-block">
                    <div class="info-row">
                        <strong>진료과</strong> ${data.recent_dept}
                    </div>

                    <div class="info-row">
                        <strong>담당의</strong> ${data.recent_doctor}
                    </div>
                </div>

                <div class="summary-block">
                    <strong>최근 진료</strong><br>
                    ${
                        data.recent_consult
                        ? `
                            <div class="info-row"><strong>일시</strong> ${data.recent_consult.record_datetime}</div>
                            <div class="info-row"><strong>유형</strong> ${data.recent_consult.record_type}</div>
                            <div class="info-row"><strong>S</strong> ${data.recent_consult.subjective || "-"}</div>
                            <div class="info-row"><strong>O</strong> ${data.recent_consult.objective || "-"}</div>
                            <div class="info-row"><strong>A</strong> ${data.recent_consult.assessment || "-"}</div>
                            <div class="info-row"><strong>P</strong> ${data.recent_consult.plan || "-"}</div>
                        `
                        : `<div class="info-row">최근 진료 없음</div>`
                    }
                </div>

            </div>

            <div class="action-buttons">
                <button class="btn-create" onclick="goToMedicalRecord(${patientId})">진료 기록 작성</button>
                <button class="btn-history" onclick="goToHistory(${patientId})"> 이전 진료 기록</button>
            </div>

        </div>
    `;
}

async function loadPatients(doctorId, date) {

    document.getElementById("targetInfo").innerHTML =
        `의사 번호: ${doctorId} | 예약 날짜: ${date}`;

    const url = `/mstaff/get_reservation_medical_record/?date=${date}&doctor_id=${doctorId}`;
    const response = await fetch(url);
    const data = await response.json();

    const list = data.users;
    const tbody = document.getElementById("patientListBody");
    tbody.innerHTML = "";

    list.forEach(item => {
        const u = item.user;
        const s = item.slot;

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${u.name}</td>
            <td>${u.gender === "F" ? "여" : "남"}</td>
            <td>${formatBirth(u.resident_reg_no)}</td>
            <td>${s.start_time.substring(0, 5)}</td>
        `;

        tr.onclick = () => {
            loadPatientSummary(u.user_id);   // 요약 패널 열기
        };

        tbody.appendChild(tr);
    });
}

function formatBirth(rrn) {
    const num = rrn.replace(/[^0-9]/g, "");
    return `${num.substring(0,4)}-${num.substring(4,6)}-${num.substring(6,8)}`;
}

function goToMedicalRecord(patientId) {
    window.location.href = `/mstaff/medical_record/?patient_id=${patientId}`;
}

function goToHistory(patientId) {
    window.location.href = `/mstaff/record_inquiry/?patient_id=${patientId}`;
}
