// Backend (ve demo) büküm ilerleme mesajları Türkçe gelir. UI bu mesajları regex ile AYRIŞTIRIR
// (paso / segment tespiti) — o yüzden ayrıştırma HAM mesajla yapılır, bu fonksiyon SADECE
// ekranda gösterirken uygulanır: translateProgress(msg, lang).
//
// Her kural ham mesajı bir ŞABLON anahtarına + değişkenlere çevirir; şablonun karşılığı dil
// sözlüklerindedir (./<dil>/progress.ts). Yeni dil eklerken kod değişmez, sadece sözlük yazılır.

import type { LangCode, TVars } from './index'
import { translate } from './index'

type Rule = [RegExp, (m: RegExpExecArray) => [string, TVars?]]

const num = (s: string) => s.replace(',', '.')

const RULES: Rule[] = [
  [/^Büküm başlıyor\.\.\.$/i, () => ['Büküm başlıyor...']],
  [/^Parça sıkıştırılıyor\.\.\.$/i, () => ['Parça sıkıştırılıyor...']],
  [/^Parça sıfırlanıyor.*$/i, () => ['Parça sıfırlanıyor...']],
  [/^Paso (\d+) bükülüyor \(adaptif temas\)$/i, (m) => ['Paso {n} bükülüyor (adaptif temas)', { n: m[1] }]],
  [/^Paso (\d+) bükülüyor$/i, (m) => ['Paso {n} bükülüyor', { n: m[1] }]],
  [/^Paso (\d+) tamamlandı \(adaptif temas\)$/i, (m) => ['Paso {n} tamamlandı (adaptif temas)', { n: m[1] }]],
  [/^Paso (\d+) tamamlandı$/i, (m) => ['Paso {n} tamamlandı', { n: m[1] }]],
  [/^Dinamik paso (\d+) tamamlandı$/i, (m) => ['Dinamik paso {n} tamamlandı', { n: m[1] }]],
  [/^Büküm tamamlandı!?$/i, () => ['Büküm tamamlandı!']],
  [/^Geri esneme düzeltmesi başlıyor\.\.\.$/i, () => ['Geri esneme düzeltmesi başlıyor...']],
  [/^Geri esneme (\d+): üst top boşluk alıyor$/i, (m) => ['Geri esneme {n}: üst top boşluk alıyor', { n: m[1] }]],
  [/^Geri esneme (\d+): ölçüm pnömatiği uzatılıyor \((SAĞ|SOL)\)$/i, (m) => ['Geri esneme {n}: ölçüm pnömatiği uzatılıyor ({side})', { n: m[1], side: m[2] }]],
  [/^Geri esneme (\d+): sensör okunuyor\.\.\.$/i, (m) => ['Geri esneme {n}: sensör okunuyor...', { n: m[1] }]],
  [/^Geri esneme (\d+): (Ø[\d.,]+) ölçüldü ✓ tolerans içinde$/i, (m) => ['Geri esneme {n}: {d} ölçüldü ✓ tolerans içinde', { n: m[1], d: num(m[2]) }]],
  [/^Geri esneme (\d+): (Ø[\d.,]+) ölçüldü — düzeltme gerekmiyor$/i, (m) => ['Geri esneme {n}: {d} ölçüldü — düzeltme gerekmiyor', { n: m[1], d: num(m[2]) }]],
  [/^Geri esneme (\d+): (Ø[\d.,]+) ölçüldü → düzeltmesiz, karşıdan ölçülecek$/i, (m) => ['Geri esneme {n}: {d} ölçüldü → düzeltmesiz, karşıdan ölçülecek', { n: m[1], d: num(m[2]) }]],
  [/^Geri esneme (\d+): (Ø[\d.,]+) ölçüldü → düzeltme (Ø[\d.,]+)$/i, (m) => ['Geri esneme {n}: {d} ölçüldü → düzeltme {c}', { n: m[1], d: num(m[2]), c: num(m[3]) }]],
  [/^Geri esneme (\d+): düzeltme bükümü \((SAĞ|SOL) top ([\d.,]+)\)$/i, (m) => ['Geri esneme {n}: düzeltme bükümü ({side} top {mm})', { n: m[1], side: m[2], mm: num(m[3]) }]],
  [/^Arc büküm başlatıldı$/i, () => ['Arc büküm başlatıldı']],
  [/^Arc büküm tamamlandı$/i, () => ['Arc büküm tamamlandı']],
  [/^Seg(\d+) düzlük$/i, (m) => ['Seg{s} düzlük', { s: m[1] }]],
  [/^Seg(\d+) paso(\d+)\/(\d+) \((fwd|rew)\) \[(Left|Right)\] piston ([\d.,]+)mm$/i, (m) => ['Seg{s} paso{p}/{t} ({dir}) [{side}] piston {mm}mm', { s: m[1], p: m[2], t: m[3], dir: m[4], side: m[5], mm: num(m[6]) }]],
  [/^Sıradaki segment \((\d+)\/(\d+)\) için R\/α\/L girin$/i, (m) => ['Sıradaki segment ({i}/{n}) için R/α/L girin', { i: m[1], n: m[2] }]],
  [/^İptal edildi$/i, () => ['İptal edildi']],
  [/^Hata: (.*)$/i, (m) => ['Hata: {msg}', { msg: m[1] }]],
]

export function translateProgress(message: string | null | undefined, lang: LangCode): string {
  const msg = message ?? ''
  if (lang === 'tr' || !msg) return msg
  for (const [re, fn] of RULES) {
    const m = re.exec(msg)
    if (!m) continue
    const [key, vars] = fn(m)
    // Yan isimleri (SAĞ/SOL) de sözlükten çevrilir
    const v = vars && 'side' in vars ? { ...vars, side: translate(String(vars.side), lang) } : vars
    return translate(key, lang, v)
  }
  return msg
}
