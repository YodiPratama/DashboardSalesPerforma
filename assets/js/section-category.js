const CategorySection = (() => {
  let _catDonut = null, _catBar = null;

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
    const tbody = document.getElementById('prod-analytics-body');
    const countEl = document.getElementById('prod-analytics-count');
    if (!tbody) return;

    const cats = Analytics.calcCategoryMetrics(raw, filters);
    const colorMap = {};
    cats.forEach(c => { colorMap[c.name] = c.color; });

    const products = _calcProductMetrics(raw, filters);
    if (countEl) countEl.textContent = products.length;

    tbody.innerHTML = products.length ? products.map((p, i) => {
      const dot = colorMap[p.category] || '#64748b';
      return `<tr class="prod-row" data-name="${p.product.toLowerCase()}">
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
          row.style.display = !q || row.dataset.name.includes(q) ? '' : 'none';
        });
      };
    }
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

  return { render, exportExcel };
})();
