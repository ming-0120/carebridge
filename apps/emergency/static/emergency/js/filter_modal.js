// 응급 유형 → 필요한 장비 OR 조건 자동 선택
const EMERGENCY_MAP = {
  stroke: ["ct", "mri", "angio"],
  traffic: ["ct", "angio"],
  cardio: ["angio", "ventilator"],
  obstetrics: ["delivery"],
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
    "delivery", "ventilator"
  ].forEach(k => params.delete(k));

  // 버튼 클릭 플래그 설정 (새로고침 감지 방지)
  sessionStorage.setItem('emergency_button_click', 'true');

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
    "delivery", "ventilator"
  ].forEach(k => params.delete(k));

  // ---------------------------
  // 응급 유형(etype)
  // ---------------------------
  const activeTypeBtn = document.querySelector("#emergency-type-group .type-chip.active");
  if (activeTypeBtn) {
    const typeKey = activeTypeBtn.dataset.type;  // stroke, traffic 등
    if (typeKey) params.set("etype", typeKey);
  }

  // ---------------------------
  // 장비 선택 (OR 조건)
  // ---------------------------
  document.querySelectorAll(".equip-chip.active").forEach(chip => {
    const equipKey = chip.dataset.equip;
    if (equipKey) params.set(equipKey, "1");  // OR 조건의 핵심
  });

  // ---------------------------
  // 모달 닫기 + 페이지 리로드
  // ---------------------------
  closeFilterModal();
  
  // 버튼 클릭 플래그 설정 (새로고침 감지 방지)
  sessionStorage.setItem('emergency_button_click', 'true');
  
  window.location.search = params.toString();
}


// ========================================
// chip UI init (문서 로드 시)
// ========================================
document.addEventListener("DOMContentLoaded", () => {
  // URL 파라미터 읽기
  const params = new URLSearchParams(window.location.search);
  const currentEtype = params.get("etype");

  // 초기 상태 복원 함수
  function restoreFilterState() {
    const typeChips = document.querySelectorAll("#emergency-type-group .type-chip");
    const equipChips = document.querySelectorAll("#equip-group .equip-chip");

    // etype 활성화
    if (currentEtype) {
      typeChips.forEach(chip => {
        if (chip.dataset.type === currentEtype) {
          chip.classList.add("active");
        }
      });
    }

    // 장비(CT/MRI/Angio/분만실/ventilator) 활성화
    equipChips.forEach(chip => {
      const key = chip.dataset.equip;
      if (params.get(key) === "1") {
        chip.classList.add("active");
      }
    });
  }

  // 초기 상태 복원
  restoreFilterState();

  // 이벤트 위임: 응급 유형 그룹에 클릭 이벤트 등록
  const emergencyTypeGroup = document.getElementById("emergency-type-group");
  if (emergencyTypeGroup) {
    emergencyTypeGroup.addEventListener("click", (e) => {
      const chip = e.target.closest(".type-chip");
      if (!chip) return;

      e.stopPropagation();
      
      // 타입 토글
      const isActive = chip.classList.contains("active");
      const allTypeChips = document.querySelectorAll("#emergency-type-group .type-chip");
      allTypeChips.forEach(c => c.classList.remove("active"));
      if (!isActive) {
        chip.classList.add("active");
      }

      // 매핑된 장비 자동 활성화
      const tKey = chip.dataset.type;
      const equips = EMERGENCY_MAP[tKey] || [];
      
      // 모든 장비 칩 선택 해제
      const allEquipChips = document.querySelectorAll("#equip-group .equip-chip");
      allEquipChips.forEach(c => c.classList.remove("active"));
      
      // 매핑된 장비 활성화
      equips.forEach(eq => {
        // 모든 장비 칩을 순회하며 data-equip 속성 확인
        allEquipChips.forEach(equipChip => {
          if (equipChip.dataset.equip === eq) {
            equipChip.classList.add("active");
          }
        });
      });
    });
  }

  // 이벤트 위임: 장비 그룹에 클릭 이벤트 등록
  const equipGroup = document.getElementById("equip-group");
  if (equipGroup) {
    equipGroup.addEventListener("click", (e) => {
      const chip = e.target.closest(".equip-chip");
      if (!chip) return;

      e.stopPropagation();
      chip.classList.toggle("active");
    });
  }
});

// ========================================
// UI only 초기화 (URL 변경 없음 / ESC 동작)
// ========================================
function resetFilterUIOnly() {
  document.querySelectorAll("#emergency-type-group .type-chip, .equip-chip")
    .forEach(el => el.classList.remove("active"));
}
