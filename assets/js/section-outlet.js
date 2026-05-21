const OutletSection = (() => {
  let _retChart = null, _aoChart = null;

  function _prevMonth(y, m)  { return m === 1 ? { year: y - 1, month: 12 } : { year: y, month: m - 1 }; }
  function _olderMonth(y, m) { const p = _prevMonth(y, m); return _prevMonth(p.year, p.month); }

  function _filterSales(sales, y, m, smId) {
    return sales.filter(s => {
      const d = new Date(s.date);
      if (d.getFullYear() !== y || d.getMonth() + 1 !== m) return false;
      if (smId !== 'all' && s.salesman_id !== smId) return false;
      return true;
    });
  }

  function _uniqueOutlets(sales) { return new Set(sales.map(s => s.customer_id)); }

  function _getOutletInfo(raw, custId) {
    const s = raw.sales.find(s => s.customer_id === custId);
    return s ? { name: s.customer, salesman: s.salesman, area: s.area } : { name: custId, salesman: '', area: '' };
  }

  function _sumSales(custIds, salesData) {
    const salesMap = {};
    salesData.forEach(s => { salesMap[s.customer_id] = (salesMap[s.customer_id] || 0) + s.total; });
    let total = 0;
    custIds.forEach(id => { total += salesMap[id] || 0; });
    return total;
  }

  function _openCustomerDrilldown(custId) {
    if (!AppState || !AppState.rawData) return;
    const customers = Analytics.calcCustomerTable(AppState.rawData, AppState.filters);
    const cust = customers.find(c => c.id === custId);
    SectionManager.showSection('customer');
    if (!cust) return;
    const showAllMonths = ['Lost', 'Dormant'].includes(cust.status);
    Modal.openCustomerModal(cust, AppState.rawData, AppState.filters, { showAllMonths });
  }

  function _renderOutletList(elId, custIds, raw, curSales) {
    const el = document.getElementById(elId);
    if (!el) return;
    const salesMap = {};
    curSales.forEach(s => { if (!salesMap[s.customer_id]) salesMap[s.customer_id] = 0; salesMap[s.customer_id] += s.total; });
    const items = [...custIds].map(id => {
      const info = _getOutletInfo(raw, id);
      return { id, ...info, sales: salesMap[id] || 0 };
    }).sort((a, b) => b.sales - a.sales);
    el.innerHTML = items.map(o => `
      <div class="outlet-row" data-cid="${o.id}">
        <div>
          <div class="outlet-name">${o.name}</div>
          <div class="outlet-sub">${o.salesman} · ${o.area}</div>
        </div>
        <div class="outlet-sales">${o.sales > 0 ? Fmt.currency(o.sales) : '<span class="text-muted">—</span>'}</div>
      </div>
    `).join('') || '<div class="no-alert">Tidak ada data</div>';
    el.onclick = e => {
      const row = e.target.closest('.outlet-row[data-cid]');
      if (row) _openCustomerDrilldown(row.getAttribute('data-cid'));
    };
  }

  function _renderCharts(retention, smAO) {
    const t = Theme.getChartDefaults();

    if (_retChart) _retChart.destroy();
    const c1 = document.getElementById('chart-retention-main');
    if (c1) _retChart = new Chart(c1, {
      type: 'bar',
      data: {
        labels: retention.map(r => r.label),
        datasets: [
          { label: 'Active',      data: retention.map(r => r.active),      backgroundColor: '#4f9cf9aa', borderColor: '#4f9cf9', borderWidth: 1.5, borderRadius: 4 },
          { label: 'Repeat',      data: retention.map(r => r.repeat),      backgroundColor: '#4caf82aa', borderColor: '#4caf82', borderWidth: 1.5, borderRadius: 4 },
          { label: 'Lost',        data: retention.map(r => r.lost),        backgroundColor: '#ef4444aa', borderColor: '#ef4444', borderWidth: 1.5, borderRadius: 4 },
          { label: 'Reactivated', data: retention.map(r => r.reactivated), backgroundColor: '#f59e0baa', borderColor: '#f59e0b', borderWidth: 1.5, borderRadius: 4 },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: t.textColor, usePointStyle: true } }, tooltip: { backgroundColor: t.tooltipBg, titleColor: t.tooltipText, bodyColor: t.tooltipText } },
        scales: { x: { ticks: { color: t.textColor }, grid: { color: t.gridColor } }, y: { ticks: { color: t.textColor }, grid: { color: t.gridColor } } }
      },
      plugins: [BarLabelPlugin],
    });

    if (_aoChart) _aoChart.destroy();
    const c2 = document.getElementById('chart-ao-salesman');
    if (c2) _aoChart = new Chart(c2, {
      type: 'bar',
      data: {
        labels: smAO.map(s => s.name.split(' ')[0]),
        datasets: [
          { label: 'AO',     data: smAO.map(s => s.ao),     backgroundColor: '#4f9cf9cc', borderColor: '#4f9cf9', borderWidth: 1.5, borderRadius: 6 },
          { label: 'Repeat', data: smAO.map(s => s.repeat), backgroundColor: '#4caf82cc', borderColor: '#4caf82', borderWidth: 1.5, borderRadius: 6 },
          { label: 'Lost',   data: smAO.map(s => s.lost),   backgroundColor: '#ef4444cc', borderColor: '#ef4444', borderWidth: 1.5, borderRadius: 6 },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: t.textColor, usePointStyle: true } }, tooltip: { backgroundColor: t.tooltipBg, titleColor: t.tooltipText, bodyColor: t.tooltipText } },
        scales: { x: { ticks: { color: t.textColor }, grid: { display: false } }, y: { ticks: { color: t.textColor }, grid: { color: t.gridColor } } }
      },
      plugins: [BarLabelPlugin],
    });
  }

  function filterOutletLists(query) {
    const q = query.toLowerCase();
    document.querySelectorAll('#section-outlet .outlet-row').forEach(row => {
      const name = row.querySelector('.outlet-name')?.textContent.toLowerCase() || '';
      row.style.display = name.includes(q) ? '' : 'none';
    });
  }

  function render(raw, filters) {
    const { year: y, month: m, salesman: smVal } = filters;

    const curSales   = _filterSales(raw.sales, y, m, smVal);
    const prev       = _prevMonth(y, m);
    const prevSales  = _filterSales(raw.sales, prev.year, prev.month, smVal);
    const older      = _olderMonth(y, m);
    const olderSales = _filterSales(raw.sales, older.year, older.month, smVal);

    const curSet         = _uniqueOutlets(curSales);
    const prevSet        = _uniqueOutlets(prevSales);
    const olderSet       = _uniqueOutlets(olderSales);
    const lostSet        = new Set([...prevSet].filter(id => !curSet.has(id)));
    const reactivatedSet = new Set([...curSet].filter(id => !prevSet.has(id) && olderSet.has(id)));
    const repeatSet      = new Set([...curSet].filter(id => prevSet.has(id)));

    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('oh-ao',          Fmt.number(curSet.size));
    set('oh-repeat',      Fmt.number(repeatSet.size));
    set('oh-lost',        Fmt.number(lostSet.size));
    set('oh-reactivated', Fmt.number(reactivatedSet.size));
    set('active-count',      curSet.size);
    set('lost-count',        lostSet.size);
    set('reactivated-count', reactivatedSet.size);

    _renderOutletList('active-list',      curSet,         raw, curSales);
    _renderOutletList('lost-list',        lostSet,        raw, prevSales);
    _renderOutletList('reactivated-list', reactivatedSet, raw, curSales);

    // Panel header totals
    const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setVal('active-value',      Fmt.currency(_sumSales(curSet,         curSales)));
    setVal('lost-value',        Fmt.currency(_sumSales(lostSet,        prevSales)));
    setVal('reactivated-value', Fmt.currency(_sumSales(reactivatedSet, curSales)));

    const retention = Analytics.calcOutletRetention(raw, { ...filters, category: 'all' });
    const smAO      = Analytics.calcSalesmanMetrics(raw,  { ...filters, salesman: 'all', category: 'all' });
    _renderCharts(retention, smAO);
  }

  function exportExcel(raw, filters) {
    if (typeof XLSX === 'undefined') return;
    const kpis = Analytics.calcKPIs(raw, filters);
    const rows = [
      { Metric: 'Active Outlet',  Nilai: kpis.activeOutlet },
      { Metric: 'Repeat Outlet',  Nilai: kpis.repeatOutlet },
      { Metric: 'Lost Outlet',    Nilai: kpis.lostOutlet },
      { Metric: 'Reactivated',    Nilai: kpis.reactivated },
      { Metric: 'Consistency %',  Nilai: kpis.consistencyPct },
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Outlet Health');
    XLSX.writeFile(wb, `OutletHealth_${filters.year}_${String(filters.month).padStart(2, '0')}.xlsx`);
  }

  return { render, exportExcel, filterOutletLists };
})();
