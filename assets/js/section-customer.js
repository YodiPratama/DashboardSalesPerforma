const CustomerSection = (() => {
  let _statusChart = null, _topChart = null;

  function _renderSummary(customers) {
    const counts = { Active: 0, Reactivated: 0, Risk: 0, Lost: 0, Dormant: 0 };
    customers.forEach(c => {
      if (c.status === 'Active' || c.status === 'Insight') counts.Active++;
      else if (c.status === 'Reactivated') counts.Reactivated++;
      else if (c.status === 'Risk') counts.Risk++;
      else if (c.status === 'Lost') counts.Lost++;
      else counts.Dormant++;
    });
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('cnt-active', counts.Active);
    set('cnt-reactivated', counts.Reactivated);
    set('cnt-risk', counts.Risk);
    set('cnt-lost', counts.Lost);
    set('cnt-dormant', counts.Dormant);
  }

  function _renderCharts(customers) {
    const t = Theme.getChartDefaults();

    if (_statusChart) _statusChart.destroy();
    const c1 = document.getElementById('chart-status-donut');
    if (c1) {
      const statusCounts = { Active: 0, Reactivated: 0, 'At Risk': 0, Lost: 0, Dormant: 0 };
      customers.forEach(c => {
        if (c.status === 'Active' || c.status === 'Insight') statusCounts['Active']++;
        else if (c.status === 'Reactivated') statusCounts['Reactivated']++;
        else if (c.status === 'Risk') statusCounts['At Risk']++;
        else if (c.status === 'Lost') statusCounts['Lost']++;
        else statusCounts['Dormant']++;
      });
      const labels = Object.keys(statusCounts).filter(k => statusCounts[k] > 0);
      const colorMap = { Active: '#4caf82', Reactivated: '#4f9cf9', 'At Risk': '#f59e0b', Lost: '#ef4444', Dormant: '#94a3b8' };
      _statusChart = new Chart(c1, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{ data: labels.map(l => statusCounts[l]), backgroundColor: labels.map(l => colorMap[l] + 'cc'), borderColor: labels.map(l => colorMap[l]), borderWidth: 2, hoverOffset: 6 }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'right', labels: { color: t.textColor, usePointStyle: true, font: { size: 10 } } }, tooltip: { backgroundColor: t.tooltipBg, titleColor: t.tooltipText, bodyColor: t.tooltipText } } },
        plugins: [DonutLabelPlugin],
      });
    }

    if (_topChart) _topChart.destroy();
    const c2 = document.getElementById('chart-top-customers');
    if (c2) {
      const top10 = [...customers].sort((a, b) => b.sales - a.sales).slice(0, 10);
      _topChart = new Chart(c2, {
        type: 'bar',
        data: {
          labels: top10.map(c => c.name.length > 16 ? c.name.substring(0, 14) + '…' : c.name),
          datasets: [{ label: 'Sales', data: top10.map(c => c.sales), backgroundColor: '#4f9cf9cc', borderColor: '#4f9cf9', borderWidth: 1.5, borderRadius: 6 }]
        },
        options: {
          indexAxis: 'y', responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { backgroundColor: t.tooltipBg, titleColor: t.tooltipText, bodyColor: t.tooltipText, callbacks: { label: ctx => `  ${Fmt.currency(ctx.raw)}` } } },
          scales: { x: { ticks: { color: t.textColor, callback: v => Fmt.currency(v) }, grid: { color: t.gridColor } }, y: { ticks: { color: t.textColor, font: { size: 11 } }, grid: { display: false } } }
        }
      });
    }
  }

  function render(raw, filters) {
    const customers = Analytics.calcCustomerTable(raw, filters);
    _renderSummary(customers);
    _renderCharts(customers);
    Table.init(customers, raw, filters);
  }

  function exportExcel(raw, filters) {
    const customers = Analytics.calcCustomerTable(raw, { ...filters, salesman: 'all', category: 'all' });
    Table.exportExcel(customers, `${filters.year}_${String(filters.month).padStart(2, '0')}`);
  }

  return { render, exportExcel };
})();
