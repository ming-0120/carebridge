
document.getElementById("check-username-btn").addEventListener("click", function () {
    const usernameInput = document.getElementById("id_username");
    const username = usernameInput.value.trim();
    const msgEl = document.getElementById("username-msg");

    if (username.length === 0) {
        msgEl.textContent = "아이디를 입력해주세요.";
        msgEl.style.color = "red";
        return;
    }

    fetch(`/accounts/check-username/?username=${encodeURIComponent(username)}`)
        .then(res => res.json())
        .then(data => {
            if (data.exists) {
                msgEl.textContent = "이미 사용 중인 아이디입니다.";
                msgEl.style.color = "red";
            } else {
                msgEl.textContent = "사용 가능한 아이디입니다.";
                msgEl.style.color = "green";
            }
        })
        .catch(() => {
            msgEl.textContent = "중복 확인 중 오류가 발생했습니다.";
            msgEl.style.color = "red";
        });
});

// 전화번호 자동 하이픈
const phoneInput = document.getElementById('id_phone');

if (phoneInput) {
  phoneInput.addEventListener('input', function (e) {
    let value = e.target.value.replace(/[^0-9]/g, '');
    if (value.length > 3 && value.length <= 7) {
      value = value.replace(/(\d{3})(\d+)/, '$1-$2');
    } else if (value.length > 7) {
      value = value.replace(/(\d{3})(\d{4})(\d+)/, '$1-$2-$3');
    }
    e.target.value = value;
  });
}

// 주민등록번호 앞/뒤
const rrnFrontInput = document.getElementById('rrn_front');
const rrnBackInput  = document.getElementById('rrn_back');
const residentRegHidden = document.getElementById('resident_reg_no');

let rrnBackReal = '';

// 주민등록번호 뒷자리 * 마스킹
if (rrnBackInput) {
  rrnBackInput.addEventListener('keydown', function (e) {
    const ctrlKeys = ['Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];

    if (ctrlKeys.includes(e.key)) {
      return;
    }

    // 백스페이스
    if (e.key === 'Backspace') {
      rrnBackReal = rrnBackReal.slice(0, -1);
      setTimeout(() => {
        rrnBackInput.value = '*'.repeat(rrnBackReal.length);
      }, 0);
      e.preventDefault();
      return;
    }

    // 숫자 아닌 것, 길이 7 초과 막기
    if (!/^[0-9]$/.test(e.key) || rrnBackReal.length >= 7) {
      if (e.key.length === 1) {
        e.preventDefault();
      }
      return;
    }

    // 정상 숫자 입력
    rrnBackReal += e.key;
    setTimeout(() => {
      rrnBackInput.value = '*'.repeat(rrnBackReal.length);
    }, 0);
    e.preventDefault();
  });

  rrnBackInput.addEventListener('paste', function (e) {
    e.preventDefault();
  });
}
// ===== 이메일 도메인 텍스트박스 제어 =====
const domainSelect = document.getElementById("email_domain_select");
const domainText   = document.getElementById("email_domain_text");

domainSelect.addEventListener("change", function () {
    const value = this.value;

    if (value === "") {
        domainText.value = "";
        domainText.readOnly = false;
        domainText.placeholder = "도메인 입력";
    }
    else if (value === "custom") {
        domainText.value = "";
        domainText.readOnly = false;
        domainText.placeholder = "도메인 직접 입력";
        domainText.focus();
    }
    else {
        domainText.value = value;
        domainText.readOnly = true;
    }
});

document.getElementById("registerForm").addEventListener("submit", function (e) {
    const local = document.getElementById("email_local").value.trim();
    const domain = domainText.value.trim();
    const finalEmailInput = document.getElementById("email");

    if (!local || !domain) {
        alert("올바른 이메일을 입력해주세요.");
        e.preventDefault();
        return;
    }
    finalEmailInput.value = `${local}@${domain}`;
});

const pwRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,16}$/;

const form = document.getElementById('registerForm');
const pw1  = document.getElementById('id_password1');
const pw2  = document.getElementById('id_password2');

