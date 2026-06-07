# System Architecture Document (SAD)
# Dashboard Sales Performa — PT Bintang Indonesia Timur

**Versi:** 1.0  
**Tanggal:** 2 Juni 2026  
**Status:** Active

---

## 1. Tujuan Dokumen

Dokumen ini mendeskripsikan arsitektur sistem Dashboard Sales Performa BIT secara menyeluruh — mencakup komponen sistem, alur data, antarmuka eksternal, keputusan desain, batasan, dan pertimbangan non-fungsional.

---

## 2. Gambaran Sistem

### 2.1 Latar Belakang

PT Bintang Indonesia Timur adalah distributor material bangunan yang menggunakan MYOB sebagai sistem akuntansi. Data transaksi MYOB diekspor secara manual dan divisualisasikan melalui dashboard web untuk memantau performa penjualan tim salesman, kesehatan outlet, dan pencapaian target bulanan.

### 2.2 Tujuan Sistem

- Menyajikan KPI penjualan secara real-time tanpa backend server
- Memungkinkan analisis per salesman, kategori produk, dan outlet
- Mendeteksi outlet yang hilang, pelanggan berisiko, dan produk yang tidak dipesan
- Membandingkan pencapaian vs target bulanan per salesman & kategori

### 2.3 Pengguna Sistem

| Peran | Akses | Kebutuhan Utama |
|---|---|---|
| Manager Sales | Dashboard penuh | Overview KPI, ranking salesman, tren |
| Supervisor | Dashboard penuh | Detail per salesman, outlet health |
| Admin Data | Upload file MYOB | Refresh data bulanan |
| (Future) Salesman | View terbatas | Performa pribadi |

---

## 3. Konteks Sistem

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL SYSTEMS                                  │
│                                                                          │
│   ┌─────────────────┐    ┌──────────────────┐    ┌──────────────────┐  │
│   │   MYOB Software │    │  Google Sheets   │    │  GitHub Repo     │  │
│   │  (Akuntansi)    │    │ (Target/Kategori)│    │ (Data Hosting)   │  │
│   └────────┬────────┘    └────────┬─────────┘    └────────┬─────────┘  │
│            │                      │                        │            │
│      Export manual          CSV publik              Raw file URL        │
│     ITEMSALE.TXT            (no auth)               (HTTP GET)          │
│            │                      │                        │            │
└────────────┼──────────────────────┼────────────────────────┼────────────┘
             │                      │                        │
             └──────────────────────┴────────────────────────┘
                                    │
                          ┌─────────▼──────────┐
                          │   Browser Client   │
                          │  (Static Web App)  │
                          │                    │
                          │  index.html        │
                          │  + JS modules      │
                          │  + CSS themes      │
                          └────────────────────┘
                                    │
                          ┌─────────▼──────────┐
                          │   GitHub Pages     │
                          │  (Static Hosting)  │
                          └────────────────────┘
```

---

## 4. Arsitektur Komponen

### 4.1 Layer Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                        │
│                                                              │
│   index.html   │   CSS (theme, main, dashboard)             │
│   charts.js    │   table.js   │   formatter.js              │
│   modal.js     │   alerts.js  │   theme.js                  │
└───────────────────────────────┬──────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────┐
│                     APPLICATION LAYER                         │
│                                                              │
│   app.js (orchestrator)  │  sections.js (router)            │
│   section-salesman.js    │  section-customer.js             │
│   section-category.js    │  section-outlet.js               │
│   section-trend.js                                          │
└───────────────────────────────┬──────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────┐
│                      BUSINESS LOGIC LAYER                     │
│                                                              │
│   analytics.js                                              │
│   - calcKPIs()         - calcSalesmanMetrics()              │
│   - calcCategoryMetrics() - calcDailyTrend()                │
│   - calcOutletRetention()                                   │
└───────────────────────────────┬──────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────┐
│                      DATA ACCESS LAYER                        │
│                                                              │
│   api.js (loader)   │   api-parser.js (normalizer)          │
│   - sessionStorage  │   - parseItemSale()                   │
│   - GitHub fetch    │   - parseKategori()                   │
│   - Sheets fetch    │   - parseTarget()                     │
│   - File upload     │   - _parseRupiah/_parseDate           │
└───────────────────────────────┬──────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────┐
│                       DATA SOURCES                            │
│                                                              │
│  sessionStorage  │  GitHub Raw  │  Google Sheets  │  Mock   │
└──────────────────────────────────────────────────────────────┘
```

