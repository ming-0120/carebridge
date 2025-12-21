document.addEventListener("DOMContentLoaded", function () {
    // =======================
    // 1. 서버에서 내려준 병원 데이터 / 지도 변수
    // =======================
    const hospitalData = JSON.parse(
        document.getElementById("hospital-data").textContent
    );
    console.log(hospitalData);

    const userLat = "";
    const userLon = "";
    let map;
    let markers = [];

    // =======================
    // 2. 모달 관련 DOM 캐싱
    // =======================
    const modal = document.getElementById("hospitalModal");
    const modalName = document.querySelector(".modal-hospital-name");
    const modalDept = document.querySelector(".modal-dept");
    const modalCity = document.querySelector(".modal-city");
    const modalPhone = document.querySelector(".modal-phone");
    const modalHours = document.querySelector(".modal-hours");
    const modalAddress = document.querySelector(".modal-address");
    const modalRating = document.querySelector(".modal-rating");
    const modalReserveBtn = document.getElementById("modalReserveBtn");
    const modalCancelBtn = document.getElementById("modalCancelBtn");
    const modalBackdrop = document.querySelector(".modal-backdrop");
    const favoriteBtn = document.querySelector("#hospitalModal .modal-favorite");

    const slotButtons = document.querySelectorAll(".time-btn");
    const hiddenSlot = document.getElementById("selectedSlotId");

    // =======================
    // 3. 공통 함수 (지도)
    // =======================
    function clearMarkers() {
        markers.forEach((m) => m.setMap(null));
        markers = [];
    }

    function updateView(dept) {
      clearMarkers();
        
      const list = hospitalData[dept] || [];
        
      // ✅ 모든 좌표를 포함할 bounds
      const bounds = new kakao.maps.LatLngBounds();
        
      list.forEach((h) => {
        const pos = new kakao.maps.LatLng(h.lat, h.lng);
    
        const marker = new kakao.maps.Marker({
          position: pos,
          map: map,
        });
    
        // ① 이 마커가 어떤 병원인지 저장
        const hospitalForModal = makeHospitalForModal(h);
        marker.hospital = hospitalForModal;
    
        // ② 마커 클릭 시 모달 오픈
        kakao.maps.event.addListener(marker, "click", function () {
          openHospitalModal(marker.hospital);
        });
    
        markers.push(marker);
    
        // ✅ bounds 확장
        bounds.extend(pos);
      });
  
      // 카드 그리기
      renderCards(list);
  
      // ✅ 모든 마커가 보이도록 자동 포커스
      if (list.length === 1) {
        // 마커 1개면 setBounds가 과확대될 수 있어 center로 처리(원하면 유지/삭제 선택)
        map.setCenter(new kakao.maps.LatLng(list[0].lat, list[0].lng));
        // 필요 시 레벨 고정: map.setLevel(4);
      } else if (list.length > 1) {
        // padding(상,우,하,좌) 여백: UI 가림 방지
        map.setBounds(bounds, 50, 50, 50, 50);
      }
    }

    function initMap() {
        const container = document.getElementById("map");
        const options = {
            center: new kakao.maps.LatLng(userLat || 37.4979, userLon || 127.0276),
            level: 4,
        };
        map = new kakao.maps.Map(container, options);

        // 1순위: 서버에서 내려준 ACTIVE_DEPT (예: "정형외과")
        // 2순위: hospitalData에 "내과"가 있으면 "내과"
        // 3순위: hospitalData의 첫 번째 키
        let defaultDept = (typeof ACTIVE_DEPT !== "undefined" && ACTIVE_DEPT)
            ? ACTIVE_DEPT
            : (hospitalData["내과"] ? "내과" : Object.keys(hospitalData)[0]);    

        if (defaultDept) {
            updateView(defaultDept);

            const btns = document.querySelectorAll(".dept-btn");
            btns.forEach((b) => {
                if (b.dataset.dept === defaultDept) {
                    b.classList.add("active");
                } else {
                    b.classList.remove("active");
                }
            });
        }
    }
    // =======================
    // 공통: 모달에 넣을 병원 데이터 만들기
    // =======================
    function makeHospitalForModal(h) {
        return {
            id: h.id,
            name: h.name,
            dept: h.dept,
            dept_code: h.dept_code,
            city: h.city,
            phone: h.tel,
            hours: h.opening,
            address: h.address,
            rating: h.rating,
            sggu: h.sggu,
            is_favorite: !!h.is_favorite,
        };
    }
    // =======================
    // 4. 카드 렌더링 + 모달 오픈
    // =======================
    function renderCards(list) {
        const container = document.getElementById("hospitalCards");
        container.innerHTML = "";
        
        list.forEach((h) => {
            const card = document.createElement("div");
            card.className = "hospital-card";
        
            // 정수 평점 처리 (없으면 0으로)
            const ratingRaw = Number(h.rating ?? 0);
            const rating = Math.max(0, Math.min(5, Math.round(ratingRaw)));
            const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
            const formatted = (h.address ?? "").split(",")[0];
            const hospitalName = (h.name ?? "").trim().replace(/\s+/g, "<br>");
            card.innerHTML = `
                <div class="hospital-name" id="${h.id}">${hospitalName}</div>
                <div class="rating">
                    <span class="stars">${stars}</span>
                </div>
                <div class="hospital-desc">
                    <div>${h.specialty ?? ""}</div>
                    <div>${formatted}</div>
                    <div>${h.opening ?? ""}</div>
                    <div>${h.tel ?? ""}</div>
                    <div>거리: ${h.distance.toFixed(2)} km</div>
                </div>
            `;
        
            // 병원 이름 클릭 시 모달 오픈
            // const nameEl = card.querySelector(".hospital-name");
            card.addEventListener("click", () => {
                const hospitalForModal = makeHospitalForModal(h);
                openHospitalModal(hospitalForModal);
            });
        
            container.appendChild(card);
        });
    }

    // =======================
    // 5. 모달 열고/닫기
    // =======================
    function openHospitalModal(hospital) {
        modalName.textContent = hospital.name || "";
        modalDept.textContent = hospital.dept || "";
        modalCity.textContent = hospital.sggu || "";
        modalPhone.textContent = hospital.phone || "";
        modalHours.innerHTML = "09:00 ~ 18:00"; // TODO: hospital.hours 사용 가능
        modalAddress.textContent = hospital.address || "";

        const rating = Number(hospital.rating || 0);
        modalRating.textContent =
            "★".repeat(rating) + "☆".repeat(5 - rating);

        // 예약하기 버튼: 병원 id로 폼 submit
        modalReserveBtn.onclick = function () {
            const form = document.getElementById("reservationForm");
            const hiddenHospital = document.getElementById("reservationHospitalId");
            hiddenHospital.value = hospital.id;

            // 선택된 과 코드
            const checkedDep = document.getElementById("reservationDepartmentId");
            const depCode = hospital.dept_code ? hospital.dept_code : null; // 예: "IM"

            // 현재 form.action 기준으로 URL 객체 생성
            const url = new URL(form.action, window.location.origin);
            // === 추가: 어떤 URL로 제출되는지 확인 ===
            if (depCode) {
                url.searchParams.set("dept_id", depCode);
            }
            
            console.log("예약하기 요청 URL =", url.toString());
            form.action = url.toString();
            form.submit();
        };

        if (favoriteBtn) {
          favoriteBtn.dataset.hospitalId = hospital.id;
                
          const isFav = !!hospital.is_favorite; // undefined여도 false로 처리
                
          favoriteBtn.classList.toggle("active", isFav);
          // 모양까지 바꾸고 싶으면 추가:
          // favoriteBtn.textContent = isFav ? "★" : "☆";
        }

        modal.classList.remove("hidden");
    }

    function closeHospitalModal() {
        modal.classList.add("hidden");
    }

    modalCancelBtn.addEventListener("click", closeHospitalModal);
    modalBackdrop.addEventListener("click", closeHospitalModal);

    // =======================
    // 6. 진료과 버튼 클릭 이벤트
    // =======================
    const deptButtons = document.querySelectorAll(".dept-btn");
    deptButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            deptButtons.forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            const dept = btn.dataset.dept;
            updateView(dept);
        });
    });

    // =======================
    // 7. 카카오 지도 로드
    // =======================
    kakao.maps.load(initMap);

    // =======================
    // 8. CSRF / 즐겨찾기 토글
    // =======================
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== "") {
            const cookies = document.cookie.split(";");
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (
                    cookie.substring(0, name.length + 1) ===
                    name + "="
                ) {
                    cookieValue = decodeURIComponent(
                        cookie.substring(name.length + 1)
                    );
                    break;
                }
            }
        }
        return cookieValue;
    }
    const csrftoken = getCookie("csrftoken");

    if (favoriteBtn) {
        favoriteBtn.addEventListener("click", () => {
            const hospitalId = favoriteBtn.dataset.hospitalId;
            if (!hospitalId) return;

            fetch(TOGGLE_FAVORITE_URL, {
    method: "POST",
    headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "X-CSRFToken": csrftoken,
    },
    body: new URLSearchParams({
        hospital_id: hospitalId,
    }),
})
    .then((res) => {
        if (!res.ok) {
            console.error("favorite toggle http error", res.status);
            // 500 에러일 때 HTML 내용을 콘솔에 찍어보기
            return res.text().then((t) => {
                console.log("response body:", t);
                return null;
            });
        }
        return res.json();
    })
    .then((data) => {
      if (!data || !data.ok) return;
        
      const isFav = !!data.is_favorite;
        
      // ✅ 모달 버튼 UI 반영
      favoriteBtn.classList.toggle("active", isFav);
        
      // ✅ (선택) hospitalData에 상태 저장: 다음에 모달 열 때도 맞게 보이게
      const hospitalId = favoriteBtn.dataset.hospitalId;
        
      Object.keys(hospitalData).forEach((dept) => {
        const list = hospitalData[dept] || [];
        list.forEach((h) => {
          if (String(h.id) === String(hospitalId)) {
            h.is_favorite = isFav;
          }
        });
      });
    })
    .catch((err) => {
        console.error("favorite toggle error", err);
    });
        });
    }
});
