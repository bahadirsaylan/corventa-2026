// Kalıp kodu — algoritma v1 (BULUT_API_V2.md §2.1 / §2.2). Bağımlılıksız: renderer (renderer/services/moldCode.ts
// yeniden dışa aktarır) ve main demo (DemoMachine) aynı kuralı kullanır. Bulut SQL `mold_code_v1` /
// `mold_code_is_valid` ve C# `MoldCodeV1` ile AYNI kurallar + AYNI test vektörleri (MOLD_CODE_V1_VECTORS).
//
//   MMM-AAA-BBB-SS[-VV]
//   MMM  üretici kodu, 3 hane
//   AAA  A ölçüsü (mm, tam sayı) 3 hane sıfır dolgulu; ≥ 1000 mm ise 4 hane
//   BBB  B ölçüsü; 000 = B yok (boru, dolu mil)
//   SS   et kalınlığı: tam sayı mm → 2 hane (02); kesirli → 3 hane onda bir mm (025 = 2,5); 00 = DOLU
//   VV   varyant 01–99 (isteğe bağlı)
//
// Kod KİMLİKTİR — ölçüler kalıp kaydındaki açık alanlardan gelir (MoldDto.a/b/s), koddan türetilmez.
// parseMoldCode sadece biçim kontrolü + anlık geri bildirim içindir.

export const MOLD_CODE_V1_RE = /^\d{3}-\d{3,4}-\d{3,4}-(\d{2}|\d{3})(-\d{2})?$/

export interface MoldCodeParts {
  makerCode: string
  a: number
  b: number
  /** mm (kesirli olabilir, ör. 2.5); dolu malzemede 0 */
  s: number
  isSolid: boolean
  /** 1..99 ya da null */
  variant: number | null
}

export interface MoldCodeParseResult extends Partial<MoldCodeParts> {
  valid: boolean
  /** Türkçe sebep (t() anahtarı) — valid=false iken */
  error?: string
}

/** Kullanıcı girdisini sadeleştirir: boşlukları atar, farklı tire karakterlerini '-' yapar */
export function normalizeMoldCode(raw: string): string {
  return String(raw ?? '')
    .trim()
    .replace(/[‐-―−_]/g, '-')
    .replace(/\s+/g, '')
}

/** v1 biçim kontrolü (bulut `mold_code_is_valid` ile aynı: sadece regex) */
export function isValidMoldCode(code: string): boolean {
  return MOLD_CODE_V1_RE.test(code)
}

/**
 * Geçersiz biçimin sebebi (Türkçe, t() anahtarı) — geçerliyse null.
 * Kısmi girişte de çalışır: hangi grubun eksik/hatalı olduğunu söyler.
 */
export function moldCodeFormatError(code: string): string | null {
  const c = normalizeMoldCode(code)
  if (!c) return 'Kalıp kodu boş'
  if (isValidMoldCode(c)) return null
  if (/[^0-9-]/.test(c)) return 'Kalıp kodunda sadece rakam ve tire (-) olabilir'
  const g = c.split('-')
  if (g.some((x) => x === '')) return 'Kalıp kodu MMM-AAA-BBB-SS[-VV] biçiminde olmalı'
  if (g[0].length !== 3) return 'Üretici kodu (MMM) 3 hane olmalı'
  if (g.length < 2 || g[1].length < 3 || g[1].length > 4) return 'A ölçüsü (AAA) 3 veya 4 hane olmalı'
  if (g.length < 3 || g[2].length < 3 || g[2].length > 4) return 'B ölçüsü (BBB) 3 veya 4 hane olmalı'
  if (g.length < 4 || g[3].length < 2 || g[3].length > 3) return 'Et kalınlığı (SS) 2 veya 3 hane olmalı'
  if (g.length === 5 && g[4].length !== 2) return 'Varyant (VV) 2 hane olmalı'
  return 'Kalıp kodu MMM-AAA-BBB-SS[-VV] biçiminde olmalı'
}

/** Biçim kontrolü + ayrıştırma (DataApi GET /api/mold-code/parse ile aynı alanlar) */
export function parseMoldCode(raw: string): MoldCodeParseResult {
  const code = normalizeMoldCode(raw)
  const error = moldCodeFormatError(code)
  if (error) return { valid: false, error }
  const [m, a, b, s, v] = code.split('-')
  const sNum = s.length === 3 ? Number(s) / 10 : Number(s)
  return {
    valid: true,
    makerCode: m,
    a: Number(a),
    b: Number(b),
    s: sNum,
    isSolid: s === '00',
    variant: v != null ? Number(v) : null,
  }
}

function dim(n: number, name: string): string {
  if (!Number.isInteger(n) || n < 0 || n > 9999) throw new Error(`${name} 0..9999 arası tam sayı (mm) olmalı`)
  return n >= 1000 ? String(n) : String(n).padStart(3, '0')
}

