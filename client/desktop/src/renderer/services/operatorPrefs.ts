// Operatör tercihleri — bu cihazda (localStorage) saklanan, makine hesabına girmeyen UI varsayılanları.
// Ayarlar > Operatör Ayarları ekranı ve ilgili ekranlar (tahliye, manuel tuş takımı, ölçü girişi)
// aynı anahtarları okur/yazar. Depolama kapalıysa her okuma varsayılanı döner.

// ── Tahliye (SEKIL-18) ──────────────────────────────────────────────
export const UNLOAD_DEFAULT_PRESETS = [3, 5, 8, 10, 15]
export const UNLOAD_SECONDS = { min: 1, max: 60 }
// Üst sınırlar backend POST /api/preparation/unload doğrulamasıyla aynı (üst top ≤ 150 mm, rotasyon ≤ 60 sn)
export const UNLOAD_UPPER = { min: 0, max: 150, step: 5, def: 50 }
// 2026-11-01: tahliye rotasyonu SÜREYLE (sn). Üst top açıkken alt top dönmez; encoder alt topta olduğu
// için mesafe (mm) okunamaz → rotasyon jog + süre + stop (backend rotationSeconds).
export const UNLOAD_ROT_SEC = { min: 0, max: 60, step: 0.5, def: 3 }

const PRESETS_KEY = 'corventa.unloadPresets'
const SEL_KEY = 'corventa.unloadSelected'
const MOTION_KEY = 'corventa.unloadMotion'

export interface UnloadMotion {
  upperRetractMm: number
  /** Tahliye rotasyon süresi (sn, 0 = rotasyon yok) */
  rotationSec: number
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
  const v = readJson(MOTION_KEY) as (Partial<UnloadMotion> & { rotationMm?: number }) | null
  if (v && Number.isFinite(v.upperRetractMm) && (v.rotationDir === 1 || v.rotationDir === -1))
    // Eski / elle bozulmuş kayıt sınır dışı olabilir — backend reddetmesin diye sınırlara kırp.
    // Eski kayıtta (rotationMm) süre yok → varsayılan süre.
    return {
      upperRetractMm: Math.min(UNLOAD_UPPER.max, Math.max(UNLOAD_UPPER.min, v.upperRetractMm!)),
      rotationSec: Number.isFinite(v.rotationSec)
        ? Math.min(UNLOAD_ROT_SEC.max, Math.max(UNLOAD_ROT_SEC.min, v.rotationSec!))
        : UNLOAD_ROT_SEC.def,
      rotationDir: v.rotationDir,
    }
  return { upperRetractMm: UNLOAD_UPPER.def, rotationSec: UNLOAD_ROT_SEC.def, rotationDir: 1 }
}

export function saveUnloadMotion(m: UnloadMotion): void {
  write(MOTION_KEY, JSON.stringify(m))
}

// ── Tahliye ayarları MAKİNEDE (MachineSettings Unload*, 2026-11-01) ─────────
// Kaynak artık DB; localStorage sadece önbellek / DB'ye ulaşılamazsa yedek. DB alanı boşsa (null)
// bu cihazdaki eski değer, o da yoksa varsayılan kullanılır — ilk kayıtta DB'ye yazılır.

export interface UnloadConfig {
  presets: number[]
  selected: number
  motion: UnloadMotion
  /** Üst top geri çekme üst sınırı (mm) — backend aynı ayarı uygular */
  maxUpperMm: number
  /** Süreli rotasyon üst sınırı (sn) */
  maxRotSec: number
}

/** = MachineSettingsDto (shared/types/settings.ts) */
type SettingsRecord = Record<string, number | string | boolean | null>

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/** Cihazdaki (localStorage) değerlerle yapılandırma — DB okunamazsa / ilk açılış */
export function readLocalUnloadConfig(): UnloadConfig {
  return {
    presets: readUnloadPresets(),
    selected: readUnloadSelected(),
    motion: readUnloadMotion(),
    maxUpperMm: UNLOAD_UPPER.max,
    maxRotSec: UNLOAD_ROT_SEC.max,
  }
}

