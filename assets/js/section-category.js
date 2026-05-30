const CategorySection = (() => {
  let _catDonut = null, _catBar = null;

  // Stored per render() call — used by modal
  let _rawData  = null;
  let _smFilter = 'all';

  // Modal state
  let _pdmProduct   = null;
  let _pdmActiveTab = 'customer';
  let _pdmSales     = [];

  function _getProductsForCategory(raw, filters, catName) {
    const sales = raw.sales.filter(s => {
      const d = new Date(s.date);
      if (d.getFullYear() !== filters.year || d.getMonth() + 1 !== filters.month) return false;
      if (filters.salesman !== 'all' && s.salesman_id !== filters.salesman) return false;
      return s.category === catName;
    });
    const prodMap = {};
    sales.forEach(s => { if (!prodMap[s.product]) prodMap[s.product] = 0; prodMap[s.product] += s.total; });
    return Object.entries(prodMap).sort((a, b) => b[1] - a[1]);
  }

  function _renderCards(cats, raw, filters) {
    const grid = document.getElementById('cat-cards');
    if (!grid) return;
    grid.innerHTML = cats.map(cat => {
      const prods = _getProductsForCategory(raw, filters, cat.name);
      return `
        <div class="cat-card">
          <div class="cat-header"><div class="cat-dot" style="background:${cat.color}"></div><div class="cat-name">${cat.name}</div></div>
          <div class="cat-sales">${Fmt.currency(cat.sales)}</div>
          <div class="cat-meta">
            <span>${Fmt.percent(cat.pct)} kontribusi</span>
            <span>${Fmt.number(cat.tx)} TX</span>
            <span>${Fmt.number(cat.qty)} unit</span>
            <span>${Fmt.number(cat.products)} SKU</span>
          </div>
          <div class="cat-bar"><div class="cat-bar-fill" style="width:${Math.min(cat.pct, 100)}%;background:${cat.color}"></div></div>
          <div class="prod-list">
            ${prods.map(([name, val]) => `<div class="prod-item"><span class="prod-name">${name}</span><span class="prod-val">${Fmt.currency(val)}</span></div>`).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  function _renderCharts(cats) {
    const t = Theme.getChartDefaults();

    if (_catDonut) _catDonut.destroy();
    const c1 = document.getElementById('chart-cat-donut');
    if (c1) _catDonut = new Chart(c1, {
      type: 'doughnut',
      data: { labels: cats.map(c => c.name), datasets: [{ data: cats.map(c => c.sales), backgroundColor: cats.map(c => c.color + 'cc'), borderColor: cats.map(c => c.color), borderWidth: 2, hoverOffset: 8 }] },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '65%',
        plugins: { legend: { position: 'right', labels: { color: t.textColor, usePointStyle: true } }, tooltip: { backgroundColor: t.tooltipBg, titleColor: t.tooltipText, bodyColor: t.tooltipText, callbacks: { label: ctx => `  ${ctx.label}: ${Fmt.currency(ctx.raw)}` } } }
      },
      plugins: [DonutLabelPlugin],
    });

    if (_catBar) _catBar.destroy();
    const c2 = document.getElementById('chart-cat-bar');
    if (c2) _catBar = new Chart(c2, {
      type: 'bar',
      data: { labels: cats.map(c => c.name.length > 15 ? c.name.substring(0, 13) + '…' : c.name), datasets: [{ label: 'Sales', data: cats.map(c => c.sales), backgroundColor: cats.map(c => c.color + 'cc'), borderColor: cats.map(c => c.color), borderWidth: 1.5, borderRadius: 6 }] },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: t.tooltipBg, titleColor: t.tooltipText, bodyColor: t.tooltipText, callbacks: { label: ctx => `  ${Fmt.currency(ctx.raw)}` } } },
        scales: { x: { ticks: { color: t.textColor, callback: v => Fmt.currency(v) }, grid: { color: t.gridColor } }, y: { ticks: { color: t.textColor }, grid: { display: false } } }
      }
    });
  }

  function _calcProductMetrics(raw, filters) {
    const sales = raw.sales.filter(s => {
      const d = new Date(s.date);
      if (d.getFullYear() !== filters.year || d.getMonth() + 1 !== filters.month) return false;
      if (filters.salesman !== 'all' && s.salesman_id !== filters.salesman) return false;
      return true;
    });
    const map = {};
    sales.forEach(s => {
      if (!map[s.product]) map[s.product] = { product: s.product, category: s.category || '—', sales: 0, qty: 0, invoices: new Set(), custs: new Set(), lastDate: '' };
      const p = map[s.product];
      p.sales += s.total;
      p.qty   += (s.qty || 0);
      p.invoices.add(s.invoice);
      p.custs.add(s.customer_id);
      if (!p.lastDate || s.date > p.lastDate) p.lastDate = s.date;
    });
    return Object.values(map).map(p => ({
      product: p.product, category: p.category, sales: p.sales, qty: p.qty,
      tx: p.invoices.size, custs: p.custs.size,
      avgTx: p.invoices.size ? p.sales / p.invoices.size : 0,
      lastDate: p.lastDate,
    })).sort((a, b) => b.sales - a.sales);
  }

  function _renderProductTable(raw, filters) {
    const tbody   = document.getElementById('prod-analytics-body');
    const countEl = document.getElementById('prod-analytics-count');
    if (!tbody) return;

    const cats = Analytics.calcCategoryMetrics(raw, filters);
    const colorMap = {};
    cats.forEach(c => { colorMap[c.name] = c.color; });

    const products = _calcProductMetrics(raw, filters);
    if (countEl) countEl.textContent = products.length;

    tbody.innerHTML = products.length ? products.map((p, i) => {
      const dot   = colorMap[p.category] || '#64748b';
      const pName = p.product.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
      return `<tr class="prod-row" data-product="${pName}" style="cursor:pointer">
        <td class="text-center" style="color:var(--text-muted);font-size:12px;font-weight:600">${i + 1}</td>
        <td class="prod-cell-name">${p.product}</td>
        <td><span style="display:inline-flex;align-items:center;gap:5px;font-size:12px;white-space:nowrap">
          <span style="width:8px;height:8px;border-radius:50%;background:${dot};flex-shrink:0"></span>${p.category}
        </span></td>
        <td class="text-right" style="font-weight:700;color:var(--accent-blue)">${Fmt.currency(p.sales)}</td>
        <td class="text-right">${Fmt.number(p.tx)}</td>
        <td class="text-right">${Fmt.number(p.qty)}</td>
        <td class="text-right">${Fmt.number(p.custs)}</td>
        <td class="text-right" style="color:var(--text-secondary)">${Fmt.currency(p.avgTx)}</td>
        <td class="text-right" style="color:var(--text-muted);font-size:12px">${Fmt.date(p.lastDate)}</td>
      </tr>`;
    }).join('') : '<tr><td colspan="9" style="text-align:center;padding:20px;color:var(--text-muted)">Tidak ada data produk bulan ini</td></tr>';

    const search = document.getElementById('prod-search');
    if (search) {
      search.value = '';
      search.oninput = () => {
        const q = search.value.toLowerCase();
        tbody.querySelectorAll('.prod-row').forEach(row => {
          row.style.display = !q || row.dataset.product.toLowerCase().includes(q) ? '' : 'none';
        });
      };
    }

    tbody.querySelectorAll('.prod-row').forEach(row => {
      row.onclick = () => _pdmOpen(row.dataset.product);
    });
  }

  // ─── Product Drill-down Modal ─────────────────────────────────────────────
  function _pdmPopulateMonths(defaultYear, defaultMonth) {
    const fromSel = document.getElementById('pdm-from');
    const toSel   = document.getElementById('pdm-to');
    if (!fromSel || !toSel) return;
    fromSel.innerHTML = toSel.innerHTML = '';
    const now = new Date();
    for (let i = 0; i < 18; i++) {
      let m = now.getMonth()+1-i, y = now.getFullYear();
      while (m <= 0) { m += 12; y--; }
      const val   = `${y}-${String(m).padStart(2,'0')}`;
      const label = `${CONFIG.MONTHS_ID[m-1]} ${y}`;
      const sel   = (y === defaultYear && m === defaultMonth);
      fromSel.appendChild(new Option(label, val, false, sel));
      toSel.appendChild(new Option(label, val, false, sel));
    }
  }

  function _pdmOpen(productName) {
    if (!_rawData) return;
    _pdmProduct   = productName;
    _pdmActiveTab = 'customer';

    const overlay = document.getElementById('pdm-overlay');
    if (!overlay) return;
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    document.getElementById('pdm-title').textContent = productName;

    // Default period = current AppState month
    const y = AppState.filters.year;
    const m = AppState.filters.month;
    _pdmPopulateMonths(y, m);

    // Salesman info
    const smSel = document.getElementById('filter-salesman');
    const smTxt = smSel ? smSel.options[smSel.selectedIndex].textContent : '';
    document.getElementById('pdm-sm-info').textContent = smTxt ? '· ' + smTxt : '';

    document.querySelectorAll('.pdm-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === 'customer'));
    _pdmRender();
  }

  function _pdmGetRange() {
    const f = (document.getElementById('pdm-from')?.value || '').split('-').map(Number);
    const t = (document.getElementById('pdm-to')?.value || '').split('-').map(Number);
    return { yFrom:f[0]||0, mFrom:f[1]||0, yTo:t[0]||0, mTo:t[1]||0 };
  }

  function _pdmFilterSales() {
    if (!_pdmProduct || !_rawData) return [];
    const { yFrom, mFrom, yTo, mTo } = _pdmGetRange();
    const fromNum = yFrom*100 + mFrom;
    const toNum   = yTo*100 + mTo;
    return _rawData.sales.filter(s => {
      if (s.product !== _pdmProduct) return false;
      const d    = new Date(s.date);
      const sNum = d.getFullYear()*100 + (d.getMonth()+1);
      if (sNum < fromNum || sNum > toNum) return false;
      if (_smFilter !== 'all' && s.salesman_id !== _smFilter) return false;
      return true;
    });
  }

  function _pdmRender() {
    const sales = _pdmFilterSales();
    _pdmSales = sales;

    const { yFrom, mFrom, yTo, mTo } = _pdmGetRange();
    const fromLbl = `${CONFIG.MONTHS_ID[mFrom-1]} ${yFrom}`;
    const toLbl   = `${CONFIG.MONTHS_ID[mTo-1]} ${yTo}`;
    const period  = fromLbl === toLbl ? fromLbl : `${fromLbl} – ${toLbl}`;

    const sample = _rawData.sales.find(s => s.product === _pdmProduct);
    const cat    = sample ? (sample.category || '—') : '—';
    document.getElementById('pdm-subtitle').textContent = `${cat} · ${period}`;

    const invSet  = new Set(sales.map(s => s.invoice));
    const custSet = new Set(sales.map(s => s.customer_id));
    const totQty  = sales.reduce((a,s) => a+(s.qty||0), 0);
    const totVal  = sales.reduce((a,s) => a+s.total, 0);
    document.getElementById('pdm-kpi-tx').textContent    = Fmt.number(invSet.size);
    document.getElementById('pdm-kpi-qty').textContent   = Fmt.number(totQty);
    document.getElementById('pdm-kpi-val').textContent   = Fmt.currency(totVal);
    document.getElementById('pdm-kpi-custs').textContent = Fmt.number(custSet.size);

    _pdmRenderTab(_pdmActiveTab, sales);
  }

  function _pdmRenderTab(tab, sales) {
    const body = document.getElementById('pdm-body');
    if (!body) return;
    if (tab === 'customer') {
      const map = {};
      sales.forEach(s => {
        const key = s.customer_id || s.customer;
        if (!map[key]) map[key] = { customer:s.customer||key, salesman:s.salesman, invs:new Set(), qty:0, val:0 };
        map[key].invs.add(s.invoice);
        map[key].qty += (s.qty||0);
        map[key].val += s.total;
      });
      const rows = Object.values(map).sort((a,b) => b.val - a.val);
      document.getElementById('pdm-row-count').textContent = `${rows.length} customer`;
      body.innerHTML = `<table>
        <thead><tr>
          <th style="width:36px;text-align:center">#</th>
          <th>Customer</th><th>Salesman</th>
          <th class="text-right">TX</th><th class="text-right">Qty</th>
          <th class="text-right">Total Value</th><th class="text-right">Avg/TX</th>
        </tr></thead>
        <tbody>${rows.length ? rows.map((r,i) => `
          <tr>
            <td style="text-align:center;color:var(--text-muted);font-size:12px">${i+1}</td>
            <td style="font-weight:600">${r.customer}</td>
            <td style="color:var(--text-secondary);font-size:12px">${r.salesman}</td>
            <td class="text-right">${Fmt.number(r.invs.size)}</td>
            <td class="text-right">${Fmt.number(r.qty)}</td>
            <td class="text-right" style="font-weight:700;color:var(--accent-blue)">${Fmt.currency(r.val)}</td>
            <td class="text-right" style="color:var(--text-secondary)">${Fmt.currency(r.invs.size ? r.val/r.invs.size : 0)}</td>
          </tr>`).join('') : '<tr><td colspan="7" style="text-align:center;padding:28px;color:var(--text-muted)">Tidak ada data untuk periode ini</td></tr>'}
        </tbody></table>`;
    } else {
      const rows = [...sales].sort((a,b) => b.date.localeCompare(a.date));
      document.getElementById('pdm-row-count').textContent = `${rows.length} transaksi`;
      body.innerHTML = `<table>
        <thead><tr>
          <th style="width:36px;text-align:center">#</th>
          <th>Tanggal</th><th>No. Invoice</th>
          <th>Customer</th><th>Salesman</th>
          <th class="text-right">Qty</th><th class="text-right">Value</th>
        </tr></thead>
        <tbody>${rows.length ? rows.map((r,i) => `
          <tr>
            <td style="text-align:center;color:var(--text-muted);font-size:12px">${i+1}</td>
            <td style="font-size:12px;color:var(--text-secondary);white-space:nowrap">${Fmt.date(r.date)}</td>
            <td style="font-size:11px;font-family:monospace;color:var(--text-muted);white-space:nowrap">${r.invoice}</td>
            <td style="font-weight:600">${r.customer}</td>
            <td style="color:var(--text-secondary);font-size:12px">${r.salesman}</td>
            <td class="text-right">${Fmt.number(r.qty||0)}</td>
            <td class="text-right" style="font-weight:700;color:var(--accent-blue)">${Fmt.currency(r.total)}</td>
          </tr>`).join('') : '<tr><td colspan="7" style="text-align:center;padding:28px;color:var(--text-muted)">Tidak ada data untuk periode ini</td></tr>'}
        </tbody></table>`;
    }
  }

  function _pdmClose() {
    const overlay = document.getElementById('pdm-overlay');
    if (overlay) overlay.style.display = 'none';
    document.body.style.overflow = '';
  }

  function _pdmExport() {
    if (!_pdmSales.length) return;
    const { yFrom, mFrom, yTo, mTo } = _pdmGetRange();
    const fromLbl = `${CONFIG.MONTHS_ID[mFrom-1]}${yFrom}`;
    const toLbl   = `${CONFIG.MONTHS_ID[mTo-1]}${yTo}`;
    const range   = fromLbl === toLbl ? fromLbl : `${fromLbl}_sd_${toLbl}`;
    const wb      = XLSX.utils.book_new();

    // Sheet 1: Per Customer
    const custMap = {};
    _pdmSales.forEach(s => {
      const key = s.customer_id || s.customer;
      if (!custMap[key]) custMap[key] = { Customer:s.customer||key, Salesman:s.salesman, invs:new Set(), Qty:0, Value:0 };
      custMap[key].invs.add(s.invoice);
      custMap[key].Qty   += (s.qty||0);
      custMap[key].Value += s.total;
    });
    const custRows = Object.values(custMap).sort((a,b) => b.Value - a.Value).map(r => ({
      Customer:r.Customer, Salesman:r.Salesman, TX:r.invs.size,
      Qty:r.Qty, 'Total Value':r.Value,
      'Avg per TX': r.invs.size ? r.Value/r.invs.size : 0,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(custRows), 'Per Customer');

    // Sheet 2: Per Transaksi
    const txRows = [..._pdmSales].sort((a,b) => b.date.localeCompare(a.date)).map(s => ({
      Tanggal:Fmt.date(s.date), 'No. Invoice':s.invoice,
      Customer:s.customer, Salesman:s.salesman,
      Qty:s.qty||0, Value:s.total,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(txRows), 'Per Transaksi');

    const safeName = (_pdmProduct||'Produk').replace(/[\\/:*?"<>|]/g,'_').substring(0,25);
    XLSX.writeFile(wb, `${safeName}_${range}.xlsx`);
  }

  function setupModal() {
    const overlay   = document.getElementById('pdm-overlay');
    const closeBtn  = document.getElementById('pdm-close-btn');
    const fromSel   = document.getElementById('pdm-from');
    const toSel     = document.getElementById('pdm-to');
    const exportBtn = document.getElementById('pdm-export-btn');
    if (!overlay) return;

    closeBtn?.addEventListener('click', _pdmClose);
    overlay.addEventListener('click', e => { if (e.target.id === 'pdm-overlay') _pdmClose(); });
    fromSel?.addEventListener('change', _pdmRender);
    toSel?.addEventListener('change', _pdmRender);
    exportBtn?.addEventListener('click', _pdmExport);

    document.querySelectorAll('.pdm-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        _pdmActiveTab = btn.dataset.tab;
        document.querySelectorAll('.pdm-tab-btn').forEach(b => b.classList.toggle('active', b === btn));
        _pdmRenderTab(_pdmActiveTab, _pdmSales);
      });
    });

    document.addEventListener('keydown', e => { if (e.key === 'Escape' && overlay.style.display !== 'none') _pdmClose(); });
  }

  function _renderUncategorized(uncat) {
    const el  = document.getElementById('cat-uncat-list');
    const cnt = document.getElementById('cat-uncat-count');
    if (!el) return;
    if (cnt) cnt.textContent = uncat.length;
    if (uncat.length === 0) {
      el.innerHTML = '<div class="no-alert">✅ Semua produk sudah terkategori.</div>';
      return;
    }
    el.innerHTML = uncat.map(u => `
      <div class="uncat-item">
        <div class="uncat-name">${u.product}</div>
        <div class="uncat-meta">
          <span class="badge badge-blue">${Fmt.number(u.tx)} TX</span>
          <span class="badge badge-orange">${Fmt.currency(u.sales)}</span>
        </div>
      </div>
    `).join('');
  }

  function _setupCopyButton(uncat) {
    const btn = document.getElementById('cat-copy-uncat-btn');
    if (!btn) return;
    btn.onclick = () => {
      const names = [...new Set(uncat.map(u => u.product.toUpperCase().replace(/\s+/g, ' ').trim()))].join('\n');
      navigator.clipboard.writeText(names).then(() => {
        const orig = btn.textContent;
        btn.textContent = '✓ Disalin!';
        setTimeout(() => { btn.textContent = orig; }, 2000);
      });
    };
  }

  function render(raw, filters) {
    _rawData  = raw;
    _smFilter = filters.salesman || 'all';

    const cats  = Analytics.calcCategoryMetrics(raw, filters);
    const uncat = Analytics.calcUncategorized(raw, filters);
    _renderCards(cats, raw, filters);
    _renderCharts(cats);
    _renderProductTable(raw, filters);
    _renderUncategorized(uncat);
    _setupCopyButton(uncat);
  }

  function exportExcel(raw, filters) {
    const cats = Analytics.calcCategoryMetrics(raw, { ...filters, salesman: 'all', category: 'all' });
    const rows = cats.map(c => ({ Kategori: c.name, Sales: c.sales, Pct: c.pct, TX: c.tx, Qty: c.qty, Produk: c.products }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Category');
    XLSX.writeFile(wb, `Category_${filters.year}_${String(filters.month).padStart(2, '0')}.xlsx`);
  }

  return { render, exportExcel, setupModal };
})();
