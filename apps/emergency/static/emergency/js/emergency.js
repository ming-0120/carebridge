// ===============================
// 공용 Query Selector Helper
// ===============================
const qs = (sel) => document.querySelector(sel);
const qsa = (sel) => document.querySelectorAll(sel);

// ===============================
// 상세 모달 닫기 (열기는 detail_modal.js에서 처리)
// ===============================
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
// 새로고침 감지: beforeunload에서 플래그 설정
// ===============================
window.addEventListener("beforeunload", () => {
  // 페이지를 떠나기 전에 새로고침 플래그 설정
  // 단, 버튼 클릭으로 인한 새로고침이 아닌 경우만
  const buttonClick = sessionStorage.getItem("emergency_button_click");
  const sessionResetDone = sessionStorage.getItem("session_reset_done");
  // session 초기화가 진행 중이면 플래그를 설정하지 않음 (무한 루프 방지)
  if (!buttonClick && !sessionResetDone) {
    sessionStorage.setItem("is_refresh", "true");
  }
});

// ===============================
// 새로고침 시 저장된 상태 초기화 (위치 정보 및 버튼 클릭 플래그는 제외)
// ===============================
window.addEventListener("load", () => {
  const userLat = sessionStorage.getItem("user_lat");
  const userLng = sessionStorage.getItem("user_lng");
  const buttonClick = sessionStorage.getItem("emergency_button_click");
  const isRefresh = sessionStorage.getItem("is_refresh");
  const sessionResetDone = sessionStorage.getItem("session_reset_done");
  
  // session 초기화가 이미 진행 중이면 아무것도 하지 않음
  if (sessionResetDone) {
    // 초기화 완료 플래그 제거 (정상 상태로 복귀)
    sessionStorage.removeItem("session_reset_done");
    return;
  }
  
  localStorage.clear();
  
  // is_refresh 플래그를 즉시 제거 (무한 루프 방지)
  if (isRefresh) {
    sessionStorage.removeItem("is_refresh");
  }
  
  sessionStorage.clear();
  if (userLat) sessionStorage.setItem("user_lat", userLat);
  if (userLng) sessionStorage.setItem("user_lng", userLng);
  if (buttonClick) sessionStorage.setItem("emergency_button_click", buttonClick);
  
  // 새로고침 감지: 버튼 클릭이 아닌 경우에만 session 초기화
  if (isRefresh && !buttonClick) {
    // 초기화 진행 중 플래그 설정 (무한 루프 방지)
    sessionStorage.setItem("session_reset_done", "true");
    
    // POST 방식으로 Django session 초기화
    fetch('/emergency/update_preferences/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken')
      },
      body: JSON.stringify({
        action: 'reset'  // 모든 설정 초기화
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.status === 'ok') {
        // 페이지 새로고침 (초기 상태로)
        // session_reset_done 플래그가 있으므로 다시 초기화하지 않음
        window.location.href = window.location.pathname;
      } else {
        // 실패 시 플래그 제거
        sessionStorage.removeItem("session_reset_done");
      }
    })
    .catch(err => {
      console.error('세션 초기화 실패:', err);
      // 실패 시 플래그 제거 (다음 시도를 위해)
      sessionStorage.removeItem("session_reset_done");
    });
  } else if (buttonClick) {
    // 버튼 클릭 플래그 제거 (다음 새로고침을 위해)
    sessionStorage.removeItem("emergency_button_click");
  }
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
// Filter Tag Rendering (POST/session 기반)
// ===============================
function renderFilterTags() {
  const container = qs("#filter-tags-container");
  const box = qs("#filter-tags");
  const resetBtn = qs("#filter-tags-reset");

  if (!container || !box) return;
  box.innerHTML = "";

  let hasFilter = false;

  // ======================================================
  // 유형 태그 추가 (session 기반)
  // ======================================================
  const etype = window.selectedEtype || "";
  if (etype && TYPE_LABEL[etype]) {
    const tag = document.createElement("span");
    tag.className = "tag-chip";
    tag.innerHTML = `${TYPE_LABEL[etype]} <span class="tag-remove">✕</span>`;
    box.appendChild(tag);
    hasFilter = true;

    tag.querySelector(".tag-remove").addEventListener("click", () => {
      // POST 방식으로 필터 제거
      fetch('/emergency/update_preferences/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({
          action: 'filter',
          etype: "",
          filters: window.selectedFilters || {}
        })
      })
      .then(response => response.json())
      .then(data => {
        if (data.status === 'ok') {
          sessionStorage.setItem('emergency_button_click', 'true');
          window.location.reload();
        }
      })
      .catch(err => console.error('필터 제거 실패:', err));
    });
  }

  // ======================================================
  // 장비 태그 추가 (session 기반)
  // ======================================================
  const currentFilters = window.selectedFilters || {};
  Object.keys(EQUIP_LABEL).forEach(key => {
    if (currentFilters[key] === "1") {
      const tag = document.createElement("span");
      tag.className = "tag-chip";
      tag.innerHTML = `${EQUIP_LABEL[key]} <span class="tag-remove">✕</span>`;
      box.appendChild(tag);
      hasFilter = true;

      tag.querySelector(".tag-remove").addEventListener("click", () => {
        // 해당 장비만 제거
        const newFilters = { ...currentFilters };
        delete newFilters[key];
        
        fetch('/emergency/update_preferences/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
          },
          body: JSON.stringify({
            action: 'filter',
            etype: window.selectedEtype || "",
            filters: newFilters
          })
        })
        .then(response => response.json())
        .then(data => {
          if (data.status === 'ok') {
            sessionStorage.setItem('emergency_button_click', 'true');
            window.location.reload();
          }
        })
        .catch(err => console.error('필터 제거 실패:', err));
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
    // POST 방식으로 모든 필터 초기화
    fetch('/emergency/update_preferences/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken')
      },
      body: JSON.stringify({
        action: 'filter',
        etype: "",
        filters: {}
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.status === 'ok') {
        sessionStorage.setItem('emergency_button_click', 'true');
        window.location.reload();
      }
    })
    .catch(err => console.error('필터 초기화 실패:', err));
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
