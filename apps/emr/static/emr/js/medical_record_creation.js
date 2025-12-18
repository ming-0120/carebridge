/* --------------------------
   전역 변수
-------------------------- */
let prescriptionList = [];
let currentDrugBlock = null;
let selectedDrug = null;

const HOLIDAY_DATES = new Set(
    (typeof HOLIDAYS !== "undefined" && Array.isArray(HOLIDAYS) ? HOLIDAYS : [])
        .map((h) => h && h.date)
        .filter(Boolean)
);

function isHoliday(dateStr) {
    return Boolean(dateStr) && HOLIDAY_DATES.has(dateStr);
}

function clearReservationTimeSelection() {
    const hourInput = document.getElementById("reservation_hour");
    if (hourInput) hourInput.value = "";

    const slotIdInput = document.getElementById("reservation_slot_id");
    if (slotIdInput) slotIdInput.value = "";

    const label = document.getElementById("selectedTimeLabel");
    if (label) label.textContent = "";
}

document.addEventListener("DOMContentLoaded", () => {
    const dateInput = document.getElementById("reservationDate");
    if (!dateInput) return;

    dateInput.addEventListener("change", () => {
        const dateVal = dateInput.value || "";
        if (!dateVal) {
            clearReservationTimeSelection();
            return;
        }

        const dateObj = new Date(`${dateVal}T00:00:00`);
        const isSunday = dateObj.getDay() === 0;
        if (isSunday) {
            alert("일요일에는 예약이 불가합니다.");
            dateInput.value = "";
            clearReservationTimeSelection();
            return;
        }

        if (isHoliday(dateVal)) {
            alert("공휴일은 예약이 불가합니다.");
            dateInput.value = "";
            clearReservationTimeSelection();
            return;
        }

        clearReservationTimeSelection();
    });
});

// 저장 성공 시 진료기록 작성 화면에서 의사용 대시보드로 이동
const __originalFetch = window.fetch;
window.fetch = async function (...args) {
    const response = await __originalFetch.apply(this, args);

    try {
        const req = args[0];
        const url = typeof req === "string" ? req : req.url || "";

        if (url.includes("/mstaff/api/medical-record/create/") && response.ok) {
            // 기존 저장 알림(alert) 이후에 이동되도록 약간 지연
            setTimeout(() => {
                window.location.href = "/mstaff/doctor_dashboard/";
            }, 0);
        }
    } catch (e) {
        // URL 파싱 실패 등은 무시
    }

    return response;
};

/* --------------------------
   기본 예약 시간 슬롯
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

function isDisabledDate(dateObj) {
    const d = new Date(dateObj);
    d.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const limit = new Date(today);
    limit.setDate(limit.getDate() + 14);

    const day = d.getDay(); // 0: Sun, 6: Sat
    const isWeekend = day === 0 || day === 6;
    const isOutOfRange = d < today || d > limit;

    return isWeekend || isOutOfRange;
}

function isOutOfRangeDate(dateObj) {
    const d = new Date(dateObj);
    d.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const limit = new Date(today);
    limit.setDate(limit.getDate() + 14);

    return d < today || d > limit;
}

/* --------------------------
   시간 선택 모달 열기
-------------------------- */
function openTimeModal() {
    const dateInput = document.getElementById("reservationDate");
    const dateVal = dateInput ? dateInput.value : "";

    if (!dateVal) {
        alert("예약 날짜를 선택해주세요.");
        return;
    }

    // 과거 날짜는 예약 불가
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    if (dateVal < todayStr) {
        alert("과거 날짜에는 예약을 설정할 수 없습니다.");
        return;
    }

    const dateObj = new Date(`${dateVal}T00:00:00`);
    if (isOutOfRangeDate(dateObj)) {
        alert("예약은 오늘부터 2주 이내만 가능합니다.");
        return;
    }

    if (dateObj.getDay() === 0) {
        alert("일요일에는 예약이 불가합니다.");
        return;
    }

    if (isHoliday(dateVal)) {
        alert("공휴일은 예약이 불가합니다.");
        return;
    }

    fetchSlotsForModal(dateVal);

    const modal = document.getElementById("timeSelectModal");
    if (modal) {
        modal.style.visibility = "visible";
    }
}

