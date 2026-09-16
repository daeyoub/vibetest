const itemListEl = document.getElementById('item-list');
const emptyMessageEl = document.getElementById('empty-message');
const addFormEl = document.getElementById('add-form');
const usernameDisplayEl = document.getElementById('username-display');
const logoutBtn = document.getElementById('logout-btn');

async function checkAuth() {
  const res = await fetch('/api/me');
  if (!res.ok) {
    window.location.href = 'index.html';
    return;
  }
  const data = await res.json();
  usernameDisplayEl.textContent = `${data.username}님`;
}

function renderItem(item) {
  const li = document.createElement('li');
  li.className = 'item-row' + (item.checked ? ' checked' : '');
  li.dataset.id = item.id;

  const left = document.createElement('div');
  left.className = 'item-left';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = !!item.checked;
  checkbox.addEventListener('change', () => toggleChecked(item.id, checkbox.checked));

  const nameSpan = document.createElement('span');
  nameSpan.className = 'item-name';
  nameSpan.textContent = item.name;

  const qtySpan = document.createElement('span');
  qtySpan.className = 'item-qty';
  qtySpan.textContent = `x${item.quantity}`;

  left.appendChild(checkbox);
  left.appendChild(nameSpan);
  left.appendChild(qtySpan);

  const actions = document.createElement('div');
  actions.className = 'item-actions';

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = '🗑️';
  deleteBtn.title = '삭제';
  deleteBtn.addEventListener('click', () => deleteItem(item.id));

  actions.appendChild(deleteBtn);

  li.appendChild(left);
  li.appendChild(actions);

  return li;
}

async function loadItems() {
  const res = await fetch('/api/items');
  if (res.status === 401) {
    window.location.href = 'index.html';
    return;
  }
  const items = await res.json();

  itemListEl.innerHTML = '';
  if (items.length === 0) {
    emptyMessageEl.style.display = 'block';
  } else {
    emptyMessageEl.style.display = 'none';
    items.forEach((item) => itemListEl.appendChild(renderItem(item)));
  }
}

async function toggleChecked(id, checked) {
  await fetch(`/api/items/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ checked }),
  });
  loadItems();
}

async function deleteItem(id) {
  await fetch(`/api/items/${id}`, { method: 'DELETE' });
  loadItems();
}

addFormEl.addEventListener('submit', async (e) => {
  e.preventDefault();
  const nameInput = document.getElementById('item-name');
  const quantityInput = document.getElementById('item-quantity');

  const name = nameInput.value.trim();
  const quantity = parseInt(quantityInput.value, 10) || 1;

  if (!name) return;

  await fetch('/api/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, quantity }),
  });

  nameInput.value = '';
  quantityInput.value = 1;
  nameInput.focus();
  loadItems();
});

logoutBtn.addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = 'index.html';
});

checkAuth();
loadItems();
