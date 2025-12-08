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

    // 이 페이지에서는 hospital_id, reservationForm, modalReserveBtn 관련 코드는 전혀 필요 없음
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
        const calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: "dayGridMonth",
            locale: "ko",
            height: "auto",

            // 의사별 예약 이벤트 (지금 당장 필요 없으면 빈 배열만 넘겨도 됨)
            events: function(info, successCallback, failureCallback) {
                const doctorId = doctorIdInput ? doctorIdInput.value : null;
                if (!doctorId) {
                    // 의사 선택 안 되어 있으면 이벤트 없음
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
                    .then(data => successCallback(data))
                    .catch(err => {
                        console.error("events load error", err);
                        failureCallback(err);
                    });
            },

            // 날짜 클릭 시 타임슬롯 로드
            dateClick: function(info) {
                console.log("dateClick:", info.dateStr);  // 반드시 콘솔에 찍혀야 함

                if (selectedDateInput) {
                    selectedDateInput.value = info.dateStr;
                }

                const doctorId = doctorIdInput ? doctorIdInput.value : null;
                if (!doctorId) {
                    alert("먼저 의사를 선택해 주세요.");
                    return;
                }

                loadSlots(doctorId, info.dateStr);
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

