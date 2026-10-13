'use strict';
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const multer = require('multer');
const Database = require('better-sqlite3');
const compression = require('compression');
const seo = require('./seo');

// .env faylidagi sozlamalarni o'qish (Node 20.12+); tizimda berilgan qiymatlar ustun turadi
try { if (typeof process.loadEnvFile === 'function') process.loadEnvFile(path.join(__dirname, '.env')); } catch (e) { if (e.code !== 'ENOENT') throw e; }

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const TICKET_SIZE = 20;
const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'data', 'rulda.db');

if (!ADMIN_PASSWORD) console.warn('[ogohlantirish] ADMIN_PASSWORD o\'rnatilmagan — admin panel yopiq.');
else if (ADMIN_PASSWORD.length < 12) console.warn('[ogohlantirish] ADMIN_PASSWORD juda qisqa — kamida 12 ta belgi ishlating.');

/* ---------- Ma'lumotlar bazasi ---------- */
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
fs.mkdirSync(path.join(__dirname, 'public', 'uploads'), { recursive: true });
const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');
db.exec(`
CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic TEXT NOT NULL,
  question TEXT NOT NULL,
  options TEXT NOT NULL,
  correct INTEGER NOT NULL,
  explanation TEXT DEFAULT '',
  image TEXT DEFAULT '',
  verified INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_q_topic ON questions(topic);
CREATE TABLE IF NOT EXISTS devices (id TEXT PRIMARY KEY, premium_until INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT, device_id TEXT NOT NULL, plan TEXT NOT NULL, amount INTEGER NOT NULL,
  provider TEXT NOT NULL, status TEXT DEFAULT 'pending', ext_id TEXT, pay_state INTEGER DEFAULT 0,
  create_time INTEGER, perform_time INTEGER, cancel_time INTEGER, reason INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_orders_ext ON orders(ext_id);
CREATE TABLE IF NOT EXISTS instructors (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, gender TEXT NOT NULL, experience INTEGER DEFAULT 0,
  car TEXT DEFAULT '', transmission TEXT DEFAULT 'mexanika', phone TEXT NOT NULL, telegram TEXT DEFAULT '',
  schedule TEXT DEFAULT '', price INTEGER DEFAULT 0, city TEXT DEFAULT '', photo TEXT DEFAULT '', active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS ai_log (device_id TEXT, day TEXT, n INTEGER DEFAULT 0, PRIMARY KEY(device_id, day));
CREATE TABLE IF NOT EXISTS exam_log (device_id TEXT, day TEXT, n INTEGER DEFAULT 0, PRIMARY KEY(device_id, day));
`);

const TOPICS = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'topics.json'), 'utf8'));
const TOPIC_IDS = new Set(TOPICS.map(t => t.id));
const GUIDE = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'guide.json'), 'utf8'));

function validQuestion(q) {
  if (!q || typeof q !== 'object') return 'Savol obyekt bo\'lishi kerak';
  if (!TOPIC_IDS.has(q.topic)) return `Noma'lum mavzu: ${q.topic}`;
  if (typeof q.question !== 'string' || q.question.trim().length < 5) return 'Savol matni juda qisqa';
  if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 6) return 'Javoblar soni 2 dan 6 gacha bo\'lishi kerak';
  if (q.options.some(o => typeof o !== 'string' || !o.trim())) return 'Bo\'sh javob variantlari bor';
  if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct >= q.options.length) return 'To\'g\'ri javob raqami noto\'g\'ri';
  return null;
}

const insertQ = db.prepare(`INSERT INTO questions (topic, question, options, correct, explanation, image, verified)
  VALUES (@topic, @question, @options, @correct, @explanation, @image, @verified)`);
const insertMany = db.transaction(list => {
  for (const q of list) insertQ.run({
    topic: q.topic, question: q.question.trim(), options: JSON.stringify(q.options.map(s => s.trim())),
    correct: q.correct, explanation: (q.explanation || '').trim(), image: q.image || '', verified: q.verified ? 1 : 0
  });
});

