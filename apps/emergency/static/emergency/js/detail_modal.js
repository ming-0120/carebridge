function openHospitalDetail(erId) {
  const modal = document.getElementById("detail-modal");
  modal.classList.remove("hidden");

  fetch(`/emergency/detail/${erId}/`)
    .then(res => res.json())
    .then(data => {

      // 상단 정보
      document.getElementById("detail-title").innerText = data.er_name;
      document.getElementById("detail-meta").innerText =
        `${data.distance ? data.distance + "km | " : ""}${data.er_address}`;

      // 태그 렌더링 (CT/MRI/분만/수술 등)
      const tagWrap = document.getElementById("detail-tags");
      tagWrap.innerHTML = data.tags?.map(t => `<div class="tag">${t}</div>`).join("") || "";

      // 응급 메시지 배너
      const banner = document.getElementById("detail-banner");
      if (data.messages?.length > 0) {
        banner.innerText = data.messages[0];
        banner.classList.remove("hidden");
      } else {
        banner.classList.add("hidden");
      }

      // 병상 현황 circle 그래프
      fillCircle("circle-er", data.status.er_general_available, data.status.er_general_total);
      fillCircle("circle-child", data.status.er_child_available, data.status.er_child_total);
      fillCircle("circle-birth", data.status.birth_available, data.status.birth_total);
      fillCircle("circle-negative", data.status.negative_pressure_available, data.status.negative_pressure_total);
      fillCircle("circle-isolation", data.status.isolation_available, data.status.isolation_total);
      fillCircle("circle-cohort", data.status.cohort_available, data.status.cohort_total);

      document.getElementById("er-count").innerText       = `${data.status.er_general_available}/${data.status.er_general_total}`;
      document.getElementById("child-count").innerText    = `${data.status.er_child_available}/${data.status.er_child_total}`;
      document.getElementById("birth-count").innerText    = `${data.status.birth_available}/${data.status.birth_total}`;
      document.getElementById("negative-count").innerText = `${data.status.negative_pressure_available}/${data.status.negative_pressure_total}`;
      document.getElementById("isolation-count").innerText= `${data.status.isolation_available}/${data.status.isolation_total}`;
      document.getElementById("cohort-count").innerText   = `${data.status.cohort_available}/${data.status.cohort_total}`;
    });
}

function fillCircle(id, available, total) {
  const el = document.getElementById(id);
  if (!el) return;

  const rate = total ? available / total : 0;

  el.classList.remove("warn", "full", "free");

  if (available === 0) {
    el.innerText = "포화";
    el.classList.add("full");
  } else if (rate < 0.3) {
    el.innerText = "주의";
    el.classList.add("warn");
  } else {
    el.innerText = "여유";
    el.classList.add("free");
  }
}

function closeDetailModal() {
  document.getElementById("detail-modal").classList.add("hidden");
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeDetailModal();
});
