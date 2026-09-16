const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const session = require('express-session');
const supabase = require('./supabase');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'shopping-list-test-app-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }, // 1일
  })
);
app.use(express.static(path.join(__dirname, 'public')));

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: '로그인이 필요합니다.' });
  }
  next();
}

// 회원가입
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '아이디와 비밀번호를 입력하세요.' });
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPassword(password, salt);

  const { error } = await supabase
    .from('users')
    .insert({ username, password_hash: hash, password_salt: salt });

  if (error) {
    if (error.code === '23505') {
      // unique_violation
      return res.status(409).json({ error: '이미 존재하는 아이디입니다.' });
    }
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }

  res.json({ message: '회원가입이 완료되었습니다.' });
});

// 로그인
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '아이디와 비밀번호를 입력하세요.' });
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }

  if (!user) {
    return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
  }

  const hash = hashPassword(password, user.password_salt);
  if (hash !== user.password_hash) {
    return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
  }

  req.session.userId = user.id;
  req.session.username = user.username;
  res.json({ message: '로그인되었습니다.', username: user.username });
});

// 로그아웃
app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: '로그아웃되었습니다.' });
  });
});

// 현재 로그인 상태 확인
app.get('/api/me', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: '로그인이 필요합니다.' });
  }
  res.json({ username: req.session.username });
});

// 쇼핑리스트 조회
app.get('/api/items', requireLogin, async (req, res) => {
  const { data, error } = await supabase
    .from('shopping_items')
    .select('*')
    .eq('user_id', req.session.userId)
    .order('id', { ascending: false });

  if (error) {
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
  res.json(data);
});

// 쇼핑리스트 항목 추가
app.post('/api/items', requireLogin, async (req, res) => {
  const { name, quantity } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: '항목 이름을 입력하세요.' });
  }

  const { data, error } = await supabase
    .from('shopping_items')
    .insert({
      user_id: req.session.userId,
      name: name.trim(),
      quantity: quantity || 1,
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
  res.json(data);
});

// 쇼핑리스트 항목 수정 (구매 체크 / 수량 / 이름)
app.put('/api/items/:id', requireLogin, async (req, res) => {
  const { id } = req.params;
  const { checked, quantity, name } = req.body;

  const { data: item, error: findError } = await supabase
    .from('shopping_items')
    .select('*')
    .eq('id', id)
    .eq('user_id', req.session.userId)
    .maybeSingle();

  if (findError) {
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
  if (!item) {
    return res.status(404).json({ error: '항목을 찾을 수 없습니다.' });
  }

  const updates = {
    checked: checked !== undefined ? !!checked : item.checked,
    quantity: quantity !== undefined ? quantity : item.quantity,
    name: name !== undefined && name.trim() ? name.trim() : item.name,
  };

  const { data: updated, error: updateError } = await supabase
    .from('shopping_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
  res.json(updated);
});

// 쇼핑리스트 항목 삭제
app.delete('/api/items/:id', requireLogin, async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('shopping_items')
    .delete()
    .eq('id', id)
    .eq('user_id', req.session.userId)
    .select();

  if (error) {
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
  if (!data || data.length === 0) {
    return res.status(404).json({ error: '항목을 찾을 수 없습니다.' });
  }
  res.json({ message: '삭제되었습니다.' });
});

// Vercel 등 서버리스 환경에서는 이 파일을 함수 핸들러로 require하므로,
// 로컬에서 직접 실행했을 때만 포트를 열어 리스니한다.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
  });
}

module.exports = app;
