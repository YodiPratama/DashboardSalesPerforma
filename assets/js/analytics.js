const Analytics = (() => {

  function _filterSales(sales, filters) {
    return sales.filter(s => {
      const d = new Date(s.date);
      if (filters.year  && d.getFullYear() !== filters.year)  return false;
      if (filters.month && d.getMonth() + 1 !== filters.month) return false;
      if (filters.salesman && filters.salesman !== 'all' && s.salesman_id !== filters.salesman) return false;
      if (filters.category && filters.category !== 'all' && s.category !== filters.category)   return false;
      return true;
    });
  }

  function _prevMonth(year, month) {
    if (month === 1) return { year: year - 1, month: 12 };
    return { year, month: month - 1 };
  }

  // Growth berbasis rata-rata harian — adil untuk bulan yang belum selesai
  function _dailyGrowth(curTotal, prevTotal, year, month, prev) {
    const now = new Date();
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
    const daysInCur  = isCurrentMonth ? Math.max(1, now.getDate()) : new Date(year, month, 0).getDate();
    const daysInPrev = new Date(prev.year, prev.month, 0).getDate();
    const curAvg  = curTotal  / daysInCur;
    const prevAvg = prevTotal / daysInPrev;
    return prevAvg > 0 ? ((curAvg - prevAvg) / prevAvg) * 100 : 0;
  }

  function _uniqueOutlets(sales) {
    return new Set(sales.map(s => s.customer_id));
  }

  // ─── Main KPI Calculations ────────────────────────────────────────────────
  function calcKPIs(rawData, filters) {
    const { sales, targets } = rawData;
    const { year, month } = filters;

    const curSales = _filterSales(sales, filters);
    const prev     = _prevMonth(year, month);
    const prevSales = _filterSales(sales, {
      year: prev.year, month: prev.month,
      salesman: filters.salesman, category: filters.category,
    });

    // Sales totals
    const totalSales = curSales.reduce((s, r) => s + r.total, 0);
    const prevTotal  = prevSales.reduce((s, r) => s + r.total, 0);
    const growth     = _dailyGrowth(totalSales, prevTotal, year, month, prev);

    // Target — filter by category when active; targets without category field match always
    const smTargets = targets.filter(t =>
      t.year === year && t.month === month &&
      (filters.salesman === 'all' || t.salesman_id === filters.salesman) &&
      (filters.category === 'all' || !t.category || t.category === filters.category)
    );
    const totalTarget = smTargets.reduce((s, t) => s + t.target, 0);
    const achievement = totalTarget > 0 ? (totalSales / totalTarget) * 100 : 0;

    // Projection
    const now = new Date();
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
    const daysInMonth = new Date(year, month, 0).getDate();
    const elapsed = isCurrentMonth ? now.getDate() : daysInMonth;
    const projection = elapsed > 0 ? (totalSales / elapsed) * daysInMonth : totalSales;

    // Invoice & Qty
    const invoices = new Set(curSales.map(s => s.invoice)).size;
    const totalQty = curSales.reduce((s, r) => s + r.qty, 0);

    // Outlet metrics
    const curOutlets  = _uniqueOutlets(curSales);
    const prevOutlets = _uniqueOutlets(prevSales);

    const activeOutlet = curOutlets.size;

    const repeatOutlet = [...curOutlets].filter(id => prevOutlets.has(id)).length;

    const lostOutlet = [...prevOutlets].filter(id => !curOutlets.has(id)).length;

    // Reactivated: active now, NOT in prev month, but was active in any earlier month
    const curYM  = `${year}-${String(month).padStart(2, '0')}`;
    const prevYM = `${prev.year}-${String(prev.month).padStart(2, '0')}`;
    const everOutlets = _uniqueOutlets(sales.filter(s => {
      const ym = s.date.substring(0, 7);
      return ym < curYM && ym !== prevYM &&
        (filters.salesman === 'all' || s.salesman_id === filters.salesman) &&
        (filters.category === 'all' || s.category === filters.category);
    }));
    const reactivated = [...curOutlets].filter(id => !prevOutlets.has(id) && everOutlets.has(id)).length;

    // Consistency: outlets active in all 3 months (M-2, M-1, current)
    const older = _prevMonth(prev.year, prev.month);
    const olderOutlets = _uniqueOutlets(_filterSales(sales, {
      year: older.year, month: older.month,
      salesman: filters.salesman, category: filters.category,
    }));
    const consistency3 = [...curOutlets].filter(id => prevOutlets.has(id) && olderOutlets.has(id)).length;
    const consistencyPct = curOutlets.size > 0 ? (consistency3 / curOutlets.size) * 100 : 0;

    // Product missing (outlets that didn't order in current month for their usual categories)
    const productsMissed = calcMissingProducts(sales, curSales, prevSales);

    return {
      totalSales, prevTotal, growth,
      totalTarget, achievement,
      projection, elapsed, daysInMonth,
      invoices, totalQty,
      activeOutlet, repeatOutlet, lostOutlet, reactivated,
      consistencyPct, productsMissed: productsMissed.length,
      productsMissedList: productsMissed,
    };
  }

  // ─── Salesman Performance ─────────────────────────────────────────────────
  function calcSalesmanMetrics(rawData, filters) {
    const { sales, targets } = rawData;
    const { year, month } = filters;
    const prev = _prevMonth(year, month);

    return CONFIG.SALESMAN_LIST.map(sm => {
      const smFilters = { ...filters, salesman: sm.id };
      const curSales  = _filterSales(sales, smFilters);
      const prevSales = _filterSales(sales, { ...smFilters, year: prev.year, month: prev.month });

      const totalSales = curSales.reduce((s, r) => s + r.total, 0);
      const prevTotal  = prevSales.reduce((s, r) => s + r.total, 0);
      const growth     = _dailyGrowth(totalSales, prevTotal, year, month, prev);

      const smTargetRows = targets.filter(t =>
        t.salesman_id === sm.id && t.year === year && t.month === month &&
        (filters.category === 'all' || !t.category || t.category === filters.category)
      );
      const targetVal = smTargetRows.reduce((s, t) => s + t.target, 0);
      const achievement = targetVal > 0 ? (totalSales / targetVal) * 100 : 0;

      const curYM  = `${year}-${String(month).padStart(2, '0')}`;
      const prevYM = `${prev.year}-${String(prev.month).padStart(2, '0')}`;

      const curOutlets  = _uniqueOutlets(curSales);
      const prevOutlets = _uniqueOutlets(prevSales);
      const everOutlets = _uniqueOutlets(sales.filter(s => {
        const ym = s.date.substring(0, 7);
        return ym < curYM && ym !== prevYM && s.salesman_id === sm.id &&
          (filters.category === 'all' || s.category === filters.category);
      }));
      const ao          = curOutlets.size;
      const repeat      = [...curOutlets].filter(id => prevOutlets.has(id)).length;
      const lost        = [...prevOutlets].filter(id => !curOutlets.has(id)).length;
      const reactivated = [...curOutlets].filter(id => !prevOutlets.has(id) && everOutlets.has(id)).length;
      const invoices    = new Set(curSales.map(s => s.invoice)).size;

      return {
        ...sm,
        totalSales, prevTotal, growth,
        target: targetVal, achievement,
        ao, repeat, lost, reactivated, invoices,
      };
    });
  }

  // ─── Category Analytics ───────────────────────────────────────────────────
  function calcCategoryMetrics(rawData, filters) {
    const curSales = _filterSales(rawData.sales, filters);
    const catMap   = {};

    curSales.forEach(s => {
      const cat = s.category || 'Uncategorized';
      if (!catMap[cat]) catMap[cat] = { sales: 0, qty: 0, tx: 0, products: new Set() };
      catMap[cat].sales += s.total;
      catMap[cat].qty   += s.qty;
      catMap[cat].tx    += 1;
      catMap[cat].products.add(s.product);
    });

    const totalSales = Object.values(catMap).reduce((s, c) => s + c.sales, 0);

    return Object.entries(catMap)
      .map(([name, c]) => ({
        name,
        sales:   c.sales,
        qty:     c.qty,
        tx:      c.tx,
        products: c.products.size,
        pct:     totalSales > 0 ? (c.sales / totalSales) * 100 : 0,
        color:   CONFIG.CATEGORY_COLORS[name] || '#64748b',
      }))
      .sort((a, b) => b.sales - a.sales);
  }

  // ─── Daily Sales Trend ────────────────────────────────────────────────────
  function calcDailyTrend(rawData, filters) {
    const curSales  = _filterSales(rawData.sales, filters);
    const prev      = _prevMonth(filters.year, filters.month);
    const prevSales = _filterSales(rawData.sales, {
      ...filters, year: prev.year, month: prev.month,
    });

    const daysInMonth = new Date(filters.year, filters.month, 0).getDate();
    const curDaily  = Array(daysInMonth).fill(0);
    const prevDaily = Array(daysInMonth).fill(0);

    curSales.forEach(s => {
      const d = new Date(s.date).getDate() - 1;
      if (d >= 0 && d < daysInMonth) curDaily[d] += s.total;
    });
    prevSales.forEach(s => {
      const d = new Date(s.date).getDate() - 1;
      if (d >= 0 && d < daysInMonth) prevDaily[d] += s.total;
    });

    // Cumulative
    const curCumulative  = curDaily.reduce((acc, v, i) => { acc.push((acc[i-1]||0)+v); return acc; }, []);
    const prevCumulative = prevDaily.reduce((acc, v, i) => { acc.push((acc[i-1]||0)+v); return acc; }, []);

    const labels = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return { labels, curDaily, prevDaily, curCumulative, prevCumulative };
  }

  // ─── Customer Table Data ──────────────────────────────────────────────────
  // Includes ALL customers (Active, Lost, Dormant) not just current month buyers.
  function calcCustomerTable(rawData, filters) {
    const { sales } = rawData;
    const { year, month } = filters;
    const prev = _prevMonth(year, month);

    const curYM  = `${year}-${String(month).padStart(2, '0')}`;
    const prevYM = `${prev.year}-${String(prev.month).padStart(2, '0')}`;

    // All sales respecting salesman/category filters, across ALL months
    const allSales = sales.filter(s =>
      (filters.salesman === 'all' || s.salesman_id === filters.salesman) &&
      (filters.category === 'all' || s.category === filters.category)
    );

    const curOut          = new Set(allSales.filter(s => s.date.startsWith(curYM)).map(s => s.customer_id));
    const prevOut         = new Set(allSales.filter(s => s.date.startsWith(prevYM)).map(s => s.customer_id));
    const everBeforePrev  = new Set(allSales.filter(s => s.date.substring(0, 7) < prevYM).map(s => s.customer_id));

    const custMap = {};
    allSales.forEach(s => {
      const ym = s.date.substring(0, 7);
      if (!custMap[s.customer_id]) {
        custMap[s.customer_id] = {
          id: s.customer_id, name: s.customer,
          salesman: s.salesman, area: s.area,
          sales: 0, tx: 0, qty: 0,
          invoices: new Set(), products: new Set(),
          allProducts: new Set(), // unique products across ALL months
          lastActiveYM: ym,
        };
      }
      const c = custMap[s.customer_id];
      c.allProducts.add(s.product.toUpperCase().trim());
      if (ym === curYM) {
        c.sales += s.total;
        c.tx    += 1;
        c.qty   += s.qty;
        c.invoices.add(s.invoice);
        c.products.add(s.product.toUpperCase().trim());
      }
      if (ym > c.lastActiveYM) c.lastActiveYM = ym;
    });

    return Object.values(custMap).map(c => {
      const inCur  = curOut.has(c.id);
      const inPrev = prevOut.has(c.id);
      const ao = c.invoices.size;
      const productCount      = c.products.size;
      const totalProductCount = c.allProducts.size;
      const missingCount      = totalProductCount - productCount;

      let status;
      if (inCur) {
        if (!inPrev && everBeforePrev.has(c.id)) status = 'Reactivated';
        else if (ao === 1)        status = 'Risk';
        else if (missingCount > 0) status = 'Insight';
        else                       status = 'Active';
      } else if (inPrev) {
        status = 'Lost';
      } else {
        status = 'Dormant';
      }

      return {
        id: c.id, name: c.name, salesman: c.salesman, area: c.area,
        sales: c.sales, tx: c.tx, qty: c.qty,
        ao, ec: ao,
        invoiceCount: c.invoices.size,
        productCount,
        totalProductCount,
        missingCount,
        status,
        lastActiveYM: c.lastActiveYM,
      };
    }).sort((a, b) => b.sales - a.sales);
  }

  // ─── Missing Products ─────────────────────────────────────────────────────
  function calcMissingProducts(allSales, curSales, prevSales) {
    const curProds  = new Set(curSales.map(s => s.product.toUpperCase().trim()));
    const prevProds = new Set(prevSales.map(s => s.product.toUpperCase().trim()));
    return [...prevProds].filter(p => !curProds.has(p)).map(p => ({
      product: p,
      prevTx: prevSales.filter(s => s.product.toUpperCase().trim() === p).length,
      prevSales: prevSales.filter(s => s.product.toUpperCase().trim() === p).reduce((s, r) => s + r.total, 0),
    }));
  }

  // ─── Uncategorized Products ───────────────────────────────────────────────
  function calcUncategorized(rawData, filters) {
    const { categories } = rawData;
    const curSales = _filterSales(rawData.sales, filters);
    const catSet   = new Set(categories.map(c => c.product.toUpperCase().trim()));
    const uncatMap = {};

    curSales.forEach(s => {
      const prod = s.product.toUpperCase().trim();
      if (!catSet.has(prod)) {
        if (!uncatMap[prod]) uncatMap[prod] = { tx: 0, sales: 0 };
        uncatMap[prod].tx    += 1;
        uncatMap[prod].sales += s.total;
      }
    });

    return Object.entries(uncatMap)
      .map(([product, d]) => ({ product, ...d }))
      .sort((a, b) => b.sales - a.sales);
  }

  // ─── Outlet Retention Data ────────────────────────────────────────────────
  // 3 bars shown: (month-2), (month-1), (month)
  // Reference months (not shown): (month-4) and (month-3) supply the
  // "previous month" context for bar 1 so repeat/lost/reactivated are never zero.
  function calcOutletRetention(rawData, filters) {
    const { sales } = rawData;
    const { year, month } = filters;

    const m1 = _prevMonth(year, month);                   // month-1 (bar 2)
    const m2 = _prevMonth(m1.year, m1.month);             // month-2 (bar 1)
    const ref1 = _prevMonth(m2.year, m2.month);           // month-3 (reference for bar 1 repeat/lost)
    const ref2 = _prevMonth(ref1.year, ref1.month);       // month-4 (reference for bar 1 reactivated)

    const getSet = (y, m) => _uniqueOutlets(
      _filterSales(sales, { ...filters, year: y, month: m })
    );

    // Load all 5 months (2 reference + 3 visible)
    const s_ref2 = getSet(ref2.year, ref2.month);   // month-4
    const s_ref1 = getSet(ref1.year, ref1.month);   // month-3 (reference for bar 1)
    const s_m2   = getSet(m2.year, m2.month);        // bar 1
    const s_m1   = getSet(m1.year, m1.month);        // bar 2
    const s_cur  = getSet(year, month);              // bar 3 (selected month)

    const _build = (cur, prev, older, label) => ({
      label,
      active:      cur.size,
      repeat:      [...cur].filter(id => prev.has(id)).length,
      lost:        [...prev].filter(id => !cur.has(id)).length,
      reactivated: [...cur].filter(id => !prev.has(id) && older.has(id)).length,
    });

    return [
      _build(s_m2,  s_ref1, s_ref2, CONFIG.MONTHS_ID[m2.month  - 1]),
      _build(s_m1,  s_m2,   s_ref1, CONFIG.MONTHS_ID[m1.month  - 1]),
      _build(s_cur, s_m1,   s_m2,   CONFIG.MONTHS_ID[month     - 1]),
    ];
  }

  // ─── Salesman × Category Achievement Breakdown ───────────────────────────
  function calcSalesmanCategoryBreakdown(rawData, filters) {
    const { sales, targets } = rawData;
    const { year, month }   = filters;
    const CATS = Object.keys(CONFIG.CATEGORY_COLORS).filter(c => c !== 'Uncategorized');

    return CONFIG.SALESMAN_LIST.map(sm => {
      const rows = CATS.map(cat => {
        const catSales = _filterSales(sales, { ...filters, salesman: sm.id, category: cat });
        const actual   = catSales.reduce((s, r) => s + r.total, 0);
        const tRow     = targets.find(t =>
          t.salesman_id === sm.id && t.year === year && t.month === month && t.category === cat
        );
        const target      = tRow ? tRow.target : 0;
        const achievement = target > 0 ? (actual / target) * 100 : null;
        return { category: cat, target, actual, achievement };
      });

      const totalActual      = rows.reduce((s, r) => s + r.actual, 0);
      const totalTarget      = rows.reduce((s, r) => s + r.target, 0);
      const totalAchievement = totalTarget > 0 ? (totalActual / totalTarget) * 100 : null;

      return { salesman_id: sm.id, salesman: sm.name, rows, totalActual, totalTarget, totalAchievement };
    }).filter(s => s.totalActual > 0 || s.totalTarget > 0);
  }

  // ─── Monthly Trend ────────────────────────────────────────────────────────
  function calcMonthlyTrend(rawData, selectedMonths, salesmanIds = null) {
    // salesmanIds: Set<id> | null = semua salesman
    const allSales   = rawData.sales;
    const allTargets = rawData.targets;
    const CATS = Object.keys(CONFIG.CATEGORY_COLORS).filter(c => c !== 'Uncategorized');

    const hasSmFilter = salesmanIds && salesmanIds.size > 0 && salesmanIds.size < CONFIG.SALESMAN_LIST.length;
    const sales   = hasSmFilter ? allSales.filter(s => salesmanIds.has(s.salesman_id))   : allSales;
    const targets = hasSmFilter ? allTargets.filter(t => salesmanIds.has(t.salesman_id)) : allTargets;

    const activeSm = hasSmFilter
      ? CONFIG.SALESMAN_LIST.filter(sm => salesmanIds.has(sm.id))
      : CONFIG.SALESMAN_LIST;

    return selectedMonths.map(ym => {
      const [year, month] = ym.split('-').map(Number);
      const prev          = _prevMonth(year, month);
      const prevYM        = `${prev.year}-${String(prev.month).padStart(2, '0')}`;

      const mSales    = sales.filter(s => s.date.startsWith(ym));
      const prevSales = sales.filter(s => s.date.startsWith(prevYM));

      const totalSales  = mSales.reduce((s, r) => s + r.total, 0);
      const prevTotal   = prevSales.reduce((s, r) => s + r.total, 0);
      const growth      = prevTotal > 0 ? ((totalSales - prevTotal) / prevTotal) * 100 : null;

      const mTargets    = targets.filter(t => t.year === year && t.month === month);
      const totalTarget = mTargets.reduce((s, t) => s + t.target, 0);
      const achievement = totalTarget > 0 ? (totalSales / totalTarget) * 100 : null;

      const curOut  = new Set(mSales.map(s => s.customer_id));
      const prevOut = new Set(prevSales.map(s => s.customer_id));
      const everOut = new Set(
        sales.filter(s => s.date.substring(0, 7) < ym && !s.date.startsWith(prevYM)).map(s => s.customer_id)
      );
      const ao          = curOut.size;
      const repeat      = [...curOut].filter(id => prevOut.has(id)).length;
      const lost        = [...prevOut].filter(id => !curOut.has(id)).length;
      const reactivated = [...curOut].filter(id => !prevOut.has(id) && everOut.has(id)).length;
      const invoices    = new Set(mSales.map(s => s.invoice)).size;

      const categories = {};
      CATS.forEach(cat => {
        categories[cat] = mSales.filter(s => s.category === cat).reduce((s, r) => s + r.total, 0);
      });

      const smData = activeSm.map(sm => {
        const smS = mSales.filter(s => s.salesman_id === sm.id).reduce((s, r) => s + r.total, 0);
        const smT = mTargets.filter(t => t.salesman_id === sm.id).reduce((s, t) => s + t.target, 0);
        return { id: sm.id, name: sm.name.split(' ').slice(0, 2).join(' '), achievement: smT > 0 ? (smS / smT) * 100 : null, sales: smS };
      });

      return {
        ym, year, month,
        label:      `${CONFIG.MONTHS_ID[month - 1]} ${year}`,
        labelShort: `${CONFIG.MONTHS_ID[month - 1].substring(0, 3)} '${String(year).slice(-2)}`,
        sales: totalSales, target: totalTarget,
        achievement, growth, ao, repeat, lost, reactivated, invoices,
        categories, salesman: smData,
      };
    });
  }

  return {
    calcKPIs,
    calcSalesmanMetrics,
    calcCategoryMetrics,
    calcDailyTrend,
    calcCustomerTable,
    calcUncategorized,
    calcOutletRetention,
    calcMissingProducts,
    calcSalesmanCategoryBreakdown,
    calcMonthlyTrend,
  };
})();
