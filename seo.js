'use strict';
/* Qidiruv tizimlari uchun: har bir sahifa serverda tayyor HTML ko'rinishida qaytariladi */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

module.exports = function seo(app, { db, TOPICS, GUIDE, TICKET_SIZE, FREE, metaData }) {
  const SITE = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
  const BRAND = 'pravauchun.uz';
  // JS/CSS manziliga fayl hashini qo'shamiz: brauzer uzoq keshlaydi, fayl o'zgarsa yangi manzil bo'ladi
  const ver = f => require('crypto').createHash('md5').update(fs.readFileSync(path.join(__dirname, 'public', f))).digest('hex').slice(0, 8);
  const TPL = ['assets/style.css', 'assets/signs.js', 'assets/app.js'].reduce((t, f) => t.replace(`"/${f}"`, `"/${f}?v=${ver(f)}"`),
    fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8'));
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // belgilar nomlari
  const ctx = { window: {} }; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'public', 'assets', 'signs.js'), 'utf8'), ctx);
  const SIGNS = ctx.window.SIGNS || {};
  const allIds = () => db.prepare('SELECT id FROM questions ORDER BY id').all().map(r => r.id);
  const rows = ids => { if (!ids.length) return []; const m = new Map(db.prepare(`SELECT * FROM questions WHERE id IN (${ids.map(() => '?').join(',')})`).all(...ids).map(r => [r.id, r])); return ids.map(i => m.get(i)).filter(Boolean); };
  const ticketsCount = () => Math.floor(allIds().length / TICKET_SIZE);
  const abs = p => (SITE || '') + p;

  function render(req, res, { title, desc, h1, body, jsonld = [], noindex = false, status = 200 }) {
    const url = abs(req.path === '/' ? '/' : req.path);
    const head = `<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(url)}">
${noindex ? '<meta name="robots" content="noindex">' : '<meta name="robots" content="index,follow,max-image-preview:large">'}
<meta property="og:type" content="website"><meta property="og:site_name" content="${BRAND}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}"><meta property="og:image" content="${esc(abs('/og.png'))}"><meta property="og:locale" content="uz_UZ">
<meta name="twitter:card" content="summary_large_image">
${process.env.GOOGLE_VERIFY ? `<meta name="google-site-verification" content="${esc(process.env.GOOGLE_VERIFY)}">` : ''}
${process.env.YANDEX_VERIFY ? `<meta name="yandex-verification" content="${esc(process.env.YANDEX_VERIFY)}">` : ''}
${jsonld.map(j => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`).join('\n')}`;
    const html = TPL
      .replace(/<meta name="description"[^>]*>\n?/, '')
      .replace(/<title>[\s\S]*?<\/title>/, head)
      // /api/meta so'rovini kutmaslik uchun ma'lumot sahifaning o'zida keladi
      .replace('<script src="/assets/signs.js', `<script>window.__META=${JSON.stringify(metaData()).replace(/</g, '\\u003c')}</script>\n<script src="/assets/signs.js`)
      .replace('<main class="wrap" id="app"><div class="loading">Yuklanmoqda…</div></main>',
        `<main class="wrap" id="app"><div class="ssr page-head"><h1>${esc(h1 || title)}</h1>${body}</div></main>`);
    res.status(status).set('Cache-Control', 'public, max-age=300').type('html').send(html);
  }

  const qList = (qs, withAnswers) => '<ol class="ssr-q">' + qs.map(r => {
    const o = JSON.parse(r.options);
    return `<li><p><strong>${esc(r.question)}</strong></p><ul>${o.map(x => `<li>${esc(x)}</li>`).join('')}</ul>${withAnswers ? `<p>To'g'ri javob: ${esc(o[r.correct])}. ${esc(r.explanation)}</p>` : ''}</li>`;
  }).join('') + '</ol>';

  const FAQ = [
    ["Prava imtihonida nechta savol bo'ladi?", "Nazariy imtihonda 20 ta savol beriladi, ularga 25 daqiqa vaqt ajratiladi va 2 tadan ortiq xato qilinmasligi kerak."],
    ["Prava testini onlayn qanday mashq qilish mumkin?", "pravauchun.uz saytida biletlar, imtihon rejimi, mavzular bo'yicha testlar, marafon va qo'llanma bor. Bepul tarifda dastlabki biletlar va kuniga bir necha imtihon ochiq."],
    ["Savollar 2026-yilgi qoidalarga mosmi?", "Savollar amaldagi Yo'l harakati qoidalari (VM 172-son qarori va keyingi o'zgarishlar) asosida tuzilgan va o'quv maqsadida mo'ljallangan."],
    ["Chorraha savollarini qanday o'rganish mumkin?", "Saytda yuzlab rasmli chorraha vaziyatlari bor: o'ng tomon qoidasi, asosiy yo'l, tramvay ustunligi, svetofor va tartibga soluvchi ishoralari."],
    ["Testlar telefonda ishlaydimi?", "Ha, sayt telefon, planshet va kompyuterda ishlaydi, ilova o'rnatish shart emas."]
  ];

  app.get('/', (req, res) => {
    const total = allIds().length, t = ticketsCount();
    render(req, res, {
      title: `Prava test 2026 onlayn — YHQ biletlari va imtihon | ${BRAND}`,
      desc: `Prava testi onlayn: ${total} ta savol, ${t} ta bilet, haqiqiy imtihon rejimi (20 savol, 25 daqiqa), rasmli chorraha vaziyatlari va YHQ qo'llanmasi. Тест ПДД Узбекистан онлайн.`,
      h1: "Prava test onlayn — haydovchilik imtihoniga tayyorgarlik",
      body: `<p>pravauchun.uz — O'zbekiston Yo'l harakati qoidalari (YHQ) bo'yicha onlayn avtotest. ${total} ta savol, ${t} ta prava bileti, imtihon rejimi, rasmli chorraha savollari, yo'l belgilari va qo'llanma bir joyda.</p>
<p>Онлайн тест ПДД Республики Узбекистан: билеты, экзамен, разбор вопросов с пояснениями.</p>
<ul><li><a href="/biletlar">Prava biletlari</a></li><li><a href="/imtihon">Imtihon rejimi</a></li><li><a href="/mavzular">Mavzular bo'yicha test</a></li><li><a href="/qollanma">YHQ qo'llanma</a></li><li><a href="/belgilar">Yo'l belgilari</a></li></ul>
<h2>Ko'p beriladigan savollar</h2>${FAQ.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('')}`,
      jsonld: [
        { '@context': 'https://schema.org', '@type': 'WebSite', name: BRAND, alternateName: ['pravauchun', 'pravauchun avtotest', 'Prava test'], url: abs('/'), inLanguage: 'uz' },
        { '@context': 'https://schema.org', '@type': 'Organization', name: BRAND, url: abs('/'), logo: abs('/og.png') },
        { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }
      ]
    });
  });
  app.get('/biletlar', (req, res) => {
    const t = ticketsCount();
    render(req, res, {
      title: `Prava biletlari 2026 — ${t} ta bilet onlayn | ${BRAND}`,
      desc: `YHQ bo'yicha ${t} ta prava bileti, har birida 20 ta savol. Biletlarni onlayn yeching va javoblarni sharh bilan tekshiring.`,
      h1: 'Prava biletlari 2026',
      body: `<p>Har bir biletda 20 ta savol. 2 tagacha xato qilsangiz, bilet yechilgan hisoblanadi.</p><ul class="ssr-links">${Array.from({ length: t }, (_, i) => `<li><a href="/bilet/${i + 1}">${i + 1}-bilet</a></li>`).join('')}</ul>`
    });
  });
  app.get('/bilet/:n', (req, res, next) => {
    const n = parseInt(req.params.n, 10), ids = allIds().slice((n - 1) * TICKET_SIZE, n * TICKET_SIZE);
    if (!n || ids.length < TICKET_SIZE) return next();
    const qs = rows(ids), free = n <= FREE.tickets;
    render(req, res, {
      title: `Prava ${n}-bilet — 20 ta savol${free ? ' va javoblar' : ''} | ${BRAND}`,
      desc: `YHQ ${n}-bilet: ${qs.slice(0, 2).map(r => r.question).join(' ').slice(0, 120)}… Onlayn yeching va natijangizni biling.`,
      h1: `Prava ${n}-bilet`,
      body: qList(qs, free) + `<p><a href="/bilet/${n + 1 <= ticketsCount() ? n + 1 : 1}">Keyingi bilet</a> · <a href="/biletlar">Barcha biletlar</a></p>`,
      jsonld: free ? [{ '@context': 'https://schema.org', '@type': 'Quiz', name: `Prava ${n}-bilet`, inLanguage: 'uz', educationalLevel: 'beginner', about: "Yo'l harakati qoidalari", hasPart: qs.map(r => { const o = JSON.parse(r.options); return { '@type': 'Question', name: r.question, eduQuestionType: 'Multiple choice', acceptedAnswer: { '@type': 'Answer', text: o[r.correct] }, suggestedAnswer: o.filter((_, k) => k !== r.correct).map(x => ({ '@type': 'Answer', text: x })) }; }) }] : []
    });
  });
  app.get('/mavzular', (req, res) => render(req, res, {
    title: `YHQ mavzulari bo'yicha test — chorraha, belgilar, svetofor | ${BRAND}`,
    desc: "Yo'l harakati qoidalarini mavzular bo'yicha mashq qiling: chorrahalar, yo'l belgilari, svetofor, quvib o'tish, to'xtash va boshqalar.",
    h1: "YHQ mavzulari bo'yicha test",
    body: `<ul>${TOPICS.map(t => `<li><a href="/mavzu/${t.id}">${esc(t.title)}</a> — ${esc(t.description)}</li>`).join('')}</ul>`
  }));
  app.get('/mavzu/:id', (req, res, next) => {
    const t = TOPICS.find(x => x.id === req.params.id); if (!t) return next();
    const qs = db.prepare('SELECT * FROM questions WHERE topic=? ORDER BY id LIMIT 15').all(t.id);
    render(req, res, { title: `${t.title} — YHQ test savollari | ${BRAND}`, desc: `${t.title}: ${t.description}. Prava imtihoniga tayyorgarlik uchun test savollari va sharhlar.`, h1: `${t.title} — test savollari`, body: `<p>${esc(t.description)}.</p>` + qList(qs, true) });
  });
  app.get('/qollanma', (req, res) => render(req, res, {
    title: `YHQ qo'llanma — yo'l harakati qoidalari sodda tilda | ${BRAND}`,
    desc: "Yo'l harakati qoidalari bo'yicha qo'llanma: atamalar, svetofor, belgilar, chiziqlar, chorrahalar, to'xtash, xavfsizlik va birinchi yordam.",
    h1: "Yo'l harakati qoidalari: qo'llanma",
    body: `<ol>${GUIDE.map(c => `<li><a href="/bob/${c.id}">${esc(c.title)}</a> — ${esc(c.summary)}</li>`).join('')}</ol>`
  }));
  app.get('/bob/:id', (req, res, next) => {
    const c = GUIDE.find(x => x.id === req.params.id); if (!c) return next();
    render(req, res, {
      title: `${c.title} — YHQ qo'llanma | ${BRAND}`, desc: `${c.title}. ${c.summary} Prava imtihoniga tayyorgarlik uchun qisqa va tushunarli tushuntirish.`, h1: c.title,
      body: c.sections.map(s => `<h2>${esc(s.h)}</h2>${(s.p || []).map(p => `<p>${esc(p)}</p>`).join('')}${s.list ? `<ul>${s.list.map(l => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}`).join(''),
      jsonld: [{ '@context': 'https://schema.org', '@type': 'Article', headline: c.title, inLanguage: 'uz', author: { '@type': 'Organization', name: BRAND } }]
    });
  });
  app.get('/instruktorlar', (req, res) => {
    const list = db.prepare('SELECT * FROM instructors WHERE active=1 ORDER BY experience DESC').all();
    const ph = p => '+998 ' + p.replace(/(\d{2})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4');
    render(req, res, {
      title: `Avtoinstruktor tanlash — ayol va erkak instruktorlar | ${BRAND}`,
      desc: "Haydashni o'rgatuvchi avtoinstruktorlar: tajriba, mashina, bo'sh vaqtlar, bitta dars narxi, telefon va Telegram. Ayol va erkak instruktorlar.",
      h1: 'Avtoinstruktorlar',
      body: `<ul>${list.map(i => `<li><strong>${esc(i.name)}</strong> — ${i.gender === 'ayol' ? 'ayol' : 'erkak'} instruktor, tajribasi ${i.experience} yil, ${esc(i.car)}, ${esc(i.city)}. Vaqti: ${esc(i.schedule)}. Narxi: ${i.price.toLocaleString('ru-RU')} so'm / dars. Tel: ${ph(i.phone)}</li>`).join('')}</ul>`
    });
  });
  app.get('/belgilar', (req, res) => render(req, res, {
    title: `Yo'l belgilari va ularning ma'nosi — rasmlar bilan | ${BRAND}`,
    desc: "O'zbekiston yo'l belgilari: ogohlantiruvchi, imtiyoz, taqiqlovchi, buyuruvchi, axborot va servis belgilari rasmlari va ma'nosi.",
    h1: "Yo'l belgilari",
    body: `<ul>${Object.values(SIGNS).map(s => `<li>${esc(s.n)} — ${esc(s.g)}</li>`).join('')}</ul>`
  }));
  const simple = { imtihon: ['Prava imtihoni onlayn — 20 savol, 25 daqiqa', "Haqiqiy imtihon sharoitida mashq: tasodifiy 20 ta savol, 25 daqiqa vaqt, 2 tagacha xato."], marafon: ['Marafon — barcha prava savollari', "Bazadagi barcha savollarni ketma-ket yeching, natija saqlanib boradi."], viktorina: ['YHQ viktorina', "Vaqtga qarshi tez javob berib, ball to'plang."], tarif: ['Tariflar', "Bepul tarif va premium imkoniyatlar: barcha biletlar, cheksiz imtihon, marafon."], xatolar: ['Xatolar ustida ishlash', "Xato javob bergan savollaringizni takrorlang."] };
  for (const [k, [t, d]] of Object.entries(simple)) app.get('/' + k, (req, res) => render(req, res, { title: `${t} | ${BRAND}`, desc: d, h1: t, body: `<p>${esc(d)}</p>`, noindex: k === 'xatolar' }));
  for (const k of ['imtihon-boshlash', 'marafon-yechish', 'viktorina-boshlash']) app.get('/' + k, (req, res) => render(req, res, { title: BRAND, desc: '', h1: BRAND, body: '', noindex: true }));

  app.get('/robots.txt', (req, res) => res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin\n${SITE ? `Sitemap: ${SITE}/sitemap.xml\n` : ''}`));
  app.get('/sitemap.xml', (req, res) => {
    const urls = ['/', '/biletlar', '/imtihon', '/mavzular', '/qollanma', '/belgilar', '/instruktorlar', '/marafon', '/tarif',
      ...Array.from({ length: ticketsCount() }, (_, i) => `/bilet/${i + 1}`), ...TOPICS.map(t => `/mavzu/${t.id}`), ...GUIDE.map(c => `/bob/${c.id}`)];
    const now = new Date().toISOString().slice(0, 10);
    res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u => `<url><loc>${abs(u)}</loc><lastmod>${now}</lastmod><priority>${u === '/' ? '1.0' : u.startsWith('/bilet/') ? '0.7' : '0.8'}</priority></url>`).join('')}</urlset>`);
  });
  return (req, res) => render(req, res, { title: `Sahifa topilmadi | ${BRAND}`, desc: '', h1: 'Sahifa topilmadi', body: '<p><a href="/">Bosh sahifa</a></p>', noindex: true, status: 404 });
};
