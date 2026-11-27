// İngilizce sözlük — inceleme düzeltmeleri (müşteri değişikliği notu, bakım sayfası notu).
// Anahtar = Türkçe kaynak metin (birebir), değer = İngilizce. {ad} yer tutucuları iki tarafta aynı.
const en: Record<string, string> = {
  'Onay kodu kayıtlı onay e-posta adresine gönderilir; gönderilen adres bir sonraki adımda gösterilir. Kod 10 dakika geçerlidir, en fazla 5 deneme hakkı vardır.':
    'The confirmation code is sent to the registered approval e-mail address; the address is shown in the next step. The code is valid for 10 minutes, with at most 5 attempts.',
  "'nu açık tutun — modda geçen süre BAKIM kullanım süresine yazılır. (PDF s.8-12)":
    ' on — time spent in this mode is recorded as MAINTENANCE usage time. (PDF p.8-12)',
}

export default en
