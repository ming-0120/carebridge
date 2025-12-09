// ========================================
// 응급 유형과 장비 자동 추천 매핑
// - key: data-type 값
// - value: data-equip 값 배열
// ========================================
const EMERGENCY_MAP = {
  stroke:      ["ct", "mri", "angio", "icu"],        // 뇌출혈 / 뇌경색
  traffic:     ["surgery", "icu"],                  // 교통사고
  cardio:      ["surgery", "ventilator"],           // 심근경색
  obstetrics:  ["delivery", "surgery"]              // 산모/분만
};

// ========================================
// 필터 모달 열기 (UI 유지)
// ========================================
function openFilterModal() {
  const modal = document.getElementById("filter-modal");
  if (modal) modal.classList.remove("hidden");
}

// ========================================
// ESC Close: UI만 초기화, URL은 유지
// ========================================
function closeFilterModal() {
  const modal = document.getElementById("filter-modal");
  if (modal) {
    resetFilterUIOnly();  // 저장되지 않은 선택값 초기화
    modal.classList.add("hidden");
  }
}

// ========================================
// Reset 버튼 동작: UI + URL 완전 초기화
// ========================================
function resetFilter() {
  resetFilterUIOnly();

  const params = new URLSearchParams(window.location.search);
  [
    "etype",
    "ct", "mri", "angio",
    "icu", "surgery", "delivery", "ventilator"
  ].forEach(k => params.delete(k));

  // 페이지 reload 적용
  window.location.search = params.toString();
}

// ========================================
// Apply (선택값을 쿼리스트링으로 반영)
// ========================================
function applyFilter() {
  const params = new URLSearchParams(window.location.search);

  // 이전 값 제거
  [
    "etype",
    "ct", "mri", "angio",
    "icu", "surgery", "delivery", "ventilator"
  ].forEach(k => params.delete(k));

  // 응급 유형(etype)
  const activeTypeBtn = document.querySelector("#emergency-type-group .type-chip.active");
  if (activeTypeBtn) {
    const typeKey = activeTypeBtn.dataset.type;  // stroke, traffic, ...
    if (typeKey) params.set("etype", typeKey);
  }

  // 장비 선택 반영
  document.querySelectorAll(".equip-chip.active").forEach(chip => {
    const equipKey = chip.dataset.equip;
    if (equipKey) params.set(equipKey, "1");
  });

  closeFilterModal();
  window.location.search = params.toString(); // 페이지 리로드
}

// ========================================
// chip UI interaction
// ========================================
document.addEventListener("DOMContentLoaded", () => {
  const typeBtns = document.querySelectorAll("#emergency-type-group .type-chip");
  const equipChips = document.querySelectorAll(".equip-chip");

  const clearEquip = () =>
    equipChips.forEach(c => c.classList.remove("active"));

  // 응급유형 클릭 시 자동 장비 추천
  typeBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      typeBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      clearEquip();

      const typeKey = btn.dataset.type;
      const mappedEquips = EMERGENCY_MAP[typeKey] || [];

      mappedEquips.forEach(eqKey => {
        const target = document.querySelector(`.equip-chip[data-equip="${eqKey}"]`);
        if (target) target.classList.add("active");
      });
    });
  });

  // 장비 개별 선택/해제 (토글)
  equipChips.forEach(chip =>
    chip.addEventListener("click", () => chip.classList.toggle("active"))
  );
});

// ========================================
// UI only 초기화 (URL 변경 없음 / ESC 동작)
// ========================================
function resetFilterUIOnly() {
  document.querySelectorAll("#emergency-type-group .type-chip, .equip-chip")
    .forEach(el => el.classList.remove("active"));
}
