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


// ===============================
// 새로고침 시 저장된 상태 초기화 (위치 정보 및 버튼 클릭 플래그는 제외)
// ===============================
window.addEventListener("load", () => {
  // 먼저 모든 플래그를 변수에 저장 (sessionStorage.clear() 전에)
  const userLat = sessionStorage.getItem("user_lat");
  const userLng = sessionStorage.getItem("user_lng");
  const buttonClick = sessionStorage.getItem("emergency_button_click");
  // const locationRefresh = sessionStorage.getItem("location_refresh");
  // const isRefresh = sessionStorage.getItem("is_refresh");
  // const sessionResetDone = sessionStorage.getItem("session_reset_done");
  
  // session 초기화가 이미 진행 중이면 아무것도 하지 않음
  if (sessionResetDone) {
    // 초기화 완료 플래그 제거 (정상 상태로 복귀)
    sessionStorage.removeItem("session_reset_done");
    // 위치 정보 새로고침 플래그도 제거
    if (locationRefresh) {
      sessionStorage.removeItem("location_refresh");
    }
    return;
  }
  
  localStorage.clear();
  
  // 위치 정보 새로고침 플래그 제거 (처리 완료)
  if (locationRefresh) {
    sessionStorage.removeItem("location_refresh");
  }
  
  // 버튼 클릭으로 인한 자동 새로고침인 경우: 플래그 제거만 하고 리턴
  // (다음 사용자 새로고침 시 초기화되도록 함)
  if (buttonClick) {
    // sessionStorage.clear() 전에 필요한 값들 저장
    sessionStorage.clear();
    if (userLat) sessionStorage.setItem("user_lat", userLat);
    if (userLng) sessionStorage.setItem("user_lng", userLng);
    // emergency_button_click 플래그는 제거 (이미 처리 완료)
    return;  // 여기서 리턴하여 세션 초기화 로직을 건너뜀
  }
  
  // is_refresh 플래그 확인 (이미 변수에 저장되어 있음)
  // 새로고침 감지: 버튼 클릭이 아닌 경우에만 session 초기화
  if (isRefresh === "true" && !locationRefresh) {
    // sessionStorage.clear() 실행 (is_refresh는 이미 변수에 저장됨)
    sessionStorage.clear();
    if (userLat) sessionStorage.setItem("user_lat", userLat);
    if (userLng) sessionStorage.setItem("user_lng", userLng);
    
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
  } else {
    // is_refresh가 없거나 locationRefresh인 경우: 일반 sessionStorage 정리만 수행
    sessionStorage.clear();
    if (userLat) sessionStorage.setItem("user_lat", userLat);
    if (userLng) sessionStorage.setItem("user_lng", userLng);
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

// ===============================
// 정렬 기준 및 툴팁 텍스트 업데이트 함수
// ===============================
function updateSortCriteria() {
  const sortCriteriaText = document.getElementById('sort-criteria-text');
  const tooltipText = document.getElementById('tooltip-text');
  
  if (!sortCriteriaText || !tooltipText) return;
  
  // 지역 선택 여부 확인 (시/도가 선택되고 "전체"가 아닐 때)
  const hasRegion = window.selectedSido && window.selectedSido !== '' && window.selectedSido !== '전체';
  const hasFilter = window.selectedEtype || 
                   (window.selectedFilters && Object.keys(window.selectedFilters).length > 0);
  const isDistanceSort = window.selectedSort === 'distance';
  
  // 정렬 기준 텍스트 설정 (우선순위: 지역 선택 > 필터 > 거리순 > 기본)
  if (hasRegion) {
    sortCriteriaText.textContent = '선택한 지역 기준';
  } else if (hasFilter) {
    sortCriteriaText.textContent = '필터 조건 반영 후 가용 병상·거리 기반';
  } else if (isDistanceSort) {
    sortCriteriaText.textContent = '사용자 위치 기준 거리순';
  } else {
    sortCriteriaText.textContent = '가용 병상·거리 기반';
  }
  
  // 툴팁 텍스트 설정 (우선순위: 지역 선택 > 필터 > 거리순 > 기본)
  if (hasRegion) {
    tooltipText.innerHTML = '선택한 지역에 해당하는 응급실만 목록에 표시됩니다.<br>거리나 병상 정보를 기준으로 정렬하지 않으며,<br>응급실 이름 순으로 정렬됩니다.';
  } else if (hasFilter) {
    tooltipText.innerHTML = '선택한 필터 조건을 충족하는 응급실만 표시한 후,<br>가용 병상과 거리를 기준으로 정렬됩니다.<br>필터 조건에 따라 일부 응급실은<br>목록에서 제외될 수 있습니다.';
  } else if (isDistanceSort) {
    tooltipText.innerHTML = '사용자의 현재 위치를 기준으로<br>각 응급실까지의 직선 거리를 계산하여 정렬합니다.<br>가장 가까운 응급실이 목록 상단에 표시됩니다.';
  } else {
    tooltipText.innerHTML = '현재 가용 병상 수와,<br>사용자 위치 기준 거리를 함께 반영하여 정렬됩니다.<br>병상 여유가 많고, 상대적으로 가까운 응급실이<br>목록 상단에 표시됩니다.';
  }
}

// ===============================
// 툴팁 텍스트 복사 함수
// ===============================
function copyTooltipText(event) {
  event.stopPropagation();
  const tooltipText = document.getElementById('tooltip-text');
  if (tooltipText) {
    const textToCopy = tooltipText.textContent || tooltipText.innerText;
    navigator.clipboard.writeText(textToCopy).then(() => {
      const btn = event.target;
      const originalText = btn.textContent;
      btn.textContent = '복사됨!';
      setTimeout(() => {
        btn.textContent = originalText;
      }, 1000);
    }).catch(err => {
      console.error('복사 실패:', err);
    });
  }
}

// ===============================
// 거리 순 정렬 기능 (POST 방식)
// ===============================
function sortByDistance() {
  // POST 방식으로 정렬 설정 전송
  fetch('/emergency/update_preferences/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCookie('csrftoken')
    },
    body: JSON.stringify({
      action: 'sort',
      sort: 'distance'
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
    console.error('정렬 설정 실패:', err);
    alert('정렬 설정에 실패했습니다.');
  });
}

// ===============================
// 응급실 즐겨찾기 토글 함수 (메인 페이지용)
// ===============================
function toggleErFavorite(event, erId) {
  // 이벤트 전파 중지 (행 클릭 이벤트 방지)
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  
  // AJAX 요청으로 즐겨찾기 토글
  // URL은 템플릿에서 전역 변수로 설정된 값을 사용
  const toggleUrl = window.toggleErFavoriteUrl || '/emergency/toggle_favorite/';
  fetch(toggleUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-CSRFToken': getCookie('csrftoken')
    },
    body: `er_id=${erId}`
  })
  .then(response => {
    if (response.status === 401) {
      // 비로그인 상태
      const confirmLogin = confirm('로그인 후 이용하실 수 있습니다.');
      if (confirmLogin) {
        // 로그인 페이지로 이동 (현재 URL을 next 파라미터로 전달)
        const currentUrl = encodeURIComponent(window.location.href);
        const loginUrl = window.loginUrl || '/accounts/login/';
        window.location.href = `${loginUrl}?next=${currentUrl}`;
      }
      // 취소 시 아무것도 하지 않음 (현재 페이지 유지)
      return null;
    }
    return response.json();
  })
  .then(data => {
    if (data && data.ok) {
      // 즐겨찾기 상태 업데이트
      const favoriteElement = document.querySelector(`.favorite[data-er-id="${erId}"]`);
      if (favoriteElement) {
        if (data.is_favorite) {
          favoriteElement.classList.add('on');
        } else {
          favoriteElement.classList.remove('on');
        }
      }
      
      // 상세 모달이 열려있고 같은 병원이면 동기화
      const detailModal = document.getElementById('detail-modal');
      const detailFavorite = document.getElementById('detail-favorite');
      if (detailModal && !detailModal.classList.contains('hidden') && detailFavorite) {
        const detailErId = detailFavorite.getAttribute('data-er-id');
        if (detailErId && parseInt(detailErId, 10) === erId) {
          if (data.is_favorite) {
            detailFavorite.classList.add('on');
          } else {
            detailFavorite.classList.remove('on');
          }
        }
      }
    }
  })
  .catch(err => {
    console.error('즐겨찾기 토글 실패:', err);
  });
}

// ===============================
// 즐겨찾기 버튼 클릭 이벤트 리스너 (캡처 단계에서 실행하여 row의 onclick보다 먼저 처리)
// ===============================
// 캡처 단계(true)에서 이벤트를 잡아서 row의 onclick보다 먼저 실행되도록 함
document.addEventListener('click', function(event) {
  // 클릭된 요소가 .favorite 클래스를 가진 요소인지 확인
  const favoriteElement = event.target.closest('.favorite');
  if (favoriteElement) {
    const erId = favoriteElement.getAttribute('data-er-id');
    if (erId) {
      // 이벤트 전파를 먼저 막고 toggleErFavorite 호출
      event.stopPropagation();
      event.preventDefault();
      toggleErFavorite(event, parseInt(erId, 10));
      return false;
    }
  }
}, true); // 캡처 단계에서 실행 (true)

// ===============================
// sessionStorage에서 위치 정보 읽어서 서버에 전달 (URL에는 추가하지 않음)
// ===============================
(function() {
  // 위치 정보 새로고침 플래그가 있으면 AJAX 업데이트 건너뛰기 (이미 새로고침됨)
  const locationRefresh = sessionStorage.getItem("location_refresh");
  if (locationRefresh) {
    // 플래그는 emergency.js에서 제거하므로 여기서는 건너뛰기만
    return;
  }
  
  const userLat = sessionStorage.getItem("user_lat");
  const userLng = sessionStorage.getItem("user_lng");
  
  if (userLat && userLng) {
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.get("lat") && !urlParams.get("lng")) {
      fetch(window.location.pathname + window.location.search, {
        method: 'GET',
        headers: {
          'X-User-Lat': userLat,
          'X-User-Lng': userLng,
          'X-Requested-With': 'XMLHttpRequest',
        }
      })
      .then(response => response.text())
      .then(html => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const newTableBox = doc.querySelector('.table-box');
        if (newTableBox) {
          const currentTableBox = document.querySelector('.table-box');
          if (currentTableBox) {
            currentTableBox.innerHTML = newTableBox.innerHTML;
            // 이벤트 위임 방식이므로 별도 이벤트 재연결 불필요
            // 시간 표시 업데이트
            updateTimeDisplay();
          }
        }
      })
      .catch(err => console.error('위치 정보 전달 실패:', err));
    }
  }
})();