/**
 * Kod üretimi (bulut `mold_code_v1(maker, a, b, s, variant)` ile aynı).
 * maker: 0..999 · a: 1..9999 tam mm · b: 0..9999 tam mm (0 = B yok) · s: 0 (dolu) / tam mm ≤ 99 /
 * onda bir hassasiyetli kesirli mm ≤ 99,9 · variant: null/0 = yok, 1..99.
 * Geçersiz girdi → Error.
 */
export function formatMoldCode(
  maker: number | string,
  a: number,
  b: number,
  s: number,
  variant?: number | null,
): string {
  const makerNum = typeof maker === 'string' ? Number(maker) : maker
  if (!Number.isInteger(makerNum) || makerNum < 0 || makerNum > 999) throw new Error('Üretici kodu 0..999 olmalı')
  if (!Number.isInteger(a) || a < 1) throw new Error('A ölçüsü 1 mm veya büyük tam sayı olmalı')
  const aStr = dim(a, 'A')
  const bStr = dim(b, 'B')
  let sStr: string
  if (!Number.isFinite(s) || s < 0) throw new Error('Et kalınlığı negatif olamaz')
  if (Number.isInteger(s)) {
    if (s > 99) throw new Error('Et kalınlığı en fazla 99 mm')
    sStr = String(s).padStart(2, '0')
  } else {
    const tenths = Math.round(s * 10)
    if (Math.abs(s * 10 - tenths) > 1e-6) throw new Error('Kesirli et kalınlığı 0,1 mm hassasiyetinde olmalı')
    if (tenths > 999) throw new Error('Et kalınlığı en fazla 99,9 mm')
    sStr = String(tenths).padStart(3, '0')
  }
  let code = `${String(makerNum).padStart(3, '0')}-${aStr}-${bStr}-${sStr}`
  if (variant != null && variant !== 0) {
    if (!Number.isInteger(variant) || variant < 1 || variant > 99) throw new Error('Varyant 1..99 olmalı')
    code += `-${String(variant).padStart(2, '0')}`
  }
  return code
}

// ── Test vektörleri (§2.2) — SQL / C# / TS aynı listeyi sınar ─────────────────

export const MOLD_CODE_V1_VECTORS: ReadonlyArray<{
  maker: number; a: number; b: number; s: number; variant: number | null; code: string; isSolid: boolean
}> = [
  { maker: 1, a: 160, b: 160, s: 2, variant: null, code: '001-160-160-02', isSolid: false },   // kare kutu 160×160×2
  { maker: 1, a: 160, b: 160, s: 0, variant: null, code: '001-160-160-00', isSolid: true },    // dolu kare 160
  { maker: 1, a: 160, b: 80, s: 3, variant: null, code: '001-160-080-03', isSolid: false },    // dikdörtgen 160×80×3
  { maker: 1, a: 114, b: 0, s: 4, variant: null, code: '001-114-000-04', isSolid: false },     // boru Ø114×4
  { maker: 1, a: 50, b: 0, s: 0, variant: null, code: '001-050-000-00', isSolid: true },       // dolu mil Ø50
  { maker: 1, a: 80, b: 20, s: 0, variant: null, code: '001-080-020-00', isSolid: true },      // lama 80×20
  { maker: 1, a: 50, b: 50, s: 5, variant: 1, code: '001-050-050-05-01', isSolid: false },     // köşebent 50×50×5 v01
  { maker: 1, a: 160, b: 160, s: 2.5, variant: null, code: '001-160-160-025', isSolid: false }, // S = 2,5 → 025
  { maker: 1, a: 1200, b: 0, s: 10, variant: null, code: '001-1200-000-10', isSolid: false },   // A = 1200 → 4 hane
]

export const MOLD_CODE_V1_INVALID: readonly string[] = ['01-160-160-02', '001-160-160-2', '001-160-160-02-1']

/** Test vektörlerini çalıştırır; hata listesi döner (boş = geçti) */
export function moldCodeSelfTest(): string[] {
  const failures: string[] = []
  for (const v of MOLD_CODE_V1_VECTORS) {
    let got: string
    try {
      got = formatMoldCode(v.maker, v.a, v.b, v.s, v.variant)
    } catch (e) {
      failures.push(`format ${v.code}: hata ${(e as Error).message}`)
      continue
    }
    if (got !== v.code) failures.push(`format ${v.code}: ${got}`)
    const p = parseMoldCode(v.code)
    if (!p.valid) failures.push(`parse ${v.code}: geçersiz (${p.error})`)
    else if (p.a !== v.a || p.b !== v.b || p.s !== v.s || p.isSolid !== v.isSolid || p.variant !== v.variant
      || p.makerCode !== String(v.maker).padStart(3, '0'))
      failures.push(`parse ${v.code}: ${JSON.stringify(p)}`)
  }
  for (const bad of MOLD_CODE_V1_INVALID) {
    if (isValidMoldCode(bad)) failures.push(`geçersiz kabul edildi: ${bad}`)
    if (parseMoldCode(bad).valid) failures.push(`parse geçersizi kabul etti: ${bad}`)
  }
  return failures
}
