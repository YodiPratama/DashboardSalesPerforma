# Dashboard Sales BIT — Progress Log

**Project:** DashboardSalesPerforma  
**Update terakhir:** 2026-07-11

---

## Fitur Selesai

- [x] Load data dari GitHub raw (ITEMSALE.TXT + TARGET.csv + KategoriItem.csv)
- [x] Parser MYOB tab-separated (ITEMSALE.TXT)
- [x] Parser TARGET.csv dan KategoriItem.csv (semicolon-separated)
- [x] Filter bulan, salesman, kategori
- [x] KPI overview: Total Sales, Achievement, Growth, Proyeksi, AO, Repeat, Lost, Reactivated, Consistency
- [x] Auto-switch filter bulan ke bulan terakhir yang ada di data
- [x] Section Salesman, Customer, Category, Outlet Health, Tren Bulanan
- [x] Upload manual MYOB via modal (session storage)
- [x] Export Excel per section
- [x] Dark mode default
- [x] Sidebar collapse + mobile responsive
- [x] Data badge "Data s/d DD MMM YYYY"
- [x] Alert uncategorized products + insights

---

## Riwayat Perubahan

| Tanggal    | Perubahan |
|------------|-----------|
| 2026-07-11 | **Fix data lambat update**: jsDelivr ternyata mengabaikan query string cache-busting (edge cache 12 jam + browser cache 7 hari, tidak bisa di-bypass). Sumber utama dikembalikan ke `raw.githubusercontent.com` (cache cuma 5 menit) dengan jsDelivr sebagai fallback otomatis kalau raw gagal/di-block jaringan. Lihat `fetchWithFallback()` di api.js. |
| 2026-07-09 | **Fix CDN**: Ganti URL data dari `raw.githubusercontent.com` ke `cdn.jsdelivr.net` — raw GitHub tidak stabil/terblokir, jsDelivr lebih reliable di Indonesia. |
| 2026-07-09 | **Bug fix**: Tambah error display visible di loading overlay jika fetch data gagal — sebelumnya error hanya di console. Tombol "Coba Lagi" otomatis reset dan re-fetch. |
| 2026-06-07 | Tambah `GITHUB_TARGET_URL` → TARGET.csv sekarang dari GitHub repo, bukan Google Sheets |
| 2026-06-07 | Tambah `GITHUB_KATEGORI_URL` → KategoriItem.csv dari GitHub repo |
| 2026-06-07 | Semua Sheets URLs dikosongkan, semua data sudah dari GitHub |

---

## Dalam Pengerjaan

_(kosong)_

---

## Backlog / Ide

- [ ] Auto-refresh data periodik (timer)
- [ ] Notifikasi jika data sudah terlalu lama tidak diupdate