// ===============================
// 업데이트 시간 표시 함수 (ErStatus.hvdate 기준)
// ===============================
function updateTimeDisplay() {
  const timeElements = document.querySelectorAll('.update-time');
  const now = new Date();
  
  timeElements.forEach(el => {
    const hvdateStr = el.getAttribute('data-hvdate');
    if (!hvdateStr) return;
    
    // Django 템플릿에서 전달된 날짜 문자열 파싱
    // 형식: "2025-01-12 10:25:00"
    const hvdate = new Date(hvdateStr.replace(' ', 'T'));
    if (isNaN(hvdate.getTime())) return;
    
    const diffMs = now - hvdate;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    let displayText = '';
    if (diffMins < 1) {
      displayText = '방금 전 업데이트';
    } else if (diffMins < 60) {
      displayText = `${diffMins}분 전 업데이트`;
    } else {
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) {
        displayText = `${diffHours}시간 전 업데이트`;
      } else {
        const diffDays = Math.floor(diffHours / 24);
        displayText = `${diffDays}일 전 업데이트`;
      }
    }
    
    el.textContent = displayText;
  });
}

// ===============================
// 페이지 로드 시 정렬 기준 업데이트 및 시간 표시 초기화
// ===============================
document.addEventListener('DOMContentLoaded', function() {
  updateSortCriteria();
  updateTimeDisplay();
  
  // 1분마다 시간 표시 업데이트
  setInterval(updateTimeDisplay, 60000);
});

