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

          // 병상 상태 표시
          fillStatusRow(
            "er",
            data.status?.er_general_available,
            data.status?.er_general_total
          );
          fillStatusRow(
            "child",
            data.status?.er_child_available,
            data.status?.er_child_total
          );
          fillStatusRow(
            "birth",
            data.status?.birth_available,
            data.status?.birth_total
          );
          fillStatusRow(
            "negative",
            data.status?.negative_pressure_available,
            data.status?.negative_pressure_total
          );
          fillStatusRow(
            "isolation",
            data.status?.isolation_general_available,
            data.status?.isolation_general_total
          );
          fillStatusRow(
            "cohort",
            data.status?.isolation_cohort_available,
            data.status?.isolation_cohort_total
          );

          // AI 리뷰 적용
          updateAiReview(data.ai_review);

          // 지도 미리보기
          setupMap(data.er_lat, data.er_lng, data.er_address);
        })
        .catch((err) => console.error("상세 정보 로딩 실패:", err));
    });
  });
}

// ======================================
// 병상 상태 UI 렌더링
// ======================================
function fillStatusRow(key, available, total) {
  const circleContainer = document.getElementById(`status-circle-${key}`);

  circleContainer.innerHTML = "";

  if (
    total !== null &&
    total !== undefined &&
    total >= 0 &&
    available !== null &&
    available !== undefined
  ) {
    const pct = total > 0 ? (available / total) * 100 : 0;
    const circumference = 2 * Math.PI * 20;
    const dashLength = (pct / 100) * circumference;
    const dashArray = `${dashLength.toFixed(2)}, ${circumference.toFixed(2)}`;

    let colorClass = "none";
    if (pct >= 70) colorClass = "green";
    else if (pct >= 30) colorClass = "orange";
    else if (pct > 0) colorClass = "red";

    // 배경 원의 stroke 색상 결정 (available == 0이고 red일 때만 빨간색)
    const bgStrokeColor = (available === 0 && colorClass === "red") ? "#E53935" : "#e0e0e0";

    circleContainer.innerHTML = `
      <div class="status-circle ${colorClass}">
        <svg>
          <circle class="meter-bg"
            cx="24" cy="24" r="20"
            stroke-dasharray="125.66, 125.66"
            stroke="${bgStrokeColor}"
            fill="none"
            stroke-width="4"
            stroke-linecap="round">
          </circle>
          ${available > 0 ? `
          <circle class="meter"
            cx="24" cy="24" r="20"
            stroke-dasharray="${dashArray}"
            fill="none"
            stroke-width="4"
            stroke-linecap="round">
          </circle>
          ` : ''}
        </svg>
        <span class="label">${available}/${total}</span>
      </div>
    `;
  } else {
    circleContainer.innerHTML = `
      <div class="status-circle none">
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
// Google Map 미리보기 + Kakao 길찾기 버튼
// =============================
function setupMap(lat, lng, address) {
  const mapDiv = document.getElementById("detail-map");
  const navBtn = document.getElementById("detail-navigation-btn");

  if (!mapDiv || !navBtn) return;

  // =============================
  // Kakao 길찾기 버튼 (변경 없음)
  // =============================
  const kakaoLink = `https://map.kakao.com/link/to/${encodeURIComponent(address)},${lat},${lng}`;
  navBtn.onclick = () => window.open(kakaoLink, "_blank");

  // =============================
  // Google Maps 미리보기 iframe (마커 포함)
  // =============================
  if (!lat || !lng) {
    mapDiv.innerHTML = `
      <div style="width:100%; height:260px; background:#f1f1f1; border-radius:12px;
                  display:flex; align-items:center; justify-content:center; color:#666;">
        위치 정보 없음
      </div>`;
    return;
  }

  // API 키 확인
  if (!GOOGLE_API_KEY || GOOGLE_API_KEY === 'None' || GOOGLE_API_KEY.trim() === '') {
    console.error('Google Maps API 키가 설정되지 않았습니다.');
    mapDiv.innerHTML = `
      <div style="width:100%; height:260px; background:#f1f1f1; border-radius:12px;
                  display:flex; flex-direction:column; align-items:center; justify-content:center; color:#666; padding:20px; text-align:center;">
        <div style="margin-bottom:10px;">지도 로딩 실패</div>
        <small style="font-size:12px; color:#999;">API 키가 설정되지 않았습니다.</small>
        <small style="font-size:11px; color:#999; margin-top:5px;">.env 파일에 GOOGLE_MAP_API_KEY를 설정해주세요.</small>
      </div>`;
    return;
  }

  // Google Maps Embed API - place 모드 사용 (마커 자동 표시)
  // 주소가 있으면 주소를 사용하고, 없으면 좌표를 사용
  const placeQuery = address ? encodeURIComponent(address) : `${lat},${lng}`;
  
  const googleEmbedUrl = `
    https://www.google.com/maps/embed/v1/place
      ?key=${GOOGLE_API_KEY}
      &q=${placeQuery}
      &zoom=16
  `.replace(/\s+/g, "");

  mapDiv.innerHTML = `
      <iframe
        width="100%"
        height="260"
        style="border:0; border-radius:12px;"
        loading="lazy"
        allowfullscreen
        referrerpolicy="no-referrer-when-downgrade"
        src="${googleEmbedUrl}">
      </iframe>
  `;
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
