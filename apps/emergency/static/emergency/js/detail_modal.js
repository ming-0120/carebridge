// ======================================
// 지도 관련 전역 변수
// ======================================
let detailMap = null;  // 카카오맵 인스턴스
let detailMarker = null;  // 카카오맵 마커 인스턴스

// ======================================
// 상세 모달 열기
// ======================================
function openHospitalDetail(erId) {
  const modal = document.getElementById("detail-modal");
  if (!modal) return;

  modal.classList.remove("hidden");

  // 모달 렌더링 완료 후 데이터 불러오기
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      fetch(`/emergency/detail/${erId}/`)
        .then((res) => res.json())
        .then((data) => {
          // 병원 기본 정보
          document.getElementById("detail-title").innerText = data.er_name;
          document.getElementById("detail-address").innerText =
            data.er_address || "";

          // 즐겨찾기 상태 표시
          const favoriteElement = document.getElementById("detail-favorite");
          if (favoriteElement) {
            // 별표 텍스트가 없으면 추가
            if (!favoriteElement.textContent.trim()) {
              favoriteElement.textContent = '★';
            }
            favoriteElement.setAttribute('data-er-id', data.er_id || erId);
            // 즐겨찾기 상태에 따라 클래스 추가/제거
            if (data.is_favorite) {
              favoriteElement.classList.add('on');
            } else {
              favoriteElement.classList.remove('on');
            }
          }

          // 태그 표시
          const tagWrap = document.getElementById("detail-tags");
          tagWrap.innerHTML = "";
          if (data.tags && data.tags.length > 0) {
            data.tags.forEach((tag) => {
              const el = document.createElement("span");
              el.classList.add("tag");
              el.textContent = tag;
              tagWrap.appendChild(el);
            });
          }

          // 메시지 표시
          const banner = document.getElementById("detail-banner");
          if (data.message) {
            banner.innerText = data.message;
            banner.classList.remove("hidden");
          } else {
            banner.classList.add("hidden");
          }

          // 병상 상태 표시 (서버 계산 결과 우선 사용)
          const statusUI = data.status_ui || {};
          fillStatusRow(
            "er",
            data.status?.er_general_available,
            data.status?.er_general_total,
            statusUI.er_general
          );
          fillStatusRow(
            "child",
            data.status?.er_child_available,
            data.status?.er_child_total,
            statusUI.er_child
          );
          fillStatusRow(
            "birth",
            data.status?.birth_available,
            data.status?.birth_total,
            statusUI.birth
          );
          fillStatusRow(
            "negative",
            data.status?.negative_pressure_available,
            data.status?.negative_pressure_total,
            statusUI.negative_pressure
          );
          fillStatusRow(
            "isolation",
            data.status?.isolation_general_available,
            data.status?.isolation_general_total,
            statusUI.isolation_general
          );
          fillStatusRow(
            "cohort",
            data.status?.isolation_cohort_available,
            data.status?.isolation_cohort_total,
            statusUI.isolation_cohort
          );

          // 지도 미리보기
          setupMap(data.er_lat, data.er_lng, data.er_address);
        })
        .catch((err) => console.error("상세 정보 로딩 실패:", err));
    });
  });
}

