/* --------------------------
   전역 변수
-------------------------- */
let prescriptionList = [];
let currentDrugBlock = null;
let selectedDrug = null;

/* --------------------------
   처방 입력칸 추가
-------------------------- */
function addPrescriptionForm() {

    const container = document.getElementById("prescriptionContainer");

    const block = document.createElement("div");
    block.classList.add("prescription-block");

    block.innerHTML = `
        <div class="prescription-row">

            <div class="form-group">
                <label>약품명</label>
                <div class="drug-input-wrap">
                    <input type="text" class="drugName" placeholder="약품명을 입력하세요" readonly>
                    <button type="button" class="search-btn-5page" onclick="openDrugSearchModal(this)">검색</button>
                </div>
            </div>

            <div class="form-group">
                <label>약품 표준코드</label>
                <input type="text" class="drugCode" disabled>
            </div>

            <div class="form-group">
                <label>투여 빈도</label>
                <input type="text" class="freqInput">
            </div>

            <div class="form-group">
                <label>투여 용량</label>
                <input type="text" class="doseInput">
            </div>

            <div class="form-group">
                <label>특이사항</label>
                <input type="text" class="noteInput">
            </div>

            <button type="button" class="btn-remove" onclick="removePrescriptionBlock(this)">
                삭제
            </button>

        </div>
    `;

    container.appendChild(block);
}

/* --------------------------
   처방 입력칸 삭제
-------------------------- */
function removePrescriptionBlock(btn) {
    btn.closest(".prescription-block").remove();
}

/* --------------------------
   submit 전 데이터 정리
-------------------------- */
async function prepareSubmit() {

    /* 기존 JSON 생성/숨겨진 필드 저장 로직은 그대로 유지 */
    const blocks = document.querySelectorAll(".prescription-block");
    prescriptionList = [];

    blocks.forEach(block => {
        const name = block.querySelector(".drugName").value;
        const code = block.querySelector(".drugCode").value;
        const freq = block.querySelector(".freqInput").value;
        const dose = block.querySelector(".doseInput").value;
        const note = block.querySelector(".noteInput").value;

        if (!name || !code) return;

        prescriptionList.push({
            drug_name: name,
            drug_code: code,
            frequency: freq,
            dose: dose,
            note: note
        });
    });

    /* ------------------------
       2) 검사/치료 오더 JSON 생성
    ------------------------ */

    const orderType = document.getElementById("orderType").value;
    const emergencyFlag = document.querySelector("input[name='emergency_flag']:checked")?.value || null;

    const globalStart = document.getElementById("globalStartDate").value;
    const globalEnd = document.getElementById("globalEndDate").value;

    // dict 형태로 강제 — Django의 json.loads() → dict OK
    const orderObject = {
        start_date: globalStart,
        end_date: globalEnd,
        order_type: orderType || null,
        emergency_flag: emergencyFlag
    };

    /* ------------------------
       3) 숨겨진 필드에 JSON 문자열 저장
    ------------------------ */
    document.getElementById("prescriptions").value = JSON.stringify(prescriptionList);
    document.getElementById("orders").value = JSON.stringify(orderObject);

    // --- 여기부터 수정 ---
    const form = document.getElementById("recordForm");
    const formData = new FormData(form);

    const response = await fetch("/mstaff/api/medical-record/create/", {
        method: "POST",
        body: formData
    });

    const data = await response.json();

    if (response.status === 400 && data.error) {
        alert(data.error);   // 이미 예약된 시간입니다
        return;
    }

    alert("저장되었습니다.");

    // 필요 시 상세 페이지로 이동 (URL은 원하는 구조로 교체 가능)
    // window.location.href = `/mstaff/medical-record/${data.medical_record_id}/detail/`;
}


/* --------------------------
   약품 검색 모달
-------------------------- */
function openDrugSearchModal(btn) {
    currentDrugBlock = btn.closest(".prescription-block");
    selectedDrug = null;

    document.getElementById("drugSearchModal").style.visibility = "visible";

    // 기존 선택 강조 제거
    document.querySelectorAll("#drugResultTable tbody tr")
        .forEach(r => r.classList.remove("selected"));
}

/* --------------------------
   약품 검색 API 호출
-------------------------- */
async function performSearch() {
    const query = document.getElementById("drugNameInput").value;

    if (!query) {
        alert("검색어를 입력하세요.");
        return;
    }

    const response = await fetch(`/mstaff/api/medicine/search/?q=${query}`);
    const data = await response.json();

    const tbody = document.querySelector("#drugResultTable tbody");
    tbody.innerHTML = "";

    if (!data.results || data.results.length === 0) {
        tbody.innerHTML = "<tr><td colspan='2'>검색 결과 없음</td></tr>";
        return;
    }

    data.results.forEach(item => {
        const tr = document.createElement("tr");

        tr.dataset.code = item.code;
        tr.dataset.name = item.name;

        tr.onclick = function () {
            selectDrug(this);
        };

        tr.innerHTML = `
            <td>${item.name}</td>
            <td>${item.code}</td>
        `;

        tbody.appendChild(tr);
    });
}

/* --------------------------
   약품 선택
-------------------------- */
function selectDrug(row) {
    document.querySelectorAll("#drugResultTable tbody tr")
        .forEach(r => r.classList.remove("selected"));

    row.classList.add("selected");

    selectedDrug = {
        code: row.dataset.code,
        name: row.dataset.name
    };
}

/* --------------------------
   선택 반영
-------------------------- */
function confirmSelection() {

    if (!selectedDrug) {
        alert("약품을 선택하세요.");
        return;
    }

    if (!currentDrugBlock) {
        alert("오류: 현재 블록을 찾을 수 없습니다.");
        return;
    }

    currentDrugBlock.querySelector(".drugName").value = selectedDrug.name;
    currentDrugBlock.querySelector(".drugCode").value = selectedDrug.code;

    closeModal("drugSearchModal");
}

function closeModal(id) {
    document.getElementById(id).style.visibility = "hidden";
}

/* --------------------------
   검사 선택 시 응급 옵션 표시
-------------------------- */
function toggleEmergencyOption() {
    const orderType = document.getElementById("orderType").value;
    const emergencyBox = document.getElementById("emergencyWrapper");

    if (orderType === "lab") {
        emergencyBox.style.display = "block";
    } else {
        emergencyBox.style.display = "none";
    }
}

function buildReservationDateTime() {
    const day = document.getElementById("reservationDate").value;
    const hour = document.getElementById("reservationHour").value;

    if (!day || !hour) return null;

    // YYYY-MM-DDTHH:00 형태로 조립
    return `${day}T${hour}:00`;
}
