let selectedDate = undefined;
let currentYear = new Date().getFullYear();
function saveMemo() {
    const memoContent = document.getElementById('doctorMemo').value;
    // 실제 환경에서는 서버나 로컬 스토리지에 저장
    console.log("메모 자동 저장됨:", memoContent);
    // alert('메모가 저장되었습니다.');
}

window.onload = function() {
    // console.log(JSON.parse(holidays))
    var calendarEl = document.getElementById('calendar');
    var calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        dateClick: function(info) {
            if (!selectedDate) {
                selectedDate = info.dayEl
            } else {
                selectedDate.style.backgroundColor = '#ffffff'
                selectedDate = info.dayEl
            }

            if (document.getElementsByClassName('fc-day-today')[0]) {
                document.getElementsByClassName('fc-day-today')[0].style.backgroundColor = 'rgba(255, 220, 40, .15)'
            }
            info.dayEl.style.backgroundColor = '#2c6cc5aa';
            console.log(info.dateStr)
        },
        selectable: false,
        selectOverlap: false,
        height: 400,
        dayCellClassNames: function(arg) {
            const day = arg.date.getDay();
            const y = arg.date.getFullYear();
            const m = String(arg.date.getMonth() + 1).padStart(2, "0");
            const d = String(arg.date.getDate()).padStart(2, "0");
            const dateStr = `${y}-${m}-${d}`;
            const holiday = holidays && holidays.find((h) => h.date == dateStr);
            if (holiday) return ["fc-holiday-cell"];
            return [];
        },
    });
    calendar.render();
}

