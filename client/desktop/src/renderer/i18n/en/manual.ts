// İngilizce sözlük — Manuel büküm sayfaları, Serpantin/Sıvama ölçü ekranları, ortak küçük bileşenler.
// Anahtar = Türkçe kaynak metin (birebir), değer = İngilizce.
// Değişkenli metinlerde {ad} yer tutucuları iki tarafta aynı olmalı.
// Not: VAZGEÇ, KAYDET, SIFIRLA, MANUEL, ROTASYON, ileri, geri, KIVRIM ÖLÇÜLERİNİ GİRİNİZ ve
// A/B/S/H alan açıklamaları diğer sözlüklerde zaten var — burada tekrar tanımlanmadı.
const en: Record<string, string> = {
  // ── ManuelBendingPage (program listesi) ──
  'PROGRAMI DEĞİŞTİR': 'EDIT PROGRAM',
  'PROGRAMI SİL': 'DELETE PROGRAM',
  'PROGRAMI BAŞLAT': 'START PROGRAM',
  'YENİ KIVRIM': 'NEW BEND',
  'SEÇİLİ PROGRAMIN\nGEOMETRİSEL ÇAPI': 'GEOMETRIC DIAMETER\nOF SELECTED PROGRAM',
  'SEÇİLİ PROGRAMI SİLMEK İSTEDİĞİNİZDEN EMİN MİSİNİZ': 'ARE YOU SURE YOU WANT TO DELETE THE SELECTED PROGRAM',
  SİL: 'DELETE',

  // ── ManuelHeader / ManuelFooter ──
  'Geri / Aşağı': 'Back / Down',
  'İleri / Yukarı': 'Forward / Up',
  Uyarı: 'Warning',

  // ── ProgramTable ──
  'PROGRAM NO': 'PROGRAM NO',
  'PROGRAM ADI': 'PROGRAM NAME',
  'KAYIT TARİHİ': 'CREATED ON',
  'DEĞİŞTİRME TARİHİ': 'MODIFIED ON',
  'Henüz kayıtlı program yok. "YENİ KIVRIM" ile başla.': 'No saved programs yet. Start with "NEW BEND".',

  // ── manuelProgramsStore — örnek program adları (sadece gösterimde çevrilir) ──
  '60×60×6 KÖŞEBENT Ø500 DIŞ KIVRIM': '60×60×6 ANGLE Ø500 OUTWARD BEND',
  '30×10 LAMA Ø680 KILIÇINA KIVRIM': '30×10 FLAT BAR Ø680 EDGEWISE BEND',
  'ÖZEL B PROFİL Ø900 KIVRIM': 'SPECIAL B PROFILE Ø900 BEND',
  '15.2983 RESİM NO PROJE KIVRIM': 'DRAWING NO 15.2983 PROJECT BEND',
  '22.5369 RESİM NO PROJE KIVRIM': 'DRAWING NO 22.5369 PROJECT BEND',

  // ── ManuelBendingRunPage ──
  'HİDROLİK MOTOR HAZIR DEĞİL — BAŞLATMADAN HAREKET YAPILAMAZ':
    'HYDRAULIC MOTOR NOT READY — NO MOTION IS POSSIBLE UNTIL IT IS STARTED',
  "MAKİNE MANUEL MOD'DA DEĞİL — KOMUTLAR REDDEDİLİR": 'MACHINE IS NOT IN MANUAL MODE — COMMANDS WILL BE REJECTED',
  'KIVRIM HIZI': 'BENDING SPEED',
  'YAN DAYAMALARI OTOMATİK KULLAN': 'USE SIDE SUPPORTS AUTOMATICALLY',
  'PARÇANIN GERÇEK ÇAPINI ÖLÇÜNÜZ': 'MEASURE THE ACTUAL DIAMETER OF THE PART',

  // ── ManuelProgramEditorPage ──
  'Program bulunamadı.': 'Program not found.',
  'SATIR SIRA NO': 'LINE NO',
  'PROGRAM ADIMLARI': 'PROGRAM STEPS',
  DEĞİŞTİREN: 'MODIFIED BY',
  'Adım yok. "ÖNE SATIR EKLE" ile ilk komutu ekle.': 'No steps. Add the first command with "INSERT LINE ABOVE".',
  'SATIRI DEĞİŞTİR': 'EDIT LINE',
  'ÖNE SATIR EKLE': 'INSERT LINE ABOVE',
  'SATIR SİL': 'DELETE LINE',
  'DEĞİŞİKLİKLER SONUCU\nOLUŞAN GEOMETRİSEL ÇAP': 'RESULTING GEOMETRIC\nDIAMETER AFTER CHANGES',
  'S.{no} satırını silmek istediğinizden emin misiniz': 'Are you sure you want to delete line S.{no}',

  // ── StepFormDialog ──
  'SATIRI DÜZENLE': 'EDIT LINE',
  'YENİ SATIR EKLE': 'ADD NEW LINE',
  KOMUT: 'COMMAND',
  'Profil 1. kenar': 'Profile side 1',
  'Profil 2. kenar': 'Profile side 2',
  'Step (mesafe)': 'Step (distance)',
  'Yatay piston': 'Horizontal piston',
  'Dikey piston': 'Vertical piston',
  'MESAFE (mm)': 'DISTANCE (mm)',
  'BASINÇ (bar) — opsiyonel': 'PRESSURE (bar) — optional',

  // ── SpiralMeasurementForm (serpantin) — alan açıklamaları ──
  'KIVIRIM YARICAP ÖLÇÜSÜDÜR. SERPANTİN KIVRIMININ BAŞLANGIÇ YARICAP DEĞERİNİ GİRMELİSİNİZ. MAKİNA BU DEĞERİ ESAS ALARAK GEOMETRİK KIVIRIM YAPAR.':
    'THE BEND RADIUS. ENTER THE STARTING RADIUS OF THE SERPENTINE BEND. THE MACHINE BENDS GEOMETRICALLY BASED ON THIS VALUE.',
  'PARÇANIN TOPLAM UZUNLUĞUDUR (mm). MAKİNE BU DEĞERİ ESAS ALARAK ROTASYONU HESAPLAR. GÜVENLİK PAYI ÇIKARILDIKTAN SONRA KALAN MESAFE KADAR DÖNER.':
    'THE TOTAL LENGTH OF THE PART (mm). THE MACHINE CALCULATES THE ROTATION BASED ON THIS VALUE. IT ROTATES BY THE DISTANCE REMAINING AFTER THE SAFETY MARGIN IS SUBTRACTED.',
  'MAKİNENİN SERPANTİNE YÖNÜNÜ SEÇMEMİZİ SAĞLAR. MAKİNE YAPILAN SEÇİM DOĞRULTUSUNDA GEOMETRİSEL KIVRIMINI GERÇEKLEŞTİRİR.':
    "SELECTS THE MACHINE'S SERPENTINE DIRECTION. THE MACHINE PERFORMS THE GEOMETRIC BEND ACCORDING TO THIS SELECTION.",

  // ── SivamaMeasurementForm (sıvama) — alan açıklamaları ──
  'HEDEF SIVAMA YARIÇAP ÖLÇÜSÜDÜR (mm). MAKİNA PISTON HEDEF POZİSYONUNU VE İLK ROTASYON UZUNLUĞUNU BU DEĞERE GÖRE HESAPLAR (çap = R × 2).':
    'THE TARGET WRAP RADIUS (mm). THE MACHINE CALCULATES THE PISTON TARGET POSITION AND THE FIRST ROTATION LENGTH FROM THIS VALUE (diameter = R × 2).',
  'KIVIRIM AÇISINI AYARLAMANIZI SAĞLAR. APARATIN BAŞINA KONUMLANDIRDIĞINIZ PROFİLİNİZİ TALEP ETTİĞİNİZ VALS TOPU ÇAPINA, SEÇTİĞİNİZ AÇI KADAR SIVAMA İŞLEMİ GERÇEKLEŞTİRİR.':
    'SETS THE BEND ANGLE. THE PROFILE YOU PLACED AT THE HEAD OF THE FIXTURE IS WRAPPED AROUND THE REQUESTED ROLL DIAMETER BY THE ANGLE YOU SELECT.',
  'PARÇANIN TOPLAM UZUNLUĞUDUR (mm). MAKİNE İLK SIVAMA ROTASYONUNDAN SONRA KALAN PARÇAYI (L − GÜVENLİK PAYI − İLK ROTASYON) KADAR DAHA DÖNDÜRÜR.':
    'THE TOTAL LENGTH OF THE PART (mm). AFTER THE FIRST WRAP ROTATION, THE MACHINE ROTATES THE REMAINING PART BY A FURTHER (L − SAFETY MARGIN − FIRST ROTATION).',

  // ── ErrorBoundary ──
  'BİR HATA OLUŞTU': 'AN ERROR OCCURRED',
  'DEVAM ET': 'CONTINUE',

  // ── KioskExitCorner (gizli teknisyen çıkışı) ──
  'Kioskdan cikiliyor ({reason})...': 'Exiting kiosk ({reason})...',
  'Cikis basarisiz: {err}': 'Exit failed: {err}',
  '{n}sn uzun basis': '{n}s long press',
}

export default en
