// İngilizce sözlük — GÜVENLİ GÖNYE (2026-11-19): gönye ekranı tablosu / onay penceresi, cetvel geçersiz uyarıları,
// Admin Ayarları > GÖNYE & STAGE > GÜVENLİ GÖNYE, MAKİNE DEĞERLERİ, backend mesajları (tp — {0} yer tutucuları).

const en: Record<string, string> = {
  // ── Gönye ekranı ──
  'TÜM PİSTONLAR MEKANİK LİMİTE GERİ ÇEKİLİR — HER TOP SON BİLİNEN KONUMDAN BEKLENEN MESAFEYLE KARŞILAŞTIRILIR':
    'ALL PISTONS RETRACT TO THE MECHANICAL LIMIT — EACH ROLL IS COMPARED WITH THE DISTANCE EXPECTED FROM ITS LAST KNOWN POSITION',
  'ERKEN DURAN TOP = ENGEL: TOP HEMEN İLERİ ALINIR, CETVEL SIFIRLANMAZ':
    'A ROLL THAT STOPS EARLY = OBSTACLE: THE ROLL IS MOVED FORWARD AT ONCE, RULERS ARE NOT RESET',
  'GÜVENLİ GÖNYE': 'SAFE HOMING',
  'CETVELLER': 'RULERS',
  'GEÇERLİ': 'VALID',
  'GEÇERSİZ': 'INVALID',
  'SON KONUM KAYDI': 'LAST POSITION RECORD',
  '{d} GÜN ÖNCE': '{d} DAYS AGO',
  'KULLANILAMAZ': 'NOT USABLE',
  'GÖNYE TAMAMLANDI — UYARILAR VAR (TABLOYA BAKIN).': 'HOMING COMPLETED — WITH WARNINGS (SEE THE TABLE).',
  'KONTROL ETTİM, ENGEL YOK — YAVAŞ GÖNYE AL': 'CHECKED, NO OBSTACLE — HOME SLOWLY',
  'ENGEL UYARISINI YOK SAYMAK İÇİN ATÖLYE SORUMLUSU GİRİŞİ GEREKİR': 'A WORKSHOP SUPERVISOR LOGIN IS REQUIRED TO OVERRIDE THE OBSTACLE WARNING',
  'TOPLARIN ARKASINI KONTROL ETTİNİZ VE ENGEL YOK. ENGEL UYARISI YOK SAYILARAK TOPLAR GÜVENLİ HIZDA MEKANİK SONA ÇEKİLECEK VE CETVELLER ORADA SIFIRLANACAK. DEVAM EDİLSİN Mİ':
    'You have checked behind the rolls and there is no obstacle. The obstacle warning will be ignored, the rolls will be retracted to the mechanical end at the safe speed and the rulers reset there. Continue?',
  'YAVAŞ GÖNYE AL': 'HOME SLOWLY',

  // ── Tablo ──
  'TOP': 'ROLL',
  'BEKLENEN mm': 'EXPECTED mm',
  'GİDİLEN mm': 'TRAVELLED mm',
  'SONUÇ': 'RESULT',
  'BEKLİYOR': 'WAITING',
  'GERİ ÇEKİLİYOR': 'RETRACTING',
  'MEKANİK SON': 'MECHANICAL END',
  'FAZLA GİTTİ (UYARI)': 'OVERTRAVEL (WARNING)',
  'FAZLA GİTTİ': 'OVERTRAVEL',
  'ENGEL': 'OBSTACLE',
  'CETVEL HATALI': 'RULER FAULT',
  'KONTROLSÜZ': 'UNCHECKED',
  'DURDURULDU': 'STOPPED',
  '{n} mm İLERİ': '{n} mm FORWARD',
  'SAYAÇ TERS': 'COUNTER REVERSED',
  'HIZ %{s}': 'SPEED {s}%',
  'TOLERANS {t} mm': 'TOLERANCE {t} mm',
  'BEKLENEN MESAFEYLE': 'WITH EXPECTED DISTANCE',
  'OPERATÖR ONAYLI (BEKLENEN BİLİNMİYOR)': 'OPERATOR CONFIRMED (EXPECTED UNKNOWN)',
  'ENGEL UYARISI YOK SAYILDI': 'OBSTACLE WARNING OVERRIDDEN',
  'GÜVENLİ GÖNYE SÜRÜYOR — HER TOP BEKLENEN MESAFEYLE KARŞILAŞTIRILIYOR…': 'SAFE HOMING IN PROGRESS — EACH ROLL IS COMPARED WITH THE EXPECTED DISTANCE…',

  // ── Onay penceresi ──
  'BEKLENEN GERİ GİDİŞ BİLİNMİYOR': 'EXPECTED RETRACT DISTANCE UNKNOWN',
  'Topların son konumu bilinmediği için engel kontrolü yapılamaz. Toplar mekanik sona kadar GÜVENLİ HIZDA geri çekilecek.':
    'The last position of the rolls is unknown, so obstacles cannot be detected. The rolls will be retracted to the mechanical end at the SAFE SPEED.',
  'TOPLARIN ARKASINDA ENGEL / ALET YOK — KONTROL ETTİM': 'NO OBSTACLE / TOOL BEHIND THE ROLLS — I HAVE CHECKED',
  'ONAYLAYAN: {u}': 'CONFIRMED BY: {u}',
  'Bu onay kullanıcı adınızla kayda geçer.': 'This confirmation is recorded with your user name.',

  // ── Uyarı şeridi / pencere ──
  'CETVELLER GEÇERSİZ — {why} — GÜVENLİ GÖNYE ALIN': 'RULERS INVALID — {why} — RUN SAFE HOMING',
  'CETVELLER GEÇERSİZ': 'RULERS INVALID',
  'Topların konumu bilinmiyor — konum hareketleri, stage, sıkıştırma ve büküm kilitli. GÜVENLİ GÖNYE ALIN. Elle (jog) hareket serbesttir; dikkatli kullanın.':
    'Roll positions are unknown — position moves, stage, clamping and bending are locked. RUN SAFE HOMING. Manual (jog) moves are allowed; use them with care.',
  'GÖNYE EKRANI': 'HOMING SCREEN',

  // ── Ayarlar ──
  'Her gönyede toplar son bilinen konumdan beklenen mesafeyle karşılaştırılır. Beklenenden erken duran top ENGEL sayılır: top hemen ileri alınır, cetvel sıfırlanmaz, gönye durur.':
    'On every homing each roll is compared with the distance expected from its last known position. A roll that stops earlier than expected is an OBSTACLE: it is moved forward at once, rulers are not reset and homing stops.',
  'ENGEL TOLERANSI': 'OBSTACLE TOLERANCE',
  'Gidilen mesafe beklenenden bu kadar kısaysa ENGEL.': 'OBSTACLE if the travelled distance is this much shorter than expected.',
  'GÜVENLİ GÖNYE HIZI': 'SAFE HOMING SPEED',
  'Geri çekme hızı. Düşük hız basıncı erken yükseltebilir — gönye %100 ile denendi.': 'Retract speed. A low speed can raise the pressure early — homing was proven at 100%.',
  'RAHATLATMA MESAFESİ': 'RELIEF DISTANCE',
  'Engelde top bu kadar İLERİ alınır (sıkışan el / alet kurtulsun). 0 = ileri alma yok.': 'On an obstacle the roll is moved FORWARD this much (to free a trapped hand / tool). 0 = no forward move.',
  'RAHATLATMA HIZI': 'RELIEF SPEED',
  'SON KONUM GEÇERLİLİK SÜRESİ': 'LAST POSITION VALIDITY',
  'gün': 'days',
  'Daha eski kayıtla beklenen bilinmiyor sayılır — operatör onayı istenir.': 'With an older record the expected distance is unknown — operator confirmation is required.',
  'BAĞLANTI KESİNTİSİ EŞİĞİ': 'CONNECTION LOSS THRESHOLD',
  'PLC bağlantısı bu süreden uzun koparsa cetveller geçersiz sayılır.': 'If the PLC connection is lost for longer than this, the rulers are considered invalid.',
  'FAZLA GİTME DAVRANIŞI': 'OVERTRAVEL BEHAVIOUR',
  'Top beklenen + toleranstan fazla giderse. UYAR: durduğu yer mekanik son kabul edilir, uyarı yazılır.':
    'If a roll travels more than expected + tolerance. WARN: where it stops is accepted as the mechanical end and a warning is logged.',
  'UYAR': 'WARN',
  'DURDUR': 'STOP',

  // ── Makine değerleri ──
  'CETVEL GEÇERLİLİĞİ (GÜVENLİ GÖNYE)': 'RULER VALIDITY (SAFE HOMING)',
  'GEÇERSİZLİK SEBEBİ': 'INVALID REASON',
  'GÜVENLİ GÖNYEDE KULLANILIR': 'USABLE FOR SAFE HOMING',
  'SON BİLİNEN KONUM': 'LAST KNOWN POSITION',

  // ── Hata kayıtları / alarm ──
  'CETVELLER GEÇERSİZ — TOPLARIN KONUMU BİLİNMİYOR, KALDIĞI YERDEN DEVAM EDİLEMEZ. MANUEL TAHLİYE YAPIN, SONRA GÜVENLİ GÖNYE ALIN.':
    'RULERS INVALID — ROLL POSITIONS ARE UNKNOWN, CANNOT RESUME. UNLOAD MANUALLY, THEN RUN SAFE HOMING.',

  // ── Backend mesajları (tp) ──
  'PROGRAM YENİ AÇILDI — REMOTE I/O KAPALI KALMIŞ OLABİLİR': 'PROGRAM JUST STARTED — THE REMOTE I/O MAY HAVE BEEN OFF',
  'REMOTE I/O YENİDEN BAŞLADI — SAYAÇLAR SIFIRLANDI': 'REMOTE I/O RESTARTED — COUNTERS WERE RESET',
  'PLC BAĞLANTISI KOPTU': 'PLC CONNECTION LOST',
  'GÜVENLİ GÖNYE TAMAMLANMADI': 'SAFE HOMING NOT COMPLETED',
  'CETVELLER GEÇERSİZ — GÜVENLİ GÖNYE ALIN ({0})': 'RULERS INVALID — RUN SAFE HOMING ({0})',
  'GÜVENLİ GÖNYE TAMAMLANDI': 'SAFE HOMING COMPLETED',
  'GÜVENLİ GÖNYE TAMAMLANDI — UYARILAR VAR': 'SAFE HOMING COMPLETED — WITH WARNINGS',
  'BEKLENEN GERİ GİDİŞ BİLİNMİYOR ({0}) — TOPLARIN ARKASINDA ENGEL / ALET OLMADIĞINI KONTROL EDİP ONAYLAYIN':
    'EXPECTED RETRACT DISTANCE UNKNOWN ({0}) — CHECK THAT THERE IS NO OBSTACLE / TOOL BEHIND THE ROLLS AND CONFIRM',
  'SON KONUM KAYDI YOK': 'NO LAST POSITION RECORD',
  'SON KONUM KAYDI BOZUK': 'LAST POSITION RECORD CORRUPT',
  'KAYIT GÖNYESİZ': 'RECORD WITHOUT HOMING',
  'SON KONUM KAYDI {0} GÜNLÜK (EN FAZLA {1})': 'LAST POSITION RECORD IS {0} DAYS OLD (MAX {1})',
  'SON KONUM KAYDI TARİHİ İLERİDE': 'LAST POSITION RECORD DATE IS IN THE FUTURE',
  'BAZI TOPLAR CETVEL GEÇERSİZKEN YÖNÜ BİLİNMEYEN ŞEKİLDE HAREKET ETTİ': 'SOME ROLLS MOVED IN AN UNKNOWN DIRECTION WHILE THE RULERS WERE INVALID',
  '{0} ENGELE TAKILDI — {1} mm İLERİ ALINDI (sıkışma kurtarıldı). Beklenen ≈{2} mm, gidilen {3} mm — topun arkasını kontrol edin.':
    '{0} HIT AN OBSTACLE — MOVED {1} mm FORWARD (trap released). Expected ≈{2} mm, travelled {3} mm — check behind the roll.',
  '{0} GERİ ÇEKİLİRKEN ENGELE TAKILDI — beklenen ≈{1} mm, gidilen {2} mm. Topun arkasını kontrol edin.':
    '{0} HIT AN OBSTACLE WHILE RETRACTING — expected ≈{1} mm, travelled {2} mm. Check behind the roll.',
  '{0} BEKLENENDEN FAZLA GİTTİ — beklenen ≈{1} mm, gidilen {2} mm (cetvel / sayaç kaçırmış olabilir)':
    '{0} TRAVELLED MORE THAN EXPECTED — expected ≈{1} mm, travelled {2} mm (the ruler / counter may have missed pulses)',
  '{0} BEKLENENDEN FAZLA GİTTİ — beklenen ≈{1} mm, gidilen {2} mm (FAZLA GİTME: DURDUR).':
    '{0} TRAVELLED MORE THAN EXPECTED — expected ≈{1} mm, travelled {2} mm (OVERTRAVEL: STOP).',
  '{0} BEKLENENDEN ÇOK FAZLA GİDİYOR — beklenen ≈{1} mm, gidilen {2} mm. Cetvel / sayaç hatalı olabilir.':
    '{0} IS TRAVELLING FAR MORE THAN EXPECTED — expected ≈{1} mm, travelled {2} mm. The ruler / counter may be faulty.',
  '{0} STROKTAN FAZLA GİTTİ ({1} mm > {2} mm) — cetvel okumuyor / sayaç hatalı.': '{0} TRAVELLED MORE THAN ITS STROKE ({1} mm > {2} mm) — ruler not reading / counter faulty.',
  '{0} {1} SN İÇİNDE DURMADI — cetvel okumuyor / sayaç hatalı olabilir. Cetvel sıfırlanmadı.':
    '{0} DID NOT STOP WITHIN {1} S — the ruler may not be reading / the counter may be faulty. Rulers were not reset.',
  '{0} SAYAÇ YÖNÜ TERS (geri çekilirken ileri sayıyor) — mesafe büyüklükle değerlendirildi':
    '{0} COUNTER DIRECTION REVERSED (counts forward while retracting) — distance evaluated by magnitude',
  '{0} mm İLERİ ALINDI (sıkışma kurtarıldı)': 'MOVED {0} mm FORWARD (trap released)',
  'İLERİ ALMA: CETVEL İLERLEME GÖSTERMEDİ — DURDURULDU': 'FORWARD MOVE: RULER SHOWED NO PROGRESS — STOPPED',
  'ENGEL UYARISINI YOK SAYMAK İÇİN ATÖLYE SORUMLUSU (SUPERVISOR) VEYA ÜSTÜ GİRİŞİ GEREKİR':
    'A WORKSHOP SUPERVISOR (OR HIGHER) LOGIN IS REQUIRED TO OVERRIDE THE OBSTACLE WARNING',
  'OTURUM DOĞRULANAMADI — ENGEL UYARISINI YOK SAYMAK İÇİN GİRİŞ GEREKİR': 'SESSION COULD NOT BE VERIFIED — LOGIN REQUIRED TO OVERRIDE THE OBSTACLE WARNING',
  'Gönye zaten çalışıyor': 'Homing is already running',
  'Güvenli gönye başarısız': 'Safe homing failed',
}

export default en
