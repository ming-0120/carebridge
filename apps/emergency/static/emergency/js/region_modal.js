// ===============================
// 모달 열기 / 닫기
// ===============================
function openRegionModal() {
  const modal = document.getElementById("region-modal");
  if (modal) modal.classList.remove("hidden");
}

function closeRegionModal() {
  const modal = document.getElementById("region-modal");
  if (modal) modal.classList.add("hidden");
}

// ===============================
// 상태 지역 선택
// ===============================
let selectedSido = "";
let selectedSigungu = "";

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

// 시군구 리스트 로딩 (옵션: 로딩 후 바로 필터링)
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

      // 시군구 키워드가 넘어온 경우: 로딩이 끝난 뒤 필터 적용
      if (sigunguKeyword) {
        filterSigungu(sigunguKeyword);
      }
    })
    .catch(err => console.error("get_sigungu error:", err));
}

// ===============================
// 시/군/구 선택
// ===============================
function selectSigungu(sigungu) {
  selectedSigungu = sigungu;

  document.querySelectorAll(".sigungu-item").forEach(el => {
    el.classList.toggle("active", el.textContent.trim() === sigungu);
  });
}

// 시군구 필터 helper
function filterSigungu(keyword) {
  document.querySelectorAll(".sigungu-item").forEach(el => {
    const name = el.textContent.trim();
    if (name === "전체") return;
    el.style.display = name.includes(keyword) ? "block" : "none";
  });
}

// ===============================
// 즉각 검색 (시/도 + 시/군/구)
// - "김포" 같이 시군구만 입력해도 동작
// ===============================
function liveSearchRegion() {
  const input = document.getElementById("region-search-input");
  const keyword = input ? input.value.trim() : "";
  const parts = keyword.split(" ").filter(Boolean);

  // 검색어 없으면 전체 복원
  if (!keyword) {
    document.querySelectorAll(".sido-item").forEach(el => (el.style.display = "block"));
    document.querySelectorAll(".sigungu-item").forEach(el => (el.style.display = "block"));
    return;
  }

  const sidoPart = parts[0] || "";
  const sigunguPart = parts[1] || "";

  // 1) 단일 단어(시군구만 입력)인 경우: regionDict 기준으로 시도 자동 선택
  if (parts.length === 1) {
    const regionDict = window.regionDict || {};
    let targetSido = null;

    for (const [sido, sigList] of Object.entries(regionDict)) {
      if (sigList.some(name => name.includes(keyword))) {
        targetSido = sido;
        break;
      }
    }

    if (targetSido) {
      // 시도 리스트도 해당 시도만 보이게
      document.querySelectorAll(".sido-item").forEach(el => {
        const text = el.textContent.trim();
        el.style.display = text === targetSido ? "block" : "none";
      });

      // 시도 선택 + 로딩 뒤 시군구 필터
      selectSido(targetSido, keyword);
      return; // 여기서 종료 (아래 시도+시군구 로직은 타지 않음)
    }
  }

  // 2) 시/도 + 시/군/구 형태 (예: "경기도 김포")
  let matchedSido = null;

  document.querySelectorAll(".sido-item").forEach(el => {
    const text = el.textContent.trim();
    const match = text.includes(sidoPart);

    el.style.display = match ? "block" : "none";
    if (match && !matchedSido) matchedSido = text;
  });

  // 시도 자동 선택
  if (matchedSido && selectedSido !== matchedSido) {
    selectSido(matchedSido, sigunguPart || null);
  } else if (matchedSido && !sigunguPart) {
    // 시도만 검색한 경우: 현재 로딩된 시군구 전체 표시
    document.querySelectorAll(".sigungu-item").forEach(el => (el.style.display = "block"));
  } else if (sigunguPart) {
    // 이미 선택된 시도에서 시군구 필터
    filterSigungu(sigunguPart);
  }
}

// ===============================
// 적용
// ===============================
function applyRegionFilter() {
  const params = new URLSearchParams(window.location.search);

  if (selectedSido) params.set("sido", selectedSido);
  else params.delete("sido");

  if (selectedSigungu && selectedSigungu !== "전체") params.set("sigungu", selectedSigungu);
  else params.delete("sigungu");

  window.location.search = params.toString();
}

// ===============================
// 초기화 (전체 리스트 & 모달닫기)
// ===============================
function resetRegion() {
  const params = new URLSearchParams(window.location.search);
  params.delete("sido");
  params.delete("sigungu");

  const query = params.toString();
  window.location.href = window.location.pathname + (query ? "?" + query : "");
}