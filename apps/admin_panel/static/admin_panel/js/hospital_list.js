// 병원 목록 페이지 JavaScript
// 공통 함수는 admin_common.js를 참조하세요

/**
 * 병원 선택 함수
 * 
 * 목적: 병원 목록에서 특정 병원을 선택하고 상세 정보를 표시
 */
function selectHospital(event, hospitalId) {
  selectItem(event, hospitalId, 'hospital_id');
}

// 테이블 행 클릭 이벤트 연결은 admin_common.js의 attachTableRowListeners 함수 사용
// 정렬 링크 이벤트 연결은 admin_common.js의 attachSortListeners 함수 사용

/**
 * 페이지 로드 시 초기화 함수
 */
document.addEventListener('DOMContentLoaded', function() {
  // 공통 함수 사용
  attachTableRowListeners('.hospital-row[data-hospital-id]', 'data-hospital-id', selectHospital);
  
  // ========= 페이지네이션 후 이벤트 리스너 재연결 함수 =========
  // 목적: 페이지네이션 완료 후 테이블 행 클릭 이벤트 리스너를 다시 연결
  //   - handlePaginationAjax 함수에서 호출됨
  //   - 페이지네이션으로 새로운 HTML이 추가되면 기존 이벤트 리스너가 사라지므로 다시 연결 필요
  window.reattachTableRowListeners = function() {
    attachTableRowListeners('.hospital-row[data-hospital-id]', 'data-hospital-id', selectHospital);
    // 정렬 링크 이벤트 리스너 재연결
    attachSortListeners();
    // 중복 호출 방지: attachPaginationListeners는 admin_common.js의 handlePaginationAjax에서 이미 호출됨
  };
  
  attachSortListeners();
  
  // URL 파라미터에서 선택된 병원 ID 확인
  const urlParams = new URLSearchParams(window.location.search);
  const selectedHospitalId = urlParams.get('hospital_id');
  
  // 선택된 병원 행에 'selected' 클래스 추가
  if (selectedHospitalId) {
    const selectedRow = document.querySelector(`[data-hospital-id="${selectedHospitalId}"]`);
    if (selectedRow) {
      selectedRow.classList.add('selected');
    }
  }
  
  // 검색조건 변경 시 검색어 초기화
  const searchTypeSelect = document.querySelector('select[name="search_type"]');
  if (searchTypeSelect) {
    searchTypeSelect.addEventListener('change', function() {
      const searchKeywordInput = document.querySelector('input[name="search_keyword"]');
      if (searchKeywordInput) {
        searchKeywordInput.value = '';
      }
      
      // 검색조건이 "검색조건" (빈 값)인 경우 전체 목록으로 이동
      if (!this.value || this.value === '') {
        window.location.href = window.location.pathname;
      }
    });
  }
  
  // ========= 병원추가 모달 관련 함수 =========
  
  /**
   * 에러 메시지 표시 함수
   * 
   * 목적: 모달 내부에 에러 메시지를 표시
   */
  function showErrorMessage(message) {
    const errorDiv = document.getElementById('modalErrorMessage');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'flex';
      // 스크롤을 에러 메시지로 이동
      errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
  
  /**
   * 에러 메시지 숨기기 함수
   * 
   * 목적: 모달 내부의 에러 메시지를 숨김
   */
  function hideErrorMessage() {
    const errorDiv = document.getElementById('modalErrorMessage');
    if (errorDiv) {
      errorDiv.style.display = 'none';
      errorDiv.textContent = '';
    }
  }
  
  /**
   * 입력 필드 에러 상태 제거 함수
   * 
   * 목적: 모든 입력 필드의 에러 상태를 제거
   */
  function clearFieldErrors() {
    const inputs = document.querySelectorAll('#addHospitalForm .form-input, #addHospitalForm .form-textarea');
    inputs.forEach(input => {
      input.classList.remove('error');
    });
  }
  
  /**
   * 모달 열기 함수
   * 
   * 목적: 병원추가 모달을 표시
   */
  function openAddHospitalModal() {
    const modal = document.getElementById('addHospitalModal');
    console.log('[모달 열기] 모달 요소:', modal);
    if (modal) {
      modal.classList.add('show');
      console.log('[모달 열기] show 클래스 추가 완료, 현재 클래스:', modal.className);
      // 모달이 열릴 때 body 스크롤 방지
      document.body.style.overflow = 'hidden';
    } else {
      console.error('[모달 열기] 모달을 찾을 수 없습니다. ID: addHospitalModal');
    }
  }
  
  /**
   * 모달 닫기 함수
   * 
   * 목적: 병원추가 모달을 숨김
   */
  function closeAddHospitalModal() {
    const modal = document.getElementById('addHospitalModal');
    if (modal) {
      modal.classList.remove('show');
      // 모달이 닫힐 때 body 스크롤 복원
      document.body.style.overflow = '';
      // 폼 초기화
      const form = document.getElementById('addHospitalForm');
      if (form) {
        form.reset();
        // 에러 메시지 숨기기
        hideErrorMessage();
        // 필드 에러 상태 제거
        clearFieldErrors();
        // 주소 필드 초기화
        const addressInput = document.getElementById('hospital_address');
        if (addressInput) addressInput.value = '';
        // 제출 버튼 활성화
        const submitBtn = form.querySelector('.btn-submit');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = '추가';
        }
      }
    }
  }
  
  // 병원추가 버튼 클릭 이벤트
  const openAddHospitalBtn = document.getElementById('openAddHospitalModal');
  console.log('[병원추가 버튼] 버튼 요소:', openAddHospitalBtn);
  if (openAddHospitalBtn) {
    openAddHospitalBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('[병원추가 버튼] 클릭 이벤트 발생');
      // 에러 메시지 및 필드 에러 상태 초기화
      hideErrorMessage();
      clearFieldErrors();
      openAddHospitalModal();
    });
    console.log('[병원추가 버튼] 이벤트 리스너 연결 완료');
  } else {
    console.error('[병원추가 버튼] 버튼을 찾을 수 없습니다. ID: openAddHospitalModal');
  }
  
  // 모달 닫기 버튼 클릭 이벤트
  const closeAddHospitalBtn = document.getElementById('closeAddHospitalModal');
  if (closeAddHospitalBtn) {
    closeAddHospitalBtn.addEventListener('click', function(e) {
      e.preventDefault();
      closeAddHospitalModal();
    });
  }
  
  // 취소 버튼 클릭 이벤트
  const cancelAddHospitalBtn = document.getElementById('cancelAddHospital');
  if (cancelAddHospitalBtn) {
    cancelAddHospitalBtn.addEventListener('click', function(e) {
      e.preventDefault();
      closeAddHospitalModal();
    });
  }
  
  // 모달 배경 클릭 시 닫기
  const modal = document.getElementById('addHospitalModal');
  if (modal) {
    modal.addEventListener('click', function(e) {
      // 모달 배경(modal)을 클릭했을 때만 닫기
      if (e.target === modal) {
        closeAddHospitalModal();
      }
    });
  }
  
  // ESC 키로 모달 닫기
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      const modal = document.getElementById('addHospitalModal');
      if (modal && modal.classList.contains('show')) {
        closeAddHospitalModal();
      }
    }
  });
  
  // ========= 병원 검색 기능 =========
  
  /**
   * 디바운스 유틸리티 함수
   * 
   * 목적: 함수 호출을 지연시켜 불필요한 호출 방지
   */
  function debounce(fn, delay) {
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }
  
  /**
   * 병원 검색 모달 열기 함수
   * 
   * 목적: 병원 검색 모달을 표시
   */
  function openHospitalSearchModal() {
    const modal = document.getElementById('hospitalSearchModal');
    if (modal) {
      modal.classList.add('show');
      document.body.style.overflow = 'hidden';
      // 검색 입력 필드 초기화 및 포커스
      const searchInput = document.getElementById('hospital-search-input');
      const resultsBody = document.getElementById('hospital-results-body');
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
      }
      if (resultsBody) {
        resultsBody.innerHTML = '';
      }
    }
  }
  
  /**
   * 병원 검색 모달 닫기 함수
   * 
   * 목적: 병원 검색 모달을 숨김
   */
  function closeHospitalSearchModal() {
    const modal = document.getElementById('hospitalSearchModal');
    if (modal) {
      modal.classList.remove('show');
      document.body.style.overflow = '';
    }
  }
  
  /**
   * 병원 검색 함수
   * 
   * 목적: 병원명으로 검색하여 결과를 표시
   */
  async function fetchHospitals(q) {
    const resultsBody = document.getElementById('hospital-results-body');
    if (!resultsBody) return;
    
    if (!q || q.trim().length === 0) {
      resultsBody.innerHTML = '';
      return;
    }

    try {
      resultsBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 20px;">검색 중...</td></tr>`;
      
      const resp = await fetch(`${HOSPITAL_SEARCH_URL}?q=${encodeURIComponent(q)}`, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });
      
      if (!resp.ok) {
        throw new Error(`HTTP error! status: ${resp.status}`);
      }
      
      const data = await resp.json();

      resultsBody.innerHTML = '';

      // API 에러 체크
      if (data.error) {
        resultsBody.innerHTML =
          `<tr><td colspan="4" style="text-align:center; padding: 20px; color: #EF4444;">검색 중 오류가 발생했습니다: ${data.error}</td></tr>`;
        return;
      }

      if (!data.results || data.results.length === 0) {
        resultsBody.innerHTML =
          `<tr><td colspan="4" style="text-align:center; padding: 20px;">검색 결과가 없습니다.</td></tr>`;
        return;
      }

      data.results.forEach((h) => {
        const tr = document.createElement('tr');
        tr.classList.add('hospital-row');
        tr.style.cursor = 'pointer';
        tr.dataset.hpid = h.hpid || h.id || ''; // hpid 우선, 없으면 id 사용
        tr.dataset.name = h.name || '';
        tr.dataset.address = h.address || '';
        // tel과 estb_date는 null일 수 있으므로 명시적으로 처리
        tr.dataset.tel = (h.tel !== null && h.tel !== undefined && h.tel !== '') ? h.tel : '';
        tr.dataset.estbDate = (h.estb_date !== null && h.estb_date !== undefined && h.estb_date !== '') ? h.estb_date : '';
        tr.dataset.lat = h.lat !== null && h.lat !== undefined ? h.lat : '';
        tr.dataset.lng = h.lng !== null && h.lng !== undefined ? h.lng : '';
        tr.dataset.drTotal = h.dr_total !== null && h.dr_total !== undefined ? h.dr_total : '';
        tr.dataset.sggu = h.sggu || '';
        tr.dataset.sido = h.sido || '';

        // 이미 등록된 병원인지 확인
        if (h.is_registered) {
          tr.classList.add('hospital-registered');
        }

        tr.innerHTML = `
          <td>${h.name || '-'}</td>
          <td>${h.address || '-'}</td>
          <td>${h.tel || '-'}</td>
          <td>${h.estb_date || '-'}</td>
        `;
        
        // 호버 효과
        tr.addEventListener('mouseenter', function() {
          if (h.is_registered) {
            this.style.backgroundColor = '#FFF4E6'; // 등록된 병원 호버 색상
          } else {
            this.style.backgroundColor = '#F8FAFF'; // 일반 병원 호버 색상
          }
        });
        tr.addEventListener('mouseleave', function() {
          // 인라인 스타일 제거하여 CSS 클래스의 배경색이 다시 적용되도록 함
          this.style.backgroundColor = '';
          // 등록된 병원인 경우 CSS 클래스의 배경색이 자동으로 적용됨
        });
        
        resultsBody.appendChild(tr);
      });
    } catch (err) {
      console.error('병원 검색 오류:', err);
      resultsBody.innerHTML =
        `<tr><td colspan="4" style="text-align:center; padding: 20px; color: #EF4444;">검색 중 오류가 발생했습니다.</td></tr>`;
    }
  }
  
  // 병원 검색 버튼 클릭 이벤트
  const openHospitalSearchModalBtn = document.getElementById('openHospitalSearchModalBtn');
  if (openHospitalSearchModalBtn) {
    openHospitalSearchModalBtn.addEventListener('click', function(e) {
      e.preventDefault();
      openHospitalSearchModal();
    });
  }
  
  // 병원 검색 모달 닫기 버튼 클릭 이벤트
  const closeHospitalSearchModalBtn = document.getElementById('closeHospitalSearchModal');
  if (closeHospitalSearchModalBtn) {
    closeHospitalSearchModalBtn.addEventListener('click', function(e) {
      e.preventDefault();
      closeHospitalSearchModal();
    });
  }
  
  // 병원 검색 모달 배경 클릭 시 닫기
  const hospitalSearchModal = document.getElementById('hospitalSearchModal');
  if (hospitalSearchModal) {
    hospitalSearchModal.addEventListener('click', function(e) {
      if (e.target === hospitalSearchModal) {
        closeHospitalSearchModal();
      }
    });
  }
  
  // 병원 검색 입력 필드 이벤트 (실시간 검색)
  const hospitalSearchInput = document.getElementById('hospital-search-input');
  const debouncedFetchHospitals = debounce(function() {
    if (hospitalSearchInput) {
      fetchHospitals(hospitalSearchInput.value);
    }
  }, 300);
  
  if (hospitalSearchInput) {
    hospitalSearchInput.addEventListener('input', debouncedFetchHospitals);
    // Enter 키로 검색
    hospitalSearchInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        fetchHospitals(this.value);
      }
    });
  }
  
  // 병원 검색 결과 클릭 시 선택
  const hospitalResultsBody = document.getElementById('hospital-results-body');
  if (hospitalResultsBody) {
    hospitalResultsBody.addEventListener('click', function(e) {
      const tr = e.target.closest('tr.hospital-row');
      if (!tr) return;

      // ⭐ DB에 등록된 병원인지 확인
      // hospital-registered 클래스가 있으면 DB에 이미 등록된 병원
      if (tr.classList.contains('hospital-registered')) {
        const hospitalName = tr.dataset.name || '이 병원';
        alert(`${hospitalName}은(는) 이미 DB에 등록된 병원입니다.\n다른 병원을 선택해주세요.`);
        return; // 선택 취소 (필드에 값 입력하지 않음, 모달도 닫지 않음)
      }

      const id = tr.dataset.id;
      const name = tr.dataset.name;
      const address = tr.dataset.address;
      const tel = tr.dataset.tel;
      const estbDate = tr.dataset.estbDate;
      const lat = tr.dataset.lat;
      const lng = tr.dataset.lng;
      const drTotal = tr.dataset.drTotal;
      const sggu = tr.dataset.sggu;
      const sido = tr.dataset.sido;

      // 병원명 필드에 자동 입력
      if (name) {
        const nameInput = document.getElementById('hospital_name');
        if (nameInput) {
          nameInput.value = name;
        }
      }
      
      // 주소 필드에 자동 입력
      if (address) {
        const addressInput = document.getElementById('hospital_address');
        if (addressInput) {
          addressInput.value = address;
        }
      }
      
      // 전화번호 필드에 자동 입력
      // tel이 null, undefined, 빈 문자열, '-'가 아닌 경우에만 입력
      if (tel && tel !== '' && tel !== '-' && tel !== 'null' && tel !== 'undefined') {
        const telInput = document.getElementById('hospital_tel');
        if (telInput) {
          telInput.value = tel;
          console.log('[병원 선택] 전화번호 저장:', tel);
        }
      } else {
        // tel이 없으면 필드 초기화
        const telInput = document.getElementById('hospital_tel');
        if (telInput) {
          telInput.value = '';
        }
      }
      
      // 개원일 필드에 자동 입력
      // estbDate가 null, undefined, 빈 문자열, '-'가 아닌 경우에만 입력
      if (estbDate && estbDate !== '' && estbDate !== '-' && estbDate !== 'null' && estbDate !== 'undefined') {
        const estbDateInput = document.getElementById('hospital_estb_date');
        if (estbDateInput) {
          estbDateInput.value = estbDate;
          console.log('[병원 선택] 개원일 저장:', estbDate);
          // 개원일이 입력되면 비밀번호 필드에 자동 입력 (숫자만 추출)
          updatePasswordFromEstbDate(estbDate);
        }
      } else {
        // estbDate가 없으면 필드 초기화
        const estbDateInput = document.getElementById('hospital_estb_date');
        if (estbDateInput) {
          estbDateInput.value = '';
        }
      }
      
      // API에서 가져온 추가 정보를 hidden input에 저장
      console.log('[병원 선택] 추가 정보:', { lat, lng, drTotal, sggu, sido });
      
      if (lat) {
        const latInput = document.getElementById('hospital_lat');
        if (latInput) {
          latInput.value = lat;
          console.log('[병원 선택] lat 저장:', lat);
        }
      }
      if (lng) {
        const lngInput = document.getElementById('hospital_lng');
        if (lngInput) {
          lngInput.value = lng;
          console.log('[병원 선택] lng 저장:', lng);
        }
      }
      if (drTotal) {
        const drTotalInput = document.getElementById('hospital_dr_total');
        if (drTotalInput) {
          drTotalInput.value = drTotal;
          console.log('[병원 선택] dr_total 저장:', drTotal);
        }
      }
      if (sggu) {
        const sgguInput = document.getElementById('hospital_sggu');
        if (sgguInput) {
          sgguInput.value = sggu;
          console.log('[병원 선택] sggu 저장:', sggu);
        }
      }
      if (sido) {
        const sidoInput = document.getElementById('hospital_sido');
        if (sidoInput) {
          sidoInput.value = sido;
          console.log('[병원 선택] sido 저장:', sido);
        }
      }
      
      // 모달 닫기
      closeHospitalSearchModal();
    });
  }
  
  // ESC 키로 병원 검색 모달 닫기
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      const hospitalSearchModal = document.getElementById('hospitalSearchModal');
      if (hospitalSearchModal && hospitalSearchModal.classList.contains('show')) {
        closeHospitalSearchModal();
      }
    }
  });
  
  /**
   * 개원일에서 숫자만 추출하여 비밀번호 필드에 자동 입력하는 함수
   * 
   * 목적: 개원일 입력 시 비밀번호 필드에 개원일의 숫자만 자동 입력
   *   - 개원일 형식: "2024.01.01" → 비밀번호: "20240101"
   *   - 개원일 형식: "20240101" → 비밀번호: "20240101"
   */
  function updatePasswordFromEstbDate(estbDate) {
    if (!estbDate) return;
    
    // 숫자만 추출 (점, 하이픈 등 제거)
    const passwordValue = estbDate.replace(/[^0-9]/g, '');
    
    // 비밀번호 필드에 자동 입력
    const passwordInput = document.getElementById('hospital_hos_password');
    if (passwordInput && passwordValue) {
      passwordInput.value = passwordValue;
    }
  }
  
  // 개원일 입력 필드 변경 시 비밀번호 자동 입력
  const hospitalEstbDateInput = document.getElementById('hospital_estb_date');
  if (hospitalEstbDateInput) {
    hospitalEstbDateInput.addEventListener('input', function() {
      updatePasswordFromEstbDate(this.value);
    });
    
    hospitalEstbDateInput.addEventListener('change', function() {
      updatePasswordFromEstbDate(this.value);
    });
  }
  
  // 폼 제출 이벤트 (AJAX 처리)
  const addHospitalForm = document.getElementById('addHospitalForm');
  if (addHospitalForm) {
    addHospitalForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // 에러 메시지 및 필드 에러 상태 초기화
      hideErrorMessage();
      clearFieldErrors();
      
      // 폼 유효성 검사
      const hospitalName = document.getElementById('hospital_name').value.trim();
      const hospitalHosName = document.getElementById('hospital_hos_name').value.trim();
      const hospitalHosPassword = document.getElementById('hospital_hos_password').value.trim();
      
      if (!hospitalName || !hospitalHosName || !hospitalHosPassword) {
        showErrorMessage('필수 항목을 모두 입력해주세요.');
        // 필수 필드에 에러 상태 추가
        if (!hospitalName) document.getElementById('hospital_name').classList.add('error');
        if (!hospitalHosName) document.getElementById('hospital_hos_name').classList.add('error');
        if (!hospitalHosPassword) document.getElementById('hospital_hos_password').classList.add('error');
        return;
      }
      
      // 폼 데이터 수집
      const formData = new FormData(addHospitalForm);
      
      // 디버깅: 폼 데이터 확인
      console.log('Form data:', {
        hospital_name: formData.get('hospital_name'),
        hospital_hos_name: formData.get('hospital_hos_name'),
        hospital_hos_password: formData.get('hospital_hos_password') ? '***' : '',
        hospital_address: formData.get('hospital_address'),
        hospital_tel: formData.get('hospital_tel'),
        hospital_estb_date: formData.get('hospital_estb_date'),
        hospital_lat: formData.get('hospital_lat'),
        hospital_lng: formData.get('hospital_lng'),
        hospital_dr_total: formData.get('hospital_dr_total'),
        hospital_sggu: formData.get('hospital_sggu'),
        hospital_sido: formData.get('hospital_sido'),
        action: formData.get('action')
      });
      
      // 제출 버튼 비활성화 (중복 제출 방지)
      const submitBtn = addHospitalForm.querySelector('.btn-submit');
      const originalBtnText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = '처리 중...';
      
      // AJAX 요청
      // action URL을 명시적으로 지정 (템플릿에서 전달받은 HOSPITAL_LIST_URL 사용)
      const submitUrl = typeof HOSPITAL_LIST_URL !== 'undefined' ? HOSPITAL_LIST_URL : addHospitalForm.getAttribute('action');
      fetch(submitUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      })
      .then(async response => {
        console.log('Response status:', response.status, 'OK:', response.ok);
        
        let data;
        try {
          // 응답 본문을 JSON으로 파싱 시도
          const responseText = await response.text();
          console.log('Response text:', responseText.substring(0, 500));
          
          try {
            data = JSON.parse(responseText);
            console.log('Parsed JSON data:', data);
          } catch (parseError) {
            // JSON 파싱 실패 시 (서버가 HTML이나 다른 형식으로 응답한 경우)
            console.error('JSON parse error:', parseError);
            showErrorMessage(`서버 응답 오류 (${response.status}): 응답 형식이 올바르지 않습니다. 응답: ${responseText.substring(0, 200)}`);
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
            return;
          }
        } catch (textError) {
          console.error('Response text read error:', textError);
          showErrorMessage(`응답 읽기 오류: ${textError.message}`);
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
          return;
        }
        
        // 응답 상태와 success 플래그 확인
        console.log('Response OK:', response.ok, 'Data success:', data.success);
        
        if (response.ok && data.success) {
          // 성공 시 모달 닫기 및 페이지 새로고침
          console.log('병원 추가 성공! 페이지 새로고침 중...');
          closeAddHospitalModal();
          window.location.reload();
        } else {
          // 실패 시 에러 메시지 표시 (서버에서 반환한 메시지 사용)
          const errorMessage = data.message || '병원 추가에 실패했습니다.';
          console.error('Server error:', errorMessage, 'Full response:', data);
          showErrorMessage(errorMessage);
          // 제출 버튼 활성화
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
        }
      })
      .catch(error => {
        console.error('Network/Fetch error:', error);
        // 네트워크 에러인 경우에만 네트워크 메시지 표시
        if (error instanceof TypeError && error.message.includes('fetch')) {
          showErrorMessage('네트워크 연결 오류가 발생했습니다. 인터넷 연결을 확인해주세요.');
        } else {
          // 기타 에러는 실제 에러 메시지 표시
          showErrorMessage(`오류가 발생했습니다: ${error.message || error.toString()}`);
        }
        // 제출 버튼 활성화
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      });
    });
  }
});
