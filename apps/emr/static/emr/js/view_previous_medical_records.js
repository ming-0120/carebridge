let records = [];

document.addEventListener("DOMContentLoaded", () => {
    stripBracketsFromHeadings();
    const userId = PATIENT_ID;

    fetch(`/mstaff/api/previous-records/${userId}/`)
        .then(res => res.json())
        .then(data => {
            records = data.records;
            loadRecordList();
        });
});

function stripBracketsFromHeadings() {
    document.querySelectorAll('h3, h4').forEach((el) => {
        const t = el.textContent;
        if (!t) return;
        el.textContent = t.replace(/\[/g, '').replace(/\]/g, '').trim();
    });
}

// ---------------------------------------------
// 1) 이전 진료기록 목록 생성
// ---------------------------------------------
function loadRecordList() {
    const listContent = document.querySelector('#recordList .list-content');
    listContent.innerHTML = '';

    records.forEach(rec => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.dataset.id = rec.medical_record_id;

        item.innerHTML = `
            ${formatKoreanDateTime(rec.record_datetime)}
            <br>
            <span style="color:#555;">진료유형: ${rec.record_type}</span>
        `;

        item.onclick = () => selectRecord(item, rec);
        listContent.appendChild(item);
    });

    if (records.length > 0) {
        selectRecord(document.querySelector('.list-item'), records[0]);
    }
}

// ---------------------------------------------
// 2) 상세보기 (SOAP + 오더 요약)
// ---------------------------------------------
function selectRecord(selectedItem, record) {

    document.querySelectorAll('.list-item').forEach(i => i.classList.remove('selected'));
    selectedItem.classList.add('selected');

    document.getElementById("soapDetail").innerHTML = `
        <div class="read-only-text">
            <div class="soap-section">
                <strong>[S]</strong>
                <div class="soap-section-text">${record.subjective || ''}</div>
            </div>
            <div class="soap-section">
                <strong>[O]</strong>
                <div class="soap-section-text">${record.objective || ''}</div>
            </div>
            <div class="soap-section">
                <strong>[A]</strong>
                <div class="soap-section-text">${record.assessment || ''}</div>
            </div>
            <div class="soap-section">
                <strong>[P]</strong>
                <div class="soap-section-text">${record.plan || ''}</div>
            </div>
        </div>
    `;

    updateOrderSummaries(record);
}

// ---------------------------------------------
// 3) 치료 / 검사 / 처방 요약
// ---------------------------------------------
function updateOrderSummaries(record) {

    // 치료 요약
    if (record.treatment.length > 0) {
        const t = record.treatment[0];
        document.getElementById('treatmentSummary').innerHTML = `
            <div class="order-content-row"><strong>처치명:</strong> ${t.procedure_name}</div>
            <div class="order-content-row"><strong>상태:</strong> ${t.status}</div>
            <button class="detail-button detail-treatment">자세히 보기</button>
        `;
    } else {
        document.getElementById('treatmentSummary').innerHTML =
            `<p style="color:#777;">등록된 치료기록 없음</p>`;
    }

    // 검사 요약
    if (record.lab.length > 0) {
        const lb = record.lab[0];
        document.getElementById('labOrderSummary').innerHTML = `
            <div class="order-content-row"><strong>항목:</strong> ${lb.lab_nm}</div>
            <div class="order-content-row"><strong>검체:</strong> ${lb.specimen_cd}</div>
            <div class="order-content-row"><strong>상태:</strong> ${lb.status}</div>
            <button class="detail-button detail-lab">자세히 보기</button>
        `;
    } else {
        document.getElementById('labOrderSummary').innerHTML =
            `<p style="color:#777;">등록된 검사오더 없음</p>`;
    }

    // 처방 요약
    if (record.prescriptions.length > 0) {
        const p = record.prescriptions[0];
        document.getElementById('prescriptionSummary').innerHTML = `
            <div class="order-content-row"><strong>약품명:</strong> ${p.order_name}</div>
            <div class="order-content-row"><strong>용량:</strong> ${p.dose}</div>
            <div class="order-content-row"><strong>횟수:</strong> ${p.frequency}</div>
            <button class="detail-button detail-prescription">자세히 보기</button>
        `;
    } else {
        document.getElementById('prescriptionSummary').innerHTML =
            `<p style="color:#777;">등록된 처방 없음</p>`;
    }

    // 이벤트 등록
    const tBtn = document.querySelector('.detail-treatment');
    if (tBtn) tBtn.onclick = () => openDetailModal('treatment', record);

    const lBtn = document.querySelector('.detail-lab');
    if (lBtn) lBtn.onclick = () => openDetailModal('lab', record);

    const pBtn = document.querySelector('.detail-prescription');
    if (pBtn) pBtn.onclick = () => openDetailModal('prescription', record);
}

// ---------------------------------------------
// 4) 날짜 포맷
// ---------------------------------------------
function formatDate(dt) {
    const dateObj = toDateObject(dt);
    if (!dateObj) return "";
    return buildDateString(dateObj);
}