// ======================================
// 병상 상태 UI 렌더링 (메인 페이지와 동일한 로직)
// ======================================
function fillStatusRow(key, available, total, uiData) {
  const circleContainer = document.getElementById(`status-circle-${key}`);

  circleContainer.innerHTML = "";

  // type_name 매핑 (메인 페이지와 동일)
  const typeNameMap = {
    "er": "er_general",
    "child": "er_child",
    "birth": "birth",
    "negative": "negative_pressure",
    "isolation": "isolation_general",
    "cohort": "isolation_cohort"
  };
  const typeName = typeNameMap[key] || key;

  // 메인 페이지와 동일한 로직: congestion_text와 congestion_color_class 기준
  let congestionLabel = "-";
  let colorClass = "none";

  // 1) 서버에서 계산해 준 값이 있으면 그대로 사용 (메인과 1:1 일치)
  if (
    uiData &&
    uiData.label !== undefined &&
    uiData.color_class !== undefined
  ) {
    congestionLabel = uiData.label;
    colorClass = uiData.color_class;
  } else {

  if (!uiData && available !== null && available !== undefined) {
    // 분만실 특수 처리
    if (typeName === "birth") {
      if (available >= 1) {
        congestionLabel = "가능";
        colorClass = "green";
      } else {
        congestionLabel = "불가능";
        colorClass = "red";
      }
    } else {
      // available이 0이면 혼잡/빨강
      if (available === 0) {
        congestionLabel = "혼잡";
        colorClass = "red";
      } else if (total === null || total === undefined || total <= 0) {
        // total이 없으면 보통/회색
        congestionLabel = "보통";
        colorClass = "none";
      } else {
        // 퍼센트 계산
        const pct = (available / total) * 100;

        // 응급실일반/소아: 80% 이상=원활/초록, 50~79%=보통/주황, 50% 미만=혼잡/빨강
        if (typeName === "er_general" || typeName === "er_child") {
          if (pct >= 80) {
            congestionLabel = "원활";
            colorClass = "green";
          } else if (pct >= 50) {
            congestionLabel = "보통";
            colorClass = "orange";
          } else {
            congestionLabel = "혼잡";
            colorClass = "red";
          }
        } 
        // 음압/일반/코호트격리: 100%=원활/초록, 50~99%=보통/주황, 50% 미만=혼잡/빨강
        else if (typeName === "negative_pressure" || typeName === "isolation_general" || typeName === "isolation_cohort") {
          if (pct >= 100) {
            congestionLabel = "원활";
            colorClass = "green";
          } else if (pct >= 50) {
            congestionLabel = "보통";
            colorClass = "orange";
          } else {
            congestionLabel = "혼잡";
            colorClass = "red";
          }
        }
      }
    }
  }
  }

  // 원형 그래프 렌더링
  const resolvedDashOffset = uiData ? uiData.dash_offset : null;
  const resolvedBgStroke = uiData ? (uiData.bg_stroke || "#e0e0e0") : null;
  const displayAvailable = (available !== null && available !== undefined)
    ? available
    : (uiData && uiData.available !== undefined ? uiData.available : "-");
  const displayTotal = (total !== null && total !== undefined)
    ? total
    : (uiData && uiData.total !== undefined ? uiData.total : "-");

  if (
    (uiData && resolvedDashOffset !== null && resolvedDashOffset !== undefined) ||
    (!uiData &&
      total !== null &&
      total !== undefined &&
      total > 0 &&
      available !== null &&
      available !== undefined)
  ) {
    // 정상 케이스: 서버 계산 우선, 없으면 기존 JS 계산
    const safeAvailable = (available !== null && available !== undefined)
      ? Math.max(0, available)
      : (uiData && uiData.available !== undefined ? Math.max(0, uiData.available) : 0);
    const dashOffset = uiData
      ? Number(resolvedDashOffset)
      : (function () {
          const pct = total > 0 ? (safeAvailable / total) * 100 : 0;
          const pctClamped = Math.max(0, Math.min(100, pct));
          const circumference = 2 * Math.PI * 20;
          return circumference * (1 - pctClamped / 100);
        })();

    const bgStrokeColor = uiData
      ? resolvedBgStroke
      : (safeAvailable === 0 && colorClass === "red") ? "#E53935" : "#e0e0e0";

    circleContainer.innerHTML = `
      <div class="circle ${colorClass}">
        <svg>
          <circle class="meter-bg"
            cx="24" cy="24" r="20"
            stroke-dasharray="125.66, 125.66"
            stroke="${bgStrokeColor}"
            fill="none"
            stroke-width="4"
            stroke-linecap="round">
          </circle>
          ${safeAvailable >= 0 ? `
          <circle class="meter"
            cx="24" cy="24" r="20"
            stroke-dasharray="125.66, 125.66"
            stroke-dashoffset="${dashOffset.toFixed(2)}"
            style="--dash-offset: ${dashOffset.toFixed(2)};"
            fill="none"
            stroke-width="4"
            stroke-linecap="round">
          </circle>
          ` : ''}
        </svg>
        <span class="label">${congestionLabel}</span>
      </div>
      <div class="status-value">${displayAvailable}/${displayTotal}</div>
    `;
  } else if (available !== null && available !== undefined && available >= 0) {
    // available만 있고 total이 None이거나 0인 경우: "-" 표시
    circleContainer.innerHTML = `
      <div class="circle none">
        <svg>
          <circle class="meter-bg"
            cx="24" cy="24" r="20"
            stroke-dasharray="125.66, 125.66"
            stroke="#e0e0e0"
            fill="none"
            stroke-width="4"
            stroke-linecap="round">
          </circle>
          <circle class="meter none"
            cx="24" cy="24" r="20"
            stroke-dasharray="0, 125.66"
            fill="none"
            stroke-width="4"
            stroke-linecap="round">
          </circle>
        </svg>
        <span class="label">-</span>
      </div>
      <div class="status-value">-</div>
    `;
  } else {
    // available이 None이고 total만 있는 경우 또는 모두 None: "-" 표시
    circleContainer.innerHTML = `
      <div class="circle none">
        <svg>
          <circle class="meter-bg"
            cx="24" cy="24" r="20"
            stroke-dasharray="125.66, 125.66"
            stroke="#e0e0e0"
            fill="none"
            stroke-width="4"
            stroke-linecap="round">
          </circle>
          <circle class="meter none"
            cx="24" cy="24" r="20"
            stroke-dasharray="0, 125.66"
            fill="none"
            stroke-width="4"
            stroke-linecap="round">
          </circle>
        </svg>
        <span class="label">-</span>
      </div>
      <div class="status-value">-</div>
    `;
  }
}

