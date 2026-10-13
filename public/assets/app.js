'use strict';
/* ================= Yordamchilar ================= */
const USE_PATH = !window.__ARTIFACT__ && /^https?:$/.test(location.protocol);
const H = USE_PATH ? '' : '#';
const curKey = () => USE_PATH ? location.pathname : location.hash;
function go(p) { if (USE_PATH) { history.pushState(null, '', p); router(); } else location.hash = '#' + p; }

const $app = document.getElementById('app');
const store = {
  get(k, d) { try { const v = localStorage.getItem('yolchi_' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('yolchi_' + k, JSON.stringify(v)); } catch (e) {} }
};
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const fmt = s => `${String(Math.max(0, s) / 60 | 0).padStart(2, '0')}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;
const DEVICE = (() => {
  let d = store.get('device', null);
  if (!d) { d = ((window.crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now() + '' + Math.random()).replace(/[^a-zA-Z0-9]/g, '').slice(0, 32); store.set('device', d); }
  return d;
})();
/* Yuklanish: tepadagi chiziq va sahifa skeleti */
const $bar = Object.assign(document.createElement('div'), { className: 'topbar' });
document.body.appendChild($bar);
let busy = 0, barT = null, barAt = 0;
const BAR_MIN = 350; // juda tez javobda ham chiziq ko'zga ko'rinsin
function loadStart() {
  if (busy++) return;
  clearTimeout(barT); barAt = Date.now();
  $bar.className = 'topbar'; void $bar.offsetWidth; $bar.className = 'topbar on';
}
function loadEnd() {
  if (--busy > 0) return;
  busy = 0;
  barT = setTimeout(() => {
    if (busy) return;
    $bar.className = 'topbar on done';
    barT = setTimeout(() => { if (!busy) $bar.className = 'topbar'; }, 500);
  }, Math.max(0, BAR_MIN - (Date.now() - barAt)));
}
const skeleton = () => `<div class="skel" role="status" aria-label="Yuklanmoqda"><div class="sk sk-h"></div><div class="sk sk-p"></div><div class="sk sk-p short"></div><div class="sk-grid">${'<div class="sk sk-card"></div>'.repeat(6)}</div></div>`;
async function api(path, opts = {}) {
  opts.headers = { ...(opts.headers || {}), 'X-Device-Id': DEVICE };
  loadStart();
  try {
    const r = await fetch('/api' + path, opts);
    const data = await r.json().catch(() => ({}));
    if (r.status === 402) throw Object.assign(new Error(data.error || 'Premium kerak'), { paywall: true });
    if (!r.ok) throw new Error(data.error || 'Server javob bermadi');
    return data;
  } finally { loadEnd(); }
}
let ME = null;
const me = async () => ME || (ME = await api('/me').catch(() => ({ premium: false })));
const somFmt = n => n.toLocaleString('ru-RU').replace(/,/g, ' ') + " so'm";
let META = null;
const meta = async () => META || (META = await api('/meta'));
let cleanup = null; // joriy sahifaning taymerlarini to'xtatish uchun
let navId = 0; // eng oxirgi o'tishni aniqlash uchun

function setNav(route) {
  document.querySelectorAll('#tabbar a').forEach(a => a.classList.toggle('on', a.getAttribute('href').replace(/^#/, '') === '/' + route));
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('on', a.getAttribute('href').replace(/^#/, '') === '/' + route));
}
document.getElementById('themeBtn').onclick = () => {
  const r = document.documentElement;
  const dark = r.dataset.theme ? r.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  r.dataset.theme = dark ? 'light' : 'dark';
  store.set('theme', r.dataset.theme);
};
function errorView(e) {
  if (e.paywall) { $app.innerHTML = `<div class="page-head"><h1>Premium bo'lim</h1><p>${esc(e.message)}. Bepul tarifda dastlabki biletlar, kuniga bir necha imtihon, mavzular, qo'llanma va belgilar ochiq.</p></div><a class="btn" href="${H}/tarif">Tariflarni ko'rish</a> <a class="btn secondary" href="${H}/">Bosh sahifa</a>`; return; }
  $app.innerHTML = `<div class="page-head"><h1>Ma'lumot yuklanmadi</h1><p>${esc(e.message)}. Internet aloqasini tekshirib, sahifani yangilang.</p></div><button class="btn" onclick="location.reload()">Sahifani yangilash</button>`;
}

/* ================= Progress ================= */
const progress = {
  mistakes: () => store.get('mistakes', []),
  addMistake(id) { const m = this.mistakes(); if (!m.includes(id)) { m.push(id); store.set('mistakes', m); } },
  removeMistake(id) { store.set('mistakes', this.mistakes().filter(x => x !== id)); },
  tickets: () => store.get('tickets', {}),
  saveTicket(n, right, total) { const t = this.tickets(); t[n] = { right, total, at: Date.now() }; store.set('tickets', t); },
  exam: () => store.get('exam', { tests: 0, passed: 0, best: null }),
  saveExam(right, passed) { const s = this.exam(); s.tests++; if (passed) s.passed++; s.best = Math.max(s.best ?? 0, right); store.set('exam', s); },
  answered: () => store.get('answered', 0),
  incAnswered() { store.set('answered', this.answered() + 1); }
};