### 4.2 Komponen Utama

#### Orchestrator (`app.js`)
- **Tanggung jawab:** Entry point, inisialisasi, koordinasi antar modul
- **Dependensi:** Semua modul JS
- **State:** Menyimpan `AppState` global
- **Event:** Filter change, navigation, upload, refresh, export

#### Data Loader (`api.js`)
- **Tanggung jawab:** Abstraksi sumber data dengan fallback chain
- **Prioritas sumber:** sessionStorage → GitHub → Sheets → Mock
- **Antarmuka:** `API.load()` mengembalikan `{sales, targets, categories}`

#### Data Parser (`api-parser.js`)
- **Tanggung jawab:** Normalisasi format heterogen ke skema seragam
- **Input:** Raw TXT/CSV string
- **Output:** Array objek terstruktur

#### Analytics Engine (`analytics.js`)
- **Tanggung jawab:** Semua kalkulasi bisnis dari data mentah + filter
- **Stateless:** Menerima data & filter, mengembalikan hasil
- **Pure functions:** Tidak ada side effect

#### Section Router (`sections.js`)
- **Tanggung jawab:** Navigasi antar 6 halaman virtual
- **Mekanisme:** DOM show/hide via CSS class, tanpa URL routing

#### Section Renderers (`section-*.js`)
- **Tanggung jawab:** Render konten spesifik per halaman
- **Pola:** Menerima `AppState.computed`, memanipulasi DOM

---

## 5. Alur Data

### 5.1 Inisialisasi (Cold Start)

```
Browser load index.html
  └─> DOMContentLoaded → app.js init()
        └─> API.load()
              ├─> Cek sessionStorage → ada? gunakan
              ├─> Fetch GitHub ITEMSALE.TXT (HTTP GET)
              ├─> Fetch Google Sheets KategoriItem (HTTP GET)
              ├─> Fetch Google Sheets TARGET (HTTP GET)
              └─> Parser.buildDataset(raw) → AppState.rawData
                    └─> App.render()
                          └─> Analytics.calcKPIs(rawData, filters)
                                └─> DOM update (cards, charts, tables)
```

### 5.2 Filter Change

```
User ubah dropdown bulan/salesman/kategori
  └─> onChange handler → AppState.filters update
        └─> App.render()
              └─> Analytics.calc*(rawData, newFilters) — recompute
                    └─> Renderer update DOM (incremental)
```

### 5.3 Manual Data Upload

```
User klik "Load Data" → Upload modal
  └─> User pilih file ITEMSALE.TXT + CSV
        └─> FileReader API membaca file
              └─> API.loadFromFiles(files)
                    └─> Parser normalisasi → sessionStorage simpan
                          └─> AppState.rawData update → App.render()
```

### 5.4 Section Navigation

```
User klik menu sidebar
  └─> sections.js show/hide DOM sections
        └─> section-{name}.js.render(computed)
              └─> Charts re-initialize (Chart.js destroy + create)
                    └─> Tables re-initialize (DataTables destroy + create)
```

---

## 6. Antarmuka Sistem Eksternal

### 6.1 GitHub Raw API

