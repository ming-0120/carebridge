// ===============================
// 공용 Query Selector Helper
// ===============================
const qs = (sel) => document.querySelector(sel);
const qsa = (sel) => document.querySelectorAll(sel);

// ===============================
// 상세 모달 열기 / 닫기
// ===============================
function openHospitalDetail(erId) {
  const modal = qs('#detail-modal');
  if (!modal) return;

  modal.classList.remove('hidden');
  if (typeof loadDetailData === "function") loadDetailData(erId);
}

function closeDetailModal() {
  const modal = qs('#detail-modal');
  if (!modal) return;

  modal.classList.add('hidden');
}

// ===============================
// 병원 검색 필터링
// ===============================
const searchInput = qs('#searchInput');
if (searchInput) {
  searchInput.addEventListener('input', () => {
    const keyword = searchInput.value.trim();
    const rows = qsa('.row');

    rows.forEach(row => {
      const name = row.querySelector('.h-name').textContent;
      row.style.display = name.includes(keyword) ? 'grid' : 'none';
    });
  });
}

// ===============================
// ESC로 모든 모달 닫기 (+Filter UI만 초기화)
// ===============================
document.addEventListener('keydown', function(e) {
  if (e.key === "Escape") {
    closeRegionModal && closeRegionModal();
    closeFilterModal();
    closeDetailModal();
  }
});

// ===============================
// 새로고침 시 저장된 상태 초기화
// ===============================
window.addEventListener("load", () => {
  localStorage.clear();
  sessionStorage.clear();
});

// ===============================
// Filter Tag 한글 표기 매핑
// ===============================
const TYPE_LABEL = {
  stroke: "뇌출혈/뇌경색",
  traffic: "교통사고",
  cardio: "심근경색",
  obstetrics: "산모/분만"
};

const EQUIP_LABEL = {
  ct: "CT",
  mri: "MRI",
  angio: "Angio",
  icu: "중환자실",
  surgery: "수술실",
  delivery: "분만실",
  ventilator: "인공호흡기"
};

// ===============================
// Filter Tag Rendering
// ===============================
function renderFilterTags() {
  const params = new URLSearchParams(window.location.search);
  const container = qs("#filter-tags-container");
  const box = qs("#filter-tags");
  const resetBtn = qs("#filter-tags-reset");

  if (!container || !box) return;
  box.innerHTML = "";

  let hasFilter = false;

  // ======================================================
  // 유형 태그 추가
  // ======================================================
  const etype = params.get("etype");
  if (etype && TYPE_LABEL[etype]) {
    const tag = document.createElement("span");
    tag.className = "tag-chip";
    tag.innerHTML = `${TYPE_LABEL[etype]} <span class="tag-remove">✕</span>`;
    box.appendChild(tag);
    hasFilter = true;

    tag.querySelector(".tag-remove").addEventListener("click", () => {
      params.delete("etype");
      window.location.search = params.toString();
    });
  }

  // ======================================================
  // 장비 태그 추가
  // ======================================================
  Object.keys(EQUIP_LABEL).forEach(key => {
    if (params.get(key) === "1") {
      const tag = document.createElement("span");
      tag.className = "tag-chip";
      tag.innerHTML = `${EQUIP_LABEL[key]} <span class="tag-remove">✕</span>`;
      box.appendChild(tag);
      hasFilter = true;

      tag.querySelector(".tag-remove").addEventListener("click", () => {
        params.delete(key);
        window.location.search = params.toString();
      });
    }
  });

  if (!hasFilter) {
    container.classList.add("hidden");
    resetBtn.classList.add("hidden");
    return;
  }

  container.classList.remove("hidden");
  resetBtn.classList.remove("hidden");

  resetBtn.addEventListener("click", () => {
    params.delete("etype");
    Object.keys(EQUIP_LABEL).forEach(key => params.delete(key));
    window.location.search = params.toString();
  });
}

// ===============================
// ESC 시 Filter UI 초기화만 수행 (URL 변경 X)
// ===============================
function resetFilterUIOnly() {
  document.querySelectorAll("#emergency-type-group .type-chip, .equip-chip")
    .forEach(el => el.classList.remove("active"));
}

function closeFilterModal() {
  const modal = qs("#filter-modal");
  if (!modal) return;

  resetFilterUIOnly();   // UI 초기화
  modal.classList.add("hidden");
}

// ===============================
// DOM Loaded 시 태그 그림
// ===============================
document.addEventListener("DOMContentLoaded", renderFilterTags);
