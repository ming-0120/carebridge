// static/reservations/js/reservation_page.js
document.addEventListener("DOMContentLoaded", () => {
  // ============================
  // 0) HOLIDAYS 안전 처리
  //  - 템플릿에서 window.HOLIDAYS(배열)로 내려오거나
  //  - HOLIDAYS(배열)가 전역에 있거나
  //  - 혹시 문자열로 내려오면(JSON 문자열) 파싱
  // ============================
  function normalizeHolidays() {
    let src = window.HOLIDAYS ?? window.HOLIDAYS_JSON ?? window.HOLIDAYS_STR ?? window.HOLIDAYS ?? (typeof HOLIDAYS !== "undefined" ? HOLIDAYS : []);
    try {
      if (typeof src === "string") src = JSON.parse(src);
    } catch (_) {
      // 문자열인데 JSON 파싱 실패하면 빈 배열로
      src = [];
    }
    window.HOLIDAYS = Array.isArray(src) ? src : [];
  }
  normalizeHolidays();
  function toYMD(dateObj) {
    const d = new Date(dateObj);
    d.setHours(0, 0, 0, 0);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function isHolidayDateStr(dateStr) {
    return Array.isArray(window.HOLIDAYS) &&
      window.HOLIDAYS.some(h => String(h.date).slice(0, 10) === dateStr);
  }

  // ============================
  // 1) 의사 선택 (doctor-card)
  // ============================
  const doctorCards = document.querySelectorAll(".doctor-card");
  const doctorIdInput = document.getElementById("selectedDoctorId");

  if (doctorCards.length && doctorIdInput) {
    doctorCards.forEach(card => {
      const btn = card.querySelector(".btn-select-doctor");
      if (!btn) return;

      btn.addEventListener("click", () => {
        doctorCards.forEach(c => c.classList.remove("selected"));
        card.classList.add("selected");

        const doctorId = card.dataset.doctorId;
        doctorIdInput.value = doctorId;

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

  // 오늘 ~ 오늘+14일까지만 예약 가능 범위
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const limit = new Date(today);
  limit.setDate(limit.getDate() + 14);

  // ✅ 토요일은 선택 가능, 일요일만 막기
  function isDisabledDate(dateObj) {
    const d = new Date(dateObj);
    d.setHours(0, 0, 0, 0);

    const day = d.getDay(); // 0:일, 6:토
    const isSunday = (day === 0);
    const isOutOfRange = (d < today || d > limit);

    return isSunday || isOutOfRange;
  }

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    locale: "ko",
    height: "auto",
    showNonCurrentDates: true,
    fixedWeekCount: false,
    
    dayCellClassNames: function (info) {
      const dateStr = toYMD(info.date);
      const holiday = isHolidayDateStr(dateStr);
      const disabled = isDisabledDate(info.date);

      const classes = [];
      if (disabled) classes.push("fc-day-disabled");
      if (holiday) classes.push("is-holiday");

      return classes;
    },

    dateClick: function (info) {
      const clickedDate = info.dateStr;
      const dateObj = info.date;
      // 5) 의사 선택 여부 확인
      const doctorId = doctorIdInput ? doctorIdInput.value : null;
      if (!doctorId) {
        alert("먼저 의사를 선택해 주세요.");
        return;
      }
      // 1) 범위 밖/과거/일요일 차단
      if (isDisabledDate(dateObj)) {
        alert("해당 날짜에는 예약이 불가합니다.");
        return;
      }

      // 2) 공휴일 차단 (비교는 slice(0,10)로 통일)
      if (isHolidayDateStr(clickedDate)) {
        alert("공휴일에는 예약이 불가합니다.");
        return;
      }

      // 3) 날짜 선택 표시
      document.querySelectorAll(".fc-daygrid-day").forEach(dayCell => {
        dayCell.classList.remove("fc-day-selected");
      });

      const cell = document.querySelector(`.fc-daygrid-day[data-date="${clickedDate}"]`);
      if (cell) cell.classList.add("fc-day-selected");

      // 4) 선택 날짜 저장
      if (selectedDateInput) selectedDateInput.value = clickedDate;

      

      // 6) 슬롯 로드
      loadSlots(doctorId, clickedDate);
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
    const now = new Date(today); // 현재 시각
    const todayStr = today.toISOString().slice(0, 10); // YYYY-MM-DD
    const isToday = (dateStr === todayStr);
    function isPastTime(slot) {
      if (!isToday) return false;

      const [hour, minute] = slot.start_time.split(":").map(Number);

      const slotTime = new Date(today);
      slotTime.setHours(hour, minute, 0, 0);

      return slotTime < now;
    };
    fetch(`/reservations/api/doctor-slots/?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        const amRow = document.querySelector(".time-select .am-row");
        const pmRow = document.querySelector(".time-select .pm-row");
        const selectedSlotInput = document.getElementById("selectedSlotId");        

        if (!amRow || !pmRow || !selectedSlotInput) return;

        amRow.innerHTML = "";
        pmRow.innerHTML = "";
        selectedSlotInput.value = "";

        const isClosed = (slot) => slot.status === "CLOSED" || isPastTime(slot);
        
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
            document.querySelectorAll(".time-btn").forEach(b => b.classList.remove("selected"));
            btn.classList.add("selected");
            selectedSlotInput.value = slot.slot_id;
          });

          return btn;
        };

        if (Array.isArray(data.am) && data.am.length > 0) {
          data.am.forEach(s => amRow.appendChild(makeSlotButton(s)));
        } else {
          amRow.textContent = "오전 예약 가능 시간이 없습니다.";
        }

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
