// İngilizce sözlük — acil stop kesintisi / kaldığı yerden devam (Şekil 15-17), 2026-11-01.

const en: Record<string, string> = {
  // Alarm sayfası
  'MANUEL TAHLİYE': 'MANUAL UNLOAD',
  'MAKİNE DURDURULDU': 'MACHINE STOPPED',
  'ALERT CODE {code}': 'ALERT CODE {code}',
  'BAŞLATMA ÖNERİLERİ': 'RESTART SUGGESTIONS',
  'DURUMU GÖZLEMLEDİKTEN SONRA UYGUN BİR DEVAM YOLU SEÇİNİZ.': 'AFTER OBSERVING THE SITUATION, CHOOSE A SUITABLE WAY TO CONTINUE.',
  'DURDURMAK İÇİN GÖZLEMLENEN ACİL DURUM ORTADAN KALKTIĞINDA YUKARIDAKİ SEÇENEKLERİ DEĞERLENDİREBİLİRSİNİZ.':
    'WHEN THE EMERGENCY THAT CAUSED THE STOP IS CLEARED, YOU CAN USE THE OPTIONS ABOVE.',
  'MOTOR SOĞUYUP TERMİK KORUMA KALKTIĞINDA YUKARIDAKİ SEÇENEKLERİ DEĞERLENDİREBİLİRSİNİZ.':
    'WHEN THE MOTOR HAS COOLED AND THE THERMAL PROTECTION IS CLEARED, YOU CAN USE THE OPTIONS ABOVE.',
  'FAZ SIRASI DÜZELTİLDİKTEN SONRA YUKARIDAKİ SEÇENEKLERİ DEĞERLENDİREBİLİRSİNİZ.':
    'AFTER THE PHASE SEQUENCE IS CORRECTED, YOU CAN USE THE OPTIONS ABOVE.',
  'DEVAM EDİLEMEZ': 'CANNOT CONTINUE',
  'MANUEL TAHLİYE YAPIN': 'USE MANUAL UNLOAD',
  'DEVAM ETMEK İÇİN': 'TO CONTINUE',
  'KALDIĞI YERDEN DEVAM EDİLEBİLİR — {n} PASO TAMAMLANMIŞTI': 'CAN CONTINUE FROM WHERE IT STOPPED — {n} PASSES WERE COMPLETED',
  'HİDROLİK MOTORU ÇALIŞTIR': 'START HYDRAULIC MOTOR',
  'DEVAM EDİLEMEDİ': 'COULD NOT CONTINUE',
  'BÜKÜM KALDIĞI YERDEN DEVAM EDECEK. SIKIŞTIRMA VE SIFIRLAMA YAPILMAYACAK — PARÇA YERİNDE VE SIKILI OLMALI. DEVAM EDİLSİN Mİ?':
    'BENDING WILL CONTINUE FROM WHERE IT STOPPED. NO CLAMPING OR ZEROING — THE PART MUST BE IN PLACE AND CLAMPED. CONTINUE?',
  // Kesinti sebepleri (backend BendingInterruptMonitor)
  'MAKİNE ACİL STOP BUTONUNA BASILARAK DURDURULDU': 'THE MACHINE WAS STOPPED WITH THE EMERGENCY STOP BUTTON',
  'FAZ SIRASI HATASI — MAKİNE DURDURULDU': 'PHASE SEQUENCE ERROR — MACHINE STOPPED',
  'MOTOR TERMİK KORUMASI — MAKİNE DURDURULDU': 'MOTOR THERMAL PROTECTION — MACHINE STOPPED',
  // Bekleyen koşullar (backend resume-status)
  'ACİL STOP BUTONUNU BIRAKIN': 'RELEASE THE EMERGENCY STOP BUTTON',
  'FAZ SIRASI HATASI': 'PHASE SEQUENCE ERROR',
  'MOTOR TERMİK HATASI': 'MOTOR THERMAL ERROR',
  'HİDROLİK MOTORU ÇALIŞTIRIN': 'START THE HYDRAULIC MOTOR',
  'GÖNYE BİLGİSİ YOK (uygulama yeniden başlamış)': 'NO SQUARING INFO (application restarted)',
  'PLC HAZIR DEĞİL': 'PLC NOT READY',
  'PLC durumu okunamadı': 'PLC state could not be read',
  // Çift el onayı
  'MANUEL MODA GEÇMEK İÇİN AŞAĞIDAKİ BUTONLARA EŞ ZAMANLI BASILMALIDIR.':
    'TO SWITCH TO MANUAL MODE, PRESS BOTH BUTTONS BELOW AT THE SAME TIME.',
  'İŞLEM YAPILAMADI': 'OPERATION FAILED',
  'GERİ — ALARM SAYFASI': 'BACK — ALARM PAGE',
  // Durum etiketi
  'KESİLDİ (ACİL STOP)': 'INTERRUPTED (EMERGENCY STOP)',
  // Admin Ayarları → MAKİNE → ACİL STOP / DEVAM
  'ACİL STOP / DEVAM': 'EMERGENCY STOP / CONTINUE',
  'Büküm sırasında acil stop, faz veya motor termik hatasında büküm hemen kesilir ve alarm sayfası açılır: MANUEL TAHLİYE veya DEVAM ET (dairesel bükümde kaldığı adımdan, sıkıştırma yapılmadan). Basınç düşüşü: parça bozulursa (basınç aniden düşerse) yazılım acil stop yapar.':
    'On emergency stop, phase or motor thermal error during bending, bending stops immediately and the alarm page opens: MANUAL UNLOAD or CONTINUE (circular bending, from the interrupted step, without clamping). Pressure drop: if the part deforms (pressure drops suddenly) a software emergency stop is made.',
  'KESİNTİ ALGILAMA / DEVAM': 'INTERRUPT DETECTION / CONTINUE',
  'KAPALI: eski davranış — büküm zaman aşımıyla hata verir, devam yok.': 'OFF: previous behaviour — bending fails by timeout, no continue.',
  'BASINÇ DÜŞÜŞÜNDE DURDUR': 'STOP ON PRESSURE DROP',
  'Eşikleri makinede loglara bakarak ayarlayın, sonra açın.': 'Tune the thresholds from the machine logs first, then enable.',
  'BASINÇ DÜŞÜŞÜ EŞİĞİ': 'PRESSURE DROP THRESHOLD',
  'Pencere içindeki en yüksek basınçtan bu kadar düşüş.': 'Drop from the highest pressure within the window.',
  'BASINÇ DÜŞÜŞÜ PENCERESİ': 'PRESSURE DROP WINDOW',
  'BASINÇ DÜŞÜŞÜ EN DÜŞÜK TABAN': 'PRESSURE DROP MINIMUM BASE',
  'Pencere tepe basıncı bunun altındaysa izlenmez (parçaya baskı yok).': 'Not monitored if the window peak is below this (no load on the part).',
}

export default en
