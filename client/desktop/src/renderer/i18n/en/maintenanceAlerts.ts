// İngilizce sözlük — Bakım uyarıları (UI madde 19): alt uyarı şeridi, girişten sonraki bakım uyarı
// penceresi, BAKIM MODU AKTİF ekranı ve Bakım Süresi sayfasındaki hafta kademeleri.
// Anahtar = Türkçe kaynak metin (birebir), değer = İngilizce. {ad} yer tutucuları iki tarafta aynı.
const en: Record<string, string> = {
  // Hafta kademeleri (services/maintenanceStatus.ts → maintenanceTierTitle)
  '1. HAFTA — BAKIM HATIRLATMASI': 'WEEK 1 — MAINTENANCE REMINDER',
  '2. HAFTA — BAKIM UYARISI': 'WEEK 2 — MAINTENANCE WARNING',
  '3. HAFTA — KRİTİK BAKIM UYARISI': 'WEEK 3 — CRITICAL MAINTENANCE WARNING',
  'BAKIM KİLİDİ YAKINDA': 'MAINTENANCE LOCK SOON',

  // Alt uyarı şeridi
  '{tier}: {period} BAKIM {n} GÜN GECİKTİ': '{tier}: {period} MAINTENANCE {n} DAYS OVERDUE',
  'BAKIM: {n} GÜN GECİKME': 'MAINTENANCE: {n} DAYS OVERDUE',

  // Girişten sonraki bakım uyarı penceresi
  'Bakım zamanı geçti. Lütfen bakımı yapıp Bakım Süresi sayfasından işaretleyin.':
    'Maintenance is overdue. Please carry out the maintenance and mark it on the Maintenance Period page.',
  '{period} BAKIM': '{period} MAINTENANCE',
  '3 haftadan uzun süredir yapılmayan bakım var — bakım kilidi yakında devreye girecek.':
    'Maintenance has been overdue for more than 3 weeks — the maintenance lock will be activated soon.',
  'BAKIM SAYFASI': 'MAINTENANCE PAGE',

  // BAKIM MODU AKTİF ekranı
  'BAKIM MODU AKTİF': 'MAINTENANCE MODE ACTIVE',
  'Bakım modunda geçen süre "BAKIM" kullanım süresine yazılır.':
    'Time spent in maintenance mode is recorded as "MAINTENANCE" usage time.',
  'BAKIM MODUNDA GEÇEN SÜRE': 'TIME IN MAINTENANCE MODE',
  '{d} GÜN {hms}': '{d} DAYS {hms}',
  'BAKIM TAMAMLANDI': 'MAINTENANCE DONE',
  'BAKIM MODUNDAN ÇIK': 'EXIT MAINTENANCE MODE',
  'KÜÇÜLT — SAYFALARA DÖN': 'MINIMIZE — BACK TO PAGES',
  DETAY: 'DETAILS',
  'İŞLENİYOR…': 'PROCESSING…',

  // Bakım Süresi sayfası bilgi notu
  'Yaklaşan bakımlar (7 gün kala) sarı işaretlenir. Geciken bakımlar: 1. hafta yeşil hatırlatma, 2. hafta sarı uyarı, 3. hafta kırmızı kritik.':
    'Upcoming maintenance (7 days before) is marked yellow. Overdue maintenance: week 1 green reminder, week 2 yellow warning, week 3 red critical.',
}

export default en
