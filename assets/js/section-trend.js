const TrendSection = (() => {
  let _charts          = {};
  let _rawData         = null;
  let _selectedMonths  = new Set();
  let _selectedSm      = null; // null = semua; string id = satu salesman

  const SM_COLORS = ['#4f9cf9','#4caf82','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316'];

  // ── Available months ──────────────────────────────────────────────────────
  function _getAvailableMonths(rawData) {
    const set = new Set();
    rawData.sales.forEach(s => set.add(s.date.substring(0, 7)));
    rawData.targets.forEach(t => set.add(`${t.year}-${String(t.month).padStart(2, '0')}`));
    return [...set].sort().reverse(); // newest first
  }

  // ── Generic pill filter renderer ──────────────────────────────────────────
  function _renderPills(containerId, items, selectedSet, allLabel, onToggle) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const allSelected = items.every(it => selectedSet.has(it.value));

    el.innerHTML = `
      <button class="trend-month-pill ${allSelected ? 'active' : ''}" data-val="__all__">${allLabel}</button>
      ${items.map(it => {
        const on = selectedSet.has(it.value);
        return `<button class="trend-month-pill ${on ? 'active' : ''}" data-val="${it.value}">${it.label}</button>`;
      }).join('')}
    `;

    el.querySelectorAll('.trend-month-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-val');
        if (val === '__all__') {
          // Select all
          items.forEach(it => selectedSet.add(it.value));
        } else {
          if (selectedSet.has(val)) {
            selectedSet.delete(val);
            if (selectedSet.size === 0) items.forEach(it => selectedSet.add(it.value)); // never empty
          } else {
            selectedSet.add(val);
          }
        }
        onToggle();
      });
    });
  }

  function _renderMonthFilter(allMonths) {
    const items = allMonths.map(ym => {
      const [y, m] = ym.split('-').map(Number);
      return { value: ym, label: `${CONFIG.MONTHS_ID[m - 1].substring(0, 3)} '${String(y).slice(-2)}` };
    });
    _renderPills('trend-month-filter', items, _selectedMonths, 'Semua', () => {
      _renderMonthFilter(allMonths);
      _renderAll();
    });
  }

  function _renderSmFilter() {
    const el = document.getElementById('trend-sm-filter');
    if (!el) return;

    el.innerHTML = `
      <button class="trend-month-pill ${_selectedSm === null ? 'active' : ''}" data-smid="__all__">Semua</button>
      ${CONFIG.SALESMAN_LIST.map(sm => {
        const active = _selectedSm === sm.id;
        const label  = sm.name.split(' ').slice(0, 2).join(' ');
        return `<button class="trend-month-pill ${active ? 'active' : ''}" data-smid="${sm.id}">${label}</button>`;
      }).join('')}
    `;

    el.querySelectorAll('.trend-month-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-smid');
        if (id === '__all__') {
          _selectedSm = null;
        } else {
          // Klik salesman yg sudah aktif → kembali ke Semua
          _selectedSm = (_selectedSm === id) ? null : id;
        }
        _renderSmFilter();
        _renderAll();
      });
    });
  }

  // ── Active salesman set for analytics ────────────────────────────────────
  function _smIds() {
    if (_selectedSm === null) return null;
    return new Set([_selectedSm]);
  }

  // ── Destroy charts ────────────────────────────────────────────────────────
  function _destroyAll() {
    Object.keys(_charts).forEach(k => { if (_charts[k]) { _charts[k].destroy(); delete _charts[k]; } });
  }

  function _theme() { return Theme.getChartDefaults(); }

  // ── Chart options shared ──────────────────────────────────────────────────
  function _baseTooltip(t) {
    return { backgroundColor: t.tooltipBg, titleColor: t.tooltipText, bodyColor: t.tooltipText, borderColor: t.tooltipBorder, borderWidth: 1, cornerRadius: 8, padding: 10 };
  }

  // ── Chart 1: Total Sales + Target ────────────────────────────────────────
  function _renderSalesChart(data) {
    const canvas = document.getElementById('trend-chart-sales');
    if (!canvas) return;
    if (_charts.sales) _charts.sales.destroy();
    const t = _theme();

    _charts.sales = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: data.map(d => d.labelShort),
        datasets: [
          { label: 'Sales',  data: data.map(d => d.sales),  backgroundColor: '#4f9cf9cc', borderColor: '#4f9cf9', borderWidth: 1.5, borderRadius: 5, maxBarThickness: 48, order: 2 },
          { label: 'Target', data: data.map(d => d.target), type: 'line', borderColor: '#8b5cf6', backgroundColor: 'transparent', borderWidth: 2, borderDash: [5, 4], pointRadius: 4, pointBackgroundColor: '#8b5cf6', tension: 0.3, order: 1 },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: CONFIG.CHART_ANIMATION },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { color: t.textColor, usePointStyle: true } },
          tooltip: { ..._baseTooltip(t), callbacks: { label: ctx => `  ${ctx.dataset.label}: ${Fmt.currency(ctx.raw)}` } },
        },
        scales: {
          x: { grid: { color: t.gridColor }, ticks: { color: t.textColor } },
          y: { grid: { color: t.gridColor }, ticks: { color: t.textColor, callback: v => Fmt.currency(v) } },
        },
      }
    });
  }

  // ── Chart 2: Achievement % per salesman ──────────────────────────────────
  function _renderAchievementChart(data) {
    const canvas = document.getElementById('trend-chart-achievement');
    if (!canvas) return;
    if (_charts.ach) _charts.ach.destroy();
    const t = _theme();

    // Use salesman list from first data point (already filtered by _smIds)
    const smList = data.length > 0 ? data[0].salesman : [];

    const datasets = smList.map((sm, idx) => ({
      label: sm.name,
      data: data.map(d => {
        const s = d.salesman.find(x => x.id === sm.id);
        return s ? (s.achievement !== null ? parseFloat(s.achievement.toFixed(1)) : null) : null;
      }),
      borderColor: SM_COLORS[idx % SM_COLORS.length],
      backgroundColor: SM_COLORS[idx % SM_COLORS.length] + '18',
      borderWidth: 2.5,
      pointRadius: 5,
      pointHoverRadius: 7,
      tension: 0.3,
      spanGaps: true,
    }));

    // 100% reference line
    datasets.push({
      label: 'Target 100%',
      data: data.map(() => 100),
      borderColor: 'rgba(255,255,255,0.15)',
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderDash: [2, 4],
      pointRadius: 0,
      spanGaps: true,
    });

    _charts.ach = new Chart(canvas, {
      type: 'line',
      data: { labels: data.map(d => d.labelShort), datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: CONFIG.CHART_ANIMATION },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            labels: {
              color: t.textColor, usePointStyle: true, pointStyleWidth: 10,
              filter: item => item.text !== 'Target 100%',
            }
          },
          tooltip: {
            ..._baseTooltip(t),
            callbacks: {
              label: ctx => ctx.dataset.label === 'Target 100%' ? null : (ctx.raw !== null ? `  ${ctx.dataset.label}: ${Fmt.percent(ctx.raw)}` : null),
            }
          },
        },
        scales: {
          x: { grid: { color: t.gridColor }, ticks: { color: t.textColor } },
          y: { grid: { color: t.gridColor }, ticks: { color: t.textColor, callback: v => v + '%' }, suggestedMin: 0 },
        },
      }
    });
  }

  // ── Chart 3: Outlet AO / Repeat / Lost ───────────────────────────────────
  function _renderOutletChart(data) {
    const canvas = document.getElementById('trend-chart-outlet');
    if (!canvas) return;
    if (_charts.outlet) _charts.outlet.destroy();
    const t = _theme();

    _charts.outlet = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: data.map(d => d.labelShort),
        datasets: [
          { label: 'Active',      data: data.map(d => d.ao),          backgroundColor: '#4f9cf9aa', borderColor: '#4f9cf9', borderWidth: 1.5, borderRadius: 4, maxBarThickness: 40 },
          { label: 'Repeat',      data: data.map(d => d.repeat),      backgroundColor: '#4caf82aa', borderColor: '#4caf82', borderWidth: 1.5, borderRadius: 4, maxBarThickness: 40 },
          { label: 'Lost',        data: data.map(d => d.lost),        backgroundColor: '#ef4444aa', borderColor: '#ef4444', borderWidth: 1.5, borderRadius: 4, maxBarThickness: 40 },
          { label: 'Reactivated', data: data.map(d => d.reactivated), backgroundColor: '#06b6d4aa', borderColor: '#06b6d4', borderWidth: 1.5, borderRadius: 4, maxBarThickness: 40 },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: CONFIG.CHART_ANIMATION },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { color: t.textColor, usePointStyle: true } },
          tooltip: { ..._baseTooltip(t), callbacks: { label: ctx => `  ${ctx.dataset.label}: ${ctx.raw}` } },
        },
        scales: {
          x: { grid: { color: t.gridColor }, ticks: { color: t.textColor } },
          y: { grid: { color: t.gridColor }, ticks: { color: t.textColor } },
        },
      }
    });
  }

  // ── Chart 4: Sales per kategori stacked ──────────────────────────────────
  function _renderCategoryChart(data) {
    const canvas = document.getElementById('trend-chart-category');
    if (!canvas) return;
    if (_charts.cat) _charts.cat.destroy();
    const t = _theme();
    const CATS = Object.keys(CONFIG.CATEGORY_COLORS).filter(c => c !== 'Uncategorized');

    const datasets = CATS.map(cat => ({
      label: cat,
      data: data.map(d => d.categories[cat] || 0),
      backgroundColor: (CONFIG.CATEGORY_COLORS[cat] || '#64748b') + 'cc',
      borderColor:      CONFIG.CATEGORY_COLORS[cat] || '#64748b',
      borderWidth: 1,
      borderRadius: 4,
      maxBarThickness: 48,
      stack: 'cat',
    }));

    _charts.cat = new Chart(canvas, {
      type: 'bar',
      data: { labels: data.map(d => d.labelShort), datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: CONFIG.CHART_ANIMATION },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { color: t.textColor, usePointStyle: true } },
          tooltip: { ..._baseTooltip(t), callbacks: { label: ctx => `  ${ctx.dataset.label}: ${Fmt.currency(ctx.raw)}` } },
        },
        scales: {
          x: { stacked: true, grid: { color: t.gridColor }, ticks: { color: t.textColor } },
          y: { stacked: true, grid: { color: t.gridColor }, ticks: { color: t.textColor, callback: v => Fmt.currency(v) } },
        },
      }
    });
  }

  // ── Summary table ─────────────────────────────────────────────────────────
  function _renderTable(data) {
    const tbody = document.getElementById('trend-table-body');
    if (!tbody) return;
    if (data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:24px;color:var(--text-muted)">Pilih minimal satu bulan</td></tr>`;
      return;
    }
    tbody.innerHTML = data.map(d => `
      <tr>
        <td style="font-weight:600;white-space:nowrap">${d.label}</td>
        <td class="text-right font-semibold">${Fmt.currency(d.sales)}</td>
        <td class="text-right text-muted">${d.target > 0 ? Fmt.currency(d.target) : '—'}</td>
        <td class="text-right font-semibold ${Fmt.achClass(d.achievement)}">${d.achievement !== null ? Fmt.percent(d.achievement) : '—'}</td>
        <td class="text-right">${d.growth !== null ? Fmt.trendBadge(d.growth) : '—'}</td>
        <td class="text-right">${Fmt.number(d.ao)}</td>
        <td class="text-right">${Fmt.number(d.repeat)}</td>
        <td class="text-right" style="color:var(--accent-red)">${Fmt.number(d.lost)}</td>
        <td class="text-right" style="color:var(--accent-cyan)">${Fmt.number(d.reactivated)}</td>
        <td class="text-right">${Fmt.number(d.invoices)}</td>
      </tr>`).join('');
  }

  // ── Main render ───────────────────────────────────────────────────────────
  function _renderAll() {
    if (!_rawData) return;
    const ordered = [..._selectedMonths].sort();
    if (ordered.length === 0) { _destroyAll(); _renderTable([]); return; }
    const data = Analytics.calcMonthlyTrend(_rawData, ordered, _smIds());
    _renderSalesChart(data);
    _renderAchievementChart(data);
    _renderOutletChart(data);
    _renderCategoryChart(data);
    _renderTable(data);
  }

  // ── Public: render (called by SectionManager) ────────────────────────────
  function render(rawData, filters) {
    _rawData = rawData;
    const allMonths = _getAvailableMonths(rawData);

    // Init default months once (salesman default = null = Semua)
    if (_selectedMonths.size === 0) {
      allMonths.slice(0, 6).forEach(ym => _selectedMonths.add(ym));
    }

    _renderMonthFilter(allMonths);
    _renderSmFilter();
    _renderAll();
  }

  function exportExcel() {
    if (typeof XLSX === 'undefined') { alert('SheetJS not loaded.'); return; }
    const ordered = [..._selectedMonths].sort();
    if (ordered.length === 0) { alert('Pilih minimal satu bulan.'); return; }
    const data = Analytics.calcMonthlyTrend(_rawData, ordered, _smIds());
    const rows = data.map(d => ({
      'Bulan':          d.label,
      'Total Sales':    d.sales,
      'Target':         d.target,
      'Achievement %':  d.achievement !== null ? parseFloat(d.achievement.toFixed(2)) : null,
      'Growth %':       d.growth !== null ? parseFloat(d.growth.toFixed(2)) : null,
      'Active Outlet':  d.ao,
      'Repeat':         d.repeat,
      'Lost':           d.lost,
      'Reactivated':    d.reactivated,
      'Invoice':        d.invoices,
      ...Object.fromEntries(Object.entries(d.categories).map(([k, v]) => [k, v])),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tren Bulanan');
    XLSX.writeFile(wb, `Tren_Bulanan_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return { render, exportExcel };
})();
