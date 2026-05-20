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
