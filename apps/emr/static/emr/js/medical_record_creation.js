/* --------------------------
   전역 변수
-------------------------- */
let prescriptionList = [];
let currentDrugBlock = null;
let selectedDrug = null;

/* --------------------------
   예약 가능한 기본 시간 목록
-------------------------- */
const TIME_SLOTS = [
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00"
];

/* --------------------------
   시간 선택 모달 열기
-------------------------- */
function openTimeModal() {
    const dateVal = document.getElementById("reservationDate").value;

    if (!dateVal) {
        alert("예약 날짜를 먼저 선택하세요.");
        return;
    }

    // 날짜가 있으면 예약된 시간 조회 후 그 결과로 모달 구성
    fetchReservedHoursForModal(dateVal);
    document.getElementById("timeSelectModal").style.visibility = "visible";
}

/* --------------------------
   모달용 예약 시간 조회
-------------------------- */
async function fetchReservedHoursForModal(dateVal) {
    try {
        const res = await fetch(`/mstaff/api/reserved-hours/?doctor_id=1&date=${dateVal}`);
        const data = await res.json();

        const reserved = new Set(data.reserved_hours || []);
        buildTimeGrid(reserved);

    } catch (err) {
        console.error("예약 시간 조회 실패:", err);
    }
}

/* --------------------------
   시간 목록을 버튼 형태로 렌더링
-------------------------- */
function buildTimeGrid(reservedSet) {
    const grid = document.getElementById("timeGrid");
    grid.innerHTML = "";

    TIME_SLOTS.forEach(t => {
        const hour = parseInt(t.split(":")[0]);  // 예: "09:00" → 9

        const btn = document.createElement("button");
        btn.classList.add("time-btn");
        btn.textContent = t;

        if (reservedSet.has(hour)) {
            btn.classList.add("disabled");
            btn.disabled = true;
        } else {
            btn.onclick = () => selectTime(t);
        }

        grid.appendChild(btn);
    });
}

/* --------------------------
   시간 선택 처리
-------------------------- */
function selectTime(t) {
    // "09:00" → "09"
    document.getElementById("reservation_hour").value = t.substring(0, 2);

    // 모달 닫기
    closeModal("timeSelectModal");
}


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

    /* ------------------------ 1) 처방전 리스트 수집 ------------------------ */
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

    /* ------------------------ 2) 검사/치료 오더 JSON 생성 ------------------------ */
    const orderType = document.getElementById("orderType").value;
    const emergencyFlag =
        document.querySelector("input[name='emergency_flag']:checked")?.value || null;

    const globalStart = document.getElementById("globalStartDate").value;
    const globalEnd = document.getElementById("globalEndDate").value;

    const orderObject = {
        start_date: globalStart,
        end_date: globalEnd,
        order_type: orderType || null,
        emergency_flag: emergencyFlag
    };

    /* ------------------------ 3) 숨겨진 필드 저장 ------------------------ */
    document.getElementById("prescriptions").value = JSON.stringify(prescriptionList);
    document.getElementById("orders").value = JSON.stringify(orderObject);

    /* ------------------------ 4) 제출 ------------------------ */
    const form = document.getElementById("recordForm");
    const formData = new FormData(form);

    const response = await fetch("/mstaff/api/medical-record/create/", {
        method: "POST",
        body: formData
    });

    const data = await response.json();

    if (response.status === 400 && data.error) {
        alert(data.error);
        return;
    }

    alert("저장되었습니다.");
}

/* --------------------------
   약품 검색 모달
-------------------------- */
function openDrugSearchModal(btn) {
    currentDrugBlock = btn.closest(".prescription-block");
    selectedDrug = null;

    document.getElementById("drugSearchModal").style.visibility = "visible";

    document.querySelectorAll("#drugResultTable tbody tr")
        .forEach(r => r.classList.remove("selected"));
}

/* --------------------------
   약품 검색 API
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

        tr.onclick = () => selectDrug(tr);

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

    currentDrugBlock.querySelector(".drugName").value = selectedDrug.name;
    currentDrugBlock.querySelector(".drugCode").value = selectedDrug.code;

    closeModal("drugSearchModal");
}

function closeModal(id) {
    document.getElementById(id).style.visibility = "hidden";
}

/* --------------------------
   검사 선택 시 응급 여부 표시
-------------------------- */
function toggleEmergencyOption() {
    const orderType = document.getElementById("orderType").value;
    const emergencyBox = document.getElementById("emergencyWrapper");

    emergencyBox.style.display = orderType === "lab" ? "block" : "none";
}