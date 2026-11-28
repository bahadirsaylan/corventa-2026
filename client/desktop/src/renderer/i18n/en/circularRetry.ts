// 2026-11-27 — dairesel bükümde ölçüm hatasında TEKRAR ÖLÇ
const en: Record<string, string> = {
  'Geri esneme sensörü ölçüm yapamadı.': 'The springback sensor could not measure.',
  'Parçayı ve sensörü kontrol edin, sonra <b>TEKRAR ÖLÇ</b> ile yeniden ölçün.': 'Check the part and the sensor, then measure again with <b>MEASURE AGAIN</b>.',
  'BÜKÜMÜ BİTİR': 'FINISH BENDING',
  'TEKRAR ÖLÇ': 'MEASURE AGAIN',
  'DAİRESEL — ÖLÇÜM HATASINDA': 'CIRCULAR — ON MEASUREMENT ERROR',
  'TEKRAR ÖLÇ SOR': 'ASK TO MEASURE AGAIN',
  'TEKRAR ÖLÇ SOR: geri esneme sensörü ölçemezse büküm bitmez, operatöre TEKRAR ÖLÇ / BÜKÜMÜ BİTİR sorulur (en fazla 5 kez). BÜKÜMÜ BİTİR: eski davranış.':
    'ASK TO MEASURE AGAIN: if the springback sensor cannot measure, bending does not end; the operator is asked MEASURE AGAIN / FINISH BENDING (up to 5 times). FINISH BENDING: previous behaviour.',
  'PARÇA BOYU EN AZ {min} mm OLMALI (SIFIRLAMA {reset} + EMNİYET {safety}) — GİRİLEN {l} mm':
    'PART LENGTH MUST BE AT LEAST {min} mm (ZERO RESET {reset} + SAFETY {safety}) — ENTERED {l} mm',
  'EN KISA PARÇA BOYU': 'MINIMUM PART LENGTH',
  'KONTROL ET': 'CHECK',
  'KONTROL ETME': 'DO NOT CHECK',
  'KONTROL ET: parça boyu en az SIFIRLAMA MESAFESİ + EMNİYET PAYI olmalı; kısa parça ile büküm başlatılamaz. KONTROL ETME: eski davranış.':
    'CHECK: part length must be at least ZERO RESET DISTANCE + SAFETY MARGIN; bending cannot start with a shorter part. DO NOT CHECK: previous behaviour.',
  // 2026-11-28 — acil stop ekranı
  'ACİL STOP BASILI': 'EMERGENCY STOP PRESSED',
  'MAKİNE DURDURULDU. ACİL STOP BIRAKILANA KADAR İŞLEM YAPILAMAZ.': 'MACHINE STOPPED. NO OPERATION IS POSSIBLE UNTIL THE EMERGENCY STOP IS RELEASED.',
  'TEHLİKE ORTADAN KALKINCA ACİL STOP BUTONUNU ÇEVİREREK BIRAKIN.': 'WHEN THE DANGER IS GONE, RELEASE THE EMERGENCY STOP BUTTON BY TURNING IT.',
  'ACİL STOP EKRANI': 'EMERGENCY STOP SCREEN',
  'TAM EKRAN': 'FULL SCREEN',
  'ŞERİT': 'STRIP',
  'TAM EKRAN: acil stop basılıyken tüm ekranı kaplayan pencere açılır, acil stop bırakılana kadar başka işlem yapılamaz (sadece ALARMI SESSİZE AL). ŞERİT: eski davranış, sadece alt şeritte uyarı.':
    'FULL SCREEN: while the emergency stop is pressed a window covers the whole screen and nothing else can be done until it is released (only MUTE ALARM). STRIP: previous behaviour, warning in the bottom strip only.',
  // 2026-11-28 — top değişimi kısa rotasyon
  'DAİRESEL — TOP DEĞİŞİMİ': 'CIRCULAR — ROLL CHANGE',
  'Top değişiminde rotasyon önce bu kadar gidip durur, bükmeyi yapan top geri çekilir, diğer top gelir, sonra rotasyon devam eder (büküm, düzeltme ve elle düzeltmede). |XA1| × 2: stage XA1 değerinin iki katı. |XA1| + A: eski davranış.':
    'At a roll change the rotation first travels this far and stops, the bending roll retracts, the other roll comes in, then rotation continues (in bending, correction and manual correction). |XA1| × 2: twice the stage XA1 value. |XA1| + A: previous behaviour.',
}

export default en
