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
