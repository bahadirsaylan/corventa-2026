// İngilizce sözlük — dairesel ön büküm tek rotasyon ayarı (2026-11-02).

const en: Record<string, string> = {
  'ÖN BÜKÜM (DAİRESEL)': 'PRE-BEND (CIRCULAR)',
  'Varsayılan KAPALI. Açtıktan sonra ilk bükümü makinenin başında izleyin.': 'OFF by default. After enabling, watch the first bend at the machine.',
  'ÖN BÜKÜM TEK ROTASYON (DAİRESEL)': 'PRE-BEND SINGLE ROTATION (CIRCULAR)',
  'AÇIK: 1. pasoda temas + adımdan sonra aktif top basılıyken parça tek seferde diğer uca sürülür (kısa rotasyon / vals değişimi yok); 2. paso diğer topu bükme konumu + adıma götürür, sonrası aynı. KAPALI: eski akış.':
    'ON: in pass 1, after contact + step the part is driven to the other end in one go while the active roll keeps pressing (no short rotation / roll swap); pass 2 moves the other roll to bending position + step, the rest is unchanged. OFF: previous flow.',
}

export default en
