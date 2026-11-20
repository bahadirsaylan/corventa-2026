// İngilizce sözlük — Müşteri Değişikliği ekranı (CustomerChangePage, UI madde 17: satış / takas / hibe +
// e-posta OTP onayı, DataApi /api/customer-change/*). Anahtar = Türkçe kaynak metin (birebir).
// Ortak anahtarlar (Geri, SATIŞ/TAKAS/HİBE, VERGİ NO, TELEFON, E-POSTA, ADRES, MEVCUT MÜŞTERİ, …)
// settingsPages.ts ve diğer sözlüklerde tanımlı — burada tekrarlanmaz.
const en: Record<string, string> = {
  // ── Adımlar ──
  'NEDEN': 'REASON',
  'ONAY KODU': 'CONFIRMATION CODE',
  'MÜŞTERİ NEDEN DEĞİŞİYOR?': 'WHY IS THE CUSTOMER CHANGING?',
  'Makine yeni müşteriye satılıyor.': 'The machine is being sold to a new customer.',
  'Makine başka bir makine ile takas ediliyor.': 'The machine is being traded for another machine.',
  'Makine bedelsiz olarak yeni sahibine devrediliyor.': 'The machine is being transferred to its new owner free of charge.',

  // ── Mevcut / yeni müşteri ──
  'GÜNCEL MÜŞTERİ': 'CURRENT CUSTOMER (UPDATED)',
  'SAHİPLİK TİPİ': 'OWNERSHIP TYPE',
  'FİRMA UNVANI': 'COMPANY TITLE',
  'MÜŞTERİ ADI *': 'CUSTOMER NAME *',
  'AÇIKLAMA / NOT': 'DESCRIPTION / NOTE',
  '+90 ...': '+90 ...',
  'YENİ MÜŞTERİ BİLGİLERİ': 'NEW CUSTOMER DETAILS',
  'Makine kimliği alınamadı (DataApi bağlantısını kontrol edin).':
    'Machine identity could not be retrieved (check the DataApi connection).',
  'Ekran klavyesi': 'On-screen keyboard',
  'E-posta adresi geçersiz.': 'The e-mail address is invalid.',

  // ── OTP ──
  'Onay kodu Corventa yetkili e-posta adresine gönderilir. Kod 10 dakika geçerlidir, en fazla 5 deneme hakkı vardır.':
    'The confirmation code is sent to the authorised Corventa e-mail address. The code is valid for 10 minutes, with at most 5 attempts.',
  'ONAY KODU GÖNDER': 'SEND CONFIRMATION CODE',
  'GÖNDERİLİYOR…': 'SENDING…',
  'E-POSTA ONAYI': 'E-MAIL CONFIRMATION',
  'Onay kodu {email} adresine gönderildi.': 'The confirmation code was sent to {email}.',
  'Kalan süre: {t}': 'Time left: {t}',
  'Kodun süresi doldu.': 'The code has expired.',
  'Bu kod artık kullanılamaz.': 'This code can no longer be used.',
  'YENİ KOD GÖNDER': 'SEND NEW CODE',
  'YENİ KOD GÖNDER ({n} sn)': 'SEND NEW CODE ({n} s)',
  'KONTROL EDİLİYOR…': 'CHECKING…',
  'ONAYLA VE MÜŞTERİYİ DEĞİŞTİR': 'CONFIRM AND CHANGE CUSTOMER',
  'Yeni onay kodu gönderildi. Önceki kod artık geçersiz.': 'A new confirmation code was sent. The previous code is no longer valid.',

  // ── Sonuç ──
  'MÜŞTERİ DEĞİŞİKLİĞİ TAMAMLANDI': 'CUSTOMER CHANGE COMPLETED',
  'Makine artık {name} adına kayıtlı. Sahiplik tipi: {type}.': 'The machine is now registered to {name}. Ownership type: {type}.',
  'AYARLARA DÖN': 'BACK TO SETTINGS',

  // ── Hatalar ──
  'Onay kodu hatalı. Kalan deneme hakkı: {n}': 'Incorrect confirmation code. Attempts left: {n}',
  '6 haneli onay kodunu girin.': 'Enter the 6-digit confirmation code.',
  'Onay kodunun süresi doldu veya kod geçersiz. "YENİ KOD GÖNDER" ile yeni kod isteyin.':
    'The confirmation code has expired or is invalid. Request a new code with "SEND NEW CODE".',
  'Deneme hakkı bitti (5 yanlış deneme). "YENİ KOD GÖNDER" ile yeni kod isteyin.':
    'No attempts left (5 wrong attempts). Request a new code with "SEND NEW CODE".',
  'Talep bulunamadı. "YENİ KOD GÖNDER" ile yeni kod isteyin.': 'Request not found. Request a new code with "SEND NEW CODE".',
  'Bu talep zaten onaylanmış. Müşteri bilgisi güncellenmiş olabilir — sayfayı yeniden açın.':
    'This request has already been confirmed. The customer details may have been updated — reopen the page.',
  'Veri servisine (DataApi) ulaşılamadı. Bağlantıyı kontrol edip tekrar deneyin.':
    'Could not reach the data service (DataApi). Check the connection and try again.',
  'Onay başarısız.': 'Confirmation failed.',
  'E-posta servisi ayarlı değil — onay kodu gönderilemedi. DataApi e-posta (SMTP) ve onay adresi ayarları yapılmalı.':
    'The e-mail service is not configured — the confirmation code could not be sent. The DataApi e-mail (SMTP) and confirmation address settings must be set.',
  'E-posta gönderilemedi — onay kodu iletilemedi. İnternet bağlantısını kontrol edip tekrar deneyin.':
    'The e-mail could not be sent — the confirmation code was not delivered. Check the internet connection and try again.',
  'Bilgiler geçersiz — lütfen kontrol edin.': 'The details are invalid — please check them.',
  'Talep gönderilemedi.': 'The request could not be sent.',
}

export default en
