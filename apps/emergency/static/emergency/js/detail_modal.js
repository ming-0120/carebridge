// 상세 모달 열기
function openHospitalDetail(erId) {
  const modal = document.getElementById("detail-modal");
  modal.classList.remove("hidden");

  fetch(`/emergency/detail/${erId}/`)
    .then(res => res.json())
    .then(data => {

      // Header
      document.getElementById("detail-title").innerText = data.er_name;
      document.getElementById("detail-meta").innerText =
        `${data.er_address}${data.distance ? " · " + data.distance + "km" : ""}`;

      // Tags
      const tagWrap = document.getElementById("detail-tags");
      tagWrap.innerHTML = data.tags.map(t => `<span class="tag">${t}</span>`).join("");

      // Message banner
      const banner = document.getElementById("detail-banner");
      if (data.messages && data.messages.length > 0) {
        banner.innerText = data.messages[0];
        banner.classList.remove("hidden");
      } else {
        banner.classList.add("hidden");
      }

      // 병상 상태 적용
      fillCircle("er", data.status.er_general_available, data.status.er_general_total);
      fillCircle("child", data.status.er_child_available, data.status.er_child_total);
      fillCircle("birth", data.status.birth_available, data.status.birth_total);
      fillCircle("negative", data.status.negative_pressure_available, data.status.negative_pressure_total);
      fillCircle("isolation", data.status.isolation_available, data.status.isolation_total);
      fillCircle("cohort", data.status.cohort_available, data.status.cohort_total);
    });
}


// 상태 원형 UI 생성 (가용 수 기반)
function fillCircle(key, available, total) {
  const circleEl = document.getElementById(`circle-${key}`);
  const countEl = document.getElementById(`${key}-count`);

  // 숫자 표기
  countEl.innerText = `${available ?? "-"} / ${total ?? "-"}`;

  // 색상 초기화
  circleEl.classList.remove("circle-good", "circle-warn", "circle-full", "circle-empty");

  // 1) 정보없음
  if (available === null || available === undefined) {
    circleEl.classList.add("circle-empty");
    circleEl.innerText = "정보없음";
    return;
  }

  // 2) 포화
  if (available === 0) {
    circleEl.classList.add("circle-full");
    circleEl.innerText = "포화";
    return;
  }

  // 3) 주의 (가용 1)
  if (available === 1) {
    circleEl.classList.add("circle-warn");
    circleEl.innerText = "주의";
    return;
  }

  // 4) 여유 (가용 2 이상)
  circleEl.classList.add("circle-good");
  circleEl.innerText = "여유";
}


// ESC 닫기
function closeDetailModal() {
  document.getElementById("detail-modal").classList.add("hidden");
}

document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeDetailModal();
});
