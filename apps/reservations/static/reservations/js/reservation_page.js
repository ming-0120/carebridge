document.addEventListener("DOMContentLoaded", () => {
    // 1) 의사 선택 (doctor-card)
    const doctorCards = document.querySelectorAll(".doctor-card");
    const doctorIdInput = document.querySelector("input[name='doctor_id']");

    if (doctorCards.length && doctorIdInput) {
        doctorCards.forEach(card => {
            const btn = card.querySelector(".btn-select-doctor");
            btn.addEventListener("click", () => {
                // 전체 카드에서 선택 표시 제거
                doctorCards.forEach(c => c.classList.remove("selected"));
                // 현재 카드만 선택
                card.classList.add("selected");

                const doctorId = card.dataset.doctorId;
                doctorIdInput.value = doctorId;
            });
        });
    }

    // 2) 슬롯 선택 (time-btn)
    const slotButtons = document.querySelectorAll(".time-btn");
    const selectedSlotInput = document.getElementById("selectedSlotId");

    if (slotButtons.length && selectedSlotInput) {
        slotButtons.forEach(btn => {
            btn.addEventListener("click", () => {
                // 전체에서 선택 표시 제거
                slotButtons.forEach(b => b.classList.remove("selected"));
                // 클릭한 버튼만 선택
                btn.classList.add("selected");

                // hidden input 에 slot_id 저장
                const slotId = btn.dataset.slotId;
                selectedSlotInput.value = slotId;
            });
        });
    }

});
// static/reservations/js/reservation_page.js
document.addEventListener("DOMContentLoaded", () => {
    // ============================
    // 1. 의사 선택
    // ============================
    const doctorCards = document.querySelectorAll(".doctor-card");
    const doctorIdInput = document.getElementById("selectedDoctorId");

    if (doctorCards.length && doctorIdInput) {
        doctorCards.forEach(card => {
            const btn = card.querySelector(".btn-select-doctor");
            btn.addEventListener("click", () => {
                // 선택 표시
                doctorCards.forEach(c => c.classList.remove("selected"));
                card.classList.add("selected");

                const doctorId = card.dataset.doctorId;
                doctorIdInput.value = doctorId;

                // 의사 바뀌면 달력 이벤트 새로고침
                if (window.calendar) {
                    window.calendar.refetchEvents();
                }
            });
        });
    }
// ============================
// 2. FullCalendar 초기화
// ============================
const calendarEl = document.getElementById("calendar");
const selectedDateInput = document.getElementById("selectedDate");

if (calendarEl) {
    // 오늘 ~ 오늘+14일까지만 "예약 가능" 범위
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const limit = new Date(today);
    limit.setDate(limit.getDate() + 14);  // 오늘 포함 2주

    // 예약 가능 여부 판별 함수
    function isDisabledDate(dateObj) {
        const d = new Date(dateObj);
        d.setHours(0, 0, 0, 0);

        const day = d.getDay(); // 0:일, 6:토

        const isWeekend = (day === 0 || day === 6);
        const isOutOfRange = (d < today || d > limit);

        return isWeekend || isOutOfRange;
    }
    function toYmdLocal(dateObj) {
      const y = dateObj.getFullYear();
      const m = String(dateObj.getMonth() + 1).padStart(2, "0");
      const d = String(dateObj.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: "dayGridMonth",   // 한달 전체 보이기
        locale: "ko",
        height: "auto",
        showNonCurrentDates: false,  // 이번 달이 아닌 날짜(이전/다음 달) 숫자 안 보이게
        fixedWeekCount: false,       // 꼭 6줄 채우지 말고, 필요한 주 수만 표시
        // ★ validRange 삭제 (날짜를 가리지 않으려고)

        // 의사별 예약 이벤트
        events: function (info, successCallback, failureCallback) {
            const doctorIdInput = document.getElementById("selectedDoctorId");
            const doctorId = doctorIdInput ? doctorIdInput.value : null;

            if (!doctorId) {
                successCallback([]);
                return;
            }

            const params = new URLSearchParams({
                doctor_id: doctorId,
                start: info.startStr,
                end: info.endStr,
            });

            fetch(`/reservations/api/doctor-reservations/?${params.toString()}`)
                .then(res => res.json())
                .then(data => {
                    successCallback(data);
                })
                .catch(err => {
                    console.error("events load error", err);
                    successCallback([]);
                    failureCallback(err);
                });
        },

        // ★ 각 날짜 셀이 렌더링될 때 회색 처리
       dayCellDidMount: function (info) {
          const dateStr = toYmdLocal(info.date); // ✅ 로컬 날짜
          const isHoliday = HOLIDAYS.some(h => String(h.date).slice(0, 10) === dateStr);

          const disabled = isDisabledDate(info.date);

          if (disabled || isHoliday) info.el.classList.add("fc-day-disabled");
          if (isHoliday) info.el.classList.add("is-holiday");
        },

        dateClick: function (info) {
            const clickedDate = info.dateStr;
            const dateObj = info.date;

            // 1) 주말 / 2주 범위 밖 / 과거 날짜 차단
            if (isDisabledDate(dateObj)) {
                alert("해당 날짜에는 예약이 불가합니다.");
                return;
            }

            // 2) 공휴일 차단
           const isHoliday = HOLIDAYS.some(h => String(h.date).slice(0,10) === clickedDate);
            if (isHoliday) {
                alert("공휴일에는 예약이 불가합니다.");
                return;
            }

            // 3) 날짜 선택 표시
            document.querySelectorAll(".fc-daygrid-day").forEach(dayCell => {
                dayCell.classList.remove("fc-day-selected");
            });

            const cell = document.querySelector(
                `.fc-daygrid-day[data-date="${clickedDate}"]`
            );
            if (cell) {
                cell.classList.add("fc-day-selected");
            }

            // 4) 선택 날짜 저장
            if (selectedDateInput) {
                selectedDateInput.value = clickedDate;
            }

            // 5) 의사 선택 여부 확인
            const doctorIdInput = document.getElementById("selectedDoctorId");
            const doctorId = doctorIdInput ? doctorIdInput.value : null;

            if (!doctorId) {
                alert("먼저 의사를 선택해 주세요.");
                return;
            }

            // 6) 타임 슬롯 로드
            loadSlots(doctorId, clickedDate);
        },
    });

    calendar.render();
    window.calendar = calendar;
}


    // ============================
    // 3. 슬롯 로드 + 버튼 렌더
    // ============================
    function loadSlots(doctorId, dateStr) {
    const params = new URLSearchParams({
        doctor_id: doctorId,
        date: dateStr,
    });

    fetch(`/reservations/api/doctor-slots/?${params.toString()}`)
        .then(res => res.json())
        .then(data => {
            console.log("slots data:", data);

            const amRow = document.querySelector(".time-select .am-row");
            const pmRow = document.querySelector(".time-select .pm-row");
            const selectedSlotInput = document.getElementById("selectedSlotId");

            if (!amRow || !pmRow || !selectedSlotInput) return;

            // 초기화
            amRow.innerHTML = "";
            pmRow.innerHTML = "";
            selectedSlotInput.value = "";

            // ✅ 네 응답 기준: status가 "CLOSED"면 닫힘
            const isClosed = (slot) => slot.status === "CLOSED";

            const makeSlotButton = (slot) => {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "time-btn";
                btn.dataset.slotId = slot.slot_id;
                btn.textContent = `${slot.start} ~ ${slot.end}`;

                if (isClosed(slot)) {
                    btn.disabled = true;
                    btn.classList.add("time-btn-disabled");
                    return btn; // 클릭 이벤트 등록 안 함
                }

                btn.addEventListener("click", () => {
                    document.querySelectorAll(".time-btn")
                        .forEach(b => b.classList.remove("selected"));

                    btn.classList.add("selected");
                    selectedSlotInput.value = slot.slot_id;
                });

                return btn;
            };

            // 오전 슬롯
            if (Array.isArray(data.am) && data.am.length > 0) {
                data.am.forEach(s => amRow.appendChild(makeSlotButton(s)));
            } else {
                amRow.textContent = "오전 예약 가능 시간이 없습니다.";
            }

            // 오후 슬롯
            if (Array.isArray(data.pm) && data.pm.length > 0) {
                data.pm.forEach(s => pmRow.appendChild(makeSlotButton(s)));
            } else {
                pmRow.textContent = "오후 예약 가능 시간이 없습니다.";
            }
        })
        .catch(err => {
            console.error("slots load error", err);
        });
}

});

