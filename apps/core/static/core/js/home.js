// --------------------------------------
// 현재 위치를 받아 세션에 저장 (URL에는 추가하지 않음)
// --------------------------------------
const LOCATION_TTL_MS = 5 * 60 * 1000; // 5분

function saveUserLocation() {
  if (!navigator.geolocation) {
    console.warn("이 브라우저는 위치 정보를 지원하지 않습니다.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      sessionStorage.setItem("user_lat", lat);
      sessionStorage.setItem("user_lng", lng);
      sessionStorage.setItem("user_location_ts", Date.now().toString());

      // ★★★★★ Django 세션에도 위치 저장 요청 ★★★★★
      fetch("/api/save_location/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken"),
        },
        body: JSON.stringify({ lat: lat, lng: lng })
      })
      .then(res => res.json())
      .then(data => console.log("서버 세션 저장 완료:", data))
      .catch(err => console.error("서버 세션 저장 실패:", err));


      console.log("위치 저장 완료:", lat, lng);

      if (window.location.pathname.includes('/emergency/') || window.location.pathname.includes('/reservations/')) {
        window.location.reload();
      }
    },
    (err) => {
      console.warn("위치정보 가져오기 실패:", err.message);
    }
  );
}

window.addEventListener("DOMContentLoaded", () => {
  const storedLat = sessionStorage.getItem("user_lat");
  const storedLng = sessionStorage.getItem("user_lng");
  const ts = sessionStorage.getItem("user_location_ts");
  const now = Date.now();

  const isExpired =
    !ts || (now - Number(ts)) > LOCATION_TTL_MS;

  if (!storedLat || !storedLng || isExpired) {
    // 없거나 오래됐으면 다시 요청
    saveUserLocation();
  } else {
    console.log("캐시된 위치 사용:", storedLat, storedLng);
  }
});


// =======================
// Gemini API 설정
// =======================
// 대화 히스토리
let chatMode = null;
// =======================
// DOM 요소
// =======================
const chatbotPanel = document.getElementById("chatbotPanel");
const chatbotBtn = document.querySelector(".chatbot-btn");
const chatbotCloseBtn = document.getElementById("chatbotCloseBtn");
const chatbotForm = document.getElementById("chatbotForm");
const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatbotMessages");

// 패널 열기/닫기
if (chatbotBtn && chatbotPanel) {
  chatbotBtn.addEventListener("click", () => {
    chatbotPanel.classList.toggle("is-open");
    if (chatbotPanel.classList.contains("is-open")) {
      if (!chatMessages.hasChildNodes()) {
        initChatbot();
      }
      chatInput.focus();
    }
  });
}


if (chatbotCloseBtn) {
  chatbotCloseBtn.addEventListener("click", () => {
    chatbotPanel.classList.remove("is-open");
  });
}

if (chatInput) {
  chatInput.addEventListener("input", function () {
    this.style.height = "auto";
    this.style.height = this.scrollHeight + "px";
  });

  // Enter 로 전송 (Shift+Enter 는 줄바꿈)
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
}

// =======================
// 메시지 전송
// =======================
const API_ENDPOINT = "/api/chat/symptom/";

async function sendMessage() {
  const msg = chatInput.value.trim();
  if (!msg) return;

  appendUserMessage(msg);
  chatInput.value = "";
  chatInput.style.height = "auto";

  const botTextEl = appendBotThinking();

  try {
    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: new URLSearchParams({ text: msg }),
    });

    if (!response.ok) {
      botTextEl.innerText = `서버 오류: ${response.status}`;
      return;
    }

    const data = await response.json();

    if (data.error) {
      botTextEl.innerText = `오류: ${data.error}`;
      return;
    }

    // 설명 출력
    botTextEl.innerHTML = nl2br(escapeHtml(data.summary || ""));

    // 예약 가능하면 버튼 추가
    if (data.can_reserve && data.department) {
      const dept = data.department;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chat-reserve-btn";
      btn.textContent = `${dept.dep_name} 예약하러 가기`;

      btn.addEventListener("click", () => {
        const params = new URLSearchParams({
          dept_id: dept.dep_code,
        });
        window.location.href = `/reservations/main/?${params.toString()}`;
      });

      botTextEl.appendChild(document.createElement("br"));
      botTextEl.appendChild(document.createElement("br"));
      botTextEl.appendChild(btn);
    }

    chatMessages.scrollTop = chatMessages.scrollHeight;
  } catch (e) {
    botTextEl.innerText = `오류 발생: ${e.message}`;
    console.error(e);
  }
}

// 폼 submit 으로도 전송
if (chatbotForm) {
  chatbotForm.addEventListener("submit", (e) => {
    e.preventDefault();
    sendMessage();
  });
}

// =======================
// 말풍선 유틸
// =======================
function appendUserMessage(text) {
  const bubble = document.createElement("div");
  bubble.className = "chat-bubble user";
  bubble.innerHTML = `
    <span class="chat-step">2</span>
    <div class="chat-text">${escapeHtml(text)}</div>
  `;
  chatMessages.appendChild(bubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function appendBotThinking() {
  const bubble = document.createElement("div");
  bubble.className = "chat-bubble bot";
  bubble.innerHTML = `
    <span class="chat-step">3</span>
    <div class="chat-text">챗봇이 증상을 분석하고 있어요...</div>
  `;
  chatMessages.appendChild(bubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return bubble.querySelector(".chat-text");
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function nl2br(str) {
  return str.replace(/\n/g, "<br>");
}

function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let cookie of cookies) {
      cookie = cookie.trim();
      if (cookie.substring(0, name.length + 1) === (name + "=")) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}
