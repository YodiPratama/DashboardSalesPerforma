# Entity Relationship Diagram (ERD)
# Dashboard Sales Performa — PT Bintang Indonesia Timur

**Versi:** 1.0  
**Tanggal:** 2 Juni 2026  
**Catatan:** Sistem ini tidak menggunakan database relasional. ERD ini memodelkan entitas data yang diproses di memori browser (in-memory data model).

---

## 1. Diagram ERD (Notasi Crow's Foot)

```
┌─────────────────────────┐
│         SALESMAN         │
├─────────────────────────┤
│ PK  id         (string) │
│     name       (string) │
│     area       (string) │
└────────────┬────────────┘
             │
             │ 1
             │ memiliki
             │ N
             │
┌────────────▼────────────────────────┐
│              TRANSACTION             │
├─────────────────────────────────────┤
│ PK  invoiceNo   (string)            │
│     date        (Date)              │
│     customerCode (string) ──────┐   │
│     customerName (string)       │   │
│     productCode  (string) ──┐   │   │
│     productName  (string)   │   │   │
│     qty          (number)   │   │   │
│     unitPrice    (number)   │   │   │
│     totalPrice   (number)   │   │   │
│ FK  salesmanId   (string) ──┼───┼───┘→ SALESMAN.id
│ FK  categoryName (string) ──┘   │       (derived via PRODUCT_CATEGORY)
└─────────────────────────────────┤
                                  │
                                  │ N
                                  │ dimiliki oleh
                                  │ 1
                              ┌───▼──────────────────────┐
                              │         CUSTOMER          │
                              ├──────────────────────────┤
                              │ PK  code     (string)    │
                              │     name     (string)    │
                              │     status   (enum)      │
                              │      → 'active'          │
                              │      → 'repeat'          │
                              │      → 'lost'            │
                              │      → 'reactivated'     │
                              │      → 'new'             │
                              └──────────────────────────┘


┌──────────────────────────┐
│       PRODUCT            │
├──────────────────────────┤
│ PK  code      (string)   │
│     name      (string)   │
└────────────┬─────────────┘
             │
             │ N
             │ dikategorikan dalam
             │ 1
             │
┌────────────▼─────────────┐
│       CATEGORY           │
├──────────────────────────┤
│ PK  name      (string)   │
│      → 'EBPI'            │
│      → 'Metal & Gypsum'  │
│      → 'Other'           │
│      → 'Uncategorized'   │
│     color     (string)   │
└──────────────────────────┘


┌──────────────────────────────────────┐
│              TARGET                   │
├──────────────────────────────────────┤
│ PK  id         (composite)           │
│ FK  salesmanId  (string) → SALESMAN  │
│ FK  categoryName (string) → CATEGORY │
│     month       (string) YYYY-MM     │
│     amount      (number)             │
└──────────────────────────────────────┘
```

---

## 2. Entitas Detail

### 2.1 TRANSACTION
Entitas inti — setiap baris dari ITEMSALE.TXT MYOB.

| Field | Tipe | Sumber | Deskripsi |
|---|---|---|---|
| `invoiceNo` | string | Kolom MYOB | Nomor invoice unik |
| `date` | Date | Kolom MYOB | Tanggal transaksi |
| `customerCode` | string | Kolom MYOB | Kode pelanggan |
| `customerName` | string | Kolom MYOB | Nama lengkap pelanggan |
| `productCode` | string | Kolom MYOB | Kode item |
| `productName` | string | Kolom MYOB | Nama item |
| `qty` | number | Kolom MYOB | Jumlah unit |
| `unitPrice` | number | Kolom MYOB | Harga satuan (Rp) |
| `totalPrice` | number | Kolom MYOB | Total nilai transaksi (Rp) |
| `salesmanId` | string | Derived | Mapped dari nama salesman → ID |
| `categoryName` | string | Derived | Dari tabel KategoriItem.csv |
| `month` | string | Derived | Format YYYY-MM dari date |

**Catatan:** Satu invoice bisa memiliki banyak baris (multi-line invoice).

---

### 2.2 CUSTOMER
Derived dari transaksi — tidak disimpan sebagai entitas statis.

| Field | Tipe | Cara Hitung | Deskripsi |
|---|---|---|---|
| `code` | string | Dari TRANSACTION | Kode pelanggan unik |
| `name` | string | Dari TRANSACTION | Nama pelanggan |
| `status` | enum | Kalkulasi 3-bulan | Status aktif/lost/repeat/baru |
| `totalSales` | number | SUM(totalPrice) | Total penjualan di periode |
| `transactionCount` | number | COUNT(invoiceNo) | Jumlah transaksi |
| `lastTransactionDate` | Date | MAX(date) | Tanggal transaksi terakhir |
| `activeMonths` | string[] | Distinct months | Bulan-bulan yang bertransaksi |

