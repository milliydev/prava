# pravauchun.uz — haydovchilik imtihoniga tayyorgarlik sayti

Biletlar, imtihon rejimi, mavzular bo'yicha mashq, viktorina, qo'llanma, belgilar katalogi va xatolar ustida ishlash. Savollar sizning serveringizdagi SQLite bazasida saqlanadi va `/admin` sahifasidan boshqariladi.

## Tuzilishi

```
server.js               — server va API (Express + SQLite)
data/topics.json        — mavzular ro'yxati
data/guide.json         — qo'llanma boblari
data/questions/*.json   — boshlang'ich savollar (birinchi ishga tushishda bazaga yuklanadi)
data/yolchi.db          — ma'lumotlar bazasi (avtomatik yaratiladi)
public/                 — sayt (index.html) va admin panel (admin.html)
public/uploads/         — admin panel orqali yuklangan rasmlar
```

## Kompyuterda ishga tushirish

Node.js 18 yoki undan yangi versiya kerak.

```bash
npm install
ADMIN_PASSWORD=parolingiz npm start
```

Sayt: http://localhost:3000 · Admin panel: http://localhost:3000/admin

Windows (PowerShell): `$env:ADMIN_PASSWORD="parolingiz"; npm start`

## Serverga joylash (Ubuntu VPS)

```bash
# 1. Node.js o'rnatish
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx

# 2. Loyihani serverga ko'chirish va o'rnatish
cd /var/www && sudo mkdir yolchi && sudo chown $USER yolchi
# fayllarni shu papkaga yuklang (scp, git yoki sftp orqali)
cd yolchi && npm install --omit=dev

# 3. PM2 bilan doimiy ishlatish
sudo npm i -g pm2
ADMIN_PASSWORD='kuchli_parol' PORT=3000 pm2 start server.js --name yolchi
pm2 save && pm2 startup
```

Nginx sozlamasi (`/etc/nginx/sites-available/yolchi`):

```nginx
server {
  server_name sizning-domeningiz.uz;
  client_max_body_size 5m;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/yolchi /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo apt install -y certbot python3-certbot-nginx && sudo certbot --nginx   # bepul HTTPS
```

Domeningizning A-yozuvini server IP manziliga yo'naltirishni unutmang.

## Savollarni qo'shish

**Admin panel orqali:** `/admin` sahifasiga kiring — savol qo'shish, tahrirlash, o'chirish, rasm yuklash va "tekshirildi" belgisini qo'yish mumkin.

**Ko'p savolni birdaniga:** admin paneldagi "JSON import" tugmasi. Fayl formati:

```json
[
  {
    "topic": "chorraha",
    "question": "Savol matni",
    "options": ["1-variant", "2-variant", "3-variant"],
    "correct": 1,
    "explanation": "Nima uchun bu javob to'g'ri",
    "image": "sign:give_way"
  }
]
```

- `topic` — `data/topics.json` dagi mavzu kaliti.
- `correct` — to'g'ri javob tartib raqami, 0 dan boshlanadi.
- `image` — bo'sh, `sign:<belgi>` (belgilar ro'yxati `public/assets/signs.js` da) yoki yuklangan rasm manzili.

Biletlar avtomatik tuziladi: bazadagi savollar tartib bo'yicha 20 tadan bo'linadi. Har 20 ta yangi savol qo'shilganda yangi bilet paydo bo'ladi.

## Zaxira nusxa

Barcha savollar `data/yolchi.db` faylida. Uni muntazam nusxalab turing yoki admin paneldagi "JSON eksport" tugmasidan foydalaning. `public/uploads/` papkasini ham nusxalang.

## Muhim

Savollar o'quv maqsadida tuzilgan. Ularni rasmiy Yo'l harakati qoidalari matni (lex.uz) bilan tekshirib, admin panelda "tekshirildi" deb belgilab boring.

## Tariflar va to'lov (Payme, Click, Uzum)

