const CONFIG = {
  GAS_API_URL: '',

  // ── GitHub Raw URL — ITEMSALE.TXT langsung dari repo (prioritas utama) ──────
  // Taruh file ITEMSALE.TXT di folder data/ lalu commit + push
  GITHUB_ITEMSALE_URL: 'https://raw.githubusercontent.com/YodiPratama/DashboardSalesPerforma/main/ITEMSALE.TXT',

  // ── Google Sheets CSV URLs (Publish to web → CSV) ──────────────────────────
  // Kategori + Target tetap dari Google Sheets (file kecil, tidak timeout)
  SHEETS_SALES_URL:    '',   // Tidak dipakai — data penjualan kini dari GITHUB_ITEMSALE_URL
  SHEETS_KATEGORI_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSUEd5CH4NenCBTmmtIk0CzE-pFTKF8uNsvvZ1ArtuBUL_4_kDYqzax3XaqHzFoXivXm9ZNAOVIlW3a/pub?gid=1369270145&single=true&output=csv',
  SHEETS_TARGET_URL:   'https://docs.google.com/spreadsheets/d/e/2PACX-1vSUEd5CH4NenCBTmmtIk0CzE-pFTKF8uNsvvZ1ArtuBUL_4_kDYqzax3XaqHzFoXivXm9ZNAOVIlW3a/pub?gid=748998745&single=true&output=csv',

  APP_NAME: 'Dashboard Sales BIT',
  APP_VERSION: '1.0.0',
  COMPANY_NAME: 'Bintang Indonesia Timur',
  COMPANY_SHORT: 'BIT',

  DEFAULT_THEME: 'dark',
  USE_MOCK_DATA: false,

  CHART_ANIMATION: 700,
  TABLE_PAGE_SIZE: 25,

  ALERT_DANGER_ACHIEVEMENT: 50,
  ALERT_WARNING_ACHIEVEMENT: 70,
  ALERT_LOST_OUTLET_PCT: 15,

  MONTHS_ID: [
    'Januari','Februari','Maret','April','Mei','Juni',
    'Juli','Agustus','September','Oktober','November','Desember'
  ],

  SALESMAN_LIST: [
    { id: 'SM001', name: 'NI PUTU ENY SUKARIASIH',  area: '' },
    { id: 'SM002', name: 'WAYAN SUARTAMA',           area: '' },
    { id: 'SM003', name: 'KADEK ANDRE ADI PRASETYA', area: '' },
    { id: 'SM004', name: 'ANGGA',                    area: '' },
    { id: 'SM005', name: 'HADI PRANOTO WIBOWO',      area: '' },
    { id: 'SM006', name: 'I KOMANG SUASTANA',        area: '' },
    { id: 'SM007', name: 'ACHMAD AFANDY',            area: '' },
  ],

  CATEGORY_COLORS: {
    'EBPI':          '#4f9cf9',
    'Metal & Gypsum':'#4caf82',
    'Other':         '#f59e0b',
    'Uncategorized': '#64748b',
  },
};
