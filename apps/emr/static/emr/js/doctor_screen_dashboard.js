let selectedDate = undefined;
let currentYear = new Date().getFullYear();

// ============================
// medical_record 이동 날짜 제한 토글 (주석 1개로 전환)
// - (현재 상태) 주석 설정(OFF) -> "오늘"만 medical_record 이동 가능
// - 주석 해제(ON)             -> "오늘이 아닌 날짜"만 medical_record 이동 가능
// ============================
// 기본 정책: doctor_dashboard에서는 "오늘 예약"만 medical_record로 이동 가능
let ENABLE_NON_TODAY_MEDICAL_RECORD = false;
// 아래를 true로 바꾸면(디버그/특수 케이스) 날짜 제한 없이 이동 가능
// let ENABLE_NON_TODAY_MEDICAL_RECORD = true;

function getTodayIsoDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function isMedicalRecordDateAllowed(dateStr) {
    const today = getTodayIsoDate();
    if (ENABLE_NON_TODAY_MEDICAL_RECORD) {
        return true;
    }
    return dateStr === today;
}
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
        fixedWeekCount: false,
        dateClick: async function(info) {
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
            console.log(info.dateStr);

            const url = `/mstaff/get_reservation_medical_record/?date=${info.dateStr}&doctor_id=${doctor_id}`;
            response = await fetch(url);

            const datas = await response.json();

            if (response.status == 200) {
                const result = [];
                const canNavigateMedicalRecord = isMedicalRecordDateAllowed(info.dateStr);
                result.push(`
                    <h3>예약 환자 (${datas.users.length}명)</h3>    
                `)
                for (d of datas.users) {
                    const disabledClass = canNavigateMedicalRecord ? "" : " patient-list-item--disabled";
                    const clickAttr = canNavigateMedicalRecord
                        ? `onclick="toMedicalRecord('${d.user.user_id}', '${d.slot.slot_id}', '${d.slot.slot_date}', '${d.reservation_id || ""}');"`
                        : "";
                    const titleAttr = canNavigateMedicalRecord
                        ? ""
                        : `title="선택한 날짜는 진료기록 작성이 제한되어 있습니다."`;
                    result.push(`
                        <div class="patient-list-item${disabledClass}" ${clickAttr} ${titleAttr}>
                            <h4>성명: ${d.user.name}</h4>
                            <p>생년월일: ${rrnToBirthdate(d.user.resident_reg_no)} | 성별: ${d.user.gender == 'F' ? '여' : '남'}</p>
                            <p>예약시간: ${d.slot.slot_date} ${d.slot.start_time}</p>
                        </div>    
                    `)
                }
                $('#patinetList').html(result.join('\n'));
            }
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
        locale: "ko",
        customButtons: {
            // ⭐ 'myTodayButton'이라는 사용자 정의 버튼 정의
            myTodayButton: {
                text: '오늘', // 버튼에 표시될 텍스트
                click: async function() {
                    calendar.today(); 

                    if (selectedDate) {
                        selectedDate.style.backgroundColor = '#ffffff';
                        selectedDate = undefined;
                    }

                    if (document.getElementsByClassName('fc-day-today')[0]) {
                        document.getElementsByClassName('fc-day-today')[0].style.backgroundColor = 'rgba(255, 220, 40, .15)';
                    }
                    const date = new Date();
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    const today = `${year}-${month}-${day}`;

                    const url = `/mstaff/get_reservation_medical_record/?date=${today}&doctor_id=${doctor_id}`;
                    response = await fetch(url);

                    const datas = await response.json();

                    if (response.status == 200) {
                        const result = [];
                        const canNavigateMedicalRecord = isMedicalRecordDateAllowed(today);
                        result.push(`
                            <h3>예약 환자 (${datas.users.length}명)</h3>    
                        `)
                        for (d of datas.users) {
                            const disabledClass = canNavigateMedicalRecord ? "" : " patient-list-item--disabled";
                            const clickAttr = canNavigateMedicalRecord
                                ? `onclick="toMedicalRecord('${d.user.user_id}', '${d.slot.slot_id}', '${d.slot.slot_date}', '${d.reservation_id || ""}');"`
                                : "";
                            const titleAttr = canNavigateMedicalRecord
                                ? ""
                                : `title="선택한 날짜는 진료기록 작성이 제한되어 있습니다."`;
                            result.push(`
                                <div class="patient-list-item${disabledClass}" ${clickAttr} ${titleAttr}>
                                    <h4>성명: ${d.user.name}</h4>
                                    <p>생년월일: ${rrnToBirthdate(d.user.resident_reg_no)} | 성별: ${d.user.gender == 'F' ? '여' : '남'}</p>
                                    <p>예약시간: ${d.slot.slot_date} ${d.slot.start_time}</p>
                                </div>    
                            `)
                        }
                        $('#patinetList').html(result.join('\n'));
                    }
                    toTodayPatient(doctor_id, today);
                }
            }
        },
        headerToolbar: {
            // ⭐ 내장 'today' 대신 사용자 정의 버튼 이름 사용
            left: 'title', 
            center: '',
            right: 'myTodayButton prev,next',
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

function rrnToBirthdate(regNum) {
    // 1. 입력된 주민등록번호에서 하이픈(-) 등 비숫자 문자 제거 및 정리
    let regNumStr = String(regNum).replace(/[^0-9]/g, '').trim();

    // 2. 입력값 유효성 검사 (최소 7자리 확인)
    if (regNumStr.length < 7) {
        return "정보 오류: 주민등록번호는 최소 7자리여야 합니다.";
    } 

    // 추출에 사용할 정확히 7자리만 선택
    regNumStr = regNumStr.substring(0, 7);

    // 3. 생년월일 부분 (앞 6자리)
    const yy = regNumStr.substring(0, 2); // 년도 끝 두 자리
    const mm = regNumStr.substring(2, 4); // 월
    const dd = regNumStr.substring(4, 6); // 일
    
    // 4. 성별/세기 구분 번호 (7번째 자리)
    const centuryDigit = regNumStr.charAt(6); 
    let yearPrefix = '';

    // 5. 세기 결정
    switch (centuryDigit) {
        // 1900년대 출생 남성/여성 (1, 2) 또는 외국인 (7, 8)
        case '1':
        case '2':
        case '7':
        case '8':
            yearPrefix = '19';
            break;
        // 2000년대 출생 남성/여성 (3, 4) 또는 외국인 (5, 6)
        case '3':
        case '4':
        case '5':
        case '6':
            yearPrefix = '20';
            break;
        // 1800년대 출생 남성/여성 (9, 0) - 거의 사용되지 않음
        case '9':
        case '0':
            yearPrefix = '18';
            break;
        default:
            return "세기 오류: 유효하지 않은 7번째 자리 번호입니다.";
    }
    
    // 6. 최종 생년월일 문자열 조합
    const fullYear = yearPrefix + yy;
    const birthDate = `${fullYear}-${mm}-${dd}`;
    
    return birthDate;
}

function toMedicalRecord(patient_id, slot_id, slot_date, reservation_id) {
    if (slot_date && !isMedicalRecordDateAllowed(slot_date)) {
        alert(`선택한 날짜(${slot_date})는 진료기록 작성이 제한되어 있습니다.`);
        return;
    }
    const params = new URLSearchParams();
    params.set("patient_id", patient_id);
    if (reservation_id) params.set("reservation_id", reservation_id);
    if (slot_id) params.set("slot_id", slot_id);
    if (slot_date) params.set("date", slot_date);
    window.location.href = `/mstaff/medical_record/?${params.toString()}`;
}

function toTodayPatient(doctor_id, today) {
    window.location.href = `/mstaff/today_list/?doctor_id=${doctor_id}&date=${today}`;
}

function toPatientSearch() {
    const query = $('#searchText').val();
    const keyword = (query || "").trim();
    const qs = keyword ? `?keyword=${encodeURIComponent(keyword)}` : "";
    window.location.href = `/mstaff/patient_search_list/${qs}`;
}
