// İngilizce sözlük — bakım kilidi (EXCEL 34: vadeden 21 gün geçince büküm başlatılamaz), 2026-11-01.

const en: Record<string, string> = {
  // Admin Ayarları → MAKİNE → BAKIM KİLİDİ
  'BAKIM KİLİDİ': 'MAINTENANCE LOCK',
  'Bir bakımın vadesinin üzerinden 21 gün geçince (4. haftanın 1. günü) otomatik / yarı otomatik büküm başlatılamaz. Manuel mod, tahliye ve bakım modu açık kalır; geciken bakım tamamlanınca kilit kalkar.':
    'When a maintenance is 21 days past its due date (1st day of the 4th week), automatic / semi-automatic bending cannot be started. Manual mode, unloading and maintenance mode stay available; the lock is lifted once the overdue maintenance is completed.',
  'KAPALI: geciken bakım sadece uyarı verir.': 'OFF: overdue maintenance only gives a warning.',
  // Alt panel şeridi / rozet
  'KİLİTLİ — BÜKÜM BAŞLATILAMAZ': 'LOCKED — BENDING CANNOT START',
  'BAKIM KİLİTLİ: {n} GÜN GECİKME': 'MAINTENANCE LOCKED: {n} DAYS OVERDUE',
  // Girişteki bakım uyarı penceresi
  'BAKIM KİLİDİ AKTİF — geciken bakım tamamlanana kadar otomatik / yarı otomatik büküm başlatılamaz. Manuel mod ve tahliye kullanılabilir.':
    'MAINTENANCE LOCK ACTIVE — automatic / semi-automatic bending cannot be started until the overdue maintenance is completed. Manual mode and unloading are available.',
  // Parça yükleme ekranı (büküm başlatma)
  'BAKIM KİLİDİ — BÜKÜM BAŞLATILAMAZ': 'MAINTENANCE LOCK — BENDING CANNOT START',
  '{period} BAKIM VADESİNİN ÜZERİNDEN {n} GÜN GEÇTİ': '{period} MAINTENANCE IS {n} DAYS PAST DUE',
  'Geciken bakımı yapıp Bakım Süresi sayfasından tamamlandı olarak işaretleyin. Manuel mod ve tahliye kullanılabilir.':
    'Perform the overdue maintenance and mark it as completed on the Maintenance Time page. Manual mode and unloading are available.',
  // Backend büküm başlatma 409 mesajı (translateProgress)
  'BAKIM KİLİDİ: {periods} bakımı yapılmadan büküm başlatılamaz': 'MAINTENANCE LOCK: bending cannot start until the {periods} maintenance is done',
}

export default en
