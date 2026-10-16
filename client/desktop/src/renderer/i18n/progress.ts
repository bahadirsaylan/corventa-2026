// Backend (ve demo) büküm ilerleme mesajları Türkçe gelir. UI bu mesajları regex ile AYRIŞTIRIR
// (paso / segment tespiti) — o yüzden ayrıştırma HAM mesajla yapılır, bu fonksiyon SADECE
// ekranda gösterirken uygulanır: translateProgress(msg, lang).

import type { LangCode } from './index'

type Rule = [RegExp, (m: RegExpExecArray) => string]

const SIDE: Record<string, string> = { SAĞ: 'RIGHT', SOL: 'LEFT' }
const num = (s: string) => s.replace(',', '.')

const EN_RULES: Rule[] = [
  [/^Büküm başlıyor\.\.\.$/i, () => 'Bending starting...'],
  [/^Parça sıkıştırılıyor\.\.\.$/i, () => 'Clamping part...'],
  [/^Parça sıfırlanıyor.*$/i, () => 'Zeroing part...'],
  [/^Paso (\d+) bükülüyor \(adaptif temas\)$/i, (m) => `Bending pass ${m[1]} (adaptive contact)`],
  [/^Paso (\d+) bükülüyor$/i, (m) => `Bending pass ${m[1]}`],
  [/^Paso (\d+) tamamlandı \(adaptif temas\)$/i, (m) => `Pass ${m[1]} completed (adaptive contact)`],
  [/^Paso (\d+) tamamlandı$/i, (m) => `Pass ${m[1]} completed`],
  [/^Dinamik paso (\d+) tamamlandı$/i, (m) => `Dynamic pass ${m[1]} completed`],
  [/^Büküm tamamlandı!?$/i, () => 'Bending completed!'],
  [/^Geri esneme düzeltmesi başlıyor\.\.\.$/i, () => 'Springback correction starting...'],
  [/^Geri esneme (\d+): üst top boşluk alıyor$/i, (m) => `Springback ${m[1]}: upper roll taking up slack`],
  [/^Geri esneme (\d+): ölçüm pnömatiği uzatılıyor \((SAĞ|SOL)\)$/i, (m) => `Springback ${m[1]}: extending measuring pneumatic (${SIDE[m[2]] ?? m[2]})`],
  [/^Geri esneme (\d+): sensör okunuyor\.\.\.$/i, (m) => `Springback ${m[1]}: reading sensor...`],
  [/^Geri esneme (\d+): (Ø[\d.,]+) ölçüldü ✓ tolerans içinde$/i, (m) => `Springback ${m[1]}: ${num(m[2])} measured ✓ within tolerance`],
  [/^Geri esneme (\d+): (Ø[\d.,]+) ölçüldü — düzeltme gerekmiyor$/i, (m) => `Springback ${m[1]}: ${num(m[2])} measured — no correction needed`],
  [/^Geri esneme (\d+): (Ø[\d.,]+) ölçüldü → düzeltmesiz, karşıdan ölçülecek$/i, (m) => `Springback ${m[1]}: ${num(m[2])} measured → no correction, re-measuring from the other side`],
  [/^Geri esneme (\d+): (Ø[\d.,]+) ölçüldü → düzeltme (Ø[\d.,]+)$/i, (m) => `Springback ${m[1]}: ${num(m[2])} measured → correction ${num(m[3])}`],
  [/^Geri esneme (\d+): düzeltme bükümü \((SAĞ|SOL) top ([\d.,]+)\)$/i, (m) => `Springback ${m[1]}: correction bend (${SIDE[m[2]] ?? m[2]} roll ${num(m[3])})`],
  [/^Arc büküm başlatıldı$/i, () => 'Multi-angle bending started'],
  [/^Arc büküm tamamlandı$/i, () => 'Multi-angle bending completed'],
  [/^Seg(\d+) düzlük$/i, (m) => `Seg${m[1]} straight`],
  [/^Seg(\d+) paso(\d+)\/(\d+) \((fwd|rew)\) \[(Left|Right)\] piston ([\d.,]+)mm$/i, (m) => `Seg${m[1]} pass ${m[2]}/${m[3]} (${m[4]}) [${m[5]}] piston ${num(m[6])}mm`],
  [/^Sıradaki segment \((\d+)\/(\d+)\) için R\/α\/L girin$/i, (m) => `Enter R/α/L for the next segment (${m[1]}/${m[2]})`],
  [/^İptal edildi$/i, () => 'Cancelled'],
  [/^Hata: (.*)$/i, (m) => `Error: ${m[1]}`],
]

export function translateProgress(message: string | null | undefined, lang: LangCode): string {
  const msg = message ?? ''
  if (lang === 'tr' || !msg) return msg
  if (lang !== 'en') return msg // diğer diller: kural seti eklenene kadar Türkçe
  for (const [re, fn] of EN_RULES) {
    const m = re.exec(msg)
    if (m) return fn(m)
  }
  return msg
}
