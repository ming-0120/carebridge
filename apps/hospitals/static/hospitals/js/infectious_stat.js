// ================================================================
// 0) 전역 데이터/상태
//   - window.INFECTIOUS_DATA: [{ disease, stdDate, statType, groupName, count }, ...]
//   - window.DISEASE_INFO:    [{ disease_code, disease_name, ai_summary, ai_updated_at }, ...]
// ================================================================
let rawData = [];
let genderChartInstance = null;
let ageChartInstance = null;

// ================================================================
// 1) 질병 셀렉트 초기화
// ================================================================
function initDiseaseSelect() {
  const select = document.getElementById("diseaseSelect");
  if (!select) return;

  select.innerHTML = "";

  const diseases = Array.from(new Set(rawData.map((d) => d.disease))).filter(Boolean);
  diseases.sort();

  diseases.forEach((d) => {
    const opt = document.createElement("option");
    opt.value = d;
    opt.textContent = d;
    select.appendChild(opt);
  });

  if (diseases.length > 0) {
    select.value = diseases[0];
  }
}

// ================================================================
// 2) 날짜 입력값 자동 보정
//   - dateInput이 비어있거나, 현재 선택값이 rawData에 없으면
//     해당 질병에서 가능한 stdDate 중 첫 값을 자동으로 넣음
// ================================================================
function normalizeStdDate(disease) {
  const dateInputEl = document.getElementById("dateInput");
  if (!dateInputEl) return "";

  const dates = Array.from(
    new Set(
      rawData
        .filter((r) => r.disease === disease && r.stdDate)
        .map((r) => String(r.stdDate))
    )
  ).sort();

  let stdDate = dateInputEl.value ? String(dateInputEl.value) : "";

  if (!stdDate || (dates.length > 0 && !dates.includes(stdDate))) {
    stdDate = dates.length > 0 ? dates[0] : "";
    if (stdDate) dateInputEl.value = stdDate;
  }

  return stdDate;
}

// ================================================================
// 3) 데이터 필터링 (질병 + 날짜 완전일치)
// ================================================================
function filterData(disease, stdDate) {
  const d = String(disease ?? "");
  const s = String(stdDate ?? "");

  const filtered = rawData.filter(
    (row) => String(row.disease) === d && String(row.stdDate) === s
  );

  const genderRows = filtered.filter((row) => row.statType === "GENDER");
  const ageRows = filtered.filter((row) => row.statType === "AGE");

  return { genderRows, ageRows };
}

// ================================================================
// 4) 성별 차트 (도넛)
// ================================================================
function renderGenderChart(rows, disease) {
  const canvas = document.getElementById("genderChart");
  if (!canvas) return;

  const filtered = (rows || []).filter((r) => r.groupName !== "계");
  const labels = filtered.map((r) => r.groupName);
  const data = filtered.map((r) => r.count);

  if (genderChartInstance) {
    genderChartInstance.destroy();
    genderChartInstance = null;
  }

  const summary = document.getElementById("genderSummary");

  if (labels.length === 0) {
    if (summary) summary.textContent = `${disease}의 성별별 데이터가 없습니다.`;
    return;
  }

  genderChartInstance = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{ data, borderWidth: 1 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: "bottom" },
      },
      cutout: "60%",
    },
  });

  const total = data.reduce((a, b) => a + b, 0);
  if (summary) {
    summary.textContent = `${disease}의 성별별 발생 건수 (총 ${total}건)`;
  }
}

// ================================================================
// 5) 연령 차트 (막대)
// ================================================================
function renderAgeChart(rows, disease) {
  const canvas = document.getElementById("ageChart");
  if (!canvas) return;

  const filtered = (rows || []).filter((r) => r.groupName !== "계");
  const labels = filtered.map((r) => r.groupName);
  const data = filtered.map((r) => r.count);

  if (ageChartInstance) {
    ageChartInstance.destroy();
    ageChartInstance = null;
  }

  const summary = document.getElementById("ageSummary");

  if (labels.length === 0) {
    if (summary) summary.textContent = `${disease}의 연령대별 데이터가 없습니다.`;
    return;
  }

  ageChartInstance = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [{ label: "건수", data, borderWidth: 1 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true },
        x: { ticks: { autoSkip: false, maxRotation: 45, minRotation: 0 } },
      },
    },
  });

  const total = data.reduce((a, b) => a + b, 0);
  if (summary) {
    summary.textContent = `${disease}의 연령대별 발생 건수 (총 ${total}건)`;
  }
}

// ================================================================
// 6) AI 요약 렌더
//   - window.DISEASE_INFO가 없거나 marked가 없어도 에러 없이 동작
// ================================================================
function renderDiseaseInfo(selectedValue) {
  const titleEl = document.getElementById("diseaseTitle");
  const contentEl = document.getElementById("diseaseDefinition");
  if (!titleEl || !contentEl) return;

  if (!selectedValue) {
    titleEl.textContent = "AI 요약";
    contentEl.textContent = "질병을 선택하면 AI 요약이 여기에 표시됩니다.";
    return;
  }

  const infoList = Array.isArray(window.DISEASE_INFO) ? window.DISEASE_INFO : [];

  const disease = infoList.find(
    (d) => d && (d.disease_code === selectedValue || d.disease_name === selectedValue)
  );

  if (!disease) {
    titleEl.textContent = "AI 요약";
    contentEl.textContent = "해당 질병에 대한 AI 요약이 없습니다.";
    return;
  }

  titleEl.textContent = `${disease.disease_name || selectedValue} AI 요약`;

  const summary = disease.ai_summary || "";
  if (window.marked && typeof window.marked.parse === "function") {
    contentEl.innerHTML = window.marked.parse(summary);
  } else {
    contentEl.textContent = summary;
  }
}

// ================================================================
// 7) 필터 적용 (단일 진입점)
// ================================================================
function applyFilter() {
  const disease = document.getElementById("diseaseSelect")?.value;
  if (!disease) return;

  const stdDate = normalizeStdDate(disease);

  const { genderRows, ageRows } = filterData(disease, stdDate);

  renderGenderChart(genderRows, disease);
  renderAgeChart(ageRows, disease);
  renderDiseaseInfo(disease);

  console.log("applyFilter:", {
    disease,
    stdDate,
    genderLen: genderRows.length,
    ageLen: ageRows.length,
  });
}

// ================================================================
// 8) 초기화
// ================================================================
window.addEventListener("DOMContentLoaded", () => {
  rawData = Array.isArray(window.INFECTIOUS_DATA) ? window.INFECTIOUS_DATA : [];
  console.log("rawData len:", rawData.length);

  initDiseaseSelect();

  document.getElementById("applyFilterBtn")?.addEventListener("click", applyFilter);
  document.getElementById("diseaseSelect")?.addEventListener("change", applyFilter);
  document.getElementById("dateInput")?.addEventListener("change", applyFilter);

  applyFilter();
});
