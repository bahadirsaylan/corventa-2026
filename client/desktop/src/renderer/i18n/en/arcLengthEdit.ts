// 2026-11-27 — çok açılı: uzatma gerekiyorsa operatör ölçüleri kendisi değiştirir
const en: Record<string, string> = {
  'PARÇA BOYUNU DEĞİŞTİRİN': 'CHANGE THE PART LENGTH',
  'Parça boyunu (LT) <b>{a} mm → {b} mm</b> yapın.': 'Change the part length (LT) <b>{a} mm → {b} mm</b>.',
  '1. kıvrımdan önceki düzlüğü (L1) <b>{a} mm → {b} mm</b> yapın.': 'Change the straight before the 1st bend (L1) <b>{a} mm → {b} mm</b>.',
  'Parçayı {mm} mm daha uzun kesin. Ölçü ekranına dönüp değerleri değiştirin, sonra yeniden ONAYLA.':
    'Cut the part {mm} mm longer. Go back to the measurement screen, change the values, then CONFIRM again.',
  'GERİ DÖN — ÖLÇÜLERİ DÜZELT': 'GO BACK — FIX THE MEASUREMENTS',
  'PARÇA BOYU (LT) EN AZ {b} mm': 'PART LENGTH (LT) AT LEAST {b} mm',
  'L1 EN AZ {b} mm': 'L1 AT LEAST {b} mm',
  'ÇOK AÇILI — PARÇA UZATMA': 'MULTI-ANGLE — PART EXTENSION',
  'UZATMA GEREKİRSE': 'IF AN EXTENSION IS NEEDED',
  'ÖLÇÜLERİ DÜZELT': 'FIX THE MEASUREMENTS',
  'ÖLÇÜLERİ DÜZELT: parça uzatılmalıysa devam edilemez, operatör ölçü ekranına dönüp parça boyunu (baştan uzatmada 1. düzlüğü de) kendisi artırır. ONAYLA & DEVAM: eski davranış.':
    'FIX THE MEASUREMENTS: if the part must be longer it cannot continue; the operator goes back and increases the part length (and the 1st straight for a leading extension). CONFIRM & CONTINUE: previous behaviour.',
  'KİRLİLİK EN KISA SÜRESİ': 'CONTAMINATION MINIMUM DURATION',
  'Kirlilik sensörü bu süreden UZUN kesintisiz kirli demezse yok sayılır (anlık basınçlarda kısa kirli sinyali gelir).':
    'Ignored unless the contamination sensor reports dirty continuously for LONGER than this (pressure spikes give short dirty signals).',
  'KİRLİLİK PENCERESİ YAĞ SICAKLIĞI': 'CONTAMINATION POP-UP OIL TEMPERATURE',
  'Yağ bu sıcaklığın altındayken kirlilik sadece alt şeritte uyarı olarak görünür, uyarı penceresi açılmaz. 0 = her sıcaklıkta pencere.':
    'Below this oil temperature contamination is only shown as a warning in the bottom bar; no pop-up. 0 = pop-up at any temperature.',
  'ELLE KONTROLDE DE TUT': 'HOLD IN MANUAL CONTROL TOO',
  'AÇIK: iş yokken de (tuş takımı, yan dayamalar, rotasyon) bir eksen hareket ederken kaçan diğer toplar düzeltilir. Gönye, stage geçişi, yağ ısıtma ve basınç düşüş testi sırasında tutma yapılmaz.':
    'ON: with no job running too (keypad, side supports, rotation), rolls that drift while another axis moves are corrected. No hold during homing, stage change, oil heating and the pressure drop test.',
}

export default en
