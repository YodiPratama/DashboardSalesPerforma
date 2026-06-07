const CONFIG = {
  GAS_API_URL: '',

  // ── GitHub Raw URLs — semua data langsung dari repo ─────────────────────────
  // Update data: edit file → commit + push via GitHub Desktop → dashboard auto-refresh
  GITHUB_ITEMSALE_URL: 'https://raw.githubusercontent.com/YodiPratama/DashboardSalesPerforma/main/ITEMSALE.TXT',
  GITHUB_TARGET_URL:   'https://raw.githubusercontent.com/YodiPratama/DashboardSalesPerforma/main/TARGET.csv',
  GITHUB_KATEGORI_URL: 'https://raw.githubusercontent.com/YodiPratama/DashboardSalesPerforma/main/KategoriItem.csv',

  // ── Google Sheets CSV URLs — tidak dipakai, semua sudah dari GitHub ─────────
  SHEETS_SALES_URL:    '',
  SHEETS_KATEGORI_URL: '',
  SHEETS_TARGET_URL:   '',

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