| Atribut | Nilai |
|---|---|
| Tipe | HTTP GET (unauthenticated) |
| URL | `https://raw.githubusercontent.com/YodiPratama/DashboardSalesPerforma/main/ITEMSALE.TXT` |
| Format | Tab-separated text, 60+ kolom |
| Error handling | Fallback ke sessionStorage atau mock |
| Timeout | Browser default fetch timeout |
| Rate limit | GitHub: 60 req/jam per IP (raw content) |

### 6.2 Google Sheets CSV Export

| Atribut | Nilai |
|---|---|
| Tipe | HTTP GET (published CSV) |
| KategoriItem | `https://docs.google.com/spreadsheets/d/2PACX-.../pub?gid=1369270145&output=csv` |
| TARGET | `https://docs.google.com/spreadsheets/d/2PACX-.../pub?gid=748998745&output=csv` |
| Format | Comma-separated CSV |
| Auth | Tidak diperlukan (published to web) |
| Update lag | ~5 menit setelah edit di Sheets |

### 6.3 Google Apps Script (Opsional / Belum Aktif)

| Atribut | Nilai |
|---|---|
| Status | Dikonfigurasi, belum aktif |
| Config | `CONFIG.GAS_API_URL` (kosong) |
| Tujuan | Query dinamis dengan parameter tahun/bulan |
| Aktivasi | Set URL di `config.js` |

### 6.4 MYOB (Indirect — Export Manual)

| Atribut | Nilai |
|---|---|
| Tipe | File export (bukan API langsung) |
| Format | ITEMSALE.TXT (tab-separated, 60+ kolom) |
| Proses | Export manual dari MYOB → upload ke GitHub atau modal |
| Frekuensi | Bulanan atau sesuai kebutuhan |

---

## 7. Keputusan Arsitektur

### 7.1 Vanilla JS (Tanpa Framework)

**Keputusan:** Tidak menggunakan React/Vue/Angular.  
**Alasan:** Zero build complexity, tidak perlu npm/node, cocok untuk tim non-developer yang perlu maintenance sederhana. Deployment cukup commit file ke GitHub.  
**Trade-off:** State management manual, tidak ada hot reload, DOM manipulation eksplisit.

### 7.2 Client-Side Only (Tanpa Backend)

**Keputusan:** Semua pemrosesan data di browser.  
**Alasan:** Menghindari biaya server, tidak ada data sensitif yang perlu diamankan di server, data sudah tersedia via GitHub publik.  
**Trade-off:** Semua kalkulasi di CPU klien, tidak cocok untuk dataset sangat besar (> 100k baris).

### 7.3 Multi-Source Fallback Chain

**Keputusan:** Data dimuat dengan prioritas bertingkat (sessionStorage → GitHub → Sheets → mock).  
**Alasan:** Memastikan dashboard selalu bisa ditampilkan meski satu sumber tidak tersedia. Mock data penting untuk development offline.  
**Trade-off:** Kompleksitas `api.js` meningkat, potensi data stale dari sessionStorage.

### 7.4 GitHub sebagai Data Store

**Keputusan:** File ITEMSALE.TXT disimpan di GitHub repository.  
**Alasan:** GitHub Pages gratis, GitHub Raw URL tersedia publik, version control otomatis untuk setiap update data.  
**Trade-off:** Update data memerlukan git commit/push, tidak real-time.

### 7.5 AppState Global

**Keputusan:** State disimpan di satu objek global `AppState`.  
**Alasan:** Sederhana, mudah di-debug via browser console, tidak perlu library state management.  
**Trade-off:** Tidak ada immutability, risiko mutasi tidak sengaja dari mana saja.

---

## 8. Pertimbangan Non-Fungsional

### 8.1 Performa

| Aspek | Strategi |
|---|---|
| Data load | Fetch paralel GitHub + Sheets saat startup |
| Re-render | Hanya section yang aktif yang di-render penuh |
| Charts | Destroy + recreate saat section berganti (hindari memory leak) |
| Tables | DataTables dengan pagination (25 baris default) |
| Caching | sessionStorage untuk data upload, browser cache untuk CDN library |