**Klasifikasi Status Customer:**
```
Status = f(transaksi bulan ini, transaksi bulan lalu, riwayat)

"active"      → ada transaksi bulan ini
"repeat"      → aktif bulan ini DAN bulan lalu
"new"         → aktif bulan ini, tidak ada riwayat sebelumnya
"reactivated" → aktif bulan ini, tidak aktif bulan lalu, pernah aktif sebelumnya
"lost"        → aktif bulan lalu, tidak ada transaksi bulan ini
"at_risk"     → tidak aktif 2 bulan terakhir
```

---

### 2.3 SALESMAN
Didefinisikan statis di `config.js`, bukan dari data transaksi.

| Field | Tipe | Sumber | Deskripsi |
|---|---|---|---|
| `id` | string | config.js | ID unik (SM001, SM002, ...) |
| `name` | string | config.js | Nama lengkap (harus cocok dengan MYOB) |
| `area` | string | config.js | Area/wilayah kerja |

**Relasi ke transaksi:** Nama salesman di MYOB di-map ke `id` oleh `api-parser.js`.

---

### 2.4 PRODUCT
Derived dari transaksi — tidak ada master produk tersendiri.

| Field | Tipe | Cara Hitung | Deskripsi |
|---|---|---|---|
| `code` | string | Dari TRANSACTION | Kode produk MYOB |
| `name` | string | Dari TRANSACTION | Nama produk |
| `categoryName` | string | Dari KategoriItem.csv | Kategori produk |
| `totalSales` | number | SUM(totalPrice) | Total penjualan produk |
| `totalQty` | number | SUM(qty) | Total unit terjual |

---

### 2.5 CATEGORY
Kombinasi definisi statis (config.js) dan mapping (KategoriItem.csv).

| Field | Tipe | Sumber | Deskripsi |
|---|---|---|---|
| `name` | string | config.js | Nama kategori |
| `color` | string | config.js | Warna hex untuk chart |
| `products` | string[] | KategoriItem.csv | Daftar produk dalam kategori |
| `totalSales` | number | Derived | Total penjualan kategori (kontekstual) |

**Kategori yang didefinisikan:**

| Nama | Warna | Deskripsi |
|---|---|---|
| EBPI | `#4f9cf9` | Produk EBPI (eternit, plank, dll.) |
| Metal & Gypsum | `#4caf82` | Produk metal dan gypsum |
| Other | `#f59e0b` | Produk lainnya |
| Uncategorized | `#64748b` | Produk belum dipetakan |

---

### 2.6 TARGET
Data target bulanan dari TARGET.csv / Google Sheets.

| Field | Tipe | Sumber | Deskripsi |
|---|---|---|---|
| `salesmanId` | string (FK) | TARGET.csv | Referensi ke SALESMAN |
| `categoryName` | string (FK) | TARGET.csv | Referensi ke CATEGORY |
| `month` | string | TARGET.csv | Format YYYY-MM |
| `amount` | number | TARGET.csv | Target penjualan (Rp) |

**Catatan:** Composite key = `salesmanId + categoryName + month`.

---

### 2.7 OUTLET (Alias Customer dalam konteks distribusi)

| Field | Tipe | Cara Hitung | Deskripsi |
|---|---|---|---|
| `name` | string | Dari TRANSACTION | Nama outlet/toko |
| `salesmanId` | string | Dari TRANSACTION | Salesman yang handle |
| `status` | enum | Retensi 3 bulan | active/lost/reactivated |
| `lastSaleDate` | Date | MAX(date) | Transaksi terakhir |
| `monthsActive` | string[] | Distinct months | Bulan aktif dalam rentang |
| `isConsistent` | boolean | 3-bulan check | Aktif 3 bulan berturut-turut |

---

## 3. Relasi Antar Entitas

```
SALESMAN ────────< TRANSACTION >──────── CUSTOMER
    │                   │                    │
    │                   │                    │
    └──────< TARGET     └──── PRODUCT >──── CATEGORY
              │
              └── CATEGORY
```

| Relasi | Kardinalitas | Keterangan |
|---|---|---|
| SALESMAN → TRANSACTION | 1 : N | Satu salesman punya banyak transaksi |
| CUSTOMER → TRANSACTION | 1 : N | Satu customer punya banyak transaksi |
| PRODUCT → TRANSACTION | 1 : N | Satu produk muncul di banyak transaksi |
| CATEGORY → PRODUCT | 1 : N | Satu kategori memiliki banyak produk |
| SALESMAN → TARGET | 1 : N | Satu salesman punya target per bulan per kategori |
| CATEGORY → TARGET | 1 : N | Satu kategori punya target per salesman per bulan |

