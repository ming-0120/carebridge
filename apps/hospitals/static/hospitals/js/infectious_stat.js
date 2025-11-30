    // ------------------------------------------------------------------
    // ① 백엔드에서 넘어올 원시 데이터 예시
    //    (실제에선 Django에서 context로 JSON 직렬화해서 내려주면 됨)
    // ------------------------------------------------------------------
    const rawData = [
      // ===== GENDER 예시 (홍역) =====
      { disease: "홍역", stdDate: "2024-01-01", statType: "GENDER", groupCode: "계",   groupName: "계", count: 49 },
      { disease: "홍역", stdDate: "2024-01-01", statType: "GENDER", groupCode: "남",   groupName: "남", count: 35 },
      { disease: "홍역", stdDate: "2024-01-01", statType: "GENDER", groupCode: "여",   groupName: "여", count: 14 },

      // ===== AGE 예시 (홍역 – 실제 DB에는 0세~95세까지 행이 있음) =====
      // 여기서는 샘플로 4개만 넣어둠
      { disease: "홍역", stdDate: "2024-01-01", statType: "AGE", groupCode: "0-9",   groupName: "0-9세",   count: 5 },
      { disease: "홍역", stdDate: "2024-01-01", statType: "AGE", groupCode: "10-19", groupName: "10-19세", count: 12 },
      { disease: "홍역", stdDate: "2024-01-01", statType: "AGE", groupCode: "20-39", groupName: "20-39세", count: 20 },
      { disease: "홍역", stdDate: "2024-01-01", statType: "AGE", groupCode: "40+",  groupName: "40세 이상", count: 12 },

      // ===== 다른 질병 샘플 (장출혈성대장균감염증) =====
      { disease: "장출혈성대장균감염증", stdDate: "2024-01-01", statType: "GENDER", groupCode: "계", groupName: "계", count: 274 },
      { disease: "장출혈성대장균감염증", stdDate: "2024-01-01", statType: "GENDER", groupCode: "남", groupName: "남", count: 128 },
      { disease: "장출혈성대장균감염증", stdDate: "2024-01-01", statType: "GENDER", groupCode: "여", groupName: "여", count: 146 },

      { disease: "장출혈성대장균감염증", stdDate: "2024-01-01", statType: "AGE", groupCode: "0-9",   groupName: "0-9세", count: 30 },
      { disease: "장출혈성대장균감염증", stdDate: "2024-01-01", statType: "AGE", groupCode: "10-19", groupName: "10-19세", count: 60 },
      { disease: "장출혈성대장균감염증", stdDate: "2024-01-01", statType: "AGE", groupCode: "20-39", groupName: "20-39세", count: 120 },
      { disease: "장출혈성대장균감염증", stdDate: "2024-01-01", statType: "AGE", groupCode: "40+",  groupName: "40세 이상", count: 64 },

      // ===== 또 다른 질병 샘플 (A형간염) =====
      { disease: "A형간염", stdDate: "2024-01-01", statType: "GENDER", groupCode: "계", groupName: "계", count: 0 },
      { disease: "A형간염", stdDate: "2024-01-01", statType: "GENDER", groupCode: "남", groupName: "남", count: 631 },
      { disease: "A형간염", stdDate: "2024-01-01", statType: "GENDER", groupCode: "여", groupName: "여", count: 537 },

      { disease: "A형간염", stdDate: "2024-01-01", statType: "AGE", groupCode: "0-9",   groupName: "0-9세", count: 50 },
      { disease: "A형간염", stdDate: "2024-01-01", statType: "AGE", groupCode: "10-19", groupName: "10-19세", count: 200 },
      { disease: "A형간염", stdDate: "2024-01-01", statType: "AGE", groupCode: "20-39", groupName: "20-39세", count: 600 },
      { disease: "A형간염", stdDate: "2024-01-01", statType: "AGE", groupCode: "40+",  groupName: "40세 이상", count: 318 },
    ];

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
      const diseases = Array.from(new Set(rawData.map(d => d.disease)));
      diseases.sort();

      diseases.forEach(d => {
        const opt = document.createElement("option");
        opt.value = d;
        opt.textContent = d;
        select.appendChild(opt);
      });

      // 기본 선택 – 첫 번째 질병
      if (diseases.length > 0) {
        select.value = diseases[0];
      }
    }

    // 특정 질병 + 날짜 기준으로 데이터 필터링
    function filterData(disease, stdDate) {
      const filtered = rawData.filter(
        row => row.disease === disease && row.stdDate === stdDate
      );

      const genderRows = filtered.filter(row => row.statType === "GENDER");
      const ageRows = filtered.filter(row => row.statType === "AGE");

      return { genderRows, ageRows };
    }

    // 차트 인스턴스 전역 관리
    let genderChartInstance = null;
    let ageChartInstance = null;

    function renderGenderChart(rows, disease) {
      const ctx = document.getElementById("genderChart");

      const labels = rows.map(r => r.groupName);
      const data = rows.map(r => r.count);

      // 기존 차트 있으면 destroy
      if (genderChartInstance) {
        genderChartInstance.destroy();
      }

      genderChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: "건수",
              data,
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
            title: {
              display: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { stepSize: 50 }
            }
          }
        }
      });

      const total = data.reduce((a, b) => a + b, 0);
      const summary = document.getElementById("genderSummary");
      summary.textContent = `${disease}의 성별별 발생 건수 (총 ${total}건)`;
    }

    function renderAgeChart(rows, disease) {
      const ctx = document.getElementById("ageChart");

      const labels = rows.map(r => r.groupName);
      const data = rows.map(r => r.count);

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
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
            title: { display: false }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { stepSize: 50 }
            }
          }
        }
      });

      const total = data.reduce((a, b) => a + b, 0);
      const summary = document.getElementById("ageSummary");
      summary.textContent = `${disease}의 연령대별 발생 건수 (총 ${total}건)`;
    }

    // 질병 설명 영역 업데이트
    function renderDiseaseInfo(disease) {
      const titleEl = document.getElementById("diseaseTitle");
      const defEl = document.getElementById("diseaseDefinition");
      const causeEl = document.getElementById("diseaseCause");

      titleEl.textContent = disease;

      const info = diseaseInfo[disease];
      if (info) {
        defEl.textContent = info.definition;
        causeEl.textContent = info.cause;
      } else {
        defEl.textContent = "해당 질병에 대한 설명 정보가 아직 등록되지 않았습니다.";
        causeEl.textContent = "관리자 페이지에서 질병 설명을 입력하거나, 외부 감염병 API와 연동하여 자동으로 불러올 수 있습니다.";
      }
    }

    // 필터 적용 (질병, 날짜 변경 시)
    function applyFilter() {
      const disease = document.getElementById("diseaseSelect").value;
      const stdDate = document.getElementById("dateInput").value || "2024-01-01";

      const { genderRows, ageRows } = filterData(disease, stdDate);

      renderGenderChart(genderRows, disease);
      renderAgeChart(ageRows, disease);
      renderDiseaseInfo(disease);
    }

    // 초기화
    window.addEventListener("DOMContentLoaded", () => {
      initDiseaseSelect();
      document.getElementById("applyFilterBtn").addEventListener("click", applyFilter);

      // 첫 화면 렌더링
      applyFilter();
    });