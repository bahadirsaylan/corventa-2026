// İngilizce sözlük — Kullanma Süreleri ekranı (MachineUsageHoursPage, 5 kategori).
// Anahtar = Türkçe kaynak metin (birebir), değer = İngilizce. {ad} yer tutucuları iki tarafta aynı.
const en: Record<string, string> = {
  'BASINÇ (AKTİF KULLANIM)': 'PRESSURE (ACTIVE USE)',
  'Tam oto / yarı oto bükümün başlangıcı ile bitişi arasında geçen süre.':
    'Time between the start and the end of fully / semi automatic bending.',
  STANDBY: 'STANDBY',
  'Hidrolik motor çalışırken büküm yapılmadan beklenen süre.':
    'Time spent waiting with the hydraulic motor running and no bending.',
  'HATA MODLARI': 'ERROR MODES',
  'Makinenin hata, alarm veya acil stop durumunda geçirdiği süre.':
    'Time the machine spent in error, alarm or emergency stop state.',
  BAKIM: 'MAINTENANCE',
  'Bakım modu açıkken geçen süre.': 'Time spent with maintenance mode on.',
  SERVİS: 'SERVICE',
  'Başlatılmış servis müdahalesi süresince geçen süre.': 'Time spent during a started service intervention.',
  'sa:dk': 'h:min',
  BUGÜN: 'TODAY',
  'SON {n} GÜN': 'LAST {n} DAYS',
  'Son {n} gün: {from} – {to}': 'Last {n} days: {from} – {to}',
  'Güncellendi: {time}': 'Updated: {time}',
  'Kullanım süreleri alınamadı: {err}': 'Usage times could not be loaded: {err}',
  'TEKRAR DENE': 'TRY AGAIN',
  'Güncelleme başarısız, son alınan veri gösteriliyor: {err}': 'Refresh failed, showing last received data: {err}',
  'Henüz kullanım kaydı yok. Süreler makine çalıştıkça 30 sn aralıklarla kaydedilir.':
    'No usage recorded yet. Times are saved every 30 s while the machine runs.',
}

export default en
