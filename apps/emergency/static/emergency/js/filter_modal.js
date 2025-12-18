// 응급 유형 → 필요한 장비 OR 조건 자동 선택
const EMERGENCY_MAP = {
  stroke: ["ct", "mri", "angio"],
  traffic: ["ct", "angio"],
  cardio: ["angio", "ventilator"],
  obstetrics: ["delivery"],
};

// ========================================
// CSRF 토큰 가져오기 함수
// ========================================
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
// Reset 버튼 동작: UI + POST 방식으로 초기화
// ========================================
function resetFilter() {
  resetFilterUIOnly();

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
    console.error('필터 초기화 실패:', err);
    alert('필터 초기화에 실패했습니다.');
  });
}

// ========================================
// Apply (POST 방식으로 필터 적용)
// ========================================
function applyFilter() {
  // ---------------------------
  // 응급 유형(etype) 수집
  // ---------------------------
  const activeTypeBtn = document.querySelector("#emergency-type-group .type-chip.active");
  let etype = "";
  if (activeTypeBtn) {
    const typeKey = activeTypeBtn.dataset.type;  // stroke, traffic 등
    if (typeKey) etype = typeKey;
  }

  // ---------------------------
  // 장비 선택 수집 (OR 조건)
  // ---------------------------
  const filters = {};
  document.querySelectorAll(".equip-chip.active").forEach(chip => {
    const equipKey = chip.dataset.equip;
    if (equipKey) {
      filters[equipKey] = "1";  // OR 조건의 핵심
    }
  });

  // ---------------------------
  // POST 방식으로 필터 정보 전송
  // ---------------------------
  fetch('/emergency/update_preferences/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCookie('csrftoken')
    },
    body: JSON.stringify({
      action: 'filter',
      etype: etype,
      filters: filters
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.status === 'ok') {
      // 모달 닫기
      closeFilterModal();
      // 버튼 클릭 플래그 설정 (새로고침 감지 방지)
      sessionStorage.setItem('emergency_button_click', 'true');
      // 페이지 새로고침
      window.location.reload();
    }
  })
  .catch(err => {
    console.error('필터 적용 실패:', err);
    alert('필터 적용에 실패했습니다.');
  });
}


// ========================================
// chip UI init (문서 로드 시)
// ========================================
document.addEventListener("DOMContentLoaded", () => {
  // 템플릿에서 전달된 초기값 사용 (session 기반)
  const currentEtype = window.selectedEtype || "";

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

    // 장비 필터 복원: session 기반 (window.selectedFilters 사용)
    const currentFilters = window.selectedFilters || {};
    equipChips.forEach(chip => {
      const key = chip.dataset.equip;
      if (currentFilters[key] === "1") {
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
