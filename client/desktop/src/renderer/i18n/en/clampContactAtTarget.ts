// İngilizce sözlük — sıkıştırma v2 (hedefte temas + yolda acil stop), 2026-11-01.

const en: Record<string, string> = {
  // Backend mesajı (ClampContactAtTarget) — tahliye ekranı + ilerleme şeridi
  'SIKIŞTIRMA ACİL STOP: hedefe ulaşmadan basınç {n} bar arttı — parça ölçüsünü ve önündeki engeli kontrol edin':
    'CLAMPING EMERGENCY STOP: pressure rose {n} bar before reaching the target — check the part size and any obstacle in front of it',
  'ACİL STOP UYGULANDI — PARÇAYI ÇIKARIN, ÖLÇÜYÜ VE ÖNÜNDEKİ ENGELİ KONTROL EDİP İŞİ YENİDEN BAŞLATIN':
    'EMERGENCY STOP APPLIED — REMOVE THE PART, CHECK THE SIZE AND ANY OBSTACLE, THEN RESTART THE JOB',
  // Admin Ayarları → SIKIŞTIRMA
  'SIKIŞTIRMA ALGORİTMASI': 'CLAMPING ALGORITHM',
  'Üst top yavaşlama noktasına (hedef − YAVAŞLAMA MESAFESİ) kadar hızlı iner, sonra YAVAŞ HIZ ile TEMAS BASINÇ ARTIŞI kadar basınç yükselince durur. HEDEFTE TEMAS seçiliyse yavaşlama noktasına varmadan basınç belirlenen kadar artarsa ACİL STOP yapılır. YAVAŞLAMA MESAFESİ 0 = eski davranış (hedefte / %95 noktasında yavaşlama).':
    'The upper roll moves down fast to the slowdown point (target − SLOWDOWN DISTANCE), then stops at SLOW SPEED once pressure rises by the CONTACT PRESSURE RISE. With CONTACT AT TARGET, an EMERGENCY STOP is triggered if pressure rises by the set amount before the slowdown point. SLOWDOWN DISTANCE 0 = old behaviour (slow down at the target / at 95%).',
  'YAVAŞLAMA MESAFESİ': 'SLOWDOWN DISTANCE',
  'Hedefe bu kadar mm kala yavaşlar ve temas arar (ör. 1 veya 2). 0 = eski davranış.': 'Slows down and looks for contact this many mm before the target (e.g. 1 or 2). 0 = old behaviour.',
  'YAVAŞ HIZ': 'SLOW SPEED',
  'HIZLI İNİŞ HIZI': 'FAST DESCENT SPEED',
  'Yavaşlama noktasına kadar üst topun iniş hızı.': 'Upper roll descent speed up to the slowdown point.',
  'ESKİ YÖNTEM YAVAŞLAMA NOKTASI': 'OLD METHOD SLOWDOWN POINT',
  'Sadece ESKİ yöntem + YAVAŞLAMA MESAFESİ 0 iken: hedefin bu yüzdesinde yavaşlar.': 'Only with the OLD method and SLOWDOWN DISTANCE 0: slows down at this percentage of the target.',
  'BASINÇ OTURMA BEKLEMESİ': 'PRESSURE SETTLE WAIT',
  'Yavaşladıktan sonra taban basıncı okumadan önce bekleme. Boş = 50 ms.': 'Wait after slowing down before reading the base pressure. Empty = 50 ms.',
  'KALKIŞ BASINCINI YOK SAY': 'IGNORE START-UP PRESSURE',
  'Hareket başında basınç sıçraması bu süre yok sayılır. Boş = 500 ms.': 'The pressure spike at the start of motion is ignored for this long. Empty = 500 ms.',
  'ACİL STOP ONAY ÖRNEĞİ': 'EMERGENCY STOP CONFIRM SAMPLES',
  'Yolda eşik üstü basınç bu kadar ardışık okumada (100 ms arayla) görülürse acil stop. Boş = 2.': 'Emergency stop if above-threshold pressure is seen in this many consecutive readings (100 ms apart) on the way. Empty = 2.',
  'SIKIŞTIRMA ZAMAN AŞIMI': 'CLAMP TIMEOUT',
  'Bu sürede temas olmazsa sıkıştırma hata ile durur. Boş = 15 sn.': 'If no contact within this time, clamping stops with an error. Empty = 15 s.',
  'Yavaşlama noktasında okunan basınç + bu değer görülünce üst top durur (temas).': 'The upper roll stops (contact) when the pressure read at the slowdown point rises by this value.',
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
