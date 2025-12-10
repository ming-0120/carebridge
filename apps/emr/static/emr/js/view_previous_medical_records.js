

// 초기 목록 생성
function loadRecordList() {
    const listContent = document.querySelector('#recordList .list-content');
    listContent.innerHTML = '';
    
    records.forEach(record => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.setAttribute('data-id', record.id);
        item.innerHTML = `
            ${record.date} | 기록유형: ${record.type} <br>
            작성의: ${record.author} <span style="float:right; color:#007bff;">[상세보기]</span>
        `;
        item.onclick = () => selectRecord(item, record);
        listContent.appendChild(item);
    });
    
    if (records.length > 0) {
        selectRecord(document.querySelector('.list-item'), records[0]);
    }
}

// 기록 선택 시 중앙·오른쪽 업데이트
function selectRecord(selectedItem, record) {
    document.querySelectorAll('.list-item').forEach(item => item.classList.remove('selected'));
    selectedItem.classList.add('selected');

    document.getElementById('soapDetail').innerHTML = `
        <div style="font-size: 13px; color: #6c757d; margin-bottom: 15px;">
            진료일시: ${record.date} ${record.time} | 작성의: ${record.author} | 기록유형: ${record.type}
        </div>
        <div class="read-only-text">
            <pre style="margin: 0;">
<strong>[S]</strong> ${record.soap.match(/S\] (.*)\n/)?.[1] || '내용 없음'}
<strong>[O]</strong> ${record.soap.match(/O\] (.*)\n/)?.[1] || '내용 없음'}
<strong>[A]</strong> ${record.soap.match(/A\] (.*)\n/)?.[1] || '내용 없음'}
<strong>[P]</strong> ${record.soap.match(/P\] (.*)/)?.[1] || '내용 없음'}
            </pre>
        </div>
    `;

    updateOrderSummaries(record);
}

function updateOrderSummaries(record) {
    document.getElementById('treatmentSummary').innerHTML = record.treatment ? `
        <div class="order-content-row"><strong>처치명:</strong> ${record.treatment.name}</div>
        <div class="order-content-row"><strong>코드:</strong> ${record.treatment.code}</div>
        <div class="order-content-row"><strong>상태:</strong> ${record.treatment.status}</div>
        <button class="detail-button" onclick="openDetailModal('treatment')">자세히</button>
    ` : `<p style="color: #6c757d; font-size: 13px;">연결된 치료기록 없음</p>`;
    

    document.getElementById('labOrderSummary').innerHTML = record.lab ? `
        <div class="order-content-row"><strong>검사명:</strong> ${record.lab.name}</div>
        <div class="order-content-row"><strong>검체:</strong> ${record.lab.specimen}</div>
        <div class="order-content-row"><strong>긴급 여부:</strong> ${record.lab.urgent}</div>
        <button class="detail-button" onclick="openDetailModal('lab')">자세히</button>
    ` : `<p style="color: #6c757d; font-size: 13px;">연결된 검사 오더 없음</p>`;


    document.getElementById('prescriptionSummary').innerHTML = record.prescription ? `
        <div class="order-content-row"><strong>약품명:</strong> ${record.prescription.name}</div>
        <div class="order-content-row"><strong>코드:</strong> ${record.prescription.code}</div>
        <div class="order-content-row"><strong>상태:</strong> ${record.prescription.status}</div>
        <button class="detail-button" onclick="openDetailModal('prescription')">자세히</button>
    ` : `<p style="color: #6c757d; font-size: 13px;">연결된 처방기록 없음</p>`;
}

// 모달 열기
function openDetailModal(type) {
    document.querySelectorAll('.modal-overlay').forEach(m => m.style.visibility = 'hidden');

    let modalId = null;
    if (type === 'treatment') modalId = 'treatmentDetailModal';
    if (type === 'lab') modalId = 'labDetailModal';
    if (type === 'prescription') modalId = 'prescriptionDetailModal';

    if (modalId) document.getElementById(modalId).style.visibility = 'visible';
}

// 모달 닫기
function closeModal(id) {
    document.getElementById(id).style.visibility = 'hidden';
}

document.addEventListener('DOMContentLoaded', loadRecordList);
