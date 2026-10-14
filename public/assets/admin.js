'use strict';
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Token faqat xotirada: sahifa ochilganda/yangilanganda har safar parol so'raladi
let token = '';
let TOPICS = [], page = 1, items = [], editing = null, customImage = '', curAudio = '';

function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
}
async function api(path, opts = {}) {
  opts.headers = { ...(opts.headers || {}), Authorization: 'Bearer ' + token };
  if (opts.json !== undefined) { opts.body = JSON.stringify(opts.json); opts.headers['Content-Type'] = 'application/json'; delete opts.json; }
  const r = await fetch('/api' + path, opts);
  const data = await r.json().catch(() => ({}));
  if (r.status === 401 && path !== '/admin/login') { logout(); throw new Error('Sessiya tugadi, qayta kiring'); }
  if (!r.ok) throw new Error(data.error || 'Xatolik');
  return data;
}
function logout() { token = ''; showLogin(); }
function showLogin() {
  ['panel', 'instrPanel', 'ticketPanel', 'tabs', 'logoutBtn'].forEach(id => $(id).classList.add('hidden'));
  ['editDlg', 'instrDlg'].forEach(id => $(id).open && $(id).close());
  $('login').classList.remove('hidden');
}
async function showPanel() {
  if (!token) return showLogin();
  $('login').classList.add('hidden'); $('panel').classList.remove('hidden'); $('instrPanel').classList.add('hidden'); $('ticketPanel').classList.add('hidden'); $('logoutBtn').classList.remove('hidden');
  document.querySelectorAll('#tabs .chip').forEach(c => c.classList.toggle('on', c.dataset.tab === 'panel'));
  TOPICS = await (await fetch('/api/topics')).json();
  const opts = TOPICS.map(t => `<option value="${t.id}">${esc(t.title)}</option>`).join('');
  $('topicFilter').innerHTML = '<option value="">Barcha mavzular</option>' + opts;
  $('fTopic').innerHTML = opts;
  $('fImage').innerHTML = '<option value="">Rasmsiz</option>' + Object.entries(SIGNS).map(([k, s]) => `<option value="sign:${k}">Belgi: ${esc(s.n)}</option>`).join('') + '<option value="__custom">Yuklangan rasm</option>';
  $('tabs').classList.remove('hidden');
  load();
}

$('loginForm').onsubmit = async e => {
  e.preventDefault(); $('loginErr').textContent = '';
  try {
    const d = await api('/admin/login', { method: 'POST', json: { password: $('pw').value } });
    token = d.token; $('pw').value = ''; showPanel();
  } catch (err) { $('loginErr').textContent = err.message; }
};
$('logoutBtn').onclick = logout;

async function load() {
  const q = new URLSearchParams({ page, q: $('search').value.trim(), topic: $('topicFilter').value, verified: $('verFilter').value });
  try {
    const d = await api('/admin/questions?' + q);
    items = d.items;
    $('statsLine').textContent = `Jami ${d.stats.total} ta savol, ${d.stats.verified || 0} tasi tekshirilgan. Topildi: ${d.total}.`;
    const tname = id => (TOPICS.find(t => t.id === id) || {}).title || id;
    $('rows').innerHTML = items.length ? items.map(it => `<tr>
      <td>${it.id}</td>
      <td>${esc(it.question)}${it.image ? ' <span class="tag">rasm</span>' : ''}${it.audio ? ' <span class="tag">ovoz</span>' : ''}<br><small class="muted">To'g'ri: ${esc(it.options[it.correct])}</small></td>
      <td><small>${esc(tname(it.topic))}</small></td>
      <td><button class="tag ${it.verified ? 'ok' : ''}" style="border:0" data-ver="${it.id}">${it.verified ? 'tekshirilgan' : 'tekshirilmagan'}</button></td>
      <td style="white-space:nowrap"><button class="ghost" data-edit="${it.id}">Tahrirlash</button> <button class="ghost" data-del="${it.id}">O'chirish</button></td></tr>`).join('')
      : `<tr><td colspan="5" class="muted">Hech narsa topilmadi. Qidiruvni o'zgartiring yoki yangi savol qo'shing.</td></tr>`;
    $('pager').innerHTML = d.pages > 1 ? `<button class="btn secondary small" ${page <= 1 ? 'disabled' : ''} data-p="-1">Oldingi</button><span class="muted">${page} / ${d.pages}</span><button class="btn secondary small" ${page >= d.pages ? 'disabled' : ''} data-p="1">Keyingi</button>` : '';
  } catch (err) { toast(err.message); }
}
let st; $('search').oninput = () => { clearTimeout(st); st = setTimeout(() => { page = 1; load(); }, 300); };
$('topicFilter').onchange = $('verFilter').onchange = () => { page = 1; load(); };
$('pager').onclick = e => { const b = e.target.closest('[data-p]'); if (b) { page += +b.dataset.p; load(); } };
$('rows').onclick = async e => {
  const b = e.target.closest('button'); if (!b) return;
  const id = +(b.dataset.edit || b.dataset.del || b.dataset.ver);
  const it = items.find(x => x.id === id);
  if (b.dataset.edit) openEditor(it);
  if (b.dataset.del && confirm(`${id}-savolni o'chirasizmi? Bu amalni qaytarib bo'lmaydi.`)) {
    try { await api('/admin/questions/' + id, { method: 'DELETE' }); toast("Savol o'chirildi"); load(); } catch (err) { toast(err.message); }
  }
  if (b.dataset.ver) {
    try { await api(`/admin/questions/${id}/verified`, { method: 'PATCH', json: { verified: !it.verified } }); load(); } catch (err) { toast(err.message); }
  }
};

