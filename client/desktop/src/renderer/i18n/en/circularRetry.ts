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
  // 2026-11-28 — dairesel yan dayama zamanı
  'DAİRESEL — YAN DAYAMA ZAMANI': 'CIRCULAR — SIDE SUPPORT TIMING',
  'TOP DEĞİŞİMİNDE': 'AT ROLL CHANGE',
  'SIFIRLAMADA': 'AT ZEROING',
  'TOP DEĞİŞİMİNDE: sıkıştırma ve sıfırlamada yan dayama gelmez; ön bükümden sonra rotasyon top değişiminde durunca parçanın gittiği taraf konuma gelir, sonraki top değişiminde öbür taraf. SIFIRLAMADA: eski davranış (sıfırlamayla sensör tarafı, ilk rotasyonda karşı taraf).':
    'AT ROLL CHANGE: no side support moves during clamping and zeroing; after the pre-bend, when rotation stops at the roll change the side the part is heading to moves into position, at the next roll change the other side. AT ZEROING: previous behaviour (sensor side with zeroing, other side during the first rotation).',
  // 2026-11-28 — çok açılı sadece kıvrım tarafı
  'ÇOK AÇILI — HANGİ TARAF': 'MULTI-ANGLE — WHICH SIDE',
  'SADECE KIVRIM TARAFI': 'BEND SIDE ONLY',
  'İKİ TARAF': 'BOTH SIDES',
  'SADECE KIVRIM TARAFI: sıkıştırmada yan dayama gelmez; sıfırlamadan sonra kıvrım başlamadan sadece kıvrımın yapılacağı taraf (sol sensör → sağ) konuma gelir, sensör tarafına dokunulmaz. İKİ TARAF: eski davranış.':
    'BEND SIDE ONLY: no side support moves during clamping; after zeroing, before the bend starts, only the side the bend is made towards (left sensor → right) moves into position; the sensor side is not touched. BOTH SIDES: previous behaviour.',
  // 2026-11-28 — stage otomatik
  'STAGE YAN OFSETİ OTOMATİK (KAYITTA)': 'AUTOMATIC STAGE SIDE OFFSET (ON SAVE)',
  'STAGE OTOMATİK (TOP ÇAPINA GÖRE)': 'AUTOMATIC STAGES (BY ROLL DIAMETER)',
  "AÇIK: stage 1 (gönye) referans; diğer stage'lerde sağ/sol top alt ofsetten (alt ÷ sin θ) hesaplanıp oraya gider, büküm hesabındaki yan top konumu (XA1/YA1) stage ve alt/yan top çapı farkından hesaplanır. Kayıtlı XA1 değerleri kullanılmaz. KAPALI: kayıtlı stage değerleri.":
    "ON: stage 1 (square-up) is the reference; on the other stages the right/left rolls are calculated from the lower offset (lower ÷ sin θ) and move there, and the side roll position in the bending calculation (XA1/YA1) is calculated from the stage and the lower/side roll diameter difference. Stored XA1 values are not used. OFF: stored stage values.",
  // 2026-11-28 — ölçümden sonra gövde
  'ÖLÇÜMDEN SONRA GÖVDE': 'BODY AFTER MEASUREMENT',
  'SORUNSUZ ÖLÇÜMDE DÖNSÜN': 'RETURN AFTER GOOD MEASUREMENT',
  'HER ÖLÇÜMDE DÖNSÜN': 'RETURN AFTER EVERY MEASUREMENT',
  'SORUNSUZ ÖLÇÜMDE DÖNSÜN: ölçüm hatalıysa gövde geride bekler (tekrar ölçümde ileri-geri gitmez), ölçüm sorunsuzsa konumuna döner, sonra düzeltme yapılır. HER ÖLÇÜMDE DÖNSÜN: eski davranış.':
    'RETURN AFTER GOOD MEASUREMENT: if the measurement fails the body stays back (no back-and-forth on re-measure); after a good measurement it returns to its position, then the correction is made. RETURN AFTER EVERY MEASUREMENT: previous behaviour.',
  // 2026-11-28 — değişken top çapı formülü
  'DEĞİŞKEN TOP ÇAPI FORMÜLÜ': 'VARIABLE ROLL DIAMETER FORMULA',
  'AÇIK: büküm hesabı üst, alt ve yan topu ayrı çapla kullanır; merkez mesafesi = üst çap/2 + alt çap/2 + profil A + eksen kayması (220/220 + A 80 → 300,82). KAPALI: eski formül (tek top çapı, merkez 300,82 sabit). Tüm toplar 220 ve A 80 iken sonuç aynı.':
    'ON: the bending calculation uses the upper, lower and side rolls with their own diameters; centre distance = upper diameter/2 + lower diameter/2 + profile A + axis offset (220/220 + A 80 → 300.82). OFF: previous formula (single roll diameter, centre 300.82 fixed). Same result when all rolls are 220 and A is 80.',
  'MERKEZ MESAFESİ EKSEN KAYMASI': 'CENTRE DISTANCE AXIS OFFSET',
  'Değişken top çapı formülünde merkez mesafesine eklenir (SolidWorks: 300 + 0,82).': 'Added to the centre distance in the variable roll diameter formula (SolidWorks: 300 + 0.82).',
  'STAGE YAN OFSETİ OTOMATİK': 'AUTOMATIC STAGE SIDE OFFSET',
  'AÇIK: stage kaydedilirken sağ ve sol ofset alt ofsetten hesaplanır (alt ÷ sin θ: 60 → 67,34, 120 → 134,68). KAPALI: elle girilen değerler.':
    'ON: when a stage is saved the right and left offsets are calculated from the lower offset (lower ÷ sin θ: 60 → 67.34, 120 → 134.68). OFF: manually entered values.',
  'STAGE YAN OFSETİ OTOMATİK açıksa kayıtta alt ofsetten hesaplanır.': 'If AUTOMATIC STAGE SIDE OFFSET is on, calculated from the lower offset when saved.',
  'DEĞİŞKEN TOP ÇAPI FORMÜLÜ açıkken büküm hesabında yan top çapı (sağ ile aynı olmalı). Kapalıyken sadece kayıt.': 'Side roll diameter in the bending calculation when VARIABLE ROLL DIAMETER FORMULA is on (must equal right). Record only when off.',
  'Sol ile aynı olmalı (formül sol top çapını kullanır).': 'Must equal left (the formula uses the left roll diameter).',
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
