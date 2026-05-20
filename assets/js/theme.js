// ─── Global Theme System ───────────────────────────────────────────────────────
const Theme = (() => {
  const STORAGE_KEY = 'bit_dashboard_theme';
  const DEFAULT     = 'dark';

  // ── Public API ────────────────────────────────────────────────────────────────

  function saveTheme(mode) {
    localStorage.setItem(STORAGE_KEY, mode);
  }

  function applyTheme(mode) {
    document.documentElement.setAttribute('data-theme', mode);
    saveTheme(mode);
    _updateIcon(mode);

    // Overview page: update chart.js instances efficiently without full re-render
    if (window.Charts && typeof Charts.applyTheme === 'function') {
      Charts.applyTheme(mode);
    }

    // Broadcast to all pages so their local charts re-render on theme change
    document.dispatchEvent(new CustomEvent('themechange', { detail: { mode } }));
  }

  function toggleTheme() {
    applyTheme(current() === 'dark' ? 'light' : 'dark');
  }

  function initTheme() {
    const saved = localStorage.getItem(STORAGE_KEY) || DEFAULT;
    // Only set attribute + icon — inline <script> already set data-theme before
    // CSS loaded (no flash). Don't save or broadcast here: charts aren't ready yet.
    document.documentElement.setAttribute('data-theme', saved);
    _updateIcon(saved);
  }

  function current() {
    return document.documentElement.getAttribute('data-theme') || DEFAULT;
  }

  function getChartDefaults() {
    const isDark = current() === 'dark';
    return {
      textColor:     isDark ? '#94a3b8' : '#64748b',
      gridColor:     isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
      tooltipBg:     isDark ? '#1e2640' : '#ffffff',
      tooltipBorder: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      tooltipText:   isDark ? '#e2e8f0' : '#1e293b',
    };
  }

  // ── Private ───────────────────────────────────────────────────────────────────

  function _updateIcon(mode) {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.innerHTML = mode === 'dark'
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    btn.title = mode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
  }

  // ── Backward-compat aliases (all pages use these names) ───────────────────────
  const init   = initTheme;
  const toggle = toggleTheme;
  const apply  = applyTheme;

  return { initTheme, toggleTheme, saveTheme, applyTheme, init, toggle, apply, current, getChartDefaults };
})();
