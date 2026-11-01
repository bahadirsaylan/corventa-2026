// İngilizce sözlük — sıkıştırma v2 (hedefte temas + yolda acil stop), 2026-11-01.

const en: Record<string, string> = {
  // Backend mesajı (ClampContactAtTarget) — tahliye ekranı + ilerleme şeridi
  'SIKIŞTIRMA ACİL STOP: hedefe ulaşmadan basınç {n} bar arttı — parça ölçüsünü ve önündeki engeli kontrol edin':
    'CLAMPING EMERGENCY STOP: pressure rose {n} bar before reaching the target — check the part size and any obstacle in front of it',
  'ACİL STOP UYGULANDI — PARÇAYI ÇIKARIN, ÖLÇÜYÜ VE ÖNÜNDEKİ ENGELİ KONTROL EDİP İŞİ YENİDEN BAŞLATIN':
    'EMERGENCY STOP APPLIED — REMOVE THE PART, CHECK THE SIZE AND ANY OBSTACLE, THEN RESTART THE JOB',
  // Admin Ayarları → SIKIŞTIRMA
  'SIKIŞTIRMA ALGORİTMASI': 'CLAMPING ALGORITHM',
  'HEDEFTE TEMAS: üst top hedef konuma kadar iner, hedefte yavaşlayıp 1 bar temas artışında durur. Hedefe varmadan basınç belirlenen kadar artarsa ACİL STOP yapılır.':
    'CONTACT AT TARGET: the upper roll descends to the target position, slows down there and stops at a 1 bar contact rise. If pressure rises by the set amount before the target, an EMERGENCY STOP is applied.',
  'SIKIŞTIRMA YÖNTEMİ': 'CLAMPING METHOD',
  'ESKİ: hedefin %95 noktasında yavaşlar, acil stop koruması yok.': 'OLD: slows down at 95% of the target, no emergency stop protection.',
  'HEDEFTE TEMAS': 'CONTACT AT TARGET',
  'ESKİ (%95)': 'OLD (95%)',
  'YOLDA ACİL STOP BASINÇ ARTIŞI': 'TRAVEL EMERGENCY STOP PRESSURE RISE',
  'Hedefe giderken serbest yürüme basıncına göre bu kadar artış görülürse acil stop.':
    'Emergency stop if pressure rises this much above the free-travel pressure on the way to the target.',
}

export default en
