// İngilizce sözlük — 2026-11-20 güvenlik paketi: yan dayama geri sınırı, tuş takımı hızları, PC kapat / yeniden başlat,
// alarm susturma, GÜVENLİ MOD (hata tekrarı → bakım kilidi), pnömatik düğmeleri. ({0} = C# interpolasyon boşluğu)

const en: Record<string, string> = {
  // ── Tuş takımı ──

  // ── Hızlı menü ──
  'PC YENİDEN BAŞLAT': 'RESTART PC',
  'PC KAPAT': 'SHUT DOWN PC',
  'BİLGİSAYAR KAPATILSIN MI?': 'SHUT DOWN THE COMPUTER?',
  'BİLGİSAYAR YENİDEN BAŞLATILSIN MI?': 'RESTART THE COMPUTER?',
  'Hidrolik motor durdurulur, program kapanır.': 'The hydraulic motor is stopped and the program closes.',
  'DEMO / GELİŞTİRME — BİLGİSAYAR KAPATILMADI': 'DEMO / DEVELOPMENT — COMPUTER NOT SHUT DOWN',
  'YENİDEN BAŞLAT': 'RESTART',

  // ── Alarm ──
  'ALARMI SESSİZE AL': 'SILENCE ALARM',
  'SUSTURULAMADI — TEKRAR DENE': 'COULD NOT SILENCE — TRY AGAIN',
  'Alarm susturuldu': 'Alarm silenced',

  // ── Makine değerleri: pnömatik ──
  'DUR': 'STOP',

  // ── Güvenli mod ──
  'GÜVENLİ MOD — BAKIM KİLİDİ': 'SAFE MODE — MAINTENANCE LOCK',
  'Yetkili kişi kilidi kapatana kadar büküm başlatılamaz.': 'Bending cannot be started until an authorized person releases the lock.',
  'KİLİDİ KAPAT': 'RELEASE LOCK',
  'GÜVENLİ MOD KAPATILDI': 'SAFE MODE RELEASED',
  'Kilit kapatılamadı: {err}': 'Lock could not be released: {err}',
  'HATA TEKRARINDA GÜVENLİ MOD': 'SAFE MODE ON REPEATED ERRORS',
  'AÇIK: aynı hata / uyarı belirtilen sürede belirtilen sayıda tekrarlarsa bakım kilidi açılır; servis yetkilisi kapatana kadar büküm başlatılamaz.':
    'ON: if the same error / warning repeats the given number of times within the given period the maintenance lock is set; bending cannot start until service releases it.',
  'TEKRAR SAYISI': 'REPEAT COUNT',
  'TEKRAR SÜRESİ': 'REPEAT PERIOD',
  'ACİL STOP DA SAYILSIN': 'COUNT EMERGENCY STOPS TOO',
  'KAPALI: operatörün bastığı acil stop sayılmaz (arıza değil).': 'OFF: emergency stops pressed by the operator are not counted (not a fault).',
  'Hata tekrar sayısı 2-20 arası olmalı': 'Repeat count must be between 2 and 20',
  'Hata tekrar penceresi 1-168 saat arası olmalı': 'Repeat period must be between 1 and 168 hours',

  // ── Yan dayama geri sınırı ──
  'YAN DAYAMA GERİ SINIRI': 'SIDE SUPPORT BACK LIMIT',
  'AÇIK: yan dayamalar sınırın gerisine gitmez (jog durur, konum reddedilir, gönyede sınıra çekilir). Sınır = bu değer veya o yan dayamanın ofseti (büyük olan).':
    'ON: side supports never go behind the limit (jog stops, positions are rejected, homing retracts to the limit). Limit = this value or that support\'s offset (whichever is larger).',
  'GERİ SINIR (EN GERİDEN)': 'BACK LIMIT (FROM FULL RETRACTION)',
  'Kalibre cetvelde mekanik en geriden mesafe. Varsayılan 5 mm.': 'Distance from the mechanical back end on the calibrated ruler. Default 5 mm.',
  'GERİ SINIR DURMA PAYI': 'BACK LIMIT STOP MARGIN',
  'Elle geri sürerken sınırın bu kadar önünde durdurulur (okuma gecikmesi + kayma). Sınırın gerisine geçiyorsa büyütün.':
    'When driving back manually it is stopped this far before the limit (read delay + coasting). Increase it if it passes the limit.',
  'Sadece geri sınır KAPALI ve ofset 0 iken: cetvel okunamıyorsa yan dayamalar bu kadar süre geri sürülür.':
    'Only when the back limit is OFF and the offset is 0: if the rulers cannot be read the side supports are driven back this long.',
  'Yan dayama geri sınırı 0-50 mm arası olmalı': 'Side support back limit must be between 0 and 50 mm',
  'Yan dayama geri sınır payı 0-30 mm arası olmalı': 'Side support back limit margin must be between 0 and 30 mm',
  '{0} GERİ SINIRDA — daha geri gidemez': '{0} AT BACK LIMIT — cannot go further back',
  '{0}: hedef {1} mm geri sınırın gerisinde (en az {2} mm)': '{0}: target {1} mm is behind the back limit (at least {2} mm)',
  '{0} CETVELİ OKUNMUYOR — GERİ ÇEKİLMEDİ (GERİ SINIRI KORUNAMAZ)': '{0} RULER NOT READ — NOT RETRACTED (BACK LIMIT CANNOT BE KEPT)',
  '{0} GERİ SINIRA GİDEMEDİ: {1}': '{0} COULD NOT REACH THE BACK LIMIT: {1}',
  '{0} {1} SN İÇİNDE GERİ SINIRA / EN GERİYE GELMEDİ': '{0} DID NOT REACH THE BACK LIMIT / FULL RETRACTION WITHIN {1} S',

  // ── Bükümde yan dayama konumları ──
  'BÜKÜMDE YAN DAYAMA KONUMLARI': 'SIDE SUPPORT POSITIONS DURING BENDING',
  'Açıkken büküm başlarken (parça sıkılmadan önce) yan dayamalar bu konumlara gider, varınca durur ve iş boyunca orada kalır. Değerler tuş takımında görünen mm (ofsetli sıfırdan). Geri sınırın gerisindeki değer sınıra çekilir. Gidemezse büküm başlamaz.':
    'When ON, the side supports move to these positions when bending starts (before clamping), stop there and stay for the whole job. Values are the mm shown on the keypad (from the offset zero). Values behind the back limit are raised to the limit. If they cannot get there, bending does not start.',
  'BÜKÜMDE YAN DAYAMALARI KONUMA GÖNDER': 'SEND SIDE SUPPORTS TO POSITION DURING BENDING',
  'TOP ÇENE KALINLIĞI (SAĞ + SOL GÖVDE)': 'ROLL JAW THICKNESS (RIGHT + LEFT BODY)',
  'Gövde bükümde sıfırdan bu kadar ileri çıkar.': 'During bending the body moves this far forward from zero.',
  'Yan dayamalar büküm konumuna gidiyor...': 'Side supports moving to bending position...',
  'Bükümde yan dayama konumları -50 … 400 mm arası olmalı': 'Side support bending positions must be between -50 and 400 mm',
  'Bükümde yan dayama konumu: {0}': 'Side support bending position: {0}',
  'Bükümde yan dayama konuma gidemedi: {0}': 'Side support could not reach bending position: {0}',
  '{0} zaten {1} mm konumunda': '{0} already at {1} mm',

  // ── AI öğrenme (2026-11-23) ──
  'İLK GERİ ESNEME ÖLÇÜMÜ': 'FIRST SPRINGBACK MEASUREMENT',
  'Kaydın ilk ölçümü (çap) bu parçanın ilk ölçümüne yakın olmalı': "The record's first measurement (diameter) must be close to this part's first measurement",
  'Büküm hızı (%) farkı': 'Bending speed (%) difference',
  'piston hızı toleransı 0..100 % olmalı': 'piston speed tolerance must be 0..100 %',
  'ilk ölçüm benzerlik toleransı 0..1000 mm olmalı': 'first measurement similarity tolerance must be 0..1000 mm',
  'AI ÖĞRENME: ilk ölçüm {0} mm — benzer kayıt yok, klasik düzeltme': 'AI LEARNING: first measurement {0} mm — no similar record, classic correction',
  "AI ÖĞRENME: ilk ölçüm {0} mm ≈ Job #{1} → doğrudan {2} mm'ye (o kayıtta parçayı toleransa sokan pozisyon)": 'AI LEARNING: first measurement {0} mm ≈ Job #{1} → directly to {2} mm (the position that brought that part into tolerance)',
  'Düzeltme {0} mm, adım {1} mm → {2} parçada (her parçada rotasyon)': 'Correction {0} mm, step {1} mm → in {2} parts (rotation in each part)',
}

export default en
