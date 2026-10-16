// İngilizce sözlük — anahtar = Türkçe kaynak metin (birebir), değer = İngilizce.
// Değişkenli metinlerde {ad} yer tutucuları iki tarafta aynı olmalı.
const en: Record<string, string> = {
  // ── AppLayout ──
  'OTOMATİK BÜKÜM AYARLARI — ÜST EKRANDAN DEVAM EDİN': 'AUTOMATIC BENDING SETUP — CONTINUE ON THE UPPER SCREEN',

  // ── ConnectionBanner ──
  'MAKİNEYE BAĞLANILIYOR…': 'CONNECTING TO MACHINE…',
  'BAĞLANTI YENİDEN KURULUYOR…': 'RECONNECTING…',
  'MAKİNEYE BAĞLANILAMIYOR': 'CANNOT CONNECT TO MACHINE',
  'VERİ AKMIYOR — {sec}sn ÖNCESİNE AİT DURUM GÖSTERİLİYOR': 'NO DATA — SHOWING STATE FROM {sec}s AGO',

  // ── SideMenu + sideMenuCatalog ──
  'Menüyü aç': 'Open menu',
  'Menüyü kapat': 'Close menu',
  'Hızlı menü': 'Quick menu',
  'BÜKÜM SÜRÜYOR': 'BENDING IN PROGRESS',
  'YENİ BÜKÜM': 'NEW BENDING',
  'ANA EKRAN': 'HOME',
  'SERVİS': 'SERVICE',
  'AYARLAR': 'SETTINGS',
  'OTURUMU KAPAT': 'LOG OUT',

  // ── BendingBallsPanel (control) ──
  "BÜKÜM İPTAL TALEBİ GÖNDERİLDİ. JOB STATE TEMİZLENMEZSE SETTINGS'TEN KONTROL EDİN.":
    'BENDING CANCEL REQUEST SENT. IF THE JOB STATE IS NOT CLEARED, CHECK IN SETTINGS.',
  'İPTAL ÇAĞRISI BAŞARISIZ: {err}': 'CANCEL REQUEST FAILED: {err}',
  'ONAY BAŞARISIZ: {err}': 'CONFIRMATION FAILED: {err}',
  'Bukumu iptal et': 'Cancel bending',
  '■ İPTAL': '■ CANCEL',
  'YAN DAYAMA HAZIR MI?': 'IS THE SIDE SUPPORT READY?',
  '▶ DEVAM': '▶ CONTINUE',
  'BÜKÜM İPTAL EDİLECEK — TÜM HAREKET ANINDA DURDURULACAK': 'BENDING WILL BE CANCELLED — ALL MOTION WILL STOP IMMEDIATELY',
  '(Hidrolik motor + valfler kapatılacak, job state Failed olarak işaretlenmeyebilir)':
    '(Hydraulic motor + valves will be shut off, job state may not be marked as Failed)',
  'İPTAL ET': 'CANCEL BENDING',
  'VAZGEÇ': 'CANCEL',

  // ── BendingBallsPanel (monitor) ──
  'ROTASYON': 'ROTATION',
  'BÜKÜLEN PASO': 'CURRENT PASS',
  'PASO': 'PASS',
  'TAMAMLANAN: {n}': 'COMPLETED: {n}',
  'HAZIRLANIYOR…': 'PREPARING…',
  'BÜKÜM BAŞLATILIYOR': 'BENDING STARTING',
  'PASO {n} BÜKÜLÜYOR': 'BENDING PASS {n}',
  'PASO {n} BÜKÜLÜYOR · PASO {done} TAMAMLANDI': 'BENDING PASS {n} · PASS {done} COMPLETED',

  // ── BendingBall / JogSpeedControl / RotationJogButtons / SideSupportControls ──
  'jog ileri': 'jog forward',
  'jog geri': 'jog backward',
  'MANUEL HIZ': 'MANUAL SPEED',
  'hızı azalt': 'decrease speed',
  'hızı artır': 'increase speed',
  '(BÜKÜM AKTİF)': '(BENDING ACTIVE)',
  'Büküm sürerken manuel rotasyon yasak': 'Manual rotation is not allowed during bending',
  'Rotasyon {label} (basılı tut)': 'Rotation {label} (press and hold)',
  'İLERİ': 'FORWARD',
  'GERİ': 'BACKWARD',

  // ── ManualControlPad ──
  'BÜKÜM AKTİF — PİSTON VE ROTASYON KİLİTLİ · YAN DAYAMALAR SERBEST':
    'BENDING ACTIVE — PISTONS AND ROTATION LOCKED · SIDE SUPPORTS FREE',
  'Hızı azalt': 'Decrease speed',
  'Hızı artır': 'Increase speed',
  'ROTASYON CW': 'ROTATION CW',
  'ROTASYON CCW': 'ROTATION CCW',
  'ÜST': 'UPPER',
  'ALT': 'LOWER',
  'SOL': 'LEFT',
  'SAĞ': 'RIGHT',
  'Sol': 'Left',
  'Sağ': 'Right',
  'ileri': 'forward',
  'geri': 'backward',
  'Hidrolik motoru başlat': 'Start hydraulic motor',
  'Hidrolik motoru durdur': 'Stop hydraulic motor',
  'MOTOR ÇALIŞIYOR': 'MOTOR RUNNING',
  'BAŞLIYOR…': 'STARTING…',
  'HİDROLİK MOTOR': 'HYDRAULIC MOTOR',

  // ── BottomStatsPanel ──
  'ACİL DURDURMA BASILI — MAKİNE KİLİTLİ': 'EMERGENCY STOP PRESSED — MACHINE LOCKED',
  'MOTOR TERMAL KORUMA AKTİF': 'MOTOR THERMAL PROTECTION ACTIVE',
  'FAN TERMAL KORUMA AKTİF': 'FAN THERMAL PROTECTION ACTIVE',
  'YAĞ SICAKLIĞI YÜKSEK ({v}°C)': 'OIL TEMPERATURE HIGH ({v}°C)',
  'YAĞ BASINCI OKUMASI YOK': 'NO OIL PRESSURE READING',
  'YAĞ SEVİYESİ DÜŞÜK (%{v})': 'OIL LEVEL LOW ({v}%)',
  'YAĞ NEMİ YÜKSEK (%{v})': 'OIL HUMIDITY HIGH ({v}%)',
  'SİSTEM NORMAL — AKTİF UYARI YOK': 'SYSTEM NORMAL — NO ACTIVE WARNINGS',
  'Hata kayıtlarını aç': 'Open error logs',
  'HATA KAYITLARI': 'ERROR LOGS',

  // ── ArcBendingStrip ──
  '{i} · DÜZLÜK — PARÇA İLERLETİLİYOR': '{i} · STRAIGHT — FEEDING PART',
  '{i} · RADYUS R {r} BÜKÜLÜYOR': '{i} · BENDING RADIUS R {r}',
  'ÇOK AÇILI BÜKÜM': 'MULTI-ANGLE BENDING',

  // ── ErrorLogsModal ──
  'Hata Kayıtları': 'Error logs',
  'Son {n} kayıt gösteriliyor': 'Showing last {n} records',
  'Kapat': 'Close',
  'KRİTİK': 'CRITICAL',
  'HATA': 'ERROR',
  'UYARI': 'WARNING',
  'BİLGİ': 'INFO',
  'Kayıt yok': 'No records',
  'TÜM RAPORLAR →': 'ALL REPORTS →',
  'KAPAT': 'CLOSE',
  'HİDROLİK': 'HYDRAULIC',
  'SENSÖR': 'SENSOR',
  'GÜVENLİK': 'SAFETY',
  'GENEL': 'GENERAL',
  'Hidrolik motor termal koruma tetiklendi': 'Hydraulic motor thermal protection triggered',
  'SLPIS sensör ADC dalgalanma (>50 raw)': 'SLPIS sensor ADC fluctuation (>50 raw)',
  'Acil durdurma tetiklendi — Job #128 iptal': 'Emergency stop triggered — Job #128 cancelled',
  'PLC read timeout 3× (bağlantı yeniden kuruldu)': 'PLC read timeout 3× (connection re-established)',
  'Arc segment ölçüm tolerans dışı (0.24mm)': 'Arc segment measurement out of tolerance (0.24mm)',
  'Gönye tamamlandı — L:3.75 R:3.75 U:0 L:10.51': 'Homing completed — L:3.75 R:3.75 U:0 L:10.51',
  'S1 basınç düştü (<10 bar / 3sn)': 'S1 pressure dropped (<10 bar / 3s)',
  'Makine açıldı — versiyon 2026.5.15': 'Machine started — version 2026.5.15',

  // ── DashboardPage ──
  'OTOMATIK': 'AUTOMATIC',
  'BUKUM': 'BENDING',
  'MANUEL': 'MANUAL',
  'MANUEL / YARI OTO': 'MANUAL / SEMI-AUTO',
  'Servis ağı': 'Service network',

  // ── OilStatsList ──
  'YAĞ SICAKLIĞI': 'OIL TEMPERATURE',
  'YAĞ SEVİYESİ': 'OIL LEVEL',
  'NORMAL': 'NORMAL',
  'DÜŞÜK': 'LOW',
  'YAĞ NEMİ': 'OIL HUMIDITY',
  'YAĞ BASINCI': 'OIL PRESSURE',
  'AKIŞ S1 / S2': 'FLOW S1 / S2',
  'TEMAS SENSÖRÜ': 'PART SENSOR',
  'AKTİF': 'ACTIVE',
  'PASİF': 'INACTIVE',
  'ACİL DURDURMA': 'EMERGENCY STOP',
  'BASILI': 'PRESSED',
  'FAAL': 'RUNNING',
  'TERMAL': 'THERMAL',
}

export default en
