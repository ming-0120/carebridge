/* Level 1 - Visit Box Toggle */
function toggleAccordionBox(header, contentId) {
    const content = document.getElementById(contentId);
    const isExpanded = header.getAttribute("aria-expanded") === "true";

    document.querySelectorAll(".visit-box-header[aria-expanded='true']").forEach(h => {
        if (h !== header) {
            h.setAttribute("aria-expanded", "false");
            h.nextElementSibling.style.display = "none";
        }
    });

    document.querySelectorAll(".level-3-detail").forEach(d => d.classList.remove("selected"));
    document.getElementById("detailView").style.display = "none";

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
    const content = row.nextElementSibling;
    const isExpanded = row.getAttribute("aria-expanded") === "true";

    if (isExpanded) {
        row.setAttribute("aria-expanded", "false");
        content.style.display = "none";
    } else {
        row.setAttribute("aria-expanded", "true");
        content.style.display = "block";
    }
}

/* Show Level 3 detail → update detail panel */
function showDetail(el) {

    document.querySelectorAll(".level-3-detail").forEach(d => d.classList.remove("selected"));
    el.classList.add("selected");

    const type = el.getAttribute("data-type");
    const date = el.getAttribute("data-date");
    const doc = el.getAttribute("data-doc");
    const recType = el.getAttribute("data-rec-type");
    const content = el.getAttribute("data-content");
    const status = el.getAttribute("data-status");
    const notes = el.getAttribute("data-notes") || "(해당되는 경우)";

    const detail = document.getElementById("detailContent");

    detail.innerHTML = `
        <div class="detail-item"><strong>■이벤트타입:</strong> ${type}</div>
        <div class="detail-item"><strong>■작성일시:</strong> ${date}</div>
        <div class="detail-item"><strong>■담당의사:</strong> ${doc}</div>
        <br>
        <h4>[상세 데이터]</h4>
        <div class="detail-item">- <strong>record_type:</strong> ${recType}</div>
        <div class="detail-item">- <strong>record_content:</strong> ${content}</div>
        <div class="detail-item">- <strong>status:</strong> ${status}</div>
        <div class="detail-item">- <strong>notes:</strong> ${notes}</div>
    `;

    document.getElementById("detailView").style.display = "block";
}
