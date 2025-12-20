function execDaumPostcode() {
  new daum.Postcode({
    oncomplete: function (data) {
      var addr = "";
      if (data.userSelectedType === "R") {
        addr = data.roadAddress;
      } else {
        addr = data.jibunAddress;
      }
      document.getElementById("postcode").value = data.zonecode;
      document.getElementById("address").value = addr;
      document.getElementById("addressDetail").value = "";
      document.getElementById("addressDetail").focus();
    },
  }).open();
}
const phoneInput = document.getElementById('prof_phone');

if (phoneInput) {
  phoneInput.addEventListener('input', function (e) {
    // 숫자만 추출
    let value = e.target.value.replace(/[^0-9]/g, '');

    // ✅ 최대 11자리로 제한
    if (value.length > 11) {
      value = value.slice(0, 11);
    }

    // 하이픈 처리
    if (value.length > 3 && value.length <= 7) {
      value = value.replace(/(\d{3})(\d+)/, '$1-$2');
    } else if (value.length > 7) {
      value = value.replace(/(\d{3})(\d{4})(\d+)/, '$1-$2-$3');
    }

    e.target.value = value;
  });
}
document.addEventListener("DOMContentLoaded", () => {
  const fileInput    = document.getElementById("profileImageInput"); // ✅ 이 화면의 실제 id
  const previewImg   = document.getElementById("profilePreview");
  const resetButton  = document.getElementById("resetProfileImage");
  const terms_link_a = document.getElementById("terms_link_a");
  const terms_link_b = document.getElementById("terms_link_b");

  if (fileInput && previewImg) {
    // 1) 파일 선택 시 미리보기
    fileInput.addEventListener("change", function () {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;

      // 이미지 파일만 허용
      if (!file.type || !file.type.startsWith("image/")) {
        console.error("이미지 파일이 아닙니다.");
        fileInput.value = "";
        return;
      }

      // 이전 objectURL 해제(메모리 누수 방지)
      if (previewImg.dataset.objectUrl) {
        URL.revokeObjectURL(previewImg.dataset.objectUrl);
        delete previewImg.dataset.objectUrl;
      }

      const url = URL.createObjectURL(file);
      previewImg.src = url;
      previewImg.dataset.objectUrl = url;
    });
  }

  if (resetButton && fileInput && previewImg) {
    // 2) 기본 이미지로 되돌리기
    resetButton.addEventListener("click", function () {
      const defaultSrc =
        previewImg.dataset.defaultSrc || previewImg.getAttribute("data-default-src");

      // objectURL 해제
      if (previewImg.dataset.objectUrl) {
        URL.revokeObjectURL(previewImg.dataset.objectUrl);
        delete previewImg.dataset.objectUrl;
      }

      // 미리보기 이미지 원상복구
      if (defaultSrc) {
        previewImg.src = defaultSrc;
      }

      // 파일 인풋 비우기 (업로드 취소)
      fileInput.value = "";
    });
  }

  // terms_link_a/b는 이 페이지에 없으면 null이므로 여기서 따로 처리하지 않음
});
