let selectedPatientId = null;

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("#patientTable tbody tr").forEach((row) => {
        applyRowFormatting(row);
        row.addEventListener("click", () => selectPatient(row));
    });
});

function applyRowFormatting(row) {
    const cells = row.querySelectorAll("td");
    if (cells.length < 6) return;

    const rawGender = row.dataset.gender || cells[3].textContent.trim();
    const rawBirth = row.dataset.birth || cells[4].textContent.trim();
    const rawRecent = row.dataset.recent || cells[5].textContent.trim();
    const rawDoctor = row.dataset.doctor || cells[2].textContent.trim();

    cells[3].textContent = formatGender(rawGender);
    cells[4].textContent = formatBirth(rawBirth);
    cells[5].textContent = formatKoreanDateTime(rawRecent);
    cells[2].textContent = rawDoctor && rawDoctor !== "-" ? rawDoctor : "-";
}

async function selectPatient(rowElement) {
    document.querySelectorAll('#patientTable tbody tr').forEach(row => {
        row.classList.remove('selected');
    });
    rowElement.classList.add('selected');

    const patientId = rowElement.dataset.patientId;
    selectedPatientId = patientId;

    try {
        const [summaryRes, recordsRes] = await Promise.all([
            fetch(`/mstaff/api/patient/summary/?patient_id=${patientId}`),
            fetch(`/mstaff/api/patient/${patientId}/recent-records/`)
        ]);

        if (!summaryRes.ok || !recordsRes.ok) {
            throw new Error("데이터를 불러오지 못했습니다.");
        }

        const summaryData = await summaryRes.json();
        const recordData = await recordsRes.json();

        const rowCells = rowElement.querySelectorAll("td");
        const fallbackName = rowCells[1] ? rowCells[1].textContent.trim() || "-" : "-";

        const summaryPatient = summaryData.patient || {};
        setText("pName", summaryPatient.name || fallbackName);
        setText("pGender", formatGender(summaryPatient.gender || rowElement.dataset.gender));
        setText("pDOB", formatBirth(summaryPatient.birth_date || rowElement.dataset.birth));
        setText("pRecentVisit", formatKoreanDateTime(summaryPatient.recent_visit || rowElement.dataset.recent));
        setText("pDept", summaryData.recent_dept || "-");
        setText("pDoctor", summaryData.recent_doctor || "-");

        updateConsultDetails(recordData.consult);
        setText("rPrescription", formatPrescriptionText(recordData.prescription));
        setText("rLab", formatLabText(recordData.lab));
        setText("rTreatment", formatTreatmentText(recordData.treatment));

        document.getElementById('selectedPatientDetails').style.display = 'block';
        window.scrollTo({
            top: document.body.scrollHeight,
            behavior: 'smooth'
        });
    } catch (error) {
        console.error(error);
        alert("환자 정보를 불러오는 중 오류가 발생했습니다.");
    }
}

function updateConsultDetails(consult) {
    setText("consultDate", consult ? formatKoreanDateTime(consult.record_datetime) : "-");
    setText("consultType", consult && consult.record_type ? consult.record_type : "-");
    setText("consultSubjective", consult && consult.subjective ? consult.subjective : "-");
    setText("consultObjective", consult && consult.objective ? consult.objective : "-");
    setText("consultAssessment", consult && consult.assessment ? consult.assessment : "-");
    setText("consultPlan", consult && consult.plan ? consult.plan : "-");
}

