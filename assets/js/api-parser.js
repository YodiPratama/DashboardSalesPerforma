const Parser = (() => {

  // Proper CSV line parser — handles quoted fields containing commas
  function _parseCSVLine(line) {
    const result = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === ',' && !inQ) {
        result.push(cur); cur = '';
      } else {
        cur += ch;
      }
    }
    result.push(cur);
    return result;
  }

  // Indonesian Rupiah string → number
  // "Rp1.324.324,32" → 1324324.32 | " Rp700.000.000 " → 700000000
  function _parseRupiah(str) {
    if (!str) return 0;
    const cleaned = str.replace(/Rp/g, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  }

  // Indonesian quantity string → number
  // "1.000" → 1000 | "1,5" → 1.5 | "1.500,50" → 1500.5
  function _parseQty(str) {
    if (!str) return 0;
    const cleaned = str.trim().replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  }

  // DD/MM/YYYY → YYYY-MM-DD
  function _parseDate(str) {
    const parts = str.trim().split('/');
    if (parts.length !== 3) return '';
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }

  // Build salesman name (uppercase) → config object map
  function _buildSalesmanMap() {
    const map = {};
    CONFIG.SALESMAN_LIST.forEach(sm => { map[sm.name.toUpperCase().trim()] = sm; });
    return map;
  }

  // Normalize KategoriItem.csv category to CONFIG display names
  function _normalizeCategory(raw) {
    const u = (raw || '').toUpperCase().trim();
    if (u === 'EBPI')           return 'EBPI';
    if (u === 'METAL & GYPSUM') return 'Metal & Gypsum';
    if (u === 'OTHER')          return 'Other';
    return 'Uncategorized';
  }

  // TARGET.csv month header → { year, month }
  // "Jan-26" → { year: 2026, month: 1 }
  const _MONTH_ABBR = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  function _parseMonthLabel(label) {
    const [mon, yr] = label.trim().split('-');
    const idx = _MONTH_ABBR.indexOf(mon);
    if (idx === -1 || !yr) return null;
    return { year: 2000 + parseInt(yr, 10), month: idx + 1 };
  }

  // ─── Public parsers ───────────────────────────────────────────────────────

  // KategoriItem — semicolon (file upload) or comma (Sheets CSV)
  function parseKategori(text, isCSV = false) {
    const map = new Map();
    const lines = text.replace(/\r/g, '').split('\n');
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      let product, category;
      if (isCSV) {
        const cols = _parseCSVLine(line);
        product  = (cols[0] || '').trim();
        category = _normalizeCategory(cols[1] || '');
      } else {
        const semi = line.indexOf(';');
        if (semi === -1) continue;
        product  = line.substring(0, semi).trim();
        category = _normalizeCategory(line.substring(semi + 1));
      }
      if (product) map.set(product.toUpperCase(), category);
    }
    return map;
  }

  // TARGET — semicolon (file upload) or comma (Sheets CSV)
  function parseTarget(text, isCSV = false) {
    const smMap   = _buildSalesmanMap();
    const records = [];
    const lines   = text.replace(/\r/g, '').split('\n');
    if (lines.length === 0) return [];

    const splitLine = l => isCSV ? _parseCSVLine(l) : l.split(';');
    const headers   = splitLine(lines[0]);
    const monthDefs = [];
    for (let c = 2; c < headers.length; c++) monthDefs.push(_parseMonthLabel(headers[c]));

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols   = splitLine(line);
      const smName = (cols[0] || '').trim().toUpperCase();
      if (!smName) continue;
      const sm = smMap[smName];
      if (!sm) continue;
      const category = _normalizeCategory((cols[1] || '').trim());
      for (let c = 0; c < monthDefs.length; c++) {
        const md = monthDefs[c];
        if (!md) continue;
        const amount = _parseRupiah(cols[c + 2]);
        if (!amount) continue;
        records.push({ salesman: sm.name, salesman_id: sm.id, year: md.year, month: md.month, category, target: amount });
      }
    }
    return records;
  }

  // ITEMSALE — tab-separated (file upload) or compact 9-col CSV (Sheets)
  function parseItemSale(text, kategoriMap, isCSV = false) {
    const smMap = _buildSalesmanMap();
    const sales = [];
    const lines = text.replace(/\r/g, '').split('\n');

    if (isCSV) {
      // Compact 9-column format from Google Sheets (via Apps Script):
      // 0:customer 1:invoice 2:date 3:qty 4:product 5:price 6:total 7:salesman 8:customer_id
      // Start from i=0 — header row auto-skipped (salesman lookup fails for "salesman" text)
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        const cols = _parseCSVLine(line);
        if (cols.length < 8) continue;

        const smRaw = (cols[7] || '').trim().toUpperCase();
        const sm    = smMap[smRaw];
        if (!sm) continue;

        const dateRaw = (cols[2] || '').trim();
        if (!dateRaw.match(/^\d{2}\/\d{2}\/\d{4}$/)) continue;

        const total = _parseRupiah(cols[6]);
        if (total === 0) continue;

        const product  = (cols[4] || '').trim();
        const category = kategoriMap.get(product.toUpperCase()) || 'Uncategorized';
        const price    = _parseRupiah(cols[5]);
        const qty      = _parseQty(cols[3]);
        const customerName = (cols[0] || '').trim();
        const customerId   = (cols[8] || '').trim();

        sales.push({
          date:        _parseDate(dateRaw),
          invoice:     (cols[1] || '').trim(),
          salesman:    sm.name,
          salesman_id: sm.id,
          customer:    customerName,
          customer_id: customerId || customerName,
          area:        sm.area,
          product, category, qty, price, total,
        });
      }
    } else {
      // Original tab-separated format (manual file upload — 60+ columns)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        const cols = line.split('\t');
        if (cols.length < 26) continue;

        const smRaw = (cols[25] || '').trim().toUpperCase();
        const sm    = smMap[smRaw];
        if (!sm) continue;

        const dateRaw = (cols[10] || '').trim();
        if (!dateRaw.match(/^\d{2}\/\d{2}\/\d{4}$/)) continue;

        const total = _parseRupiah(cols[21]);
        if (total === 0) continue;

        const product  = (cols[16] || '').trim();
        const category = kategoriMap.get(product.toUpperCase()) || 'Uncategorized';
        const price    = _parseRupiah(cols[18]);
        const qty      = _parseQty(cols[15]);
        const customerName = (cols[0] || '').trim();
        const customerId   = cols.length > 58 ? (cols[58] || '').trim() : '';

        sales.push({
          date:        _parseDate(dateRaw),
          invoice:     (cols[9] || '').trim(),
          salesman:    sm.name,
          salesman_id: sm.id,
          customer:    customerName,
          customer_id: customerId || customerName,
          area:        sm.area,
          product, category, qty, price, total,
        });
      }
    }
    return sales;
  }

  // Build categories[] master from kategoriMap (for analytics.calcUncategorized)
  function _buildCategories(kategoriMap) {
    const rows = [];
    kategoriMap.forEach((category, productUpper) => {
      rows.push({ product: productUpper, category });
    });
    return rows;
  }

  // Main entry: combine all three files into dashboard data schema
  // opts.csv = true when data comes from Google Sheets (comma-separated)
  function buildDataset(itemSaleText, kategoriText, targetText, opts = {}) {
    const isCSV      = opts.csv === true;
    const kategoriMap = parseKategori(kategoriText, isCSV);
    const sales       = parseItemSale(itemSaleText, kategoriMap, isCSV);
    const targets     = parseTarget(targetText, isCSV);
    const categories  = _buildCategories(kategoriMap);
    return { sales, targets, categories };
  }

  return { parseKategori, parseItemSale, parseTarget, buildDataset };
})();
