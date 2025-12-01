// ===============================
// 지역 모달 열기 / 닫기
// ===============================
function openRegionModal() {
  const modal = qs('#region-modal');
  if (modal) modal.classList.remove('hidden');
}

function closeRegionModal() {
  const modal = qs('#region-modal');
  if (modal) modal.classList.add('hidden');
}

// ===============================
// 지역 선택 및 검색
// ===============================
let selectedSido = "";
let selectedSigungu = "";

function selectSido(sido) {
  selectedSido = sido;

  qsa('.sido-item').forEach(e => e.classList.remove('active'));
  qsa('.sido-item').forEach(e => {
    if (e.textContent === sido) e.classList.add('active');
  });

  fetch(`/emergency/get_sigungu/?sido=${encodeURIComponent(sido)}`)
    .then(res => res.json())
    .then(data => {
      const list = qs('.sigungu-list');
      list.innerHTML = `<div class="sigungu-item all" onclick="selectSigungu('전체')">전체</div>`;
      data.sigungu.forEach(sg => {
        list.innerHTML += `<div class="sigungu-item" onclick="selectSigungu('${sg}')">${sg}</div>`;
      });
    });
}

function selectSigungu(sigungu) {
  selectedSigungu = sigungu;

  qsa('.sigungu-item').forEach(e => e.classList.remove('active'));
  qsa('.sigungu-item').forEach(e => {
    if (e.textContent === sigungu) e.classList.add('active');
  });
}

function searchSigungu() {
  const keyword = qs('#region-search-input').value.trim();
  qsa('.sigungu-item').forEach(el => {
    el.style.display = el.textContent.includes(keyword) ? "block" : "none";
  });
}

function applyRegionFilter() {
  const params = new URLSearchParams(window.location.search);
  if (selectedSido) params.set("sido", selectedSido);
  if (selectedSigungu && selectedSigungu !== "전체") params.set("sigungu", selectedSigungu);
  else params.delete("sigungu");

  window.location.search = params.toString();
}