/* ---- Tahrirlash oynasi ---- */
function optRow(text = '', checked = false) {
  const d = document.createElement('div'); d.className = 'opt-row';
  d.innerHTML = `<input type="radio" name="correct" ${checked ? 'checked' : ''} aria-label="To'g'ri javob"><input type="text" value="${esc(text)}" required><button type="button" class="ghost" aria-label="Variantni o'chirish">×</button>`;
  d.querySelector('button').onclick = () => { if ($('fOptions').children.length > 2) d.remove(); };
  $('fOptions').appendChild(d);
}
function preview(img) {
  const p = $('fPreview'); const html = img ? renderImage(img) : '';
  p.innerHTML = html; p.classList.toggle('hidden', !html);
}
function setAudio(url) {
  curAudio = url || '';
  $('fAudioBox').classList.toggle('hidden', !curAudio);
  const a = $('fAudioPrev'); a.pause();
  if (curAudio) a.src = curAudio; else a.removeAttribute('src');
}
function openEditor(it) {
  editing = it || null; customImage = '';
  setAudio(it ? it.audio : ''); $('fAudio').value = '';
  $('dlgTitle').textContent = it ? `${it.id}-savolni tahrirlash` : 'Yangi savol';
  $('fTopic').value = it ? it.topic : TOPICS[0].id;
  $('fQuestion').value = it ? it.question : '';
  $('fExpl').value = it ? it.explanation : '';
  $('fVerified').checked = it ? it.verified : false;
  $('fOptions').innerHTML = '';
  (it ? it.options : ['', '', '', '']).forEach((o, k) => optRow(o, it ? k === it.correct : k === 0));
  const img = it ? it.image : '';
  if (img && !img.startsWith('sign:')) { customImage = img; $('fImage').value = '__custom'; } else $('fImage').value = img || '';
  $('fUpload').value = ''; preview(img); $('formErr').textContent = '';
  $('editDlg').showModal();
}
$('addBtn').onclick = () => token && openEditor(null);
$('addOpt').onclick = () => { if ($('fOptions').children.length < 6) optRow(); };
$('cancelBtn').onclick = () => $('editDlg').close();
$('fImage').onchange = () => preview($('fImage').value === '__custom' ? customImage : $('fImage').value);
$('fUpload').onchange = async () => {
  const f = $('fUpload').files[0]; if (!f) return;
  const fd = new FormData(); fd.append('image', f);
  try { const d = await api('/admin/upload', { method: 'POST', body: fd }); customImage = d.url; $('fImage').value = '__custom'; preview(customImage); toast('Rasm yuklandi'); }
  catch (err) { $('formErr').textContent = err.message; }
};
$('fAudio').onchange = async () => {
  const f = $('fAudio').files[0]; if (!f) return;
  const fd = new FormData(); fd.append('audio', f);
  toast('Audio yuklanmoqda…');
  try { const d = await api('/admin/upload-audio', { method: 'POST', body: fd }); setAudio(d.url); toast('Audio yuklandi'); }
  catch (err) { $('formErr').textContent = err.message; }
  $('fAudio').value = '';
};
$('fAudioDel').onclick = () => setAudio('');
$('editDlg').addEventListener('close', () => $('fAudioPrev').pause());
$('editForm').onsubmit = async e => {
  e.preventDefault();
  const rows = [...$('fOptions').children];
  const body = {
    topic: $('fTopic').value, question: $('fQuestion').value.trim(), explanation: $('fExpl').value.trim(),
    options: rows.map(r => r.querySelector('input[type=text]').value.trim()),
    correct: rows.findIndex(r => r.querySelector('input[type=radio]').checked),
    image: $('fImage').value === '__custom' ? customImage : $('fImage').value,
    audio: curAudio,
    verified: $('fVerified').checked
  };
  if (body.correct < 0) { $('formErr').textContent = "To'g'ri javobni belgilang"; return; }
  try {
    if (editing) await api('/admin/questions/' + editing.id, { method: 'PUT', json: body });
    else await api('/admin/questions', { method: 'POST', json: body });
    $('editDlg').close(); toast(editing ? 'Saqlandi' : "Savol qo'shildi"); load();
    if (!$('ticketPanel').classList.contains('hidden')) loadTickets(curTicket);
  } catch (err) { $('formErr').textContent = err.message; }
};

