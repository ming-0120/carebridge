// static/reservations/js/reservation_page.js
document.addEventListener("DOMContentLoaded", () => {
  // ============================
  // 공통 유틸
  // ============================
  function toYmdLocal(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const d = String(dateObj.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // ============================
  // 1. 의사 선택
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
  // 2. FullCalendar 초기화
  // ============================
  const calendarEl = document.getElementById("calendar");
  const selectedDateInput = document.getElementById("selectedDate");

  if (!calendarEl) return;

  // 오늘 ~ 오늘+14일까지만 "예약 가능" 범위
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const limit = new Date(today);
  limit.setDate(limit.getDate() + 14); // 오늘 포함 2주

  // 예약 가능 여부 판별 함수
  // - 일요일만 막기(토요일은 허용)
  // - 2주 범위 밖/과거 막기
  function isDisabledDate(dateObj) {
    const d = new Date(dateObj);
    d.setHours(0, 0, 0, 0);

    const day = d.getDay(); // 0:일, 6:토
    const isSunday = day === 0;
    const isOutOfRange = d < today || d > limit;

    return isSunday || isOutOfRange;
  }

  // HOLIDAYS 안전 접근
  function getHolidayList() {
    return Array.isArray(window.HOLIDAYS) ? window.HOLIDAYS : [];
  }

  // 공휴일 여부
  function isHolidayYmd(ymd) {
    const list = getHolidayList();
    return list.some((h) => String(h.date).slice(0, 10) === ymd);
  }

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    locale: "ko",
    height: "auto",
    showNonCurrentDates: false,
    fixedWeekCount: false,

    // ✅ 월/주 이동 시: 현재 화면 범위의 공휴일을 다시 받아오기
    // ⚠️ render() 금지. rerenderDates() 사용
    datesSet: async function (info) {
      try {
        const params = new URLSearchParams({
          start: info.startStr,
          end: info.endStr,
        });

        const res = await fetch(`/reservations/api/holidays/?${params.toString()}`);
        const data = await res.json();

        window.HOLIDAYS = Array.isArray(data) ? data : [];
        calendar.rerenderDates(); // ✅ 셀 클래스 재계산
      } catch (e) {
        console.error("holidays load error", e);
        window.HOLIDAYS = [];
        calendar.rerenderDates();
      }
    },

    // ✅ 날짜 셀 클래스(공휴일/비활성) 부여: dayCellDidMount 대신 이걸 사용
    dayCellClassNames: function (arg) {
      const ymd = toYmdLocal(arg.date);

      const holiday = isHolidayYmd(ymd);
      const disabled = isDisabledDate(arg.date);

      const classes = [];
      if (disabled || holiday) classes.push("fc-day-disabled");
      if (holiday) classes.push("is-holiday");

      return classes;
    },

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
        .then((data) => successCallback(data))
        .catch((err) => {
          console.error("events load error", err);
          successCallback([]);
          failureCallback(err);
        });
    },

    dateClick: function (info) {
      const clickedDate = info.dateStr; // YYYY-MM-DD (FullCalendar 제공)
      const dateObj = info.date;

      // 0) 의사 선택 여부 확인 (먼저)
      const doctorId = doctorIdInput ? doctorIdInput.value : null;
      if (!doctorId) {
        alert("먼저 의사를 선택해 주세요.");
        return;
      }

      // 1) 일요일 / 2주 범위 밖 / 과거 차단
      if (isDisabledDate(dateObj)) {
        alert("해당 날짜에는 예약이 불가합니다.");
        return;
      }

      // 2) 공휴일 차단
      const holiday = isHolidayYmd(clickedDate);
      if (holiday) {
        alert("공휴일에는 예약이 불가합니다.");
        return;
      }

      // 3) 날짜 선택 표시
      document.querySelectorAll(".fc-daygrid-day").forEach((dayCell) => {
        dayCell.classList.remove("fc-day-selected");
      });

      const cell = document.querySelector(`.fc-daygrid-day[data-date="${clickedDate}"]`);
      if (cell) cell.classList.add("fc-day-selected");

      // 4) 선택 날짜 저장
      if (selectedDateInput) selectedDateInput.value = clickedDate;

      // 5) 타임 슬롯 로드
      loadSlots(doctorId, clickedDate);
    },
  });

  calendar.render();
  window.calendar = calendar;

  // ============================
  // 3. 슬롯 로드 + 버튼 렌더
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
