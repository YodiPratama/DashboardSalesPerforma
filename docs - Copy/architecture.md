# Architecture — Dashboard Sales Performa BIT

## Overview

Dashboard Sales Performa BIT adalah Business Intelligence dashboard berbasis web statis untuk PT Bintang Indonesia Timur, distributor material bangunan. Aplikasi ini memvisualisasikan data transaksi MYOB, target penjualan, dan kesehatan outlet — sepenuhnya di sisi klien tanpa server backend.

---

## Stack Teknologi

| Layer | Teknologi |
|---|---|
| Markup | HTML5 |
| Styling | CSS3 (custom properties, flexbox, grid) |
| Logic | Vanilla JavaScript (ES6+) |
| Charts | Chart.js 4.4.3 |
| Tables | jQuery 3.7.1 + DataTables 1.13.8 |
| Export | SheetJS (xlsx 0.20.2) |
| Fonts | Google Fonts (Inter) |
| Deployment | GitHub Pages (static) |
| Build | Tidak ada — file langsung dibuka browser |

---

## Struktur Direktori

```
DashboardSalesPerforma/
├── index.html                  # Entry point tunggal (SPA)
├── config/
│   └── config.js               # Konstanta global, URL, konfigurasi threshold
├── assets/
│   ├── css/
│   │   ├── theme.css           # CSS custom properties dark/light mode
│   │   ├── main.css            # Komponen UI (card, modal, sidebar)
│   │   └── dashboard.css       # Layout grid per section
│   └── js/
│       ├── app.js              # Inisialisasi & orkestrasi utama
│       ├── api.js              # Pemuatan data (multi-source, prioritized)
│       ├── api-parser.js       # Parser MYOB TXT, CSV kategori & target
│       ├── analytics.js        # Kalkulasi KPI & metrik bisnis
│       ├── charts.js           # Wrapper Chart.js dengan theming
│       ├── table.js            # Inisialisasi DataTables & export Excel
│       ├── modal.js            # Modal detail customer
│       ├── formatter.js        # Format angka (Rupiah, %, tanggal)
│       ├── theme.js            # Toggle dark/light mode
│       ├── alerts.js           # Smart insights & warning alerts
│       ├── sections.js         # Router section & filter manager
│       ├── section-salesman.js # Halaman performa salesman
│       ├── section-customer.js # Halaman analitik customer
│       ├── section-category.js # Halaman analitik kategori produk
│       ├── section-outlet.js   # Halaman kesehatan outlet
│       └── section-trend.js    # Halaman tren multi-bulan
├── pages/                      # Template HTML per halaman (referensi)
├── ITEMSALE.TXT                # Data transaksi MYOB (tab-separated)
├── KategoriItem.csv            # Mapping produk → kategori
├── TARGET.csv                  # Target bulanan per salesman & kategori
└── .nojekyll                   # Marker GitHub Pages (disable Jekyll)
```

---

## Arsitektur Aplikasi

Aplikasi menggunakan pola **Single Page Application (SPA) tanpa framework** dengan manajemen state manual melalui objek global `AppState`.

```
┌─────────────────────────────────────────────────────────────────┐
│                        DATA SOURCES                             │
│                                                                 │
│  [1] sessionStorage ← Upload manual MYOB (prioritas tertinggi) │
│  [2] GitHub Raw     ← ITEMSALE.TXT dari repository             │
│  [3] Google Sheets  ← CSV KategoriItem & TARGET (publik)       │
│  [4] Google Apps Script ← Endpoint opsional (belum aktif)      │
│  [5] Mock Generator ← Fallback development                     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                    ┌───────▼────────┐
                    │   api.js       │
                    │  load()        │
                    └───────┬────────┘
                            │
                    ┌───────▼────────────────────┐
                    │   api-parser.js             │
                    │  parseItemSale()            │
                    │  parseKategori()            │
                    │  parseTarget()              │
                    └───────┬────────────────────┘
                            │
                    ┌───────▼────────────────────┐
                    │   AppState.rawData          │
                    │  { sales, targets,          │
                    │    categories }             │
                    └───────┬────────────────────┘
                            │
             ┌──────────────┼──────────────┐
             │              │              │
      ┌──────▼──────┐  ┌───▼──────┐  ┌───▼───────────┐
      │   Filters   │  │analytics │  │  sections.js  │
      │ (month, SM, │  │  .js     │  │  (router)     │
      │  category)  │  │ calc*()  │  └───┬───────────┘
      └──────┬──────┘  └───┬──────┘      │
             └──────────────┘            │
                            │            │
                    ┌───────▼────────────▼───────────────┐
                    │         AppState.computed            │
                    │   { kpis, salesman, categories,     │
                    │     trend, retention, customers }    │
                    └───────┬────────────────────────────┘
                            │
           ┌────────────────┼────────────────┐
           │                │                │
    ┌──────▼──────┐  ┌──────▼──────┐  ┌─────▼──────┐
    │  KPI Cards  │  │  charts.js  │  │  table.js  │
    │  (DOM)      │  │  Chart.js   │  │  DataTables│
    └─────────────┘  └─────────────┘  └────────────┘
```

