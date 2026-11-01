// İngilizce sözlük — bulut v2 yönetilen veriler: garanti, bakım politikası notu, kalite kontrol checklist'i,
// karşılama mesajı, servis talebi bulut durumu, sertifika kaynağı (BULUT_API_V2.md §1, §6), 2026-11-02.

const en: Record<string, string> = {
  'BULUT': 'CLOUD',
  'ÖNBELLEK': 'CACHE',
  'YEREL': 'LOCAL',
  'KAYNAK': 'SOURCE',
  'BULUTTAN YÖNETİLİYOR': 'MANAGED FROM THE CLOUD',

  // Garanti
  'KAPSANAN ÜNİTELER': 'COVERED UNITS',
  'BULUT · MAKİNEYE ÖZEL': 'CLOUD · MACHINE-SPECIFIC',
  'BULUT · ÜRETİCİ VARSAYILANI': 'CLOUD · MANUFACTURER DEFAULT',
  '{date} · {n} gün kaldı': '{date} · {n} days left',

  // Bakım kuralları
  'Bakım kuralları buluttaki politikadan gelir; burada yapılan değişiklik bir sonraki senkronizasyonda buluttaki değerle değiştirilir.': 'Maintenance rules come from the cloud policy; changes made here are replaced by the cloud value on the next sync.',

  // Checklist (kalite kontrol)
  'SEVKİYAT ÖNCESİ KALİTE KONTROL': 'PRE-SHIPMENT QUALITY CONTROL',
  'Kalite kontrolcü adı': 'Quality inspector name',
  'KAYDET VE GÖNDER': 'SAVE AND SEND',
  'MADDE NOTU': 'ITEM NOTE',
  'Kontrol sonucu kaydedildi ({at})': 'Inspection result saved ({at})',
  '{n} MADDE İŞARETLENMEDİ. KONTROL SONUCU YİNE DE GÖNDERİLSİN Mİ': '{n} ITEMS ARE NOT CHECKED. SEND THE INSPECTION RESULT ANYWAY',
  'Kontrolcü adı zorunlu': 'Inspector name is required',
  'Elektrik': 'Electrical',
  'Ölçüm': 'Measurement',
  'Büküm': 'Bending',

  // Karşılama mesajı
  'Bu mesaj Corventa bulut panelinden değiştirilir; makinede düzenlenemez.': 'This message is changed from the Corventa cloud panel; it cannot be edited on the machine.',

  // Servis talepleri
  'ATANAN': 'ASSIGNED TO',
  'ATANDI': 'ASSIGNED',
  'TAMAMLANDI': 'COMPLETED',
}

export default en
