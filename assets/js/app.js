// ─── Global App State ─────────────────────────────────────────────────────────
window.AppState = {
  rawData:      null,
  lastDataDate: null,
  filters:  { year: null, month: null, salesman: 'all', category: 'all' },
  computed: {},
  loading:  false,
};

const App = (() => {

  function _now() {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }

  // ─── Populate Filters ─────────────────────────────────────────────────────
  // Jika rawData tersedia: pakai bulan aktual dari data (semua bulan yang ada)
  // Fallback: 12 bulan ke belakang dari hari ini
  function _populateMonthFilter(rawData) {
    const sel = document.getElementById('filter-month');
    if (!sel) return;

    const currentVal = sel.value; // simpan pilihan saat ini sebelum rebuild
    sel.innerHTML = '';

    let months = []; // array of 'YYYY-MM' string, newest first

    if (rawData && rawData.sales && rawData.sales.length) {
      const set = new Set(rawData.sales.map(s => s.date.substring(0, 7)).filter(Boolean));
      months = [...set].sort().reverse();
    }

    // Fallback: 12 bulan ke belakang jika data kosong
    if (!months.length) {
      const { year, month } = _now();
      for (let i = 0; i < 12; i++) {
        let m = month - i, y = year;
        if (m <= 0) { m += 12; y -= 1; }
        months.push(`${y}-${String(m).padStart(2,'0')}`);
      }
    }

    months.forEach((ym, i) => {
      const [y, m] = ym.split('-').map(Number);
      const opt = document.createElement('option');
      opt.value = ym;
      opt.textContent = `${CONFIG.MONTHS_ID[m - 1]} ${y}`;
      // Pertahankan pilihan sebelumnya; default ke bulan terbaru (i===0)
      if (currentVal ? ym === currentVal : i === 0) opt.selected = true;
      sel.appendChild(opt);
    });

    // Sync AppState ke nilai yang benar-benar terpilih
    const selected = sel.value.split('-').map(Number);
    AppState.filters.year  = selected[0];
    AppState.filters.month = selected[1];
  }

  function _populateSalesmanFilter() {
    const sel = document.getElementById('filter-salesman');
    if (!sel) return;
    sel.innerHTML = '<option value="all">Semua Salesman</option>';
    CONFIG.SALESMAN_LIST.forEach(sm => {
      const opt = document.createElement('option');
      opt.value = sm.id;
      opt.textContent = sm.name;
      sel.appendChild(opt);
    });
  }

  function _populateCategoryFilter() {
    const sel = document.getElementById('filter-category');
    if (!sel) return;
    sel.innerHTML = '<option value="all">Semua Kategori</option>';
    Object.keys(CONFIG.CATEGORY_COLORS).filter(c => c !== 'Uncategorized').forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      sel.appendChild(opt);
    });
  }

  // ─── KPI Card Updates ─────────────────────────────────────────────────────
  function _updateKPI(id, value, trend, inverted = false) {
    const el = document.getElementById(id);
    if (!el) return;
    const valEl   = el.querySelector('.kpi-value');
    const trendEl = el.querySelector('.kpi-trend');
    if (valEl)   valEl.textContent = value;
    if (trendEl) trendEl.innerHTML = trend !== null ? Fmt.trendBadge(trend, inverted) : '';
  }

  function _renderKPIs(kpis) {
    _updateKPI('kpi-total-sales',      Fmt.currency(kpis.totalSales),    kpis.growth);
    _updateKPI('kpi-achievement',      Fmt.percent(kpis.achievement),    null);
    _updateKPI('kpi-growth',           Fmt.percent(kpis.growth),         kpis.growth);
    _updateKPI('kpi-projection',       Fmt.currency(kpis.projection),    null);
    _updateKPI('kpi-invoice',          Fmt.number(kpis.invoices),        null);
    _updateKPI('kpi-qty',              Fmt.number(kpis.totalQty),        null);
    _updateKPI('kpi-ao',               Fmt.number(kpis.activeOutlet),    null);
    _updateKPI('kpi-repeat',           Fmt.number(kpis.repeatOutlet),    null);
    _updateKPI('kpi-lost',             Fmt.number(kpis.lostOutlet),      null, true);
    _updateKPI('kpi-reactivated',      Fmt.number(kpis.reactivated),     null);
    _updateKPI('kpi-product-missing',  Fmt.number(kpis.productsMissed),  null, true);
    _updateKPI('kpi-consistency',      Fmt.percent(kpis.consistencyPct), null);

    // Achievement target value
    const achTargetEl = document.getElementById('kpi-ach-target');
    if (achTargetEl) achTargetEl.textContent = kpis.totalTarget ? Fmt.currency(kpis.totalTarget) : '';

    // Achievement card color
    const achEl = document.getElementById('kpi-achievement');
    if (achEl) {
      achEl.classList.remove('kpi-info','kpi-success','kpi-warning','kpi-danger');
      achEl.classList.add(
        kpis.achievement >= 100 ? 'kpi-info'    :
        kpis.achievement >= 70  ? 'kpi-success' :
        kpis.achievement >= 50  ? 'kpi-warning' : 'kpi-danger'
      );
    }
  }

  // ─── Salesman Table (overview) ────────────────────────────────────────────
  function _renderSalesmanTable(smData) {
    const tbody = document.getElementById('salesman-tbody');
    if (!tbody) return;
    const sorted = [...smData].sort((a, b) => b.achievement - a.achievement);
    tbody.innerHTML = sorted.map((sm, i) => {
      const achColor = Fmt.achClass(sm.achievement);
      return `
        <tr>
          <td><span class="rank-badge rank-${i+1}">${i+1}</span></td>
          <td><div class="sm-name">${sm.name}</div><div class="sm-area">${sm.area}</div></td>
          <td class="text-right font-semibold">${Fmt.currency(sm.totalSales)}</td>
          <td class="text-right text-muted">${Fmt.currency(sm.target)}</td>
          <td class="text-right ${achColor} font-semibold">${Fmt.percent(sm.achievement)}</td>
          <td class="text-right">${Fmt.trendBadge(sm.growth)}</td>
          <td class="text-right">${Fmt.number(sm.ao)}</td>
          <td class="text-right">${Fmt.number(sm.repeat)}</td>
          <td class="text-right">${Fmt.number(sm.lost)}</td>
          <td class="text-right" style="color:var(--accent-cyan)">${Fmt.number(sm.reactivated)}</td>
          <td class="text-right">${Fmt.number(sm.invoices)}</td>
        </tr>
      `;
    }).join('');
  }

  // ─── Loading State ────────────────────────────────────────────────────────
  function _setLoading(state, errorMsg) {
    AppState.loading = state;
    const overlay = document.getElementById('loading-overlay');
    if (!overlay) return;
    if (state) {
      overlay.style.display = 'flex';
      const txt = overlay.querySelector('.loading-text');
      if (txt) txt.textContent = 'Memuat data…';
      overlay.style.cursor = '';
    } else if (errorMsg) {
      overlay.style.display = 'flex';
      overlay.style.cursor = 'pointer';
      overlay.innerHTML = `
        <div style="text-align:center;max-width:400px;padding:0 20px">
          <div style="font-size:32px;margin-bottom:12px">⚠️</div>
          <div style="font-size:14px;font-weight:600;color:var(--accent-red,#ef4444);margin-bottom:8px">Gagal Memuat Data</div>
          <div style="font-size:12px;color:var(--text-secondary,#94a3b8);margin-bottom:16px;line-height:1.6">${errorMsg}</div>
          <button onclick="document.getElementById('loading-overlay').style.display='none';App.render()" style="padding:8px 20px;background:var(--accent-blue,#4f9cf9);color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600">Coba Lagi</button>
        </div>`;
    } else {
      overlay.style.display = 'none';
    }
  }

  // ─── Data Date Badge ─────────────────────────────────────────────────────
  function _updateDataBadge() {
    const badge = document.getElementById('data-date-badge');
    if (!badge) return;
    if (!AppState.lastDataDate) { badge.style.display = 'none'; return; }
    const parts = AppState.lastDataDate.split('-');
    const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    const d = parseInt(parts[2], 10);
    const m = parseInt(parts[1], 10) - 1;
    const y = parts[0];
    badge.textContent = '● Data s/d ' + d + ' ' + (months[m] || parts[1]) + ' ' + y;
    badge.style.display = 'inline-flex';
  }

  // ─── Main Render ──────────────────────────────────────────────────────────
  async function render() {
    if (AppState.loading) return;
    _setLoading(true);

    try {
      const isFirstLoad = !AppState.rawData;
      if (isFirstLoad) {
        AppState.rawData = await API.load(AppState.filters.year, AppState.filters.month);
      }

      // Setelah data pertama kali dimuat: rebuild filter bulan dari bulan aktual di data
      if (isFirstLoad && AppState.rawData?.sales?.length) {
        _populateMonthFilter(AppState.rawData);
      }

      // Compute latest transaction date for the data badge
      if (!AppState.lastDataDate && AppState.rawData?.sales?.length) {
        const sorted = AppState.rawData.sales.map(t => t.date).filter(Boolean).sort();
        if (sorted.length) { AppState.lastDataDate = sorted[sorted.length - 1]; }
      }
      _updateDataBadge();

      const raw     = AppState.rawData;
      const filters = AppState.filters;

      // Update month label
      const monthLabel = Fmt.monthLabel(filters.year, filters.month);
      const titleEl = document.getElementById('page-month-label');
      if (titleEl) titleEl.textContent = monthLabel;

      if (SectionManager.current() === 'overview') {
        const kpis       = Analytics.calcKPIs(raw, filters);
        const salesman   = Analytics.calcSalesmanMetrics(raw, filters);
        const categories = Analytics.calcCategoryMetrics(raw, filters);
        const trend      = Analytics.calcDailyTrend(raw, filters);
        const retention  = Analytics.calcOutletRetention(raw, filters);
        const missing    = kpis.productsMissedList;
        const uncatProds = Analytics.calcUncategorized(raw, filters);
        AppState.computed = { kpis, salesman, categories, trend, retention, missing, uncatProds };

        _renderKPIs(kpis);
        _renderSalesmanTable(salesman);
        Charts.updateAll({ kpis, trend, salesman, categories, retention, missing });
        Alerts.renderInsights(kpis, salesman, categories, filters);
        Alerts.renderAlerts(kpis, uncatProds);
        Alerts.renderUncategorized(uncatProds);
        Alerts.setupCopyButton(uncatProds);
      } else {
        SectionManager.renderCurrent();
      }

      _setLoading(false);

    } catch (err) {
      console.error('Render error:', err);
      AppState.rawData = null;
      const msg = err?.message
        ? `Error: ${err.message}<br><br>Pastikan koneksi internet aktif dan coba refresh halaman.`
        : 'Terjadi kesalahan saat memuat data. Coba refresh halaman.';
      _setLoading(false, msg);
    }
  }

  // ─── Upload MYOB Modal ────────────────────────────────────────────────────
  function _bindUploadModal() {
    const overlay   = document.getElementById('upload-modal-overlay');
    const openBtn   = document.getElementById('btn-load-myob');
    const closeBtn  = document.getElementById('upload-modal-close');
    const parseBtn  = document.getElementById('btn-parse-load');
    const clearBtn  = document.getElementById('btn-clear-data');
    const statusEl  = document.getElementById('upload-status');

    if (!overlay) return;

    function _openModal()  { overlay.style.display = 'flex'; }
    function _closeModal() { overlay.style.display = 'none'; }

    if (openBtn)  openBtn.addEventListener('click', _openModal);
    if (closeBtn) closeBtn.addEventListener('click', _closeModal);
    overlay.addEventListener('click', e => { if (e.target === overlay) _closeModal(); });

    // File input label update
    ['itemsale','kategori','target'].forEach(key => {
      const input  = document.getElementById(`file-${key}`);
      const label  = document.getElementById(`label-${key}-text`);
      if (!input || !label) return;
      input.addEventListener('change', () => {
        label.textContent = input.files[0] ? input.files[0].name : 'Pilih file…';
        label.style.color = input.files[0] ? 'var(--accent-blue)' : 'var(--text-muted)';
      });
    });

    // Parse & Load
    if (parseBtn) {
      parseBtn.addEventListener('click', async () => {
        const f1 = document.getElementById('file-itemsale')?.files[0];
        const f2 = document.getElementById('file-kategori')?.files[0];
        const f3 = document.getElementById('file-target')?.files[0];

        if (!f1 || !f2 || !f3) {
          statusEl.textContent = '⚠️ Pilih ketiga file terlebih dahulu.';
          statusEl.style.color = 'var(--accent-orange)';
          return;
        }

        parseBtn.disabled = true;
        statusEl.textContent = 'Memproses…';
        statusEl.style.color = 'var(--text-muted)';

        try {
          const dataset = await API.loadFromFiles(f1, f2, f3);
          const txCount = dataset.sales.length;
          statusEl.textContent = `✅ ${txCount.toLocaleString()} transaksi berhasil dimuat.`;
          statusEl.style.color = 'var(--accent-green)';

          AppState.rawData = null;
          setTimeout(() => { _closeModal(); render(); }, 800);
        } catch (err) {
          statusEl.textContent = `❌ Error: ${err.message}`;
          statusEl.style.color = 'var(--accent-red)';
        } finally {
          parseBtn.disabled = false;
        }
      });
    }

    // Clear data → back to mock
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        API.clearSession();
        AppState.rawData = null;
        AppState.lastDataDate = null;
        _updateDataBadge();
        statusEl.textContent = 'Data dihapus. Menggunakan data mock.';
        statusEl.style.color = 'var(--text-muted)';
        setTimeout(() => { _closeModal(); render(); }, 600);
      });
    }
  }

  // ─── KPI Card Click Shortcuts ─────────────────────────────────────────────
  function _bindKPICards() {
    function _goto(section, scrollId) {
      SectionManager.navigate(section);
      if (scrollId) {
        setTimeout(() => {
          const el = document.getElementById(scrollId);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 120);
      }
    }

    const shortcuts = {
      'kpi-ao':             () => _goto('outlet', 'active-list'),
      'kpi-repeat':         () => _goto('outlet', 'active-list'),
      'kpi-lost':           () => _goto('outlet', 'lost-list'),
      'kpi-reactivated':    () => _goto('outlet', 'reactivated-list'),
      'kpi-product-missing':() => {
        const el = document.querySelector('.pm-table-wrap');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      },
    };

    Object.entries(shortcuts).forEach(([id, fn]) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.add('kpi-clickable');
      el.addEventListener('click', fn);
    });
  }

  // ─── Filter Handlers ──────────────────────────────────────────────────────
  function _bindFilters() {
    const monthSel = document.getElementById('filter-month');
    if (monthSel) {
      monthSel.addEventListener('change', () => {
        const [y, m] = monthSel.value.split('-').map(Number);
        AppState.filters.year  = y;
        AppState.filters.month = m;
        render();
      });
    }

    const smSel = document.getElementById('filter-salesman');
    if (smSel) {
      smSel.addEventListener('change', () => {
        AppState.filters.salesman = smSel.value;
        render();
      });
    }

    const catSel = document.getElementById('filter-category');
    if (catSel) {
      catSel.addEventListener('change', () => {
        AppState.filters.category = catSel.value;
        render();
      });
    }

    const refreshBtn = document.getElementById('btn-refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        AppState.rawData = null;
        render();
      });
    }

    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) themeBtn.addEventListener('click', Theme.toggle);

    _bindUploadModal();

    const exportExcelBtn = document.getElementById('btn-export-excel');
    if (exportExcelBtn) {
      exportExcelBtn.addEventListener('click', () => SectionManager.exportCurrent());
    }

    const exportPdfBtn = document.getElementById('btn-export-pdf');
    if (exportPdfBtn) {
      exportPdfBtn.addEventListener('click', () => window.print());
    }
  }

  // ─── Sidebar Toggle ───────────────────────────────────────────────────────
  function _bindSidebar() {
    const toggle  = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    if (!toggle || !sidebar) return;

    // Overlay for mobile
    const overlay = document.createElement('div');
    overlay.id = 'sidebar-overlay';
    overlay.style.cssText = 'display:none;position:fixed;inset:0;z-index:199;background:rgba(0,0,0,0.5)';
    document.body.appendChild(overlay);

    function isMobile() { return window.innerWidth <= 768; }

    toggle.addEventListener('click', () => {
      if (isMobile()) {
        const open = sidebar.classList.toggle('mobile-open');
        overlay.style.display = open ? 'block' : 'none';
      } else {
        sidebar.classList.toggle('collapsed');
        document.querySelector('.main-content')?.classList.toggle('sidebar-collapsed');
      }
    });

    overlay.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
      overlay.style.display = 'none';
    });

    // Close sidebar on nav link click (mobile)
    sidebar.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        if (isMobile()) {
          sidebar.classList.remove('mobile-open');
          overlay.style.display = 'none';
        }
      });
    });
  }

  // ─── Init ─────────────────────────────────────────────────────────────────
  async function init() {
    Theme.init();

    // Selalu baca Google Sheets segar setiap reload — hapus data upload sebelumnya
    API.clearSession();

    // Compact chart defaults on mobile: smaller legend text + tick labels
    if (window.innerWidth <= 768) {
      Chart.defaults.font.size = 10;
      Chart.defaults.plugins.legend.labels.font    = { size: 9 };
      Chart.defaults.plugins.legend.labels.padding = 5;
      Chart.defaults.plugins.legend.labels.pointStyleWidth = 7;
    }

    const { year, month } = _now();
    AppState.filters.year  = year;
    AppState.filters.month = month;

    _populateMonthFilter();
    _populateSalesmanFilter();
    _populateCategoryFilter();
    _bindFilters();
    _bindSidebar();
    _bindKPICards();
    Modal.init();
    CategorySection.setupModal();
    SectionManager.init();

    document.addEventListener('themechange', () => { if (AppState.rawData) render(); });

    await render();
  }

  return { init, render };
})();

document.addEventListener('DOMContentLoaded', App.init);
