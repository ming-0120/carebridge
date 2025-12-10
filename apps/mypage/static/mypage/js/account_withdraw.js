document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("withdrawForm");
    const btnCancel = document.getElementById("btnCancel");

    // 탈퇴 버튼 클릭 시 확인 alert
    form.addEventListener("submit", function (e) {
        const ok = confirm("정말 탈퇴하시겠습니까? 탈퇴 후에는 복구가 불가능합니다.");
        if (!ok) {
            e.preventDefault();
        }
    });

    // 취소 버튼: 되돌아가기 확인
    btnCancel.addEventListener("click", function () {
        const ok = confirm("탈퇴를 취소하시겠습니까? 이전 페이지로 돌아갑니다.");
        if (ok) {
            history.back();
        }
    });
});