Bepul tarif doim ishlaydi: 1–10-biletlar, kuniga 3 ta imtihon, mavzular, qo'llanma va belgilar.
Premium (7 kun — 10 000, 30 kun — 25 000, 90 kun — 49 000 so'm) barcha biletlar, cheksiz imtihon, marafon, viktorina va xatolar ustida ishlashni ochadi.
Narxlar va limitlar `server.js` dagi `PLANS` va `FREE` o'zgaruvchilarida.

Premium foydalanuvchining qurilmasiga (brauzeriga) biriktiriladi. Qurilma ID tariflar sahifasida ko'rinadi.

### Payme
1. business.payme.uz da merchant kassa oching.
2. Kassa sozlamalarida "Endpoint URL": `https://SAYTINGIZ/api/payme`, hisob maydoni: `order_id`.
3. Serverni quyidagi o'zgaruvchilar bilan ishga tushiring:
   `PAYME_MERCHANT_ID=...  PAYME_KEY=...` (sinov uchun `PAYME_TEST=1` va test kalit).

### Click
1. Click merchant kabinetida servis yarating.
2. Prepare URL: `https://SAYTINGIZ/api/click/prepare`, Complete URL: `https://SAYTINGIZ/api/click/complete`.
3. `CLICK_SERVICE_ID=...  CLICK_MERCHANT_ID=...  CLICK_SECRET_KEY=...`

### Uzum Bank
Uzum bilan shartnomadan so'ng ular bergan to'lov havolasi shablonini kiriting:
`UZUM_PAY_URL="https://.../pay?order={order}&amount={amount}&return={return}"`.
To'lov tasdig'ini qabul qilish (callback) Uzum hujjatiga ko'ra `server.js` dagi belgilangan joyga qo'shiladi.

Shuningdek, `PUBLIC_URL=https://saytingiz.uz` ni kiriting (to'lovdan keyin qaytish manzili).

### Logotiplar
`public/assets/pay/` papkasiga `payme.svg`, `click.svg`, `uzum.svg` nomli rasmiy logotiplarni qo'ying (ularni har bir tizimning merchant kabinetidagi brend materiallaridan olasiz). Fayl bo'lmasa, tugmada nomi yoziladi.

To'lovlar ro'yxati: admin token bilan `GET /api/admin/orders`.

## SEO (Google va Yandex)

Sayt har bir sahifani serverda tayyor HTML ko'rinishida qaytaradi: `/`, `/biletlar`, `/bilet/1…60`, `/mavzular`, `/mavzu/...`, `/qollanma`, `/bob/...`, `/belgilar`.
Avtomatik: `<title>`, meta description, canonical, Open Graph rasmi (`/og.png`), JSON-LD (WebSite, FAQPage, Quiz, Article), `/sitemap.xml`, `/robots.txt`, gzip siqish.

Ishga tushirishda albatta kiriting: `PUBLIC_URL=https://saytingiz.uz`

Saytni qidiruv tizimlariga qo'shish:
1. Google Search Console → domenni qo'shing → tasdiqlash kodini `GOOGLE_VERIFY=...` ga yozing → `https://saytingiz.uz/sitemap.xml` ni yuboring → "URL inspection" orqali bosh sahifani indekslashni so'rang.
2. Yandex Webmaster → xuddi shunday, kod `YANDEX_VERIFY=...` ga.
3. Telegram kanal, Instagram, avtomaktablar bilan hamkorlik orqali saytga havolalar to'plang — bu reytingga eng ko'p ta'sir qiladi.

## AI yordamchi (Claude)

Saytda "AI yordamchi" chat oynasi va har bir savol ostida "AI tushuntirsin" tugmasi bor. Ishlashi uchun:
1. console.anthropic.com da API kalit oling (to'lov kartasini ulang).
2. Serverni `ANTHROPIC_API_KEY=sk-ant-...` bilan ishga tushiring.
3. Ixtiyoriy: `ANTHROPIC_MODEL` (standart: `claude-haiku-5-5` — tez va arzon; sifatliroq javob uchun `claude-sonnet-5-5`).

Kalit faqat serverda saqlanadi, brauzerga uzatilmaydi. Limit: bepul foydalanuvchiga kuniga 5 ta, premiumga 100 ta savol (`server.js` dagi `AI` sozlamasi). Narxlar: https://docs.claude.com/en/docs/about-claude/pricing
