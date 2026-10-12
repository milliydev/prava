/* Yo'l belgilari — SVG kutubxonasi. Savolda image: "sign:<kalit>" ko'rinishida ishlatiladi. */
(function () {
  const R = '#C62330', B = '#1D5BA6', Y = '#F3C31B';
  const ring = i => `<svg viewBox="0 0 120 120" role="img"><circle cx="60" cy="60" r="54" fill="#fff"/><circle cx="60" cy="60" r="48" fill="#fff" stroke="${R}" stroke-width="12"/>${i}</svg>`;
  const blueRing = i => `<svg viewBox="0 0 120 120" role="img"><circle cx="60" cy="60" r="50" fill="${B}" stroke="${R}" stroke-width="10"/>${i}</svg>`;
  const blue = i => `<svg viewBox="0 0 120 120" role="img"><circle cx="60" cy="60" r="54" fill="${B}"/>${i}</svg>`;
  const tri = i => `<svg viewBox="0 0 120 120" role="img"><polygon points="60,10 112,104 8,104" fill="#fff" stroke="${R}" stroke-width="10" stroke-linejoin="round"/>${i}</svg>`;
  const S = {
    give_way: { g: "Imtiyoz", n: "Yo'l bering", svg: `<svg viewBox="0 0 120 120" role="img"><polygon points="8,18 112,18 60,108" fill="#fff" stroke="${R}" stroke-width="10" stroke-linejoin="round"/></svg>` },
    stop: { g: "Imtiyoz", n: "To'xtamasdan harakatlanish taqiqlanadi", svg: `<svg viewBox="0 0 120 120" role="img"><polygon points="38,6 82,6 114,38 114,82 82,114 38,114 6,82 6,38" fill="${R}" stroke="#fff" stroke-width="4"/><text x="60" y="71" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="30" fill="#fff">STOP</text></svg>` },
    main_road: { g: "Imtiyoz", n: "Asosiy yo'l", svg: `<svg viewBox="0 0 120 120" role="img"><rect x="25" y="25" width="70" height="70" transform="rotate(45 60 60)" fill="#fff" stroke="#333" stroke-width="2"/><rect x="36" y="36" width="48" height="48" transform="rotate(45 60 60)" fill="${Y}"/></svg>` },
    end_main_road: { g: "Imtiyoz", n: "Asosiy yo'lning oxiri", svg: `<svg viewBox="0 0 120 120" role="img"><rect x="25" y="25" width="70" height="70" transform="rotate(45 60 60)" fill="#fff" stroke="#333" stroke-width="2"/><rect x="36" y="36" width="48" height="48" transform="rotate(45 60 60)" fill="${Y}"/><path d="M38 82 82 38M33 76 76 33M44 87 87 44" stroke="#222" stroke-width="4"/></svg>` },
    danger: { g: "Ogohlantiruvchi", n: "Boshqa xavflar", svg: tri(`<rect x="55" y="42" width="10" height="36" rx="3" fill="#222"/><circle cx="60" cy="88" r="6" fill="#222"/>`) },
    crossroad: { g: "Ogohlantiruvchi", n: "Teng ahamiyatli yo'llar kesishmasi", svg: tri(`<path d="M60 42v52M38 72h44" stroke="#222" stroke-width="9"/>`) },
    children: { g: "Ogohlantiruvchi", n: "Bolalar", svg: '' },
    slippery: { g: "Ogohlantiruvchi", n: "Sirpanchiq yo'l", svg: tri(`<rect x="46" y="48" width="28" height="18" rx="4" fill="#222"/><path d="M40 92c8-6 12 6 20 0s12 6 20 0M44 80c6-4 10 4 16 0" stroke="#222" stroke-width="4" fill="none"/>`) },
    two_way: { g: "Ogohlantiruvchi", n: "Ikki tomonlama harakat", svg: tri(`<path d="M48 96V58M72 52V90" stroke="#222" stroke-width="6"/><polygon points="40,62 48,48 56,62" fill="#222"/><polygon points="64,86 72,100 80,86" fill="#222"/>`) },
    narrowing: { g: "Ogohlantiruvchi", n: "Yo'lning torayishi", svg: tri(`<path d="M44 98V80l8-16V48M76 98V80l-8-16V48" stroke="#222" stroke-width="6" fill="none"/>`) },
    signals_ahead: { g: "Ogohlantiruvchi", n: "Svetoforli tartibga solish", svg: tri(`<rect x="50" y="44" width="20" height="54" rx="5" fill="#222"/><circle cx="60" cy="54" r="5" fill="${R}"/><circle cx="60" cy="71" r="5" fill="${Y}"/><circle cx="60" cy="88" r="5" fill="#1E8A4C"/>`) },
    steep_down: { g: "Ogohlantiruvchi", n: "Tik qiyalik (pastlik)", svg: tri(`<polygon points="30,96 90,96 30,64" fill="#222"/><text x="72" y="80" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="16" fill="#222">10%</text>`) },
    bump: { g: "Ogohlantiruvchi", n: "Sun'iy notekislik", svg: tri(`<path d="M24 94h20c4-14 28-14 32 0h20" stroke="#222" stroke-width="7" fill="none"/>`) },
    oncoming_priority: { g: "Imtiyoz", n: "Qarama-qarshi harakatga imtiyoz", svg: ring(`<path d="M46 92V40" stroke="${R}" stroke-width="8"/><polygon points="34,46 46,28 58,46" fill="${R}"/><path d="M74 28v52" stroke="#222" stroke-width="8"/><polygon points="62,74 74,92 86,74" fill="#222"/>`) },
    priority_over_oncoming: { g: "Imtiyoz", n: "Qarama-qarshi harakatga nisbatan imtiyoz", svg: `<svg viewBox="0 0 120 120" role="img"><rect x="8" y="8" width="104" height="104" rx="8" fill="${B}"/><path d="M46 96V44" stroke="#fff" stroke-width="9"/><polygon points="32,50 46,28 60,50" fill="#fff"/><path d="M76 24v52" stroke="${R}" stroke-width="9"/><polygon points="62,70 76,92 90,70" fill="${R}"/></svg>` },
    no_left: { g: "Taqiqlovchi", n: "Chapga burilish taqiqlanadi", svg: ring(`<path d="M72 92V64a8 8 0 0 0-8-8H48" stroke="#222" stroke-width="10" fill="none"/><polygon points="52,40 30,56 52,72" fill="#222"/><path d="M28 30l64 60" stroke="${R}" stroke-width="9"/>`) },
    no_uturn: { g: "Taqiqlovchi", n: "Qayrilib olish taqiqlanadi", svg: ring(`<path d="M74 92V52a14 14 0 0 0-28 0v20" stroke="#222" stroke-width="10" fill="none"/><polygon points="34,68 46,90 58,68" fill="#222"/>`) },
    end_restrictions: { g: "Taqiqlovchi", n: "Barcha cheklovlarning oxiri", svg: `<svg viewBox="0 0 120 120" role="img"><circle cx="60" cy="60" r="54" fill="#fff" stroke="#888" stroke-width="3"/><path d="M30 82 82 30M36 90 90 36M24 72 72 24" stroke="#555" stroke-width="5"/></svg>` },
    min_speed: { g: "Buyuruvchi", n: "Eng kam tezlik cheklovi", svg: blue(`<text x="60" y="76" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="44" fill="#fff">30</text>`) },
    bike_path: { g: "Buyuruvchi", n: "Velosiped yo'lkasi", svg: blue(`<circle cx="40" cy="74" r="13" fill="none" stroke="#fff" stroke-width="5"/><circle cx="82" cy="74" r="13" fill="none" stroke="#fff" stroke-width="5"/><path d="M40 74l14-24h20l8 24M54 50l10 24h-24M62 42h12" stroke="#fff" stroke-width="5" fill="none" stroke-linejoin="round"/>`) },
    motorway: { g: "Axborot", n: "Avtomagistral", svg: `<svg viewBox="0 0 120 120" role="img"><rect x="8" y="8" width="104" height="104" rx="8" fill="#1E7A46"/><path d="M28 98 50 34M92 98 70 34M60 98V86M60 74V62M60 50V40" stroke="#fff" stroke-width="7"/><path d="M36 30q24-12 48 0" stroke="#fff" stroke-width="7" fill="none"/></svg>` },
    living_zone: { g: "Axborot", n: "Turar-joy dahasi", svg: `<svg viewBox="0 0 120 120" role="img"><rect x="8" y="8" width="104" height="104" rx="8" fill="${B}"/><rect x="18" y="20" width="84" height="80" rx="4" fill="#fff"/><polygon points="38,56 54,42 70,56" fill="#222"/><rect x="42" y="56" width="24" height="18" fill="#222"/><circle cx="82" cy="58" r="5" fill="#222"/><path d="M82 64v14M82 70l-6 6M82 78l-4 12M82 78l4 12" stroke="#222" stroke-width="3"/><rect x="26" y="82" width="22" height="10" rx="3" fill="#222"/></svg>` },
    deer: { g: "Ogohlantiruvchi", n: "Yovvoyi hayvonlar", svg: tri(`<path d="M44 92l8-18h22l6 18M52 74l-4-12h-6M74 74l10-14M80 60l6-8M80 60l-6-6M56 66q8-6 18 0" stroke="#222" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="82" cy="62" r="5" fill="#222"/>`) },
    cow: { g: "Ogohlantiruvchi", n: "Chorva mollari", svg: tri(`<rect x="42" y="66" width="34" height="18" rx="5" fill="#222"/><path d="M46 84v10M72 84v10" stroke="#222" stroke-width="5"/><rect x="74" y="62" width="12" height="12" rx="3" fill="#222"/><path d="M76 62l-3-5M84 62l3-5" stroke="#222" stroke-width="3"/>`) },
    rocks: { g: "Ogohlantiruvchi", n: "Tosh qulashi", svg: tri(`<path d="M34 98L50 50h8L44 98z" fill="#222"/><circle cx="66" cy="66" r="5" fill="#222"/><circle cx="76" cy="80" r="6" fill="#222"/><circle cx="70" cy="94" r="5" fill="#222"/>`) },
    bike_warn: { g: "Ogohlantiruvchi", n: "Velosipedchilar kesishmasi", svg: tri(`<circle cx="46" cy="86" r="9" fill="none" stroke="#222" stroke-width="4"/><circle cx="76" cy="86" r="9" fill="none" stroke="#222" stroke-width="4"/><path d="M46 86l10-16h14l6 16M56 70l7 16h-17" stroke="#222" stroke-width="4" fill="none"/>`) },
    wind: { g: "Ogohlantiruvchi", n: "Yon shamol", svg: tri(`<path d="M44 98V54" stroke="#222" stroke-width="4"/><path d="M44 56q18 4 34 14q-16 6-34 10z" fill="#222"/>`) },
    tram_warn: { g: "Ogohlantiruvchi", n: "Tramvay yo'li bilan kesishma", svg: tri(`<rect x="44" y="56" width="32" height="34" rx="5" fill="#222"/><rect x="49" y="61" width="22" height="10" fill="#fff"/><path d="M60 56l-6-8h12" stroke="#222" stroke-width="3" fill="none"/><path d="M48 96h24" stroke="#222" stroke-width="4"/>`) },
    sharp_right: { g: "Ogohlantiruvchi", n: "Xavfli burilish", svg: tri(`<path d="M50 96V68q0-8 8-8h16" stroke="#222" stroke-width="8" fill="none"/><polygon points="70,48 88,60 70,72" fill="#222"/>`) },
    roadworks: { g: "Ogohlantiruvchi", n: "Yo'l ishlari", svg: tri(`<circle cx="64" cy="54" r="6" fill="#222"/><path d="M62 62l-8 16 10 6v12M54 78l-8 6M66 68l12 8" stroke="#222" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M78 76l6 20M74 96h24" stroke="#222" stroke-width="4"/><path d="M32 96q10-12 20 0z" fill="#222"/>`) },
    rail_barrier: { g: "Ogohlantiruvchi", n: "Shlagbaumli temir yo'l kesishmasi", svg: tri(`<path d="M40 70h40M40 84h40M44 66v32M60 66v32M76 66v32" stroke="#222" stroke-width="5"/>`) },
    rail_nobarrier: { g: "Ogohlantiruvchi", n: "Shlagbaumsiz temir yo'l kesishmasi", svg: tri(`<rect x="38" y="70" width="34" height="18" fill="#222"/><rect x="72" y="62" width="12" height="26" fill="#222"/><rect x="44" y="60" width="8" height="10" fill="#222"/><circle cx="46" cy="92" r="5" fill="#222"/><circle cx="64" cy="92" r="5" fill="#222"/><circle cx="78" cy="92" r="5" fill="#222"/>`) },
    rail_cross: { g: "Ogohlantiruvchi", n: "Bir izli temir yo'l (shlagbaumsiz)", svg: `<svg viewBox="0 0 120 120" role="img"><g transform="rotate(45 60 60)"><rect x="8" y="50" width="104" height="20" fill="#fff" stroke="${R}" stroke-width="2"/><rect x="50" y="8" width="20" height="104" fill="#fff" stroke="${R}" stroke-width="2"/><rect x="14" y="54" width="22" height="12" fill="${R}"/><rect x="84" y="54" width="22" height="12" fill="${R}"/><rect x="54" y="14" width="12" height="22" fill="${R}"/><rect x="54" y="84" width="12" height="22" fill="${R}"/></g></svg>` },
    slow_vehicle: { g: "Taniqlik belgisi", n: "Sekin harakatlanuvchi transport vositasi", svg: `<svg viewBox="0 0 120 120" role="img"><polygon points="60,10 112,104 8,104" fill="${R}"/><polygon points="60,36 90,92 30,92" fill="#F7941D"/></svg>` },
    no_trucks: { g: "Taqiqlovchi", n: "Yuk avtomobillari harakati taqiqlanadi", svg: ring(`<rect x="34" y="50" width="34" height="22" fill="#222"/><path d="M68 56h12l8 10v6H68z" fill="#222"/><circle cx="44" cy="76" r="6" fill="#222"/><circle cx="80" cy="76" r="6" fill="#222"/>`) },
    no_peds: { g: "Taqiqlovchi", n: "Piyodalar harakati taqiqlanadi", svg: ring(`<circle cx="62" cy="38" r="7" fill="#222"/><path d="M60 46l-4 22-8 18M57 62l12 8 4 18M58 52l12 6M58 52l-10 6" stroke="#222" stroke-width="6" stroke-linecap="round" fill="none"/><path d="M30 30l60 60" stroke="${R}" stroke-width="8"/>`) },
    no_bikes: { g: "Taqiqlovchi", n: "Velosipedda harakatlanish taqiqlanadi", svg: ring(`<circle cx="42" cy="72" r="12" fill="none" stroke="#222" stroke-width="5"/><circle cx="80" cy="72" r="12" fill="none" stroke="#222" stroke-width="5"/><path d="M42 72l14-22h18l6 22M56 50l8 22H42" stroke="#222" stroke-width="5" fill="none"/>`) },
    no_moto: { g: "Taqiqlovchi", n: "Mototsikllar harakati taqiqlanadi", svg: ring(`<circle cx="40" cy="74" r="11" fill="#222"/><circle cx="82" cy="74" r="11" fill="#222"/><path d="M40 74l18-18h18l6 18M52 56h14" stroke="#222" stroke-width="7" fill="none"/>`) },
    weight5: { g: "Taqiqlovchi", n: "Vazni cheklangan (5 t)", svg: ring(`<text x="60" y="74" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="38" fill="#222">5t</text>`) },
    ped_path: { g: "Buyuruvchi", n: "Piyodalar yo'lkasi", svg: blue(`<circle cx="62" cy="34" r="8" fill="#fff"/><path d="M60 44l-4 24-10 22M57 64l12 8 4 20M58 52l14 6M58 52l-12 6" stroke="#fff" stroke-width="7" stroke-linecap="round" fill="none"/>`) },
    rec_speed: { g: "Axborot", n: "Tavsiya etilgan tezlik", svg: `<svg viewBox="0 0 120 120" role="img"><rect x="8" y="8" width="104" height="104" rx="8" fill="${B}"/><text x="60" y="78" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="48" fill="#fff">50</text></svg>` },
    dead_end: { g: "Axborot", n: "Boshi berk ko'cha", svg: `<svg viewBox="0 0 120 120" role="img"><rect x="8" y="8" width="104" height="104" rx="8" fill="${B}"/><rect x="50" y="40" width="20" height="62" fill="#fff"/><rect x="30" y="24" width="60" height="18" fill="${R}"/></svg>` },
    lanes_board: { g: "Axborot", n: "Bo'laklar bo'yicha harakat yo'nalishlari", svg: `<svg viewBox="0 0 120 120" role="img"><rect x="8" y="8" width="104" height="104" rx="8" fill="${B}"/><path d="M36 100V40M60 100V40M84 100V60q0-10 10-10" stroke="#fff" stroke-width="7" fill="none"/><path d="M36 40l-8 10M36 40l8 10M60 40l-8 10M60 40l8 10M94 50l-8-8M94 50l-8 8" stroke="#fff" stroke-width="6"/><path d="M48 24v80M72 24v80" stroke="#fff" stroke-width="2" stroke-dasharray="6 5"/></svg>` },
    underpass: { g: "Axborot", n: "Yer osti piyodalar o'tish joyi", svg: `<svg viewBox="0 0 120 120" role="img"><rect x="8" y="8" width="104" height="104" rx="8" fill="${B}"/><path d="M20 40h20v14h14v14h14v14h30" stroke="#fff" stroke-width="7" fill="none"/><circle cx="42" cy="28" r="6" fill="#fff"/><path d="M42 34v14l-6 10M42 40l8 6" stroke="#fff" stroke-width="5" fill="none"/></svg>` },
    settlement: { g: "Axborot", n: "Aholi punktining boshlanishi", svg: `<svg viewBox="0 0 120 120" role="img"><rect x="4" y="30" width="112" height="60" rx="4" fill="#fff" stroke="#222" stroke-width="4"/><text x="60" y="68" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="20" fill="#222">CHIRCHIQ</text></svg>` },
    end_one_way: { g: "Axborot", n: "Bir tomonlama yo'lning oxiri", svg: `<svg viewBox="0 0 120 120" role="img"><rect x="8" y="8" width="104" height="104" rx="8" fill="${B}"/><path d="M60 98V46" stroke="#fff" stroke-width="14"/><polygon points="34,52 60,18 86,52" fill="#fff"/><path d="M18 102L102 18" stroke="${R}" stroke-width="8"/></svg>` },
    end_living: { g: "Axborot", n: "Turar-joy dahasining oxiri", svg: `<svg viewBox="0 0 120 120" role="img"><rect x="8" y="8" width="104" height="104" rx="8" fill="${B}"/><rect x="18" y="20" width="84" height="80" rx="4" fill="#fff"/><polygon points="38,56 54,42 70,56" fill="#222"/><rect x="42" y="56" width="24" height="18" fill="#222"/><circle cx="82" cy="58" r="5" fill="#222"/><path d="M82 64v14" stroke="#222" stroke-width="3"/><path d="M14 106L106 14" stroke="${R}" stroke-width="8"/></svg>` },
    bus_stop: { g: "Axborot", n: "Avtobus to'xtash joyi", svg: `<svg viewBox="0 0 120 120" role="img"><rect x="8" y="8" width="104" height="104" rx="8" fill="${B}"/><rect x="18" y="18" width="84" height="84" fill="#FFD400"/><rect x="30" y="38" width="60" height="38" rx="6" fill="#222"/><rect x="36" y="44" width="48" height="14" fill="#FFD400"/><circle cx="42" cy="80" r="6" fill="#222"/><circle cx="78" cy="80" r="6" fill="#222"/></svg>` },
    fuel: { g: "Servis", n: "Yonilg'i quyish shoxobchasi", svg: `<svg viewBox="0 0 120 120" role="img"><rect x="8" y="8" width="104" height="104" rx="8" fill="${B}"/><rect x="22" y="22" width="76" height="76" fill="#fff"/><rect x="40" y="36" width="28" height="52" rx="3" fill="#222"/><rect x="45" y="42" width="18" height="12" fill="#fff"/><path d="M68 46h8v30q0 6 6 4V50l-6-6" stroke="#222" stroke-width="4" fill="none"/></svg>` },
    first_aid: { g: "Servis", n: "Birinchi tibbiy yordam punkti", svg: `<svg viewBox="0 0 120 120" role="img"><rect x="8" y="8" width="104" height="104" rx="8" fill="${B}"/><rect x="22" y="22" width="76" height="76" fill="#fff"/><path d="M60 34v52M34 60h52" stroke="${R}" stroke-width="16"/></svg>` },
    service: { g: "Servis", n: "Texnik xizmat ko'rsatish", svg: `<svg viewBox="0 0 120 120" role="img"><rect x="8" y="8" width="104" height="104" rx="8" fill="${B}"/><rect x="22" y="22" width="76" height="76" fill="#fff"/><path d="M42 82l26-26" stroke="#222" stroke-width="10" stroke-linecap="round"/><path d="M66 40a12 12 0 1 0 14 14l-8-2-4-4z" fill="#222"/></svg>` },
    wash: { g: "Servis", n: "Avtomobil yuvish", svg: `<svg viewBox="0 0 120 120" role="img"><rect x="8" y="8" width="104" height="104" rx="8" fill="${B}"/><rect x="22" y="22" width="76" height="76" fill="#fff"/><path d="M34 80h52v-12l-8-12H42l-8 12z" fill="#222"/><path d="M44 30v8M60 28v8M76 30v8M52 42v6M68 42v6" stroke="#1D5BA6" stroke-width="4" stroke-linecap="round"/></svg>` },
    phone: { g: "Servis", n: "Telefon", svg: `<svg viewBox="0 0 120 120" role="img"><rect x="8" y="8" width="104" height="104" rx="8" fill="${B}"/><rect x="22" y="22" width="76" height="76" fill="#fff"/><path d="M40 48q0-12 12-12l6 10-6 6q4 10 14 14l6-6 10 6q0 12-12 12-30-6-30-30z" fill="#222"/></svg>` },
    hotel: { g: "Servis", n: "Mehmonxona yoki motel", svg: `<svg viewBox="0 0 120 120" role="img"><rect x="8" y="8" width="104" height="104" rx="8" fill="${B}"/><rect x="22" y="22" width="76" height="76" fill="#fff"/><path d="M32 52v30M32 70h56v12M44 58h44v12" stroke="#222" stroke-width="6" fill="none"/><circle cx="40" cy="62" r="6" fill="#222"/></svg>` },
    food: { g: "Servis", n: "Ovqatlanish joyi", svg: `<svg viewBox="0 0 120 120" role="img"><rect x="8" y="8" width="104" height="104" rx="8" fill="${B}"/><rect x="22" y="22" width="76" height="76" fill="#fff"/><path d="M46 34v52M40 34v14q0 6 6 6t6-6V34M72 86V34q-10 8-10 26h10" stroke="#222" stroke-width="5" fill="none"/></svg>` },
    police: { g: "Servis", n: "Yo'l harakati xavfsizligi xizmati posti", svg: `<svg viewBox="0 0 120 120" role="img"><rect x="8" y="8" width="104" height="104" rx="8" fill="${B}"/><rect x="22" y="22" width="76" height="76" fill="#fff"/><text x="60" y="72" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="26" fill="#222">IIO</text></svg>` },
    plate_blind: { g: "Qo'shimcha axborot", n: "Ko'zi ojiz piyodalar", svg: `<svg viewBox="0 0 120 80" role="img"><rect x="4" y="4" width="112" height="72" rx="4" fill="#fff" stroke="#222" stroke-width="3"/><circle cx="56" cy="20" r="6" fill="#222"/><path d="M56 28v20l-6 16M56 36l10 6M56 48l6 16M68 42l14 26" stroke="#222" stroke-width="5" fill="none" stroke-linecap="round"/></svg>` },
    plate_wet: { g: "Qo'shimcha axborot", n: "Ho'l qoplama", svg: `<svg viewBox="0 0 120 80" role="img"><rect x="4" y="4" width="112" height="72" rx="4" fill="#fff" stroke="#222" stroke-width="3"/><path d="M36 42a12 12 0 0 1 4-22a16 16 0 0 1 30 2a10 10 0 0 1 8 20z" fill="#222"/><path d="M44 52l-4 10M58 52l-4 10M72 52l-4 10" stroke="#222" stroke-width="4"/></svg>` },
    plate_disabled: { g: "Qo'shimcha axborot", n: "Nogironligi bo'lgan shaxslar", svg: `<svg viewBox="0 0 120 80" role="img"><rect x="4" y="4" width="112" height="72" rx="4" fill="#fff" stroke="#222" stroke-width="3"/><circle cx="56" cy="16" r="6" fill="#222"/><path d="M56 24v20h16l6 14M56 34h12" stroke="#222" stroke-width="5" fill="none"/><circle cx="54" cy="52" r="14" fill="none" stroke="#222" stroke-width="4"/></svg>` },
    no_entry: { g: "Taqiqlovchi", n: "Kirish taqiqlanadi", svg: `<svg viewBox="0 0 120 120" role="img"><circle cx="60" cy="60" r="54" fill="${R}" stroke="#fff" stroke-width="3"/><rect x="22" y="50" width="76" height="20" fill="#fff"/></svg>` },
    no_traffic: { g: "Taqiqlovchi", n: "Harakatlanish taqiqlanadi", svg: ring('') },
    no_overtaking: { g: "Taqiqlovchi", n: "Quvib o'tish taqiqlanadi", svg: ring(`<rect x="30" y="44" width="24" height="38" rx="7" fill="${R}"/><rect x="66" y="44" width="24" height="38" rx="7" fill="#222"/>`) },
    speed40: { g: "Taqiqlovchi", n: "Eng yuqori tezlik cheklovi", svg: ring(`<text x="60" y="76" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="44" fill="#222">40</text>`) },
    no_horn: { g: "Taqiqlovchi", n: "Tovush signali berish taqiqlanadi", svg: ring(`<path d="M36 52h12l18-12v40L48 68H36z" fill="#222"/><path d="M30 86 90 34" stroke="${R}" stroke-width="8"/>`) },
    no_parking: { g: "Taqiqlovchi", n: "To'xtab turish taqiqlanadi", svg: blueRing(`<path d="M27 27 93 93" stroke="${R}" stroke-width="10"/>`) },
    no_stopping: { g: "Taqiqlovchi", n: "To'xtash taqiqlanadi", svg: blueRing(`<path d="M27 27 93 93M93 27 27 93" stroke="${R}" stroke-width="10"/>`) },
    straight: { g: "Buyuruvchi", n: "To'g'riga harakatlanish", svg: blue(`<path d="M60 96V42" stroke="#fff" stroke-width="12"/><polygon points="38,48 60,20 82,48" fill="#fff"/>`) },
    right_only: { g: "Buyuruvchi", n: "O'ngga harakatlanish", svg: blue(`<path d="M42 92V62a8 8 0 0 1 8-8h22" stroke="#fff" stroke-width="12" fill="none"/><polygon points="66,32 94,54 66,76" fill="#fff"/>`) },
    roundabout: { g: "Buyuruvchi", n: "Aylanma harakat", svg: blue([0, 120, 240].map(a => `<g transform="rotate(${a} 60 60)"><path d="M38 44 A26 26 0 0 1 76 38" fill="none" stroke="#fff" stroke-width="9"/><polygon points="72,26 90,40 70,50" fill="#fff"/></g>`).join('')) },
    pedestrian: { g: "Axborot", n: "Piyodalar o'tish joyi", svg: `<svg viewBox="0 0 120 120" role="img"><rect x="8" y="8" width="104" height="104" rx="8" fill="${B}"/><polygon points="60,18 104,100 16,100" fill="#fff"/><circle cx="62" cy="46" r="7" fill="#222"/><path d="M60 54 54 74 46 90M56 70 66 76 70 90M58 60 70 66M58 60 48 66" stroke="#222" stroke-width="5" stroke-linecap="round" fill="none"/><path d="M28 94h64" stroke="#222" stroke-width="4" stroke-dasharray="7 5"/></svg>` },
    parking: { g: "Axborot", n: "To'xtab turish joyi", svg: `<svg viewBox="0 0 120 120" role="img"><rect x="8" y="8" width="104" height="104" rx="8" fill="${B}"/><text x="60" y="88" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="72" fill="#fff">P</text></svg>` },
    one_way: { g: "Axborot", n: "Bir tomonlama harakatli yo'l", svg: `<svg viewBox="0 0 120 120" role="img"><rect x="8" y="8" width="104" height="104" rx="8" fill="${B}"/><path d="M60 98V46" stroke="#fff" stroke-width="14"/><polygon points="34,52 60,18 86,52" fill="#fff"/></svg>` }
  };
  S.children.svg = tri(`<circle cx="50" cy="52" r="6" fill="#222"/><circle cx="71" cy="58" r="5" fill="#222"/><path d="M50 60v20l-6 14M50 70l8 10M71 65v16l5 12M71 72l-6 10" stroke="#222" stroke-width="5" stroke-linecap="round" fill="none"/>`);
  window.SIGNS = S;
  window.renderImage = function (img) {
    if (!img) return '';
    if (img.startsWith('sign:')) { const s = S[img.slice(5)]; return s ? s.svg : ''; }
    if (/^(\/uploads\/|https:\/\/)/.test(img)) return `<img src="${img.replace(/"/g, '')}" alt="Savol rasmi" loading="lazy">`;
    return '';
  };
})();

