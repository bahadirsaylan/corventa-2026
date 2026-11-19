// İngilizce sözlük — UYARI KUYRUĞU + YAĞ KİRLİLİK UYARISI + UYARI KAYITLARI (2026-11-19).
// Anahtar = Türkçe kaynak metin (birebir). Başka dosyada tanımlı olanlar burada tekrarlanmaz.
const en: Record<string, string> = {
  // yağ kirlilik uyarısı penceresi + alt şerit
  'YAĞ KİRLİLİK UYARISI': 'OIL CONTAMINATION WARNING',
  'KİRLİLİK SENSÖRÜ {k}': 'CONTAMINATION SENSOR {k}',
  'FİLTRE KİRLİ VEYA KİRLİLİK SENSÖRÜ / KABLOSU ARIZALI — servis / bakım ekibine haber verin; devam ederseniz pistonlar ve hidrolik sistem zarar görebilir.':
    'FILTER DIRTY OR CONTAMINATION SENSOR / CABLE FAULTY — notify the service / maintenance team; if you continue, the pistons and the hydraulic system may be damaged.',
  'Bu uyarıya verdiğiniz cevap kullanıcı adınız ve saatiyle kayda geçer.':
    'Your response to this warning is recorded with your user name and the time.',
  'ANLADIM, KAPAT': 'UNDERSTOOD, CLOSE',
  'YAĞ KİRLİLİĞİ: {list} — FİLTRE KİRLİ / SENSÖR ARIZALI': 'OIL CONTAMINATION: {list} — FILTER DIRTY / SENSOR FAULT',

  // UYARI KAYITLARI sayfası
  'UYARI KAYITLARI': 'WARNING LOG',
  'ÖZET — KAPATILAN UYARILAR': 'SUMMARY — DISMISSED WARNINGS',
  'Henüz kapatılmış uyarı yok': 'No dismissed warnings yet',
  '{n} KEZ KAPATILDI — DÜZELMEDİ': 'DISMISSED {n} TIMES — NOT FIXED',
  'DÜZELDİ — TOPLAM {n} KEZ KAPATILDI': 'FIXED — DISMISSED {n} TIMES IN TOTAL',
  'SON: {when} ({user})': 'LAST: {when} ({user})',
  'KULLANICI / ROL': 'USER / ROLE',
  CEVAP: 'RESPONSE',
  KAÇINCI: 'COUNT',
  '{n}. KEZ': '#{n}',
  'ÖNCESİNDE {n} KEZ KAPATILDI': 'DISMISSED {n} TIMES BEFORE',
  GÖSTERİLDİ: 'SHOWN',
  'CEVAP ZAMANI': 'RESPONSE TIME',
  'KİRLİLİK K1 / K2 / K3': 'CONTAMINATION K1 / K2 / K3',
  'YAĞ SICAKLIĞI / SEVİYESİ': 'OIL TEMPERATURE / LEVEL',
  'GÖSTERİLEN METİN (KAYIT)': 'TEXT SHOWN (AS RECORDED)',
  UYARI: 'WARNING',

  // uyarı türleri
  'YAĞ KİRLİLİĞİ': 'OIL CONTAMINATION',
  'SENSÖR {k}': 'SENSOR {k}',
  '{n} KEZDEN SONRA': 'AFTER {n}×',
  'BAKIM GECİKMESİ': 'MAINTENANCE OVERDUE',
  'BAKIM MODU OTOMATİK KAPANDI': 'MAINTENANCE MODE AUTO-CLOSED',
  'GÜVENLİK KONTROLÜ': 'SAFETY CHECK',

  // cevaplar
  KAPATTI: 'DISMISSED',
  'DEVAM ETTİ': 'CONTINUED',
  'TAMAM DEDİ': 'ACKNOWLEDGED',
  'BAKIM SAYFASINI AÇTI': 'OPENED MAINTENANCE',
  'BAKIMI BİTİRDİ': 'FINISHED MAINTENANCE',
  'SERVİS TALEBİ AÇTI': 'OPENED SERVICE REQUEST',
  'DÜZELDİ': 'FIXED',

  // anahtarlar
  'YAĞ SICAKLIĞI ÇOK YÜKSEK': 'OIL TEMPERATURE CRITICAL',
  'YAĞ SICAKLIĞI SENSÖRÜ': 'OIL TEMPERATURE SENSOR',
  'S1 BASINÇ SENSÖRÜ': 'S1 PRESSURE SENSOR',
  'S2 BASINÇ SENSÖRÜ': 'S2 PRESSURE SENSOR',
}

export default en