// ======================================
// AI 리뷰 업데이트
// ======================================
function updateAiReview(aiReview) {
  const sentimentDiv = document.getElementById("review-sentiment");
  const summaryText = document.getElementById("review-summary-text");

  if (aiReview && aiReview.summary) {
    if (
      aiReview.positive_ratio !== null &&
      aiReview.negative_ratio !== null
    ) {
      const positivePercent = Math.round(aiReview.positive_ratio * 100);
      const negativePercent = Math.round(aiReview.negative_ratio * 100);

      document.getElementById("positive-percent").innerText =
        `${positivePercent}%`;
      document.getElementById("negative-percent").innerText =
        `${negativePercent}%`;

      const positiveBars = Math.round(positivePercent / 10);
      const negativeBars = Math.round(negativePercent / 10);

      const positiveBarsEl = document.getElementById("positive-bars");
      const negativeBarsEl = document.getElementById("negative-bars");

      positiveBarsEl.innerHTML = "";
      negativeBarsEl.innerHTML = "";

      for (let i = 0; i < positiveBars; i++)
        positiveBarsEl.innerHTML += '<div class="bar-item"></div>';

      for (let i = 0; i < negativeBars; i++)
        negativeBarsEl.innerHTML += '<div class="bar-item"></div>';

      sentimentDiv.classList.remove("hidden");
    } else {
      sentimentDiv.classList.add("hidden");
    }

    summaryText.innerText = aiReview.summary;
  } else {
    sentimentDiv.classList.add("hidden");
    summaryText.innerText = "리뷰 데이터 준비중...";
  }
}

// =============================
// Kakao Map 미리보기 + Kakao 길찾기 버튼
// =============================
function setupMap(lat, lng, address) {
  const mapDiv = document.getElementById("detail-map");
  const navBtn = document.getElementById("detail-navigation-btn");

  if (!mapDiv || !navBtn) return;

  // =============================
  // Kakao 길찾기 버튼 (변경 없음)
  // =============================
    const placeName =
    document.getElementById("detail-title")?.innerText || "병원";

  const kakaoLink =
    `https://map.kakao.com/link/to/${encodeURIComponent(placeName)},${lat},${lng}`;

  navBtn.onclick = () => window.open(kakaoLink, "_blank");

  // =============================
  // 좌표 유효성 검사
  // =============================
  if (!lat || !lng) {
    mapDiv.innerHTML = `
      <div style="width:100%; height:260px; background:#f1f1f1; border-radius:12px;
                  display:flex; align-items:center; justify-content:center; color:#666;">
        위치 정보 없음
      </div>`;
    return;
  }

  // =============================
  // 기존 지도 및 마커 제거
  // =============================
  if (detailMarker) {
    detailMarker.setMap(null);
    detailMarker = null;
  }
  
  if (detailMap) {
    // 기존 지도 인스턴스 제거
    detailMap = null;
  }

  // 지도 컨테이너 초기화 (하지만 스타일은 유지)
  // innerHTML을 비우면 안 됨! 카카오맵이 렌더링할 DOM이 필요함
  // 대신 기존 내용만 제거하고 컨테이너는 유지
  const existingContent = mapDiv.querySelectorAll('*');
  existingContent.forEach(el => el.remove());
  
  // 텍스트 노드 제거
  while (mapDiv.firstChild) {
    mapDiv.removeChild(mapDiv.firstChild);
  }

  // =============================
  // 카카오맵 API 로드 확인 및 초기화
  // =============================
  // autoload=false일 때는 kakao.maps 객체는 존재하지만 Map 클래스는 로드되지 않음
  if (typeof kakao === 'undefined' || typeof kakao.maps === 'undefined') {
    mapDiv.innerHTML = `
      <div style="width:100%; height:260px; background:#f1f1f1; border-radius:12px;
                  display:flex; flex-direction:column; align-items:center; justify-content:center; color:#666; padding:20px; text-align:center;">
        <div style="margin-bottom:10px;">지도 로딩 실패</div>
        <small style="font-size:12px; color:#999;">카카오맵 API가 로드되지 않았습니다.</small>
      </div>`;
    return;
  }

  // 모달이 완전히 표시된 후 지도 생성 (약간의 지연 추가)
  setTimeout(() => {
    // kakao.maps.Map이 이미 로드되어 있으면 바로 초기화, 아니면 로드 후 초기화
    if (kakao.maps && kakao.maps.Map) {
      initDetailMap(lat, lng);
    } else if (kakao.maps && typeof kakao.maps.load === 'function') {
      // autoload=false이므로 명시적으로 로드 필요
      kakao.maps.load(() => {
        initDetailMap(lat, lng);
      });
    } else {
      // kakao.maps.load가 없는 경우 (예상치 못한 상황)
      mapDiv.innerHTML = `
        <div style="width:100%; height:260px; background:#f1f1f1; border-radius:12px;
                    display:flex; flex-direction:column; align-items:center; justify-content:center; color:#666; padding:20px; text-align:center;">
          <div style="margin-bottom:10px;">지도 로딩 실패</div>
          <small style="font-size:12px; color:#999;">카카오맵 API 로드 함수를 찾을 수 없습니다.</small>
        </div>`;
    }
  }, 100); // 모달 렌더링 완료 대기
}