/* ---------- Real ko'rinishdagi vaziyat rasmlari ---------- */
(function () {
  const ANG = { S: 0, W: 90, N: 180, E: 270 };
  const COL = { A: '#C8202F', B: '#1F5FB8', C: '#1E7A45', D: '#E3A21A' };
  const rot = (x, y, a) => { const r = a * Math.PI / 180, dx = x - 150, dy = y - 150; return [150 + dx * Math.cos(r) - dy * Math.sin(r), 150 + dx * Math.sin(r) + dy * Math.cos(r)]; };
  let uid = 0;
  const PATH = {
    S: 'M180 232 L180 60',
    R: 'M180 232 L180 205 Q180 180 205 180 L245 180',
    L: 'M180 232 L180 155 Q180 120 145 120 L60 120',
    U: 'M180 232 L180 145 Q180 112 150 112 Q120 112 120 145 L120 200'
  };
  function defs(id) {
    return `<defs>
      <linearGradient id="sh${id}" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".28"/><stop offset=".35" stop-color="#fff" stop-opacity=".28"/><stop offset=".5" stop-color="#fff" stop-opacity=".05"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></linearGradient>
      <linearGradient id="gl${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4E6A85"/><stop offset="1" stop-color="#15212D"/></linearGradient>
      <filter id="ds${id}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2"/></filter>
      <pattern id="as${id}" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#4B5157"/><circle cx="1" cy="2" r=".6" fill="#555C63"/><circle cx="4" cy="5" r=".5" fill="#42484E"/></pattern>
      <pattern id="gr${id}" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#8DB36F"/><circle cx="2" cy="3" r="1" fill="#7FA663"/><circle cx="6" cy="6" r="1" fill="#9BC07C"/></pattern>
      ${Object.entries(COL).map(([k, c]) => `<marker id="ah${k}${id}" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="3.2" markerHeight="3.2" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${c}" stroke="#fff" stroke-width="1.2"/></marker>`).join('')}
    </defs>`;
  }
  // tepadan ko'rinadigan avtomobil (0,0 markazda, old tomoni yuqoriga)
  function carBody(color, id, kind) {
    if (kind === 'tram') return `<g><rect x="-17" y="-46" width="34" height="96" rx="7" fill="#000" opacity=".3" filter="url(#ds${id})" transform="translate(2,3)"/>
      <rect x="-16" y="-46" width="32" height="92" rx="7" fill="${color}"/><rect x="-16" y="-46" width="32" height="92" rx="7" fill="url(#sh${id})"/>
      <rect x="-12" y="-44" width="24" height="10" rx="3" fill="url(#gl${id})"/><rect x="-11" y="-28" width="22" height="58" rx="3" fill="#E9ECEF" opacity=".9"/>
      <path d="M-11 -14h22M-11 0h22M-11 14h22" stroke="#B9C0C7" stroke-width="1.5"/><path d="M-8 -6l8 -10 8 10" stroke="#222" stroke-width="2" fill="none"/>
      <rect x="-12" y="-47" width="5" height="2.5" rx="1" fill="#FFF4C2"/><rect x="7" y="-47" width="5" height="2.5" rx="1" fill="#FFF4C2"/></g>`;
    if (kind === 'truck') return `<g><rect x="-17" y="-38" width="34" height="80" rx="4" fill="#000" opacity=".3" filter="url(#ds${id})" transform="translate(2,3)"/>
      <rect x="-15" y="-38" width="30" height="20" rx="5" fill="${color}"/><rect x="-15" y="-38" width="30" height="20" rx="5" fill="url(#sh${id})"/><rect x="-12" y="-36" width="24" height="7" rx="2" fill="url(#gl${id})"/>
      <rect x="-16" y="-16" width="32" height="56" rx="2" fill="#D9DDE1" stroke="#9AA2AA"/><path d="M-16 -2h32M-16 12h32M-16 26h32" stroke="#B5BCC3"/></g>`;
    return `<g><rect x="-15" y="-27" width="30" height="56" rx="10" fill="#000" opacity=".32" filter="url(#ds${id})" transform="translate(2,3)"/>
      <rect x="-14" y="-28" width="28" height="56" rx="10" fill="${color}"/><rect x="-14" y="-28" width="28" height="56" rx="10" fill="url(#sh${id})"/>
      <path d="M-11 -11Q0 -16 11 -11L9.5 -2Q0 -4.5 -9.5 -2Z" fill="url(#gl${id})"/>
      <rect x="-9" y="-1" width="18" height="15" rx="3" fill="${color}" opacity=".95"/><rect x="-9" y="-1" width="18" height="15" rx="3" fill="#fff" opacity=".08"/>
      <path d="M-9.5 15Q0 17.5 9.5 15L10.5 21Q0 24 -10.5 21Z" fill="url(#gl${id})"/>
      <rect x="-17" y="-9" width="4" height="5" rx="1.5" fill="${color}"/><rect x="13" y="-9" width="4" height="5" rx="1.5" fill="${color}"/>
      <rect x="-11" y="-28.5" width="6" height="3" rx="1.2" fill="#FFF4C2"/><rect x="5" y="-28.5" width="6" height="3" rx="1.2" fill="#FFF4C2"/>
      <rect x="-11" y="26" width="6" height="2.5" rx="1" fill="#E5333B"/><rect x="5" y="26" width="6" height="2.5" rx="1" fill="#E5333B"/></g>`;
  }
  function badge(x, y, letter, color) {
    return `<circle cx="${x}" cy="${y}" r="11" fill="#fff" stroke="${color}" stroke-width="3"/><text x="${x}" y="${y + 5}" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="14" fill="${color}">${letter}</text>`;
  }
  function vehicle(letter, ang, isTram, move, id) {
    const c = COL[letter] || '#888';
    const arrow = move ? `<path d="${PATH[move]}" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/><path d="${PATH[move]}" fill="none" stroke="${c}" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#ah${letter}${id})"/>` : '';
    const cy = isTram ? 268 : 262;
    const [bx, by] = rot(isTram ? 206 : 204, isTram ? 276 : 270, ang);
    return `<g transform="rotate(${ang} 150 150)">${arrow}<g transform="translate(180 ${cy})">${carBody(isTram ? '#E8B21E' : c, id, isTram ? 'tram' : 'car')}</g></g>${badge(bx, by, isTram ? 'T' : letter, isTram ? '#8A6A00' : c)}`;
  }
  function tree(x, y, r) { return `<circle cx="${x + 3}" cy="${y + 4}" r="${r}" fill="#000" opacity=".18"/><circle cx="${x}" cy="${y}" r="${r}" fill="#3F7A3A"/><circle cx="${x - r / 3}" cy="${y - r / 3}" r="${r / 2}" fill="#5A9650"/>`; }
  function base(id) {
    let o = `<rect width="300" height="300" fill="#C9CDD1"/>`;
    for (const [x, y] of [[0, 0], [224, 0], [0, 224], [224, 224]]) o += `<rect x="${x}" y="${y}" width="76" height="76" rx="${0}" fill="url(#gr${id})"/>`;
    o += `<path d="M76 0V64Q76 76 64 76H0M224 0V64Q224 76 236 76H300M76 300V236Q76 224 64 224H0M224 300V236Q224 224 236 224H300" fill="none" stroke="#A9AEB3" stroke-width="2"/>`;
    o += `<rect x="90" y="0" width="120" height="300" fill="url(#as${id})"/><rect x="0" y="90" width="300" height="120" fill="url(#as${id})"/>`;
    o += `<path d="M90 0V80Q90 90 80 90H0M210 0V80Q210 90 220 90H300M90 300V220Q90 210 80 210H0M210 300V220Q210 210 220 210H300" fill="none" stroke="#E7E9EB" stroke-width="3"/>`;
    o += `<path d="M150 0V72M150 228V300M0 150H72M228 150H300" stroke="#F2F2F2" stroke-width="2.5" stroke-dasharray="12 9"/>`;
    for (let k = 0; k < 4; k++) { // zebra va to'xtash chiziqlari
      let z = ''; for (let i = 0; i < 7; i++) z += `<rect x="${94 + i * 16.5}" y="212" width="9" height="13" fill="#EDEDED" opacity=".9"/>`;
      o += `<g transform="rotate(${k * 90} 150 150)">${z}<path d="M152 230H208" stroke="#EDEDED" stroke-width="3"/></g>`;
    }
    o += tree(30, 34, 13) + tree(268, 40, 11) + tree(36, 270, 11) + tree(262, 262, 14);
    return o;
  }
  function pole(x, y, key) {
    const s = window.SIGNS[key]; if (!s) return '';
    return `<rect x="${x - 1.2}" y="${y}" width="2.4" height="16" fill="#6B7178"/>` + s.svg.replace('<svg ', `<svg x="${x - 13}" y="${y - 24}" width="26" height="26" `);
  }
  function light(st, x, y) {
    const main = st[0], arrow = st.includes('+R');
    const on = { r: main === 'r', y: main === 'y' || main === 'f', g: main === 'g' };
    const L = (cy, c, lit) => `<circle cx="${x}" cy="${cy}" r="5.5" fill="${lit ? c : '#2A2E33'}"/>${lit ? `<circle cx="${x}" cy="${cy}" r="8" fill="${c}" opacity=".25"/>` : ''}<path d="M${x - 7} ${cy - 6}h14" stroke="#111" stroke-width="2"/>`;
    let g = `<rect x="${x - 1.5}" y="${y + 20}" width="3" height="12" fill="#5E646B"/><rect x="${x - 9}" y="${y - 26}" width="18" height="48" rx="4" fill="#1B1E22" stroke="#3A3F45"/>` + L(y - 15, '#FF3B30', on.r) + L(y - 1, '#FFC300', on.y) + L(y + 13, '#2ECC71', on.g);
    if (main === 'f') g += `<circle cx="${x}" cy="${y - 1}" r="10" fill="none" stroke="#FFC300" stroke-width="1.5" stroke-dasharray="3 3"/>`;
    if (arrow) g += `<rect x="${x + 9}" y="${y + 5}" width="16" height="16" rx="3" fill="#1B1E22" stroke="#3A3F45"/><path d="M${x + 12} ${y + 13}h8m-3 -3l3 3l-3 3" stroke="#2ECC71" stroke-width="2.2" fill="none"/>`;
    return g;
  }
  const open = (id, h) => `<svg viewBox="0 0 300 ${h || 300}" role="img" style="width:280px;height:${h ? 187 : 280}px;max-width:100%">${defs(id)}`;
  window.renderScene = function (sc) {
    const id = ++uid; let out = open(id) + base(id);
    if (sc.t === 'main') for (const a of ['S', 'N', 'E', 'W']) { const [x, y] = rot(232, 246, ANG[a]); out += pole(x, y, a === 'S' || a === 'N' ? 'main_road' : 'give_way'); }
    if (sc.l) for (const [a, st] of Object.entries(sc.l)) { const [x, y] = rot(232, 246, ANG[a]); out += light(st, x, y); }
    (sc.c || []).forEach((v, i) => { out += vehicle('ABCD'[i], ANG[v.a], v.tram, v.m, id); });
    return out + '</svg>';
  };
  window.renderRegulator = function (sc) {
    const id = ++uid, ang = ANG[sc.f];
    let fig = `<g transform="rotate(${ang} 150 150)"><ellipse cx="152" cy="153" rx="22" ry="12" fill="#000" opacity=".25"/>
      <ellipse cx="150" cy="150" rx="21" ry="11" fill="#22374F"/><rect x="129" y="146" width="42" height="7" rx="3" fill="#C8D23A" opacity=".85"/>
      <circle cx="150" cy="150" r="8.5" fill="#F4F4F4" stroke="#2A2A2A" stroke-width="1"/><path d="M143 156q7 6 14 0" stroke="#111" stroke-width="3" fill="none"/>`;
    if (sc.g === 'side') fig += `<path d="M130 150H100M170 150H200" stroke="#22374F" stroke-width="7" stroke-linecap="round"/><circle cx="99" cy="150" r="4" fill="#fff"/><circle cx="201" cy="150" r="4" fill="#fff"/>`;
    if (sc.g === 'fwd') fig += `<path d="M132 152V188" stroke="#22374F" stroke-width="7" stroke-linecap="round"/><rect x="129" y="186" width="7" height="20" rx="2" fill="#fff" stroke="#222"/><path d="M129 192h7M129 198h7" stroke="#111" stroke-width="2"/>`;
    fig += '</g>';
    if (sc.g === 'up') fig += `<circle cx="150" cy="150" r="30" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="4 4"/><rect x="104" y="98" width="92" height="18" rx="4" fill="#1B1E22" opacity=".75"/><text x="150" y="111" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" font-weight="700" fill="#fff">qo'l yuqorida</text>`;
    return open(id) + base(id) + fig + vehicle('A', ANG[sc.a], sc.tram, null, id) + '</svg>';
  };
  function person(x, y, color) { return `<ellipse cx="${x + 2}" cy="${y + 3}" rx="9" ry="6" fill="#000" opacity=".25"/><ellipse cx="${x}" cy="${y}" rx="9" ry="6" fill="${color}"/><circle cx="${x}" cy="${y}" r="4.5" fill="#3B2A1E"/>`; }
  window.renderPed = function (sc) {
    const id = ++uid;
    let o = open(id) + `<rect width="300" height="300" fill="url(#gr${id})"/><rect x="36" y="0" width="24" height="300" fill="#C9CDD1"/><rect x="240" y="0" width="24" height="300" fill="#C9CDD1"/>
      <rect x="60" y="0" width="180" height="300" fill="url(#as${id})"/><path d="M60 0V300M240 0V300" stroke="#E7E9EB" stroke-width="3"/><path d="M150 0V300" stroke="#F2F2F2" stroke-width="2.5" stroke-dasharray="14 10"/>`;
    for (let i = 0; i < 9; i++) o += `<rect x="${64 + i * 19.5}" y="112" width="11" height="42" fill="#EDEDED"/>`;
    o += `<path d="M64 168H236" stroke="#EDEDED" stroke-width="3"/>` + tree(18, 60, 12) + tree(282, 230, 12);
    if (sc.tl) o += light(sc.tl, 268, 192); else o += pole(268, 186, 'pedestrian');
    if (sc.adj) o += `<g transform="translate(110 200)">${carBody('#8B949C', id, 'car')}</g>`;
    o += `<path d="M190 226V178" stroke="#fff" stroke-width="9" stroke-linecap="round" opacity=".85"/><path d="M190 226V178" stroke="#C8202F" stroke-width="5.5" stroke-linecap="round" marker-end="url(#ahA${id})"/>`;
    o += `<g transform="translate(190 258)">${carBody('#C8202F', id, 'car')}</g>` + badge(216, 268, 'A', '#C8202F');
    const P = { mine: [190, 133], other: [108, 133], curb: [250, 133], none: null, far: [48, 40] }[sc.p];
    if (P) o += person(P[0], P[1], '#E8A33D');
    return o + '</svg>';
  };
  window.renderOvt = function (sc) {
    const id = ++uid;
    let o = `<svg viewBox="0 0 300 200" role="img" style="width:300px;height:200px;max-width:100%">${defs(id)}<rect width="300" height="200" fill="url(#gr${id})"/><rect x="0" y="40" width="300" height="10" fill="#B9BEC3"/><rect x="0" y="150" width="300" height="10" fill="#B9BEC3"/><rect x="0" y="50" width="300" height="100" fill="url(#as${id})"/><path d="M0 52H300M0 148H300" stroke="#EDEDED" stroke-width="2"/>`;
    const Lm = { solid: '<path d="M0 100H300" stroke="#fff" stroke-width="3"/>', dash: '<path d="M0 100H300" stroke="#fff" stroke-width="3" stroke-dasharray="16 12"/>', double: '<path d="M0 97H300M0 103H300" stroke="#fff" stroke-width="2.5"/>', mixdash: '<path d="M0 97H300" stroke="#fff" stroke-width="2.5"/><path d="M0 103H300" stroke="#fff" stroke-width="2.5" stroke-dasharray="14 10"/>', mixsolid: '<path d="M0 97H300" stroke="#fff" stroke-width="2.5" stroke-dasharray="14 10"/><path d="M0 103H300" stroke="#fff" stroke-width="2.5"/>' }[sc.line];
    o += Lm + tree(20, 20, 12) + tree(150, 178, 11);
    if (sc.loc === 'zebra') { for (let i = 0; i < 9; i++) o += `<rect x="232" y="${54 + i * 10.6}" width="34" height="6" fill="#EDEDED"/>`; o += pole(282, 166, 'pedestrian'); }
    if (sc.loc === 'rail') o += `<rect x="226" y="40" width="36" height="120" fill="#7A6A58"/><path d="M226 50V150" stroke="#555" stroke-width="0"/><path d="M228 46H260M228 60H260M228 74H260M228 88H260M228 102H260M228 116H260M228 130H260M228 144H260" stroke="#5B4632" stroke-width="4"/><path d="M236 40V160M252 40V160" stroke="#8C949C" stroke-width="3.5"/>` + pole(212, 172, 'rail_nobarrier');
    if (sc.loc === 'hill') o += `<path d="M150 50Q230 -8 300 50" fill="#6E8F52" opacity=".9"/><path d="M200 100H300" stroke="#000" stroke-width="100" opacity=".12"/><rect x="214" y="4" width="70" height="16" rx="3" fill="#1B1E22" opacity=".7"/><text x="249" y="16" text-anchor="middle" font-family="Arial" font-size="11" font-weight="700" fill="#fff">tepalik</text>`;
    if (sc.loc === 'cross') o += `<rect x="228" y="0" width="44" height="200" fill="url(#as${id})"/><path d="M228 0V40M272 0V40M228 160V200M272 160V200" stroke="#EDEDED" stroke-width="2"/>` + pole(212, 176, 'crossroad');
    o += `<g transform="translate(46 122) rotate(90)">${carBody('#C8202F', id, 'car')}</g>` + badge(46, 98 + 46, 'A', '#C8202F');
    o += `<g transform="translate(130 124) rotate(90)">${carBody('#6F7780', id, 'truck')}</g>`;
    if (sc.blink) o += `<circle cx="166" cy="110" r="4" fill="#FF9500"/><circle cx="166" cy="110" r="8" fill="#FF9500" opacity=".35"/><circle cx="94" cy="110" r="4" fill="#FF9500"/><circle cx="94" cy="110" r="8" fill="#FF9500" opacity=".35"/>`;
    if (sc.onc === 'near') o += `<g transform="translate(212 76) rotate(-90)">${carBody('#1F5FB8', id, 'car')}</g>`;
    if (sc.onc === 'far') o += `<rect x="180" y="62" width="110" height="18" rx="3" fill="#1B1E22" opacity=".55"/><text x="235" y="75" text-anchor="middle" font-family="Arial" font-size="11" fill="#fff">qarama-qarshi yo'l bo'sh</text>`;
    return o + '</svg>';
  };
  window.renderLine = function (k) {
    let o = `<svg viewBox="0 0 300 200" role="img" style="width:300px;height:200px;max-width:100%"><rect width="300" height="200" fill="#C9D3C0"/><rect x="0" y="40" width="300" height="120" fill="#5A6066"/>`;
    const M = {
      solid: '<path d="M0 100H300" stroke="#fff" stroke-width="4"/>',
      dash: '<path d="M0 100H300" stroke="#fff" stroke-width="4" stroke-dasharray="18 14"/>',
      double: '<path d="M0 96H300M0 104H300" stroke="#fff" stroke-width="3"/>',
      mix: '<path d="M0 96H300" stroke="#fff" stroke-width="3"/><path d="M0 104H300" stroke="#fff" stroke-width="3" stroke-dasharray="16 12"/>',
      approach: '<path d="M0 100H300" stroke="#fff" stroke-width="4" stroke-dasharray="40 8"/>',
      edge: '<path d="M0 100H300" stroke="#fff" stroke-width="3" stroke-dasharray="18 14"/><path d="M0 50H300M0 150H300" stroke="#fff" stroke-width="4"/>',
      reversiv: '<path d="M0 70H300M0 76H300" stroke="#fff" stroke-width="3" stroke-dasharray="16 10"/><path d="M0 124H300M0 130H300" stroke="#fff" stroke-width="3" stroke-dasharray="16 10"/>',
      stopline: '<path d="M0 100H200" stroke="#fff" stroke-width="3" stroke-dasharray="18 14"/><path d="M200 100V160" stroke="#fff" stroke-width="7"/><rect x="214" y="40" width="86" height="120" fill="#6A7076"/>',
      arrows: '<path d="M0 100H300" stroke="#fff" stroke-width="3" stroke-dasharray="18 14"/><path d="M60 130H130q20 0 20 -14" stroke="#fff" stroke-width="7" fill="none"/><polygon points="140,118 150,100 160,118" fill="#fff"/>',
      vertical: '<rect x="120" y="10" width="60" height="180" fill="#fff"/><path d="M120 30l60 -30M120 70l60 -30M120 110l60 -30M120 150l60 -30M120 190l60 -30" stroke="#111" stroke-width="14"/>',
      temp: '<path d="M0 100H300" stroke="#fff" stroke-width="4"/><path d="M0 88H300" stroke="#FFC300" stroke-width="4" stroke-dasharray="18 14"/>'
    };
    return o + (M[k] || '') + '</svg>';
  };
  window.renderTL = function (k) {
    const body = (x, sig) => `<rect x="${x}" y="30" width="56" height="150" rx="10" fill="#222"/>` + ['r', 'y', 'g'].map((c, i) => `<circle cx="${x + 28}" cy="${60 + i * 45}" r="17" fill="${sig[c] ? { r: '#FF3B30', y: '#FFC300', g: '#2ECC71' }[c] : '#333'}"/>`).join('');
    let o = `<svg viewBox="0 0 300 200" role="img" style="width:300px;height:200px;max-width:100%"><rect width="300" height="200" fill="#DDE3E8"/>`;
    if (k === 'rev_x') o += `<rect x="110" y="40" width="80" height="80" rx="8" fill="#222"/><path d="M128 58l44 44M172 58l-44 44" stroke="#FF3B30" stroke-width="10"/>`;
    if (k === 'rev_arrow') o += `<rect x="110" y="40" width="80" height="80" rx="8" fill="#222"/><path d="M150 54v44" stroke="#2ECC71" stroke-width="10"/><polygon points="132,92 150,112 168,92" fill="#2ECC71"/>`;
    if (k === 'ped_g' || k === 'ped_r') { const c = k === 'ped_g' ? '#2ECC71' : '#FF3B30'; o += `<rect x="115" y="20" width="70" height="160" rx="10" fill="#222"/><circle cx="150" cy="${k === 'ped_g' ? 135 : 65}" r="26" fill="#111"/><circle cx="150" cy="${k === 'ped_g' ? 122 : 52}" r="5" fill="${c}"/><path d="M150 ${k === 'ped_g' ? 128 : 58}v16 ${k === 'ped_g' ? 'l-8 14M150 144l8 14M150 134l10 6M150 134l-10 4' : 'l-4 16M150 74l4 16M150 64l-8 10M150 64l8 10'}" stroke="${c}" stroke-width="4" fill="none"/>`; }
    if (k === 'main_arrow') { o += body(122, { g: 1 }); o += `<rect x="137" y="140" width="26" height="22" fill="#222"/><path d="M142 151h16m-5 -5l5 5l-5 5" stroke="#2ECC71" stroke-width="3" fill="none"/>`; }
    if (k === 'red_plus') { o += body(100, { r: 1 }) + `<rect x="160" y="125" width="44" height="44" rx="8" fill="#222"/><circle cx="182" cy="147" r="17" fill="#173d24"/><path d="M172 147h20m-6 -6l6 6l-6 6" stroke="#2ECC71" stroke-width="4" fill="none"/>`; }
    if (k === 'red_no') { o += body(122, { r: 1 }); }
    return o + '</svg>';
  };
  const prev = window.renderImage;
  window.renderImage = function (img) {
    if (img && img.startsWith('scene:')) { try { return renderScene(JSON.parse(img.slice(6))); } catch (e) { return ''; } }
    if (img && img.startsWith('line:')) return renderLine(img.slice(5));
    if (img && img.startsWith('tl:')) return renderTL(img.slice(3));
    if (img && img.startsWith('ped:')) { try { return renderPed(JSON.parse(img.slice(4))); } catch (e) { return ''; } }
    if (img && img.startsWith('ovt:')) { try { return renderOvt(JSON.parse(img.slice(4))); } catch (e) { return ''; } }
    if (img && img.startsWith('reg:')) { try { return renderRegulator(JSON.parse(img.slice(4))); } catch (e) { return ''; } }
    return prev(img);
  };
})();
