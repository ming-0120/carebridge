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
        if (data.message == 'lab') {
            getLabRecord();
        } else if (data.message == 'treatment') {
            console.log(data.message);
        }
    }
};

// 5. 연결 끊김 처리
socket.onclose = function(e) {
    console.error('웹소켓 연결이 끊어졌습니다.');
};


async function getLabRecord() {
    response = await fetch('/mstaff/get_lab_record/');
    const datas = await response.json();
    const result = [];

    for(d of datas.lab_order) {
        result.push(`<tr 
            class="${d.lab.is_urgent == true ? 'emergency-row': ''}"
        >
            <td>${d.user.name}</td>
            <td>${d.user_age}</td>
            <td>
                ${d.user.gender == 'F' ? '여' : '남'}
            </td>
            <td>
                ${d.doctor_info.name}
            </td>
            <td>
                <button 
                    class="status-button 
                        ${d.lab.status == 'Pending' ? 'status-pending':'status-sampled'}"
                    
                    onclick="goToRecord(
                        'Lab', 
                        '${d.lab.lab_order_id}',
                        '${d.user.user_id}',
                        '${d.record_id}'
                    );"
                >
                    ${d.lab.status == 'Pending' ? 'PENDING':'SAMPLED'}
                </button>
            </td>
        </tr>`);
    }

    document.querySelector('#labTable tbody').innerHTML = result.join('\n');
    // $('#labTable tbody').html(result.join('\n'));
    $('#labPending').html(datas.lab_pending_count);
    $('#labSampled').html(datas.lab_sampled_count);
    $('#labEmergency').html(datas.lab_is_urgent_count);

    // window.location.reload();
}