function formatCompletionDate(dt) {
    const dateObj = toDateObject(dt);
    if (!dateObj) return "";
    const adjusted = new Date(dateObj.getTime());
    adjusted.setHours(adjusted.getHours() + 1);
    adjusted.setMinutes(0, 0, 0);
    return buildDateString(adjusted);
}

function toDateObject(dt) {
    if (!dt) return null;
    if (dt instanceof Date) return dt;

    let normalized = dt.toString().trim();
    if (normalized.includes("T")) {
        // leave as is
    } else if (normalized.includes(" ")) {
        normalized = normalized.replace(" ", "T");
    }

    let parsed = new Date(normalized);
    if (isNaN(parsed)) {
        parsed = new Date(dt);
    }

    return isNaN(parsed) ? null : parsed;
}

function buildDateString(dateObj) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    const hour = String(dateObj.getHours()).padStart(2, "0");
    const minute = String(dateObj.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day} ${hour}:${minute}`;
}

function formatKoreanDateTime(dt) {
    const dateObj = toDateObject(dt);
    if (!dateObj) return "";
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    const hour = String(dateObj.getHours()).padStart(2, "0");
    const minute = String(dateObj.getMinutes()).padStart(2, "0");
    return `${year}년 ${month}월 ${day}일 ${hour}시 ${minute}분`;
}

function formatPrescriptionEnd(startDt, endDt) {
    const start = toDateObject(startDt);
    if (start) {
        const adjusted = new Date(start.getTime());
        adjusted.setHours(adjusted.getHours() + 1);
        adjusted.setMinutes(0, 0, 0);
        return buildDateString(adjusted);
    }
    const end = toDateObject(endDt);
    if (end) {
        end.setMinutes(0, 0, 0);
        return buildDateString(end);
    }
    return "";
}

// ---------------------------------------------
// 5) 모달 상세 데이터 바인딩
// ---------------------------------------------
function openDetailModal(type, record) {

    document.querySelectorAll('.modal-overlay').forEach(m => m.style.visibility = 'hidden');

    // 치료 상세
    if (type === 'treatment' && record.treatment.length > 0) {
        const t = record.treatment[0];

        document.getElementById("treat_name").innerText = t.procedure_name || "";
        document.getElementById("treat_code").innerText = t.procedure_code || "";
        document.getElementById("treat_site").innerText = t.treatment_site || "";
        document.getElementById("treat_exec").innerText = formatDate(t.execution_datetime);
        document.getElementById("treat_done").innerText = formatCompletionDate(t.completion_datetime);
        document.getElementById("treat_status").innerText = t.status || "";
        document.getElementById("treat_note").innerText = t.result_notes || "";
        document.getElementById("treat_doctor").innerText = record.doctor_name || "";

        document.getElementById('treatmentDetailModal').style.visibility = 'visible';
        return;
    }

    // 검사 상세
    if (type === 'lab' && record.lab.length > 0) {
        const lb = record.lab[0];

        document.getElementById("lab_name").innerText = lb.lab_nm || "";
        document.getElementById("lab_code").innerText = lb.lab_cd || "";
        document.getElementById("lab_specimen").innerText = lb.specimen_cd || "";
        document.getElementById("lab_order_dt").innerText = formatDate(lb.order_datetime);
        document.getElementById("lab_status").innerText = lb.status || "";
        document.getElementById("lab_status_dt").innerText = formatDate(lb.status_datetime);
        document.getElementById("lab_emergency").innerText = lb.is_urgent ? "예" : "아니오";
        document.getElementById("lab_note").innerText = lb.requisition_note || "";
        document.getElementById("lab_doctor").innerText = record.doctor_name || "";

        const attachments = Array.isArray(lb.attachments) ? lb.attachments : [];
        const attachmentList = document.getElementById("lab_attachments");
        attachmentList.innerHTML = attachments.length
            ? attachments.map(a => `<li><a href="${a.url}" target="_blank" rel="noopener">${a.name || '파일'}</a></li>`).join("")
            : `<li style="color:#777;">첨부 없음</li>`;

        document.getElementById('labDetailModal').style.visibility = 'visible';
        return;
    }

    // 처방 상세
    if (type === 'prescription' && record.prescriptions.length > 0) {
        const p = record.prescriptions[0];

        document.getElementById("drug_name").innerText = p.order_name || "";
        document.getElementById("drug_code").innerText = p.order_code || "";
        document.getElementById("drug_dose").innerText = p.dose || "";
        document.getElementById("drug_freq").innerText = p.frequency || "";

        document.getElementById("drug_order_dt").innerText = formatDate(p.order_datetime);
        document.getElementById("drug_start_dt").innerText = formatDate(p.start_datetime);
        document.getElementById("drug_end_dt").innerText = formatPrescriptionEnd(p.start_datetime, p.end_datetime);
        document.getElementById("drug_status").innerText = p.status || "";
        document.getElementById("drug_note").innerText = p.notes || "";
        document.getElementById("drug_doctor").innerText = record.doctor_name || "";

        document.getElementById('prescriptionDetailModal').style.visibility = 'visible';
    }
}

// ---------------------------------------------
// 6) 모달 닫기
// ---------------------------------------------
function closeModal(id) {
    document.getElementById(id).style.visibility = 'hidden';
}
