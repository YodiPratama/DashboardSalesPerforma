const Alerts = (() => {

  // ── Helpers ───────────────────────────────────────────────────────────────
  function _isPast(filters) {
    const now = new Date();
    const cy  = now.getFullYear(), cm = now.getMonth() + 1;
    return filters.year < cy || (filters.year === cy && filters.month < cm);
  }

  function _navigateTo(link) {
    if (link.section && link.section !== 'overview') {
      SectionManager.showSection(link.section);
    }
    if (link.scroll) {
      const delay = link.section && link.section !== 'overview' ? 350 : 0;
      setTimeout(() => {
        const el = document.getElementById(link.scroll);
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('insight-highlight');
        setTimeout(() => el.classList.remove('insight-highlight'), 2000);
      }, delay);
    }
  }

  // ── Smart Insights ────────────────────────────────────────────────────────
  function renderInsights(kpis, salesman, categories, filters) {
    const el = document.getElementById('insight-list');
    if (!el) return;

    const past = _isPast(filters);
    const word = past ? 'tidak' : 'belum'; // context-aware tense

    const insights = [];

    // 1. Sales growth
    if (kpis.growth !== null && kpis.growth > 0) {
      insights.push({
        type: 'success', icon: '📈',
        text: `Sales tumbuh <strong>${Fmt.percent(kpis.growth)}</strong> dibanding bulan lalu (${Fmt.currency(kpis.prevTotal)} → ${Fmt.currency(kpis.totalSales)}).`,
        cta: 'Lihat Tren Sales',
        link: { section: 'overview', scroll: 'chart-sales-trend' },
      });
    } else if (kpis.growth !== null && kpis.growth < 0) {
      insights.push({
        type: 'danger', icon: '📉',
        text: `Sales turun <strong>${Fmt.percent(Math.abs(kpis.growth))}</strong> dibanding bulan lalu. Evaluasi perlu segera dilakukan.`,
        cta: 'Lihat Tren Sales',
        link: { section: 'overview', scroll: 'chart-sales-trend' },
      });
    }

    // 2. Achievement
    if (kpis.achievement >= 100) {
      insights.push({
        type: 'success', icon: '🏆',
        text: `Target ${past ? 'tercapai' : 'sudah tercapai'} <strong>${Fmt.percent(kpis.achievement)}</strong> — excellent performance!`,
        cta: 'Lihat Detail Salesman',
        link: { section: 'salesman' },
      });
    } else {
      const remaining = kpis.totalTarget - kpis.totalSales;
      insights.push({
        type: kpis.achievement < 50 ? 'danger' : 'warning', icon: '🎯',
        text: `Achievement <strong>${Fmt.percent(kpis.achievement)}</strong>. ${past ? 'Target tidak tercapai, sisa' : 'Masih kurang'} <strong>${Fmt.currency(remaining)}</strong> untuk mencapai 100%.`,
        cta: 'Lihat Achievement Salesman',
        link: { section: 'salesman' },
      });
    }

    // 3. Lost outlet — navigasi ke Outlet Health → daftar lost
    if (kpis.lostOutlet > 0) {
      insights.push({
        type: 'warning', icon: '⚠️',
        text: `<strong>${Fmt.number(kpis.lostOutlet)}</strong> outlet ${word} melakukan order bulan ini (Lost Outlet). Perlu tindak lanjut segera.`,
        cta: 'Lihat Daftar Lost Outlet',
        link: { section: 'outlet', scroll: 'lost-list' },
      });
    }

    // 4. Reactivated — navigasi ke Outlet Health → daftar reactivated
    if (kpis.reactivated > 0) {
      insights.push({
        type: 'info', icon: '🔄',
        text: `<strong>${Fmt.number(kpis.reactivated)}</strong> outlet berhasil ${past ? 'direaktivasi' : 'kembali aktif'} bulan ini.`,
        cta: 'Lihat Outlet Reactivated',
        link: { section: 'outlet', scroll: 'reactivated-list' },
      });
    }

    // 5. Product missing — navigasi ke chart missing products di overview
    if (kpis.productsMissed > 0) {
      insights.push({
        type: 'warning', icon: '📦',
        text: `<strong>${Fmt.number(kpis.productsMissed)}</strong> produk ${word} dipesan bulan ini padahal aktif bulan lalu.`,
        cta: 'Lihat Produk Missing',
        link: { section: 'overview', scroll: 'chart-product-missing' },
      });
    }

    // 6. Top salesman
    if (salesman && salesman.length > 0) {
      const top = salesman.reduce((a, b) => a.achievement > b.achievement ? a : b);
      const bot = salesman.reduce((a, b) => a.achievement < b.achievement ? a : b);
      insights.push({
        type: 'info', icon: '⭐',
        text: `Salesman terbaik: <strong>${top.name}</strong> (<strong>${Fmt.percent(top.achievement)}</strong>). ${bot.achievement < 70 ? `Perhatian: <strong>${bot.name}</strong> baru ${Fmt.percent(bot.achievement)}.` : ''}`,
        cta: 'Lihat Ranking Salesman',
        link: { section: 'salesman' },
      });
    }

    // 7. Top category
    if (categories && categories.length > 0) {
      const topCat = categories[0];
      insights.push({
        type: 'info', icon: '📊',
        text: `Kategori terlaris: <strong>${topCat.name}</strong> kontribusi <strong>${Fmt.percent(topCat.pct)}</strong> dari total sales (${Fmt.currency(topCat.sales)}).`,
        cta: 'Lihat Category Analytics',
        link: { section: 'category' },
      });
    }

    // 8. Projection (only if month still running)
    if (!past && kpis.elapsed < kpis.daysInMonth) {
      const pct = kpis.totalTarget > 0 ? (kpis.projection / kpis.totalTarget) * 100 : null;
      insights.push({
        type: pct !== null && pct >= 100 ? 'success' : 'info', icon: '🔮',
        text: `Proyeksi akhir bulan: <strong>${Fmt.currency(kpis.projection)}</strong> berdasarkan tren ${kpis.elapsed} hari — ${pct !== null ? `prediksi achievement <strong>${Fmt.percent(pct)}</strong>` : 'data terus diperbarui'}.`,
        cta: 'Lihat Tren Harian',
        link: { section: 'overview', scroll: 'chart-sales-trend' },
      });
    }

    // 9. Consistency
    if (kpis.consistencyPct < 60) {
      insights.push({
        type: 'warning', icon: '📋',
        text: `Konsistensi outlet hanya <strong>${Fmt.percent(kpis.consistencyPct)}</strong> — banyak outlet tidak rutin order setiap bulan.`,
        cta: 'Lihat Outlet Health',
        link: { section: 'outlet' },
      });
    }

    el.innerHTML = insights.map((ins, idx) => `
      <div class="insight-item insight-${ins.type} ${ins.link ? 'insight-clickable' : ''}"
           data-insight-idx="${idx}"
           title="${ins.cta || ''}">
        <span class="insight-icon">${ins.icon}</span>
        <div class="insight-body">
          <span class="insight-text">${ins.text}</span>
          ${ins.cta ? `<span class="insight-cta">${ins.cta} <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></span>` : ''}
        </div>
      </div>
    `).join('');

    // Bind click events
    el.querySelectorAll('.insight-clickable').forEach(card => {
      card.addEventListener('click', () => {
        const idx = parseInt(card.getAttribute('data-insight-idx'), 10);
        const ins = insights[idx];
        if (ins && ins.link) _navigateTo(ins.link);
      });
    });
  }

  // ── Alerts ────────────────────────────────────────────────────────────────
  function renderAlerts(kpis, uncategorized) {
    const el = document.getElementById('alert-list');
    if (!el) return;

    const alerts = [];

    if (kpis.achievement < CONFIG.ALERT_DANGER_ACHIEVEMENT) {
      alerts.push({ level: 'danger', title: 'Achievement Kritis', desc: `Achievement ${Fmt.percent(kpis.achievement)} jauh di bawah target.`, link: { section: 'salesman' } });
    } else if (kpis.achievement < CONFIG.ALERT_WARNING_ACHIEVEMENT) {
      alerts.push({ level: 'warning', title: 'Achievement Rendah', desc: `Achievement ${Fmt.percent(kpis.achievement)} belum mencapai target.`, link: { section: 'salesman' } });
    }

    if (kpis.lostOutlet > 10) {
      alerts.push({ level: 'danger', title: 'Lost Outlet Tinggi', desc: `${kpis.lostOutlet} outlet tidak aktif bulan ini.`, link: { section: 'outlet', scroll: 'lost-list' } });
    } else if (kpis.lostOutlet > 5) {
      alerts.push({ level: 'warning', title: 'Lost Outlet Meningkat', desc: `${kpis.lostOutlet} outlet perlu follow-up.`, link: { section: 'outlet', scroll: 'lost-list' } });
    }

    if (kpis.productsMissed > 5) {
      alerts.push({ level: 'warning', title: 'Product Missing', desc: `${kpis.productsMissed} produk tidak ada order bulan ini.`, link: { section: 'overview', scroll: 'chart-product-missing' } });
    }

    if (uncategorized && uncategorized.length > 0) {
      alerts.push({ level: 'info', title: 'Produk Tidak Terkategori', desc: `${uncategorized.length} produk belum ada di category master.`, link: { section: 'overview', scroll: 'uncat-list' } });
    }

    if (kpis.growth < -10) {
      alerts.push({ level: 'danger', title: 'Penurunan Sales Signifikan', desc: `Sales turun ${Fmt.percent(Math.abs(kpis.growth))} dari bulan lalu.`, link: { section: 'trend' } });
    }

    const icons = { danger: '🔴', warning: '🟡', info: '🔵' };
    el.innerHTML = alerts.length === 0
      ? '<div class="no-alert">✅ Tidak ada alert aktif saat ini.</div>'
      : alerts.map(a => `
          <div class="alert-item alert-${a.level} ${a.link ? 'alert-clickable' : ''}"
               data-section="${a.link?.section || ''}"
               data-scroll="${a.link?.scroll || ''}">
            <span class="alert-dot">${icons[a.level]}</span>
            <div>
              <div class="alert-title">${a.title}</div>
              <div class="alert-desc">${a.desc}</div>
            </div>
            ${a.link ? `<svg class="alert-arrow" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>` : ''}
          </div>`).join('');

    el.querySelectorAll('.alert-clickable').forEach(card => {
      card.addEventListener('click', () => {
        const section = card.getAttribute('data-section');
        const scroll  = card.getAttribute('data-scroll');
        if (section || scroll) _navigateTo({ section: section || null, scroll: scroll || null });
      });
    });
  }

  // ── Uncategorized ─────────────────────────────────────────────────────────
  function renderUncategorized(uncategorized) {
    const el  = document.getElementById('uncat-list');
    const cnt = document.getElementById('uncat-count');
    if (!el) return;

    if (cnt) cnt.textContent = uncategorized.length;

    if (uncategorized.length === 0) {
      el.innerHTML = '<div class="no-alert">✅ Semua produk sudah terkategori.</div>';
      return;
    }

    el.innerHTML = uncategorized.map(u => `
      <div class="uncat-item">
        <div class="uncat-name">${u.product}</div>
        <div class="uncat-meta">
          <span class="badge badge-blue">${Fmt.number(u.tx)} TX</span>
          <span class="badge badge-orange">${Fmt.currency(u.sales)}</span>
        </div>
      </div>
    `).join('');
  }

  function setupCopyButton(uncategorized) {
    const btn = document.getElementById('copy-uncat-btn');
    if (!btn) return;
    btn.onclick = () => {
      const names = [...new Set(
        uncategorized.map(u => u.product.toUpperCase().replace(/\s+/g, ' ').trim())
      )].join('\n');
      navigator.clipboard.writeText(names).then(() => {
        const orig = btn.textContent;
        btn.textContent = '✓ Disalin!';
        btn.classList.add('btn-success');
        setTimeout(() => { btn.textContent = orig; btn.classList.remove('btn-success'); }, 2000);
      });
    };
  }

  return { renderInsights, renderAlerts, renderUncategorized, setupCopyButton };
})();
