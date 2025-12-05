/**
 * 관리자 대시보드 - 7일 이용자 그래프 초기화
 * 
 * Chart.js를 사용하여 최근 7일간의 일일 방문자 수를 막대 그래프로 표시
 * 템플릿에서 전달된 JSON 데이터를 파싱하여 차트 생성
 */
document.addEventListener('DOMContentLoaded', function() {
  // 템플릿에서 전달된 데이터 가져오기 (JSON 형식)
  const visitorDataElement = document.getElementById('visitor-chart-data');
  
  if (visitorDataElement) {
    // JSON 문자열을 객체로 파싱
    const visitorData = JSON.parse(visitorDataElement.textContent);
    const ctx = document.getElementById('visitorChart');
    
    if (ctx) {
      // Chart.js를 사용하여 막대 그래프 생성
      new Chart(ctx, {
        type: 'bar',  // 막대 그래프 타입
        data: {
          labels: visitorData.labels,  // X축 레이블 (날짜)
          datasets: [{
            label: '일일 방문자 수',
            data: visitorData.values,  // Y축 데이터 (방문자 수)
            backgroundColor: 'rgba(0, 102, 204, 0.7)',  // 막대 배경색
            borderColor: 'rgba(0, 102, 204, 1)',  // 막대 테두리 색
            borderWidth: 1  // 테두리 두께
          }]
        },
        options: {
          responsive: true,  // 반응형 차트
          maintainAspectRatio: false,  // 비율 유지하지 않음 (컨테이너 크기에 맞춤)
          plugins: {
            legend: {
              display: false  // 범례 숨김
            }
          },
          scales: {
            y: {
              beginAtZero: true,  // Y축 0부터 시작
              ticks: {
                stepSize: 50  // Y축 눈금 간격 (50 단위)
              }
            }
          }
        }
      });
    }
  }
});









