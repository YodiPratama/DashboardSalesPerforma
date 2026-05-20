const Fmt = (() => {
  function _truncate(num, dec) {
    const f = Math.pow(10, dec);
    return Math.trunc(num * f) / f;
  }

  function _idLocale(num, dec) {
    const t = _truncate(Math.abs(num), dec);
    const parts = t.toFixed(dec).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const str = dec > 0 ? parts.join(',') : parts[0];
    return num < 0 ? '-' + str : str;
  }

  function currency(value) {
    if (value === null || value === undefined || isNaN(value)) return '-';
    const abs = Math.abs(value);
    if (abs >= 1e9) return _idLocale(value / 1e9, 3) + 'M';
    if (abs >= 1e6) return _idLocale(value / 1e6, 1) + 'JT';
    if (abs >= 1e3) return _idLocale(value / 1e3, 0) + 'RB';
    return _idLocale(value, 0);
  }

  function currencyFull(value) {
    if (value === null || value === undefined || isNaN(value)) return '-';
    return 'Rp ' + _idLocale(value, 0);
  }

  function percent(value, dec = 2) {
    if (value === null || value === undefined || isNaN(value)) return '-';
    return _idLocale(value, dec) + '%';
  }

  function number(value, dec = 0) {
    if (value === null || value === undefined || isNaN(value)) return '-';
    return _idLocale(value, dec);
  }

  function date(d) {
    if (!d) return '-';
    const dt = typeof d === 'string' ? new Date(d) : d;
    return dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function monthLabel(year, month) {
    return CONFIG.MONTHS_ID[month - 1] + ' ' + year;
  }

  function trendBadge(pct, invert = false) {
    if (pct === null || isNaN(pct)) return '<span class="trend-neutral">—</span>';
    const up = pct >= 0;
    const good = invert ? !up : up;
    const cls = good ? 'trend-up' : 'trend-down';
    const arrow = up ? '↑' : '↓';
    return `<span class="${cls}">${arrow} ${percent(Math.abs(pct))}</span>`;
  }

  // Achievement color helpers — thresholds: <50 red, 50-70 orange, 70-100 green, ≥100 blue
  function achClass(pct) {
    if (pct === null || pct === undefined) return '';
    if (pct >= 100) return 'text-blue';
    if (pct >= 70)  return 'text-success';
    if (pct >= 50)  return 'text-warning';
    return 'text-danger';
  }
  function achColor(pct) {
    if (pct === null || pct === undefined) return 'var(--text-muted)';
    if (pct >= 100) return 'var(--accent-blue)';
    if (pct >= 70)  return 'var(--accent-green)';
    if (pct >= 50)  return 'var(--accent-orange)';
    return 'var(--accent-red)';
  }
  function achHex(pct) {
    if (pct === null || pct === undefined) return '#64748b';
    if (pct >= 100) return '#4f9cf9';
    if (pct >= 70)  return '#4caf82';
    if (pct >= 50)  return '#f59e0b';
    return '#ef4444';
  }

  return { currency, currencyFull, percent, number, date, monthLabel, trendBadge, achClass, achColor, achHex };
})();
