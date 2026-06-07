# Progress — Dashboard Sales Performa BIT

**Update terakhir:** 2 Juni 2026  
**Versi Saat Ini:** v1.0 (Production)

---

## Status Keseluruhan

```
[██████████████████████░░░░░░] ~75% — Core Features Complete
```

---

## Fitur Selesai ✅

### Core Infrastructure
- [x] Single Page Application tanpa framework
- [x] Multi-source data loading (sessionStorage → GitHub → Sheets → mock)
- [x] Parser MYOB ITEMSALE.TXT (60+ kolom)
- [x] Parser KategoriItem.csv (product → category mapping)
- [x] Parser TARGET.csv (target per salesman/kategori/bulan)
- [x] AppState global state management
- [x] Filter sistem (bulan, salesman, kategori)
- [x] Dark/light mode dengan localStorage persistence
- [x] Responsive layout (desktop + mobile)
- [x] GitHub Pages deployment

### Section: Overview
- [x] KPI cards (Total Sales, Growth MoM, Achievement %, Proyeksi)
- [x] Daily cumulative trend chart (line)
- [x] Salesman ranking chart (horizontal bar)
- [x] Category contribution donut chart
- [x] Smart insights & alert panel
- [x] Uncategorized products list

### Section: Salesman
- [x] Card detail per salesman
- [x] Sales vs Target bar chart
- [x] Achievement % gauge chart
- [x] Outlet metrics per salesman (AO, lost, repeat)
- [x] Category breakdown per salesman

### Section: Customer Analytics
- [x] Status distribution (active/repeat/lost/reactivated/new)
- [x] Top customer list dengan sorting
- [x] Customer detail modal (histori transaksi)
- [x] Customer table dengan DataTables (sort, search, paginate)

### Section: Category Analytics
- [x] Category donut chart dengan label
- [x] Product detail table per kategori
- [x] Uncategorized products alert
- [x] Kategori kontribusi %

### Section: Outlet Health
- [x] Daftar outlet aktif
- [x] Daftar outlet lost
- [x] Daftar outlet reactivated
- [x] Outlet retention stacked area chart (3 bulan)
- [x] AO per salesman distribution

### Section: Trend Analysis
- [x] Multi-month comparison line chart
- [x] Achievement % trend
- [x] Active Outlet trend
- [x] Monthly summary table
- [x] Category sales trend multi-bulan

### Data & Export
- [x] Upload manual MYOB file via modal
- [x] Export Excel (SheetJS)
- [x] sessionStorage caching untuk data upload

### Analytics Engine
- [x] Growth MoM (daily-normalized)
- [x] Achievement % vs target
- [x] End-of-month projection
- [x] Outlet status classification (active/repeat/lost/reactivated)
- [x] Product missing detection
- [x] Outlet 3-month consistency check
- [x] Customer status scoring

---

## Dalam Pengerjaan 🔄

*(Kosong saat ini — tidak ada sprint aktif)*

---

## Backlog / Roadmap 📋

### Prioritas Tinggi
- [ ] **Timestamp "last updated"** — tampilkan kapan data terakhir dimuat di header UI
- [ ] **Salesman filter di semua section** — saat ini beberapa section tidak merespons filter salesman
- [ ] **Export PDF** — tombol sudah ada di UI tapi belum berfungsi
- [ ] **Error state UI** — pesan error yang informatif saat fetch gagal (saat ini hanya fallback ke mock)
- [ ] **Loading skeleton** — indikator loading yang lebih baik saat fetch data

### Prioritas Sedang
- [ ] **Product missing detail** — detail produk apa saja yang hilang per outlet, bukan hanya jumlah
- [ ] **Outlet detail modal** — klik nama outlet → lihat histori transaksi lengkap
- [ ] **Target management UI** — edit target langsung dari dashboard (saat ini harus edit Sheets)
- [ ] **Multi-month filter** — filter lebih dari 1 bulan sekaligus untuk analisis range
- [ ] **Print-friendly view** — CSS print media query untuk cetak laporan

### Prioritas Rendah / Future
- [ ] **Google Apps Script integration** — aktifkan GAS_API_URL untuk query data dinamis
- [ ] **Salesman login** — view terbatas per salesman (perlu backend atau GAS auth)
- [ ] **Email report** — kirim summary KPI via email otomatis bulanan
- [ ] **Data validation UI** — highlight transaksi dengan data tidak lengkap/anomali
- [ ] **Year-over-Year comparison** — bandingkan bulan yang sama tahun lalu
- [ ] **Territory map** — visualisasi geografis distribusi outlet
- [ ] **Test suite** — unit test untuk `analytics.js` dan `api-parser.js`

---

## Riwayat Perubahan

### 2026-06-02
- Dibuat folder `docs/` sebagai repositori dokumentasi
- Dibuat [architecture.md](architecture.md) — dokumentasi struktur & arsitektur teknis
- Dibuat [SAD.md](SAD.md) — System Architecture Document lengkap
- Dibuat [ERD.md](ERD.md) — Entity Relationship Diagram & skema data
- Dibuat [PROGRESS.md](PROGRESS.md) — file ini

### v1.0 (Initial Release)
- Launch fitur lengkap 6 section (Overview, Salesman, Customer, Category, Outlet, Trend)
- Multi-source data loading dengan fallback chain
- Dark/light mode
- Export Excel
- Upload manual MYOB
- Deploy ke GitHub Pages

---

## Catatan Teknis

| Item | Status | Catatan |
|---|---|---|
| Browser support | Modern browsers (ES6+) | IE tidak didukung |
| Ukuran dataset max | ~50.000 baris | Di atas ini performa browser menurun |
| Salesman aktif | Dikonfigurasi di `config.js` | Update manual jika ada perubahan tim |
| Kategori produk | Dikelola di Google Sheets | Edit di Sheets → tersedia otomatis |
| Target bulanan | Dikelola di Google Sheets | Edit di Sheets → tersedia otomatis |
| Data transaksi | Commit ke GitHub | Butuh git push untuk update |
