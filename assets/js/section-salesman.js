const SalesmanSection = (() => {
  let _chart1 = null, _chart2 = null, _chart3 = null, _chartCat = null;

  function _renderCards(smData) {
    const grid = document.getElementById('sm-cards-grid');
    if (!grid) return;
    const sorted = [...smData].sort((a, b) => b.achievement - a.achievement);
    const rankColors = ['#f59e0b', '#94a3b8', '#c47d50'];
    grid.innerHTML = sorted.map((sm, i) => {
      const ach = Math.min(sm.achievement, 150);
      const color = Fmt.achColor(sm.achievement);
      const rankColor = rankColors[i] || 'var(--text-muted)';
      return `
        <div class="sm-card" style="border-top-color:${color}">
          <div class="sm-card-header">
            <div>
              <div class="sm-card-name">${sm.name}</div>
              <div class="sm-card-area">${sm.area}</div>
            </div>
            <div style="font-size:22px;font-weight:800;color:${rankColor}">#${i + 1}</div>
          </div>
          <div class="sm-card-stats">
            <div class="sm-stat-item"><div class="sm-stat-val" style="color:${color}">${Fmt.percent(sm.achievement)}</div><div class="sm-stat-lbl">Achievement</div></div>
            <div class="sm-stat-item"><div class="sm-stat-val">${Fmt.currency(sm.totalSales)}</div><div class="sm-stat-lbl">Sales</div></div>
            <div class="sm-stat-item"><div class="sm-stat-val">${Fmt.number(sm.ao)}</div><div class="sm-stat-lbl">AO</div></div>
            <div class="sm-stat-item"><div class="sm-stat-val">${Fmt.trendBadge(sm.growth)}</div><div class="sm-stat-lbl">Growth</div></div>
          </div>
          <div class="sm-ach-bar"><div class="sm-ach-fill" style="width:${(ach / 150) * 100}%;background:${color}"></div></div>
          <div class="sm-ach-target">Target: ${Fmt.currency(sm.target)}</div>
        </div>
      `;
    }).join('');
  }

  function _renderCharts(smData) {
    const t = Theme.getChartDefaults();
    const sorted = [...smData].sort((a, b) => b.totalSales - a.totalSales);
    const names = sorted.map(s => s.name.split(' ')[0]);

    if (_chart1) _chart1.destroy();
    const c1 = document.getElementById('chart-sm-vs-target');
    if (c1) _chart1 = new Chart(c1, {
      type: 'bar',
      data: {
        labels: names,
        datasets: [
          { label: 'Sales',  data: sorted.map(s => s.totalSales), backgroundColor: '#4f9cf9cc', borderColor: '#4f9cf9', borderWidth: 1.5, borderRadius: 6 },
          { label: 'Target', data: sorted.map(s => s.target), backgroundColor: 'transparent', borderColor: '#8b5cf6', borderWidth: 2, type: 'line', tension: 0.3, pointRadius: 4 },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: t.textColor } }, tooltip: { backgroundColor: t.tooltipBg, titleColor: t.tooltipText, bodyColor: t.tooltipText, callbacks: { label: ctx => `  ${ctx.dataset.label}: ${Fmt.currency(ctx.raw)}` } } },
        scales: { x: { ticks: { color: t.textColor }, grid: { color: t.gridColor } }, y: { ticks: { color: t.textColor, callback: v => Fmt.currency(v) }, grid: { color: t.gridColor } } }
      }
    });

    if (_chart2) _chart2.destroy();
    const c2 = document.getElementById('chart-sm-achievement');
    if (c2) _chart2 = new Chart(c2, {
      type: 'bar',
      data: {
        labels: names,
        datasets: [{
          label: 'Achievement %', data: sorted.map(s => s.achievement),
          backgroundColor: sorted.map(s => Fmt.achHex(s.achievement) + 'cc'),
          borderColor:     sorted.map(s => Fmt.achHex(s.achievement)),
          borderWidth: 1.5, borderRadius: 6
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: t.tooltipBg, titleColor: t.tooltipText, bodyColor: t.tooltipText, callbacks: { label: ctx => `  ${Fmt.percent(ctx.raw)}` } } },
        scales: { x: { ticks: { color: t.textColor }, grid: { display: false } }, y: { ticks: { color: t.textColor, callback: v => Fmt.percent(v) }, grid: { color: t.gridColor } } }
      }
    });

    if (_chart3) _chart3.destroy();
    const c3 = document.getElementById('chart-sm-outlets');
    if (c3) _chart3 = new Chart(c3, {
      type: 'bar',
      data: {
        labels: names,
        datasets: [
          { label: 'AO',          data: sorted.map(s => s.ao),          backgroundColor: '#4f9cf9aa', borderColor: '#4f9cf9', borderWidth: 1.5, borderRadius: 4 },
          { label: 'Repeat',      data: sorted.map(s => s.repeat),      backgroundColor: '#4caf82aa', borderColor: '#4caf82', borderWidth: 1.5, borderRadius: 4 },
          { label: 'Lost',        data: sorted.map(s => s.lost),        backgroundColor: '#ef4444aa', borderColor: '#ef4444', borderWidth: 1.5, borderRadius: 4 },
          { label: 'Reactivated', data: sorted.map(s => s.reactivated), backgroundColor: '#06b6d4aa', borderColor: '#06b6d4', borderWidth: 1.5, borderRadius: 4 },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: t.textColor, usePointStyle: true } }, tooltip: { backgroundColor: t.tooltipBg, titleColor: t.tooltipText, bodyColor: t.tooltipText } },
        scales: { x: { ticks: { color: t.textColor }, grid: { display: false } }, y: { ticks: { color: t.textColor }, grid: { color: t.gridColor } } }
      }
    });
  }

  function _renderTable(smData) {
    const tbody = document.getElementById('sm-detail-tbody');
    if (!tbody) return;
    const sorted = [...smData].sort((a, b) => b.achievement - a.achievement);
    tbody.innerHTML = sorted.map((sm, i) => {
      const achColor = Fmt.achClass(sm.achievement);
      return `<tr>
        <td><span class="rank-badge rank-${i + 1}">${i + 1}</span></td>
        <td><div class="sm-name">${sm.name}</div></td>
        <td><div class="sm-area">${sm.area}</div></td>
        <td class="text-right font-semibold">${Fmt.currency(sm.totalSales)}</td>
        <td class="text-right text-muted">${Fmt.currency(sm.target)}</td>
        <td class="text-right ${achColor} font-semibold">${Fmt.percent(sm.achievement)}</td>
        <td class="text-right">${Fmt.trendBadge(sm.growth)}</td>
        <td class="text-right">${Fmt.number(sm.ao)}</td>
        <td class="text-right">${Fmt.number(sm.repeat)}</td>
        <td class="text-right">${Fmt.number(sm.lost)}</td>
        <td class="text-right" style="color:var(--accent-cyan)">${Fmt.number(sm.reactivated)}</td>
        <td class="text-right">${Fmt.number(sm.invoices)}</td>
      </tr>`;
    }).join('');
  }

  function _renderCategoryChart(breakdown) {
    const canvas = document.getElementById('chart-sm-cat');
    const inner  = document.getElementById('chart-sm-cat-inner');
    if (!canvas || !breakdown || !breakdown.length) return;

    if (_chartCat) { _chartCat.destroy(); _chartCat = null; }

    const t = Theme.getChartDefaults();
    const isDark = Theme.current() === 'dark';

    // Flat row list: one row per salesman × category
    const rows = [];
    breakdown.forEach(sm => {
      sm.rows.forEach((r, i) => {
        rows.push({
          smName:      sm.salesman.split(' ').slice(0, 2).join(' '),
          smFullName:  sm.salesman,
          category:    r.category,
          target:      r.target,
          actual:      r.actual,
          achievement: r.achievement,
          isFirst:     i === 0,
          isLast:      i === sm.rows.length - 1,
        });
      });
    });

    // Build salesman groups for centering names
    const smGroups = [];
    let gIdx = 0;
    breakdown.forEach(sm => {
      smGroups.push({ name: sm.salesman.split(' ').slice(0, 2).join(' '), start: gIdx, count: sm.rows.length });
      gIdx += sm.rows.length;
    });

    const ROW_H  = 40;
    const SM_COL = 125; // left column width reserved for salesman names
    const totalH = rows.length * ROW_H + 20;
    canvas.style.height = totalH + 'px';
    if (inner) inner.style.height = totalH + 'px';

    // Y-axis shows category names only
    const yLabels     = rows.map(r => r.category);
    const targetData  = rows.map(() => 100);
    const actualData  = rows.map(r => r.achievement !== null ? Math.min(r.achievement, 100) : 0);
    const actualColors = rows.map(r => (CONFIG.CATEGORY_COLORS[r.category] || '#64748b') + 'cc');
    const actualBorder = rows.map(r => CONFIG.CATEGORY_COLORS[r.category] || '#64748b');

    const smCatLabelPlugin = {
      id: 'smCatLabels',
      afterDraw(chart) {
        const { ctx, scales: { x }, chartArea } = chart;
        ctx.save();
        ctx.textBaseline = 'middle';

        const meta1 = chart.getDatasetMeta(1);

        // 1. Rupiah label inside actual bar
        meta1.data.forEach((bar, idx) => {
          const row = rows[idx];
          if (!row.actual) return;
          const barRight = x.getPixelForValue(actualData[idx]);
          const barWidth = barRight - x.getPixelForValue(0);
          if (barWidth > 55) {
            ctx.font = 'bold 10px Inter, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillStyle = 'rgba(255,255,255,0.92)';
            ctx.shadowColor = 'rgba(0,0,0,0.4)';
            ctx.shadowBlur = 3;
            ctx.fillText(Fmt.currency(row.actual), barRight - 6, bar.y);
            ctx.shadowBlur = 0;
          }
        });

        // 2. Achievement % fixed at right edge (right Y-axis column)
        ctx.font = 'bold 10.5px Inter, sans-serif';
        ctx.textAlign = 'left';
        meta1.data.forEach((bar, idx) => {
          const row = rows[idx];
          if (row.achievement === null) return;
          ctx.fillStyle = Fmt.achHex(row.achievement);
          ctx.fillText(Fmt.percent(row.achievement), chartArea.right + 8, bar.y);
        });

        // 3. Bold salesman name centered vertically in SM_COL, per group
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = t.textColor;
        smGroups.forEach(grp => {
          const firstY = meta1.data[grp.start]?.y;
          const lastY  = meta1.data[grp.start + grp.count - 1]?.y;
          if (firstY == null || lastY == null) return;
          ctx.fillText(grp.name, SM_COL / 2, (firstY + lastY) / 2);
        });

        // 4. Separator lines
        // Between-salesman: solid, more visible — spans full width
        // Between-category within salesman: very faint dashed — spans from SM_COL to right
        let rowIdx = 0;
        breakdown.forEach((sm, si) => {
          sm.rows.forEach((r, ri) => {
            if (rowIdx > 0) {
              const prevY = meta1.data[rowIdx - 1]?.y;
              const curY  = meta1.data[rowIdx]?.y;
              if (prevY == null || curY == null) { rowIdx++; return; }
              const sepY = (prevY + curY) / 2;
              const isBoundary = ri === 0;
              ctx.lineWidth   = isBoundary ? 1.5 : 0.8;
              ctx.strokeStyle = isBoundary
                ? (isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.14)')
                : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)');
              ctx.setLineDash(isBoundary ? [] : [3, 4]);
              ctx.beginPath();
              ctx.moveTo(isBoundary ? 0 : SM_COL, sepY);
              ctx.lineTo(chartArea.right, sepY);
              ctx.stroke();
            }
            rowIdx++;
          });
        });

        // Vertical divider between SM_COL and Y-axis area
        ctx.setLineDash([]);
        ctx.lineWidth = 1;
        ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
        ctx.beginPath();
        ctx.moveTo(SM_COL, chartArea.top);
        ctx.lineTo(SM_COL, chartArea.bottom);
        ctx.stroke();

        ctx.restore();
      }
    };

    _chartCat = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: yLabels,
        datasets: [
          {
            label: 'Target',
            data: targetData,
            backgroundColor: 'rgba(100,116,139,0.22)',
            borderColor:     'rgba(100,116,139,0.45)',
            borderWidth: 1,
            borderRadius: 3,
            barPercentage: 0.65,
            categoryPercentage: 0.9,
          },
          {
            label: 'Sales',
            data: actualData,
            backgroundColor: actualColors,
            borderColor:     actualBorder,
            borderWidth: 1,
            borderRadius: 3,
            barPercentage: 0.65,
            categoryPercentage: 0.9,
          },
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        grouped: false,
        animation: { duration: CONFIG.CHART_ANIMATION },
        layout: { padding: { left: SM_COL, right: 62 } },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: t.tooltipBg,
            titleColor: t.tooltipText,
            bodyColor: t.tooltipText,
            borderColor: t.tooltipBorder,
            borderWidth: 1,
            cornerRadius: 8,
            padding: 10,
            callbacks: {
              title: ctx => {
                const r = rows[ctx[0].dataIndex];
                return `${r.smFullName} — ${r.category}`;
              },
              label: ctx => {
                const r = rows[ctx.dataIndex];
                if (ctx.datasetIndex === 0) return `  Target: ${Fmt.currency(r.target)}`;
                return [
                  `  Sales:  ${Fmt.currency(r.actual)}`,
                  `  Achievement: ${r.achievement !== null ? Fmt.percent(r.achievement) : '—'}`,
                ];
              },
            }
          },
        },
        scales: {
          x: {
            min: 0,
            max: 100,
            grid: { color: t.gridColor },
            ticks: { color: t.textColor, callback: v => v + '%' },
          },
          y: {
            afterFit(scale) { scale.width = Math.max(scale.width, 100); },
            grid: { display: false },
            ticks: { color: t.textColor, font: { size: 11 }, autoSkip: false },
          },
        },
      },
      plugins: [smCatLabelPlugin],
    });
  }

  function render(raw, filters) {
    const smData    = Analytics.calcSalesmanMetrics(raw, filters);
    const breakdown = Analytics.calcSalesmanCategoryBreakdown(raw, filters);
    _renderCards(smData);
    _renderCharts(smData);
    _renderTable(smData);
    _renderCategoryChart(breakdown);
  }

  function exportExcel(raw, filters) {
    const smData = Analytics.calcSalesmanMetrics(raw, { ...filters, salesman: 'all', category: 'all' });
    const rows = smData.map(s => ({ Salesman: s.name, Area: s.area, Sales: s.totalSales, Target: s.target, Achievement: s.achievement, AO: s.ao, Repeat: s.repeat, Lost: s.lost, Reactivated: s.reactivated, Invoice: s.invoices }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Salesman');
    XLSX.writeFile(wb, `Salesman_${filters.year}_${String(filters.month).padStart(2, '0')}.xlsx`);
  }

  return { render, exportExcel };
})();
