// ─── Shared plugin: percentage labels inside donut slices ─────────────────────
const DonutLabelPlugin = {
  id: 'donutPercentLabels',
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    chart.data.datasets.forEach((dataset, di) => {
      const meta = chart.getDatasetMeta(di);
      if (meta.type !== 'doughnut') return;
      const total = dataset.data.reduce((a, b) => a + (b || 0), 0);
      if (!total) return;
      meta.data.forEach((arc, index) => {
        const value = dataset.data[index];
        if (!value) return;
        const pct = (value / total) * 100;
        if (pct < 4) return;   // skip slices too small to label
        const { x, y } = arc.tooltipPosition();
        ctx.save();
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.45)';
        ctx.shadowBlur = 4;
        ctx.fillText(pct.toFixed(1) + '%', x, y);
        ctx.restore();
      });
    });
  },
};

const Charts = (() => {
  const instances = {};

  function _destroy(id) {
    if (instances[id]) { instances[id].destroy(); delete instances[id]; }
  }

  function _theme() { return Theme.getChartDefaults(); }

  function _tooltipDefaults() {
    const t = _theme();
    return {
      backgroundColor: t.tooltipBg,
      borderColor:     t.tooltipBorder,
      borderWidth:     1,
      titleColor:      t.tooltipText,
      bodyColor:       t.tooltipText,
      padding:         12,
      cornerRadius:    8,
      displayColors:   true,
      callbacks: {
        label: ctx => {
          const val = ctx.raw;
          if (typeof val === 'number' && val >= 1000) return '  ' + Fmt.currency(val);
          return ctx.dataset.label + ': ' + ctx.formattedValue;
        }
      }
    };
  }

  // ─── Sales Trend ──────────────────────────────────────────────────────────
  function renderSalesTrend(data) {
    _destroy('salesTrend');
    const canvas = document.getElementById('chart-sales-trend');
    if (!canvas) return;
    const t = _theme();

    instances.salesTrend = new Chart(canvas, {
      type: 'line',
      data: {
        labels: data.labels.map(d => d),
        datasets: [
          {
            label: 'Bulan Ini',
            data: data.curCumulative,
            borderColor: '#4f9cf9',
            backgroundColor: 'rgba(79,156,249,0.08)',
            borderWidth: 2.5,
            tension: 0.4,
            fill: true,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: '#4f9cf9',
          },
          {
            label: 'Bulan Lalu',
            data: data.prevCumulative,
            borderColor: '#8b5cf6',
            backgroundColor: 'rgba(139,92,246,0.04)',
            borderWidth: 2,
            borderDash: [5, 4],
            tension: 0.4,
            fill: true,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: '#8b5cf6',
          },
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        animation: { duration: CONFIG.CHART_ANIMATION },
        plugins: {
          legend: { labels: { color: t.textColor, usePointStyle: true, pointStyleWidth: 10 } },
          tooltip: {
            ..._tooltipDefaults(),
            callbacks: {
              title: ctx => `Hari ke-${ctx[0].label}`,
              label: ctx => `  ${ctx.dataset.label}: ${Fmt.currency(ctx.raw)}`,
            }
          },
        },
        scales: {
          x: {
            grid: { color: t.gridColor },
            ticks: { color: t.textColor, maxTicksLimit: 10 },
          },
          y: {
            grid: { color: t.gridColor },
            ticks: { color: t.textColor, callback: v => Fmt.currency(v) },
          },
        },
      }
    });
  }

  // ─── Achievement Gauge ────────────────────────────────────────────────────
  function renderGauge(achievement) {
    _destroy('gauge');
    const canvas = document.getElementById('chart-gauge');
    if (!canvas) return;

    const pct    = Math.min(achievement, 150);
    const filled = (pct / 150) * 100;
    const color  = Fmt.achHex(achievement);

    instances.gauge = new Chart(canvas, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [filled, 100 - filled],
          backgroundColor: [color, Theme.current() === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'],
          borderWidth: 0,
          circumference: 180,
          rotation: 270,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '78%',
        animation: { duration: CONFIG.CHART_ANIMATION },
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
        },
      }
    });

    // Center label
    const centerEl = document.getElementById('gauge-center');
    if (centerEl) {
      centerEl.innerHTML = `
        <div class="gauge-value" style="color:${color}">${Fmt.percent(achievement)}</div>
        <div class="gauge-label">Achievement</div>
      `;
    }
  }

  // ─── Salesman Ranking ─────────────────────────────────────────────────────
  function renderSalesmanRanking(data) {
    _destroy('salesmanRanking');
    const canvas = document.getElementById('chart-salesman-ranking');
    if (!canvas) return;
    const t = _theme();

    const sorted = [...data].sort((a, b) => b.totalSales - a.totalSales);
    const colors = sorted.map(s => Fmt.achHex(s.achievement));

    instances.salesmanRanking = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: sorted.map(s => s.name.split(' ')[0]),
        datasets: [{
          label: 'Sales',
          data: sorted.map(s => s.totalSales),
          backgroundColor: colors.map(c => c + 'cc'),
          borderColor: colors,
          borderWidth: 1.5,
          borderRadius: 6,
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: CONFIG.CHART_ANIMATION },
        plugins: {
          legend: { display: false },
          tooltip: {
            ..._tooltipDefaults(),
            callbacks: {
              label: ctx => `  Sales: ${Fmt.currency(ctx.raw)}`,
            }
          },
        },
        scales: {
          x: {
            grid: { color: t.gridColor },
            ticks: { color: t.textColor, callback: v => Fmt.currency(v) },
          },
          y: { grid: { display: false }, ticks: { color: t.textColor } },
        },
      }
    });
  }

  // ─── Category Donut ───────────────────────────────────────────────────────
  function renderCategoryDonut(data) {
    _destroy('categoryDonut');
    const canvas = document.getElementById('chart-category-donut');
    if (!canvas) return;
    const t = _theme();

    instances.categoryDonut = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: data.map(c => c.name),
        datasets: [{
          data: data.map(c => c.sales),
          backgroundColor: data.map(c => c.color + 'cc'),
          borderColor: data.map(c => c.color),
          borderWidth: 2,
          hoverOffset: 8,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        animation: { duration: CONFIG.CHART_ANIMATION },
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: t.textColor,
              padding: 12,
              usePointStyle: true,
              pointStyleWidth: 10,
              generateLabels: chart => chart.data.labels.map((label, i) => ({
                text: label,
                fillStyle: chart.data.datasets[0].backgroundColor[i],
                strokeStyle: chart.data.datasets[0].borderColor[i],
                pointStyle: 'circle',
                index: i,
              })),
            }
          },
          tooltip: {
            ..._tooltipDefaults(),
            callbacks: {
              label: ctx => `  ${ctx.label}: ${Fmt.currency(ctx.raw)} (${Fmt.percent(ctx.dataset.data.reduce((a,b)=>a+b,0) > 0 ? (ctx.raw/ctx.dataset.data.reduce((a,b)=>a+b,0))*100 : 0)})`,
            }
          },
        },
      },
      plugins: [DonutLabelPlugin],
    });
  }

  // ─── Outlet Retention ─────────────────────────────────────────────────────
  function renderOutletRetention(data) {
    _destroy('outletRetention');
    const canvas = document.getElementById('chart-outlet-retention');
    if (!canvas) return;
    const t = _theme();

    instances.outletRetention = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: data.map(d => d.label),
        datasets: [
          {
            label: 'Active',
            data: data.map(d => d.active),
            backgroundColor: '#4f9cf9aa',
            borderColor: '#4f9cf9',
            borderWidth: 1.5,
            borderRadius: 4,
          },
          {
            label: 'Repeat',
            data: data.map(d => d.repeat),
            backgroundColor: '#4caf82aa',
            borderColor: '#4caf82',
            borderWidth: 1.5,
            borderRadius: 4,
          },
          {
            label: 'Lost',
            data: data.map(d => d.lost),
            backgroundColor: '#ef4444aa',
            borderColor: '#ef4444',
            borderWidth: 1.5,
            borderRadius: 4,
          },
          {
            label: 'Reactivated',
            data: data.map(d => d.reactivated),
            backgroundColor: '#f59e0baa',
            borderColor: '#f59e0b',
            borderWidth: 1.5,
            borderRadius: 4,
          },
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: CONFIG.CHART_ANIMATION },
        plugins: {
          legend: { labels: { color: t.textColor, usePointStyle: true } },
          tooltip: { ..._tooltipDefaults(), callbacks: { label: ctx => `  ${ctx.dataset.label}: ${ctx.raw}` } },
        },
        scales: {
          x: { grid: { color: t.gridColor }, ticks: { color: t.textColor } },
          y: { grid: { color: t.gridColor }, ticks: { color: t.textColor } },
        },
      }
    });
  }

  // ─── Product Missing Table (replaces bar chart) ───────────────────────────
  function renderProductMissing(data) {
    _destroy('productMissing');
    const tbody = document.getElementById('pm-table-body');
    if (!tbody) return;

    if (!data || !data.length) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--text-muted)">Tidak ada produk missing bulan ini 🎉</td></tr>';
      return;
    }

    tbody.innerHTML = data.map((p, i) => `
      <tr>
        <td class="pm-rank">${i + 1}</td>
        <td><span class="pm-product">${p.product}</span></td>
        <td class="text-right"><span style="color:var(--accent-orange);font-weight:600">${Fmt.number(p.prevTx)}</span><span style="font-size:10px;color:var(--text-muted);margin-left:3px">tx</span></td>
        <td class="text-right"><span style="color:var(--accent-blue);font-weight:600">${Fmt.currency(p.prevSales)}</span></td>
      </tr>
    `).join('');
  }

  function applyTheme() {
    Object.keys(instances).forEach(id => {
      const chart = instances[id];
      if (!chart) return;
      const t = _theme();
      if (chart.config.options.plugins?.legend?.labels) {
        chart.config.options.plugins.legend.labels.color = t.textColor;
      }
      if (chart.config.options.plugins?.tooltip) {
        chart.config.options.plugins.tooltip.backgroundColor = t.tooltipBg;
        chart.config.options.plugins.tooltip.titleColor = t.tooltipText;
        chart.config.options.plugins.tooltip.bodyColor  = t.tooltipText;
      }
      ['x','y'].forEach(axis => {
        if (chart.config.options.scales?.[axis]) {
          if (chart.config.options.scales[axis].grid)  chart.config.options.scales[axis].grid.color = t.gridColor;
          if (chart.config.options.scales[axis].ticks) chart.config.options.scales[axis].ticks.color = t.textColor;
        }
      });
      chart.update('none');
    });
  }

  function updateAll(analyticsData) {
    if (analyticsData.trend)     renderSalesTrend(analyticsData.trend);
    if (analyticsData.kpis)      renderGauge(analyticsData.kpis.achievement);
    if (analyticsData.salesman)  renderSalesmanRanking(analyticsData.salesman);
    if (analyticsData.categories)renderCategoryDonut(analyticsData.categories);
    if (analyticsData.retention) renderOutletRetention(analyticsData.retention);
    if (analyticsData.missing)   renderProductMissing(analyticsData.missing);
  }

  return { renderSalesTrend, renderGauge, renderSalesmanRanking, renderCategoryDonut,
           renderOutletRetention, renderProductMissing, updateAll, applyTheme };
})();
