    // ------------------------------------------------------------------
    // ① 백엔드에서 넘어올 원시 데이터 예시
    //    (실제에선 Django에서 context로 JSON 직렬화해서 내려주면 됨)
    // ------------------------------------------------------------------
    let rawData = [];
    // ------------------------------------------------------------------
    // ② 질병 설명 (임시 샘플 – 실제로는 감염병 정보 API/DB에서 가져오기)
    // ------------------------------------------------------------------
    const diseaseInfo = {
      "홍역": {
        definition: "홍역 바이러스에 의해 발생하는 급성 발열 발진성 질환으로 전염성이 매우 강합니다.\n예방접종(MMR)을 통해 예방이 가능합니다.",
        cause: "감염자의 호흡기 분비물에 포함된 바이러스가 호흡기를 통해 전파됩니다."
      },
      "장출혈성대장균감염증": {
        definition: "장출혈성 대장균에 의한 급성 위장관 감염증으로, 심한 복통과 혈성 설사를 유발할 수 있습니다.",
        cause: "충분히 익히지 않은 쇠고기, 비위생적인 식재료 섭취 등을 통해 감염됩니다."
      },
      "A형간염": {
        definition: "A형간염 바이러스(HAV)에 의한 급성 간염으로 발열, 피로, 황달 등의 증상이 나타납니다.",
        cause: "오염된 음식물이나 물 섭취로 전파되며, 예방접종을 통해 충분히 예방할 수 있습니다."
      }
    };

    // 질병 목록 드롭다운 채우기
function initDiseaseSelect() {        
  const select = document.getElementById("diseaseSelect");
  if (!select) return;

  const diseases = Array.from(new Set(rawData.map((d) => d.disease)));
  diseases.sort();

  diseases.forEach((d) => {
    const opt = document.createElement("option");
    opt.value = d;
    opt.textContent = d;
    select.appendChild(opt);
  });

  if (diseases.length > 0 && !select.value) {
    select.value = diseases[0];
  }
}

// ------------------------------------------------------------------
// ③ 특정 질병 + 날짜 기준으로 데이터 필터링
// ------------------------------------------------------------------
function filterData(disease, stdDate) {
  // disease / stdDate 둘 다 매칭
  const filtered = rawData.filter(
    (row) => row.disease === disease && row.stdDate === stdDate
  );

  const genderRows = filtered.filter((row) => row.statType === "GENDER");
  const ageRows = filtered.filter((row) => row.statType === "AGE");

  return { genderRows, ageRows };
}

// ------------------------------------------------------------------
// ④ 차트 인스턴스 전역 관리
// ------------------------------------------------------------------
let genderChartInstance = null;
let ageChartInstance = null;

// ------------------------------------------------------------------
// ⑤ 성별 차트 렌더링 (도넛 그래프 버전)
// ------------------------------------------------------------------
function renderGenderChart(rows, disease) {
  const ctx = document.getElementById("genderChart");
  if (!ctx) return;
  const filtered = rows.filter(r => r.groupName !== "계");
  const labels = filtered.map((r) => r.groupName);
  const data = filtered.map((r) => r.count);

  // 기존 차트 있으면 destroy
  if (genderChartInstance) {
    genderChartInstance.destroy();
  }

  genderChartInstance = new Chart(ctx, {
    type: "doughnut",               // ← bar → doughnut 로 변경
    data: {
      labels,
      datasets: [
        {
          data,
          borderWidth: 1,          
        },
      ],
    },
    options: {
      responsive: true,          // 다시 켜기
      maintainAspectRatio: false,// 부모(.chart-wrapper) 비율을 따르도록      
      plugins: {
        legend: {
          display: true,
          position: "bottom",       // 범례를 아래로
        },
        title: {
          display: false,
        },
      },
      cutout: "60%",                // 도넛 두께 (50~70% 사이에서 취향껏)
    },
  });

  const total = data.reduce((a, b) => a + b, 0);
  const summary = document.getElementById("genderSummary");
  if (summary) {
    summary.textContent = `${disease}의 성별별 발생 건수 (총 ${total}건)`;
  }
}

