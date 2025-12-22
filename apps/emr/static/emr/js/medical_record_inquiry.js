/* Level 1 - Visit Box Toggle */
function toggleAccordionBox(header, contentId) {
    const content = document.getElementById(contentId);
    const isExpanded = header.getAttribute("aria-expanded") === "true";

    // Level-3 초기화
    document.querySelectorAll(".level-3-detail").forEach(d => d.classList.remove("selected"));
    document.getElementById("detailView").style.display = "none";

    // 현재 박스만 열고/닫기
    if (isExpanded) {
        header.setAttribute("aria-expanded", "false");
        content.style.display = "none";
    } else {
        header.setAttribute("aria-expanded", "true");
        content.style.display = "block";
    }
}


/* Level 2 Toggle */
function toggleAccordion(row) {
    const container = row.closest(".visit-box-wrapper");  // 같은 박스 범위 기준
    const content = row.nextElementSibling;
    const isExpanded = row.getAttribute("aria-expanded") === "true";

    // 같은 박스 안의 다른 level-2 항목 접기
    container.querySelectorAll(".level-2-item[aria-expanded='true']").forEach(item => {
        if (item !== row) {
            item.setAttribute("aria-expanded", "false");
            item.nextElementSibling.style.display = "none";
        }
    });

    // 현재 항목 열기/닫기 처리
    if (isExpanded) {
        row.setAttribute("aria-expanded", "false");
        content.style.display = "none";
    } else {
        row.setAttribute("aria-expanded", "true");
        content.style.display = "block";
    }
}


/* Show Level 3 detail + update detail panel */
function showDetail(el) {

    document.querySelectorAll(".level-3-detail").forEach(d => d.classList.remove("selected"));
    el.classList.add("selected");

    const normalizeValue = (value) => {
        const trimmed = value === null || value === undefined ? "" : String(value).trim();
        if (!trimmed) return "-";
        const lowered = trimmed.toLowerCase();
        if (lowered === "none" || lowered === "null" || lowered === "undefined") return "-";
        return trimmed;
    };

    const type = normalizeValue(el.getAttribute("data-type"));
    const date = normalizeValue(el.getAttribute("data-date"));
    const doc = normalizeValue(el.getAttribute("data-doc"));
    const recType = normalizeValue(el.getAttribute("data-rec-type"));
    const content = normalizeValue(el.getAttribute("data-content"));
    const status = normalizeValue(el.getAttribute("data-status"));
    const notes = normalizeValue(el.getAttribute("data-notes"));
    const drugName = normalizeValue(el.getAttribute("data-drug-name"));
    const drugCode = normalizeValue(el.getAttribute("data-drug-code"));
    const drugFrequency = normalizeValue(el.getAttribute("data-drug-frequency"));
    const drugDose = normalizeValue(el.getAttribute("data-drug-dose"));
    const attachmentsRaw = el.getAttribute("data-attachments");

    let attachments = [];
    if (attachmentsRaw) {
        try {
            attachments = JSON.parse(attachmentsRaw);
        } catch (e) {
            attachments = [];
        }
    }

    const detail = document.getElementById("detailContent");

    const isPrescription = type === "처방" || el.hasAttribute("data-drug-name") || el.hasAttribute("data-drug-code");

    let detailHtml = "";
    if (isPrescription) {
        detailHtml = `
            <div class="detail-item"><strong>이벤트 유형</strong> ${type}</div>
            <div class="detail-item"><strong>발생 일시</strong> ${date}</div>
            <div class="detail-item"><strong>담당 의사</strong> ${doc}</div>
            <br>
            <h4>상세 내용</h4>
            <div class="detail-item"><strong>약명</strong> ${drugName}</div>
            <div class="detail-item"><strong>약품코드</strong> ${drugCode}</div>
            <div class="detail-item"><strong>투여빈도</strong> ${drugFrequency}</div>
            <div class="detail-item"><strong>투여용량</strong> ${drugDose}</div>
            <div class="detail-item"><strong>특이사항</strong> ${notes}</div>
        `;
    } else {
        const attachmentHtml = attachments.length
            ? `<div class="detail-item"><strong>첨부파일</strong><ul class="attachment-list">${attachments.map(a => `<li><a href="${a.url}" target="_blank" rel="noopener">${a.name || '파일'}</a></li>`).join("")}</ul></div>`
            : "";

        detailHtml = `
            <div class="detail-item"><strong>이벤트 유형</strong> ${type}</div>
            <div class="detail-item"><strong>발생 일시</strong> ${date}</div>
            <div class="detail-item"><strong>담당 의사</strong> ${doc}</div>
            <br>
            <h4>상세 내용</h4>
            <div class="detail-item"><strong>record_type</strong> ${recType}</div>
            <div class="detail-item"><strong>record_content</strong> ${content}</div>
            <div class="detail-item"><strong>status</strong> ${status}</div>
            <div class="detail-item"><strong>notes</strong> ${notes}</div>
            ${attachmentHtml}
        `;
    }

    detail.innerHTML = detailHtml;

    const detailCard = document.getElementById("detailView");
    detailCard.style.display = "block";

    // 선택된 이벤트 상세정보 영역으로 자동 스크롤
    detailCard.scrollIntoView({ behavior: "smooth", block: "start" });
}
