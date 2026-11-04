// İngilizce sözlük — Sertifika Sorgula ekranı (CertificateQueryPage, DataApi /api/certificates/{code}).
// Anahtar = Türkçe kaynak metin (birebir), değer = İngilizce. Ekranın eski anahtarları settingsPages.ts'te.
const en: Record<string, string> = {
  'Sertifika numarasında büyük / küçük harf fark etmez.': 'Certificate numbers are not case-sensitive.',
  'SORGULAMA YAPILAMADI': 'QUERY FAILED',
  'Sertifika veritabanına ulaşılamadı. Bağlantıyı kontrol edip tekrar deneyin.':
    'Could not reach the certificate database. Check the connection and try again.',
  'SÜRESİZ': 'NO EXPIRY',
}

export default en