/** Makine ayarlarından tahliye yapılandırması; boş alanlar cihazdaki değerle doldurulur */
export function unloadConfigFromSettings(m: SettingsRecord): UnloadConfig {
  const local = readLocalUnloadConfig()
  const maxUpperMm = num(m.unloadMaxUpperRetractMm) ?? UNLOAD_UPPER.max
  const maxRotSec = num(m.unloadMaxRotationSeconds) ?? UNLOAD_ROT_SEC.max
  let presets = local.presets
  if (typeof m.unloadHoldPresetsSec === 'string' && m.unloadHoldPresetsSec.trim()) {
    const p = m.unloadHoldPresetsSec.split(',').map((x) => Number(x.trim()))
    if (p.length === UNLOAD_DEFAULT_PRESETS.length && p.every((n) => Number.isInteger(n) && n >= UNLOAD_SECONDS.min && n <= UNLOAD_SECONDS.max))
      presets = p
  }
  const sel = num(m.unloadSelectedPresetIndex)
  const dir = num(m.unloadDefaultRotationDir)
  const clamp = (v: number, hi: number) => Math.min(hi, Math.max(0, v))
  return {
    presets,
    selected: sel != null && sel >= 0 && sel < UNLOAD_DEFAULT_PRESETS.length ? sel : local.selected,
    motion: {
      upperRetractMm: clamp(num(m.unloadDefaultUpperRetractMm) ?? local.motion.upperRetractMm, maxUpperMm),
      rotationSec: clamp(num(m.unloadDefaultRotationSeconds) ?? local.motion.rotationSec, maxRotSec),
      rotationDir: dir === -1 || dir === 1 ? dir : local.motion.rotationDir,
    },
    maxUpperMm,
    maxRotSec,
  }
}

/** Ayar güncellemesi (sadece verilen kısımlar) — window.corventa.settings.updateMachine'e gider */
export function unloadSettingsPatch(p: { presets?: number[]; selected?: number; motion?: UnloadMotion }): SettingsRecord {
  const out: SettingsRecord = {}
  if (p.presets) out.unloadHoldPresetsSec = p.presets.map((n) => Math.round(n)).join(',')
  if (p.selected != null) out.unloadSelectedPresetIndex = p.selected
  if (p.motion) {
    out.unloadDefaultUpperRetractMm = p.motion.upperRetractMm
    out.unloadDefaultRotationSeconds = p.motion.rotationSec
    out.unloadDefaultRotationDir = p.motion.rotationDir
  }
  return out
}

/** Hem cihaza (önbellek) hem makineye yazar; makine hatası fırlatılır (çağıran gösterir / yutar) */
export async function saveUnloadConfig(p: { presets?: number[]; selected?: number; motion?: UnloadMotion }): Promise<void> {
  if (p.motion) saveUnloadMotion(p.motion)
  if (p.presets || p.selected != null) saveUnloadPresets(p.presets ?? readUnloadPresets(), p.selected ?? readUnloadSelected())
  await window.corventa.settings.updateMachine(unloadSettingsPatch(p))
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

/** Ölçü formunda H / G boşsa operatör varsayılanıyla doldurur (dolu alana dokunmaz; G'si olmayan formlarda sadece H). */
export function applyMeasureDefaults<T extends { H: string; G?: string }>(v: T): T {
  const d = readMeasureDefaults()
  const out = { ...v, H: v.H.trim() === '' && d.H != null ? String(d.H) : v.H }
  if (typeof v.G === 'string') out.G = v.G.trim() === '' && d.G != null ? String(d.G) : v.G
  return out
}

// ── Manuel büküm ekranı (ManuelBendingRunPage) ──────────────────────
const MANUAL_RUN_KEY = 'corventa.manualRun'

export interface ManualRunPrefs {
  speedPercent: number
}

export function readManualRunPrefs(): ManualRunPrefs {
  const v = readJson(MANUAL_RUN_KEY) as Partial<ManualRunPrefs> | null
  const sp = Number(v?.speedPercent)
  return {
    speedPercent: Number.isFinite(sp) && sp >= MANUAL_SPEED.min && sp <= MANUAL_SPEED.max ? sp : MANUAL_SPEED.def,
  }
}

export function saveManualRunPrefs(p: ManualRunPrefs): void {
  write(MANUAL_RUN_KEY, JSON.stringify(p))
}

// ── Üretim toleransı (ana ekran başlığındaki TOLERANS seçimi) ──────
// Şimdilik sadece gösterim / operatör tercihi — büküm hesabına bağlı değil.
const PRODUCTION_TOL_KEY = 'corventa.productionTolerance'

export const PRODUCTION_TOLERANCES = [
  { mm: 1, label: 'HASSAS ÜRETİM' },
  { mm: 10, label: 'STANDART ÜRETİM' },
] as const

export function readProductionTolerance(): number {
  try {
    const v = Number(localStorage.getItem(PRODUCTION_TOL_KEY))
    if (PRODUCTION_TOLERANCES.some((o) => o.mm === v)) return v
  } catch {
    /* varsayılan */
  }
  return PRODUCTION_TOLERANCES[0].mm
}

export function saveProductionTolerance(mm: number): void {
  write(PRODUCTION_TOL_KEY, String(mm))
}