/* ================= Router ================= */
const TITLES = { '': 'Prava test 2026 — YHQ biletlari onlayn', biletlar: 'Prava biletlari 2026', bilet: 'Prava bileti', imtihon: 'Prava imtihoni onlayn', mavzular: 'YHQ mavzulari bo\'yicha test', mavzu: 'YHQ testi', marafon: 'Marafon — barcha savollar', viktorina: 'YHQ viktorina', qollanma: 'YHQ qo\'llanma', bob: 'YHQ qo\'llanma', belgilar: 'Yo\'l belgilari', xatolar: 'Xatolar ustida ishlash', tarif: 'Tariflar', instruktorlar: 'Avtoinstruktor tanlash' };
const routes = {
  '': home, 'biletlar': tickets, 'bilet': ticket, 'imtihon': examIntro, 'imtihon-boshlash': exam,
  'mavzular': topics, 'mavzu': topic, 'viktorina': quizIntro, 'viktorina-boshlash': quiz,
  'marafon': marathonIntro, 'marafon-yechish': marathon, 'tarif': tarif, 'instruktorlar': instructors, 'qollanma': guide, 'bob': chapter, 'belgilar': signs, 'xatolar': mistakes
};
async function router() {
  if (cleanup) { cleanup(); cleanup = null; }
  const [route, arg] = (USE_PATH ? location.pathname : location.hash.replace(/^#/, '')).replace(/^\/+/, '').split('/');
  setNav(route);
  window.scrollTo(0, 0);
  const fn = routes[route] || notFound;
  document.title = (TITLES[route] || 'Prava test onlayn') + ' — pravauchun.uz';
  const id = ++navId;
  loadStart();
  // ma'lumot tez kelsa skelet ko'rinmaydi, sekin kelsa bo'sh joy o'rniga chiqadi
  const skelT = setTimeout(() => { if (id === navId) $app.innerHTML = skeleton(); }, 150);
  try { await fn(arg && decodeURIComponent(arg)); } catch (e) { if (id === navId) errorView(e); }
  finally { clearTimeout(skelT); loadEnd(); }
  if (id !== navId) return;
  $app.classList.remove('enter'); void $app.offsetWidth; $app.classList.add('enter');
}
window.addEventListener('hashchange', router);
window.addEventListener('popstate', () => { if (USE_PATH) router(); });
document.addEventListener('click', e => {
  if (!USE_PATH || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey) return;
  const a = e.target.closest('a[href^="/"]');
  if (!a || a.target || a.hasAttribute('download') || a.getAttribute('href').startsWith('/api/') || a.getAttribute('href').startsWith('/admin')) return;
  e.preventDefault(); history.pushState(null, '', a.getAttribute('href')); router();
});
if (!USE_PATH) document.querySelectorAll('header a[href^="/"], #tabbar a[href^="/"]').forEach(a => a.setAttribute('href', '#' + a.getAttribute('href')));
if (!USE_PATH && location.pathname.length > 1 && !location.hash && /^https?:$/.test(location.protocol)) location.hash = location.pathname;
function notFound() { $app.innerHTML = `<div class="page-head"><h1>Sahifa topilmadi</h1><p>Bunday sahifa yo'q. Bosh sahifadan kerakli bo'limni tanlang.</p></div><a class="btn" href="${H}/">Bosh sahifa</a>`; }

/* ================= Bosh sahifa ================= */
const ICONS = {
  ticket: '<svg viewBox="0 0 26 26"><rect x="3" y="5" width="20" height="16" rx="3" fill="none" stroke="var(--blue)" stroke-width="2.5"/><path d="M8 11h10M8 15h6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>',
  clock: '<svg viewBox="0 0 26 26"><circle cx="13" cy="13" r="10" fill="none" stroke="var(--blue)" stroke-width="2.5"/><path d="M13 7v6l4 3" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" fill="none"/></svg>',
  bolt: '<svg viewBox="0 0 26 26"><path d="M15 2 5 15h7l-1 9 10-13h-7z" fill="var(--yellow)" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
  book: '<svg viewBox="0 0 26 26"><path d="M4 5h7a3 3 0 0 1 3 3v14a2 2 0 0 0-2-2H4zM22 5h-7a3 3 0 0 0-3 3v14a2 2 0 0 1 2-2h8z" fill="none" stroke="var(--blue)" stroke-width="2.2" stroke-linejoin="round"/></svg>',
  warn: '<svg viewBox="0 0 26 26"><path d="M13 3 24 22H2z" fill="none" stroke="var(--red)" stroke-width="2.5" stroke-linejoin="round"/><path d="M13 10v6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><circle cx="13" cy="19" r="1.4" fill="currentColor"/></svg>',
  user: '<svg viewBox="0 0 26 26"><circle cx="13" cy="9" r="4.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M4.5 22c1.2-4.5 4.4-6.5 8.5-6.5s7.3 2 8.5 6.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  star: '<svg viewBox="0 0 26 26"><path d="M13 3l3 6.5 7 .8-5.2 4.8 1.5 7L13 18.6 6.7 22l1.5-7L3 10.3l7-.8z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>',
  road: '<svg viewBox="0 0 26 26"><path d="M8 3 4 23M18 3l4 20" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M13 4v3M13 11v4M13 19v3" stroke="var(--yellow)" stroke-width="2.5" stroke-linecap="round"/></svg>',
  list: '<svg viewBox="0 0 26 26"><path d="M9 7h13M9 13h13M9 19h13" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><circle cx="4.5" cy="7" r="1.8" fill="var(--blue)"/><circle cx="4.5" cy="13" r="1.8" fill="var(--blue)"/><circle cx="4.5" cy="19" r="1.8" fill="var(--blue)"/></svg>'
};
async function home() {
  const m = await meta(), u = await me();
  const pro = u.premium ? '' : ' <span class="pro">PRO</span>';
  const ex = progress.exam(), tk = progress.tickets();
  const solved = Object.values(tk).filter(t => t.total - t.right <= 2).length;
  $app.innerHTML = `
  <section class="hero fade">
    <div>
      <h1 class="display">Haydovchilik imtihoniga tayyorgarlik</h1>
      <p>Yo'l harakati qoidalari bo'yicha biletlar, imtihon rejimi va vaziyatli savollar. Imtihon sharti: ${m.exam.size} ta savol, ${m.exam.minutes} daqiqa, ${m.exam.maxErrors} tagacha xato.</p>
      <div class="cta"><a class="btn" href="${H}/imtihon">Imtihonni boshlash</a><a class="btn secondary" href="${H}/biletlar">Biletlar</a></div>
    </div>
    <div class="panel hero-panel">
      <div class="hero-scene">${renderScene({ t: 'main', c: [{ a: 'S', m: 'L' }, { a: 'N', m: 'S' }, { a: 'E', m: 'R' }] })}</div>
      <div><b>${m.total}</b><span>savol bazada</span></div>
      <div><b>${m.tickets}</b><span>bilet</span></div>
      <div><b>${progress.answered()}</b><span>siz javob bergan</span></div>
      <div><b>${ex.best === null ? '—' : ex.best + '/' + m.exam.size}</b><span>eng yaxshi natija</span></div>
      <div class="rule">Muvaffaqiyatli biletlar: ${solved} / ${m.tickets} · imtihon mashqlari: ${ex.tests}</div>
    </div>
  </section>
  <div class="tiles">
    <a class="tile" href="${H}/biletlar"><span class="ic">${ICONS.ticket}</span><span><b>Biletlar</b><small>${m.tickets} ta bilet, har birida ${m.ticketSize} ta savol</small></span></a>
    <a class="tile" href="${H}/imtihon"><span class="ic">${ICONS.clock}</span><span><b>Imtihon rejimi</b><small>Tasodifiy savollar va taymer</small></span></a>
    <a class="tile" href="${H}/mavzular"><span class="ic">${ICONS.list}</span><span><b>Mavzular bo'yicha</b><small>Qiyin bo'limlarni alohida mashq qiling</small></span></a>
    <a class="tile" href="${H}/marafon"><span class="ic">${ICONS.road}</span><span><b>Marafon${pro}</b><small>Barcha ${m.total} ta savolni ketma-ket yeching</small></span></a>
    <a class="tile" href="${H}/viktorina"><span class="ic">${ICONS.bolt}</span><span><b>Viktorina${pro}</b><small>Tez javob bering — ko'proq ball oling</small></span></a>
    <a class="tile" href="${H}/qollanma"><span class="ic">${ICONS.book}</span><span><b>Qo'llanma</b><small>Qoidalar sodda tilda, boblar bo'yicha</small></span></a>
    <a class="tile" href="${H}/instruktorlar"><span class="ic">${ICONS.user}</span><span><b>Instruktorlar</b><small>Ayol va erkak instruktorlar, narx va vaqtlar</small></span></a>
    <a class="tile" href="${H}/tarif"><span class="ic">${ICONS.star}</span><span><b>${u.premium ? 'Premium faol' : 'Tariflar'}</b><small>${u.premium ? new Date(u.premium_until).toLocaleDateString('ru-RU') + ' gacha' : "10 000 so'mdan — barcha biletlar va bo'limlar"}</small></span></a>
    <a class="tile" href="${H}/xatolar"><span class="ic">${ICONS.warn}</span><span><b>Xatolar ustida ishlash${pro}</b><small>${progress.mistakes().length ? progress.mistakes().length + ' ta savol takrorlashni kutmoqda' : 'Hozircha xato yo\'q'}</small></span></a>
  </div>
`;
}

/* ================= Biletlar ================= */
async function tickets() {
  const m = await meta(), tk = progress.tickets(), u = await me();
  $app.innerHTML = `<div class="page-head"><h1>Biletlar</h1><p>Har bir biletda ${m.ticketSize} ta savol. ${m.exam.maxErrors} tagacha xato qilsangiz, bilet yashil rangga kiradi.</p></div>
  ${m.tickets ? `<div class="tickets">${Array.from({ length: m.tickets }, (_, i) => {
    const n = i + 1, r = tk[n]; const cls = r ? (r.total - r.right <= m.exam.maxErrors ? 'pass' : 'fail') : '';
    const locked = !u.premium && m.freeTickets && n > m.freeTickets;
    if (locked) return `<a class="ticket locked" href="${H}/tarif" aria-label="${n}-bilet, premium"><b>${n}</b><small>🔒 premium</small></a>`;
    return `<a class="ticket ${cls}" href="${H}/bilet/${n}"><b>${n}</b><small>${r ? r.right + '/' + r.total : 'yechilmagan'}</small></a>`;
  }).join('')}</div>` : `<div class="empty">Biletlar hali qo'shilmagan.</div>`}`;
}
async function ticket(n) {
  const d = await api('/tickets/' + encodeURIComponent(n));
  runTest({ title: `${d.number}-bilet`, questions: d.questions, mode: 'ticket', ticket: d.number });
}

/* ================= Imtihon ================= */
async function examIntro() {
  const m = await meta(), ex = progress.exam();
  $app.innerHTML = `<div class="page-head"><h1>Imtihon rejimi</h1><p>Haqiqiy imtihondagi kabi: barcha mavzulardan ${m.exam.size} ta tasodifiy savol, ${m.exam.minutes} daqiqa vaqt. ${m.exam.maxErrors} tadan ko'p xato qilsangiz, imtihon to'xtaydi.</p></div>
  <a class="btn" href="${H}/imtihon-boshlash">Imtihonni boshlash</a>
  <div class="stats"><div><b>${ex.tests}</b><span>topshirilgan</span></div><div><b>${ex.passed}</b><span>muvaffaqiyatli</span></div><div><b>${ex.tests ? Math.round(ex.passed / ex.tests * 100) + '%' : '—'}</b><span>o'tish ko'rsatkichi</span></div></div>`;
}
async function exam() {
  const m = await meta(); const d = await api('/exam');
  runTest({ title: 'Imtihon', questions: d.questions, mode: 'exam', seconds: m.exam.minutes * 60, maxErrors: m.exam.maxErrors });
}

/* ================= Mavzular ================= */
async function topics() {
  const list = await api('/topics');
  $app.innerHTML = `<div class="page-head"><h1>Mavzular</h1><p>Har bir mavzu bo'yicha barcha savollarni ketma-ket yeching.</p></div>
  <div class="topics">${list.map(t => `<a class="topic" href="${H}/mavzu/${t.id}"><span><b>${esc(t.title)}</b><small>${esc(t.description)}</small></span><em>${t.count} savol</em></a>`).join('')}</div>`;
}
async function topic(id) {
  const [list, qs] = await Promise.all([api('/topics'), api('/topics/' + encodeURIComponent(id))]);
  const t = list.find(x => x.id === id);
  if (!qs.length) { $app.innerHTML = `<div class="page-head"><h1>${esc(t ? t.title : 'Mavzu')}</h1></div><div class="empty">Bu mavzuda hali savollar yo'q.</div>`; return; }
  runTest({ title: t ? t.title : 'Mavzu', questions: qs, mode: 'topic' });
}

/* ================= Xatolar ================= */
async function mistakes() {
  const ids = progress.mistakes();
  if (!ids.length) {
    $app.innerHTML = `<div class="page-head"><h1>Xatolar ustida ishlash</h1></div><div class="empty">Xato qilingan savollar yo'q. Bilet yoki imtihon yeching — xato javob bergan savollaringiz shu yerga tushadi.<div style="margin-top:16px"><a class="btn" href="${H}/biletlar">Biletlarni ochish</a></div></div>`;
    return;
  }
  const d = await api('/questions/by-ids', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
  runTest({ title: 'Xatolar ustida ishlash', questions: shuffle(d.questions), mode: 'mistakes' });
}

/* ================= Test dvigateli ================= */
const CAR = `<svg class="car" id="car" viewBox="0 0 46 26" aria-hidden="true"><rect x="2" y="3" width="42" height="20" rx="6" fill="#F3C31B"/><rect x="28" y="6" width="9" height="14" rx="2" fill="#2E3338" opacity=".75"/><rect x="8" y="6" width="7" height="14" rx="2" fill="#2E3338" opacity=".5"/></svg>`;
const FLAG = `<svg class="flag" viewBox="0 0 22 22" aria-hidden="true"><rect width="22" height="22" fill="#fff"/><path d="M0 0h5.5v5.5H0zM11 0h5.5v5.5H11zM5.5 5.5H11V11H5.5zM16.5 5.5H22V11h-5.5zM0 11h5.5v5.5H0zM11 11h5.5v5.5H11zM5.5 16.5H11V22H5.5zM16.5 16.5H22V22h-5.5z" fill="#222"/></svg>`;

function runTest(cfg) {
  const S = { ...cfg, i: 0, ans: {}, showExp: {}, left: cfg.seconds || 0, done: false, hash: curKey() };
  if (cfg.saved) {
    S.questions.forEach((q, n) => { if (cfg.saved[q.id] !== undefined) S.ans[n] = cfg.saved[q.id]; });
    const firstOpen = S.questions.findIndex((q, n) => S.ans[n] === undefined);
    S.i = firstOpen >= 0 ? firstOpen : 0;
  }
  const BLOCK = 50, paged = S.questions.length > 60;
  let timer = null;
  if (S.mode === 'exam') {
    timer = setInterval(() => {
      S.left--;
      const el = document.getElementById('timer');
      if (el) { el.textContent = fmt(S.left); el.classList.toggle('low', S.left < 120); }
      if (S.left <= 0) finish();
    }, 1000);
  }
  const onKey = e => {
    if (S.done || e.target.matches('input,textarea')) return;
    const fk = /^F([1-6])$/.exec(e.key);
    const n = fk ? +fk[1] : parseInt(e.key, 10);
    if (n >= 1 && n <= 6) { e.preventDefault(); pick(n - 1); }
    else if (e.key === 'ArrowRight' || e.key === 'Enter') move(1);
    else if (e.key === 'ArrowLeft') move(-1);
  };
  document.addEventListener('keydown', onKey);
  cleanup = () => { clearInterval(timer); document.removeEventListener('keydown', onKey); };

  const wrong = () => Object.entries(S.ans).filter(([i, a]) => a !== S.questions[i].correct).length;
  const right = () => Object.entries(S.ans).filter(([i, a]) => a === S.questions[i].correct).length;

  function render() {
    const q = S.questions[S.i], chosen = S.ans[S.i], answered = chosen !== undefined;
    const done = Object.keys(S.ans).length, total = S.questions.length;
    const visible = S.questions.map((x, n) => ({ x, n })).filter(({ n }) => !paged || Math.floor(n / BLOCK) === Math.floor(S.i / BLOCK));
    $app.innerHTML = `<div class="testwrap">
    <div class="exam-top"><span class="count">${esc(S.title)} — savol ${S.i + 1} / ${total}</span>
      <span class="right">${S.mode === 'exam' ? `<span class="timer" id="timer">${fmt(S.left)}</span>` : ''}${S.mode === 'exam' && done < total ? `<button class="ghost" id="endBtn">Yakunlash</button>` : ''}<button class="ghost" id="exitBtn">Chiqish</button></span></div>
    <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${done}"><i style="width:${done / total * 100}%"></i></div>
    <div class="numstrip grid2">${paged ? `<button id="blkPrev" ${S.i < BLOCK ? 'disabled' : ''} aria-label="Oldingi 50">‹</button>` : ''}${visible.map(({ x, n }) => { const a = S.ans[n]; const c = a === undefined ? '' : (a === x.correct ? 'g' : 'r'); return `<button class="${c} ${n === S.i ? 'cur' : ''}" data-n="${n}" aria-label="${n + 1}-savol">${n + 1}</button>`; }).join('')}${paged ? `<button id="blkNext" ${Math.floor(S.i / BLOCK) >= Math.floor((total - 1) / BLOCK) ? 'disabled' : ''} aria-label="Keyingi 50">›</button><button id="nextOpen" style="padding:0 10px">Javobsiz savolga</button>` : ''}</div>
    <article class="qcard ${q.image ? 'has-img' : ''}">
      ${q.image ? `<div class="qimg">${renderImage(q.image)}</div>` : ''}
      <div class="qbody">
        <h2>${esc(q.question)}</h2>
        <div class="answers">${q.options.map((o, k) => {
          let cls = ''; if (answered) { if (k === q.correct) cls = 'ok'; else if (k === chosen) cls = 'bad'; }
          return `<button class="ans ${cls}" data-k="${k}" ${answered ? 'disabled' : ''}><span class="k">F${k + 1}</span><span>${esc(o)}</span></button>`;
        }).join('')}</div>
        ${answered ? `<div class="verdict-line ${chosen === q.correct ? 'ok' : 'bad'}">${chosen === q.correct ? "✓ To'g'ri javob" : "✕ Noto'g'ri javob"}</div>` : ''}
        ${S.mode !== 'exam' || answered ? `<button class="sharh-btn ai" id="aiBtn">🤖 AI tushuntirsin</button>` : ''}
        ${q.explanation && (S.mode !== 'exam' || answered) ? `<button class="sharh-btn" id="expBtn" aria-expanded="${!!S.showExp[S.i]}">${S.showExp[S.i] ? 'Sharhni yashirish' : "💡 Sharhni ko'rish"}</button>${S.showExp[S.i] ? `<div class="explain fade">${esc(q.explanation)}</div>` : ''}` : ''}
      </div>
    </article>
    <div class="nav">
      <button class="btn secondary" id="prevBtn" ${S.i === 0 ? 'disabled' : ''}>Oldingi</button>
      ${paged ? `<span class="muted" style="align-self:center;font-size:14px">To'g'ri: ${right()} · xato: ${wrong()} · javob berildi: ${done}</span>` : ''}
      ${done === total ? `<button class="btn" id="finBtn">Natijani ko'rish</button>` : `<button class="btn" id="nextBtn" ${S.i === total - 1 ? 'disabled' : ''}>Keyingi</button>`}
    </div>
    <p class="keyhint">Klaviatura: F1–F4 yoki 1–4 — javob tanlash, ← → — savollar orasida o'tish.</p></div>`;
    $app.querySelectorAll('.ans').forEach(b => b.onclick = () => pick(+b.dataset.k));
    $app.querySelectorAll('.numstrip button[data-n]').forEach(b => b.onclick = () => { S.i = +b.dataset.n; render(); });
    document.getElementById('prevBtn').onclick = () => move(-1);
    const nb = document.getElementById('nextBtn'); if (nb) nb.onclick = () => move(1);
    const fb = document.getElementById('finBtn'); if (fb) fb.onclick = finish;
    const ab = document.getElementById('aiBtn'); if (ab) ab.onclick = () => aiExplain(q, chosen);
    const xb = document.getElementById('expBtn'); if (xb) xb.onclick = () => { S.showExp[S.i] = !S.showExp[S.i]; render(); };
    if (paged) {
      document.getElementById('blkPrev').onclick = () => { S.i = Math.max(0, (Math.floor(S.i / BLOCK) - 1) * BLOCK); render(); };
      document.getElementById('blkNext').onclick = () => { S.i = Math.min(total - 1, (Math.floor(S.i / BLOCK) + 1) * BLOCK); render(); };
      document.getElementById('nextOpen').onclick = () => {
        const n = S.questions.findIndex((q, k) => k > S.i && S.ans[k] === undefined);
        const m = n >= 0 ? n : S.questions.findIndex((q, k) => S.ans[k] === undefined);
        if (m >= 0) { S.i = m; render(); }
      };
    }
    const eb = document.getElementById('endBtn'); if (eb) eb.onclick = () => { if (confirm('Imtihonni hozir yakunlaysizmi? Javob berilmagan savollar xato hisoblanadi.')) finish(); };
    document.getElementById('exitBtn').onclick = () => { if (S.mode === 'marathon' || !done || confirm('Chiqsangiz, natija saqlanmaydi. Chiqasizmi?')) go('/'); };
  }
  function pick(k) {
    const q = S.questions[S.i];
    if (S.done || S.ans[S.i] !== undefined || k >= q.options.length) return;
    S.ans[S.i] = k; progress.incAnswered();
    if (S.mode === 'marathon') { const mm = store.get('marathon', null); if (mm) { mm.ans[q.id] = k; mm.res[q.id] = k === q.correct ? 1 : 0; store.set('marathon', mm); } }
    if (k !== q.correct) progress.addMistake(q.id); else if (S.mode === 'mistakes') progress.removeMistake(q.id);
    render();
    if (S.mode === 'exam' && wrong() > S.maxErrors) { S.done = true; setTimeout(finish, 1300); }
  }
  function move(d) {
    const n = S.i + d; if (n < 0 || n >= S.questions.length) return;
    S.i = n; render(); window.scrollTo(0, 0);
  }
  function finish() {
    if (curKey() !== S.hash) return;
    if (cleanup) { cleanup(); cleanup = null; }
    S.done = true;
    const total = S.questions.length, r = right(), answeredAll = Object.keys(S.ans).length === total;
    const w = total - r;
    let verdict, color = 'var(--ink)';
    if (S.mode === 'exam') {
      const passed = answeredAll && wrong() <= S.maxErrors;
      progress.saveExam(r, passed);
      verdict = passed ? "Imtihondan o'tdingiz" : wrong() > S.maxErrors ? `O'ta olmadingiz: ${S.maxErrors} tadan ko'p xato` : S.left <= 0 ? 'Vaqt tugadi' : 'Imtihon yakunlanmadi';
      color = passed ? 'var(--green)' : 'var(--red)';
    } else {
      if (S.mode === 'ticket') progress.saveTicket(S.ticket, r, total);
      verdict = w === 0 ? "Barcha javoblar to'g'ri" : `${w} ta xato`;
      color = w <= 2 ? 'var(--green)' : 'var(--ink)';
    }
    const wrongList = S.questions.map((q, i) => ({ q, a: S.ans[i] })).filter(x => x.a !== x.q.correct);
    $app.innerHTML = `<section class="result fade"><div class="panel result-card">
      <div class="big display" style="color:${color}">${r}/${total}</div>
      <div class="verdict display">${verdict}</div>
      <div class="actions">
        ${S.mode === 'exam' ? `<a class="btn" href="${H}/imtihon">Yana topshirish</a>` : ''}
        ${S.mode === 'marathon' ? `<a class="btn" href="${H}/marafon">Marafon sahifasi</a>` : ''}
        ${S.mode === 'ticket' && META && S.ticket < META.tickets ? `<a class="btn" href="${H}/bilet/${S.ticket + 1}">Keyingi bilet</a>` : ''}${S.mode === 'ticket' ? `<a class="btn secondary" href="${H}/biletlar">Barcha biletlar</a>` : ''}
        ${progress.mistakes().length ? `<a class="btn secondary" href="${H}/xatolar">Xatolar ustida ishlash</a>` : ''}
        <a class="btn secondary" href="${H}/">Bosh sahifa</a>
      </div></div></section>
      ${wrongList.length ? `<h2 class="h2">Xato yoki javobsiz qolgan savollar</h2><div class="review">${wrongList.map(x => `<div class="explain"><b>${esc(x.q.question)}</b>To'g'ri javob: ${esc(x.q.options[x.q.correct])}.${x.q.explanation ? ' ' + esc(x.q.explanation) : ''}</div>`).join('')}</div>` : ''}`;
    window.scrollTo(0, 0);
  }
  render();
}
window.addEventListener('resize', () => { const car = document.getElementById('car'); if (car) { const road = car.parentElement; const now = +road.getAttribute('aria-valuenow'), max = +road.getAttribute('aria-valuemax'); car.style.left = (6 + (now / max) * (road.clientWidth - 80)) + 'px'; } });

/* ================= Marafon ================= */
function newMarathon(mix) {
  store.set('marathon', { mix: !!mix, ids: [], ans: {}, res: {}, started: Date.now() });
  go('/marafon-yechish');
}
async function marathonIntro() {
  const m = await meta(), mm = store.get('marathon', null);
  const answered = mm ? Object.keys(mm.ans).length : 0;
  const right = mm ? Object.values(mm.res).filter(Boolean).length : 0;
  $app.innerHTML = `<div class="page-head"><h1>Marafon</h1><p>Bazadagi barcha ${m.total} ta savolni bitta sessiyada, ketma-ket yeching. Har bir javob avtomatik saqlanadi: sahifani yopib, keyinroq xuddi shu joydan davom ettirishingiz mumkin. Yangi savollar qo'shilsa, ular marafon oxiriga qo'shiladi.</p></div>
  ${mm ? `<div class="stats" style="margin-top:0;margin-bottom:24px">
      <div><b>${answered}/${m.total}</b><span>javob berilgan</span></div>
      <div><b>${right}</b><span>to'g'ri</span></div>
      <div><b>${answered - right}</b><span>xato</span></div>
      <div><b>${answered ? Math.round(right / answered * 100) + '%' : '—'}</b><span>aniqlik</span></div></div>
    <div class="cta" style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn" href="${H}/marafon-yechish">${answered ? 'Davom ettirish' : 'Boshlash'}</a>
      <button class="btn secondary" id="restartSeq">Boshidan boshlash</button><button class="btn secondary" id="restartMix">Aralash tartibda boshlash</button></div>`
  : `<div class="cta" style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" id="restartSeq">Tartib bo'yicha boshlash</button><button class="btn secondary" id="restartMix">Aralash tartibda boshlash</button></div>`}`;
  const ok = () => !answered || confirm("Joriy marafon natijalari o'chiriladi. Davom etasizmi?");
  document.getElementById('restartSeq').onclick = () => ok() && newMarathon(false);
  document.getElementById('restartMix').onclick = () => ok() && newMarathon(true);
}
async function marathon() {
  let mm = store.get('marathon', null);
  if (!mm) { mm = { mix: false, ids: [], ans: {}, res: {}, started: Date.now() }; }
  const d = await api('/all');
  const byId = new Map(d.questions.map(q => [q.id, q]));
  let ids = mm.ids.filter(id => byId.has(id));
  const known = new Set(ids);
  const fresh = d.questions.map(q => q.id).filter(id => !known.has(id));
  ids = ids.concat(mm.mix ? shuffle(fresh) : fresh);
  mm.ids = ids;
  for (const k of Object.keys(mm.ans)) if (!byId.has(+k)) { delete mm.ans[k]; delete mm.res[k]; }
  store.set('marathon', mm);
  if (!ids.length) { $app.innerHTML = `<div class="page-head"><h1>Marafon</h1></div><div class="empty">Bazada hali savollar yo'q.</div>`; return; }
  runTest({ title: 'Marafon', questions: ids.map(id => byId.get(id)), mode: 'marathon', saved: mm.ans });
}

/* ================= Viktorina ================= */
const QUIZ_N = 10, QUIZ_SEC = 15;
function quizIntro() {
  const best = store.get('quizBest', 0);
  $app.innerHTML = `<div class="page-head"><h1>Viktorina</h1><p>${QUIZ_N} ta savol, har biriga ${QUIZ_SEC} soniya. To'g'ri javob uchun 10 ball va qolgan har bir soniya uchun yana 1 ball beriladi.</p></div>
  <a class="btn" href="${H}/viktorina-boshlash">Boshlash</a>
  <div class="stats"><div><b>${best}</b><span>eng yuqori ball</span></div><div><b>${QUIZ_N * (10 + QUIZ_SEC)}</b><span>mumkin bo'lgan maksimum</span></div></div>`;
}
async function quiz() {
  const d = await api('/quiz?count=' + QUIZ_N);
  const Q = d.questions; let i = 0, score = 0, rightN = 0, t0 = 0, raf = 0, locked = false, nextT = null;
  cleanup = () => { cancelAnimationFrame(raf); clearTimeout(nextT); };
  function show() {
    const q = Q[i]; locked = false;
    $app.innerHTML = `<div class="testwrap"><div class="quiz-top"><span>${i + 1} / ${Q.length}</span><span class="quiz-score">${score}</span></div>
      <div class="fuse" id="fuse"><i></i></div>
      <article class="qcard ${q.image ? 'has-img' : ''}">${q.image ? `<div class="qimg">${renderImage(q.image)}</div>` : ''}<div class="qbody"><h2>${esc(q.question)}</h2>
      <div class="answers">${q.options.map((o, k) => `<button class="ans" data-k="${k}"><span class="k">F${k + 1}</span><span>${esc(o)}</span></button>`).join('')}</div>
      <div id="qfb"></div></div></article></div>`;
    $app.querySelectorAll('.ans').forEach(b => b.onclick = () => answer(+b.dataset.k));
    t0 = performance.now(); tick();
  }
  function tick() {
    const left = QUIZ_SEC - (performance.now() - t0) / 1000;
    const f = document.getElementById('fuse'); if (!f) return;
    f.firstElementChild.style.width = Math.max(0, left / QUIZ_SEC * 100) + '%';
    f.classList.toggle('low', left < 5);
    if (left <= 0) return answer(-1);
    raf = requestAnimationFrame(tick);
  }
  function answer(k) {
    if (locked) return; locked = true; cancelAnimationFrame(raf);
    const q = Q[i], left = Math.max(0, Math.ceil(QUIZ_SEC - (performance.now() - t0) / 1000));
    progress.incAnswered();
    if (k === q.correct) { score += 10 + left; rightN++; } else progress.addMistake(q.id);
    $app.querySelectorAll('.ans').forEach(b => { const kk = +b.dataset.k; b.disabled = true; if (kk === q.correct) b.classList.add('ok'); else if (kk === k) b.classList.add('bad'); });
    document.getElementById('qfb').innerHTML = `<div class="explain"><b>${k === q.correct ? `+${10 + left} ball` : k === -1 ? 'Vaqt tugadi' : "Noto'g'ri"}</b>${esc(q.explanation || '')}</div>`;
    document.querySelector('.quiz-score').textContent = score;
    nextT = setTimeout(() => { i++; i < Q.length ? show() : end(); }, k === q.correct ? 1300 : 2600);
  }
  function end() {
    const best = store.get('quizBest', 0), record = score > best;
    if (record) store.set('quizBest', score);
    $app.innerHTML = `<section class="result fade"><div class="panel result-card"><div class="big display">${score}</div>
      <div class="verdict display">${record ? 'Yangi rekord' : `${rightN} ta to'g'ri javob`}</div>
      <p class="muted">Eng yuqori ball: ${Math.max(best, score)}</p>
      <div class="actions"><a class="btn" href="${H}/viktorina-boshlash">Yana o'ynash</a><a class="btn secondary" href="${H}/">Bosh sahifa</a></div></div></section>`;
  }
  show();
}

/* ================= Instruktorlar ================= */
const phoneFmt = p => '+998 ' + String(p).replace(/(\d{2})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4');
const initials = n => n.split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase();
async function instructors() {
  const all = await api('/instructors');
  let g = '';
  const draw = () => {
    const list = all.filter(i => !g || i.gender === g);
    $app.innerHTML = `<div class="page-head"><h1>Instruktorlar</h1><p>Haydashni o'rgatuvchi instruktorni tanlang va to'g'ridan-to'g'ri bog'laning: telefon yoki Telegram orqali.</p></div>
    <div class="chips">
      ${[['', 'Barchasi'], ['erkak', 'Erkak instruktor'], ['ayol', 'Ayol instruktor']].map(([k, n]) => `<button class="chip ${g === k ? 'on' : ''}" data-g="${k}">${n}</button>`).join('')}
    </div>
    ${list.length ? `<div class="instr-grid">${list.map(i => `<article class="instr panel">
      <div class="instr-photo">${i.photo ? `<img src="${esc(i.photo)}" alt="${esc(i.name)}" loading="lazy">` : `<span>${esc(initials(i.name))}</span>`}</div>
      <span class="instr-tag ${i.gender}">${i.gender === 'ayol' ? 'Ayol instruktor' : 'Erkak instruktor'}</span>
      <h3>${esc(i.name)}</h3>
      ${i.city ? `<p class="muted instr-city">${esc(i.city)}</p>` : ''}
      <dl class="instr-info">
        <div><dt>Tajribasi</dt><dd>${i.experience} yil</dd></div>
        <div><dt>Mashinasi</dt><dd>${esc(i.car || '—')}</dd></div>
        <div><dt>Bo'sh vaqtlari</dt><dd>${esc(i.schedule || 'kelishiladi')}</dd></div>
        <div><dt>Narxi</dt><dd><b>${somFmt(i.price)}</b> / 1 dars</dd></div>
      </dl>
      <div class="instr-actions">
        <a class="btn" href="tel:+998${esc(i.phone)}">${phoneFmt(i.phone)}</a>
        ${i.telegram ? `<a class="btn secondary" href="https://t.me/${esc(i.telegram)}" target="_blank" rel="noopener">Telegram</a>` : ''}
      </div>
    </article>`).join('')}</div>` : `<div class="empty">Bu filtr bo'yicha instruktor topilmadi. Boshqa filtrni tanlang.</div>`}`;
    $app.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { g = b.dataset.g; draw(); });
  };
  draw();
}

/* ================= Tariflar ================= */
const PAY = { payme: 'Payme', click: 'Click', uzum: 'Uzum Bank' };
async function tarif() {
  ME = null;
  const [p, u] = await Promise.all([api('/plans'), me()]);
  let sel = 'month';
  const draw = () => {
    $app.innerHTML = `<div class="page-head"><h1>Tariflar</h1><p>Bepul tarif doimo ishlaydi. Premium barcha biletlar, marafon, viktorina va xatolar ustida ishlashni ochadi.</p></div>
    ${u.premium ? `<div class="panel premium-on">✓ Premium faol: ${new Date(u.premium_until).toLocaleDateString('ru-RU')} gacha</div>` : ''}
    <div class="plans">
      <div class="panel plan free"><h3>Bepul</h3><div class="price">0 so'm</div>
        <ul><li>1–${p.free.tickets}-biletlar</li><li>Kuniga ${p.free.examsPerDay} ta imtihon</li><li>Mavzular bo'yicha mashq</li><li>Qo'llanma va belgilar</li></ul>
        <span class="muted">${u.premium ? '' : 'Joriy tarif'}</span></div>
      ${Object.entries(p.plans).map(([k, v]) => `<button class="panel plan ${sel === k ? 'sel' : ''}" data-plan="${k}">${k === 'month' ? '<span class="best">Ommabop</span>' : ''}<h3>${v.title}</h3><div class="price">${somFmt(v.price)}</div>
        <ul><li>Barcha ${META ? META.tickets : ''} biletlar</li><li>Cheksiz imtihon</li><li>Marafon va viktorina</li><li>Xatolar ustida ishlash</li></ul></button>`).join('')}
    </div>
    <h2 class="h2">To'lov usulini tanlang</h2>
    <div class="paybtns">${Object.entries(PAY).map(([k, n]) => `<button class="paybtn" data-pay="${k}" ${p.providers[k] ? '' : 'disabled'}><img src="/assets/pay/${k}.svg" alt="${n}" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'payname',textContent:'${n}'}))">${p.providers[k] ? '' : '<small>tez orada</small>'}</button>`).join('')}</div>
    <p class="muted" style="font-size:13px;margin-top:16px">To'lovdan so'ng premium shu qurilmada avtomatik yoqiladi. Qurilma ID: <code>${DEVICE}</code> — muammo bo'lsa, shu raqamni qo'llab-quvvatlash xizmatiga yuboring.</p>`;
    $app.querySelectorAll('[data-plan]').forEach(b => b.onclick = () => { sel = b.dataset.plan; draw(); });
    $app.querySelectorAll('[data-pay]').forEach(b => b.onclick = async () => {
      if (p.demo) { alert("Bu namunaviy sahifa. To'lov o'z serveringizdagi saytda ishlaydi."); return; }
      b.disabled = true;
      try { const o = await api('/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: sel, provider: b.dataset.pay, device: DEVICE }) }); location.href = o.url; }
      catch (e) { alert(e.message); b.disabled = false; }
    });
  };
  draw();
}

/* ================= Qo'llanma ================= */
async function guide() {
  const list = await api('/guide');
  $app.innerHTML = `<div class="page-head"><h1>Qo'llanma</h1><p>Qoidalarni boblar bo'yicha o'qing. Har bir bob oxirida shu mavzu bo'yicha mashq qilishingiz mumkin.</p></div>
  <div class="chapters">${list.map((c, i) => `<a class="chapter" href="${H}/bob/${c.id}"><span class="n">${i + 1}</span><span><b>${esc(c.title)}</b><small>${esc(c.summary)}</small></span></a>`).join('')}</div>`;
}
async function chapter(id) {
  const [list, c] = await Promise.all([api('/guide'), api('/guide/' + encodeURIComponent(id))]);
  const idx = list.findIndex(x => x.id === id), next = list[idx + 1];
  $app.innerHTML = `<div class="page-head"><p class="muted" style="margin:0 0 8px"><a href="${H}/qollanma">Qo'llanma</a> / ${idx + 1}-bob</p><h1>${esc(c.title)}</h1></div>
  <article class="guide">${c.sections.map(s => `<h2>${esc(s.h)}</h2>${(s.p || []).map(p => `<p>${esc(p)}</p>`).join('')}${s.list ? `<ul>${s.list.map(l => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}`).join('')}
    <div class="guide-foot">${c.topic ? `<a class="btn" href="${H}/mavzu/${c.topic}">Shu mavzu bo'yicha mashq</a>` : ''}${next ? `<a class="btn secondary" href="${H}/bob/${next.id}">Keyingi bob: ${esc(next.title)}</a>` : ''}</div>
  </article>`;
}

/* ================= Belgilar katalogi ================= */
function signs(filter) {
  const groups = [...new Set(Object.values(SIGNS).map(s => s.g))];
  const draw = g => {
    $app.querySelector('.signs').innerHTML = Object.entries(SIGNS).filter(([, s]) => !g || s.g === g)
      .map(([, s]) => `<div class="sign-card">${s.svg}<b>${esc(s.n)}</b><small>${esc(s.g)}</small></div>`).join('');
    $app.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', (c.dataset.g || '') === (g || '')));
  };
  $app.innerHTML = `<div class="page-head"><h1>Yo'l belgilari</h1><p>Belgilarni shakli va rangidan tanib olishni o'rganing. Batafsil tushuntirish qo'llanmaning \"Yo'l belgilari\" bobida.</p></div>
  <div class="chips"><button class="chip" data-g="">Barchasi</button>${groups.map(g => `<button class="chip" data-g="${esc(g)}">${esc(g)}</button>`).join('')}</div>
  <div class="signs"></div>`;
  $app.querySelectorAll('.chip').forEach(c => c.onclick = () => draw(c.dataset.g));
  draw(filter || '');
}


/* ================= AI yordamchi ================= */
const AIC = { open: false, busy: false, msgs: [] };
let sampleNS;
async function aiAsk(messages) {
  if (!USE_PATH) { // Claude ichidagi namunaviy sahifa
    if (sampleNS === undefined) sampleNS = window.claude ? await window.claude.use('sample') : null;
    if (!sampleNS) throw new Error("AI bu ko'rinishda mavjud emas");
    const sys = "Sen pravauchun.uz saytining yordamchisisan: O'zbekiston Yo'l harakati qoidalari, belgilar, chorrahalar va haydovchilik imtihoni bo'yicha foydalanuvchi tilida (odatda o'zbek, lotin) qisqa va tushunarli javob ber (2–6 gap). Raqamga ishonching komil bo'lmasa, rasmiy YHQ matnini tekshirishni tavsiya qil. Mavzudan tashqari savollarga javob berma.";
    const conv = messages.map((m, i) => ({ role: m.role, content: i === 0 ? sys + "\n\n" + m.content : m.content }));
    const r = await sampleNS(conv, { modelTier: 'quick', cache: false });
    return r.text;
  }
  const r = await api('/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages }) });
  return r.text;
}
const mdLite = t => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').split(/\n{2,}/).map(p => /^[-•*] /m.test(p) ? '<ul>' + p.split('\n').filter(Boolean).map(l => `<li>${l.replace(/^[-•*]\s*/, '')}</li>`).join('') + '</ul>' : `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
function aiMount() {
  if (document.getElementById('aiFab')) return;
  document.body.insertAdjacentHTML('beforeend', `
  <button id="aiFab" class="ai-fab" aria-label="AI yordamchi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01"/></svg><span>AI yordamchi</span></button>
  <section id="aiPanel" class="ai-panel hidden" role="dialog" aria-label="AI yordamchi">
    <header><b>AI yordamchi</b><small>YHQ bo'yicha savol bering</small><button id="aiClose" aria-label="Yopish">✕</button></header>
    <div id="aiLog" class="ai-log"></div>
    <form id="aiForm" class="ai-form"><textarea id="aiInput" rows="1" placeholder="Masalan: tramvay qachon ustun bo'ladi?" maxlength="1500"></textarea><button class="btn" id="aiSend">Yuborish</button></form>
    <p class="ai-note">Javoblarni sun'iy intellekt yozadi va xato bo'lishi mumkin. Muhim qoidalarni rasmiy YHQ bilan tekshiring.</p>
  </section>`);
  document.getElementById('aiFab').onclick = () => aiToggle(true);
  document.getElementById('aiClose').onclick = () => aiToggle(false);
  document.getElementById('aiForm').onsubmit = e => { e.preventDefault(); const v = document.getElementById('aiInput').value.trim(); if (v) aiSend(v); };
  document.getElementById('aiInput').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); document.getElementById('aiForm').requestSubmit(); } });
  aiRender();
}
function aiToggle(v) { AIC.open = v; document.getElementById('aiPanel').classList.toggle('hidden', !v); document.getElementById('aiFab').classList.toggle('hidden', v); if (v) setTimeout(() => document.getElementById('aiInput').focus(), 50); }
function aiRender() {
  const log = document.getElementById('aiLog'); if (!log) return;
  const tips = ["O'ng tomon qoidasi nima?", "Tramvay qachon ustun bo'ladi?", "Qayerda quvib o'tish taqiqlanadi?"];
  log.innerHTML = (AIC.msgs.length ? AIC.msgs.map(m => `<div class="ai-msg ${m.role}">${m.role === 'user' ? esc(m.show || m.content).replace(/\n/g, '<br>') : mdLite(m.content)}</div>`).join('')
    : `<div class="ai-msg assistant"><p>Salom! Men yo'l harakati qoidalari bo'yicha yordamchiman. Savolingizni yozing yoki quyidagilardan birini tanlang.</p></div><div class="ai-tips">${tips.map(t => `<button data-tip="${esc(t)}">${esc(t)}</button>`).join('')}</div>`)
    + (AIC.busy ? '<div class="ai-msg assistant typing"><span></span><span></span><span></span></div>' : '');
  log.querySelectorAll('[data-tip]').forEach(b => b.onclick = () => aiSend(b.dataset.tip));
  log.scrollTop = log.scrollHeight;
  const send = document.getElementById('aiSend'); if (send) send.disabled = AIC.busy;
}
async function aiSend(text, show) {
  if (AIC.busy) return;
  AIC.msgs.push({ role: 'user', content: text, show }); AIC.busy = true;
  const inp = document.getElementById('aiInput'); if (inp) inp.value = '';
  aiRender();
  try { const ans = await aiAsk(AIC.msgs.slice(-12).map(({ role, content }) => ({ role, content }))); AIC.msgs.push({ role: 'assistant', content: ans || '...' }); }
  catch (e) { AIC.msgs.push({ role: 'assistant', content: e.paywall ? e.message + ". Premium tarifda kuniga 100 ta savol berish mumkin." : (e.message || 'Xatolik yuz berdi') }); }
  AIC.busy = false; aiRender();
}
function aiExplain(q, chosen) {
  aiMount(); aiToggle(true);
  const text = `Ushbu test savolini tushuntirib bering.\nSavol: ${q.question}\nVariantlar:\n${q.options.map((o, k) => `F${k + 1}. ${o}`).join('\n')}\nTo'g'ri javob: F${q.correct + 1}. ${q.options[q.correct]}${chosen !== undefined && chosen !== q.correct ? `\nMen F${chosen + 1} ni tanladim — nima uchun bu noto'g'ri?` : ''}${q.image && q.image.startsWith('scene:') ? '\n(Savolda chorraha rasmi bor; vaziyat matnda tasvirlangan.)' : ''}`;
  aiSend(text, `«${q.question.slice(0, 90)}${q.question.length > 90 ? '…' : ''}» savolini tushuntirib bering`);
}
aiMount();

router();
