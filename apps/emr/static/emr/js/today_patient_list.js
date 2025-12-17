const params = new URLSearchParams(window.location.search);
const doctorId = params.get("doctor_id");
const date = params.get("date");

document.addEventListener("DOMContentLoaded", () => {
    if (doctorId && date) {
        loadPatients(doctorId, date);
    }
});

async function loadPatientSummary(patientId, slotId) {
    const url = `/mstaff/api/patient/summary/?patient_id=${patientId}`;
    const res = await fetch(url);
    const data = await res.json();

    const genderText = formatGender(data.patient.gender);
    const birthText = formatToKoreanDate(data.patient.birth_date);
    const recentVisitText = formatToKoreanDateTime(data.patient.recent_visit);
    const recentConsult = data.recent_consult || null;
    const recentConsultDate = recentConsult ? formatToKoreanDateTime(recentConsult.record_datetime) : null;

    document.getElementById("summaryPanel").innerHTML = `
        <div class="detail-action-container">
            <div class="selected-patient-info">
                <div class="info-row"><strong>환자명</strong> ${data.patient.name}</div>
                <div class="info-row"><strong>성별</strong> ${genderText}</div>
                <div class="info-row"><strong>생년월일</strong> ${birthText}</div>
                <div class="info-row"><strong>최근 방문</strong> ${recentVisitText}</div>

                <div class="summary-block">
                    <div class="info-row"><strong>진료과</strong> ${data.recent_dept || "-"}</div>
                    <div class="info-row"><strong>담당의</strong> ${data.recent_doctor || "-"}</div>
                </div>

                <div class="summary-block">
                    <strong>최근 진료</strong><br>
                    <div class="info-row"><strong>일시</strong> ${recentConsult ? recentConsultDate : "-"}</div>
                    <div class="info-row"><strong>유형</strong> ${(recentConsult && recentConsult.record_type) || "-"}</div>
                    <div class="info-row"><strong>S</strong> ${(recentConsult && recentConsult.subjective) || "-"}</div>
                    <div class="info-row"><strong>O</strong> ${(recentConsult && recentConsult.objective) || "-"}</div>
                    <div class="info-row"><strong>A</strong> ${(recentConsult && recentConsult.assessment) || "-"}</div>
                    <div class="info-row"><strong>P</strong> ${(recentConsult && recentConsult.plan) || "-"}</div>
                </div>
            </div>

            <div class="action-buttons">
                <button class="btn-create" onclick="goToMedicalRecord(${patientId}, ${slotId || "null"})">진료 기록 작성</button>
                <button class="btn-history" onclick="goToHistory(${patientId})">이전 진료 기록</button>
            </div>
        </div>
    `;

    window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: "smooth"
    });
}

async function loadPatients(doctorId, date) {
    const url = `/mstaff/get_reservation_medical_record/?date=${date}&doctor_id=${doctorId}`;
    const response = await fetch(url);
    const data = await response.json();

    const list = data.users;
    const tbody = document.getElementById("patientListBody");
    tbody.innerHTML = "";

    list.forEach((item, index) => {
        const u = item.user;
        const s = item.slot;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${u.name}</td>
            <td>${formatGender(u.gender)}</td>
            <td>${formatBirth(u.resident_reg_no)}</td>
            <td>${s.start_time.substring(0, 5)}</td>
        `;

        tr.onclick = () => {
            loadPatientSummary(u.user_id, s.slot_id);
        };

        tbody.appendChild(tr);
    });
}

function formatGender(gender) {
    if (gender === "M") return "남";
    if (gender === "F" || gender === "W") return "여";
    return "-";
}

function formatBirth(rrn) {
    if (!rrn) return "-";
    const num = String(rrn).replace(/[^0-9]/g, "");
    if (num.length < 7) return "-";

    const yy = num.substring(0, 2);
    const mm = num.substring(2, 4);
    const dd = num.substring(4, 6);
    const centuryCode = num.substring(6, 7);

    let century;
    if (["1", "2", "5", "6"].includes(centuryCode)) {
        century = "19";
    } else if (["3", "4", "7", "8"].includes(centuryCode)) {
        century = "20";
    } else if (["9", "0"].includes(centuryCode)) {
        century = "18";
    } else {
        return "-";
    }

    return `${century}${yy}년 ${mm}월 ${dd}일`;
}

function formatToKoreanDate(dateStr) {
    if (!dateStr) return "-";
    const [year, month, day] = dateStr.split("-");
    if (!year || !month || !day) return dateStr;
    return `${year}년 ${month}월 ${day}일`;
}

function formatToKoreanDateTime(dateTimeStr) {
    if (!dateTimeStr) return "-";

    // Already formatted like: "2025년 12월 19일 00시 00분"
    if (dateTimeStr.includes("년") && dateTimeStr.includes("월") && dateTimeStr.includes("일")) {
        const m = String(dateTimeStr).match(
            /(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일(?:\s*(\d{1,2})\s*시\s*(\d{1,2})\s*분)?/
        );
        if (m) {
            const year = m[1];
            const month = String(m[2]).padStart(2, "0");
            const day = String(m[3]).padStart(2, "0");
            const hour = m[4] !== undefined ? String(m[4]).padStart(2, "0") : null;
            const minute = m[5] !== undefined ? String(m[5]).padStart(2, "0") : null;

            const dateOnly = `${year}년 ${month}월 ${day}일`;
            if (!hour || !minute) return dateOnly;
            if (Number(hour) === 0 && Number(minute) === 0) return dateOnly;
            return `${dateOnly} ${hour}시 ${minute}분`;
        }

        return dateTimeStr;
    }

    // ISO-like: "YYYY-MM-DD HH:MM(:SS)" or "YYYY-MM-DDTHH:MM"
    const sanitized = String(dateTimeStr).replace("T", " ").trim();
    const [datePart, timePart] = sanitized.split(" ");
    if (!datePart) return dateTimeStr;

    const formattedDate = formatToKoreanDate(datePart);
    if (!timePart) return formattedDate;

    const [hour = "00", minute = "00"] = timePart.split(":");
    const hh = String(hour).padStart(2, "0");
    const mm = String(minute).padStart(2, "0");
    if (Number(hh) === 0 && Number(mm) === 0) return formattedDate;
    return `${formattedDate} ${hh}시 ${mm}분`;
}

function goToMedicalRecord(patientId, slotId) {
    const params = new URLSearchParams();
    params.set("patient_id", patientId);
    if (slotId) params.set("slot_id", slotId);
    if (doctorId) params.set("doctor_id", doctorId);
    if (date) params.set("date", date);

    window.location.href = `/mstaff/medical_record/?${params.toString()}`;
}

function goToHistory(patientId) {
    window.location.href = `/mstaff/previous_records/?patient_id=${patientId}`;
}