/* --------------------------
   선택 날짜의 예약 시간 조회
-------------------------- */
async function fetchSlotsForModal(dateVal) {
    try {
        const params = new URLSearchParams({
            doctor_id: CURRENT_DOCTOR_ID,
            date: dateVal,
        });
        const res = await fetch(`/reservations/api/doctor-slots/?${params.toString()}`);

        const data = await res.json();
        buildSlotGrid(data, dateVal);
    } catch (err) {
        console.error("예약 슬롯 조회 실패:", err);
    }
}

/* --------------------------
   시간 버튼 그리드 구성
   - 이미 예약된 시간: 비활성
   - (오늘 기준) 현재 시간 이전 슬롯: 비활성
-------------------------- */
function buildSlotGrid(slotPayload, dateVal) {
    const grid = document.getElementById("timeGrid");
    if (!grid) return;

    grid.innerHTML = "";

    const am = Array.isArray(slotPayload?.am) ? slotPayload.am : [];
    const pm = Array.isArray(slotPayload?.pm) ? slotPayload.pm : [];
    const slots = [...am, ...pm];

    const slotByStart = new Map();
    slots.forEach((s) => {
        if (s && s.start) slotByStart.set(String(s.start), s);
    });

    const selectedDateObj = new Date(`${dateVal}T00:00:00`);
    const isSaturday = selectedDateObj.getDay() === 6;

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const isToday = dateVal === todayStr;

    TIME_SLOTS.forEach((startStr) => {
        const slot = slotByStart.get(startStr);
        const btn = document.createElement("button");
        btn.classList.add("time-btn");
        btn.type = "button";

        // 시간 버튼 표기는 "시작 시간"으로 통일 (09:00, 10:00, ...)
        // endStr는 선택 후 라벨(선택된 시간 표시)용으로만 사용
        const endStr = slot?.end || "";
        btn.textContent = startStr;

        const startHour = Number(String(startStr).split(":")[0]);
        const saturdayBlocked = isSaturday && startHour >= 14;

        let isPastTime = false;
        if (isToday) {
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            const [slotHour, slotMinute] = String(startStr).split(":").map(Number);
            if (
                slotHour < currentHour ||
                (slotHour === currentHour && slotMinute <= currentMinute)
            ) {
                isPastTime = true;
            }
        }

        const selectable = Boolean(slot?.slot_id) && !saturdayBlocked && !isPastTime;
        if (!selectable) {
            btn.classList.add("disabled");
            btn.disabled = true;
        } else {
            btn.addEventListener("click", () => selectSlot(slot.slot_id, startStr, endStr, dateVal));
        }

        grid.appendChild(btn);
    });
}

/* --------------------------
   시간 선택 처리
-------------------------- */
function selectSlot(slotId, startStr, endStr, dateVal) {
    const slotIdInput = document.getElementById("reservation_slot_id");
    if (slotIdInput) slotIdInput.value = String(slotId || "");

    const hourInput = document.getElementById("reservation_hour");
    if (hourInput && startStr) hourInput.value = String(startStr).substring(0, 2);

    const label = document.getElementById("selectedTimeLabel");
    if (label) {
        label.textContent = `${dateVal} ${startStr} ~ ${endStr}`;
    }

    closeModal("timeSelectModal");
}

