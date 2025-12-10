// 상세 모달 열기
function openHospitalDetail(erId) {
  const modal = document.getElementById("detail-modal");
  modal.classList.remove("hidden");

  fetch(`/emergency/detail/${erId}/`)
    .then(res => res.json())
    .then(data => {

      // Header: 병원명 + 주소
      document.getElementById("detail-title").innerText = data.er_name;
      document.getElementById("detail-address").innerText = data.er_address || "";

      // ================================
      // Tags: CT / MRI / 분만실 / 수술실 / 중환자실
      // (기존 구조 유지, 렌더링 부분만 정확히 수정)
      // ================================
      const tagWrap = document.getElementById("detail-tags");
      tagWrap.innerHTML = "";  // 초기화

      if (data.tags && data.tags.length > 0) {
        data.tags.forEach(tag => {
          const el = document.createElement("span");
          el.classList.add("tag");
          el.textContent = tag;
          tagWrap.appendChild(el);
        });
      }
      // =================================

      // Message banner: ErMessage 표시
      const banner = document.getElementById("detail-banner");
      if (data.message) {
        banner.innerText = data.message;
        banner.classList.remove("hidden");
      } else {
        banner.classList.add("hidden");
      }

      // 병상 상태 적용 (테이블 형태)
      fillStatusRow("er", data.status?.er_general_available, data.status?.er_general_total);
      fillStatusRow("child", data.status?.er_child_available, data.status?.er_child_total);
      fillStatusRow("birth", data.status?.birth_available, data.status?.birth_total);
      fillStatusRow("negative", data.status?.negative_pressure_available, data.status?.negative_pressure_total);
      fillStatusRow("isolation", data.status?.isolation_general_available, data.status?.isolation_general_total);
      fillStatusRow("cohort", data.status?.isolation_cohort_available, data.status?.isolation_cohort_total);

      // AI 리뷰 요약
      updateAiReview(data.ai_review);

      // 지도 및 길찾기 버튼
      setupMap(
        data.er_lat,
        data.er_lng,
        data.er_address,
        data.kakao_map_js_key
      );
    })
    .catch(err => {
      console.error("상세 정보 로딩 실패:", err);
    });
}


// 상태 행 채우기 (원형 그래프 + 상태 텍스트 + 숫자)
function fillStatusRow(key, available, total) {
  const circleContainer = document.getElementById(`status-circle-${key}`);
  const statusTextEl = document.getElementById(`status-text-${key}`);
  const statusCountEl = document.getElementById(`status-count-${key}`);

  circleContainer.innerHTML = "";
  
  if (total !== null && total !== undefined && total >= 0 && available !== null && available !== undefined) {
    const pct = total > 0 ? (available / total) * 100 : 0;
    const circumference = 2 * Math.PI * 20; // r = 20
    const dashLength = (pct / 100) * circumference;
    const dashArray = `${dashLength.toFixed(2)}, ${circumference.toFixed(2)}`;

    let colorClass = "none";
    if (pct >= 70) {
      colorClass = "green";
    } else if (pct >= 30) {
      colorClass = "orange";
    } else if (pct > 0) {
      colorClass = "red";
    }

    circleContainer.innerHTML = `
      <div class="status-circle ${colorClass}">
        <svg>
          <circle class="meter ${pct === 0 ? 'none' : ''}"
            cx="24" cy="24" r="20"
            stroke-dasharray="${dashArray}"
            stroke="#e0e0e0"
            fill="none"
            stroke-width="4"
            stroke-linecap="round">
          </circle>
        </svg>
        <span class="label">${available}/${total}</span>
      </div>
    `;

    let statusText = "";
    if (available === null || available === undefined) {
      statusText = "정보없음";
    } else if (available === 0) {
      statusText = "포화";
    } else if (total === null || total === 0) {
      statusText = available === 1 ? "주의" : "여유";
    } else {
      const ratio = available / total;
      if (ratio < 0.3) {
        statusText = "주의";
      } else if (ratio >= 0.7) {
        statusText = "원활";
      } else {
        statusText = "보통";
      }
    }
    statusTextEl.innerText = statusText;
    statusCountEl.innerText = `${available ?? "-"}/${total ?? "-"}`;

  } else {
    circleContainer.innerHTML = `
      <div class="status-circle none">
        <svg>
          <circle class="meter none"
            cx="24" cy="24" r="20"
            stroke-dasharray="0, 125.66"
            stroke="#e0e0e0"
            fill="none"
            stroke-width="4"
            stroke-linecap="round">
          </circle>
        </svg>
        <span class="label">-</span>
      </div>
    `;
    statusTextEl.innerText = "정보없음";
    statusCountEl.innerText = "-/-";
  }
}


// AI 리뷰 요약 업데이트
function updateAiReview(aiReview) {
  const sentimentDiv = document.getElementById("review-sentiment");
  const summaryText = document.getElementById("review-summary-text");

  if (aiReview && aiReview.summary) {
    if (aiReview.positive_ratio !== null && aiReview.negative_ratio !== null) {
      const positivePercent = Math.round(aiReview.positive_ratio * 100);
      const negativePercent = Math.round(aiReview.negative_ratio * 100);

      document.getElementById("positive-percent").innerText = `${positivePercent}%`;
      document.getElementById("negative-percent").innerText = `${negativePercent}%`;

      const positiveBars = Math.round(positivePercent / 10);
      const negativeBars = Math.round(negativePercent / 10);
      
      const positiveBarsEl = document.getElementById("positive-bars");
      const negativeBarsEl = document.getElementById("negative-bars");
      
      positiveBarsEl.innerHTML = "";
      negativeBarsEl.innerHTML = "";
      
      for (let i = 0; i < positiveBars; i++) {
        positiveBarsEl.innerHTML += '<div class="bar-item"></div>';
      }
      for (let i = 0; i < negativeBars; i++) {
        negativeBarsEl.innerHTML += '<div class="bar-item"></div>';
      }

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


// 카카오 지도 미리보기 + 길찾기
function setupMap(lat, lng, address, apiKey) {
  const mapDiv = document.getElementById("detail-map");
  const navBtn = document.getElementById("detail-navigation-btn");

  // =============================
  // (A) 길찾기 버튼 — 지도와 무관하게 항상 적용
  // =============================
  const kakaoLink = `https://map.kakao.com/link/to/${encodeURIComponent(
    address
  )},${lat},${lng}`;
  navBtn.onclick = () => window.open(kakaoLink, "_blank");

  // 지도정보 없으면 길찾기만 동작
  if (!lat || !lng) {
    mapDiv.innerHTML =
      '<div style="width:100%; height:260px; background:#f1f1f1; border-radius:12px; display:flex; align-items:center; justify-content:center; color:#666;">위치 정보 없음</div>';
    return;
  }

  // =============================
  // (B) 카카오맵 로딩 — 실패해도 길찾기에는 영향 없음
  // =============================
  try {
    kakao.maps.load(function () {
      const container = mapDiv;
      const options = {
        center: new kakao.maps.LatLng(lat, lng),
        level: 3,
      };

      const map = new kakao.maps.Map(container, options);

      new kakao.maps.Marker({
        position: new kakao.maps.LatLng(lat, lng),
        map: map,
      });

      setTimeout(() => {
        map.relayout();
        map.setCenter(new kakao.maps.LatLng(lat, lng));
      }, 200);
    });
  } catch (e) {
    console.warn("지도 로딩 실패 (길찾기 버튼은 정상):", e);
  }
}






// ESC 닫기
function closeDetailModal() {
  document.getElementById("detail-modal").classList.add("hidden");
}

document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeDetailModal();
});