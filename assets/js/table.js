const Table = (() => {
  let dtInstance = null;
  let _rawData   = null;
  let _filters   = null;
  let _customers = [];

  // Native delegation handler — module-level agar bisa di-removeEventListener
  function _handleClick(e) {
    const tr = e.target.closest('tr[data-customer-id]');
    if (!tr) return;
    _openModal(tr.getAttribute('data-customer-id'));
  }

  function _statusBadge(status) {
    const map = {
      'Active':      '<span class="badge badge-green">Active</span>',
      'Insight':     '<span class="badge badge-amber">Active ⚡</span>',
      'Risk':        '<span class="badge badge-orange">At Risk</span>',
      'Reactivated': '<span class="badge badge-blue">Reactivated</span>',
      'Lost':        '<span class="badge badge-red">Lost</span>',
      'Dormant':     '<span class="badge badge-gray">Dormant</span>',
    };
    return map[status] || `<span class="badge">${status}</span>`;
  }

  const ARROW_ICON = `
    <svg class="row-arrow-icon" width="14" height="14" viewBox="0 0 24 24"
         fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>`;

  // ── Core click handler ────────────────────────────────────────────────────
  function _openModal(custId) {
    const cust = _customers.find(c => c.id === custId);
    if (!cust) { console.warn('[Table] Customer not found in _customers array'); return; }
    if (typeof Modal === 'undefined') { console.error('[Table] Modal is not defined — check script load order'); return; }
    const showAllMonths = ['Lost', 'Dormant'].includes(cust.status);
    Modal.openCustomerModal(cust, _rawData, _filters, { showAllMonths });
  }

  // ── Status filter pills ───────────────────────────────────────────────────
  function _renderStatusFilter() {
    const el = document.getElementById('customer-status-filter');
    if (!el || !dtInstance) return;

    const options = [
      { key: 'all',         label: 'Semua',         search: '' },
      { key: 'Active',      label: 'Active',         search: '^Active$' },
      { key: 'Insight',     label: 'Active ⚡',      search: '^Active ⚡$' },
      { key: 'Risk',        label: 'At Risk',        search: '^At Risk$' },
      { key: 'Reactivated', label: 'Reactivated',    search: '^Reactivated$' },
      { key: 'Lost',        label: 'Lost',           search: '^Lost$' },
      { key: 'Dormant',     label: 'Dormant',        search: '^Dormant$' },
    ];

    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
        <span class="mf-label">Status:</span>
        ${options.map(o => `<button class="month-pill ${o.key === 'all' ? 'active' : ''}"
          data-skey="${o.key}" data-ssearch="${o.search}">${o.label}</button>`).join('')}
      </div>`;

    el.querySelectorAll('.month-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        el.querySelectorAll('.month-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const search = btn.getAttribute('data-ssearch');
        dtInstance.column(10).search(search, true, false).draw();
      });
    });
  }

  function init(customers, rawData, filters) {
    _customers = customers;
    _rawData   = rawData;
    _filters   = filters;

    console.log('[Table] init() — customers:', customers.length, '| rawData:', !!rawData);

    const tableEl = document.getElementById('customer-table');
    if (!tableEl) { console.warn('[Table] #customer-table not found'); return; }

    // Destroy existing DataTables instance cleanly
    if (dtInstance) {
      dtInstance.destroy();
      dtInstance = null;
      // Remove delegated event that was bound to tableEl previously
      if (typeof $ !== 'undefined') $(tableEl).off('click.modal');
    }
    tableEl.innerHTML = '';

    // ── thead ────────────────────────────────────────────────────────────────
    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th>#</th>
        <th>Customer</th>
        <th>Salesman</th>
        <th>Area</th>
        <th class="text-right">Total Sales</th>
        <th class="text-right">TX</th>
        <th class="text-right">AO</th>
        <th class="text-right">EC</th>
        <th class="text-right" title="Produk diorder bulan ini / Total produk pernah diorder">Produk (M/Total)</th>
        <th class="text-right" title="Jumlah produk dari riwayat yang belum diorder bulan ini">Missing</th>
        <th class="text-center">Status</th>
        <th class="no-sort"></th>
      </tr>
    `;
    tableEl.appendChild(thead);

    // ── tbody — pre-sort by sales so rank # is meaningful ───────────────────
    const ranked = [...customers].sort((a, b) => b.sales - a.sales);
    const tbody = document.createElement('tbody');
    ranked.forEach((c, i) => {
      const rank = i + 1;
      const inactive = ['Lost', 'Dormant'].includes(c.status);
      const lastActiveLabel = inactive && c.lastActiveYM ? (() => {
        const [y, m] = c.lastActiveYM.split('-').map(Number);
        return `${CONFIG.MONTHS_ID[m - 1]} ${y}`;
      })() : null;

      const tr = document.createElement('tr');
      tr.setAttribute('data-customer-id', c.id);
      if (inactive) tr.style.opacity = '0.72';
      tr.innerHTML = `
        <td data-order="${rank}" class="text-center" style="color:var(--text-muted);font-weight:600;font-size:12px">${rank}</td>
        <td>
          <span class="customer-name">${c.name}</span>
          ${lastActiveLabel ? `<br><span style="font-size:10px;color:var(--text-muted)">Terakhir aktif: ${lastActiveLabel}</span>` : ''}
        </td>
        <td style="color:var(--text-secondary)">${c.salesman}</td>
        <td style="color:var(--text-secondary)">${c.area}</td>
        <td class="text-right font-semibold" data-order="${c.sales}">${inactive ? '<span style="color:var(--text-muted)">—</span>' : Fmt.currency(c.sales)}</td>
        <td class="text-right" data-order="${c.tx}">${inactive ? '—' : Fmt.number(c.tx)}</td>
        <td class="text-right" data-order="${c.ao}">${inactive ? '—' : Fmt.number(c.ao)}</td>
        <td class="text-right" data-order="${c.ec}">${inactive ? '—' : Fmt.number(c.ec)}</td>
        <td class="text-right" data-order="${c.productCount}" style="white-space:nowrap">
          ${inactive
            ? `<span style="color:var(--text-muted)">— / ${Fmt.number(c.totalProductCount)}</span>`
            : `<span style="${c.missingCount > 0 ? 'color:var(--accent-orange)' : ''}">${Fmt.number(c.productCount)}</span><span style="color:var(--text-muted);font-size:11px"> / ${Fmt.number(c.totalProductCount)}</span>`}
        </td>
        <td class="text-right" data-order="${c.missingCount}">
          ${c.missingCount > 0
            ? `<span style="color:var(--accent-red);font-weight:600">−${Fmt.number(c.missingCount)}</span>`
            : `<span style="color:var(--accent-green)">✓</span>`}
        </td>
        <td class="text-center">${_statusBadge(c.status)}</td>
        <td class="row-arrow-col">${ARROW_ICON}</td>
      `;
      tbody.appendChild(tr);
    });
    tableEl.appendChild(tbody);

    // ── Native delegation — bind sekali di wrapper luar DataTables scope ──────
    // Reliable di semua environment (VS Code Live Preview, Chrome, mobile)
    const wrap = document.querySelector('.customer-table-wrap');
    if (wrap) {
      wrap.removeEventListener('click', _handleClick);
      wrap.addEventListener('click', _handleClick);
    }

    // ── DataTables init ──────────────────────────────────────────────────────
    if (typeof $ !== 'undefined' && $.fn && $.fn.DataTable) {
      dtInstance = $(tableEl).DataTable({
        pageLength: 25,
        order:      [[0, 'asc']],
        language: {
          search:    'Cari:',
          lengthMenu:'Tampilkan _MENU_ baris',
          info:      'Menampilkan _START_–_END_ dari _TOTAL_ customer',
          paginate:  { previous: '‹', next: '›' },
          zeroRecords: 'Tidak ada data yang cocok',
          emptyTable:  'Tidak ada data tersedia',
        },
        columnDefs: [
          { orderable: false, targets: [10, 11] },
          { className: 'text-right', targets: [4, 5, 6, 7, 8, 9] },
          { className: 'text-center', targets: [0, 10] },
          { className: 'row-arrow-col', targets: [11] },
        ],
      });

      _renderStatusFilter();
    }
  }

  // ── Excel Exports ────────────────────────────────────────────────────────
  function exportExcel(customers, monthLabel) {
    if (typeof XLSX === 'undefined') { alert('SheetJS library not loaded.'); return; }
    const rows = customers.map(c => ({
      'Customer': c.name, 'Salesman': c.salesman, 'Area': c.area,
      'Total Sales': c.sales, 'TX': c.tx, 'AO': c.ao,
      'EC': c.ec, 'Produk': c.productCount, 'Status': c.status,
      'Terakhir Aktif': c.lastActiveYM || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customer Analytics');
    XLSX.writeFile(wb, `Customer_Analytics_${monthLabel}.xlsx`);
  }

  function exportSalesExcel(rawData, filters, monthLabel) {
    if (typeof XLSX === 'undefined') { alert('SheetJS library not loaded.'); return; }
    const curSales = rawData.sales.filter(s => {
      const d = new Date(s.date);
      return d.getFullYear() === filters.year && d.getMonth() + 1 === filters.month;
    });
    const rows = curSales.map(s => ({
      'Tanggal': s.date, 'Invoice': s.invoice, 'Salesman': s.salesman,
      'Customer': s.customer, 'Area': s.area, 'Produk': s.product,
      'Kategori': s.category, 'Qty': s.qty, 'Harga': s.price, 'Total': s.total,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sales Data');
    XLSX.writeFile(wb, `Sales_Data_${monthLabel}.xlsx`);
  }

  return { init, exportExcel, exportSalesExcel };
})();
