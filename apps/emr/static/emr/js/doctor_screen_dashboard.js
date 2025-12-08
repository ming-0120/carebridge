let selectedDate = undefined;
let currentYear = new Date().getFullYear();
function saveMemo() {
    const memoContent = document.getElementById('doctorMemo').value;

    const url = "/mstaff/set_doctor_memo/";
    const formData = new FormData();
    formData.append('memo', memoContent);
    formData.append('doctor_id', doctor_id);
    fetch(url, {
        method: 'POST',
        body: formData,
    });
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

function getLastSevenDays() {
    const dates = [];
    
    // 7일간 반복 (0부터 6까지 총 7번)
    for (let i = 0; i < 7; i++) {
        // 1. 현재 날짜 객체를 생성합니다. (루프가 돌 때마다 현재 시점을 복사)
        const d = new Date();
        
        // 2. 현재 날짜에서 i일 만큼 뺌 (i=0: 오늘, i=1: 어제, ..., i=6: 6일 전)
        d.setDate(d.getDate() - i); 

        // 3. YYYY-MM-DD 형식으로 포맷팅
        const year = d.getFullYear();
        // getMonth()는 0부터 시작하므로 +1을 해주고, padStart로 두 자릿수를 맞춥니다.
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');

        // 4. 배열의 맨 뒤(i=0)가 아닌 맨 앞(i=6)부터 채워서 날짜 순서를 오름차순으로 맞춥니다.
        // 예를 들어, 12월 8일인 경우: ['12-02', '12-03', ..., '12-08'] 순서로 저장됩니다.
        dates.unshift(`${year}-${month}-${day}`);
    }

    return dates;
}