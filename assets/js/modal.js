// ─── Customer Drilldown Modal ──────────────────────────────────────────────────
const Modal = (() => {

  let _customer     = null;
  let _rawData      = null;
  let _filters      = null;
  let _activeMonths = null; // Set<'YYYY-MM'> | null = semua bulan

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function _prevMonth(y, m) {
    return m === 1 ? { year: y - 1, month: 12 } : { year: y, month: m - 1 };
  }

  function _availableMonths(rawData, customer) {
    const set = new Set();
    rawData.sales
      .filter(s => s.customer_id === customer.id)
      .forEach(s => set.add(s.date.substring(0, 7)));
    return [...set].sort().reverse(); // newest first
  }

  function _getCustomerSales(rawData, customer) {
    return rawData.sales
      .filter(s => {
        if (s.customer_id !== customer.id) return false;
        if (_activeMonths === null) return true;
        return _activeMonths.has(s.date.substring(0, 7));
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  function _getPrevSales(rawData, customer) {
    // Only meaningful when exactly one month is selected
    if (_activeMonths === null || _activeMonths.size !== 1) return [];
    const [ym]  = [..._activeMonths];
    const [y, m] = ym.split('-').map(Number);
    const prev   = _prevMonth(y, m);
    return rawData.sales.filter(s => {
      const d = new Date(s.date);
      return s.customer_id === customer.id &&
             d.getFullYear() === prev.year &&
             d.getMonth() + 1 === prev.month;
    });
  }

  // ── Month filter UI ───────────────────────────────────────────────────────────
  function _renderMonthFilter(months) {
    const el = document.getElementById('modal-month-filter');
    if (!el) return;

    const allActive = _activeMonths === null;

    el.innerHTML = `
      <span class="mf-label">Filter Bulan:</span>
      <button class="month-pill ${allActive ? 'active' : ''}" data-month="all">Semua</button>
      ${months.map(ym => {
        const [y, m] = ym.split('-').map(Number);
        const label  = `${CONFIG.MONTHS_ID[m - 1]} ${y}`;
        const isSel  = !allActive && _activeMonths.has(ym);
        return `<button class="month-pill ${isSel ? 'active' : ''}" data-month="${ym}">${label}</button>`;
      }).join('')}
    `;

    el.querySelectorAll('.month-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-month');
        if (val === 'all') {
          _activeMonths = null;
        } else {
          if (_activeMonths === null) {
            _activeMonths = new Set([val]);
          } else if (_activeMonths.has(val)) {
            _activeMonths.delete(val);
            if (_activeMonths.size === 0) _activeMonths = null;
          } else {
            _activeMonths.add(val);
          }
        }
        _refresh(months);
      });
    });
  }

  function _refresh(months) {
    const custSales = _getCustomerSales(_rawData, _customer);
    const prevSales = _getPrevSales(_rawData, _customer);
    _renderMonthFilter(months);
    renderCustomerTransactions(custSales);
    renderCustomerInsights(_customer, _rawData, _filters, custSales, prevSales);
    const scroll = document.getElementById('modal-tx-scroll');
    if (scroll) scroll.scrollTop = 0;
  }

  // ── Open / Close ─────────────────────────────────────────────────────────────
  function openCustomerModal(customer, rawData, filters, options = {}) {
    _customer = customer;
    _rawData  = rawData;
    _filters  = filters;

    // Lost/Dormant: langsung tampilkan semua bulan (tidak ada transaksi di bulan filter)
    if (options.showAllMonths) {
      _activeMonths = null;
    } else {
      const defaultYM = `${filters.year}-${String(filters.month).padStart(2, '0')}`;
      _activeMonths   = new Set([defaultYM]);
    }

    const modal = document.getElementById('customer-modal');
    if (!modal) return;

    const months    = _availableMonths(rawData, customer);
    const custSales = _getCustomerSales(rawData, customer);
    const prevSales = _getPrevSales(rawData, customer);

    _renderHeader(customer, custSales);
    _renderMonthFilter(months);
    renderCustomerTransactions(custSales);
    renderCustomerInsights(customer, rawData, filters, custSales, prevSales);

    const scroll = document.getElementById('modal-tx-scroll');
    if (scroll) scroll.scrollTop = 0;

    modal.classList.remove('active', 'closing');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => modal.classList.add('active'));
  }

  function closeCustomerModal() {
    const modal = document.getElementById('customer-modal');
    if (!modal) return;
    if (!modal.classList.contains('active')) return;
    console.log('[Modal] closeCustomerModal() called');
    modal.classList.add('closing');
    setTimeout(() => {
      modal.classList.remove('active', 'closing');
      document.body.style.overflow = '';
    }, 280);
  }

  // ── Header ───────────────────────────────────────────────────────────────────
  function _renderHeader(customer, custSales) {
    const lastOrder = custSales.length > 0 ? custSales[0].date : null;
    const _set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    _set('modal-customer-name',  customer.name);
    _set('modal-salesman-val',   customer.salesman || '—');
    _set('modal-area-val',       customer.area || '—');
    _set('modal-ao-val',         Fmt.number(customer.ao));
    _set('modal-ec-val',         Fmt.number(customer.ec));
    _set('modal-lastorder-val',  lastOrder ? Fmt.date(lastOrder) : '—');

    const statusEl = document.getElementById('modal-header-status');
    if (statusEl) statusEl.innerHTML = _statusBadgeLarge(customer.status);
  }

  // ── Transactions ─────────────────────────────────────────────────────────────
  function renderCustomerTransactions(custSales) {
    const tbody  = document.getElementById('modal-tx-body');
    const cntEl  = document.getElementById('modal-tx-count');
    if (!tbody) return;

    if (cntEl) cntEl.textContent = custSales.length;

    if (custSales.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="5" style="text-align:center;padding:40px 20px;color:var(--text-muted)">
          <div style="font-size:32px;margin-bottom:8px">📭</div>
          Tidak ada transaksi pada periode yang dipilih
        </td></tr>`;
      return;
    }

    tbody.innerHTML = custSales.map((s, i) => `
      <tr class="modal-tx-row" style="animation-delay:${Math.min(i * 25, 300)}ms">
        <td style="white-space:nowrap">${Fmt.date(s.date)}</td>
        <td class="font-mono text-xs" style="color:var(--text-muted);white-space:nowrap">${s.invoice}</td>
        <td>
          <div style="font-weight:600;font-size:12px;color:var(--text-primary)">${s.product}</div>
          <div style="font-size:10px;color:var(--text-muted);margin-top:1px">${s.category || ''}</div>
        </td>
        <td class="text-right">${Fmt.number(s.qty)}</td>
        <td class="text-right" style="font-weight:600;color:var(--accent-blue);white-space:nowrap">${Fmt.currency(s.total)}</td>
      </tr>
    `).join('');
  }

  // ── Insights Panel ───────────────────────────────────────────────────────────
  function renderCustomerInsights(customer, rawData, filters, custSales, prevSales) {
    const el = document.getElementById('modal-insights');
    if (!el) return;

    // Label periode berdasarkan filter aktif
    let periodeLabel;
    if (_activeMonths === null) {
      periodeLabel = 'Semua Bulan';
    } else if (_activeMonths.size === 1) {
      const [ym] = [..._activeMonths];
      const [y, m] = ym.split('-').map(Number);
      periodeLabel = `${CONFIG.MONTHS_ID[m - 1]} ${y}`;
    } else {
      periodeLabel = `${_activeMonths.size} Bulan Terpilih`;
    }

    // Missing products: ever ordered by this customer, not ordered in the CURRENT dashboard month.
    // Always fixed to dashboard filter month so Lost/Dormant customers show useful insight
    // regardless of which period is displayed in the modal.
    const curMonthYM   = `${filters.year}-${String(filters.month).padStart(2, '0')}`;
    const curMonthProds = new Set(
      rawData.sales.filter(s => s.customer_id === customer.id && s.date.startsWith(curMonthYM))
                   .map(s => s.product.toUpperCase().trim())
    );
    const allProds = new Set(
      rawData.sales.filter(s => s.customer_id === customer.id).map(s => s.product.toUpperCase().trim())
    );
    const missing = [...allProds].filter(p => !curMonthProds.has(p)).sort();

    // Avg monthly sales across all data
    const allSales      = rawData.sales.filter(s => s.customer_id === customer.id);
    const monthSet      = new Set(allSales.map(s => s.date.substring(0, 7)));
    const totalAllSales = allSales.reduce((sum, s) => sum + s.total, 0);
    const avgMonthly    = monthSet.size > 0 ? totalAllSales / monthSet.size : 0;

    // Period totals
    const totalThisMonth = custSales.reduce((s, r) => s + r.total, 0);
    const prevTotal      = prevSales.reduce((s, r) => s + r.total, 0);
    const invoiceCount   = new Set(custSales.map(s => s.invoice)).size;
    const diff           = totalThisMonth - prevTotal;
    const diffPct        = prevTotal > 0 ? (diff / prevTotal) * 100 : null;
    const showMoM        = _activeMonths !== null && _activeMonths.size === 1;

    // Category mix from current month sales
    const catMap = {};
    custSales.forEach(s => {
      const cat = s.category || 'Uncategorized';
      if (!catMap[cat]) catMap[cat] = 0;
      catMap[cat] += s.total;
    });
    const totalCatSales = Object.values(catMap).reduce((a, b) => a + b, 0);
    const catMix = Object.entries(catMap)
      .map(([cat, val]) => ({ cat, val, pct: totalCatSales > 0 ? (val / totalCatSales) * 100 : 0 }))
      .sort((a, b) => b.val - a.val);

    // First order date
    const firstOrder = allSales.length > 0
      ? allSales.reduce((min, s) => s.date < min ? s.date : min, allSales[0].date)
      : null;

    el.innerHTML = `
      <!-- Status Block -->
      <div class="insight-block">
        <div class="insight-block-label">Status Customer</div>
        ${_statusBadgeLarge(customer.status)}
      </div>

      <!-- Key Metrics -->
      <div class="insight-block">
        <div class="insight-block-label">Statistik ${periodeLabel}</div>
        <div class="insight-stats-grid">
          <div class="insight-stat">
            <div class="insight-stat-val" style="color:var(--accent-blue)">${Fmt.currency(totalThisMonth)}</div>
            <div class="insight-stat-lbl">Total Sales</div>
          </div>
          <div class="insight-stat">
            <div class="insight-stat-val">${invoiceCount}</div>
            <div class="insight-stat-lbl">Invoice</div>
          </div>
          <div class="insight-stat">
            <div class="insight-stat-val">${custSales.length}</div>
            <div class="insight-stat-lbl">Line Items</div>
          </div>
          <div class="insight-stat">
            <div class="insight-stat-val">${Fmt.currency(avgMonthly)}</div>
            <div class="insight-stat-lbl">Avg/Bulan</div>
          </div>
        </div>
      </div>

      <!-- MoM Comparison — hanya tampil saat 1 bulan dipilih -->
      ${showMoM && (prevSales.length > 0 || totalThisMonth > 0) ? `
      <div class="insight-block">
        <div class="insight-block-label">vs Bulan Lalu</div>
        ${diffPct !== null ? `
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <span style="font-size:22px;font-weight:800;color:${diff >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">
              ${diff >= 0 ? '↑' : '↓'} ${Fmt.percent(Math.abs(diffPct))}
            </span>
          </div>
          <div style="font-size:11px;color:var(--text-secondary)">
            ${diff >= 0 ? 'Naik' : 'Turun'} ${Fmt.currency(Math.abs(diff))} dari ${Fmt.currency(prevTotal)}
          </div>
        ` : `<div style="font-size:12px;color:var(--text-muted)">Belum ada data bulan lalu</div>`}
      </div>
      ` : ''}

      <!-- Missing Products -->
      <div class="insight-block">
        <div class="insight-block-label">
          Missing Products
          ${missing.length > 0 ? `<span class="count-badge" style="margin-left:6px">${missing.length}</span>` : ''}
        </div>
        <div style="font-size:10px;color:var(--text-muted);margin-bottom:6px">
          Pernah diorder, belum ada di ${CONFIG.MONTHS_ID[filters.month - 1]} ${filters.year}
        </div>
        ${missing.length === 0
          ? `<div style="font-size:12px;color:var(--accent-green);display:flex;align-items:center;gap:5px">
               <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
               Semua produk sudah diorder bulan ini
             </div>`
          : `<div class="missing-tags" style="display:flex;flex-wrap:wrap;gap:5px;max-height:160px;overflow-y:auto">
               ${missing.map(p => `<span class="badge badge-red" style="font-size:10px">${p}</span>`).join('')}
             </div>`
        }
      </div>

      <!-- Category Mix -->
      ${catMix.length > 0 ? `
      <div class="insight-block">
        <div class="insight-block-label">Category Mix</div>
        <div class="cat-mix-list">
          ${catMix.map(c => {
            const color = (window.CONFIG && CONFIG.CATEGORY_COLORS[c.cat]) || '#64748b';
            return `
              <div class="cat-mix-item">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
                  <span style="font-size:11px;font-weight:600;color:var(--text-primary)">${c.cat}</span>
                  <span style="font-size:11px;color:var(--text-muted)">${Fmt.percent(c.pct)}</span>
                </div>
                <div class="cat-mix-bar">
                  <div class="cat-mix-fill" style="width:${Math.min(c.pct, 100)}%;background:${color}"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
      ` : ''}

      <!-- Customer Since -->
      ${firstOrder ? `
      <div class="insight-block">
        <div class="insight-block-label">Informasi Customer</div>
        <div style="font-size:12px;color:var(--text-secondary)">
          First order: <strong style="color:var(--text-primary)">${Fmt.date(firstOrder)}</strong>
        </div>
        <div style="font-size:12px;color:var(--text-secondary);margin-top:4px">
          Total bulan aktif: <strong style="color:var(--text-primary)">${monthSet.size}</strong> bulan
        </div>
        <div style="font-size:12px;color:var(--text-secondary);margin-top:4px">
          Total lifetime sales: <strong style="color:var(--accent-blue)">${Fmt.currency(totalAllSales)}</strong>
        </div>
      </div>
      ` : ''}
    `;
  }

  // ── Status Badge Helpers ─────────────────────────────────────────────────────
  function _statusBadgeLarge(status) {
    const map = {
      'Active':      { color:'var(--accent-green)',  bg:'var(--accent-green-dim)',  icon:'✓', desc:'Aktif order bulan ini' },
      'Insight':     { color:'var(--accent-green)',  bg:'var(--accent-green-dim)',  icon:'⚡', desc:'Aktif — ada produk missing' },
      'Risk':        { color:'var(--accent-orange)', bg:'var(--accent-orange-dim)', icon:'⚠', desc:'Order sekali, risiko churn' },
      'Lost':        { color:'var(--accent-red)',    bg:'var(--accent-red-dim)',    icon:'✕', desc:'Tidak order bulan ini' },
      'Dormant':     { color:'var(--text-muted)',    bg:'var(--border-subtle)',     icon:'—', desc:'Tidak aktif >2 bulan' },
      'Reactivated': { color:'var(--accent-blue)',   bg:'var(--accent-blue-dim)',   icon:'↺', desc:'Kembali aktif bulan ini' },
    };
    const cfg = map[status] || { color:'var(--text-muted)', bg:'var(--border-subtle)', icon:'?', desc:status };
    return `
      <div style="padding:8px 12px;border-radius:8px;background:${cfg.bg};border-left:3px solid ${cfg.color}">
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:13px;color:${cfg.color}">${cfg.icon}</span>
          <span style="font-size:12px;font-weight:700;color:${cfg.color}">${status}</span>
        </div>
        <div style="font-size:10px;color:var(--text-secondary);margin-top:2px;padding-left:19px">${cfg.desc}</div>
      </div>
    `;
  }

  // ── Init (event bindings) ────────────────────────────────────────────────────
  function init() {
    document.getElementById('modal-overlay')?.addEventListener('click', closeCustomerModal);
    document.getElementById('modal-close')?.addEventListener('click', closeCustomerModal);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCustomerModal(); });
  }

  // ── Public API ───────────────────────────────────────────────────────────────
  // Legacy alias kept for backward compatibility
  const open  = (customer, rawData, filters) => openCustomerModal(customer, rawData, filters);
  const close = () => closeCustomerModal();

  return { init, open, close, openCustomerModal, closeCustomerModal, renderCustomerTransactions, renderCustomerInsights };
})();
