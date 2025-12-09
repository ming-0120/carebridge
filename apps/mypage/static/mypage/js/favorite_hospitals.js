function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

function calcDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
document.addEventListener("DOMContentLoaded", function () {
    const memoModal = document.getElementById("memoModal");
    const memoForm = document.getElementById("memoForm");
    const memoTextarea = document.getElementById("memoTextarea");

    // 메모 버튼 클릭 → 모달 오픈
    document.querySelectorAll(".memo-open-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
            const favId = btn.dataset.favId;
            const memo = btn.dataset.memo || "";

            // form action 을 해당 fav_id 경로로 세팅
            memoForm.action = `/mypage/${favId}/memo/`;  // URL 패턴에 맞게 수정
            memoTextarea.value = memo;

            memoModal.classList.remove("hidden");
        });
    });

    // 배경 클릭 시 모달 닫기 (선택)
    memoModal.addEventListener("click", function (e) {
        if (e.target === memoModal) {
            memoModal.classList.add("hidden");
        }
    });

     // ★ 즐겨찾기 해제 기능
    document.querySelectorAll(".favorite-star").forEach(function(star) {
        star.addEventListener("click", function () {

            const favId = star.dataset.favId;

            const confirmDelete = confirm("즐겨찾기를 해제하시겠습니까?");
            if (!confirmDelete) return;

            // 🟡 GET 방식 (redirect로 처리되는 단순 해제)
            window.location.href = `/mypage/${favId}/delete/`;
        });
    });
const userLat = parseFloat(sessionStorage.getItem("user_lat"));
    const userLng = parseFloat(sessionStorage.getItem("user_lng"));

    if (!isNaN(userLat) && !isNaN(userLng)) {
        document.querySelectorAll(".distance").forEach(function (span) {
            const hosLat = parseFloat(span.dataset.lat);
            const hosLng = parseFloat(span.dataset.lng);

            if (!isNaN(hosLat) && !isNaN(hosLng)) {
                const dist = calcDistanceKm(userLat, userLng, hosLat, hosLng);
                span.textContent = dist.toFixed(1) + "km";
            } else {
                span.textContent = "- km";
            }
        });
    }

});
