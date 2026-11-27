// İngilizce sözlük — ÜST-ALT TOP BİNDİRME KONTROLÜ (2026-11-20): top dış çapı (kenar) ayarları, ölçü / vals dizilimi
// ekranı uyarısı, backend mesajları (tp — {0} yer tutucuları C# interpolasyon boşlukları).

const en: Record<string, string> = {
  // ── UI ──
  'ÜST VE ALT TOP BİNDİRİR — PROFİL A EN AZ {min} mm OLMALI (GİRİLEN {a} mm)':
    'UPPER AND LOWER ROLLS WOULD COLLIDE — PROFILE A MUST BE AT LEAST {min} mm (ENTERED {a} mm)',

  // ── Admin Ayarları ──
  'ÜST TOP DIŞ ÇAPI': 'UPPER ROLL OUTER DIAMETER',
  'ALT TOP DIŞ ÇAPI': 'LOWER ROLL OUTER DIAMETER',
  'SOL TOP DIŞ ÇAPI': 'LEFT ROLL OUTER DIAMETER',
  'SAĞ TOP DIŞ ÇAPI': 'RIGHT ROLL OUTER DIAMETER',
  'Kenar çapı — sadece bindirme kontrolü. Büküm hesabı iç çapla yapılır.':
    'Flange diameter — collision check only. The bending calculation uses the inner diameter.',
  'ÜST-ALT TOP BİNDİRME KONTROLÜ': 'UPPER-LOWER ROLL COLLISION CHECK',
  'Açıkken profil A, top dış ve iç çap farkından küçükse büküm başlamaz (220 / 280 toplarda A en az 60 mm); üst / alt top kenarları çarpışacak konum hareketi yapılmaz, ileri jog ve basınç hareketi kenarlar yaklaşınca durdurulur.':
    'When on, bending does not start if profile A is smaller than the outer-inner roll diameter difference (A at least 60 mm with 220 / 280 rolls); position moves that would make the upper / lower roll flanges collide are refused, forward jog and pressure moves are stopped when the flanges get close.',
  'BİNDİRME KONTROLÜ': 'COLLISION CHECK',
  'KENARLAR ARASI EN AZ BOŞLUK': 'MINIMUM FLANGE CLEARANCE',
  'Üst ve alt top kenarları arasında bırakılacak pay.': 'Clearance to keep between the upper and lower roll flanges.',
  'JOG DURDURMA PAYI': 'JOG STOP MARGIN',
  'İleri jog sırasında kenarlar bu kadar yaklaşınca top durur.': 'During forward jog the roll stops when the flanges get this close.',

  // ── Backend mesajları ──
  'ÜST VE ALT TOP BİNDİRİR: profil A = {0} mm, en az {1} mm olmalı (top dış çapı üst {2} / alt {3} mm, iç çapı üst {4} / alt {5} mm)':
    'UPPER AND LOWER ROLLS WOULD COLLIDE: profile A = {0} mm, must be at least {1} mm (roll outer diameter upper {2} / lower {3} mm, inner diameter upper {4} / lower {5} mm)',
  'ÜST VE ALT TOP BİNDİRİR — hedefte kenarlar arası {0} mm kalır (en az {1} mm). Hareket yapılmadı.':
    'UPPER AND LOWER ROLLS WOULD COLLIDE — {0} mm would remain between the flanges at the target (minimum {1} mm). The move was not made.',
  'ÜST VE ALT TOP BİNDİRİR — kenarlar arası {0} mm, {1} top ileri hareket ettirilemez.':
    'UPPER AND LOWER ROLLS WOULD COLLIDE — {0} mm between the flanges, the {1} roll cannot be moved forward.',
  'ÜST VE ALT TOP BİNDİRME SINIRI — kenarlar arası {0} mm, {1} top durduruldu.':
    'UPPER-LOWER ROLL COLLISION LIMIT — {0} mm between the flanges, {1} roll stopped.',
  'Top dış çapları (üst / alt / sol / sağ) 1-1000 mm arası olmalı': 'Roll outer diameters (upper / lower / left / right) must be between 1 and 1000 mm',
  'Top dış çapı iç çaptan küçük olamaz': 'The roll outer diameter cannot be smaller than the inner diameter',
  'Üst-alt top en az kenar boşluğu 0-50 mm arası olmalı': 'The minimum upper-lower flange clearance must be between 0 and 50 mm',
  'Jog durdurma payı 0-50 mm arası olmalı': 'The jog stop margin must be between 0 and 50 mm',
}

export default en
