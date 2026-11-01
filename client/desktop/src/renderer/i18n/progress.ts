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

/** Sıkıştırma acil stop mesajı — backend metniyle birebir (ClampContactAtTarget.EmergencyStopMessagePrefix). */
export const CLAMP_ESTOP_RE = /SIKIŞTIRMA ACİL STOP: hedefe ulaşmadan basınç (-?\d+) bar arttı/
export const CLAMP_ESTOP_TEMPLATE =
  'SIKIŞTIRMA ACİL STOP: hedefe ulaşmadan basınç {n} bar arttı — parça ölçüsünü ve önündeki engeli kontrol edin'

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
  // Sıkıştırma v2 acil stopu (backend ClampContactAtTarget) — önüne "Hata: " / "Sıkıştırma hatası: " / "Clamp: " gelebilir
  [CLAMP_ESTOP_RE, (m) => [CLAMP_ESTOP_TEMPLATE, { n: m[1] }]],
  // Güvenlik kontrolü büküm engeli (backend SafetyCheckService, EXCEL 27) — StartJob 400 mesajı;
  // IPC hatası önüne "Error invoking remote method ..." ekleyebildiği için başa sabitlenmez
  [/Yağ sıcaklığı çok yüksek \((-?\d+)°C > (-?\d+)°C\) — büküm başlatılamaz$/i, (m) => ['Yağ sıcaklığı çok yüksek ({v}°C > {limit}°C) — büküm başlatılamaz', { v: m[1], limit: m[2] }]],
  // Bakım kilidi büküm engeli (backend MaintenanceLockRules.BuildBlockMessage, EXCEL 34) — StartJob / execute 409;
  // periyot adları ("Haftalık, Aylık") ayrıca sözlükten çevrilir. IPC öneki olabileceği için başa sabitlenmez.
  [/BAKIM KİLİDİ: (.+) bakımı yapılmadan büküm başlatılamaz$/, (m) => ['BAKIM KİLİDİ: {periods} bakımı yapılmadan büküm başlatılamaz', { periods: m[1] }]],
  // Hata anı snapshot sebepleri (backend ErrorSnapshotService / SafetyCheckService, EXCEL 26) — Hata Raporları ekranı
  [/^Acil stop \(yazılım\)$/i, () => ['Acil stop (yazılım)']],
  [/^Fiziksel acil stop basıldı$/i, () => ['Fiziksel acil stop basıldı']],
  [/^Motor termik açtı$/i, () => ['Motor termik açtı']],
  [/^Faz sırası hatası$/i, () => ['Faz sırası hatası']],
  [/^Fan termik açtı$/i, () => ['Fan termik açtı']],
  [/^İş başarısız$/i, () => ['İş başarısız']],
  [/^PLC hata kodu: (\S+) \((\d+)\)$/i, (m) => ['PLC hata kodu: {name} ({n})', { name: m[1], n: m[2] }]],
  [/^Encoder durması: (\w+) — (\d+) ms içinde ([\d.,]+) mm ilerleme \(eşik ([\d.,]+) mm\)$/i,
    (m) => ['Encoder durması: {axis} — {ms} ms içinde {mm} mm ilerleme (eşik {min} mm)', { axis: m[1], ms: m[2], mm: num(m[3]), min: num(m[4]) }]],
  [/^Yağ sıcaklığı yüksek: (-?\d+)°C \(uyarı eşiği (-?\d+)°C\)$/i, (m) => ['Yağ sıcaklığı yüksek: {v}°C (uyarı eşiği {limit}°C)', { v: m[1], limit: m[2] }]],
  [/^Yağ sıcaklığı çok yüksek: (-?\d+)°C \(engel eşiği (-?\d+)°C\)$/i, (m) => ['Yağ sıcaklığı çok yüksek: {v}°C (engel eşiği {limit}°C)', { v: m[1], limit: m[2] }]],
  [/^Yağ sıcaklığı sensörü aralık dışı \((-?\d+)°C\) — tel kopması \/ 4mA altı şüphesi$/i, (m) => ['Yağ sıcaklığı sensörü aralık dışı ({v}°C) — tel kopması / 4mA altı şüphesi', { v: m[1] }]],
  [/^Yağ sıcaklığı sensörü aralık dışı \((-?\d+)°C\) — kısa devre \/ 20mA üstü şüphesi$/i, (m) => ['Yağ sıcaklığı sensörü aralık dışı ({v}°C) — kısa devre / 20mA üstü şüphesi', { v: m[1] }]],
  [/^(S1|S2) basınç sensörü aralık dışı \((-?\d+) bar\) — sensör \/ kablo kontrol edin$/i, (m) => ['{s} basınç sensörü aralık dışı ({v} bar) — sensör / kablo kontrol edin', { s: m[1], v: m[2] }]],
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
    let v = vars && 'side' in vars ? { ...vars, side: translate(String(vars.side), lang) } : vars
    // Bakım periyodu listesi ("Haftalık, Aylık") — her ad sözlükten çevrilir
    if (v && 'periods' in v)
      v = { ...v, periods: String(v.periods).split(', ').map((p) => translate(p, lang)).join(', ') }
    return translate(key, lang, v)
  }
  return msg
}
