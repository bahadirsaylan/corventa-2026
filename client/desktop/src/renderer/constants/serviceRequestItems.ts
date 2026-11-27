// Servis talebi — başlığa göre HAZIR MADDELER (2026-11-16, kullanıcı isteği).
// Operatör başlığı seçince detay bölümünde bu maddeler işaretlenebilir liste olarak gelir; işaretleyip
// hızlıca gönderir, isterse altta EK AÇIKLAMA yazar. Gönderilen metin Türkçe kalır (backend değişmedi):
// problemDescription = başlık + işaretli maddeler + ek açıklama.
// Anahtar = başlık metni (ServiceRequestFormPage TITLE_OPTIONS ile birebir). Listesi olmayan başlıkta
// (DİĞER) sadece açıklama yazılır.

export interface ServiceItem {
  label: string
}

export const SERVICE_TITLE_ITEMS: Record<string, readonly ServiceItem[]> = {
  // ── ARIZA GİDERME ──
  'HİDROLİK ARIZA': [
    { label: 'YAĞ KAÇAĞI VAR' },
    { label: 'BASINÇ YÜKSELMİYOR / DÜŞÜK' },
    { label: 'BASINÇ DALGALANIYOR' },
    { label: 'PİSTON YAVAŞ / GÜÇSÜZ HAREKET EDİYOR' },
    { label: 'PİSTON KENDİLİĞİNDEN KAYIYOR' },
    { label: 'YAĞ AŞIRI ISINIYOR' },
    { label: 'POMPADAN ANORMAL SES GELİYOR' },
    { label: 'VALF ÇALIŞMIYOR / TAKILIYOR' },
  ],
  'ELEKTRİK / ELEKTRONİK ARIZA': [
    { label: 'MAKİNE ENERJİ ALMIYOR' },
    { label: 'SİGORTA / ŞALTER ATIYOR' },
    { label: 'MOTOR TERMİĞİ ATIYOR' },
    { label: 'FAZ HATASI UYARISI' },
    { label: 'PANO İÇİNDE KOKU / AŞIRI ISINMA' },
    { label: 'KABLO / KONNEKTÖR HASARI' },
  ],
  'PLC / YAZILIM ARIZASI': [
    { label: 'EKRAN DONUYOR / YANIT VERMİYOR' },
    { label: 'PLC BAĞLANTISI KOPUYOR' },
    { label: 'PROGRAM AÇILMIYOR' },
    { label: 'EKRANDA HATA MESAJI ÇIKIYOR' },
    { label: 'BÜKÜM YARIDA KALIYOR' },
    { label: 'ÖLÇÜ / HESAP YANLIŞ ÇIKIYOR' },
  ],
  'SENSÖR ARIZASI (ENCODER / BASINÇ / PARÇA SENSÖRÜ)': [
    { label: 'ENCODER (CETVEL) DEĞERİ DEĞİŞMİYOR' },
    { label: 'ENCODER (CETVEL) DEĞERİ ZIPLIYOR' },
    { label: 'PARÇA SENSÖRÜ ALGILAMIYOR' },
    { label: 'BASINÇ SENSÖRÜ YANLIŞ GÖSTERİYOR' },
    { label: 'YAĞ SICAKLIK SENSÖRÜ YANLIŞ GÖSTERİYOR' },
    { label: 'ÖLÇÜM (GERİ ESNEME) SENSÖRÜ YANLIŞ ÖLÇÜYOR' },
  ],
  'MOTOR / POMPA ARIZASI': [
    { label: 'MOTOR ÇALIŞMIYOR' },
    { label: 'MOTOR ÇALIŞIYOR AMA BASINÇ YOK' },
    { label: 'AŞIRI SES / TİTREŞİM' },
    { label: 'MOTOR AŞIRI ISINIYOR' },
    { label: 'KAPLİN / BAĞLANTI HASARI' },
  ],
  'MEKANİK ARIZA (TOP / RULMAN / MİL)': [
    { label: 'TOPLARDA AŞINMA / İZ' },
    { label: 'RULMANDAN SES GELİYOR' },
    { label: 'MİLDE BOŞLUK / SALGI' },
    { label: 'ROTASYON DÖNMÜYOR / ZORLANIYOR' },
    { label: 'YAN DAYAMA ÇALIŞMIYOR' },
    { label: 'CIVATA / BAĞLANTI GEVŞEMESİ' },
  ],
  'ACİL STOP / EMNİYET DEVRESİ': [
    { label: 'ACİL STOP KURTARILAMIYOR' },
    { label: 'ACİL STOP ÇALIŞMIYOR' },
    { label: 'EMNİYET KAPAĞI / SENSÖRÜ UYARI VERİYOR' },
    { label: 'ALARM SUSMUYOR' },
  ],

  // ── GENEL BAKIM ──
  'GÜNLÜK BAKIM': [
    { label: 'YAĞ SEVİYESİ KONTROLÜ' },
    { label: 'HİDROLİK KAÇAK GÖRSEL KONTROLÜ' },
    { label: 'ACİL STOP TESTİ' },
    { label: 'TOPLARIN VE ÇALIŞMA ALANININ TEMİZLİĞİ' },
    { label: 'PARÇA SENSÖRLERİNİN TEMİZLİĞİ' },
    { label: 'ANORMAL SES / TİTREŞİM KONTROLÜ' },
  ],
  'HAFTALIK BAKIM': [
    { label: 'HAVA FİLTRESİ / SU TAHLİYESİ' },
    { label: 'PNÖMATİK HAT BASINCI KONTROLÜ' },
    { label: 'BAĞLANTI CIVATALARI KONTROLÜ' },
    { label: 'ENCODER (CETVEL) OKUMALARI KONTROLÜ' },
    { label: 'FAN VE SOĞUTMA KONTROLÜ' },
    { label: 'RULMAN / MİL GRESLEME' },
  ],
  'AYLIK BAKIM': [
    { label: 'HİDROLİK HORTUM VE RAKOR KONTROLÜ' },
    { label: 'ELEKTRİK PANO TEMİZLİĞİ VE KLEMENS KONTROLÜ' },
    { label: 'S1 / S2 BASINÇ AYARI KONTROLÜ' },
    { label: 'REDÜKTÖR YAĞ SEVİYESİ' },
    { label: 'YAN DAYAMA VE PNÖMATİK SİLİNDİR KONTROLÜ' },
    { label: 'GÖNYE / STAGE KONTROLÜ' },
  ],
  '6 AYLIK BAKIM': [
    { label: 'HİDROLİK YAĞ ANALİZİ / KİRLİLİK KONTROLÜ' },
    { label: 'HİDROLİK FİLTRE DEĞİŞİMİ' },
    { label: 'REDÜKTÖR YAĞI KONTROLÜ / DEĞİŞİMİ' },
    { label: 'TOP YATAKLARI VE RULMAN KONTROLÜ' },
    { label: 'SENSÖR KALİBRASYON KONTROLÜ' },
    { label: 'TOPRAKLAMA VE İZOLASYON ÖLÇÜMÜ' },
  ],
  'YILLIK BAKIM': [
    { label: 'HİDROLİK YAĞ DEĞİŞİMİ' },
    { label: 'TÜM FİLTRELERİN DEĞİŞİMİ' },
    { label: 'VALF VE PİSTON CONTA KONTROLÜ' },
    { label: 'MOTOR / POMPA GENEL KONTROLÜ' },
    { label: 'TAM KALİBRASYON (ENCODER, BASINÇ, ÖLÇÜM)' },
    { label: 'YAZILIM / PLC GÜNCELLEME KONTROLÜ' },
  ],
  'YAĞ / FİLTRE DEĞİŞİMİ': [
    { label: 'HİDROLİK YAĞ DEĞİŞİMİ' },
    { label: 'HİDROLİK FİLTRE DEĞİŞİMİ' },
    { label: 'HAVA FİLTRESİ DEĞİŞİMİ' },
    { label: 'REDÜKTÖR YAĞI DEĞİŞİMİ' },
    { label: 'YAĞ KİRLİLİK SENSÖRÜ KONTROLÜ' },
  ],

  // ── AĞIR BAKIM ──
  'MÜŞTERİ TALEBİ': [
    { label: 'TOP / VALS DEĞİŞİMİ' },
    { label: 'RULMAN VE YATAK DEĞİŞİMİ' },
    { label: 'HİDROLİK PİSTON REVİZYONU (CONTA)' },
    { label: 'POMPA / MOTOR REVİZYONU' },
    { label: 'VALF BLOĞU REVİZYONU' },
    { label: 'ELEKTRİK PANO REVİZYONU' },
    { label: 'BOYA / GÖVDE ONARIMI' },
    { label: 'KOMPLE GENEL REVİZYON' },
  ],

  // ── KURULUM ──
  'İLK KURULUM / DEVREYE ALMA': [
    { label: 'YERLEŞİM VE TESVİYE' },
    { label: 'ELEKTRİK BAĞLANTISI' },
    { label: 'HİDROLİK YAĞ DOLUMU' },
    { label: 'GÖNYE VE STAGE AYARI' },
    { label: 'DENEME BÜKÜMÜ' },
    { label: 'OPERATÖRE TESLİM' },
  ],
  'MAKİNE TAŞIMA / YENİDEN KURULUM': [
    { label: 'SÖKÜM VE PAKETLEME' },
    { label: 'YENİ YERDE MONTAJ VE TESVİYE' },
    { label: 'BAĞLANTILAR VE DEVREYE ALMA' },
    { label: 'DENEME BÜKÜMÜ' },
  ],
  'KALIP / APARAT MONTAJI': [
    { label: 'KALIP MONTAJI' },
    { label: 'KALIP KODU / LİSANS AKTİVASYONU' },
    { label: 'AYAR VE DENEME BÜKÜMÜ' },
  ],

  // ── EĞİTİM ──
  'OPERATÖR EĞİTİMİ': [
    { label: 'GÜVENLİ KULLANIM' },
    { label: 'MANUEL KULLANIM' },
    { label: 'OTOMATİK / YAPAY ZEKA BÜKÜM' },
    { label: 'TAHLİYE VE PARÇA DEĞİŞİMİ' },
  ],
  'BAKIM EĞİTİMİ': [
    { label: 'GÜNLÜK / HAFTALIK BAKIM' },
    { label: 'YAĞ VE FİLTRE DEĞİŞİMİ' },
    { label: 'ARIZA TESPİTİ' },
  ],
  'YAZILIM / YENİ ÖZELLİK EĞİTİMİ': [
    { label: 'YENİ ÖZELLİKLER' },
    { label: 'AYARLAR VE KULLANICI YÖNETİMİ' },
    { label: 'BULUT / SERVİS TALEBİ' },
  ],
  'İLERİ SEVİYE (AI BÜKÜM) EĞİTİMİ': [
    { label: 'YAPAY ZEKA REÇETE KULLANIMI' },
    { label: 'ÇOK AÇILI BÜKÜM' },
    { label: 'GERİ ESNEME DÜZELTMESİ' },
  ],
}

/** Başlığın hazır maddeleri (yoksa boş) */
export function serviceItemsFor(title: string): readonly ServiceItem[] {
  return SERVICE_TITLE_ITEMS[title] ?? []
}
