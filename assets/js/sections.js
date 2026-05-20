const SectionManager = (() => {
  const SECTIONS = {
    overview: { title: 'Overview',           showSalesman: true,  showCategory: true,  showSearch: false },
    salesman: { title: 'Salesman',           showSalesman: false, showCategory: false, showSearch: false },
    customer: { title: 'Customer Analytics', showSalesman: true,  showCategory: false, showSearch: false },
    category: { title: 'Category Analytics', showSalesman: true,  showCategory: false, showSearch: false },
    outlet:   { title: 'Outlet Health',      showSalesman: true,  showCategory: false, showSearch: true  },
    trend:    { title: 'Tren Bulanan',        showSalesman: false, showCategory: false, showSearch: false },
  };

  let _current = 'overview';

  function showSection(name, skipRender) {
    if (!SECTIONS[name]) return;
    _current = name;
    const cfg = SECTIONS[name];

    // Section visibility
    document.querySelectorAll('.dash-section').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(`section-${name}`);
    if (target) target.classList.add('active');

    // Nav active state
    document.querySelectorAll('.nav-link[data-section]').forEach(el => {
      el.classList.toggle('active', el.dataset.section === name);
    });

    // Page title
    const titleEl = document.querySelector('.page-title');
    if (titleEl) titleEl.textContent = cfg.title;

    // Filter visibility
    const smFilter  = document.getElementById('filter-salesman');
    const catFilter = document.getElementById('filter-category');
    const search    = document.getElementById('outlet-search');
    if (smFilter)  smFilter.style.display  = cfg.showSalesman ? '' : 'none';
    if (catFilter) catFilter.style.display = cfg.showCategory ? '' : 'none';
    if (search)    search.style.display    = cfg.showSearch   ? '' : 'none';

    // URL hash
    history.replaceState(null, '', `#${name}`);

    if (!skipRender) renderCurrent();
  }

  function renderCurrent() {
    if (!AppState.rawData) return;
    const raw     = AppState.rawData;
    const filters = AppState.filters;
    switch (_current) {
      case 'salesman': SalesmanSection.render(raw, filters); break;
      case 'customer': CustomerSection.render(raw, filters); break;
      case 'category': CategorySection.render(raw, filters); break;
      case 'outlet':   OutletSection.render(raw, filters);   break;
      case 'trend':    TrendSection.render(raw, filters);    break;
      // 'overview' is handled directly by App.render()
    }
  }

  function exportCurrent() {
    if (!AppState.rawData) return;
    const raw     = AppState.rawData;
    const filters = AppState.filters;
    const label   = `${filters.year}_${String(filters.month).padStart(2, '0')}`;
    switch (_current) {
      case 'overview': Table.exportSalesExcel(raw, filters, label); break;
      case 'salesman': SalesmanSection.exportExcel(raw, filters);   break;
      case 'customer': CustomerSection.exportExcel(raw, filters);   break;
      case 'category': CategorySection.exportExcel(raw, filters);   break;
      case 'outlet':   OutletSection.exportExcel(raw, filters);     break;
      case 'trend':    TrendSection.exportExcel(raw);               break;
    }
  }

  function init() {
    // Bind nav links with data-section attribute
    document.querySelectorAll('.nav-link[data-section]').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        showSection(link.dataset.section);
      });
    });

    // Outlet search
    const search = document.getElementById('outlet-search');
    if (search) {
      search.addEventListener('input', e => OutletSection.filterOutletLists(e.target.value));
    }

    // Hash routing on initial load
    const hash = window.location.hash.replace('#', '');
    showSection(SECTIONS[hash] ? hash : 'overview', true);
  }

  return { init, showSection, renderCurrent, exportCurrent, current: () => _current };
})();
