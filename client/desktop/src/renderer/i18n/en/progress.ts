// İngilizce sözlük — backend büküm ilerleme mesajı şablonları (../progress.ts kuralları üretir).

const en: Record<string, string> = {
  'Büküm başlıyor...': 'Bending starting...',
  'Parça sıkıştırılıyor...': 'Clamping part...',
  'Parça sıfırlanıyor...': 'Zeroing part...',
  'Paso {n} bükülüyor (adaptif temas)': 'Bending pass {n} (adaptive contact)',
  'Paso {n} bükülüyor': 'Bending pass {n}',
  'Paso {n} tamamlandı (adaptif temas)': 'Pass {n} completed (adaptive contact)',
  'Paso {n} tamamlandı': 'Pass {n} completed',
  'Dinamik paso {n} tamamlandı': 'Dynamic pass {n} completed',
  'Büküm tamamlandı!': 'Bending completed!',
  'Geri esneme düzeltmesi başlıyor...': 'Springback correction starting...',
  'Geri esneme {n}: üst top boşluk alıyor': 'Springback {n}: upper roll taking up slack',
  'Geri esneme {n}: ölçüm pnömatiği uzatılıyor ({side})': 'Springback {n}: extending measuring pneumatic ({side})',
  'Geri esneme {n}: sensör okunuyor...': 'Springback {n}: reading sensor...',
  'Geri esneme {n}: {d} ölçüldü ✓ tolerans içinde': 'Springback {n}: {d} measured ✓ within tolerance',
  'Geri esneme {n}: {d} ölçüldü — düzeltme gerekmiyor': 'Springback {n}: {d} measured — no correction needed',
  'Geri esneme {n}: {d} ölçüldü → düzeltmesiz, karşıdan ölçülecek':
    'Springback {n}: {d} measured → no correction, re-measuring from the other side',
  'Geri esneme {n}: {d} ölçüldü → düzeltme {c}': 'Springback {n}: {d} measured → correction {c}',
  'Geri esneme {n}: düzeltme bükümü ({side} top {mm})': 'Springback {n}: correction bend ({side} roll {mm})',
  'Arc büküm başlatıldı': 'Multi-angle bending started',
  'Arc büküm tamamlandı': 'Multi-angle bending completed',
  'Seg{s} düzlük': 'Seg{s} straight',
  'Seg{s} paso{p}/{t} ({dir}) [{side}] piston {mm}mm': 'Seg{s} pass {p}/{t} ({dir}) [{side}] piston {mm}mm',
  'Sıradaki segment ({i}/{n}) için R/α/L girin': 'Enter R/α/L for the next segment ({i}/{n})',
  'İptal edildi': 'Cancelled',
  'Hata: {msg}': 'Error: {msg}',
}

export default en
