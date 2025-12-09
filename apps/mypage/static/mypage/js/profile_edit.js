
function execDaumPostcode() {
    new daum.Postcode({
        oncomplete: function(data) {
            var addr = '';
            if (data.userSelectedType === 'R') {
                addr = data.roadAddress;
            } else {
                addr = data.jibunAddress;
            }
            document.getElementById('postcode').value = data.zonecode;
            document.getElementById('address').value = addr;
            document.getElementById('addressDetail').value = '';
            document.getElementById('addressDetail').focus();
        }
    }).open();
}

// 이메일 도메인 선택 시 입력창에 자동 채우기
document.addEventListener("DOMContentLoaded", function () {
    var select = document.getElementById("emailDomainSelect");
    var input = document.getElementById("emailDomainInput");

    select.addEventListener("change", function () {
        if (this.value === "custom") {
            input.readOnly = false;
            input.value = "";
            input.focus();
        } else {
            input.readOnly = true;
            input.value = this.value;
        }
    });

    // 초기 상태: 템플릿에서 넘어온 도메인이 select 옵션 중에 있으면 자동 선택
    var currentDomain = input.value;
    var found = false;
    for (var i = 0; i < select.options.length; i++) {
        if (select.options[i].value === currentDomain) {
            select.selectedIndex = i;
            input.readOnly = true;
            found = true;
            break;
        }
    }
    if (!found && currentDomain) {
        select.value = "custom";
        input.readOnly = false;
    }
});