/* ---- Import / eksport ---- */
$('importBtn').onclick = () => $('importFile').click();
$('importFile').onchange = async () => {
  const f = $('importFile').files[0]; if (!f) return;
  try {
    const list = JSON.parse(await f.text());
    if (!confirm(`${Array.isArray(list) ? list.length : '?'} ta savol qo'shiladi. Davom etasizmi?`)) return;
    const d = await api('/admin/import', { method: 'POST', json: list });
    toast(`${d.added} ta savol qo'shildi`); page = 1; load();
  } catch (err) { toast(err instanceof SyntaxError ? "Fayl JSON formatida emas" : err.message); }
  $('importFile').value = '';
};
$('exportBtn').onclick = async () => {
  try {
    const r = await fetch('/api/admin/export', { headers: { Authorization: 'Bearer ' + token } });
    if (!r.ok) throw new Error('Eksport qilinmadi');
    const url = URL.createObjectURL(await r.blob());
    const a = document.createElement('a'); a.href = url; a.download = 'savollar.json'; a.click(); URL.revokeObjectURL(url);
  } catch (err) { toast(err.message); }
};

showLogin();

/* ---- Instruktorlar ---- */
let instrs = [], editI = null, iPhoto = '';
document.querySelectorAll('#tabs [data-tab]').forEach(b => b.onclick = () => {
  document.querySelectorAll('#tabs .chip').forEach(c => c.classList.toggle('on', c === b));
  $('panel').classList.toggle('hidden', b.dataset.tab !== 'panel');
  $('instrPanel').classList.toggle('hidden', b.dataset.tab !== 'instrPanel');
  $('ticketPanel').classList.toggle('hidden', b.dataset.tab !== 'ticketPanel');
  if (b.dataset.tab === 'instrPanel') loadInstr();
  if (b.dataset.tab === 'ticketPanel') { closeTicket(); loadTickets(); }
});
async function loadInstr() {
  try {
    instrs = await api('/admin/instructors');
    $('instrRows').innerHTML = instrs.length ? instrs.map(i => `<tr>
      <td>${i.photo ? `<img src="${esc(i.photo)}" alt="" style="width:36px;height:36px;border-radius:50%;object-fit:cover">` : ''}</td>
      <td>${esc(i.name)}<br><small class="muted">${esc(i.car)}</small></td><td>${i.gender}</td><td>${i.experience} yil</td>
      <td>${Number(i.price).toLocaleString('ru-RU')}</td><td>+998${esc(i.phone)}${i.telegram ? '<br><small>@' + esc(i.telegram) + '</small>' : ''}</td>
      <td><span class="tag ${i.active ? 'ok' : ''}">${i.active ? 'ko\'rinadi' : 'yashirin'}</span></td>
      <td style="white-space:nowrap"><button class="ghost" data-ie="${i.id}">Tahrirlash</button> <button class="ghost" data-id="${i.id}">O'chirish</button></td></tr>`).join('')
      : '<tr><td colspan="8" class="muted">Hali instruktor yo\'q. "Instruktor qo\'shish" tugmasini bosing.</td></tr>';
  } catch (e) { toast(e.message); }
}
$('instrRows').onclick = async e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.ie) openInstr(instrs.find(x => x.id === +b.dataset.ie));
  if (b.dataset.id && confirm('Instruktorni o\'chirasizmi?')) { try { await api('/admin/instructors/' + b.dataset.id, { method: 'DELETE' }); loadInstr(); } catch (err) { toast(err.message); } }
};
function openInstr(i) {
  editI = i || null; iPhoto = i ? i.photo : '';
  $('instrTitle').textContent = i ? 'Instruktorni tahrirlash' : 'Yangi instruktor';
  $('iName').value = i ? i.name : ''; $('iGender').value = i ? i.gender : 'erkak'; $('iExp').value = i ? i.experience : 1;
  $('iCar').value = i ? i.car : ''; $('iPhone').value = i ? i.phone : '';
  $('iTg').value = i && i.telegram ? '@' + i.telegram : ''; $('iSch').value = i ? i.schedule : ''; $('iPrice').value = i ? i.price : 200000;
  $('iCity').value = i ? i.city : ''; $('iActive').checked = i ? !!i.active : true; $('iPhoto').value = ''; $('iErr').textContent = '';
  $('iPrev').src = iPhoto || ''; $('iPrev').style.display = iPhoto ? 'block' : 'none';
  $('instrDlg').showModal();
}
$('addInstr').onclick = () => token && openInstr(null);
$('iCancel').onclick = () => $('instrDlg').close();
$('iPhoto').onchange = async () => {
  const f = $('iPhoto').files[0]; if (!f) return;
  const fd = new FormData(); fd.append('image', f);
  try { const d = await api('/admin/upload', { method: 'POST', body: fd }); iPhoto = d.url; $('iPrev').src = iPhoto; $('iPrev').style.display = 'block'; }
  catch (e) { $('iErr').textContent = e.message; }
};
$('instrForm').onsubmit = async e => {
  e.preventDefault();
  const body = { name: $('iName').value, gender: $('iGender').value, experience: $('iExp').value, car: $('iCar').value, transmission: 'mexanika',
    phone: $('iPhone').value, telegram: $('iTg').value, schedule: $('iSch').value, price: $('iPrice').value, city: $('iCity').value, photo: iPhoto, active: $('iActive').checked };
  try {
    if (editI) await api('/admin/instructors/' + editI.id, { method: 'PUT', json: body }); else await api('/admin/instructors', { method: 'POST', json: body });
    $('instrDlg').close(); toast('Saqlandi'); loadInstr();
  } catch (err) { $('iErr').textContent = err.message; }
};

