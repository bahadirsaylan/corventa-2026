// İngilizce sözlük — güvenlik kontrolleri (EXCEL 27: encoder durması + yağ sıcaklığı / sensör kontrolü), 2026-11-01.

const en: Record<string, string> = {
  // Admin Ayarları → MAKİNE → GÜVENLİK
  'Encoder durması ile açılışta ve büküm başında yağ sıcaklığı / sensör kontrolü. Sorun görülünce alt şeritte uyarı çıkar; hareket durdurulmaz.':
    'Encoder stall check, plus oil temperature / sensor check at startup and at the start of bending. Problems are shown as a warning in the bottom strip; motion is not stopped.',
  'GÜVENLİK KONTROLLERİ': 'SAFETY CHECKS',
  'ENCODER DURMA SÜRESİ': 'ENCODER STALL TIME',
  'Hareket komutu varken bu süre boyunca ilerleme yoksa uyarı.': 'Warn if there is no progress for this long while a motion command is active.',
  'ENCODER EN AZ İLERLEME': 'ENCODER MINIMUM PROGRESS',
  'Süre içinde bundan az ilerleme durma sayılır.': 'Less progress than this within the time counts as a stall.',
  'YAĞ SICAKLIĞI UYARI EŞİĞİ': 'OIL TEMPERATURE WARNING LIMIT',
  'YAĞ SICAKLIĞI ENGEL EŞİĞİ': 'OIL TEMPERATURE BLOCK LIMIT',
  'Uyarı eşiğinden küçük olamaz. Büküm engeli sadece aşağıda ENGELLE seçiliyse uygulanır.':
    'Cannot be lower than the warning limit. Bending is blocked only if BLOCK is selected below.',
  'BÜKÜM ENGELİ': 'BENDING BLOCK',
  'ENGELLE: yağ sıcaklığı engel eşiğinin üstündeyse büküm başlatılmaz.': 'BLOCK: bending does not start if the oil temperature is above the block limit.',
  'SADECE UYARI': 'WARNING ONLY',
  'ENGELLE': 'BLOCK',
  // Alt panel uyarı şeridi
  'ENCODER DURMASI — {axis}: {ms} ms İÇİNDE İLERLEME YOK, MEKANİK / CETVEL KONTROL EDİN':
    'ENCODER STALL — {axis}: NO PROGRESS WITHIN {ms} ms, CHECK MECHANICS / SCALE',
  'SAĞ PİSTON': 'RIGHT PISTON',
  'SOL PİSTON': 'LEFT PISTON',
  'ÜST PİSTON': 'UPPER PISTON',
  'ALT PİSTON': 'LOWER PISTON',
  'YAĞ SICAKLIĞI ÇOK YÜKSEK ({v}°C) — BÜKÜM BAŞLATILMADI': 'OIL TEMPERATURE TOO HIGH ({v}°C) — BENDING NOT STARTED',
  'YAĞ SICAKLIĞI ÇOK YÜKSEK ({v}°C, SINIR {limit}°C)': 'OIL TEMPERATURE TOO HIGH ({v}°C, LIMIT {limit}°C)',
  'YAĞ SICAKLIĞI YÜKSEK ({v}°C, UYARI {limit}°C)': 'OIL TEMPERATURE HIGH ({v}°C, WARNING {limit}°C)',
  'YAĞ SICAKLIĞI SENSÖRÜ ARALIK DIŞI ({v}°C) — SENSÖR / KABLO KONTROL EDİN':
    'OIL TEMPERATURE SENSOR OUT OF RANGE ({v}°C) — CHECK SENSOR / CABLE',
  'S1 BASINÇ SENSÖRÜ ARALIK DIŞI — SENSÖR / KABLO KONTROL EDİN': 'S1 PRESSURE SENSOR OUT OF RANGE — CHECK SENSOR / CABLE',
  'S2 BASINÇ SENSÖRÜ ARALIK DIŞI — SENSÖR / KABLO KONTROL EDİN': 'S2 PRESSURE SENSOR OUT OF RANGE — CHECK SENSOR / CABLE',
  '(+{n} UYARI)': '(+{n} WARNINGS)',
  'Uyarıyı kapat': 'Close warning',
  // Backend StartJob engel mesajı (translateProgress kuralı)
  'Yağ sıcaklığı çok yüksek ({v}°C > {limit}°C) — büküm başlatılamaz': 'Oil temperature too high ({v}°C > {limit}°C) — bending cannot start',
}

export default en
