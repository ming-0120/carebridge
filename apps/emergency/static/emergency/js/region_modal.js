// ===============================
// 모달 열기 / 닫기
// ===============================
function openRegionModal() {
  const modal = document.getElementById("region-modal");
  if (modal) modal.classList.remove("hidden");
  
  // 모달 열 때 현재 선택된 값 반영
  if (selectedSido) {
    const sidoItem = Array.from(document.querySelectorAll(".sido-item")).find(
      el => el.textContent.trim() === selectedSido
    );
    if (sidoItem) {
      selectSido(selectedSido, selectedSigungu);
    }
  }
}

function closeRegionModal() {
  const modal = document.getElementById("region-modal");
  if (modal) modal.classList.add("hidden");
}

// ===============================
// 상태 지역 선택 (URL 파라미터에서 초기값 읽기)
// ===============================
const urlParams = new URLSearchParams(window.location.search);
let selectedSido = urlParams.get("sido") || "";
let selectedSigungu = urlParams.get("sigungu") || "";

// ===============================
// 시/도 선택
// ===============================
function selectSido(sido, sigunguKeyword) {
  selectedSido = sido;
  selectedSigungu = "";

  document.querySelectorAll(".sido-item").forEach(el => {
    el.classList.toggle("active", el.textContent.trim() === sido);
  });

  loadSigungu(sido, sigunguKeyword);
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
  const params = new URLSearchParams(window.location.search);

  // 기존 파라미터 유지 (sort, 필터 등)
  // sido 파라미터 설정
  if (selectedSido && selectedSido !== "전체") {
    params.set("sido", selectedSido);
  } else {
    params.delete("sido");
  }

  // sigungu 파라미터 설정
  if (selectedSigungu && selectedSigungu !== "전체") {
    params.set("sigungu", selectedSigungu);
  } else {
    params.delete("sigungu");
  }

  // 버튼 클릭 플래그 설정 (새로고침 감지 방지)
  sessionStorage.setItem('emergency_button_click', 'true');

  // 페이지 이동 (기존 파라미터 유지)
  window.location.search = params.toString();
}

// ===============================
// 초기화
// ===============================
function resetRegion() {
  const params = new URLSearchParams(window.location.search);
  params.delete("sido");
  params.delete("sigungu");

  // 버튼 클릭 플래그 설정 (새로고침 감지 방지)
  sessionStorage.setItem('emergency_button_click', 'true');

  const query = params.toString();
  window.location.href = window.location.pathname + (query ? "?" + query : "");
}