// =====================================
// F5 / 새로고침 시 → 서버 session 초기화
// 다른 페이지에서 돌아왔을 때도 초기화
// =====================================
window.addEventListener("load", () => {
  const nav = performance.getEntriesByType("navigation")[0];

  // ✅ 버튼 클릭에 의한 reload면 무시
  const buttonClick = sessionStorage.getItem("emergency_button_click");

  // 새로고침(reload) 또는 다른 페이지에서 이동(navigate)인 경우
  const isReload = nav && nav.type === "reload" && !buttonClick;
  const isNavigate = nav && nav.type === "navigate" && !buttonClick;
  
  // navigate인 경우: referrer가 emergency 페이지가 아닐 때만 초기화
  // (emergency 페이지 내부 이동은 제외)
  const isFromOtherPage = isNavigate && 
    document.referrer && 
    !document.referrer.includes('/emergency/');

  if (isReload || isFromOtherPage) {
    fetch('/emergency/update_preferences/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken')
      },
      body: JSON.stringify({ action: 'reset' })
    })
    .then(res => res.json())
    .then(data => {
      if (data.status === 'ok') {
        window.location.replace(window.location.pathname);
      }
    })
    .catch(err => {
      console.error('상태 초기화 실패:', err);
    });
  }

  // ✅ 버튼 클릭 플래그는 1회성 → 여기서 제거
  if (buttonClick) {
    sessionStorage.removeItem("emergency_button_click");
  }
});