const pwRuleMsg     = document.getElementById('pw-rule-msg');
const pwDefaultMsg     = document.getElementById('pw-help-msg');
const pwMismatchMsg = document.getElementById('pw-mismatch-msg');

// ① 비밀번호 규격 체크
function checkPwRule() {
  if (!pw1 || !pwRuleMsg) return true;

  if (!pw1.value) {
    pwRuleMsg.style.display = 'none';
    pwDefaultMsg.style.display = 'block';
    pw1.classList.remove('input-error');
    return true;
  }

  if (!pwRegex.test(pw1.value)) {
    pwRuleMsg.style.display = 'block';
    pwDefaultMsg.style.display = 'none';
    pw1.classList.add('input-error');
    pw1.classList.add('input-error');
    return false;
  } else {
    pwRuleMsg.style.display = 'none';
    pwDefaultMsg.style.display = 'none';
    pw1.classList.remove('input-error');
    return true;
  }
}

// ② 비밀번호 일치 체크
function checkPwMatch() {
  if (!pw1 || !pw2 || !pwMismatchMsg) return true;

  // 규격이 안 맞으면 일치 체크는 하지 않음
  if (!checkPwRule()) {
    pwMismatchMsg.style.display = 'none';
    pw2.classList.remove('input-error');
    return false;
  }

  if (pw1.value && pw2.value && pw1.value !== pw2.value) {
    pwMismatchMsg.style.display = 'block';
    pw2.classList.add('input-error');
    return false;
  } else {
    pwMismatchMsg.style.display = 'none';
    pw2.classList.remove('input-error');
    return true;
  }
}

// 실시간/포커스 아웃 이벤트
if (pw1 && pw2) {
  pw1.addEventListener('input', checkPwRule);
  pw1.addEventListener('blur', checkPwRule);

  pw2.addEventListener('input', checkPwMatch);
  pw2.addEventListener('blur', checkPwMatch);
}
const termsAll = document.getElementById("terms_all");
const termItems = document.querySelectorAll(".terms-list input[type='checkbox']");

// 전체 동의 클릭 시 → 모든 체크박스 변경
termsAll.addEventListener("change", function () {
    termItems.forEach(chk => {
        chk.checked = termsAll.checked;
    });
});

// 개별 체크박스 변경 시 → 전체 동의 상태 업데이트
termItems.forEach(chk => {
    chk.addEventListener("change", function () {
        const allChecked = Array.from(termItems).every(item => item.checked);
        termsAll.checked = allChecked;
    });
});
// === submit 이벤트는 한 번만 등록 ===
if (form) {
  form.addEventListener('submit', function (e) {
    // 1) 비밀번호 규칙 + 일치 검사
    const validRule  = checkPwRule();
    const validMatch = checkPwMatch();

    if (!validRule) {
      alert('비밀번호 규격이 올바르지 않습니다.');
      pw1 && pw1.focus();
      e.preventDefault();
      return;
    }

    if (!validMatch) {
      alert('비밀번호가 서로 일치하지 않습니다.');
      pw2 && pw2.focus();
      e.preventDefault();
      return;
    }

    // 2) 주민등록번호 합치기
    const front = rrnFrontInput ? rrnFrontInput.value.replace(/[^0-9]/g, '') : '';

    if (!front || front.length !== 6 || rrnBackReal.length !== 7) {
      alert('주민등록번호를 정확히 입력해주세요.');
      e.preventDefault();
      return;
    }

    if (residentRegHidden) {
      residentRegHidden.value = front + '-' + rrnBackReal;
    }
  });
}
const licenseInput = document.getElementById("id_license_number");
const licenseRegex = /^[A-Za-z]{2}\$[0-9]{7}$/;

licenseInput.addEventListener("input", function () {
    const value = licenseInput.value.trim();

    if (!licenseRegex.test(value)) {
        licenseInput.classList.add('input-error');
        document.getElementById("license_help").style.display = 'block';
    } else {
        licenseInput.classList.remove('input-error');
        document.getElementById("license_help").style.display = 'none';
    }
});

const fileInput   = document.getElementById('id_profile_image');
const previewImg  = document.getElementById('profilePreview');
const resetButton = document.getElementById('resetProfileImage');

