// İngilizce sözlük — sıkıştırma v2 (hedefte temas + yolda acil stop), 2026-11-01.

const en: Record<string, string> = {
  // Backend mesajı (ClampContactAtTarget) — tahliye ekranı + ilerleme şeridi
  'SIKIŞTIRMA ACİL STOP: hedefe ulaşmadan basınç {n} bar arttı — parça ölçüsünü ve önündeki engeli kontrol edin':
    'CLAMPING EMERGENCY STOP: pressure rose {n} bar before reaching the target — check the part size and any obstacle in front of it',
  'ACİL STOP UYGULANDI — PARÇAYI ÇIKARIN, ÖLÇÜYÜ VE ÖNÜNDEKİ ENGELİ KONTROL EDİP İŞİ YENİDEN BAŞLATIN':
    'EMERGENCY STOP APPLIED — REMOVE THE PART, CHECK THE SIZE AND ANY OBSTACLE, THEN RESTART THE JOB',
  // Admin Ayarları → SIKIŞTIRMA
  'SIKIŞTIRMA ALGORİTMASI': 'CLAMPING ALGORITHM',
  'Üst top yavaşlama noktasına (hedef − YAVAŞLAMA MESAFESİ) kadar hızlı iner, sonra YAVAŞ HIZ ile 1 bar temas artışında durur. HEDEFTE TEMAS seçiliyse yavaşlama noktasına varmadan basınç belirlenen kadar artarsa ACİL STOP yapılır. YAVAŞLAMA MESAFESİ 0 = eski davranış (hedefte / %95 noktasında yavaşlama).':
    'The upper roll moves down fast to the slowdown point (target − SLOWDOWN DISTANCE), then stops at a 1 bar contact rise at SLOW SPEED. With CONTACT AT TARGET, an EMERGENCY STOP is triggered if pressure rises by the set amount before the slowdown point. SLOWDOWN DISTANCE 0 = old behaviour (slow down at the target / at 95%).',
  'YAVAŞLAMA MESAFESİ': 'SLOWDOWN DISTANCE',
  'Hedefe bu kadar mm kala yavaşlar ve temas arar (ör. 1 veya 2). 0 = eski davranış.': 'Slows down and looks for contact this many mm before the target (e.g. 1 or 2). 0 = old behaviour.',
  'YAVAŞ HIZ': 'SLOW SPEED',
  'Yavaşlama noktasından sonraki temas arama hızı. Sadece YAVAŞLAMA MESAFESİ 0 değilken kullanılır.': 'Contact-search speed after the slowdown point. Used only when SLOWDOWN DISTANCE is not 0.',
  'SIKIŞTIRMA YÖNTEMİ': 'CLAMPING METHOD',
  'ESKİ: hedefin %95 noktasında yavaşlar, acil stop koruması yok.': 'OLD: slows down at 95% of the target, no emergency stop protection.',
  'HEDEFTE TEMAS': 'CONTACT AT TARGET',
  'ESKİ (%95)': 'OLD (95%)',
  'YOLDA ACİL STOP BASINÇ ARTIŞI': 'TRAVEL EMERGENCY STOP PRESSURE RISE',
  'Hedefe giderken serbest yürüme basıncına göre bu kadar artış görülürse acil stop.':
    'Emergency stop if pressure rises this much above the free-travel pressure on the way to the target.',
}

export default en
