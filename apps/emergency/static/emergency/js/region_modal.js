// ===============================
// CSRF 토큰 가져오기 함수
// ===============================
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let cookie of cookies) {
      cookie = cookie.trim();
      if (cookie.substring(0, name.length + 1) === (name + "=")) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

// ===============================
// 모달 열기 / 닫기
// ===============================
function openRegionModal() {
  const modal = document.getElementById("region-modal");
  if (modal) modal.classList.remove("hidden");
  
  // 검색 입력 필드 초기화
  const searchInput = document.getElementById("region-search-input");
  if (searchInput) {
    searchInput.value = "";
  }
  
  // 모든 시/도 항목 표시 초기화
  document.querySelectorAll(".sido-item").forEach(el => {
    el.style.display = "block";
  });
  
  // 모든 시/군/구 항목 표시 초기화 (이미 로드된 경우)
  document.querySelectorAll(".sigungu-item").forEach(el => {
    el.style.display = "block";
  });
  
  // 모달 열 때 현재 선택된 값 반영 (필터링 없이)
  if (selectedSido) {
    const sidoItem = Array.from(document.querySelectorAll(".sido-item")).find(
      el => el.textContent.trim() === selectedSido
    );
    if (sidoItem) {
      // sigunguKeyword를 전달하지 않아 필터링되지 않도록 함
      selectSido(selectedSido);
    }
  }
}

function closeRegionModal() {
  const modal = document.getElementById("region-modal");
  if (modal) modal.classList.add("hidden");
}

// ===============================
// 상태 지역 선택 (템플릿에서 전달된 초기값 사용)
// ===============================
let selectedSido = window.selectedSido || "";
let selectedSigungu = window.selectedSigungu || "";

// ===============================
// 시/도 선택
// ===============================
function selectSido(sido, sigunguKeyword) {
  selectedSido = sido;
  selectedSigungu = "전체";  // "" 대신 "전체"로 명시적 설정

  document.querySelectorAll(".sido-item").forEach(el => {
    el.classList.toggle("active", el.textContent.trim() === sido);
  });

  loadSigungu(sido, sigunguKeyword);
  
  // 시/군/구 UI도 "전체"로 초기화
  setTimeout(() => {
    document.querySelectorAll(".sigungu-item").forEach(el => {
      el.classList.remove("active");
      if (el.textContent.trim() === "전체") {
        el.classList.add("active");
      }
    });
  }, 100);  // loadSigungu 완료 후 실행
}

// ===============================
// 시군구 로딩
// ===============================
function loadSigungu(sido, sigunguKeyword) {
  fetch(`/emergency/get_sigungu/?sido=${encodeURIComponent(sido)}`)
    .then(res => res.json())
    .then(data => {
      const list = document.querySelector(".sigungu-list");
      if (!list) return;

      list.innerHTML = `
        <div class="sigungu-item all" onclick="selectSigungu('전체')">전체</div>
      `;

      (data.sigungu || []).forEach(name => {
        list.innerHTML += `
          <div class="sigungu-item" onclick="selectSigungu('${name}')">
            ${name}
          </div>`;
      });

      if (sigunguKeyword) {
        filterSigungu(sigunguKeyword);
      }
    })
    .catch(err => console.error("get_sigungu error:", err));
}

// ===============================
// 시군구 선택
// ===============================
function selectSigungu(sigungu) {
  selectedSigungu = sigungu;

  document.querySelectorAll(".sigungu-item").forEach(el => {
    el.classList.toggle("active", el.textContent.trim() === sigungu);
  });
}

// ===============================
// 즉각 검색
// ===============================
function liveSearchRegion() {
  const input = document.getElementById("region-search-input");
  const keyword = input ? input.value.trim() : "";
  const parts = keyword.split(" ").filter(Boolean);

  if (!keyword) {
    document.querySelectorAll(".sido-item").forEach(el => (el.style.display = "block"));
    document.querySelectorAll(".sigungu-item").forEach(el => (el.style.display = "block"));
    return;
  }

  const regionDict = window.regionDict || {};
  let detectedSido = null;

  // 시군구 first matching
  for (const [sido, sigList] of Object.entries(regionDict)) {
    if (sigList.some(name => name.includes(keyword))) {
      detectedSido = sido;
      break;
    }
  }

  // 시군구 기반 자동 시도 선택
  if (detectedSido) {
    document.querySelectorAll(".sido-item").forEach(el => {
      const text = el.textContent.trim();
      el.style.display = text === detectedSido ? "block" : "none";
    });

    selectSido(detectedSido, keyword);
    return;
  }

  // "경기도 김포" style
  let matchedSido = null;
  document.querySelectorAll(".sido-item").forEach(el => {
    const text = el.textContent.trim();
    const match = text.includes(parts[0]);
    el.style.display = match ? "block" : "none";
    if (match && !matchedSido) matchedSido = text;
  });

  if (matchedSido && selectedSido !== matchedSido) {
    selectSido(matchedSido, parts[1] || null);
  } else if (parts[1]) {
    filterSigungu(parts[1]);
  }
}

// ===============================
// 시군구 필터링
// ===============================
function filterSigungu(keyword) {
  document.querySelectorAll(".sigungu-item").forEach(el => {
    const name = el.textContent.trim();
    if (name === "전체") return;
    el.style.display = name.includes(keyword) ? "block" : "none";
  });
}

// ===============================
// 적용
// ===============================
function applyRegionFilter() {
  // 시/도가 변경되었는데 시/군/구가 이전 값으로 남아있으면 "전체"로 초기화
  // (시/군/구가 선택되지 않았거나 빈 문자열이면 "전체"로 처리)
  if (!selectedSigungu || selectedSigungu === "") {
    selectedSigungu = "전체";
  }
  
  // POST 방식으로 지역 정보 전송
  fetch('/emergency/update_preferences/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCookie('csrftoken')
    },
    body: JSON.stringify({
      action: 'region',
      sido: selectedSido && selectedSido !== "전체" ? selectedSido : "",
      sigungu: selectedSigungu && selectedSigungu !== "전체" ? selectedSigungu : ""
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.status === 'ok') {
      // 버튼 클릭 플래그 설정 (새로고침 감지 방지)
      sessionStorage.setItem('emergency_button_click', 'true');
      // 페이지 새로고침
      window.location.reload();
    }
  })
  .catch(err => {
    console.error('지역 필터 적용 실패:', err);
    alert('지역 필터 적용에 실패했습니다.');
  });
}

// ===============================
// 초기화
// ===============================
function resetRegion() {
  // POST 방식으로 모든 설정 초기화 (action: 'reset' 사용)
  fetch('/emergency/update_preferences/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCookie('csrftoken')
    },
    body: JSON.stringify({
      action: 'reset'  // 모든 설정 초기화 (지역, 필터, 정렬 모두)
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.status === 'ok') {
      // 버튼 클릭 플래그 설정 (새로고침 감지 방지)
      sessionStorage.setItem('emergency_button_click', 'true');
      // 페이지 새로고침
      window.location.reload();
    }
  })
  .catch(err => {
    console.error('지역 필터 초기화 실패:', err);
    alert('지역 필터 초기화에 실패했습니다.');
  });
}
