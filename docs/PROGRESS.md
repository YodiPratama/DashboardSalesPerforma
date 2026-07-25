# Dashboard Sales BIT — Progress Log

**Project:** DashboardSalesPerforma  
**Update terakhir:** 2026-07-25

---

## Fitur Selesai

- [x] Load data dari GitHub raw (ITEMSALE.TXT + TARGET.csv + KategoriItem.csv)
- [x] Parser MYOB tab-separated (ITEMSALE.TXT)
- [x] Parser TARGET.csv dan KategoriItem.csv (semicolon-separated)
- [x] Filter bulan, salesman, kategori
- [x] KPI overview: Total Sales, Achievement, Growth, Proyeksi, AO, New, Repeat, Reactivated, Lost, Consistency
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
| 2026-07-25 | **Revert: Lost & Dormant dipisah lagi**: penggabungan Lost+Dormant (perubahan sebelum ini) bikin angka "Lost" di Customer Analytics tidak sinkron dengan KPI card "Lost Outlet" di Overview — KPI Overview cuma hitung outlet aktif bulan lalu yang hilang bulan ini (1 bulan), sedangkan versi gabungan menghitung semua yang tidak aktif bulan ini termasuk yang sudah lama pergi. Dipisah balik: `Lost` = aktif bulan lalu, hilang bulan ini (match KPI Overview); `Dormant` = sudah tidak aktif ≥2 bulan. Status `New` (NOO) tetap dipertahankan. Status Summary di Customer Analytics sekarang 6 kartu: Active, New (NOO), Reactivated, At Risk, Lost, Dormant (`status-summary` di `dashboard.css` jadi `repeat(6,1fr)`, tetap proporsional di semua breakpoint karena 6 habis dibagi 2 dan 3). |
| 2026-07-25 | **Customer status: gabung Lost+Dormant, tambah New (NOO)** *(direvert — lihat entri di atas)*: status `Dormant` dihapus, digabung ke `Lost`. Ditambah status baru `New` (New Open Outlet / NOO) — customer yang order bulan ini tapi belum pernah beli sama sekali sebelumnya (pakai window "ever" yang sama dengan `newOutlet` di KPI Overview). Disentuh: `analytics.js` (`calcCustomerTable`), `section-customer.js` (summary card + donut chart), `table.js` (badge, filter pill, kolom status tabel), `modal.js` (badge detail customer). |
| 2026-07-25 | **Bug fix: klik card KPI outlet tidak pindah section**: `app.js` manggil `SectionManager.navigate()` yang tidak pernah ada (fungsi aslinya `showSection()`) — jadi klik card AO/Repeat/Lost/Reactivated/New selama ini gagal diam-diam (error di console, tidak ada navigasi). Diperbaiki ke `SectionManager.showSection()`. |
| 2026-07-25 | **Klik card lifecycle → panel data**: card Overview (AO/New/Repeat/Reactivated/Lost) sekarang scroll ke panel yang sesuai di tab Outlet Health. Ditambah panel "New Outlets" baru (`section-outlet.js`, `index.html`) — sebelumnya New Outlet tidak punya daftar outlet sendiri. Sekalian diperbaiki: `reactivatedSet` di `section-outlet.js` yang tadinya cuma cek bulan M-2 (bukan histori penuh) sekarang pakai window yang sama dengan `analytics.js` (`everSet`), supaya angka Reactivated & New di tab Outlet Health match dengan card di Overview. |
| 2026-07-25 | **Tambah KPI "New Outlet"**: `activeOutlet` sebelumnya tidak sama dengan `repeatOutlet + reactivated` karena outlet yang baru pertama kali transaksi (belum pernah beli sebelumnya) tidak terhitung di keduanya. Ditambah `newOutlet` di `calcKPIs()` (analytics.js) sehingga `Active = New + Repeat + Reactivated`. Row KPI overview dirombak: Row 2 jadi "Volume & Kualitas" (Invoice, Qty, Product Missing, Consistency), Row 3 jadi baris 5-kolom "Outlet Lifecycle" (AO → New → Repeat → Reactivated → Lost) via class `.kpi-grid-5`. Card baru juga masuk export Excel di `section-outlet.js`. |
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