/* --------------------------
   처방 입력칸 추가
   - 새 블록 추가 시 직전 블록 접기
   - 헤더 클릭으로 개별 블록 접기/펼치기
-------------------------- */
function addPrescriptionForm() {
    const container = document.getElementById("prescriptionContainer");
    if (!container) return;

    const existingBlocks = container.querySelectorAll(".prescription-block");
    const index = existingBlocks.length + 1;

    // 바로 이전 블록 자동 접기
    if (existingBlocks.length > 0) {
        const lastBlock = existingBlocks[existingBlocks.length - 1];
        lastBlock.classList.add("collapsed");
    }

    const block = document.createElement("div");
    block.classList.add("prescription-block");

    block.innerHTML = `
        <div class="prescription-header">
            <span class="prescription-title">처방 ${index}</span>
            <span class="prescription-summary">약품명을 선택하세요</span>
        </div>

        <div class="prescription-row">
            <div class="form-group">
                <label>약품명</label>
                <div class="drug-input-wrap">
                    <input type="text" class="drugName" placeholder="약품명을 입력하세요" readonly>
                    <button type="button" class="search-btn-5page" onclick="openDrugSearchModal(this)">검색</button>
                </div>
            </div>

            <div class="form-group">
                <label>약품 코드</label>
                <input type="text" class="drugCode" disabled>
            </div>

            <div class="form-group">
                <label>투여 빈도</label>
                <input type="text" class="freqInput" placeholder="예: 1일 3회">
            </div>

            <div class="form-group">
                <label>투여 용량</label>
                <input type="text" class="doseInput" placeholder="예: 1회 1정">
            </div>

            <div class="form-group">
                <label>특이사항</label>
                <input type="text" class="noteInput" placeholder="예: 경구 복용, 식후 30분">
            </div>

            <button type="button" class="btn-remove" onclick="removePrescriptionBlock(this)">
                삭제
            </button>
        </div>
    `;

    container.appendChild(block);

    // 헤더 클릭 시 접기/펼치기
    const header = block.querySelector(".prescription-header");
    if (header) {
        header.addEventListener("click", function () {
            block.classList.toggle("collapsed");
        });
    }

    // 약품명 변경 시 요약 텍스트 업데이트
    const nameInput = block.querySelector(".drugName");
    const summary = block.querySelector(".prescription-summary");
    if (nameInput && summary) {
        const updateSummary = () => {
            summary.textContent = nameInput.value || `처방 ${index}`;
        };
        nameInput.addEventListener("input", updateSummary);
    }
}

/* --------------------------
   처방 입력칸 삭제
-------------------------- */
function removePrescriptionBlock(btn) {
    const block = btn.closest(".prescription-block");
    if (!block) return;

    const container = document.getElementById("prescriptionContainer");
    block.remove();

    renumberPrescriptionBlocks(container);
}

/* --------------------------
   처방 블록 번호 및 접힘 상태 정리
-------------------------- */
function renumberPrescriptionBlocks(container) {
    if (!container) {
        container = document.getElementById("prescriptionContainer");
    }
    if (!container) return;

    const blocks = container.querySelectorAll(".prescription-block");

    blocks.forEach((block, idx) => {
        const title = block.querySelector(".prescription-title");
        if (title) {
            title.textContent = `처방 ${idx + 1}`;
        }
    });

    // 마지막 블록은 기본적으로 펼쳐두기
    if (blocks.length > 0) {
        const last = blocks[blocks.length - 1];
        last.classList.remove("collapsed");
    }
}

/* --------------------------
   submit 직전 데이터 준비
-------------------------- */
async function prepareSubmit() {
    const blocks = document.querySelectorAll(".prescription-block");
    prescriptionList = [];

    blocks.forEach((block) => {
        const name = block.querySelector(".drugName")?.value.trim() || "";
        const code = block.querySelector(".drugCode")?.value.trim() || "";
        const freq = block.querySelector(".freqInput")?.value.trim() || "";
        const dose = block.querySelector(".doseInput")?.value.trim() || "";
        const note = block.querySelector(".noteInput")?.value.trim() || "";

        // 약품명과 코드가 모두 있어야 유효한 처방으로 간주
        if (!name || !code) return;

        prescriptionList.push({
            drug_name: name,
            drug_code: code,
            frequency: freq,
            dose: dose,
            note: note
        });
    });

    // 주문(오더) 관련 정보
    const orderType = document.getElementById("orderType")?.value || "";
    const emergencyRadio = document.querySelector("input[name='emergency_flag']:checked");
    const emergencyFlag = emergencyRadio ? emergencyRadio.value : null;

    const globalStart = document.getElementById("globalStartDate")?.value || "";
    const globalEnd = document.getElementById("globalEndDate")?.value || "";

    const orderObject = {
        start_date: globalStart,
        end_date: globalEnd,
        order_type: orderType || null,
        emergency_flag: emergencyFlag
    };

    // hidden 필드에 JSON 문자열로 세팅
    const prescriptionsInput = document.getElementById("prescriptions");
    const ordersInput = document.getElementById("orders");
    if (prescriptionsInput) prescriptionsInput.value = JSON.stringify(prescriptionList);
    if (ordersInput) ordersInput.value = JSON.stringify(orderObject);

    const form = document.getElementById("recordForm");
    if (!form) {
        alert("폼을 찾을 수 없습니다.");
        return;
    }

    const formData = new FormData(form);

    try {
        const response = await fetch("/mstaff/api/medical-record/create/", {
            method: "POST",
            body: formData
        });

        let data = {};
        try {
            data = await response.json();
        } catch (e) {
            // JSON 응답이 아닌 경우도 대비
        }

        if (response.status === 400 && data.error) {
            alert(data.error);
            return;
        }

        if (!response.ok) {
            alert("저장 중 오류가 발생했습니다.");
            return;
        }

        alert("저장되었습니다.");
    } catch (err) {
        console.error("진료기록 저장 실패:", err);
        alert("네트워크 오류로 저장에 실패했습니다.");
    }
}

