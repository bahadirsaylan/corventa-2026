// Backend (ve demo) büküm ilerleme mesajları Türkçe gelir. UI bu mesajları regex ile AYRIŞTIRIR
// (paso / segment tespiti) — o yüzden ayrıştırma HAM mesajla yapılır, bu fonksiyon SADECE
// ekranda gösterirken uygulanır: translateProgress(msg, lang).
//
// Her kural ham mesajı bir ŞABLON anahtarına + değişkenlere çevirir; şablonun karşılığı dil
// sözlüklerindedir (./<dil>/progress.ts). Yeni dil eklerken kod değişmez, sadece sözlük yazılır.

import type { LangCode, TVars } from './index'
import { dictFor, translateRaw as translate } from './index'

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

// ── Genel backend mesaj çevirisi (2026-11-19) ──────────────────────────────────────────────────────
// Elle yazılmış kurallar (RULES) tutmazsa sırayla:
//  1) birebir sözlük eşleşmesi (ör. 'Ticket bulunamadı')
//  2) Electron IPC öneki ("Error invoking remote method '…': HttpError: ") atılıp tekrar
//  3) ŞABLON eşleşmesi — sözlükte {0}, {1} … yer tutuculu anahtarlar (./en/backendMessages.ts) desene
//     çevrilir: 'Job #{0} bulunamadı' ↔ "Job #12 bulunamadı". Yakalanan değerler de çevrilir (iç hata
//     mesajı, SAĞ/SOL …) — en uzun sabit metinli şablon önce denenir.
//  4) bileşik mesaj: " | ", " — ", ": ", ". " ayraçlarıyla bölünüp parçalar ayrı ayrı çevrilir.

const IPC_PREFIX = /^Error invoking remote method '[^']*':\s*(?:(?:Http|Timeout|Type)?Error:\s*)?/

interface Template {
  re: RegExp
  key: string
  holes: string[]
  litLen: number
}

const templateCache = new Map<LangCode, { dict: Record<string, string>; list: Template[] }>()

function templatesFor(lang: LangCode): Template[] {
  const dict = dictFor(lang) as Record<string, string>
  const cached = templateCache.get(lang)
  if (cached && cached.dict === dict) return cached.list
  const list: Template[] = []
  for (const key of Object.keys(dict)) {
    if (!/\{\d+\}/.test(key)) continue
    const parts = key.split(/\{(\d+)\}/)
    const literal = parts.filter((_, i) => i % 2 === 0).join('')
    // Sadece yer tutucu + noktalama olan şablonlar her şeyi yakalar → atlanır
    if (literal.replace(/[^\p{L}]/gu, '').length < 3) continue
    let src = '^'
    const holes: string[] = []
    parts.forEach((p, i) => {
      if (i % 2 === 0) src += p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      else {
        holes.push(p)
        src += '([\\s\\S]*?)'
      }
    })
    list.push({ re: new RegExp(src + '$'), key, holes, litLen: literal.length })
  }
  list.sort((a, b) => b.litLen - a.litLen)
  templateCache.set(lang, { dict, list })
  return list
}

const resultCache = new Map<string, string>()

function translateExact(msg: string, lang: LangCode): string | null {
  const dict = dictFor(lang)
  if (Object.prototype.hasOwnProperty.call(dict, msg)) return dict[msg]
  const trimmed = msg.trim()
  if (trimmed !== msg && Object.prototype.hasOwnProperty.call(dict, trimmed)) return dict[trimmed]
  return null
}

function translateRules(msg: string, lang: LangCode): string | null {
  for (const [re, fn] of RULES) {
    const m = re.exec(msg)
    if (!m) continue
    const [key, vars] = fn(m)
    // Yan isimleri (SAĞ/SOL) de sözlükten çevrilir
    let v = vars && 'side' in vars ? { ...vars, side: translate(String(vars.side), lang) } : vars
    // Bakım periyodu listesi ("Haftalık, Aylık") — her ad sözlükten çevrilir
    if (v && 'periods' in v)
      v = { ...v, periods: String(v.periods).split(', ').map((p) => translate(p, lang)).join(', ') }
    // Genel "Hata: …" kuralı — iç mesaj da çevrilir
    if (v && 'msg' in v) v = { ...v, msg: translateDeep(String(v.msg), lang, 1) }
    return translate(key, lang, v)
  }
  return null
}

const HAS_LETTER = /\p{L}/u
const SEPARATORS = [' | ', ' — ', ': ', '. ']

function translateDeep(msg: string, lang: LangCode, depth: number): string {
  if (!msg || depth > 4) return msg
  const exact = translateExact(msg, lang)
  if (exact != null) return exact
  const ipc = IPC_PREFIX.exec(msg)
  if (ipc) return translateDeep(msg.slice(ipc[0].length), lang, depth)
  const ruled = translateRules(msg, lang)
  if (ruled != null) return ruled
  const dict = dictFor(lang)
  for (const tpl of templatesFor(lang)) {
    const m = tpl.re.exec(msg)
    if (!m) continue
    const vars: TVars = {}
    tpl.holes.forEach((h, i) => {
      const val = m[i + 1] ?? ''
      vars[h] = HAS_LETTER.test(val) ? translateDeep(val, lang, depth + 1) : val
    })
    return translate(dict[tpl.key], lang, vars)
  }
  // Bileşik mesaj — parçalar ayrı ayrı (en az biri çevrilirse)
  for (const sep of SEPARATORS) {
    const idx = msg.indexOf(sep)
    if (idx <= 0) continue
    const head = msg.slice(0, idx)
    const tail = msg.slice(idx + sep.length)
    const h = translateDeep(head, lang, depth + 1)
    const tl = translateDeep(tail, lang, depth + 1)
    if (h !== head || tl !== tail) return h + sep + tl
  }
  return msg
}

export function translateProgress(message: string | null | undefined, lang: LangCode): string {
  const msg = message ?? ''
  if (lang === 'tr' || !msg) return msg
  const ck = lang + '\u0000' + msg
  const hit = resultCache.get(ck)
  if (hit !== undefined) return hit
  const out = translateDeep(msg, lang, 0)
  if (resultCache.size > 5000) resultCache.clear()
  resultCache.set(ck, out)
  return out
}
