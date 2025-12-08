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

        // 마커 찍기
        list.forEach((h) => {
            const pos = new kakao.maps.LatLng(h.lat, h.lng);
            const marker = new kakao.maps.Marker({
                position: pos,
                map: map,
            });
            markers.push(marker);
        });

        // 카드 그리기
        renderCards(list);

        // 첫 번째 병원으로 지도 중심 이동
        if (list.length > 0) {
            const first = list[0];
            const center = new kakao.maps.LatLng(first.lat, first.lng);
            map.setCenter(center);
        }
    }

    function initMap() {
        const container = document.getElementById("map");
        const options = {
            center: new kakao.maps.LatLng(userLat, userLon),
            level: 4,
        };
        map = new kakao.maps.Map(container, options);

        // 기본 진료과: 내과 (없으면 첫 번째 키)
        const defaultDept = hospitalData["내과"]
            ? "내과"
            : Object.keys(hospitalData)[0];

        if (defaultDept) {
            updateView(defaultDept);
            // 사이드바 버튼 active 도 같이 맞추기
            const btns = document.querySelectorAll(".dept-btn");
            btns.forEach((b) => {
                if (b.dataset.dept === defaultDept) b.classList.add("active");
            });
        }
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

            card.innerHTML = `
                <div class="hospital-name" id="${h.id}">${h.name}</div>
                <div class="rating">
                    <span class="stars">${stars}</span>
                </div>
                <div class="hospital-desc">
                    <div>${h.specialty ?? ""}</div>
                    <div>${h.address ?? ""}</div>
                    <div>${h.opening ?? ""}</div>
                    <div>${h.tel ?? ""}</div>
                    <div>거리: ${h.distance.toFixed(2)} km</div>
                </div>
            `;

            // 병원 이름 클릭 시 모달 오픈
            const nameEl = card.querySelector(".hospital-name");
            nameEl.addEventListener("click", () => {
                const hospitalForModal = {
                    id: h.id,
                    name: h.name,
                    dept: h.dept,
                    city: h.city,
                    phone: h.tel,
                    hours: h.opening,
                    address: h.address,
                    rating: h.rating,
                    sggu: h.sggu,
                };

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
            const hiddenInput = document.getElementById(
                "reservationHospitalId"
            );

            hiddenInput.value = hospital.id;
            form.submit();
        };

        // 즐겨찾기용 병원 id 바인딩
        if (favoriteBtn) {
            favoriteBtn.dataset.hospitalId = hospital.id;
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

            fetch("/reservations/favorite/toggle/", {
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
        if (data.is_favorite) {
            favoriteBtn.classList.add("active");
        } else {
            favoriteBtn.classList.remove("active");
        }
    })
    .catch((err) => {
        console.error("favorite toggle error", err);
    });
        });
    }
});