if (fileInput && previewImg) {
  // 1) 파일 선택 시 미리보기
  fileInput.addEventListener('change', function () {
    const file = fileInput.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    previewImg.src = url;
  });
}

if (resetButton && fileInput && previewImg) {
  // 2) 기본 이미지로 되돌리기
  resetButton.addEventListener('click', function () {
    const defaultSrc = previewImg.dataset.defaultSrc || previewImg.getAttribute('data-default-src');

    // 미리보기 이미지 원상복구
    if (defaultSrc) {
      previewImg.src = defaultSrc;
    }

    // 파일 인풋 비우기 (업로드 취소)
    fileInput.value = '';
  });
}
// ===== 병원 검색 모달 =====
const hospitalAddrInput   = document.getElementById("id_hospital_addr");
const hospitalSearchBtn   = document.getElementById("hospital-search-btn");
const hospitalModal       = document.getElementById("hospital-modal");
const hospitalModalClose  = document.getElementById("hospital-modal-close");
const hospitalSearchInput = document.getElementById("hospital-search-input");
const hospitalResultsBody = document.getElementById("hospital-results-body");
const hospitalIdHidden    = document.getElementById("hospital_id");

function openHospitalModal() {
  if (!hospitalModal) return;
  hospitalModal.classList.remove("hidden");
  if (hospitalSearchInput) {
    hospitalSearchInput.value = "";
    hospitalResultsBody.innerHTML = "";
    hospitalSearchInput.focus();
  }
}

function closeHospitalModal() {
  if (!hospitalModal) return;
  hospitalModal.classList.add("hidden");
}

// 인풋 클릭하거나 버튼 클릭 시 모달 열기
if (hospitalAddrInput) {
  hospitalAddrInput.addEventListener("click", openHospitalModal);
}
if (hospitalSearchBtn) {
  hospitalSearchBtn.addEventListener("click", openHospitalModal);
}

// 닫기 버튼
if (hospitalModalClose) {
  hospitalModalClose.addEventListener("click", closeHospitalModal);
}
// 배경 클릭 시 닫기
if (hospitalModal) {
  hospitalModal.addEventListener("click", function (e) {
    if (e.target === hospitalModal) {
      closeHospitalModal();
    }
  });
}

// 디바운스 유틸
function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// 검색 요청
async function fetchHospitals(q) {
  if (!q || q.trim().length === 0) {
    hospitalResultsBody.innerHTML = "";
    return;
  }

  try {
    const resp = await fetch(`${HOSPITAL_SEARCH_URL}?q=${encodeURIComponent(q)}`, {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });
    if (!resp.ok) return;
    const data = await resp.json();

    hospitalResultsBody.innerHTML = "";

    if (!data.results || data.results.length === 0) {
      hospitalResultsBody.innerHTML =
        `<tr><td colspan="2" style="text-align:center;">검색 결과가 없습니다.</td></tr>`;
      return;
    }

    data.results.forEach((h) => {
      const tr = document.createElement("tr");
      tr.classList.add("hospital-row");
      tr.dataset.id = h.id;
      tr.dataset.name = h.name;
      tr.dataset.address = h.address;

      tr.innerHTML = `
        <td>${h.name}</td>
        <td>${h.address}</td>
      `;
      hospitalResultsBody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
  }
}

const debouncedFetchHospitals = debounce(function () {
  fetchHospitals(hospitalSearchInput.value);
}, 300);

// 입력 시 실시간 검색
if (hospitalSearchInput) {
  hospitalSearchInput.addEventListener("input", debouncedFetchHospitals);
}

// 결과 클릭 시 선택
if (hospitalResultsBody) {
  hospitalResultsBody.addEventListener("click", function (e) {
    const tr = e.target.closest("tr.hospital-row");
    if (!tr) return;

    const id      = tr.dataset.id;
    const name    = tr.dataset.name;
    const address = tr.dataset.address;

    // 화면에는 병원명 + 주소나, 원하는 포맷으로 표기
    if (hospitalAddrInput) {
      hospitalAddrInput.value = `${name}`;
    }
    if (hospitalIdHidden) {
      hospitalIdHidden.value = id;
    }

    closeHospitalModal();
  });
}
