const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');
const messageEl = document.getElementById('message');

tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    tabButtons.forEach((b) => b.classList.remove('active'));
    tabPanels.forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`${btn.dataset.tab}-form`).classList.add('active');
    messageEl.textContent = '';
  });
});

function showMessage(text, isError = true) {
  messageEl.textContent = text;
  messageEl.style.color = isError ? '#e74c3c' : '#27ae60';
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      showMessage(data.error);
      return;
    }

    window.location.href = 'list.html';
  } catch (err) {
    showMessage('서버와 통신할 수 없습니다.');
  }
});

document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('register-username').value;
  const password = document.getElementById('register-password').value;

  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      showMessage(data.error);
      return;
    }

    showMessage('회원가입이 완료되었습니다. 로그인해 주세요.', false);
    document.querySelector('.tab-btn[data-tab="login"]').click();
  } catch (err) {
    showMessage('서버와 통신할 수 없습니다.');
  }
});

// 이미 로그인된 경우 바로 리스트 페이지로 이동
(async () => {
  const res = await fetch('/api/me');
  if (res.ok) {
    window.location.href = 'list.html';
  }
})();
