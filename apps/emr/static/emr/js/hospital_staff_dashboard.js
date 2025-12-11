function goToRecord(type, order_id, user_id, medical_record_id) {

    // if (status === 'COMPLETED') {
    //     alert(`${type} 기록은 완료 상태이므로 작성 화면으로 이동할 수 없습니다.`);
    //     return;
    // }

    if (type === 'Treatment') {
        window.location.href = `/mstaff/treatment_verify/?order_id=${order_id}&user_id=${user_id}&medical_record_id=${medical_record_id}`
    } else if (type === 'Lab') {
        window.location.href = `/mstaff/lab_record/?order_id=${order_id}&user_id=${user_id}&medical_record_id=${medical_record_id}`
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const socket = new WebSocket(
        'ws://' + window.location.host + '/ws/hospital_dashboard/' + 137 + '/'
    );

    // 3. 연결 성공 시 로그
    socket.onopen = function(e) {
        console.log('웹소켓 서버에 연결되었습니다.');
    };

    // [핵심] 4. 서버(Consumer)로부터 메시지가 왔을 때 실행
    socket.onmessage = function(e) {
        const data = JSON.parse(e.data);
        
        // type이 UPDATE_REQUIRED면 화면 갱신 로직 수행
        if (data.type === 'UPDATE_REQUIRED') {
            console.log(data.message);
        }
    };

    // 5. 연결 끊김 처리
    socket.onclose = function(e) {
        console.error('웹소켓 연결이 끊어졌습니다.');
    };
});