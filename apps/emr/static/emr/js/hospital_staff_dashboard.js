function goToRecord(type, patientName, status) {

    if (status === 'COMPLETED') {
        alert(`${type} 기록은 완료 상태이므로 작성 화면으로 이동할 수 없습니다.`);
        return;
    }

    let pageName;
    let statusAllowed = [];

    if (type === 'Treatment') {
        pageName = '치료기록 화면 (14페이지)';
        statusAllowed = ['PENDING', 'IN_PROGRESS'];
    } else if (type === 'Lab') {
        pageName = '검사 기록 작성 (12페이지)';
        statusAllowed = ['PENDING', 'SAMPLED'];
    }

    if (statusAllowed.includes(status)) {
        alert(`환자: ${patientName} (${status})님의 ${pageName}으로 이동합니다.`);
        // 실제 라우팅: location.href = `/emr/record?type=${type}&patient=${patientName}`;
    }
}
