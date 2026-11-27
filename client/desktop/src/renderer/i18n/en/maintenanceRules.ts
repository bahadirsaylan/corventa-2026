// İngilizce sözlük — Bakım kuralları (2026-11-01): periyot minimum bakım süreleri, bakım modu
// hatırlatması (DEVAM EDİYOR MUSUNUZ?) + otomatik kapanma bilgisi, Admin Ayarları > BAKIM KURALLARI.
// Anahtar = Türkçe kaynak metin (birebir), değer = İngilizce. {ad} yer tutucuları iki tarafta aynı.
const en: Record<string, string> = {
  // Bakım modu ekranı + Bakım Süresi sayfası — minimum süre
  'MİN. BAKIM SÜRESİ:': 'MIN. MAINTENANCE TIME:',
  '{n} DK': '{n} MIN',
  '{n} DK SONRA': 'IN {n} MIN',
  'HATIRLATMA: {time}': 'REMINDER: {time}',
  '{period} BAKIM TAMAMLANDI OLARAK KAYDEDİLDİ': '{period} MAINTENANCE RECORDED AS DONE',
  'BAKIM YAPILDI demek için önce BAKIM MODUNU açın.':
    'Turn on MAINTENANCE MODE first to mark maintenance as DONE.',
  'BAKIM YAPILDI işaretlemek için önce BAKIM MODUNU açın. Her bakımın minimum süresi bakım modu açıldıktan sonra dolmalıdır.':
    'Turn on MAINTENANCE MODE first to mark maintenance as DONE. The minimum time of each maintenance must pass after maintenance mode is turned on.',

  // Hatırlatma penceresi
  '{m} DK': '{m} MIN',
  '{h} SAAT {m} DK': '{h} H {m} MIN',
  'BAKIM MODU HATIRLATMASI': 'MAINTENANCE MODE REMINDER',
  'BAKIM MODU {duration} DİR AÇIK — DEVAM EDİYOR MUSUNUZ?':
    'MAINTENANCE MODE HAS BEEN ON FOR {duration} — ARE YOU STILL WORKING?',
  'Cevap verilmezse bakım modu otomatik olarak kapatılacak.':
    'If there is no answer, maintenance mode will be turned off automatically.',
  'OTOMATİK KAPANMAYA KALAN': 'TIME UNTIL AUTO OFF',
  'OTOMATİK KAPATILIYOR…': 'TURNING OFF AUTOMATICALLY…',
  'BAKIMI BİTİR': 'FINISH MAINTENANCE',

  // Otomatik kapanma bilgisi
  'BAKIM MODU OTOMATİK KAPATILDI': 'MAINTENANCE MODE TURNED OFF AUTOMATICALLY',
  'Hatırlatmaya süresi içinde cevap verilmediği için bakım modu {time} itibarıyla kapatıldı. Bakım sürüyorsa bakım modunu yeniden açın.':
    'The reminder was not answered in time, so maintenance mode was turned off at {time}. If maintenance is still in progress, turn maintenance mode on again.',

  // Admin Ayarları > BAKIM KURALLARI
  'BAKIM KURALLARI': 'MAINTENANCE RULES',
  'Bakım kuralları okunamadı': 'Maintenance rules could not be read',
  'Bakım kuralları tüm kullanıcılar için hemen geçerli olur.': 'Maintenance rules take effect immediately for all users.',
  'MİNİMUM BAKIM SÜRELERİ': 'MINIMUM MAINTENANCE TIMES',
  'Bakım modu en az bu kadar açık kalmadan ilgili bakım TAMAMLANDI olarak işaretlenemez (modu açıp hemen kapatmayı önler).':
    'The maintenance cannot be marked as DONE unless maintenance mode stays on at least this long (prevents turning the mode on and off right away).',
  'GÜNLÜK BAKIM': 'DAILY MAINTENANCE',
  'HAFTALIK BAKIM': 'WEEKLY MAINTENANCE',
  'AYLIK BAKIM': 'MONTHLY MAINTENANCE',
  '6 AYLIK BAKIM': '6-MONTH MAINTENANCE',
  '12 AYLIK BAKIM': '12-MONTH MAINTENANCE',
  'Bakım modu bu süre kadar açık kalınca "DEVAM EDİYOR MUSUNUZ?" penceresi açılır. Cevap verilmezse otomatik kapanma süresi sonunda bakım modu kendiliğinden kapanır.':
    'When maintenance mode stays on this long, the "ARE YOU STILL WORKING?" window opens. If there is no answer, maintenance mode turns itself off when the auto-off time ends.',
  'HATIRLATMA SÜRESİ': 'REMINDER TIME',
  'Bakım modu açıldıktan veya DEVAM ET ile uzatıldıktan sonra.': 'After maintenance mode is turned on or extended with CONTINUE.',
  'OTOMATİK KAPANMA SÜRESİ': 'AUTO-OFF TIME',
  'Hatırlatma açıldıktan sonra cevap beklenen süre.': 'How long to wait for an answer after the reminder opens.',
}

export default en
