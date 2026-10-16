// İngilizce sözlük — anahtar = Türkçe kaynak metin (birebir), değer = İngilizce.
// Değişkenli metinlerde {ad} yer tutucuları iki tarafta aynı olmalı.
const en: Record<string, string> = {
  // ── Arc ölçü giriş sayfası (ArcBendingMeasurementsPage) ──
  'KIVRIM ÖLÇÜLERİNİ GİRİNİZ': 'ENTER BEND DIMENSIONS',
  'KIVRIM PLANI HESAPLANIYOR...': 'CALCULATING BEND PLAN...',
  'HESAPLAMA HATASI': 'CALCULATION ERROR',
  'Backend hesaplama başarısız': 'Backend calculation failed',
  TAMAM: 'OK',

  // ── ArcMeasurementForm ──
  SIFIRLA: 'RESET',
  'R + α (Açı)': 'R + α (Angle)',
  'R + Yay (mm)': 'R + Arc (mm)',
  'Önce P (segment sayısı) giriniz — kartlar otomatik açılır.':
    'Enter P (segment count) first — cards open automatically.',
  'SEGMENT {n}': 'SEGMENT {n}',
  Yay: 'Arc',
  Bütçe: 'Budget',
  '(son seg yay −{n}mm safety)': '(last seg arc −{n}mm safety)',
  '(seg1 düzlük min={n}mm safety)': '(seg1 straight min={n}mm safety)',
  'Yay uzunluğu minimum sınırın altında ({arc}mm < {min}mm)':
    'Arc length below minimum limit ({arc}mm < {min}mm)',
  'Yay uzunluğunu veya Açı değerini arttırın': 'Increase the arc length or the angle value',
  'Toplam mesafe': 'Total distance',
  Kalan: 'Remaining',
  AŞIM: 'OVERFLOW',
  'YAY MİNİMUM ALTINDA': 'ARC BELOW MINIMUM',
  'LT giriniz': 'Enter LT',
  'Yay :': 'Arc :',
  'PROFİLE AİT 1.KENAR ÖLÇÜSÜDÜR. MAKİNANIN DOĞRU BİR SIKIŞTIRMA YAPMASI İÇİN ÖNEM TAŞIR.':
    'THE 1ST SIDE DIMENSION OF THE PROFILE. IT IS IMPORTANT FOR THE MACHINE TO CLAMP CORRECTLY.',
  'PROFİLE AİT 2.KENAR ÖLÇÜSÜDÜR. MAKİNANIN DOĞRU BİR SIKIŞTIRMA YAPMASI İÇİN ÖNEM TAŞIR.':
    'THE 2ND SIDE DIMENSION OF THE PROFILE. IT IS IMPORTANT FOR THE MACHINE TO CLAMP CORRECTLY.',
  'PROFİLE AİT KALINLIK ÖLÇÜSÜDÜR. VALS TOPLARININ DOĞRULUĞUNU VE KIVIRIM KAPASİTESİNİ DEĞERLENDİREREK, YAPAY ZEKANIN DOĞRU ÇALIŞMASINI SAĞLAR.':
    'THE WALL THICKNESS OF THE PROFILE. BY EVALUATING ROLLER SUITABILITY AND BENDING CAPACITY, IT ENSURES THE ARTIFICIAL INTELLIGENCE WORKS CORRECTLY.',
  'KIVIRIM YARIÇAP ÖLÇÜSÜDÜR (mm). BU SEGMENTİN HEDEF YARIÇAP DEĞERİDİR. HER SEGMENT KENDİ R DEĞERİNE SAHİPTİR.':
    'THE BEND RADIUS (mm). THE TARGET RADIUS OF THIS SEGMENT. EACH SEGMENT HAS ITS OWN R VALUE.',
  'KIVIRIM AÇI ÖLÇÜSÜDÜR (derece). BU SEGMENTİN AÇISI (0 < α < 180). YAY UZUNLUĞU L = 2π·R·(180-α)/360 FORMÜLÜYLE HESAPLANIR.':
    'THE BEND ANGLE (degrees). THE ANGLE OF THIS SEGMENT (0 < α < 180). ARC LENGTH IS CALCULATED AS L = 2π·R·(180-α)/360.',
  'KIVRIM YAY UZUNLUĞU (mm). AÇI YERİNE DOĞRUDAN YAY UZUNLUĞU GİRMEK İÇİN KULLANIN (0 < Yay < π·R). BACKEND α = 180 − (Yay·180)/(π·R) İLE α HESAPLAR.':
    'BEND ARC LENGTH (mm). USE THIS TO ENTER THE ARC LENGTH DIRECTLY INSTEAD OF THE ANGLE (0 < Arc < π·R). THE BACKEND CALCULATES α = 180 − (Arc·180)/(π·R).',
  'KIVIRIM ÇAP ADEDİDİR. PARÇANIZDAKİ KAÇ ADET ÇAP KIVRIMI VARSA GİRMELİSİNİZ. GİRDİĞİNİZ SAYI KADAR SEGMENT KARTI OTOMATİK AÇILIR VE HER BİRİNİ AYRI DOLDURURSUNUZ.':
    'THE NUMBER OF RADIUS BENDS. ENTER HOW MANY RADIUS BENDS YOUR PART HAS. THAT MANY SEGMENT CARDS OPEN AUTOMATICALLY AND YOU FILL IN EACH ONE SEPARATELY.',
  'BU SEGMENTİN SONRAKİ RADİUSA OLAN DÜZLÜĞÜDÜR (mm). ART ARDA GELEN RADİUSLARDA "0" OLARAK YAZILMALIDIR. SON SEGMENTTE 0 OLABİLİR.':
    'THE STRAIGHT FROM THIS SEGMENT TO THE NEXT RADIUS (mm). FOR CONSECUTIVE RADII, ENTER "0". IT MAY BE 0 ON THE LAST SEGMENT.',
  'MAKİNE HIZINI METRE/DAKİKA PARAMETRESİNDE BELİRLENEN SINIRLAR İÇERİSİNDE AYARLAMANIZA OLANAK SAĞLAMAKTADIR.':
    'ALLOWS YOU TO SET THE MACHINE SPEED WITHIN THE LIMITS DEFINED IN THE METRE/MINUTE PARAMETER.',
  'MAKİNE KIVIRIM GEOMETRİSİNE ULAŞANA KADAR GİRDİĞİNİZ ADIM DEĞERLERİNİ İFADE EDER VE MAKİNE KIVRIMINI BU DEĞERLER DOĞRULTUSUNDA YÖNETİR VE EN İYİ KIVRIMI EN KISA SÜREDE YAPAR.':
    'REPRESENTS THE STEP VALUES YOU ENTER UNTIL THE MACHINE REACHES THE BEND GEOMETRY. THE MACHINE MANAGES THE BEND ACCORDING TO THESE VALUES AND ACHIEVES THE BEST BEND IN THE SHORTEST TIME.',
  'PROFİLİN TOPLAM UZUNLUĞUDUR (mm). TÜM KIVRIM VE DÜZLÜKLERİN TOPLAMI, GÜVENLİK PAYI KADAR EKSİK OLMALIDIR. MAKİNE KIVIRIMI BU UZUNLUĞA GÖRE PLANLAR.':
    'THE TOTAL LENGTH OF THE PROFILE (mm). THE SUM OF ALL BENDS AND STRAIGHTS MUST BE SHORTER BY THE SAFETY MARGIN. THE MACHINE PLANS THE BENDING BASED ON THIS LENGTH.',

  // ── ArcPlanSummary ──
  'TERS SIRA': 'REVERSED ORDER',
  'Bükümler parça sonundan başlayıp parça başına doğru yapılacak (Seg{p} → Seg1).':
    'Bending will start at the part end and proceed towards the part start (Seg{p} → Seg1).',
  'PARÇA UZATILDI': 'PART EXTENDED',
  'PARÇA BAŞINA': 'TO PART START',
  'PARÇA SONUNA': 'TO PART END',
  eklendi: 'added',
  'ölçüm için': 'for measurement',
  'büküm için': 'for bending',
  Parça: 'Part',
  'Toplam yay': 'Total arc',
  'Toplam düz': 'Total straight',
  Y: 'A',

  // ── ArcPlanConfirmModal ──
  'KIVRIM PLANI HAZIR': 'BEND PLAN READY',
  'PARÇA UZATMA GEREKLİ': 'PART EXTENSION REQUIRED',
  'PARÇA BAŞINA (ilk düzlük tarafına)': 'TO PART START (leading straight side)',
  'ÖLÇÜM İÇİN': 'FOR MEASUREMENT',
  'BÜKÜM İÇİN': 'FOR BENDING',
  'Parçayı <b>{mm} mm</b> uzatın.': 'Extend the part by <b>{mm} mm</b>.',
  'Ekleme <b>{side}</b> yapılacak.': 'The extension will be added <b>{side}</b>.',
  Sebep: 'Reason',
  'SEGMENT SIRASI TERS ÇEVRİLDİ': 'SEGMENT ORDER REVERSED',
  'Segmentler <b>ters sırada</b> bükülecek — parça sonu (SegN) önce bükülür, Seg1 en son.':
    'Segments will be bent in <b>reversed order</b> — the part end (SegN) is bent first, Seg1 last.',
  'Parça sıfırlama parça sonu tarafında yapılacak.': 'Part zeroing will be done on the part end side.',
  'Ayarlanmış toplam parça boyu': 'Adjusted total part length',
  İPTAL: 'CANCEL',
  'ONAYLA & DEVAM': 'CONFIRM & CONTINUE',

  // ── ArcProfileDiagram (parça şeridi) ──
  BAŞ: 'START',
  SON: 'END',
  'BAŞ DÜZLÜK': 'LEADING STRAIGHT',
  DÜZLÜK: 'STRAIGHT',
  KALAN: 'REMAINING',
  YAY: 'ARC',

  // ── ArcNextSegmentModal ──
  'Segment reddedildi: {msg}': 'Segment rejected: {msg}',
  '{n}. SEGMENT': 'SEGMENT {n}',
  'SIRADAKİ SEGMENT': 'NEXT SEGMENT',
  'R + α ile girin': 'Enter with R + α',
  'R + Yay uzunluğu ile girin': 'Enter with R + Arc length',
  'Kullanılabilir parça:': 'Available part:',
  'Önceki segment(ler):': 'Previous segment(s):',
  'Bu segment (yay': 'This segment (arc',
  efektif: 'effective',
  düz: 'straight',
  'Kalan (bu segment dahil):': 'Remaining (incl. this segment):',
  'Parça boyu yetersiz — R, α/Yay veya L değerini küçültün':
    'Part length insufficient — reduce R, α/Arc or L',
  'SON SEGMENT: yay uzunluğu {n}mm kısaltılacak (parça sonu güvenlik payı)':
    'LAST SEGMENT: arc length will be shortened by {n}mm (part end safety margin)',
  Yarıçap: 'Radius',
  Açı: 'Angle',
  'Yay (mm)': 'Arc (mm)',
  'Yay uzunluğu': 'Arc length',
  Düzlük: 'Straight',
  'KIVRIM YARIÇAPI (> 0)': 'BEND RADIUS (> 0)',
  '0 < Yay < π·R': '0 < Arc < π·R',
  'BİTİŞTEN SONRAKİ DÜZLÜK (≥ 0)': 'STRAIGHT AFTER THE BEND (≥ 0)',
  'Gönderiliyor...': 'Sending...',
  'ONAYLA VE DEVAM': 'CONFIRM AND CONTINUE',

  // ── MeasurementErrorModal ──
  'İşlem başarısız: {msg}': 'Operation failed: {msg}',
  'ÖLÇÜM HATASI': 'MEASUREMENT ERROR',
  'Segment {seg}, iterasyon {iter}: sensör beklenmedik değer okudu (kötüleşme)':
    'Segment {seg}, iteration {iter}: sensor read an unexpected value (worsening)',
  'Hedef radyüs:': 'Target radius:',
  'Önceki ölçüm:': 'Previous measurement:',
  'Şimdi ölçülen:': 'Measured now:',
  '(arttı ▲)': '(increased ▲)',
  "1) Önce <b>Pnömatiği Geri Çek</b> ile SLPIS'i güvenli konuma çekin.":
    '1) First use <b>Retract Pneumatic</b> to move the SLPIS to a safe position.',
  '2) Sonra <b>Tekrar Ölç</b> ile yeniden ölçüm yapın.':
    '2) Then use <b>Re-measure</b> to take a new measurement.',
  'Gönderiliyor…': 'Sending…',
  '✓ Pnömatik Geri Çekildi': '✓ Pneumatic Retracted',
  '① Pnömatiği Geri Çek': '① Retract Pneumatic',
  'Ölçülüyor…': 'Measuring…',
  '② Tekrar Ölç': '② Re-measure',
  'ÖLÇÜM TEKRARLANAMIYOR': 'MEASUREMENT CANNOT BE REPEATED',
  "Segment {seg}, iterasyon {iter}: tekrar ölçümde de sonuç önceki'den yüksek. Fiziksel bir sorun olabilir (parça kayması, sensör hatası, vb.)":
    'Segment {seg}, iteration {iter}: the re-measurement is also higher than the previous one. There may be a physical problem (part slipping, sensor fault, etc.)',
  'Son ölçüm:': 'Last measurement:',
  'Bu segment için düzeltme başarısız. Aşağıdaki iki seçenekten birini seçin:':
    'Correction failed for this segment. Choose one of the two options below:',
  '⏹ Tüm Bükümü Bitir': '⏹ Finish All Bending',
  '⏭ Bu Segmenti Atla': '⏭ Skip This Segment',
}

export default en