### 8.2 Ketersediaan

- **Dependency eksternal:** GitHub Pages, GitHub Raw, Google Sheets CDN
- **Single point of failure:** Jika GitHub tidak tersedia, data dari sessionStorage digunakan
- **Offline mode:** Hanya berfungsi jika ada data di sessionStorage atau mock data aktif

### 8.3 Keamanan

| Aspek | Status |
|---|---|
| Data sensitif | Tidak ada — semua data di repo publik |
| Authentication | Tidak ada — dashboard read-only publik |
| XSS | Minimal risk — tidak ada user-generated content yang di-render sebagai HTML |
| CORS | Google Sheets & GitHub mendukung CORS untuk browser fetch |
| CSP | Tidak dikonfigurasi (CDN library dari jsdelivr/cdnjs) |

### 8.4 Skalabilitas

- **Batas dataset:** ~50.000 baris transaksi sebelum browser mulai lambat (estimasi)
- **Batas salesman:** Hardcoded di `CONFIG.SALESMAN_LIST`, perlu edit manual untuk tambah
- **Batas kategori:** Konfigurasi di `CONFIG.CATEGORY_COLORS`

### 8.5 Maintainability

- Modularisasi per fitur (1 file = 1 tanggung jawab)
- Konfigurasi terpusat di `config.js`
- Tidak ada build step — edit langsung berfungsi
- Tidak ada test suite (saat ini)

---

## 9. Deployment Architecture

```
┌─────────────────────────────────────────────────┐
│              GitHub Repository                   │
│                                                 │
│  Branch: main                                   │
│  ├── index.html                                 │
│  ├── assets/ (CSS + JS)                         │
│  ├── config/config.js                           │
│  ├── ITEMSALE.TXT  ← diupdate tiap periode      │
│  ├── KategoriItem.csv                           │
│  ├── TARGET.csv                                 │
│  └── .nojekyll                                  │
│                                                 │
│  GitHub Pages → serve branch main               │
└───────────────────────────┬─────────────────────┘
                            │
              HTTPS (GitHub Pages CDN)
                            │
              ┌─────────────▼──────────────┐
              │         Browser             │
              │   Fetch + parse + render    │
              └─────────────────────────────┘
```

**URL Produksi:** `https://yodipratama.github.io/DashboardSalesPerforma/`

**Proses Update Data:**
1. Export ITEMSALE.TXT dari MYOB
2. `git add ITEMSALE.TXT && git commit -m "update data [bulan]"`
3. `git push origin main`
4. GitHub Pages otomatis serve versi terbaru (delay ~30 detik)

---

## 10. Batasan & Asumsi Sistem

| Batasan | Detail |
|---|---|
| No real-time | Data diupdate manual, bukan streaming |
| No multi-user | Tidak ada collision control — satu admin yang update data |
| Browser only | Tidak ada mobile app native |
| Indonesia locale | Format angka (Rp, titik ribuan, koma desimal) hardcoded Indonesia |
| MYOB format | Parser bergantung pada format export MYOB versi tertentu |
| Salesman hardcoded | Daftar salesman harus diupdate manual di `config.js` |

---

## 11. Risiko & Mitigasi

| Risiko | Kemungkinan | Dampak | Mitigasi |
|---|---|---|---|
| Format MYOB berubah | Rendah | Tinggi | Parser di `api-parser.js` terisolasi, mudah diadaptasi |
| Google Sheets URL expired | Rendah | Sedang | Fallback ke data di sessionStorage |
| GitHub Pages down | Sangat Rendah | Tinggi | Bisa serve secara lokal (double-click index.html) |
| Data tidak sinkron | Sedang | Sedang | Timestamp "last updated" di UI (roadmap) |
| Salesman mapping salah | Sedang | Sedang | Config `SALESMAN_LIST` dengan nama lengkap eksak |