async function performSearch() {
    const keyword = document.getElementById('keyword').value.trim();

    // 검색어가 비어있으면 전체 목록(페이지네이션)으로 복귀
    if (!keyword) {
        window.location.href = "/mstaff/patient_search_list/";
        return;
    }

    try {
        const response = await fetch(`/mstaff/api/patient/search/?keyword=${encodeURIComponent(keyword)}`);
        if (!response.ok) {
            throw new Error("검색 요청에 실패했습니다.");
        }

        const data = await response.json();
        const tbody = document.querySelector('#patientTable tbody');
        tbody.innerHTML = "";

        if (!data.results || data.results.length === 0) {
            tbody.innerHTML = "<tr><td colspan='6'>검색 결과가 없습니다.</td></tr>";
            return;
        }

        data.results.forEach((p, index) => {
            const tr = document.createElement("tr");
            tr.dataset.patientId = p.user_id;
            tr.dataset.gender = p.gender || "";
            tr.dataset.birth = p.birth_date || "";
            tr.dataset.recent = p.recent_visit || "";
            tr.dataset.doctor = p.recent_doctor || "";

            tr.innerHTML = `
                <td>${index + 1}</td>
                <td>${p.name || "-"}</td>
                <td>${p.recent_doctor || "-"}</td>
                <td>${p.gender || "-"}</td>
                <td>${p.birth_date || "-"}</td>
                <td>${p.recent_visit || "-"}</td>
            `;

            tr.addEventListener("click", () => selectPatient(tr));
            applyRowFormatting(tr);
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error(error);
        alert("검색 중 오류가 발생했습니다.");
    }
}

function goToRecordPage() {
    if (!selectedPatientId) {
        alert("환자를 먼저 선택하세요.");
        return;
    }
    window.location.href = `/mstaff/record_inquiry/?patient_id=${selectedPatientId}`;
}

function formatGender(gender) {
    if (!gender) return "-";
    const upper = gender.toString().trim().toUpperCase();
    if (upper === "M") return "남";
    if (upper === "F" || upper === "W") return "여";
    return "-";
}

function formatBirth(raw) {
    if (!raw) return "-";
    if (raw.includes("년") && raw.includes("월")) return raw;

    const digits = raw.replace(/[^0-9]/g, "");
    if (digits.length === 8 && (raw.startsWith("19") || raw.startsWith("20") || digits.startsWith("19") || digits.startsWith("20"))) {
        return `${digits.slice(0,4)}년 ${digits.slice(4,6)}월 ${digits.slice(6,8)}일`;
    }

    if (digits.length < 7) return "-";

    const yy = digits.substring(0, 2);
    const mm = digits.substring(2, 4);
    const dd = digits.substring(4, 6);
    const centuryCode = digits.substring(6, 7);

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

function formatKoreanDate(dateStr) {
    if (!dateStr) return "-";
    if (dateStr.includes("년") && dateStr.includes("월")) return dateStr;

    const normalized = dateStr.replace(/[^0-9-T: ]/g, "").trim();
    const [year, month, day] = normalized.split("T")[0].split("-").map((part) => part || "");
    if (!year || !month || !day) return dateStr;
    return `${year.padStart(4, "0")}년 ${month.padStart(2, "0")}월 ${day.padStart(2, "0")}일`;
}

function formatKoreanDateTime(dateTimeStr) {
    if (!dateTimeStr) return "-";
    if (dateTimeStr.includes("년") && dateTimeStr.includes("월")) return dateTimeStr;

    const sanitized = dateTimeStr.replace("T", " ").trim();
    const [datePart, timePart] = sanitized.split(" ");

    const formattedDate = formatKoreanDate(datePart);
    if (!timePart) return formattedDate;

    const [hour = "00", minute = "00"] = timePart.split(":");
    return `${formattedDate} ${hour.padStart(2, "0")}시 ${minute.padStart(2, "0")}분`;
}

function formatPrescriptionText(prescription) {
    if (!prescription) return "-";
    const timeText = formatKoreanDateTime(prescription["order__order_datetime"]);
    const name = prescription.order_name || "-";
    const dose = prescription.dose || "-";
    const frequency = prescription.frequency || "-";
    return `${name} (${dose} / ${frequency})${timeText !== "-" ? ` - ${timeText}` : ""}`;
}

function formatLabText(lab) {
    if (!lab) return "-";
    const parts = [
        lab.lab_nm || "-",
        formatKoreanDateTime(lab.order_datetime),
        lab.status || "-"
    ];
    return parts.join(" / ");
}

function formatTreatmentText(treatment) {
    if (!treatment) return "-";
    const parts = [
        treatment.procedure_name || "-",
        formatKoreanDateTime(treatment.execution_datetime),
        treatment.status || "-"
    ];
    return parts.join(" / ");
}

function setText(elementId, value) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const text = value === null || value === undefined || value === "" ? "-" : value;
    el.textContent = text;
}
