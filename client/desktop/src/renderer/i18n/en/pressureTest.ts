// İngilizce sözlük — Admin Ayarları > TEST > BASINÇ DÜŞÜŞ TESTİ (2026-11-19).
// Anahtar = Türkçe kaynak metin (birebir). Başka dosyada tanımlı olanlar burada tekrarlanmaz.
const en: Record<string, string> = {
  'BULUT & YAĞ ISITMA': 'CLOUD & OIL HEATING',
  'BASINÇ DÜŞÜŞ TESTİ': 'PRESSURE DROP TEST',
  "Makineyi stage'e alıp parçayı elle sıkıştırın, sonra testi başlatın. Seçilen top kurs sonuna kadar ileri gider; basınç aniden düşerse durur. Buradaki eşikler kaydedilmez — sadece bu test için.":
    'Move the machine to a stage and clamp the part by hand, then start the test. The selected roll moves forward up to the end of stroke and stops if the pressure suddenly drops. The thresholds here are not saved — they apply to this test only.',
  'TEST EDİLEN TOP': 'ROLL UNDER TEST',
  'TESTİ BAŞLAT': 'START TEST',
  'Test başlatılamadı': 'The test could not be started',
  'Büküm devam ediyor — test başlatılamaz.': 'Bending in progress — the test cannot be started.',
  'TEST SÜRÜYOR': 'TEST RUNNING',
  'DÜŞÜŞ ALGILANDI': 'DROP DETECTED',
  ALGILANMADI: 'NOT DETECTED',
  'BASINÇ S1 / S2': 'PRESSURE S1 / S2',
  'TEPE S1 / S2': 'PEAK S1 / S2',
  'DÜŞÜŞ S1 / S2': 'DROP S1 / S2',
  'EN BÜYÜK DÜŞÜŞ': 'LARGEST DROP',
  'EN DÜŞÜK TABAN': 'MINIMUM BASE',
  'Son {n} sn': 'Last {n} s',
  'Kullanılan eşikler: {d} bar · {w} ms · taban {b} bar (kayıtlı ayar: {sd} bar · {sw} ms · {sb} bar)':
    'Thresholds used: {d} bar · {w} ms · base {b} bar (saved setting: {sd} bar · {sw} ms · {sb} bar)',
  'Kayıt dosyası (CSV):': 'Log file (CSV):',
  'Henüz test yapılmadı.': 'No test has been run yet.',
  'Test sürüyor — top ileri gidiyor, basınç izleniyor.': 'Test running — the roll is moving forward, pressure is being monitored.',
  'en büyük düşüş S1 {s1} bar · S2 {s2} bar': 'largest drop S1 {s1} bar · S2 {s2} bar',
  'Top durduruldu ve geri çekilmedi — gerekirse elle geri alın.':
    'The roll was stopped and NOT retracted — retract it manually if needed.',
  "BASINÇ DÜŞÜŞÜ ALGILANDI — {sensor} {from}→{to} bar, {pos} mm'de": 'PRESSURE DROP DETECTED — {sensor} {from}→{to} bar at {pos} mm',
  'ALGILANMADI — top ilerlemedi ({pos} mm) ({max})': 'NOT DETECTED — the roll stopped advancing ({pos} mm) ({max})',
  'KURS SONUNA KADAR ALGILANMADI ({max})': 'NOT DETECTED UP TO THE END OF STROKE ({max})',
}

export default en
