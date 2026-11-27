// İngilizce sözlük — Admin Ayarları > TEST sekmesi (bulut senkronize + yağ ısıtma programı).
// Anahtar = Türkçe kaynak metin (birebir). Başka dosyada tanımlı olanlar burada tekrarlanmaz.
const en: Record<string, string> = {
  TEST: 'TEST',
  'YAĞ ISITMA AYARLARI': 'OIL HEATING SETTINGS',
  'Önce gönye alınır; sonra 4 top aynı anda ileri-geri (sağ/sol: max kurs − 20 mm, üst/alt: 50 mm) ve rotasyon her turda yön değiştirerek döner — yağ hedef sıcaklığa ulaşana kadar.':
    'The reference (gönye) is taken first; then all 4 rolls move back and forth together (right/left: max stroke − 20 mm, upper/lower: 50 mm) while rotation reverses every pass — until the oil reaches the target temperature.',
  'HEDEF YAĞ SICAKLIĞI': 'TARGET OIL TEMPERATURE',
  'HAREKET HIZI': 'MOVEMENT SPEED',
  'EN UZUN SÜRE': 'MAXIMUM DURATION',
  'Hedefe ulaşılmasa da bu sürede program durur.': 'The program stops after this time even if the target is not reached.',
  'BULUT SENKRONİZASYONU': 'CLOUD SYNCHRONIZATION',
  'Bekleyen kayıtlar hemen buluta gönderilir; ayarlar, kalıplar ve reçeteler hemen çekilir (günlük döngüyü beklemez). Makine buluta bağlı değilse çalışmaz.':
    'Pending records are sent to the cloud now; settings, molds and recipes are pulled now (without waiting for the daily cycle). Does not work if the machine is not connected to the cloud.',
  'Senkronizasyon başlatılamadı': 'Synchronization could not be started',
  'YAĞ ISITMA PROGRAMI': 'OIL HEATING PROGRAM',
  'Makinede parça OLMAMALI ve hidrolik motor çalışıyor olmalı. Program önce gönye alır, sonra toplar ileri-geri hareket eder; DURDUR tüm hareketi keser.':
    'There must be NO part in the machine and the hydraulic motor must be running. The program takes the reference first, then the rolls move back and forth; STOP halts all motion.',
  'Büküm devam ediyor — yağ ısıtma başlatılamaz.': 'Bending in progress — oil heating cannot be started.',
  'Yağ ısıtma başlatılamadı': 'Oil heating could not be started',
  'YAĞ ISITMAYI BAŞLAT': 'START OIL HEATING',
  'GÖNYE ALINIYOR': 'TAKING REFERENCE',
  ISITILIYOR: 'HEATING',
  'TOPLAR DÖNÜYOR': 'ROLLS RETURNING',
  DURDURULDU: 'STOPPED',
  Yağ: 'Oil',
  hedef: 'target',
}

export default en
