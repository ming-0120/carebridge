// 7일 이용자 그래프 초기화
document.addEventListener('DOMContentLoaded', function() {
  // 템플릿에서 전달된 데이터 가져오기
  const visitorDataElement = document.getElementById('visitor-chart-data');
  
  if (visitorDataElement) {
    const visitorData = JSON.parse(visitorDataElement.textContent);
    const ctx = document.getElementById('visitorChart');
    
    if (ctx) {
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: visitorData.labels,
          datasets: [{
            label: '일일 방문자 수',
            data: visitorData.values,
            backgroundColor: 'rgba(0, 102, 204, 0.7)',
            borderColor: 'rgba(0, 102, 204, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 50
              }
            }
          }
        }
      });
    }
  }
});



