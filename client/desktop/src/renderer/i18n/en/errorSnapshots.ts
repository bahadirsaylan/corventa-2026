// İngilizce sözlük — hata anı makine snapshot'ları (EXCEL 26, Ayarlar > Hata Raporları), 2026-11-01.

const en: Record<string, string> = {
  // Liste
  'HATA RAPORU #{id}': 'ERROR REPORT #{id}',
  'TETİKLEYİCİ': 'TRIGGER',
  'Hata anında makinenin durumu, aktif iş ve son log satırları kaydedilir. En yeni 500 kayıt saklanır.':
    'The machine state, active job and latest log lines are recorded at the moment of the error. The newest 500 records are kept.',
  'Kayıtlar alınamadı': 'Records could not be retrieved',
  'SEBEP': 'REASON',
  'İŞ': 'JOB',
  'S1 / S2 (bar)': 'S1 / S2 (bar)',
  'YAĞ (°C)': 'OIL (°C)',
  'ÖNCEKİ': 'PREVIOUS',
  'SAYFA {p} / {n}': 'PAGE {p} / {n}',
  'SONRAKİ': 'NEXT',
  'Kayıt yok': 'No records',

  // Tetikleyiciler
  'İŞ BAŞARISIZ': 'JOB FAILED',
  'ACİL STOP (YAZILIM)': 'EMERGENCY STOP (SOFTWARE)',
  'ACİL STOP (FİZİKSEL)': 'EMERGENCY STOP (PHYSICAL)',
  'GÜVENLİK ALARMI': 'SAFETY ALARM',
  'GÜVENLİK UYARISI': 'SAFETY WARNING',
  'ENCODER DURMASI': 'ENCODER STALL',

  // Detay
  'Kayıt alınamadı': 'Record could not be retrieved',
  'LİSTEYE DÖN': 'BACK TO LIST',
  'PLC HATA KODU': 'PLC ERROR CODE',
  'YOK': 'NONE',
  'ALARM': 'ALARM',
  'ALINDI': 'DONE',
  'ALINMADI': 'NOT DONE',
  'Makine durumu kaydedilmemiş': 'Machine state was not recorded',
  'PİSTONLAR VE ROTASYON': 'PISTONS AND ROTATION',
  'EKSEN': 'AXIS',
  'ENCODER (mm)': 'ENCODER (mm)',
  'FİZİKSEL (mm)': 'PHYSICAL (mm)',
  'HAM': 'RAW',
  'HAREKET': 'MOTION',
  'KONUMDA': 'IN POSITION',
  'VAR': 'YES',
  'CW': 'CW',
  'CCW': 'CCW',
  'BASINÇ VE SENSÖRLER': 'PRESSURE AND SENSORS',
  'S1 BASINÇ': 'S1 PRESSURE',
  'S2 BASINÇ': 'S2 PRESSURE',
  'S1 AKIŞ': 'S1 FLOW',
  'S2 AKIŞ': 'S2 FLOW',
  'GÜVENLİK GİRİŞLERİ': 'SAFETY INPUTS',
  'ACİL STOP': 'EMERGENCY STOP',
  'MOTOR TERMİK': 'MOTOR THERMAL',
  'FAN TERMİK': 'FAN THERMAL',
  'FAZ SIRASI': 'PHASE SEQUENCE',
  'SOL PARÇA SENSÖRÜ': 'LEFT PART SENSOR',
  'SAĞ PARÇA SENSÖRÜ': 'RIGHT PART SENSOR',
  'AKTİF İŞ': 'ACTIVE JOB',
  'Olay anında aktif iş yoktu': 'There was no active job at the time of the event',
  'METOT': 'METHOD',
  'PROFİL A / B / S': 'PROFILE A / B / S',
  'HEDEF ÇAP (mm)': 'TARGET DIAMETER (mm)',
  'PARÇA BOYU (mm)': 'PART LENGTH (mm)',
  'BAŞLANGIÇ': 'START',
  'SON ADIM': 'LAST STEP',
  'İŞ HATASI': 'JOB ERROR',
  'SON LOG SATIRLARI ({n})': 'LATEST LOG LINES ({n})',
  'Log satırı yok': 'No log lines',

  // İş durumu / metot / motor etiketleri
  'OLUŞTURULDU': 'CREATED',
  'HESAPLANIYOR': 'CALCULATING',
  'ÇALIŞIYOR': 'RUNNING',
  'İPTAL EDİLDİ': 'CANCELLED',
  'ÇOK AÇILI': 'MULTI-ANGLE',
  'SIVAMA': 'SIVAMA',
  'KAPALI': 'OFF',
  'BAŞLIYOR': 'STARTING',

  // Snapshot sebepleri (backend metinleri — translateProgress kuralları, i18n/progress.ts)
  'Acil stop (yazılım)': 'Emergency stop (software)',
  'Fiziksel acil stop basıldı': 'Physical emergency stop pressed',
  'Motor termik açtı': 'Motor thermal protection tripped',
  'Faz sırası hatası': 'Phase sequence error',
  'Fan termik açtı': 'Fan thermal protection tripped',
  'İş başarısız': 'Job failed',
  'PLC hata kodu: {name} ({n})': 'PLC error code: {name} ({n})',
  'Encoder durması: {axis} — {ms} ms içinde {mm} mm ilerleme (eşik {min} mm)':
    'Encoder stall: {axis} — {mm} mm progress within {ms} ms (limit {min} mm)',
  'Yağ sıcaklığı yüksek: {v}°C (uyarı eşiği {limit}°C)': 'Oil temperature high: {v}°C (warning limit {limit}°C)',
  'Yağ sıcaklığı çok yüksek: {v}°C (engel eşiği {limit}°C)': 'Oil temperature too high: {v}°C (block limit {limit}°C)',
  'Yağ sıcaklığı sensörü aralık dışı ({v}°C) — tel kopması / 4mA altı şüphesi':
    'Oil temperature sensor out of range ({v}°C) — suspected broken wire / below 4mA',
  'Yağ sıcaklığı sensörü aralık dışı ({v}°C) — kısa devre / 20mA üstü şüphesi':
    'Oil temperature sensor out of range ({v}°C) — suspected short circuit / above 20mA',
  '{s} basınç sensörü aralık dışı ({v} bar) — sensör / kablo kontrol edin':
    '{s} pressure sensor out of range ({v} bar) — check sensor / cable',
}

export default en