// ------------------------------------------------------------------
// ⑥ 연령 차트 렌더링
// ------------------------------------------------------------------
function renderAgeChart(rows, disease) {
  const ctx = document.getElementById("ageChart");
  if (!ctx) return;

  const labels = rows.map((r) => r.groupName);
  const data = rows.map((r) => r.count);

  if (ageChartInstance) {
    ageChartInstance.destroy();
  }

  ageChartInstance = new Chart(ctx, {
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
    plugins: {
      legend: { display: false },
    },
    layout: {
      padding: {
        left: 20,
        right: 20
      }
    },
    scales: {
      y: { beginAtZero: true },
      x: {}
    }
  },
  });

  const total = data.reduce((a, b) => a + b, 0);
  const summary = document.getElementById("ageSummary");
  if (summary) {
    summary.textContent = `${disease}의 연령대별 발생 건수 (총 ${total}건)`;
  }
}

// ------------------------------------------------------------------
// ⑦ 질병 설명 영역 업데이트
// ------------------------------------------------------------------
function renderDiseaseInfo(selectedValue) {
  const titleEl = document.getElementById("diseaseTitle");
  const contentEl = document.getElementById("diseaseDefinition");
  // const updatedEl = document.getElementById("ai-summary-updated"); 

  if (!titleEl || !contentEl) {
    console.warn("요약 출력용 요소를 찾을 수 없습니다.");
    return;
  }

  // 아무 것도 선택 안 된 경우 리셋
  if (!selectedValue) {
    titleEl.textContent = "AI 요약";
    contentEl.textContent = "질병을 선택하면 AI 요약이 여기에 표시됩니다.";
    return;
  }

  // DISEASE_INFO에서 해당 질병 찾기
  const disease = DISEASE_INFO.find(
    (d) => d.disease_code === selectedValue || d.disease_name === selectedValue
  );

  // 못 찾았을 때
  if (!disease) {
    titleEl.textContent = "AI 요약";
    contentEl.textContent = "해당 질병에 대한 AI 요약이 없습니다.";
    return;
  }

  // 찾았을 때
  titleEl.textContent = `${disease.disease_name} AI 요약`;

  // if (disease.ai_updated_at) {
  //   // updatedEl.textContent = `마지막 업데이트: ${disease.ai_updated_at}`;
  // } else {
  //   updatedEl.textContent = "";
  // }

  contentEl.innerHTML = marked.parse(disease.ai_summary || "");
}

// ✅ select 변경 이벤트에 연결
if (diseaseSelect) {
  diseaseSelect.addEventListener("change", (e) => {
    const selectedCode = e.target.value;  // value에 disease_code를 쓰는 게 제일 좋아
    renderDiseaseInfo(selectedCode);

    // 여기서 이미 그래프 갱신하는 코드가 있다면 같이 실행되겠지
  });

  // 페이지 첫 로딩 시 기본 선택값에 대한 요약도 한 번 갱신
  if (diseaseSelect.value) {
    renderDiseaseInfo(diseaseSelect.value);
  }
}

// ------------------------------------------------------------------
// ⑧ 필터 적용 (질병, 날짜 변경 시)
// ------------------------------------------------------------------
function applyFilter() {
  const disease = document.getElementById("diseaseSelect").value;
  const stdDate =
    document.getElementById("dateInput").value || "2024-01-01";
  console.log("applyFilter 호출!", disease, stdDate);  // ← 추가
  const { genderRows, ageRows } = filterData(disease, stdDate);

  renderGenderChart(genderRows, disease);
  renderAgeChart(ageRows, disease);
  renderDiseaseInfo(disease);
}

// ------------------------------------------------------------------
// ⑨ 초기화
// ------------------------------------------------------------------
window.addEventListener("DOMContentLoaded", () => {
  rawData = window.INFECTIOUS_DATA || [];
  console.log("최종 rawData:", rawData);

  initDiseaseSelect();

  const btn = document.getElementById("applyFilterBtn");
  if (btn) {
    btn.addEventListener("click", applyFilter);
  }

  const diseaseSelect = document.getElementById("diseaseSelect");
  if (diseaseSelect) {
    diseaseSelect.addEventListener("change", applyFilter);   // ✅ 질병 바뀔 때마다
  }

  const dateInput = document.getElementById("dateInput");
  if (dateInput) {
    dateInput.addEventListener("change", applyFilter);       // ✅ 날짜 바뀔 때마다
  }

  // 첫 화면 렌더링
  applyFilter();
});
