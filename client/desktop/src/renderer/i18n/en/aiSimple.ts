// 2026-11-27 — AI öğrenme: sade kontrol penceresi + ilk ölçüme en yakın kayıt ayarı
const en: Record<string, string> = {
  'Kayıtlar kontrol ediliyor...': 'Checking records...',
  'EŞLEŞEN KAYIT BULUNDU': 'MATCHING RECORD FOUND',
  'EŞLEŞEN KAYIT YOK': 'NO MATCHING RECORD',
  'Kayıtlar kontrol edilemedi': 'Records could not be checked',
  'İLK ÖLÇÜME EN YAKIN KAYIT': 'RECORD CLOSEST TO FIRST MEASUREMENT',
  'Eşleşen tüm kayıtlar bükümde hafızaya alınır; ilk geri esneme ölçümünden sonra ilk ölçümü en yakın olan kullanılır (eşitlikte üstteki seçim)':
    'All matching records are loaded during bending; after the first springback measurement the one with the closest first measurement is used (ties: the selection above)',
}

export default en