---

## Modul JavaScript

### `app.js` — Orkestrasi Utama
- Menginisialisasi dashboard saat DOM siap
- Menyimpan `AppState` global (filter aktif, data mentah, data terkomputasi)
- Memanggil `API.load()` → `Analytics.calc*()` → renderer tiap section
- Binding event: filter dropdown, upload modal, sidebar, refresh, export

### `api.js` — Pemuatan Data
- Mengimplementasikan **fallback chain** berurutan berdasarkan prioritas
- `loadFromSession()` — dari sessionStorage jika ada upload sebelumnya
- `fetchFromGitHub()` — fetch ITEMSALE.TXT + Sheets untuk kategori & target
- `loadFromFiles()` — membaca file yang diupload pengguna
- `generateMockData()` — generator data sintetik untuk development

### `api-parser.js` — Parsing & Normalisasi
- `parseItemSale()` — mengekstrak 60+ kolom MYOB menjadi skema ringkas:
  `{ date, invoice, customer, product, qty, price, total, salesman, category }`
- `parseKategori()` — membangun map `NamaBarang → Kategori`
- `parseTarget()` — mengurai target per salesman/kategori/bulan dari format Rupiah lokal
- Helper: `_parseRupiah()`, `_parseQty()`, `_parseDate()` — konversi format Indonesia

### `analytics.js` — Kalkulasi Bisnis
- `calcKPIs()` — metrik inti: total penjualan, growth MoM, achievement %, proyeksi
- `calcSalesmanMetrics()` — KPI per salesman dengan outlet & kategori
- `calcCategoryMetrics()` — kontribusi per kategori produk
- `calcDailyTrend()` — akumulasi harian untuk chart tren
- `calcOutletRetention()` — analisis retensi outlet 3 bulan

### `sections.js` — Router Section
- Mengelola 6 section utama via atribut `data-section`
- Mengontrol visibilitas filter per section
- Mendelegasikan render ke `section-{name}.js` yang sesuai

### `section-*.js` — Renderer Per Halaman
Masing-masing file menangani satu section:

| File | Section | Konten Utama |
|---|---|---|
| `section-salesman.js` | Salesman | Card per SM, chart sales vs target, distribusi outlet |
| `section-customer.js` | Customer | Status customer, top list, modal detail |
| `section-category.js` | Category | Donut chart, tabel produk, produk uncategorized |
| `section-outlet.js` | Outlet Health | Daftar aktif/lost/reaktivasi, chart retensi |
| `section-trend.js` | Trend | Perbandingan multi-bulan, tabel ringkasan |

### `charts.js` — Visualisasi
- Wrapper Chart.js dengan theming dark/light otomatis
- Custom plugin: `BarLabelPlugin`, `DonutLabelPlugin`
- Chart yang tersedia: line (tren harian), bar (ranking), donut (kategori), gauge (achievement %)

### `formatter.js` — Format Tampilan
- `currency()` — singkatan: 1.2M, 500JT, 200RB
- `currencyFull()` — format penuh: "Rp 1.200.000"
- `percent()` — persentase 2 desimal
- `date()` — format Indonesia: "01 Jan 2026"
- `achClass()` — CSS class berdasarkan threshold achievement

### `alerts.js` — Insight & Alert
- Menghasilkan insight bisnis otomatis dari KPI (top performer, slow growth)
- Alert merah/oranye/kuning berdasarkan threshold konfigurasi
- Daftar produk yang belum dikategorikan

---

## Sumber Data & Integrasi Eksternal

### GitHub Repository (Sumber Utama)
- **URL:** `https://raw.githubusercontent.com/YodiPratama/DashboardSalesPerforma/main/ITEMSALE.TXT`
- **Format:** Tab-separated, 60+ kolom, export native MYOB
- **Update:** Manual — pengguna commit file MYOB terbaru ke repo
- **Auth:** Tidak diperlukan (repo publik)

### Google Sheets (Kategori & Target)
- **Akses:** Published to web sebagai CSV (tanpa autentikasi)
- **KategoriItem** (GID: 1369270145) — mapping `NamaBarang;Kategori`
- **TARGET** (GID: 748998745) — target bulanan format `Rp X.XXX.XXX`
- **Update:** Real-time — edit di Sheets langsung tersedia

### Upload Manual (MYOB Offline)
- Tombol "Load Data" di header membuka modal upload
- Mendukung 3 file: `ITEMSALE.TXT`, `KategoriItem.csv`, `TARGET.csv`
- Data disimpan di `sessionStorage` — persisten selama tab terbuka

### Google Apps Script (Opsional)
- Dikonfigurasi via `CONFIG.GAS_API_URL` — saat ini kosong/nonaktif
- Dirancang sebagai endpoint query dinamis dengan parameter tahun/bulan

---

## Manajemen State

State global disimpan dalam objek `AppState`:

