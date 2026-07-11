const API = (() => {

  // ─── Mock data definitions ───────────────────────────────────────────────
  const PRODUCTS = [
    { name: 'KALSIPLANK JT 8 MM (20 X 300)',     cat: 'EBPI',          price: 32000,  range: [50,450] },
    { name: 'KALSILING 3,5 MM (120 X 240)',       cat: 'EBPI',          price: 63000,  range: [20,200] },
    { name: 'KALSILING 3,5 MM (122 X 244)',       cat: 'EBPI',          price: 66700,  range: [10,200] },
    { name: 'GO GREEN HIJAU 180 X 80',            cat: 'EBPI',          price: 46500,  range: [20,150] },
    { name: 'GO GREEN MERAH 180 X 80',            cat: 'EBPI',          price: 46500,  range: [20,100] },
    { name: 'TRIMDEK SILVER BKT 0,25X 6 MTR',    cat: 'EBPI',          price: 147000, range: [5,50]  },
    { name: 'TRIMDEK SILVER BKT 0,25X 5 MTR',    cat: 'EBPI',          price: 122500, range: [5,50]  },
    { name: 'TRIMDEK SILVER BKT 0,25X 4 MTR',    cat: 'EBPI',          price: 98000,  range: [5,50]  },
    { name: 'CHANAL BT C75-75 X 6M',             cat: 'Metal & Gypsum',price: 75500,  range: [10,80] },
    { name: 'HOLLOW BUKIT 0,30 4X4 PJ 4 MTR',    cat: 'Metal & Gypsum',price: 13600,  range: [50,200]},
    { name: 'SHEDOWLINE BUKIT@ 3 M',             cat: 'Metal & Gypsum',price: 7000,   range: [50,200]},
    { name: 'DAMDEX MLT FGS 1 LTR @ 24 JRG',     cat: 'Other',         price: 1275660,range: [1,12]  },
    { name: 'DAMDEX MLT FGS 5 LTR @ 6 GLN',      cat: 'Other',         price: 1502520,range: [1,8]   },
    { name: 'AQUAPROOF ABU @ 20 KG',              cat: 'Other',         price: 320000, range: [2,20]  },
    // Uncategorized (untuk sistem alert)
    { name: 'PRODUK BARU BELUM KATEGORI', cat: null, price: 50000, range: [5,30] },
  ];

  const OUTLET_NAMES = [
    'UD Sumber Makmur','Toko Bangunan Jaya','CV Maju Bersama','PD Berkah Jaya',
    'Toko Material Abadi','Toko Besi Mandiri','UD Sejahtera','Toko Bangunan Barokah',
    'CV Prima Jaya','Toko Material Indah','Toko Berkah Bersama','UD Sumber Jaya',
    'Toko Bangunan Sejati','PD Maju Jaya','Toko Material Harapan','UD Berkah Mandiri',
    'Toko Bangunan Utama','CV Jaya Abadi','Toko Material Makmur','UD Bintang Timur',
    'Toko Bangunan Sentral','CV Karya Mandiri','PD Sumber Baru','UD Harapan Jaya',
    'Toko Besi Sejahtera','CV Berkah Utama','Toko Material Baru','UD Prima Mandiri',
    'PD Jaya Abadi','Toko Bangunan Baru','CV Sumber Makmur','UD Karya Bersama',
    'Toko Material Sentral','PD Berkah Mandiri','CV Harapan Utama','UD Maju Abadi',
    'Toko Bangunan Mandiri','CV Sumber Jaya','PD Prima Bersama','UD Material Barokah',
    'Toko Besi Baru','CV Maju Abadi','PD Sumber Sejahtera','UD Berkah Bersama',
    'Toko Bangunan Prima','CV Jaya Mandiri','PD Material Utama','UD Sumber Bersama',
    'Toko Sejahtera Jaya','CV Berkah Baru','PD Maju Mandiri','UD Harapan Baru',
    'Toko Material Prima','CV Sumber Utama','PD Karya Jaya','UD Bangunan Abadi',
    'Toko Besi Utama','CV Harapan Bersama','PD Berkah Baru','UD Jaya Sentral',
    'Toko Prima Abadi','CV Karya Utama','PD Sumber Mandiri','UD Maju Sentral',
    'Toko Bangunan Abadi','CV Prima Bersama','PD Harapan Mandiri','UD Sentral Jaya',
    'Toko Material Mandiri','CV Berkah Sejahtera','PD Karya Bersama','UD Abadi Jaya',
    'Toko Besi Abadi','CV Maju Sentral','PD Prima Mandiri','UD Karya Jaya',
    'Toko Bangunan Karya','CV Sumber Bersama','PD Jaya Sentral','UD Prima Baru',
    'Toko Sejahtera Baru','CV Harapan Jaya','PD Maju Baru','UD Karya Baru',
    'Toko Material Jaya','CV Jaya Baru','PD Berkah Sentral','UD Harapan Sentral',
    'Toko Bangunan Bersama','CV Material Jaya','PD Abadi Mandiri','UD Maju Baru',
    'Toko Besi Sentral','CV Prima Sentral','PD Harapan Baru','UD Bersama Jaya',
    'Toko Material Bersama','CV Karya Sentral','PD Sumber Bersama','UD Sentral Baru',
    'Toko Prima Sentral','CV Abadi Jaya','PD Maju Sentral','UD Abadi Baru',
    'Toko Bangunan Sentral 2','CV Sentral Jaya','PD Berkah Bersama 2','UD Makmur Baru',
    'Toko Bangunan Makmur','CV Makmur Jaya','PD Makmur Mandiri','UD Makmur Sentral',
    'Toko Besi Makmur','CV Bersama Makmur','PD Sentral Makmur','UD Jaya Makmur',
    'Toko Material Makmur 2','CV Makmur Baru','PD Makmur Sentral 2','UD Karya Makmur',
  ];

  function _rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function _seededRand(seed, min, max) {
    const x = Math.sin(seed) * 10000;
    const r = x - Math.floor(x);
    return Math.floor(r * (max - min + 1)) + min;
  }

  function generateMockData() {
    const now = new Date();
    const curYear  = now.getFullYear();
    const curMonth = now.getMonth() + 1;

    const salesmen = CONFIG.SALESMAN_LIST;
    const months   = [];
    for (let i = 2; i >= 0; i--) {
      let m = curMonth - i;
      let y = curYear;
      if (m <= 0) { m += 12; y -= 1; }
      months.push({ year: y, month: m });
    }

    // Build outlet pool: 20 per salesman → 120 total
    const outlets = [];
    salesmen.forEach((sm, si) => {
      for (let j = 0; j < 20; j++) {
        const idx = si * 20 + j;
        outlets.push({
          id:       `CUST${String(idx + 1).padStart(3,'0')}`,
          name:     OUTLET_NAMES[idx] || `Toko Outlet ${idx + 1}`,
          salesman: sm.name,
          salesman_id: sm.id,
          area:     sm.area,
        });
      }
    });

    // Category master
    const categories = PRODUCTS
      .filter(p => p.cat !== null)
      .map(p => ({ product: p.name, category: p.cat }));

    // Targets per salesman per month
    const targetBase = {
      'SM001': 1_000_000_000,
      'SM002':   530_000_000,
      'SM003':   530_000_000,
      'SM004':   540_000_000,
      'SM005':   490_000_000,
      'SM006':   505_000_000,
      'SM007':   560_000_000,
    };
    // Per-category target splits (mirrors TARGET.csv structure)
    const CAT_SPLIT = { 'EBPI': 0.60, 'Metal & Gypsum': 0.20, 'Other': 0.20 };
    const targets = [];
    months.forEach(({ year, month }) => {
      salesmen.forEach(sm => {
        const base = targetBase[sm.id] || 500_000_000;
        const total = base + _seededRand(sm.id.charCodeAt(2) + month, -50_000_000, 50_000_000);
        Object.entries(CAT_SPLIT).forEach(([category, ratio]) => {
          targets.push({
            salesman: sm.name, salesman_id: sm.id,
            year, month, category,
            target: Math.round(total * ratio),
          });
        });
      });
    });

    // Sales transactions
    const sales = [];
    let invoiceNum = 1;

    months.forEach(({ year, month }, mi) => {
      const daysInMonth = new Date(year, month, 0).getDate();
      const isCurrentMonth = mi === 2;
      const elapsedDays = isCurrentMonth ? Math.min(now.getDate(), daysInMonth) : daysInMonth;

      outlets.forEach((outlet, oi) => {
        // Determine if outlet is active this month
        // ~85% active each month, with some becoming lost/reactivated
        const activitySeed = oi * 31 + month * 7 + mi * 3;
        const isActive = _seededRand(activitySeed, 1, 100) <= 82;

        // Some dormant outlets reactivated in current month
        const wasInactive = mi === 1 && _seededRand(activitySeed + 99, 1, 100) > 82;
        const isReactivated = mi === 2 && wasInactive && _seededRand(activitySeed + 77, 1, 100) <= 40;

        if (!isActive && !isReactivated) return;

        const txCount = _seededRand(activitySeed + 11, 1, 6);
        const availableProducts = PRODUCTS.filter(p => _seededRand(oi + p.name.charCodeAt(0) + mi, 0, 1) === 1);
        const productPool = availableProducts.length > 0 ? availableProducts : [PRODUCTS[oi % PRODUCTS.length]];

        for (let t = 0; t < txCount; t++) {
          const day = Math.min(
            _seededRand(oi * 100 + t * 17 + mi * 31, 1, elapsedDays),
            daysInMonth
          );
          const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const prod = productPool[t % productPool.length];

          const qty   = _seededRand(oi + t + mi, prod.range[0], prod.range[1]);
          const total = qty * prod.price;

          sales.push({
            date:        dateStr,
            invoice:     `INV-${year}-${String(month).padStart(2,'0')}-${String(invoiceNum).padStart(4,'0')}`,
            salesman:    outlet.salesman,
            salesman_id: outlet.salesman_id,
            customer:    outlet.name,
            customer_id: outlet.id,
            area:        outlet.area,
            product:     prod.name,
            category:    prod.cat || 'Uncategorized',
            qty,
            price:       prod.price,
            total,
          });
          invoiceNum++;
        }
      });
    });

    return { sales, targets, categories };
  }

  // ─── Session Storage (MYOB file data) ────────────────────────────────────
  const _SESSION_KEY = 'bit_myob_data';

  function saveToSession(dataset) {
    try { sessionStorage.setItem(_SESSION_KEY, JSON.stringify(dataset)); } catch (_) {}
  }

  function loadFromSession() {
    try {
      const raw = sessionStorage.getItem(_SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }

  function clearSession() {
    sessionStorage.removeItem(_SESSION_KEY);
  }

  // ─── Load from uploaded MYOB files ────────────────────────────────────────
  async function loadFromFiles(itemSaleFile, kategoriFile, targetFile) {
    function readText(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = e => resolve(e.target.result);
        reader.onerror = () => reject(new Error(`Gagal membaca ${file.name}`));
        reader.readAsText(file, 'UTF-8');
      });
    }
    const [itemSaleText, kategoriText, targetText] = await Promise.all([
      readText(itemSaleFile),
      readText(kategoriFile),
      readText(targetFile),
    ]);
    const dataset = Parser.buildDataset(itemSaleText, kategoriText, targetText);
    saveToSession(dataset);
    return dataset;
  }

  // ─── Fetch from Google Sheets (Publish to web → CSV) ────────────────────
  async function fetchFromSheets() {
    const [salesText, kategoriText, targetText] = await Promise.all([
      fetch(CONFIG.SHEETS_SALES_URL).then(r => { if (!r.ok) throw new Error('ITEMSALE'); return r.text(); }),
      fetch(CONFIG.SHEETS_KATEGORI_URL).then(r => { if (!r.ok) throw new Error('KategoriItem'); return r.text(); }),
      fetch(CONFIG.SHEETS_TARGET_URL).then(r => { if (!r.ok) throw new Error('TARGET'); return r.text(); }),
    ]);
    return Parser.buildDataset(salesText, kategoriText, targetText, { csv: true });
  }

  // ─── Fetch from Google Apps Script ───────────────────────────────────────
  async function fetchFromGAS(year, month) {
    const url = `${CONFIG.GAS_API_URL}?year=${year}&month=${month}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  // ─── Fetch semua data dari GitHub repo ───────────────────────────────────────
  // ITEMSALE.TXT: tab-separated MYOB | TARGET.csv + KategoriItem.csv: semicolon
  //
  // raw.githubusercontent.com dicoba dulu (cache pendek, ~5 menit, jadi update
  // cepat setelah push). Kalau raw gagal/di-block jaringan, fallback ke jsDelivr
  // (cache lebih lama tapi lebih stabil aksesnya).
  function bustCache(url) {
    return `${url}?v=${Date.now()}`;
  }

  async function fetchWithFallback(primaryUrl, fallbackUrl, label) {
    try {
      const res = await fetch(bustCache(primaryUrl));
      if (!res.ok) throw new Error(`${label} HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      if (!fallbackUrl) throw err;
      const res = await fetch(fallbackUrl);
      if (!res.ok) throw new Error(label);
      return await res.text();
    }
  }

  async function fetchFromGitHub() {
    const [itemSaleText, kategoriText, targetText] = await Promise.all([
      fetchWithFallback(CONFIG.GITHUB_ITEMSALE_URL, CONFIG.GITHUB_ITEMSALE_FALLBACK_URL, 'ITEMSALE.TXT'),
      fetchWithFallback(CONFIG.GITHUB_KATEGORI_URL, CONFIG.GITHUB_KATEGORI_FALLBACK_URL, 'KategoriItem.csv'),
      fetchWithFallback(CONFIG.GITHUB_TARGET_URL, CONFIG.GITHUB_TARGET_FALLBACK_URL, 'TARGET.csv'),
    ]);
    const kategoriMap = Parser.parseKategori(kategoriText, false);
    const sales       = Parser.parseItemSale(itemSaleText, kategoriMap, false);
    const targets     = Parser.parseTarget(targetText, false);
    const categories  = [];
    kategoriMap.forEach((cat, prod) => categories.push({ product: prod, category: cat }));
    return { sales, targets, categories };
  }

  async function load(year, month) {
    // 1. Manually uploaded file (session storage) — overrides auto-source
    const sessionData = loadFromSession();
    if (sessionData) return sessionData;

    // 2. GitHub repo — sumber utama (ITEMSALE.TXT + TARGET.csv + KategoriItem.csv)
    if (CONFIG.GITHUB_ITEMSALE_URL && CONFIG.GITHUB_TARGET_URL && CONFIG.GITHUB_KATEGORI_URL) {
      return fetchFromGitHub();
    }

    // 3. Google Sheets semua CSV (fallback)
    if (CONFIG.SHEETS_SALES_URL && CONFIG.SHEETS_KATEGORI_URL && CONFIG.SHEETS_TARGET_URL) {
      return fetchFromSheets();
    }

    // 4. Google Apps Script
    if (!CONFIG.USE_MOCK_DATA && CONFIG.GAS_API_URL) {
      return fetchFromGAS(year, month);
    }

    // 5. Mock data fallback (development only)
    await new Promise(r => setTimeout(r, 400));
    return generateMockData();
  }

  return { load, generateMockData, loadFromFiles, clearSession };
})();
