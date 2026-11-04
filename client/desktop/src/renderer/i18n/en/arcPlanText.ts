// İngilizce sözlük — çok açılı büküm: kıvrım planı / özet / giriş kartları sade metinleri (2026-11-05, "Seg" → "kıvrım").
// Anahtar = Türkçe kaynak metin (birebir).
const en: Record<string, string> = {
  'Önce P (kıvrım sayısı) giriniz — kartlar otomatik açılır.': 'Enter P (number of bends) first — cards open automatically.',
  '{n}. KIVRIM': 'BEND {n}',
  'KIVRIMIN YARIÇAPIDIR (mm). HER KIVRIMIN KENDİ YARIÇAPI OLABİLİR.': 'THE RADIUS OF THE BEND (mm). EACH BEND CAN HAVE ITS OWN RADIUS.',
  'KIVRIMIN AÇISIDIR (derece, 0 ile 180 arası). AÇI YERİNE YAY UZUNLUĞU DA GİREBİLİRSİNİZ; DİĞERİ OTOMATİK HESAPLANIR.':
    'THE ANGLE OF THE BEND (degrees, between 0 and 180). YOU CAN ENTER THE ARC LENGTH INSTEAD; THE OTHER IS CALCULATED AUTOMATICALLY.',
  'PARÇADAKİ KIVRIM SAYISIDIR. GİRDİĞİNİZ SAYI KADAR KIVRIM KARTI AÇILIR (1. KIVRIM, 2. KIVRIM ...); HER BİRİNİ AYRI DOLDURURSUNUZ.':
    'THE NUMBER OF BENDS IN THE PART. THAT MANY BEND CARDS OPEN (BEND 1, BEND 2 ...); FILL IN EACH ONE SEPARATELY.',
  'BU KIVRIMDAN ÖNCEKİ DÜZ KISIMDIR (mm). 1. KIVRIMDA PARÇA BAŞINDAN KIVRIMA KADAR OLAN DÜZLÜK; DİĞERLERİNDE BİR ÖNCEKİ KIVRIMIN BİTİŞİNDEN BU KIVRIMA KADAR. ARA DÜZLÜK YOKSA 0 YAZIN. SON KIVRIMDAN SONRAKİ DÜZ KISIM PARÇA BOYUNDAN OTOMATİK HESAPLANIR.':
    'THE STRAIGHT BEFORE THIS BEND (mm). FOR BEND 1: FROM THE PART START TO THE BEND; FOR THE OTHERS: FROM THE END OF THE PREVIOUS BEND TO THIS ONE. ENTER 0 IF THERE IS NO STRAIGHT IN BETWEEN. THE STRAIGHT AFTER THE LAST BEND IS CALCULATED FROM THE PART LENGTH.',
  'PARÇAYI DAHA UZUN KESİN': 'CUT THE PART LONGER',
  'Parçayı <b>{mm} mm</b> daha uzun kesin.': 'Cut the part <b>{mm} mm</b> longer.',
  'Fazlalık parçanın <b>BAŞINA</b> (1. kıvrımdan önceki düz kısma) eklenir.':
    'The extra length goes to the <b>START</b> of the part (the straight before bend 1).',
  'Fazlalık parçanın <b>SONUNA</b> (son kıvrımdan sonraki düz kısma) eklenir.':
    'The extra length goes to the <b>END</b> of the part (the straight after the last bend).',
  'Neden: Kıvrım büküldükten sonra ölçülebilmesi için parçanın ucunda yeterli düz kısım yok.':
    'Why: there is not enough straight at the part end to measure the bend after bending.',
  'Neden: Makine kıvrımı bükerken parçayı düz kısmından tutar; parçanın ucundaki düz kısım bunun için kısa.':
    'Why: the machine holds the part by its straight while bending; the straight at the part end is too short for that.',
  'BÜKÜM PARÇANIN SONUNDAN BAŞLAYACAK': 'BENDING STARTS FROM THE PART END',
  'Kıvrımlar <b>sondan başa</b> bükülecek: önce {n}. kıvrım, en son 1. kıvrım.':
    'Bends will be made <b>from the end to the start</b>: bend {n} first, bend 1 last.',
  'Kıvrım parçanın <b>sonu</b> tarafından bükülecek.': 'The bend will be made from the part <b>end</b>.',
  'Neden: Bu kıvrım düzeninde parçanın sonundan başlamak daha güvenli. Başlangıç noktası parçanın sonu tarafından alınır.':
    'Why: with this bend layout it is safer to start from the part end. The start point is taken from the part end.',
  'Kesilecek parça boyu': 'Part length to cut',
  '(girdiğiniz {a} mm + {b} mm)': '(your {a} mm + {b} mm)',
  'SONDAN BAŞA': 'END TO START',
  'Kıvrımlar parçanın sonundan başa doğru bükülecek ({p}. kıvrım → 1. kıvrım).':
    'Bends will be made from the part end towards the start (bend {p} → bend 1).',
  'Kıvrım parçanın sonu tarafından bükülecek.': 'The bend will be made from the part end.',
  'Parçanın <b>başına</b> +{mm} mm eklendi.': '+{mm} mm added to the part <b>start</b>.',
  'Parçanın <b>sonuna</b> +{mm} mm eklendi.': '+{mm} mm added to the part <b>end</b>.',
  'Parça boyu': 'Part length',
  'Sondaki düz': 'End straight',
  '{n}. kıvrım': 'bend {n}',
}

export default en