```javascript
AppState = {
  // Data mentah dari parser
  rawData: {
    sales: [],       // Array transaksi ternormalisasi
    targets: [],     // Target per salesman/kategori/bulan
    categories: {}   // Map NamaBarang → Kategori
  },

  // Filter aktif saat ini
  filters: {
    month: 'YYYY-MM',
    salesman: 'all',
    category: 'all'
  },

  // Hasil kalkulasi (di-recompute setiap filter berubah)
  computed: {
    kpis: {},
    salesman: [],
    categories: [],
    trend: [],
    retention: {},
    customers: []
  }
}
```

**Tidak ada reactive framework** — setiap perubahan filter memicu `App.render()` yang memanggil ulang semua kalkulasi dan renderer secara sinkron.

---

## Logika Bisnis Utama

### Growth MoM (Month-over-Month)
Dinormalisasi per hari untuk perbandingan adil antara bulan lengkap dan bulan berjalan:
```
growth = ((avgHarian_bulanIni - avgHarian_bulanLalu) / avgHarian_bulanLalu) × 100
```

### Achievement %
```
achievement = (totalPenjualan / totalTarget) × 100
```
Target difilter sesuai salesman & kategori yang aktif.

### Proyeksi End-of-Month
```
proyeksi = (penjualanSampaiHariIni / hariYangSudahBerlalu) × totalHariDalamBulan
```

### Klasifikasi Status Outlet
- **Active Outlet (AO):** Bertransaksi di bulan berjalan
- **Repeat:** Aktif di bulan ini dan bulan sebelumnya
- **Lost:** Aktif bulan lalu, tidak ada transaksi bulan ini
- **Reactivated:** Aktif sekarang, sempat tidak aktif bulan lalu, namun aktif di bulan lebih lama
- **Konsistensi:** Aktif di 3 bulan berturut-turut (M-2, M-1, bulan ini)

### Product Missing
Produk yang ada di transaksi bulan lalu namun tidak muncul di bulan ini — indikator hilangnya line item atau outlet berhenti memesan SKU tertentu.

---

## Threshold & Konfigurasi (`config.js`)

| Parameter | Nilai | Fungsi |
|---|---|---|
| `ALERT_DANGER_ACHIEVEMENT` | 50% | Achievement di bawah ini → alert merah |
| `ALERT_WARNING_ACHIEVEMENT` | 70% | Achievement di bawah ini → alert oranye |
| `TABLE_PAGE_SIZE` | 25 | Baris per halaman DataTables |
| `DEFAULT_THEME` | `'dark'` | Tema default saat pertama buka |
| `USE_MOCK_DATA` | `false` | Paksa gunakan data sintetik |

---

## Persistensi Browser

| Storage | Key | Konten | Durasi |
|---|---|---|---|
| `localStorage` | `bit_dashboard_theme` | Preferensi tema (dark/light) | Permanen |
| `sessionStorage` | *(custom)* | Data MYOB yang diupload manual | Hingga tab ditutup |

---

## Section Dashboard

| Section | Tujuan | Metrik Kunci |
|---|---|---|
| **Overview** | Ringkasan eksekutif | KPI cards, ranking salesman, donut kategori, tren harian |
| **Salesman** | Performa tim | Card per SM, bar chart sales vs target, metrik outlet |
| **Customer** | Kesehatan pelanggan | Distribusi status, top customer, modal histori transaksi |
| **Category** | Analitik produk | Kontribusi kategori, tabel produk, uncategorized |
| **Outlet Health** | Retensi outlet | Daftar aktif/lost/reaktivasi, chart retensi 3 bulan |
| **Trend** | Analisis waktu | Perbandingan multi-bulan, tabel ringkasan bulanan |

---

## Alur Pengguna Tipikal

```
1. Buka index.html
   ↓
2. app.js → api.js mengambil data (GitHub + Sheets)
   ↓
3. api-parser.js normalisasi → AppState.rawData
   ↓
4. Analytics kalkulasi KPI → AppState.computed
   ↓
5. Renderer mengisi DOM (KPI cards, charts, tables)
   ↓
6. Pengguna pilih bulan/salesman/kategori
   ↓
7. App.render() dipanggil ulang → langkah 4–5 berulang
   ↓
8. Pengguna navigasi ke section lain
   ↓
9. sections.js show/hide DOM → section-*.js render konten baru
```

---

## Pertimbangan Pengembangan

- **Tidak ada build step** — edit file JS/CSS langsung terlihat di browser (cukup refresh)
- **Tidak ada dependensi lokal** — semua library dari CDN, tidak perlu `npm install`
- **Debug mock data** — set `USE_MOCK_DATA: true` di `config.js` untuk develop tanpa koneksi
- **Tambah salesman baru** — update array `SALESMAN_LIST` di `config.js`
- **Tambah kategori baru** — tambah entry di `CATEGORY_COLORS` dan update `KategoriItem.csv` di Google Sheets
- **Update data** — commit file `ITEMSALE.TXT` terbaru ke GitHub; dashboard otomatis ambil versi terbaru