/* --------------------------
   약품 검색 모달 열기
-------------------------- */
function openDrugSearchModal(btn) {
    currentDrugBlock = btn.closest(".prescription-block");
    selectedDrug = null;

    const modal = document.getElementById("drugSearchModal");
    const input = document.getElementById("drugNameInput");
    const tbody = document.querySelector("#drugResultTable tbody");

    if (input) input.value = "";
    if (tbody) tbody.innerHTML = "";

    if (modal) {
        modal.style.visibility = "visible";
    }
    if (input) {
        input.focus();
    }
}

/* --------------------------
   디바운스 유틸
-------------------------- */
function debounce(fn, delay) {
    let timer = null;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

const debouncedDrugSearch = debounce(() => {
    performSearch();
}, 300);

/* --------------------------
   약품 검색 API 호출
-------------------------- */
async function performSearch() {
    const input = document.getElementById("drugNameInput");
    const query = input ? input.value.trim() : "";
    const tbody = document.querySelector("#drugResultTable tbody");

    if (!tbody) return;

    if (!query) {
        tbody.innerHTML = "";
        return;
    }

    try {
        const response = await fetch(
            `/mstaff/api/medicine/search/?q=${encodeURIComponent(query)}`
        );
        const data = await response.json();

        tbody.innerHTML = "";

        if (!data.results || data.results.length === 0) {
            return;
        }

        data.results.forEach((item) => {
            const tr = document.createElement("tr");
            tr.dataset.code = item.code;
            tr.dataset.name = item.name;

            tr.addEventListener("click", () => selectDrug(tr));

            tr.innerHTML = `
                <td>${item.name}</td>
                <td>${item.code}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error("약품 검색 실패:", err);
    }
}

/* --------------------------
   약품 행 선택
-------------------------- */
function selectDrug(row) {
    const tbody = document.querySelector("#drugResultTable tbody");
    if (tbody) {
        tbody.querySelectorAll("tr").forEach((r) => r.classList.remove("selected"));
    }

    row.classList.add("selected");

    selectedDrug = {
        code: row.dataset.code,
        name: row.dataset.name
    };

    confirmSelection();
}

/* --------------------------
   선택 약품 반영
-------------------------- */
function confirmSelection() {
    if (!selectedDrug || !currentDrugBlock) {
        alert("약품을 선택해주세요.");
        return;
    }

    const nameInput = currentDrugBlock.querySelector(".drugName");
    const codeInput = currentDrugBlock.querySelector(".drugCode");

    if (nameInput) nameInput.value = selectedDrug.name;
    if (codeInput) codeInput.value = selectedDrug.code;

    const summary = currentDrugBlock.querySelector(".prescription-summary");
    if (summary) {
        summary.textContent = selectedDrug.name || summary.textContent;
    }

    closeModal("drugSearchModal");
}

/* --------------------------
   모달 닫기
-------------------------- */
function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.visibility = "hidden";
    }
}

/* --------------------------
   검사/처치 선택에 따른 옵션 노출
-------------------------- */
function toggleEmergencyOption() {
    const orderType = document.getElementById("orderType")?.value;
    const emergencyBox = document.getElementById("emergencyWrapper");

    if (!emergencyBox) return;

    emergencyBox.style.display = orderType === "lab" ? "block" : "none";
}

/* --------------------------
   DOMContentLoaded 시 초기화
-------------------------- */
document.addEventListener("DOMContentLoaded", function () {
    const input = document.getElementById("drugNameInput");
    const modal = document.getElementById("drugSearchModal");

    if (input) {
        input.addEventListener("input", debouncedDrugSearch);
    }

    if (modal) {
        modal.addEventListener("click", function (e) {
            if (e.target === modal) {
                closeModal("drugSearchModal");
            }
        });
    }
});
