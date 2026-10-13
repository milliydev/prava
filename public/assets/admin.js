'use strict';
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Token faqat xotirada: sahifa ochilganda/yangilanganda har safar parol so'raladi
let token = '';
let TOPICS = [], page = 1, items = [], editing = null, customImage = '';

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
  ['panel', 'instrPanel', 'tabs', 'logoutBtn'].forEach(id => $(id).classList.add('hidden'));
  ['editDlg', 'instrDlg'].forEach(id => $(id).open && $(id).close());
  $('login').classList.remove('hidden');
}
async function showPanel() {
  if (!token) return showLogin();
  $('login').classList.add('hidden'); $('panel').classList.remove('hidden'); $('instrPanel').classList.add('hidden'); $('logoutBtn').classList.remove('hidden');
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
      <td>${esc(it.question)}${it.image ? ' <span class="tag">rasm</span>' : ''}<br><small class="muted">To'g'ri: ${esc(it.options[it.correct])}</small></td>
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
function openEditor(it) {
  editing = it || null; customImage = '';
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
$('editForm').onsubmit = async e => {
  e.preventDefault();
  const rows = [...$('fOptions').children];
  const body = {
    topic: $('fTopic').value, question: $('fQuestion').value.trim(), explanation: $('fExpl').value.trim(),
    options: rows.map(r => r.querySelector('input[type=text]').value.trim()),
    correct: rows.findIndex(r => r.querySelector('input[type=radio]').checked),
    image: $('fImage').value === '__custom' ? customImage : $('fImage').value,
    verified: $('fVerified').checked
  };
  if (body.correct < 0) { $('formErr').textContent = "To'g'ri javobni belgilang"; return; }
  try {
    if (editing) await api('/admin/questions/' + editing.id, { method: 'PUT', json: body });
    else await api('/admin/questions', { method: 'POST', json: body });
    $('editDlg').close(); toast(editing ? 'Saqlandi' : "Savol qo'shildi"); load();
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
  if (b.dataset.tab === 'instrPanel') loadInstr();
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
