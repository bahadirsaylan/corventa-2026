// İngilizce sözlük — ölçüm ve duraklama süreleri (EXCEL 25), 2026-11-01.

const en: Record<string, string> = {
  // Admin Ayarları → ÖLÇÜM & SENSÖR → SÜRELER
  'SÜRELER': 'TIMINGS',
  'Ölçüm ve duraklama süreleri. Boş bırakılırsa makinenin bugüne kadarki sabit değeri kullanılır. Değiştirdikten sonra ölçüm sonuçlarını eski değerle karşılaştırın.':
    'Measurement and pause durations. If left empty, the machine uses its previous fixed value. After changing, compare measurement results with the old value.',
  'ÖLÇÜM PNÖMATİĞİ UZATMA BEKLEMESİ': 'MEASURING PNEUMATIC EXTEND WAIT',
  'Ölçüm çubuğunun parçaya oturması için. Boş = 5000 ms.': 'For the measuring rod to settle on the part. Empty = 5000 ms.',
  'ÖLÇÜM PNÖMATİĞİ GERİ ÇEKME BEKLEMESİ': 'MEASURING PNEUMATIC RETRACT WAIT',
  'Ölçüm çubuğunun tam geri çekilmesi için. Boş = 5000 ms.': 'For the measuring rod to fully retract. Empty = 5000 ms.',
  'ÖLÇÜM ÖRNEKLEME SÜRESİ': 'MEASUREMENT SAMPLING TIME',
  'Sensörün okunduğu süre. Boş = 5000 ms.': 'Time during which the sensor is read. Empty = 5000 ms.',
  'ÇEMBER — BOŞLUK ALMA BASINÇ BEKLEMESİ': 'CIRCLE — SLACK PICKUP PRESSURE WAIT',
  'Geri esneme düzeltmesinde basınçla boşluk aldıktan sonra. Boş = 1000 ms.':
    'After pressure-based slack pickup during springback correction. Empty = 1000 ms.',
  'ÇEMBER — İTERASYON ARASI DURAKLAMA': 'CIRCLE — PAUSE BETWEEN ITERATIONS',
  'Geri esneme düzeltmesinde her iterasyon sonunda. Boş = 500 ms.': 'At the end of each springback correction iteration. Empty = 500 ms.',
}

export default en