// Birinchi ishga tushishda boshlang'ich savollarni yuklash
if (db.prepare('SELECT COUNT(*) c FROM questions').get().c === 0) {
  const dir = path.join(__dirname, 'data', 'questions');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort() : [];
  let n = 0;
  for (const f of files) {
    const list = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const bad = list.map(validQuestion).findIndex(Boolean);
    if (bad >= 0) { console.error(`${f}: ${bad + 1}-savolda xato: ${validQuestion(list[bad])}`); continue; }
    insertMany(list); n += list.length;
  }
  console.log(`Bazaga ${n} ta boshlang'ich savol yuklandi.`);
}

if (db.prepare('SELECT COUNT(*) c FROM instructors').get().c === 0) {
  db.prepare(`INSERT INTO instructors (name, gender, experience, car, transmission, phone, telegram, schedule, price, city)
    VALUES ('Namuna instruktor', 'erkak', 5, 'Chevrolet Cobalt', 'mexanika', '974093040', '', 'Du–Sha, 08:00–18:00', 200000, 'Toshkent')`).run();
}
function validInstructor(b) {
  if (!b || typeof b.name !== 'string' || b.name.trim().length < 2) return 'Ism kiritilmagan';
  if (!['erkak', 'ayol'].includes(b.gender)) return 'Jinsini tanlang';
  const ph = String(b.phone || '').replace(/\D/g, '');
  if (ph.length < 9 || ph.length > 12) return 'Telefon raqami noto\'g\'ri';
  if (b.transmission && !['mexanika', 'avtomat'].includes(b.transmission)) return 'Uzatmalar qutisi noto\'g\'ri';
  return null;
}
const instrRow = b => ({
  name: b.name.trim(), gender: b.gender, experience: Math.max(0, parseInt(b.experience, 10) || 0), car: String(b.car || '').trim(),
  transmission: b.transmission || 'mexanika', phone: String(b.phone).replace(/\D/g, '').slice(-9), telegram: String(b.telegram || '').replace(/^@|https?:\/\/t\.me\//g, '').replace(/[^a-zA-Z0-9_]/g, ''),
  schedule: String(b.schedule || '').trim(), price: Math.max(0, parseInt(b.price, 10) || 0), city: String(b.city || '').trim(),
  photo: /^(\/uploads\/|https:\/\/)/.test(b.photo || '') ? b.photo : '', active: b.active === false ? 0 : 1
});

const rowToQ = (r, withMeta = false) => {
  const q = { id: r.id, topic: r.topic, question: r.question, options: JSON.parse(r.options), correct: r.correct, explanation: r.explanation, image: r.image };
  if (withMeta) Object.assign(q, { verified: !!r.verified, created_at: r.created_at, updated_at: r.updated_at });
  return q;
};
const allIds = () => db.prepare('SELECT id FROM questions ORDER BY id').all().map(r => r.id);
const byIds = ids => {
  if (!ids.length) return [];
  const rows = db.prepare(`SELECT * FROM questions WHERE id IN (${ids.map(() => '?').join(',')})`).all(...ids);
  const map = new Map(rows.map(r => [r.id, rowToQ(r)]));
  return ids.map(id => map.get(id)).filter(Boolean);
};
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/* ---------- Ilova ---------- */
const app = express();
app.disable('x-powered-by');
app.use(compression());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: false }));
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'same-origin');
  next();
});

