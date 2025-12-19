// ================================================================
// 0) 전역 데이터/상태
//   - window.INFECTIOUS_DATA: [{ disease, stdDate, statType, groupName, count }, ...]
//   - window.DISEASE_INFO:    [{ disease_code, disease_name, ai_summary, ai_updated_at }, ...]
// ================================================================
let rawData = [];
let genderChartInstance = null;
let ageChartInstance = null;

// 디바운싱을 위한 타이머
let syncHeightTimer = null;

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
      animation: {
        duration: 0, // 애니메이션 비활성화하여 즉시 렌더링
      },
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
// 5) 연령 차트 (막대) — 10년 단위(20대,30대,40대…)
// ================================================================
function renderAgeChart(rows, disease) {
  const canvas = document.getElementById("ageChart");
  if (!canvas) return;

  const ageSection = document.getElementById("ageSection");
  const summary = document.getElementById("ageSummary");

  // =========================
  // 1) 연령 데이터 10년 단위로 그룹핑
  // =========================
  const bucket = {}; // { "20대": 합계, "30대": 합계, ... }

  (rows || []).forEach((r) => {
    if (!r || r.groupName === "계") return;

    const cnt = Number(r.count || 0);
    if (cnt <= 0) return;

    // groupName에서 숫자 추출 (예: "23", "23세", "23세 이상")
    const match = String(r.groupName).match(/\d+/);
    if (!match) return;

    const age = Number(match[0]);
    if (!Number.isFinite(age)) return;

    // 10년 단위 계산
    const decade = Math.floor(age / 10) * 10;

    // 필요 시 20대 이상만 보여주고 싶으면 아래 줄 유지
    if (decade < 20) return;

    const label = `${decade}대`;
    bucket[label] = (bucket[label] || 0) + cnt;
  });

  // =========================
  // 2) 라벨 정렬 (20대 → 30대 → 40대 …)
  // =========================
  const labels = Object.keys(bucket).sort((a, b) => {
    const na = Number(a.replace("대", ""));
    const nb = Number(b.replace("대", ""));
    return na - nb;
  });

  const data = labels.map((l) => bucket[l]);

  // =========================
  // 3) 기존 차트 제거
  // =========================
  if (ageChartInstance) {
    ageChartInstance.destroy();
    ageChartInstance = null;
  }

  // =========================
  // 4) 데이터 없으면 섹션 숨김
  // =========================
  if (labels.length === 0) {
    if (ageSection) ageSection.style.display = "none";
    return;
  }

  // 데이터 있으면 다시 표시
  if (ageSection) ageSection.style.display = "block";

  // =========================
  // 5) 차트 생성
  // =========================
  ageChartInstance = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "건수",
          data,
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 0, // 애니메이션 비활성화하여 즉시 렌더링
      },
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: {
          beginAtZero: true,
        },
        x: {
          ticks: {
            autoSkip: false,
            maxRotation: 45,
            minRotation: 0,
          },
        },
      },
    },
  });

  // =========================
  // 6) 요약 문구
  // =========================
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

  const setEmpty = (msg) => {
    titleEl.textContent = "AI 요약";
    contentEl.textContent = msg;
  };

  if (!selectedValue) {
    setEmpty("질병을 선택하면 AI 요약이 여기에 표시됩니다.");
    return;
  }

  const infoList = Array.isArray(window.DISEASE_INFO) ? window.DISEASE_INFO : [];
  const disease = infoList.find(
    (d) => d && (d.disease_code === selectedValue || d.disease_name === selectedValue)
  );

  if (!disease) {
    setEmpty("해당 질병에 대한 AI 요약이 없습니다.");
    return;
  }

  titleEl.textContent = `${disease.disease_name || selectedValue} AI 요약`;

  const s = disease.ai_summary;

  const isNonEmptyString = (v) => typeof v === "string" && v.trim().length > 0;
  const isNonEmptyArray = (v) => Array.isArray(v) && v.filter(Boolean).length > 0;

  const joinLines = (arr) =>
    isNonEmptyArray(arr) ? arr.filter(Boolean).map((x) => `- ${x}`).join("\n") : "";

  const joinTop = (arr) =>
    isNonEmptyArray(arr)
      ? arr
          .map((x) => {
            const label = x?.label ?? "";
            const cases = x?.cases ?? "";
            const pct = x?.share_pct ?? "";
            // label이 비면 라인 자체 제거
            if (!String(label).trim()) return "";
            // 숫자는 그대로 출력(원 데이터 그대로)
            return `- ${label} (${cases}건, ${pct}%)`;
          })
          .filter(Boolean)
          .join("\n")
      : "";

  const addSection = (chunks, title, bodyMd) => {
    if (!isNonEmptyString(bodyMd)) return;
    chunks.push(`### ${title}\n${bodyMd}`);
  };

  let mdText = "";

  if (s && typeof s === "object") {
    const mo = s.medical_overview || {};
    const ss = s.stats_summary || {};

    const medicalChunks = [];
    addSection(medicalChunks, "정의", mo.definition ?? "");
    addSection(medicalChunks, "전파/감염", joinLines(mo.how_it_spreads));
    addSection(medicalChunks, "대표 증상", joinLines(mo.common_symptoms));
    addSection(medicalChunks, "예방", joinLines(mo.prevention));
    addSection(medicalChunks, "병원 가야 할 때", joinLines(mo.when_to_see_doctor));

    const statsChunks = [];
    addSection(statsChunks, "기준 시점/기간", ss.period_note ?? "");
    addSection(statsChunks, "성별 TOP", joinTop(ss.gender_top3));
    addSection(statsChunks, "연령 TOP", joinTop(ss.age_top3));
    addSection(statsChunks, "지역 TOP", joinTop(ss.region_top3));
    addSection(statsChunks, "쉬운 설명", ss.plain_explanation ?? "");
    addSection(statsChunks, "데이터 한계", joinLines(ss.data_limits));

    const finalChunks = [];
    if (medicalChunks.length) finalChunks.push(`## 의료 정보\n\n${medicalChunks.join("\n\n")}`);
    if (statsChunks.length) finalChunks.push(`## 통계 요약\n\n${statsChunks.join("\n\n")}`);

    mdText = finalChunks.length ? finalChunks.join("\n\n") : "AI 요약이 없습니다.";
  } else if (typeof s === "string") {
    mdText = s.trim() ? s : "AI 요약이 없습니다.";
  } else {
    mdText = "AI 요약이 없습니다.";
  }
  // 콘텐츠 삽입 전에 visibility를 hidden으로 설정하여 레이아웃 공간은 유지하되 보이지 않게 함
  // 이렇게 하면 높이 변화 없이 콘텐츠를 교체할 수 있음
  contentEl.style.visibility = "hidden";
  contentEl.style.opacity = "0";
  
  // 다음 프레임에서 콘텐츠 삽입 및 visibility/opacity 복원
  requestAnimationFrame(() => {
    if (window.marked && typeof window.marked.parse === "function") {
      contentEl.innerHTML = window.marked.parse(mdText);
    } else {
      contentEl.textContent = mdText;
    }
    
    // 콘텐츠 삽입 후 visibility와 opacity 복원
    requestAnimationFrame(() => {
      contentEl.style.visibility = "visible";
      contentEl.style.opacity = "1";
    });
  });
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

  // 차트 렌더링 완료 후 높이 동기화
  // 여러 프레임을 거쳐 차트가 완전히 렌더링될 때까지 대기
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      // 레이아웃 재계산을 위한 추가 대기
      setTimeout(() => {
        syncSummaryHeight();
      }, 50);
    });
  });

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
/* =========================================================
   좌측(그래프) 높이에 우측(요약) 높이 동기화 + ageSection 자동 숨김
   ========================================================= */