// =============================
// 카카오맵 초기화 함수
// =============================
function initDetailMap(lat, lng) {
  const mapDiv = document.getElementById("detail-map");
  if (!mapDiv) return;

  // 지도 컨테이너가 보이는지 확인
  const modal = document.getElementById("detail-modal");
  if (modal && modal.classList.contains("hidden")) {
    console.warn("모달이 숨겨진 상태에서 지도를 생성하려고 시도했습니다.");
    return;
  }

  try {
    // 좌표 객체 생성
    const position = new kakao.maps.LatLng(lat, lng);

    // 지도 옵션 설정
    const mapOption = {
      center: position,
      level: 3  // 확대 레벨 (1~14, 숫자가 작을수록 확대)
    };

    // 지도 생성 (항상 새로 생성)
    detailMap = new kakao.maps.Map(mapDiv, mapOption);

    // 마커 생성 및 표시
    detailMarker = new kakao.maps.Marker({
      position: position,
      map: detailMap
    });
  } catch (error) {
    console.error("카카오맵 초기화 실패:", error);
    mapDiv.innerHTML = `
      <div style="width:100%; height:260px; background:#f1f1f1; border-radius:12px;
                  display:flex; flex-direction:column; align-items:center; justify-content:center; color:#666; padding:20px; text-align:center;">
        <div style="margin-bottom:10px;">지도 로딩 실패</div>
        <small style="font-size:12px; color:#999;">지도를 불러오는 중 오류가 발생했습니다.</small>
      </div>`;
  }
}


// ======================================
// ESC 닫기
// ======================================
function closeDetailModal() {
  const modal = document.getElementById("detail-modal");
  if (modal) modal.classList.add("hidden");
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeDetailModal();
});

// ======================================
// 상세 모달 즐겨찾기 토글 함수
// ======================================
function toggleDetailFavorite(event, erId) {
  // 이벤트 전파 중지
  event.stopPropagation();
  event.preventDefault();
  
  // CSRF 토큰 가져오기
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
  
  // AJAX 요청으로 즐겨찾기 토글
  fetch('/emergency/toggle_favorite/', {
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
        window.location.href = `/accounts/login/?next=${currentUrl}`;
      }
      return null;
    }
    return response.json();
  })
  .then(data => {
    if (data && data.ok) {
      // 즐겨찾기 상태 업데이트
      const favoriteElement = document.getElementById('detail-favorite');
      if (favoriteElement) {
        if (data.is_favorite) {
          favoriteElement.classList.add('on');
        } else {
          favoriteElement.classList.remove('on');
        }
      }
      
      // 메인 페이지의 별표도 동기화 (같은 er_id를 가진 요소 찾기)
      const mainFavorite = document.querySelector(`.favorite[data-er-id="${erId}"]`);
      if (mainFavorite) {
        if (data.is_favorite) {
          mainFavorite.classList.add('on');
        } else {
          mainFavorite.classList.remove('on');
        }
      }
    }
  })
  .catch(err => {
    console.error('즐겨찾기 토글 실패:', err);
  });
}

// ======================================
// 상세 모달 즐겨찾기 클릭 이벤트 리스너
// ======================================
document.addEventListener('DOMContentLoaded', function() {
  // 이벤트 위임 방식으로 상세 모달의 즐겨찾기 버튼 클릭 처리
  document.addEventListener('click', function(event) {
    const favoriteElement = event.target.closest('#detail-favorite');
    if (favoriteElement) {
      const erId = favoriteElement.getAttribute('data-er-id');
      if (erId) {
        toggleDetailFavorite(event, parseInt(erId, 10));
      }
    }
  });
});
