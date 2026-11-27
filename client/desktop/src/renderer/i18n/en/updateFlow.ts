// 2026-11-26 — tek tuşla güncelleme (Bulut Bağlantısı > Yazılım güncellemesi)
const en: Record<string, string> = {
  'GÜNCELLE': 'UPDATE',
  'VERİTABANI YEDEĞİ ALINIYOR…': 'BACKING UP DATABASE…',
  'GÜNCELLEME YAPILAMADI': 'UPDATE FAILED',
  'Güncelleme iptal edildi': 'Update cancelled',
  'Makine boşalınca kurulacak': 'Will install when the machine is idle',
  'Büküm sürüyor — bitince kurulacak': 'Bending in progress — will install when it finishes',
  'Tahliye sürüyor — bitince kurulacak': 'Unloading in progress — will install when it finishes',
  'Makine hareket halinde — durunca kurulacak': 'Machine is moving — will install when it stops',
  'GÜNCELLEME İNDİRİLİP KURULACAK. BÜKÜM / TAHLİYE / HAREKET VARSA BİTMESİ BEKLENİR; KURULUMDAN ÖNCE VERİTABANI YEDEKLENİR, UYGULAMA KAPANIP OTOMATİK AÇILIR. DEVAM EDİLSİN Mİ':
    'THE UPDATE WILL BE DOWNLOADED AND INSTALLED. ANY BENDING / UNLOADING / MOTION IS WAITED FOR; THE DATABASE IS BACKED UP BEFORE INSTALLING, THE APP CLOSES AND REOPENS AUTOMATICALLY. CONTINUE?',
  'Yeni sürüm yok': 'No new version',
  'İndirme başlamadı': 'Download did not start',
  'İndirme zaman aşımı (60 dk)': 'Download timed out (60 min)',
}

export default en
