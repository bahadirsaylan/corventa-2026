// İngilizce sözlük — anahtar = Türkçe kaynak metin (birebir), değer = İngilizce.
// Değişkenli metinlerde {ad} yer tutucuları iki tarafta aynı olmalı.
const en: Record<string, string> = {
  // ── RingBendingMeasurementsPage ─────────────────────────────
  'KIVRIM ÖLÇÜLERİNİ GİRİNİZ': 'ENTER BEND DIMENSIONS',
  SIFIRLA: 'RESET',

  // ── MeasurementForm — alan açıklamaları ("?" bilgi) ──────────
  'PROFİLE AİT 1.KENAR ÖLÇÜSÜDÜR. MAKİNANIN DOĞRU BİR SIKIŞTIRMA YAPMASI İÇİN ÖNEM TAŞIR.':
    "THE PROFILE'S 1ST SIDE DIMENSION. IT IS IMPORTANT FOR THE MACHINE TO CLAMP CORRECTLY.",
  'PROFİLE AİT 2.KENAR ÖLÇÜSÜDÜR. MAKİNANIN DOĞRU BİR SIKIŞTIRMA YAPMASI İÇİN ÖNEM TAŞIR.':
    "THE PROFILE'S 2ND SIDE DIMENSION. IT IS IMPORTANT FOR THE MACHINE TO CLAMP CORRECTLY.",
  'PROFİLE AİT KALINLIK ÖLÇÜSÜDÜR. VALS TOPLARININ DOĞRULUĞUNU VE KIVIRIM KAPASİTESİNİ DEĞERLENDİREREK, YAPAY ZEKANIN DOĞRU ÇALIŞMASINI SAĞLAR.':
    "THE PROFILE'S WALL THICKNESS. BY EVALUATING THE CORRECTNESS OF THE ROLLS AND THE BENDING CAPACITY, IT ENSURES THE AI WORKS CORRECTLY.",
  'KIVIRIM ÇAP ÖLÇÜSÜDÜR. GERÇEKLEŞMESİNİ İSTEDİĞİNİZ (Ø) ÇAP DEĞERİNİ GİRMELİSİNİZ. MAKİNA GEOMETRİSEL OLARAK GİRDİĞİNİZ (Ø) ÇAP DEĞERİNİ DİKKATE ALARAK KIVIRIM YAPAR VE BİTİRİŞ İÇİN DE BU DEĞERİ DİKKATE ALIR.':
    'THE BEND DIAMETER. ENTER THE (Ø) DIAMETER YOU WANT TO ACHIEVE. THE MACHINE BENDS GEOMETRICALLY BASED ON THE (Ø) DIAMETER YOU ENTER AND ALSO USES THIS VALUE FOR FINISHING.',
  'MAKİNE HIZINI METRE/DAKİKA PARAMETRESİNDE BELİRLENEN SINIRLAR İÇERİSİNDE AYARLAMANIZA OLANAK SAĞLAMAKTADIR.':
    'ALLOWS YOU TO ADJUST THE MACHINE SPEED IN METERS/MINUTE WITHIN THE DEFINED LIMITS.',
  'MAKİNE KIVIRIM GEOMETRİSİNE ULAŞANA KADAR GİRDİĞİNİZ ADIM DEĞERLERİNİ İFADE EDER VE MAKİNE KIVRIMINI BU DEĞERLER DOĞRULTUSUNDA YÖNETİR VE EN İYİ KIVRIMNI EN KISA SÜREDE YAPAR.':
    'THE STEP VALUES APPLIED UNTIL THE MACHINE REACHES THE BEND GEOMETRY. THE MACHINE MANAGES THE BEND ACCORDING TO THESE VALUES AND ACHIEVES THE BEST BEND IN THE SHORTEST TIME.',
  'PROFİLE AİT UZUNLUK ÖLÇÜSÜDÜR.': "THE PROFILE'S LENGTH DIMENSION.",

  // ── CapacityCheckModal ──────────────────────────────────────
  'BÜKÜM YAPILAMAZ': 'BENDING NOT POSSIBLE',
  DİKKAT: 'WARNING',
  DÜZELT: 'FIX',
  'YİNE DE DEVAM': 'CONTINUE ANYWAY',

  // ── capacityCatalog (checkCapacity) ─────────────────────────
  LAMA: 'FLAT BAR',
  'KOLAY (YATAY)': 'EASY (HORIZONTAL)',
  'ZOR (DİKİNE)': 'HARD (VERTICAL)',
  'BU PROFİL BU YÖNDE MAKİNE KAPASİTESİNİ (200 kN) AŞIYOR. BÜKÜLEMEZ.':
    'THIS PROFILE EXCEEDS THE MACHINE CAPACITY (200 kN) IN THIS DIRECTION. CANNOT BE BENT.',
  'MİNİMUM ÇAP Ø{min}. GİRİLEN Ø{d} BU PROFİL İÇİN ÇOK KÜÇÜK.':
    'MINIMUM DIAMETER Ø{min}. ENTERED Ø{d} IS TOO SMALL FOR THIS PROFILE.',
  'Ø{min} ALTINDA PROFİLDE DEFORMASYON OLUŞABİLİR. GİRİLEN Ø{d}.':
    'BELOW Ø{min} THE PROFILE MAY DEFORM. ENTERED Ø{d}.',
  'PEKLEŞME {mph} kNm (> {limit}). ADIM (G) EN FAZLA {max} mm OLABİLİR, GİRİLEN {step} mm.':
    'WORK HARDENING {mph} kNm (> {limit}). STEP (G) CAN BE AT MOST {max} mm, ENTERED {step} mm.',

  // ── AiRecipePreviewModal ────────────────────────────────────
  Kapat: 'Close',
  'AI ÖĞRENME KONTROLÜ': 'AI LEARNING CHECK',
  'Benzer büküm aranıyor...': 'Searching for a similar job...',
  'Kontrol edilemedi': 'Check failed',
  'Sorun yok — büküm klasik akışta çalışacak, sonuç kaydedilecek.':
    'No problem — bending will run in the standard flow and the result will be saved.',
  'İLK BÜKÜM': 'FIRST BENDING',
  'Bu parametre kombinasyonunu daha önce bükmedik. Büküm klasik akışta çalışacak ve':
    'This parameter combination has not been bent before. Bending will run in the standard flow and',
  'kayıt oluşturulacak': 'a record will be created',
  'Aynı parametrelerle bir sonraki büküm daha hızlı bitirilecek.':
    'The next bending with the same parameters will finish faster.',
  'Hedef:': 'Target:',
  'Parça:': 'Part:',
  'Adım:': 'Step:',
  'Profil:': 'Profile:',
  'AI HIZLANDIRMA HAZIR': 'AI ACCELERATION READY',
  'Bu parametreleri daha önce büktük. Kayıttaki ilk düzeltme adımı atlanacak —':
    'These parameters have been bent before. The first correction step from the record will be skipped —',
  '1 iterasyon kazanç': '1 iteration saved',
  'beklentisi.': 'expected.',
  'KAYNAK KAYIT': 'SOURCE RECORD',
  'ÖNCEKİ SÜRE': 'PREVIOUS DURATION',
  sn: 's',
  KAZANÇ: 'GAIN',
  'ölçüm atlanacak': 'measurement skipped',
  'İlk düzeltme:': 'First correction:',
  'Aktif piston direkt': 'Active piston directly to',
  'sağ taraftan ölçüm ile devam': 'continue with measurement from the right side',
  'sol taraftan ölçüm ile devam': 'continue with measurement from the left side',
  KAPAT: 'CLOSE',
  'BÜKÜMÜ BAŞLAT': 'START BENDING',

  // ── KeyboardModal / VirtualKeyboard ─────────────────────────
  METİN: 'TEXT',
  'Sanal klavye': 'Virtual keyboard',
  'Yazmak için tuşlara basın…': 'Press keys to type…',
  'Tümünü sil': 'Clear all',
  TEMİZLE: 'CLEAR',
  'Caps Lock aktif': 'Caps Lock on',
  'Shift aktif': 'Shift on',
  Sil: 'Delete',
  'Dil değiştir': 'Change language',
  Boşluk: 'Space',
  BOŞLUK: 'SPACE',
  VAZGEÇ: 'CANCEL',
  ONAYLA: 'CONFIRM',

  // ── jobPayloadMapper (JobMappingError) ──────────────────────
  'Profil seçimi tamamlanmadı': 'Profile selection not completed',
  'Yön seçimi tamamlanmadı': 'Direction selection not completed',
  'Metod seçimi tamamlanmadı': 'Method selection not completed',
  '{name} değeri geçersiz veya girilmemiş': '{name} value is invalid or not entered',
  '{name} değeri geçersiz': '{name} value is invalid',
  'Parça uzunluğu (L) girilmemiş veya geçersiz': 'Part length (L) not entered or invalid',
  'Segment sayısı (P) girilmemiş veya geçersiz': 'Segment count (P) not entered or invalid',
  'Adım değeri (G) girilmemiş veya geçersiz': 'Step value (G) not entered or invalid',
  'Segment listesi boş': 'Segment list is empty',
  'Segment sayısı P ({p}) ile listedeki ({n}) uyuşmuyor':
    'Segment count P ({p}) does not match the list ({n})',
  "Segment {order}: R (yarıçap) 0'dan büyük olmalı": 'Segment {order}: R (radius) must be greater than 0',
  'Segment {order}: α 0 < α < 180 olmalı': 'Segment {order}: α must be 0 < α < 180',
  'Segment {order}: L (düzlük) ≥ 0 olmalı': 'Segment {order}: L (straight) must be ≥ 0',
}

export default en
