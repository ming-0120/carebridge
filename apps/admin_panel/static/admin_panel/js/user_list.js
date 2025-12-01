// 사용자 목록 페이지 JavaScript

function selectUser(userId) {
  const url = new URL(window.location.href);
  url.searchParams.set('user_id', userId);
  window.location.href = url.toString();
}