// 디바운싱된 syncSummaryHeight 함수
function syncSummaryHeightDebounced() {
  if (syncHeightTimer) {
    clearTimeout(syncHeightTimer);
  }
  
  syncHeightTimer = setTimeout(() => {
    syncSummaryHeight();
  }, 100); // 100ms 디바운싱
}

// 실제 높이 동기화 함수
function syncSummaryHeight() {
  const chartsCol = document.getElementById("chartsCol");
  const summaryCol = document.getElementById("summaryCol");
  const ageSection = document.getElementById("ageSection");
  
  if (!chartsCol || !summaryCol) return;

  // 레이아웃 재계산을 위해 강제로 리플로우 발생
  void chartsCol.offsetHeight;

  // ageSection이 존재하고 표시되어 있는 경우, ageSection의 하단 위치를 기준으로 높이 제한
  if (ageSection && ageSection.style.display !== "none") {
    const ageSectionRect = ageSection.getBoundingClientRect();
    const chartsColRect = chartsCol.getBoundingClientRect();
    
    // ageSection의 하단이 chartsCol 내에서 어느 위치인지 계산
    const ageSectionBottom = ageSectionRect.bottom - chartsColRect.top;
    
    // summaryCol의 높이는 ageSection의 하단을 넘지 않도록 설정
    summaryCol.style.height = `${Math.max(0, Math.floor(ageSectionBottom))}px`;
  } else {
    // ageSection이 없거나 숨겨진 경우, chartsCol 전체 높이 사용
    const h = chartsCol.getBoundingClientRect().height;
    summaryCol.style.height = `${Math.max(0, Math.floor(h))}px`;
  }
}

function toggleAgeSectionByCanvas() {
  const ageSection = document.getElementById("ageSection");
  const ageCanvas = document.getElementById("ageChart");
  if (!ageSection || !ageCanvas) return;

  // canvas에 실제로 그려진 게 없거나(높이 0), 섹션을 숨기고 싶을 때 대비
  // (차트 데이터 체크는 아래 훅에서 처리)
  if (ageSection.style.display === "none") {
    // 이미 숨김이면 그대로
  }
  syncSummaryHeightDebounced();
}

/* 페이지 로드/리사이즈 */
window.addEventListener("load", () => {
  // 페이지 로드 완료 후 충분한 시간을 두고 높이 동기화
  setTimeout(() => {
    syncSummaryHeight();
    toggleAgeSectionByCanvas();
  }, 200);
});
window.addEventListener("resize", syncSummaryHeightDebounced);

/* 좌측 컬럼 높이 변경(막대그래프 표시/숨김 포함) 자동 감지 */
(function attachResizeObserver() {
  const chartsColEl = document.getElementById("chartsCol");
  if (!chartsColEl) return;

  const ro = new ResizeObserver(() => syncSummaryHeightDebounced());
  ro.observe(chartsColEl);
})();

/* =========================================================
   ✅ 너의 차트 업데이트 함수 끝에서 이것만 호출하면 됨:
   - 연령대 데이터가 없으면 ageSection 숨기고 우측도 줄어듦
   ========================================================= */
function setAgeSectionVisibleByData(ageLabels, ageValues) {
  const ageSection = document.getElementById("ageSection");
  if (!ageSection) return;

  const hasData =
    Array.isArray(ageLabels) && ageLabels.length > 0 &&
    Array.isArray(ageValues) && ageValues.length > 0 &&
    ageValues.some(v => Number(v) > 0);

  ageSection.style.display = hasData ? "" : "none";
  // display 변경 후 레이아웃 재계산을 위해 대기
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      syncSummaryHeight();
    });
  });
}
