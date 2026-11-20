// İngilizce sözlük — YAN DAYAMA KONUM KONTROLÜ + GÖNYEDE EN GERİ (2026-11-20): tuş takımı hedef penceresi,
// Admin Ayarları bölümü, backend mesajları (tp — {0} yer tutucuları C# interpolasyon boşlukları).

const en: Record<string, string> = {
  // ── Hedef penceresi ──
  'KONUMA GÖNDER': 'SEND TO POSITION',
  'MAFSAL': 'JOINT',
  'GÖVDE': 'BODY',
  'MAKARA': 'REEL',
  'HEDEF': 'TARGET',
  'HEDEFTE': 'IN POSITION',
  'SÜRE AŞIMI': 'TIMEOUT',
  'TAKILDI / CETVEL HATASI': 'STALLED / RULER FAULT',
  'GÜVENLİK — DURDU': 'SAFETY — STOPPED',
  "PLC'DE YOK": 'NOT IN PLC',
  'CETVEL OKUNMUYOR — KONUMA GÖNDERİLEMEZ': 'RULER NOT READ — CANNOT SEND TO POSITION',
  "YAN DAYAMA KONUM KONTROLÜ PLC'DE YOK — PLC PROGRAMI GÜNCELLENMELİ (ELLE ÇALIŞIR)":
    'SIDE SUPPORT POSITION CONTROL IS NOT IN THE PLC — UPDATE THE PLC PROGRAM (MANUAL WORKS)',
  'HEDEFTE — PLC KONUMU TUTUYOR': 'IN POSITION — PLC IS HOLDING THE POSITION',
  'YAN DAYAMA DURDU: {s}': 'SIDE SUPPORT STOPPED: {s}',

  // ── Admin Ayarları ──
  'YAN DAYAMA KONUM KONTROLÜ': 'SIDE SUPPORT POSITION CONTROL',
  'Tuş takımında yan dayama cetvel değerine dokunarak konuma gönderilir; PLC hedefte durur ve konumu tutar. PLC programı eskiyse sadece elle (jog) çalışır.':
    'Tap a side support ruler value on the keypad to send it to a position; the PLC stops at the target and holds it. With an old PLC program only manual (jog) works.',
  'HEDEF PENCERESİ': 'TARGET WINDOW',
  'Kalan bu kadarsa hedefte sayılır.': 'Counts as in position when this much remains.',
  'ERKEN DURMA PAYI': 'EARLY STOP MARGIN',
  'Valf kapanırken yan dayamanın kayma mesafesi — makinede hedefi aşma miktarına göre ayarlayın.':
    'Distance the side support coasts while the valve closes — set it from the overshoot measured on the machine.',
  'TUTMA DÜZELTME EŞİĞİ': 'HOLD CORRECTION THRESHOLD',
  'Hedefteyken bu kadar kayarsa PLC düzeltir. Pencere ve erken durma payından büyük olmalı.':
    'If it drifts this much while in position the PLC corrects it. Must be larger than the window and the early stop margin.',
  'HAREKET SÜRE SINIRI': 'MOVE TIME LIMIT',
  'GÖNYEDE YAN DAYAMALARI EN GERİYE ÇEK': 'RETRACT SIDE SUPPORTS FULLY DURING HOMING',
  'GÖNYE GERİ ÇEKME SÜRE SINIRI': 'HOMING RETRACT TIME LIMIT',
  'CETVELSİZ GERİ ÇEKME SÜRESİ': 'RETRACT TIME WITHOUT RULERS',
  'Cetvel okunamıyorsa yan dayamalar bu kadar süre geri sürülür.': 'If the rulers cannot be read the side supports are driven back for this long.',

  // ── Alarm (2026-11-20) ──
  'BÜKÜM SONU ALARM SÜRESİ': 'END OF BENDING ALARM TIME',
  'Büküm bitince (başarılı / başarısız) alarm bu kadar çalar. 0 = kapalı. Operatör iptalinde çalmaz.':
    'When bending ends (success / failure) the alarm sounds this long. 0 = off. Not on operator cancel.',
  'TAHLİYEDE ALARMI KAPAT': 'TURN ALARM OFF ON UNLOAD',
  'Sıkıştırma / encoder durması / basınç düşüşü alarmı tahliye veya yeni büküm başlayınca kapanır. Fiziksel acil stop alarmı etkilenmez.':
    'The clamping / encoder stall / pressure drop alarm turns off when unloading or a new bending starts. The physical emergency stop alarm is not affected.',
  'Büküm sonu alarm süresi 0-10 sn arası olmalı': 'End of bending alarm time must be between 0 and 10 s',

  // ── Backend mesajları ──
  "YAN DAYAMA KONUM KONTROLÜ PLC'DE YOK — PLC programını güncelleyin (PLC/YAN_DAYAMA_KONUM_YUKLEME.md). Elle (jog) çalışır.":
    'SIDE SUPPORT POSITION CONTROL IS NOT IN THE PLC — update the PLC program (PLC/YAN_DAYAMA_KONUM_YUKLEME.md). Manual (jog) works.',
  '{0} CETVELİ OKUNMUYOR — konuma gönderilemez': '{0} RULER NOT READ — cannot send to position',
  '{0}: hedef {1} mm strok dışında ({2} … {3} mm)': '{0}: target {1} mm is outside the stroke ({2} … {3} mm)',
  '{0} {1} mm konumuna gidiyor': '{0} moving to {1} mm',
  'Yan dayama konum hatası: {0}': 'Side support position error: {0}',
  'Yan dayamalar geri çekilemedi: {0}': 'Side supports could not be retracted: {0}',
  'Yan dayama geri çekme hatası: {0}': 'Side support retract error: {0}',
  'YAN DAYAMA CETVELLERİ OKUNMUYOR — YAN DAYAMALAR {0} SN GERİ SÜRÜLDÜ (EN GERİDE OLDUKLARI DOĞRULANAMADI)':
    'SIDE SUPPORT RULERS NOT READ — SIDE SUPPORTS DRIVEN BACK FOR {0} S (FULL RETRACTION COULD NOT BE VERIFIED)',
  '{0} {1} SN İÇİNDE EN GERİYE GELMEDİ (CETVEL HÂLÂ DEĞİŞİYORDU)': '{0} DID NOT REACH FULL RETRACTION WITHIN {1} S (RULER WAS STILL CHANGING)',
  'Yan dayama hedef penceresi 0,1-10 mm arası olmalı': 'Side support target window must be between 0.1 and 10 mm',
  'Yan dayama erken durma payı 0-30 mm arası olmalı': 'Side support early stop margin must be between 0 and 30 mm',
  'Yan dayama tutma düzeltme eşiği 0,5-30 mm arası olmalı': 'Side support hold correction threshold must be between 0.5 and 30 mm',
  'Yan dayama tutma düzeltme eşiği, hedef penceresi ve erken durma payından büyük olmalı':
    'The side support hold correction threshold must be larger than the target window and the early stop margin',
  'Yan dayama hareket süre sınırı 2-120 sn arası olmalı': 'Side support move time limit must be between 2 and 120 s',
  'Gönyede yan dayama geri çekme süre sınırı 3-120 sn arası olmalı': 'Homing side support retract time limit must be between 3 and 120 s',
  'Cetvelsiz geri çekme süresi 1-60 sn arası olmalı': 'Retract time without rulers must be between 1 and 60 s',
}

export default en
