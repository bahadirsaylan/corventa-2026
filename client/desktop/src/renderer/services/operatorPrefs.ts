// Operatör tercihleri — bu cihazda (localStorage) saklanan, makine hesabına girmeyen UI varsayılanları.
// Ayarlar > Operatör Ayarları ekranı ve ilgili ekranlar (tahliye, manuel tuş takımı, ölçü girişi)
// aynı anahtarları okur/yazar. Depolama kapalıysa her okuma varsayılanı döner.

// ── Tahliye (SEKIL-18) ──────────────────────────────────────────────
export const UNLOAD_DEFAULT_PRESETS = [3, 5, 8, 10, 15]
export const UNLOAD_SECONDS = { min: 1, max: 60 }
export const UNLOAD_UPPER = { min: 0, max: 150, step: 5, def: 50 }
export const UNLOAD_ROT = { min: 0, max: 3000, step: 50, def: 300 }

const PRESETS_KEY = 'corventa.unloadPresets'
const SEL_KEY = 'corventa.unloadSelected'
const MOTION_KEY = 'corventa.unloadMotion'

export interface UnloadMotion {
  upperRetractMm: number
  rotationMm: number
  rotationDir: 1 | -1
}

function readJson(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null')
  } catch {
    return null
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* depolama kapalı — bu oturumda geçerli */
  }
}

export function readUnloadPresets(): number[] {
  const v = readJson(PRESETS_KEY)
  if (Array.isArray(v) && v.length === UNLOAD_DEFAULT_PRESETS.length && v.every((n) => Number.isFinite(n))) return v
  return [...UNLOAD_DEFAULT_PRESETS]
}

export function readUnloadSelected(): number {
  try {
    const v = Number(localStorage.getItem(SEL_KEY))
    if (Number.isInteger(v) && v >= 0 && v < UNLOAD_DEFAULT_PRESETS.length) return v
  } catch {
    /* varsayılan */
  }
  return 0
}

export function saveUnloadPresets(presets: number[], selected: number): void {
  write(PRESETS_KEY, JSON.stringify(presets))
  write(SEL_KEY, String(selected))
}

export function readUnloadMotion(): UnloadMotion {
  const v = readJson(MOTION_KEY) as UnloadMotion | null
  if (v && Number.isFinite(v.upperRetractMm) && Number.isFinite(v.rotationMm) && (v.rotationDir === 1 || v.rotationDir === -1))
    return v
  return { upperRetractMm: UNLOAD_UPPER.def, rotationMm: UNLOAD_ROT.def, rotationDir: 1 }
}

export function saveUnloadMotion(m: UnloadMotion): void {
  write(MOTION_KEY, JSON.stringify(m))
}

// ── Manuel tuş takımı başlangıç hızı ────────────────────────────────
export const MANUAL_SPEED = { min: 5, max: 100, step: 5, def: 20 }
const MANUAL_SPEED_KEY = 'corventa.manualSpeed'

export function readManualSpeed(): number {
  const v = Number(readJson(MANUAL_SPEED_KEY))
  return Number.isFinite(v) && v >= MANUAL_SPEED.min && v <= MANUAL_SPEED.max ? v : MANUAL_SPEED.def
}

export function saveManualSpeed(v: number): void {
  write(MANUAL_SPEED_KEY, JSON.stringify(v))
}

// ── Ölçü ekranı ön doldurma: H (kıvrım hızı m/dk) ve G (adım mm) ────
// null = boş bırak (operatör her işte kendisi girer). Sadece alan BOŞSA doldurulur.
const MEASURE_DEFAULTS_KEY = 'corventa.measureDefaults'

export interface MeasureDefaults {
  H: number | null
  G: number | null
}

export function readMeasureDefaults(): MeasureDefaults {
  const v = readJson(MEASURE_DEFAULTS_KEY) as MeasureDefaults | null
  const ok = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : null)
  return { H: ok(v?.H), G: ok(v?.G) }
}

export function saveMeasureDefaults(d: MeasureDefaults): void {
  write(MEASURE_DEFAULTS_KEY, JSON.stringify(d))
}

/** Ölçü formunda H / G boşsa operatör varsayılanıyla doldurur (dolu alana dokunmaz). */
export function applyMeasureDefaults<T extends { H: string; G: string }>(v: T): T {
  const d = readMeasureDefaults()
  return {
    ...v,
    H: v.H.trim() === '' && d.H != null ? String(d.H) : v.H,
    G: v.G.trim() === '' && d.G != null ? String(d.G) : v.G,
  }
}
