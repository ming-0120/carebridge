let selectedLabItem = null;
let fileCounter = 0;
fileList = [];
/* 파일 첨부 */
function addAttachment(input) {
    // // input.files는 선택된 모든 파일의 FileList 객체입니다.
    // const files = input.files; 
    
    // // 파일 목록을 초기화하거나 새로운 파일만 추가하는 로직이 필요합니다.
    // const list = document.getElementById('attachmentList');

    // // 선택된 모든 파일을 반복하며 처리
    // for (const file of files) {
    //     // 기존 파일 목록에 파일 추가 로직
    //     const li = document.createElement('li');
    //     li.setAttribute('data-filename', file.name);
    //     li.innerHTML = `
    //         <span>${file.name}</span>
    //         <button class="delete-btn" onclick="removeAttachment(this)">x</button>
    //     `;
    //     list.appendChild(li);
    //     fileList.push(file);
    //     alert(`${file.name} 파일이 첨부되었습니다.`);
    // }

    const files = input.files; 
    const list = document.getElementById('attachmentList');

    for (const file of files) {
        // 1. 파일 객체와 UI를 연결할 고유 ID 생성
        // 파일 이름, 현재 시간, 랜덤 문자열을 조합하여 충돌을 피합니다.
        const uniqueId = Date.now() + '_' + file.name + '_' + Math.random().toString(36).substring(2, 9);
        
        // 2. 파일 객체에 고유 ID 할당
        file.uniqueId = uniqueId; 
        
        // 3. UI 목록에 고유 ID 반영
        const li = document.createElement('li');
        li.setAttribute('data-file-id', uniqueId); // li에 고유 ID 저장
        li.innerHTML = `
            <span>${file.name}</span>
            <button class="delete-btn" onclick="removeAttachment(this, '${uniqueId}')">x</button>
        `;
        list.appendChild(li);
        
        // 4. 파일 객체를 fileList에 추가
        fileList.push(file);
        alert(`${file.name} 파일이 첨부되었습니다. (ID: ${uniqueId})`);
    }
    
    // 다음 파일 선택을 위해 input 값 초기화
    input.value = '';
}

// function removeAttachment(btn) {
//     const li = btn.parentNode;
//     alert(`${li.getAttribute('data-filename')} 파일을 삭제합니다.`);
//     li.remove();
// }

function removeAttachment(button, uniqueId) {
    
    // 1. fileList에서 해당 uniqueId를 가진 파일의 인덱스를 찾습니다.
    const indexToRemove = fileList.findIndex(file => file.uniqueId === uniqueId);

    if (indexToRemove !== -1) {
        // 2. fileList 배열에서 해당 인덱스의 파일 1개를 제거합니다.
        const removedFile = fileList.splice(indexToRemove, 1);
        console.log(`${removedFile[0].name} 파일을 fileList에서 삭제했습니다. 남은 파일 수: ${fileList.length}`);
    }

    // 3. 화면 목록 (li) 제거
    const li = button.parentElement;
    li.remove();

    // (참고: 기존 코드에서 hiddenInput 관련 부분은 현재 Ajax + FormData 방식에서는 불필요합니다.)
}

/* 검사 상태 업데이트 */
function updateStatus(newStatus) {
    const formData = new FormData();
    if (newStatus === 'Sampled') {
        // startTime.value = getCurrentTime();
        // currentState = 'In progress';

        if ($('#labName').val().trim() == '' && $('#labCode').val().trim() == '') {
            alert('검사항목은 필수값입니다.')
            return;
        }

        formData.append('order_id', $('#order_id').val());
        formData.append('user_id', $('#user_id').val());
        formData.append('medical_record_id', $('#medical_record_id').val());
        formData.append('current_status', $('#current_status').val());
        formData.append('labName', $('#labName').val());
        formData.append('labCode', $('#labCode').val());
        formData.append('specimenType', $("#frmLab>[name=specimenType]>option:selected").val());
        formData.append('specialNotes', $('#specialNotes').val());

        for (const file of fileList) {
            formData.append('fileAttachment', file); 
        }

        const url = 'http://127.0.0.1:8000/mstaff/lab_record/'
        fetch(url, {
            method: 'POST',
            body: formData,
        })

    } else if (newStatus === 'Completed') {

        $("form[name='frmLab']").submit();
    }
}

function goToNextPatient() {
    alert('다음 대기 환자 기록 작성 화면으로 이동합니다.');
}

/* 모달 열기 */
function openLabSearchModal() {
    document.getElementById('labSearchModal').style.visibility = 'visible';
}

/* 모달 닫기 */
function closeModal(id) {
    document.getElementById(id).style.visibility = 'hidden';
    selectedLabItem = null;
    document.querySelectorAll('#labResultTable tbody tr').forEach(r => r.classList.remove('selected'));
}

/* 검색 기능 (Mock) */
async function labPerformSearch() {
    const query = document.getElementById('labNameInput').value;
    const url = `http://127.0.0.1:8000/mstaff/lab_data_search/?search=${query}`;
    const response = await fetch(url);
    const datas = await response.json();
    const table = [];

    for(row of datas.lab_datas) {
        table.push(`
            <tr data-code="${row.lab_code}" data-name="${row.lab_name}" onclick="selectLabItem(this)">
                <td>${row.lab_name}</td>
                <td>${row.lab_code}</td>
            </tr>
        `);
    }

    $('#labResultTable tbody').html(table.join('\n'));
}

/* 항목 선택 */
function selectLabItem(row) {
    document.querySelectorAll('#labResultTable tbody tr').forEach(r => r.classList.remove('selected'));
    row.classList.add('selected');

    selectedLabItem = {
        code: row.getAttribute('data-code'),
        name: row.getAttribute('data-name')
    };
}

/* 선택 항목을 main UI에 반영 */
function confirmSelection() {
    if (!selectedLabItem) {
        alert('검사항목을 선택해야 합니다.');
        return;
    }

    document.getElementById('labName').value = selectedLabItem.name;
    document.getElementById('labCode').value = selectedLabItem.code;

    closeModal('labSearchModal');
}

document.addEventListener('DOMContentLoaded', () => {
    // document.getElementById('btnCompleted').disabled = true;
});
