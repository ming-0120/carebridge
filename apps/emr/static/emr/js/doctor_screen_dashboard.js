// static/reservations/js/reservation_page.js
document.addEventListener("DOMContentLoaded", () => {
  // ============================
  // 1) 의사 선택
  // ============================
  const doctorCards = document.querySelectorAll(".doctor-card");
  const doctorIdInput = document.getElementById("selectedDoctorId");

  if (doctorCards.length && doctorIdInput) {
    doctorCards.forEach((card) => {
      const btn = card.querySelector(".btn-select-doctor");
      if (!btn) return;

      btn.addEventListener("click", () => {
        doctorCards.forEach((c) => c.classList.remove("selected"));
        card.classList.add("selected");

        const doctorId = card.dataset.doctorId;
        doctorIdInput.value = doctorId || "";

        // 의사 바뀌면 달력 이벤트 새로고침
        if (window.calendar) {
          window.calendar.refetchEvents();
        }
      });
    });
  }

  // ============================
  // 2) FullCalendar 초기화
  // ============================
  const calendarEl = document.getElementById("calendar");
  const selectedDateInput = document.getElementById("selectedDate");

  if (!calendarEl) return;

  // 오늘 ~ 오늘+14일까지만 "예약 가능" 범위
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const limit = new Date(today);
  limit.setDate(limit.getDate() + 14); // 오늘 포함 2주

  // 예약 가능 여부 판별
  function isOutOfRangeOrPast(dateObj) {
    const d = new Date(dateObj);
    d.setHours(0, 0, 0, 0);
    return d < today || d > limit;
  }

  function isWeekend(dateObj) {
    const day = dateObj.getDay(); // 0:일, 6:토
    return day === 0 || day === 6;
  }

  // 날짜를 YYYY-MM-DD로 고정 포맷
  function toYmd(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const d = String(dateObj.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function isHolidayDateStr(dateStr) {
    // HOLIDAYS: [{date: "YYYY-MM-DD", name: "..."}] 형태라고 가정
    // date가 다른 포맷이면 slice(0,10)로 안전하게 비교
    return Array.isArray(HOLIDAYS) && HOLIDAYS.some((h) => String(h.date).slice(0, 10) === dateStr);
  }

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    locale: "ko",
    height: "auto",
    showNonCurrentDates: false,
    fixedWeekCount: false,

    // 의사별 예약 이벤트
    events: function (info, successCallback, failureCallback) {
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
        .then((res) => res.json())
        .then((data) => {
          successCallback(data);
        })
        .catch((err) => {
          console.error("events load error", err);
          successCallback([]); // 공휴일 이벤트를 그리지 않음
          failureCallback(err);
        });
    },

    // ✅ mstaff 방식: 날짜 셀 클래스 부여
    dayCellClassNames: function (arg) {
      const dateStr = toYmd(arg.date);

      const classes = [];
      const holiday = isHolidayDateStr(dateStr);

      // 공휴일은 빨강 표시용 클래스
      if (holiday) classes.push("fc-holiday-cell");

      // 비활성화(회색 처리) 대상: 과거/범위 밖 + 주말 + 공휴일
      // (기존 정책 그대로: 주말도 예약 불가)
      const disabled = isOutOfRangeOrPast(arg.date) || isWeekend(arg.date) || holiday;
      if (disabled) classes.push("fc-day-disabled");

      return classes;
    },

    dateClick: function (info) {
      const clickedDateStr = info.dateStr; // 보통 YYYY-MM-DD
      const clickedDateObj = info.date;

      // 0) 의사 선택 여부 확인
      const doctorId = doctorIdInput ? doctorIdInput.value : null;
      if (!doctorId) {
        alert("먼저 의사를 선택해 주세요.");
        return;
      }

      // 1) 과거/범위 밖 차단
      if (isOutOfRangeOrPast(clickedDateObj)) {
        alert("해당 날짜에는 예약이 불가합니다.");
        return;
      }

      // 2) 주말 차단(기존 정책 유지)
      if (isWeekend(clickedDateObj)) {
        alert("해당 날짜에는 예약이 불가합니다.");
        return;
      }

      // 3) 공휴일 차단
      if (isHolidayDateStr(clickedDateStr)) {
        alert("공휴일에는 예약이 불가합니다.");
        return;
      }

      // 4) 날짜 선택 표시
      document.querySelectorAll(".fc-daygrid-day").forEach((dayCell) => {
        dayCell.classList.remove("fc-day-selected");
      });

      const cell = document.querySelector(`.fc-daygrid-day[data-date="${clickedDateStr}"]`);
      if (cell) cell.classList.add("fc-day-selected");

      // 5) 선택 날짜 저장
      if (selectedDateInput) selectedDateInput.value = clickedDateStr;

      // 6) 타임 슬롯 로드
      loadSlots(doctorId, clickedDateStr);
    },
  });

  calendar.render();
  window.calendar = calendar;

  // ============================
  // 3) 슬롯 로드 + 버튼 렌더
  // ============================
  function loadSlots(doctorId, dateStr) {
    const params = new URLSearchParams({
      doctor_id: doctorId,
      date: dateStr,
    });

    fetch(`/reservations/api/doctor-slots/?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        const amRow = document.querySelector(".time-select .am-row");
        const pmRow = document.querySelector(".time-select .pm-row");
        const selectedSlotInput = document.getElementById("selectedSlotId");

        if (!amRow || !pmRow || !selectedSlotInput) return;

        // 초기화
        amRow.innerHTML = "";
        pmRow.innerHTML = "";
        selectedSlotInput.value = "";

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
            return btn;
          }

          btn.addEventListener("click", () => {
            document.querySelectorAll(".time-btn").forEach((b) => b.classList.remove("selected"));
            btn.classList.add("selected");
            selectedSlotInput.value = slot.slot_id;
          });

          return btn;
        };

        // 오전
        if (Array.isArray(data.am) && data.am.length > 0) {
          data.am.forEach((s) => amRow.appendChild(makeSlotButton(s)));
        } else {
          amRow.textContent = "오전 예약 가능 시간이 없습니다.";
        }

        // 오후
        if (Array.isArray(data.pm) && data.pm.length > 0) {
          data.pm.forEach((s) => pmRow.appendChild(makeSlotButton(s)));
        } else {
          pmRow.textContent = "오후 예약 가능 시간이 없습니다.";
        }
      })
      .catch((err) => {
        console.error("slots load error", err);
      });
  }
});