/* ---- Biletlar tahlili ---- */
let curTicket = null, tQs = [], tCount = 0;
const realIssues = q => q.issues.filter(x => x !== 'tekshirilmagan');
async function loadTickets(open) {
  try {
    const d = await api('/admin/tickets');
    tCount = d.tickets.length;
    $('tSummary').textContent = `${d.total} ta savol, ${d.tickets.length} ta bilet (har biri ${d.ticketSize} ta).` +
      (d.leftover ? ` ${d.leftover} ta savol hech bir biletga kirmagan.` : '') + ` Kamchiligi bor savollar: ${d.issues} ta.`;
    $('tGrid').innerHTML = d.tickets.map(t => {
      const bad = t.noExpl + t.duplicates + t.badOptions + t.missingImage;
      const cls = bad ? 'fail' : t.verified === d.ticketSize ? 'pass' : '';
      const tip = `Tekshirilgan: ${t.verified}/${d.ticketSize}; izohsiz: ${t.noExpl}; takroriy: ${t.duplicates}; bir xil variant: ${t.badOptions}; rasmi yo'q: ${t.missingImage}; rasmli: ${t.images}\nMavzular: ${t.topics.map(([k, n]) => tname(k) + ' — ' + n).join(', ')}`;
      return `<button class="ticket ${cls}" style="font:inherit;cursor:pointer" data-t="${t.number}" title="${esc(tip)}"><b>${t.number}</b><small>${bad ? bad + ' kamchilik' : t.verified + '/' + d.ticketSize + ' ✓'}</small></button>`;
    }).join('') + (d.leftover ? `<button class="ticket" style="font:inherit;cursor:pointer" data-t="0"><b>+${d.leftover}</b><small>biletsiz</small></button>` : '');
    if (open != null) showTicket(open);
  } catch (e) { toast(e.message); }
}
const tname = id => (TOPICS.find(t => t.id === id) || {}).title || id;
async function showTicket(n) {
  try {
    const d = await api('/admin/tickets/' + n);
    curTicket = n; tQs = d.questions;
    $('tTitle').textContent = n ? `${n}-bilet` : 'Biletga kirmagan savollar';
    ['tGrid', 'tHelp'].forEach(id => $(id).classList.add('hidden')); $('tDetail').classList.remove('hidden');
    $('tPrev').disabled = n <= 1; $('tNext').disabled = !n || n >= tCount;
    renderTicket(); window.scrollTo(0, 0);
  } catch (e) { toast(e.message); }
}
function closeTicket() {
  curTicket = null; $('tDetail').classList.add('hidden'); ['tGrid', 'tHelp'].forEach(id => $(id).classList.remove('hidden'));
}
$('tBack').onclick = closeTicket;
$('tPrev').onclick = () => curTicket > 1 && showTicket(curTicket - 1);
$('tNext').onclick = () => curTicket < tCount && showTicket(curTicket + 1);
function renderTicket() {
  const list = $('tOnlyBad').checked ? tQs.filter(q => realIssues(q).length) : tQs;
  $('tRows').innerHTML = list.length ? list.map(q => `<tr>
    <td>${q.id}</td>
    <td>${esc(q.question)}${q.image ? ' <span class="tag">rasm</span>' : ''}${q.audio ? ' <span class="tag">ovoz</span>' : ''}<br><small class="muted">${esc(tname(q.topic))}</small>
      ${q.image ? `<div class="qimg" style="max-width:260px;margin:6px 0">${renderImage(q.image)}</div>` : ''}
      <ol style="margin:6px 0 0;padding-left:20px;font-size:14px">${q.options.map((o, k) => `<li style="${k === q.correct ? 'color:var(--green);font-weight:600' : ''}">${esc(o)}${k === q.correct ? ' ✓' : ''}</li>`).join('')}</ol>
      ${q.explanation ? `<small class="muted">Izoh: ${esc(q.explanation)}</small>` : ''}
      ${q.audio ? `<audio controls preload="none" src="${esc(q.audio)}" style="display:block;width:100%;max-width:320px;margin-top:6px"></audio>` : ''}
      <div class="ai-out muted" id="ai${q.id}" style="white-space:pre-wrap;font-size:14px"></div></td>
    <td>${q.issues.length ? q.issues.map(x => `<span class="tag" style="${x === 'tekshirilmagan' ? '' : 'color:var(--red)'}">${esc(x)}</span>`).join(' ') : '<span class="tag ok">kamchiliksiz</span>'}</td>
    <td style="white-space:nowrap"><button class="ghost" data-te="${q.id}">Tahrirlash</button> <button class="ghost" data-ai="${q.id}">AI tekshiruv</button></td></tr>`).join('')
    : '<tr><td colspan="4" class="muted">Bu biletda kamchiligi bor savol yo\'q.</td></tr>';
}
$('tOnlyBad').onchange = renderTicket;
$('tGrid').onclick = e => { const b = e.target.closest('[data-t]'); if (b) showTicket(+b.dataset.t); };
$('tRows').onclick = async e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.te) openEditor(tQs.find(q => q.id === +b.dataset.te));
  if (b.dataset.ai) {
    const out = $('ai' + b.dataset.ai); b.disabled = true; out.textContent = 'AI tekshirmoqda…';
    try {
      const d = await api(`/admin/questions/${b.dataset.ai}/ai-check`, { method: 'POST' });
      out.style.color = /^\W*XATO/i.test(d.text) ? 'var(--red)' : /^\W*TO.G.RI/i.test(d.text) ? 'var(--green)' : '';
      out.textContent = d.text;
    } catch (err) { out.textContent = err.message; }
    b.disabled = false;
  }
};
