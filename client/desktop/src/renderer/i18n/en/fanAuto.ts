// İngilizce sözlük — OTOMATİK FAN + yağ sıcaklığı uyarısı (≥ eşik, sürekli kontrol), 2026-11-19.

const en: Record<string, string> = {
  // Admin Ayarları → MAKİNE → GÜVENLİK
  'Encoder durması ile yağ sıcaklığı / sensör kontrolü (sürekli, her 5 sn; kaydedince hemen). Sorun görülünce alt şeritte uyarı çıkar; hareket durdurulmaz.':
    'Encoder stall check plus oil temperature / sensor check (continuous, every 5 s; immediately after saving). Problems are shown as a warning in the bottom strip; motion is not stopped.',
  'Yağ sıcaklığı bu değere ulaşınca alt şeritte uyarı çıkar.': 'A warning is shown in the bottom strip when the oil temperature reaches this value.',
  'ENGELLE: yağ sıcaklığı engel eşiğine ulaşınca büküm başlatılmaz.': 'BLOCK: bending does not start when the oil temperature reaches the block limit.',
  // Admin Ayarları → MAKİNE → OTOMATİK FAN
  'OTOMATİK FAN': 'AUTOMATIC FAN',
  'Yağ sıcaklığı açma sıcaklığına ulaşınca fan kendiliğinden açılır, kapatma sıcaklığına düşünce kapanır. Elle açılan fan otomatik kapatılmaz; elle kapatılınca otomatik 10 dk bekler.':
    'The fan switches on by itself when the oil reaches the ON temperature and off when it drops to the OFF temperature. A fan switched on by hand is never switched off automatically; after switching it off by hand, automatic control waits 10 min.',
  'FAN AÇMA SICAKLIĞI': 'FAN ON TEMPERATURE',
  'FAN KAPATMA SICAKLIĞI': 'FAN OFF TEMPERATURE',
  'Açma sıcaklığından en az 2 °C düşük olmalı.': 'Must be at least 2 °C below the ON temperature.',
  'EN AZ AÇIK KALMA SÜRESİ': 'MINIMUM ON TIME',
  'Otomatik açılan fan sık aç-kapa yapmasın diye.': 'Keeps an automatically started fan from switching on and off too often.',
  // MAKİNE DEĞERLERİ → FAN kartı rozeti
  'ELLE': 'MANUAL',
  'OTOMATİK {n} DK SONRA': 'AUTO IN {n} MIN',
}

export default en