---

## 4. Data Flow & Transformasi

### 4.1 Raw → Normalized Schema

```
MYOB ITEMSALE.TXT (raw, tab-separated)
  │
  │  parseItemSale()
  ▼
[
  {
    invoiceNo: "IV-001234",
    date: Date("2026-05-15"),
    customerCode: "C-0001",
    customerName: "TOKO BANGUNAN SEJAHTERA",
    productCode: "P-001",
    productName: "KALSIPLANK JT 8 MM (20 X 300)",
    qty: 50,
    unitPrice: 45000,
    totalPrice: 2250000,
    salesmanId: "SM001",        ← mapped dari nama MYOB
    categoryName: "EBPI",       ← lookup dari KategoriItem
    month: "2026-05"            ← derived dari date
  },
  ...
]
```

### 4.2 Agregasi untuk Analytics

```
AppState.rawData.sales (array transaksi)
  │
  ├─── Group by customer ──────────→ Customer metrics
  │         SUM(total), COUNT(inv)
  │         Status classification
  │
  ├─── Group by salesman ──────────→ Salesman metrics
  │         SUM(total), AO count
  │         JOIN AppState.rawData.targets
  │
  ├─── Group by category ──────────→ Category metrics
  │         SUM(total), contribution %
  │
  ├─── Group by date ──────────────→ Daily trend
  │         Running SUM(total)
  │
  └─── Group by (month, customer) ─→ Outlet retention
            3-month window analysis
```

---

## 5. Skema JSON AppState (Runtime)

```json
{
  "rawData": {
    "sales": [
      {
        "invoiceNo": "string",
        "date": "Date",
        "customerCode": "string",
        "customerName": "string",
        "productCode": "string",
        "productName": "string",
        "qty": "number",
        "unitPrice": "number",
        "totalPrice": "number",
        "salesmanId": "string",
        "categoryName": "string",
        "month": "string (YYYY-MM)"
      }
    ],
    "targets": [
      {
        "salesmanId": "string",
        "categoryName": "string",
        "month": "string (YYYY-MM)",
        "amount": "number"
      }
    ],
    "categories": {
      "NamaBarang": "NamaKategori"
    }
  },
  "filters": {
    "month": "string (YYYY-MM)",
    "salesman": "string | 'all'",
    "category": "string | 'all'"
  },
  "computed": {
    "kpis": {
      "totalSales": "number",
      "totalTarget": "number",
      "achievement": "number",
      "growth": "number",
      "projection": "number",
      "activeOutlets": "number",
      "repeatOutlets": "number",
      "lostOutlets": "number",
      "reactivatedOutlets": "number"
    },
    "salesman": [
      {
        "id": "string",
        "name": "string",
        "totalSales": "number",
        "target": "number",
        "achievement": "number",
        "activeOutlets": "number"
      }
    ],
    "categories": [
      {
        "name": "string",
        "totalSales": "number",
        "contribution": "number",
        "color": "string"
      }
    ],
    "trend": [
      {
        "date": "string",
        "cumulative": "number"
      }
    ],
    "customers": [
      {
        "code": "string",
        "name": "string",
        "status": "string",
        "totalSales": "number",
        "transactionCount": "number"
      }
    ]
  }
}
```

---

## 6. Format File Data Sumber

### 6.1 ITEMSALE.TXT (MYOB Export)

```
Format: Tab-separated, header di baris pertama
Encoding: UTF-8 / Windows-1252
Kolom relevan (dari 60+):
  - Col 0:  Invoice No
  - Col 3:  Invoice Date (DD/MM/YYYY)
  - Col 5:  Customer Code
  - Col 6:  Customer Name
  - Col 15: Item Code
  - Col 16: Item Name
  - Col 20: Quantity
  - Col 22: Unit Price
  - Col 24: Total Amount (inc. discount)
  - Col 45: Salesman Name
```

### 6.2 KategoriItem.csv

```
Format: Semicolon-separated
Header: NamaBarang;Kategori

Contoh:
KALSIPLANK JT 8 MM (20 X 300);EBPI
CHANAL BT C75-75 X 6M;Metal & Gypsum
DAMDEX MLT FGS 1 LTR @ 24 JRG;Other
```

### 6.3 TARGET.csv

```
Format: Semicolon-separated
Header: Salesman;Kategori;Jan-26;Feb-26;Mar-26;...

Contoh:
NI PUTU ENY SUKARIASIH;EBPI;Rp700.000.000;Rp700.000.000;...
NI PUTU ENY SUKARIASIH;Metal & Gypsum;Rp200.000.000;...
```
