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
// Django에서 넘어온 HOLIDAYS 활용
const holidayEvents = HOLIDAYS.map(h => ({
    title: h.name,
    start: h.date,
    allDay: true,
    display: "background",  // 날짜 배경 표시
    // color: "#ffe6e6",    // 필요하면 색 지정 가능
}));

    // ============================
    // 2. FullCalendar 초기화
    // ============================
    const calendarEl = document.getElementById("calendar");
const selectedDateInput = document.getElementById("selectedDate");

if (calendarEl) {
    // 오늘 ~ 오늘+14일까지만 유효
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const limit = new Date(today);
    limit.setDate(limit.getDate() + 15); // end 는 exclusive 이므로 +15

    const startStr = today.toISOString().split("T")[0];
    const endStr = limit.toISOString().split("T")[0];

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: "dayGridMonth",
        locale: "ko",
        height: "auto",

        // 오늘 이전 + 2주 이후는 회색/비활성
        validRange: {
            start: startStr, // 오늘
            end: endStr,     // 오늘+15일 (실제 선택/표시는 오늘~오늘+14일)
        },

        // 의사별 예약 이벤트
        events: function (info, successCallback, failureCallback) {
            const doctorIdInput = document.getElementById("selectedDoctorId"); // 사용 중인 id에 맞게 조정
            const doctorId = doctorIdInput ? doctorIdInput.value : null;

            if (!doctorId) {
                successCallback(holidayEvents);
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
                    successCallback([...holidayEvents, ...data]);
                })
                .catch(err => {
                    console.error("events load error", err);
                    successCallback(holidayEvents);
                    failureCallback(err);
                });
        },

        // 날짜 클릭 시 타임슬롯 로드
        dateClick: function (info) {
            const clickedDate = info.dateStr;
            // 1) 기존 선택 제거
            document.querySelectorAll(".fc-daygrid-day").forEach(day => {
                day.classList.remove("fc-day-selected");
            });
        
            // 2) 현재 클릭한 날짜 셀에 선택 표시
            const cell = document.querySelector(`.fc-daygrid-day[data-date="${clickedDate}"]`);
            if (cell) {
                cell.classList.add("fc-day-selected");
            }
            // 공휴일이면 막기
            const isHoliday = HOLIDAYS.some(h => h.date === clickedDate);
            if (isHoliday) {
                alert("공휴일에는 예약이 불가합니다.");
                return;
            }

            if (selectedDateInput) {
                selectedDateInput.value = clickedDate;
            }

            const doctorIdInput = document.getElementById("selectedDoctorId"); // 실제 id와 맞추기
            const doctorId = doctorIdInput ? doctorIdInput.value : null;

            if (!doctorId) {
                alert("먼저 의사를 선택해 주세요.");
                return;
            }

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

                amRow.innerHTML = "";
                pmRow.innerHTML = "";

                // 오전 슬롯
                if (data.am && data.am.length > 0) {
                    data.am.forEach(s => {
                        const btn = document.createElement("button");
                        btn.type = "button";
                        btn.className = "time-btn";
                        btn.dataset.slotId = s.slot_id;
                        btn.textContent = `${s.start} ~ ${s.end}`;

                        btn.addEventListener("click", () => {
                            document.querySelectorAll(".time-btn")
                                .forEach(b => b.classList.remove("selected"));
                            btn.classList.add("selected");
                            selectedSlotInput.value = s.slot_id;
                        });

                        amRow.appendChild(btn);
                    });
                } else {
                    amRow.textContent = "오전 예약 가능 시간이 없습니다.";
                }

                // 오후 슬롯
                if (data.pm && data.pm.length > 0) {
                    data.pm.forEach(s => {
                        const btn = document.createElement("button");
                        btn.type = "button";
                        btn.className = "time-btn";
                        btn.dataset.slotId = s.slot_id;
                        btn.textContent = `${s.start} ~ ${s.end}`;

                        btn.addEventListener("click", () => {
                            document.querySelectorAll(".time-btn")
                                .forEach(b => b.classList.remove("selected"));
                            btn.classList.add("selected");
                            selectedSlotInput.value = s.slot_id;
                        });

                        pmRow.appendChild(btn);
                    });
                } else {
                    pmRow.textContent = "오후 예약 가능 시간이 없습니다.";
                }
            })
            .catch(err => {
                console.error("slots load error", err);
            });
    }
});