/* ---------- Tariflar va premium ---------- */
const PLANS = {
  week: { title: '7 kun', days: 7, price: 10000 },
  month: { title: '30 kun', days: 30, price: 25000 },
  quarter: { title: '90 kun', days: 90, price: 49000 }
};
const FREE = { tickets: 10, examsPerDay: 3 };
const devId = req => String(req.get('X-Device-Id') || req.query.device || req.body?.device || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
const premiumUntil = id => (id && db.prepare('SELECT premium_until FROM devices WHERE id=?').get(id)?.premium_until) || 0;
const isPremium = req => premiumUntil(devId(req)) > Date.now();
function needPremium(req, res, next) {
  if (isPremium(req)) return next();
  res.status(402).json({ error: 'Bu bo\'lim premium tarifda ochiladi', paywall: true });
}
function grantPremium(orderId) {
  const o = db.prepare('SELECT * FROM orders WHERE id=?').get(orderId);
  if (!o || o.status === 'paid') return;
  const p = PLANS[o.plan];
  db.prepare('INSERT OR IGNORE INTO devices (id) VALUES (?)').run(o.device_id);
  const cur = premiumUntil(o.device_id);
  db.prepare('UPDATE devices SET premium_until=? WHERE id=?').run(Math.max(cur, Date.now()) + p.days * 86400000, o.device_id);
  db.prepare("UPDATE orders SET status='paid' WHERE id=?").run(o.id);
}
function revokePremium(orderId) {
  const o = db.prepare('SELECT * FROM orders WHERE id=?').get(orderId);
  if (!o || o.status !== 'paid') return;
  const p = PLANS[o.plan];
  db.prepare('UPDATE devices SET premium_until=MAX(0, premium_until-?) WHERE id=?').run(p.days * 86400000, o.device_id);
  db.prepare("UPDATE orders SET status='refunded' WHERE id=?").run(o.id);
}
const PROVIDERS = {
  payme: !!(process.env.PAYME_MERCHANT_ID && process.env.PAYME_KEY),
  click: !!(process.env.CLICK_SERVICE_ID && process.env.CLICK_MERCHANT_ID && process.env.CLICK_SECRET_KEY),
  uzum: !!process.env.UZUM_PAY_URL
};
app.get('/api/plans', (req, res) => res.json({ plans: PLANS, free: FREE, providers: PROVIDERS }));
app.get('/api/me', (req, res) => { const u = premiumUntil(devId(req)); res.json({ premium: u > Date.now(), premium_until: u }); });
app.post('/api/orders', (req, res) => {
  const device = devId(req), { plan, provider } = req.body || {};
  if (!device) return res.status(400).json({ error: 'Qurilma aniqlanmadi' });
  if (!PLANS[plan]) return res.status(400).json({ error: 'Tarif topilmadi' });
  if (!PROVIDERS[provider]) return res.status(400).json({ error: 'Bu to\'lov tizimi hali ulanmagan' });
  db.prepare('INSERT OR IGNORE INTO devices (id) VALUES (?)').run(device);
  const amount = PLANS[plan].price;
  const id = db.prepare('INSERT INTO orders (device_id, plan, amount, provider) VALUES (?,?,?,?)').run(device, plan, amount, provider).lastInsertRowid;
  const back = (process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`) + '/#/tarif';
  let url;
  if (provider === 'payme') {
    const base = process.env.PAYME_TEST === '1' ? 'https://checkout.test.paycom.uz/' : 'https://checkout.paycom.uz/';
    url = base + Buffer.from(`m=${process.env.PAYME_MERCHANT_ID};ac.order_id=${id};a=${amount * 100};c=${back}`).toString('base64');
  } else if (provider === 'click') {
    url = 'https://my.click.uz/services/pay?' + new URLSearchParams({ service_id: process.env.CLICK_SERVICE_ID, merchant_id: process.env.CLICK_MERCHANT_ID, amount: String(amount), transaction_param: String(id), return_url: back });
  } else {
    url = process.env.UZUM_PAY_URL.replace('{order}', id).replace('{amount}', amount).replace('{return}', encodeURIComponent(back));
  }
  res.json({ order: id, url });
});

/* Payme Merchant API (JSON-RPC) — kabinetda manzil: https://SAYT/api/payme */
app.post('/api/payme', (req, res) => {
  const { method, params = {}, id } = req.body || {};
  const ok = result => res.json({ jsonrpc: '2.0', id, result });
  const err = (code, msg, data) => res.json({ jsonrpc: '2.0', id, error: { code, message: { uz: msg, ru: msg, en: msg }, data } });
  const auth = Buffer.from((req.get('Authorization') || '').replace(/^Basic /, ''), 'base64').toString();
  if (!PROVIDERS.payme || auth !== 'Paycom:' + process.env.PAYME_KEY) return err(-32504, 'Ruxsat yo\'q');
  const byExt = tid => db.prepare('SELECT * FROM orders WHERE ext_id=?').get(tid);
  const checkOrder = () => {
    const o = db.prepare('SELECT * FROM orders WHERE id=?').get(Number(params.account?.order_id));
    if (!o || o.provider !== 'payme') return [null, () => err(-31050, 'Buyurtma topilmadi', 'order_id')];
    if (o.status !== 'pending') return [null, () => err(-31051, 'Buyurtma allaqachon to\'langan yoki bekor qilingan', 'order_id')];
    if (Number(params.amount) !== o.amount * 100) return [null, () => err(-31001, 'Noto\'g\'ri summa')];
    return [o];
  };
  const view = o => ({ create_time: o.create_time || 0, perform_time: o.perform_time || 0, cancel_time: o.cancel_time || 0, transaction: String(o.id), state: o.pay_state, reason: o.reason ?? null });
  switch (method) {
    case 'CheckPerformTransaction': { const [o, e] = checkOrder(); return o ? ok({ allow: true }) : e(); }
    case 'CreateTransaction': {
      const ex = byExt(params.id);
      if (ex) return ex.pay_state === 1 ? ok({ create_time: ex.create_time, transaction: String(ex.id), state: 1 }) : err(-31008, 'Tranzaksiyani bajarib bo\'lmaydi');
      const [o, e] = checkOrder(); if (!o) return e();
      if (o.ext_id) return err(-31050, 'Buyurtma boshqa tranzaksiya bilan band', 'order_id');
      db.prepare('UPDATE orders SET ext_id=?, pay_state=1, create_time=? WHERE id=?').run(params.id, params.time, o.id);
      return ok({ create_time: params.time, transaction: String(o.id), state: 1 });
    }
    case 'PerformTransaction': {
      const o = byExt(params.id); if (!o) return err(-31003, 'Tranzaksiya topilmadi');
      if (o.pay_state === 1) { const t = Date.now(); db.prepare('UPDATE orders SET pay_state=2, perform_time=? WHERE id=?').run(t, o.id); grantPremium(o.id); return ok({ transaction: String(o.id), perform_time: t, state: 2 }); }
      if (o.pay_state === 2) return ok({ transaction: String(o.id), perform_time: o.perform_time, state: 2 });
      return err(-31008, 'Tranzaksiyani bajarib bo\'lmaydi');
    }
    case 'CancelTransaction': {
      const o = byExt(params.id); if (!o) return err(-31003, 'Tranzaksiya topilmadi');
      if (o.pay_state === 1 || o.pay_state === 2) {
        const t = Date.now(), st = o.pay_state === 1 ? -1 : -2;
        db.prepare("UPDATE orders SET pay_state=?, cancel_time=?, reason=?, status=CASE WHEN status='paid' THEN status ELSE 'cancelled' END WHERE id=?").run(st, t, params.reason, o.id);
        if (st === -2) revokePremium(o.id);
        return ok({ transaction: String(o.id), cancel_time: t, state: st });
      }
      return ok({ transaction: String(o.id), cancel_time: o.cancel_time, state: o.pay_state });
    }
    case 'CheckTransaction': { const o = byExt(params.id); return o ? ok(view(o)) : err(-31003, 'Tranzaksiya topilmadi'); }
    case 'GetStatement': {
      const rows = db.prepare("SELECT * FROM orders WHERE provider='payme' AND create_time BETWEEN ? AND ? AND ext_id IS NOT NULL").all(params.from, params.to);
      return ok({ transactions: rows.map(o => ({ id: o.ext_id, time: o.create_time, amount: o.amount * 100, account: { order_id: String(o.id) }, ...view(o) })) });
    }
    default: return err(-32601, 'Metod topilmadi');
  }
});

/* Click SHOP API — kabinetda: Prepare https://SAYT/api/click/prepare, Complete https://SAYT/api/click/complete */
function clickHandler(stage) {
  return (req, res) => {
    const b = req.body || {};
    const reply = (error, note, extra = {}) => res.json({ click_trans_id: b.click_trans_id, merchant_trans_id: b.merchant_trans_id, error, error_note: note, ...extra });
    if (!PROVIDERS.click) return reply(-8, 'Click ulanmagan');
    const sig = crypto.createHash('md5').update(`${b.click_trans_id}${b.service_id}${process.env.CLICK_SECRET_KEY}${b.merchant_trans_id}${stage === 'complete' ? b.merchant_prepare_id : ''}${b.amount}${b.action}${b.sign_time}`).digest('hex');
    if (sig !== b.sign_string) return reply(-1, 'SIGN CHECK FAILED');
    const o = db.prepare('SELECT * FROM orders WHERE id=?').get(Number(b.merchant_trans_id));
    if (!o || o.provider !== 'click') return reply(-5, 'Buyurtma topilmadi');
    if (Math.abs(Number(b.amount) - o.amount) > 0.01) return reply(-2, 'Noto\'g\'ri summa');
    if (o.status === 'paid') return reply(-4, 'Allaqachon to\'langan');
    if (o.status === 'cancelled') return reply(-9, 'Bekor qilingan');
    if (stage === 'prepare') { db.prepare('UPDATE orders SET ext_id=? WHERE id=?').run(String(b.click_trans_id), o.id); return reply(0, 'Success', { merchant_prepare_id: o.id }); }
    if (Number(b.error) < 0) { db.prepare("UPDATE orders SET status='cancelled' WHERE id=?").run(o.id); return reply(-9, 'Bekor qilindi'); }
    grantPremium(o.id);
    return reply(0, 'Success', { merchant_confirm_id: o.id });
  };
}
app.post('/api/click/prepare', clickHandler('prepare'));
app.post('/api/click/complete', clickHandler('complete'));

/* Uzum Bank: callbacklarni Uzum bergan hujjatga ko'ra shu yerga qo'shing va to'lov tasdiqlanganda grantPremium(orderId) ni chaqiring. */

/* ---------- AI yordamchi (Claude) ---------- */
const AI = { key: process.env.ANTHROPIC_API_KEY || '', model: process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5', freePerDay: 5, premiumPerDay: 100 };
const AI_SYSTEM = `Sen "pravauchun.uz" saytining yordamchisisan. O'zbekiston Yo'l harakati qoidalari (YHQ), yo'l belgilari, chorrahadan o'tish, haydovchilik imtihoni va xavfsiz haydash bo'yicha savollarga javob berasan.
Qoidalar:
- Foydalanuvchi qaysi tilda yozsa, o'sha tilda javob ber (odatda o'zbek tilida, lotin yozuvida).
- Qisqa va tushunarli yoz: 2–6 gap, kerak bo'lsa qisqa ro'yxat. Murakkab atamalarni oddiy so'z bilan tushuntir.
- Test savoli berilgan bo'lsa, to'g'ri javob nima uchun to'g'ri va boshqalari nima uchun noto'g'ri ekanini tushuntir.
- Aniq raqam yoki band raqamiga ishonching komil bo'lmasa, buni ochiq ayt va rasmiy YHQ matnini (lex.uz) tekshirishni tavsiya qil.
- Mavzudan tashqari savollarga (yo'l harakatiga aloqasi yo'q) muloyimlik bilan javob berma va yordamchi nima qila olishini ayt.
- Qoidani buzish, jarimadan qochish yoki imtihonda ko'chirish usullarini o'rgatma.`;
app.post('/api/ai', async (req, res) => {
  if (!AI.key) return res.status(503).json({ error: 'AI yordamchi hali sozlanmagan' });
  const d = devId(req); if (!d) return res.status(400).json({ error: 'Qurilma aniqlanmadi' });
  const day = new Date().toISOString().slice(0, 10), limit = isPremium(req) ? AI.premiumPerDay : AI.freePerDay;
  const used = db.prepare('SELECT n FROM ai_log WHERE device_id=? AND day=?').get(d, day)?.n || 0;
  if (used >= limit) return res.status(402).json({ error: `Bugungi AI savollar limiti tugadi (${limit} ta)`, paywall: limit === AI.freePerDay });
  const msgs = (Array.isArray(req.body?.messages) ? req.body.messages : []).slice(-12)
    .filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map(m => ({ role: m.role, content: m.content.slice(0, 3000) }));
  if (!msgs.length || msgs[msgs.length - 1].role !== 'user') return res.status(400).json({ error: 'Savol yozilmagan' });
  try {
    const r = await fetch((process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com') + '/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': AI.key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: AI.model, max_tokens: 700, system: AI_SYSTEM, messages: msgs })
    });
    const data = await r.json();
    if (!r.ok) { console.error('AI xato:', data?.error?.message || r.status); return res.status(502).json({ error: 'AI hozir javob bera olmadi, birozdan keyin urinib ko\'ring' }); }
    db.prepare('INSERT INTO ai_log (device_id, day, n) VALUES (?,?,1) ON CONFLICT(device_id, day) DO UPDATE SET n=n+1').run(d, day);
    res.json({ text: (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim(), left: limit - used - 1 });
  } catch (e) { console.error(e); res.status(502).json({ error: 'AI bilan aloqa yo\'q' }); }
});

/* Ochiq API */
const metaData = () => {
  const total = db.prepare('SELECT COUNT(*) c FROM questions').get().c;
  return { total, tickets: Math.floor(total / TICKET_SIZE), ticketSize: TICKET_SIZE, freeTickets: FREE.tickets, exam: { size: 20, minutes: 25, maxErrors: 2 } };
};
app.get('/api/meta', (req, res) => res.json(metaData()));

app.get('/api/topics', (req, res) => {
  const counts = Object.fromEntries(db.prepare('SELECT topic, COUNT(*) c FROM questions GROUP BY topic').all().map(r => [r.topic, r.c]));
  res.json(TOPICS.map(t => ({ ...t, count: counts[t.id] || 0 })));
});

app.get('/api/topics/:id', (req, res) => {
  if (!TOPIC_IDS.has(req.params.id)) return res.status(404).json({ error: 'Mavzu topilmadi' });
  const rows = db.prepare('SELECT * FROM questions WHERE topic = ? ORDER BY id').all(req.params.id);
  res.json(rows.map(r => rowToQ(r)));
});

app.get('/api/tickets/:n', (req, res) => {
  const n = parseInt(req.params.n, 10);
  if (n > FREE.tickets && !isPremium(req)) return res.status(402).json({ error: 'Bu bilet premium tarifda ochiladi', paywall: true });
  const ids = allIds();
  const slice = ids.slice((n - 1) * TICKET_SIZE, n * TICKET_SIZE);
  if (!n || n < 1 || slice.length < TICKET_SIZE) return res.status(404).json({ error: 'Bilet topilmadi' });
  res.json({ number: n, questions: byIds(slice) });
});

app.get('/api/all', needPremium, (req, res) => {
  const rows = db.prepare('SELECT * FROM questions ORDER BY id').all();
  res.json({ questions: rows.map(r => rowToQ(r)) });
});

app.get('/api/exam', (req, res) => {
  if (!isPremium(req)) {
    const d = devId(req), day = new Date().toISOString().slice(0, 10);
    if (!d) return res.status(400).json({ error: 'Qurilma aniqlanmadi' });
    const n = db.prepare('SELECT n FROM exam_log WHERE device_id=? AND day=?').get(d, day)?.n || 0;
    if (n >= FREE.examsPerDay) return res.status(402).json({ error: `Bepul tarifda kuniga ${FREE.examsPerDay} ta imtihon`, paywall: true });
    db.prepare('INSERT INTO exam_log (device_id, day, n) VALUES (?,?,1) ON CONFLICT(device_id, day) DO UPDATE SET n=n+1').run(d, day);
  }
  res.json({ questions: byIds(shuffle(allIds()).slice(0, 20)) });
});

app.get('/api/quiz', needPremium, (req, res) => {
  const count = Math.min(Math.max(parseInt(req.query.count, 10) || 10, 5), 30);
  res.json({ questions: byIds(shuffle(allIds()).slice(0, count)) });
});

app.post('/api/questions/by-ids', needPremium, (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids.filter(Number.isInteger).slice(0, 500) : [];
  res.json({ questions: byIds(ids) });
});

app.get('/api/instructors', (req, res) => {
  const where = ['active=1'], args = [];
  if (['erkak', 'ayol'].includes(req.query.gender)) { where.push('gender=?'); args.push(req.query.gender); }
  if (['mexanika', 'avtomat'].includes(req.query.transmission)) { where.push('transmission=?'); args.push(req.query.transmission); }
  res.json(db.prepare(`SELECT id, name, gender, experience, car, transmission, phone, telegram, schedule, price, city, photo FROM instructors WHERE ${where.join(' AND ')} ORDER BY experience DESC, id`).all(...args));
});

app.get('/api/guide', (req, res) => res.json(GUIDE.map(({ id, title, summary }) => ({ id, title, summary }))));
app.get('/api/guide/:id', (req, res) => {
  const ch = GUIDE.find(c => c.id === req.params.id);
  ch ? res.json(ch) : res.status(404).json({ error: 'Bob topilmadi' });
});

/* ---------- Admin ---------- */
const sessions = new Map(); // token -> muddati
const loginAttempts = new Map(); // ip -> {n, until}
const SESSION_MS = 12 * 60 * 60 * 1000;

app.post('/api/admin/login', (req, res) => {
  if (!ADMIN_PASSWORD) return res.status(503).json({ error: 'Admin panel sozlanmagan (ADMIN_PASSWORD yo\'q)' });
  const ip = req.ip;
  const a = loginAttempts.get(ip) || { n: 0, until: 0 };
  if (a.until > Date.now()) return res.status(429).json({ error: 'Juda ko\'p urinish. 15 daqiqadan keyin qayta urinib ko\'ring.' });
  const given = Buffer.from(String(req.body.password || ''));
  const real = Buffer.from(ADMIN_PASSWORD);
  const ok = given.length === real.length && crypto.timingSafeEqual(given, real);
  if (!ok) {
    a.n++; if (a.n >= 5) { a.until = Date.now() + 15 * 60 * 1000; a.n = 0; }
    loginAttempts.set(ip, a);
    return res.status(401).json({ error: 'Parol noto\'g\'ri' });
  }
  loginAttempts.delete(ip);
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, Date.now() + SESSION_MS);
  res.json({ token });
});

function auth(req, res, next) {
  const token = (req.get('Authorization') || '').replace(/^Bearer /, '');
  const exp = sessions.get(token);
  if (!exp || exp < Date.now()) { sessions.delete(token); return res.status(401).json({ error: 'Qayta kiring' }); }
  next();
}

app.get('/api/admin/questions', auth, (req, res) => {
  const { topic, q, verified } = req.query;
  const where = [], args = [];
  if (topic) { where.push('topic = ?'); args.push(topic); }
  if (verified === '0' || verified === '1') { where.push('verified = ?'); args.push(+verified); }
  if (q) { where.push('(question LIKE ? OR options LIKE ? OR explanation LIKE ?)'); args.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1), size = 50;
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const total = db.prepare(`SELECT COUNT(*) c FROM questions ${w}`).get(...args).c;
  const rows = db.prepare(`SELECT * FROM questions ${w} ORDER BY id LIMIT ? OFFSET ?`).all(...args, size, (page - 1) * size);
  const stats = db.prepare('SELECT COUNT(*) total, SUM(verified) verified FROM questions').get();
  res.json({ total, page, pages: Math.max(1, Math.ceil(total / size)), items: rows.map(r => rowToQ(r, true)), stats });
});

app.post('/api/admin/questions', auth, (req, res) => {
  const err = validQuestion(req.body);
  if (err) return res.status(400).json({ error: err });
  insertMany([req.body]);
  res.status(201).json({ ok: true });
});

app.put('/api/admin/questions/:id', auth, (req, res) => {
  const err = validQuestion(req.body);
  if (err) return res.status(400).json({ error: err });
  const q = req.body;
  const r = db.prepare(`UPDATE questions SET topic=?, question=?, options=?, correct=?, explanation=?, image=?, verified=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .run(q.topic, q.question.trim(), JSON.stringify(q.options.map(s => s.trim())), q.correct, (q.explanation || '').trim(), q.image || '', q.verified ? 1 : 0, req.params.id);
  r.changes ? res.json({ ok: true }) : res.status(404).json({ error: 'Savol topilmadi' });
});

app.patch('/api/admin/questions/:id/verified', auth, (req, res) => {
  const r = db.prepare('UPDATE questions SET verified=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(req.body.verified ? 1 : 0, req.params.id);
  r.changes ? res.json({ ok: true }) : res.status(404).json({ error: 'Savol topilmadi' });
});

app.delete('/api/admin/questions/:id', auth, (req, res) => {
  const r = db.prepare('DELETE FROM questions WHERE id=?').run(req.params.id);
  r.changes ? res.json({ ok: true }) : res.status(404).json({ error: 'Savol topilmadi' });
});

app.post('/api/admin/import', auth, (req, res) => {
  const list = Array.isArray(req.body) ? req.body : req.body.questions;
  if (!Array.isArray(list) || !list.length) return res.status(400).json({ error: 'JSON massiv kutilmoqda' });
  for (let i = 0; i < list.length; i++) {
    const err = validQuestion(list[i]);
    if (err) return res.status(400).json({ error: `${i + 1}-savol: ${err}` });
  }
  insertMany(list);
  res.json({ ok: true, added: list.length });
});

app.get('/api/admin/instructors', auth, (req, res) => res.json(db.prepare('SELECT * FROM instructors ORDER BY id DESC').all()));
app.post('/api/admin/instructors', auth, (req, res) => {
  const e = validInstructor(req.body); if (e) return res.status(400).json({ error: e });
  const r = instrRow(req.body);
  db.prepare('INSERT INTO instructors (name, gender, experience, car, transmission, phone, telegram, schedule, price, city, photo, active) VALUES (@name,@gender,@experience,@car,@transmission,@phone,@telegram,@schedule,@price,@city,@photo,@active)').run(r);
  res.status(201).json({ ok: true });
});
app.put('/api/admin/instructors/:id', auth, (req, res) => {
  const e = validInstructor(req.body); if (e) return res.status(400).json({ error: e });
  const r = { ...instrRow(req.body), id: Number(req.params.id) };
  const x = db.prepare('UPDATE instructors SET name=@name, gender=@gender, experience=@experience, car=@car, transmission=@transmission, phone=@phone, telegram=@telegram, schedule=@schedule, price=@price, city=@city, photo=@photo, active=@active WHERE id=@id').run(r);
  x.changes ? res.json({ ok: true }) : res.status(404).json({ error: 'Topilmadi' });
});
app.delete('/api/admin/instructors/:id', auth, (req, res) => {
  const x = db.prepare('DELETE FROM instructors WHERE id=?').run(req.params.id);
  x.changes ? res.json({ ok: true }) : res.status(404).json({ error: 'Topilmadi' });
});

app.get('/api/admin/orders', auth, (req, res) => {
  res.json(db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 200').all());
});

app.get('/api/admin/export', auth, (req, res) => {
  const rows = db.prepare('SELECT * FROM questions ORDER BY id').all().map(r => {
    const q = rowToQ(r, true); delete q.id; delete q.created_at; delete q.updated_at; return q;
  });
  res.set('Content-Disposition', 'attachment; filename="savollar.json"');
  res.json(rows);
});

const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, 'public', 'uploads'),
    filename: (req, file, cb) => cb(null, crypto.randomBytes(8).toString('hex') + path.extname(file.originalname).toLowerCase())
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, /^image\/(png|jpe?g|webp|gif)$/.test(file.mimetype))
});
app.post('/api/admin/upload', auth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Faqat PNG, JPG, WEBP yoki GIF rasm (2 MB gacha)' });
  res.json({ url: '/uploads/' + req.file.filename });
});

/* Statik fayllar */
const seoNotFound = seo(app, { db, TOPICS, GUIDE, TICKET_SIZE, FREE, metaData });
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '7d', index: false, extensions: ['html'],
  // ?v=hash bilan so'ralgan fayl o'zgarmaydi (yangisi boshqa hash oladi) — brauzer qayta so'ramaydi;
  // versiyasiz kod va stil fayllari har safar tekshiriladi (o'zgarmagan bo'lsa 304 qaytadi)
  setHeaders: (res, file) => {
    if (res.req.query.v) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    else if (/\.(js|css|html)$/.test(file)) res.setHeader('Cache-Control', 'no-cache');
  }
}));
app.get(/^\/(?!api\/).*/, seoNotFound);
app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: 'Serverda xatolik' }); });

app.listen(PORT, () => console.log(`pravauchun.uz ishlamoqda: http://localhost:${PORT}`));
