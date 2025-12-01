function saveMemo() {
    const memoContent = document.getElementById('doctorMemo').value;
    // 실제 환경에서는 서버나 로컬 스토리지에 저장
    console.log("메모 자동 저장됨:", memoContent);
    // alert('메모가 저장되었습니다.');
}

let instance = jSuites.calendar(document.getElementById('calendar'), {
    format: 'YYYY-MM-DD',
    onupdate: function() {
        console.log(arguments[1])
    },
    months: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
    monthsFull: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
    weekdays: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
    weekdays_short: ['일', '월', '화', '수', '목', '금', '토'],
});