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

// ── Ölçü ekranı ön doldurma: H (kıvrım hızı %) ve G (adım mm) ────
// H YÜZDE (%1..%100): %100 = makine ayarlarındaki en yüksek hız. Değer sadece işe kaydedilir
// (profileH / kivrimHizMetreDakika alan adları geriye uyum için aynı kaldı), hareketi etkilemez.
// null = H için %100, G için boş. Sadece alan BOŞSA doldurulur.
const MEASURE_DEFAULTS_KEY = 'corventa.measureDefaults'

/** Kıvrım hızı (H) yüzde aralığı ve varsayılanı */
export const MEASURE_H = { min: 1, max: 100, def: 100 }

/** H'yi %1..%100 tam sayıya çeker (eski m/dk değeri > 100 ise 100). Geçersiz → null. */
export function clampMeasureH(n: unknown): number | null {
  const v = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(v) || v <= 0) return null
  return Math.min(MEASURE_H.max, Math.max(MEASURE_H.min, Math.round(v)))
}

/** Numpad'den gelen H girdisi → '' veya "%1..%100" tam sayı metni (ölçü formları) */
export function normalizeMeasureHInput(value: string): string {
  if (value.trim() === '') return ''
  const n = clampMeasureH(value)
  return n == null ? '' : String(n)
}

export interface MeasureDefaults {
  H: number | null
  G: number | null
}

export function readMeasureDefaults(): MeasureDefaults {
  const v = readJson(MEASURE_DEFAULTS_KEY) as MeasureDefaults | null
  const ok = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : null)
  return { H: clampMeasureH(ok(v?.H)), G: ok(v?.G) }
}

export function saveMeasureDefaults(d: MeasureDefaults): void {
  write(MEASURE_DEFAULTS_KEY, JSON.stringify({ H: d.H == null ? null : clampMeasureH(d.H), G: d.G }))
}

/**
 * Ölçü formunda H / G boşsa doldurur (G'si olmayan formlarda sadece H):
 * H → operatör varsayılanı, o da yoksa %100. Dolu H %1..%100'e çekilir (eski m/dk kaydı).
 */
export function applyMeasureDefaults<T extends { H: string; G?: string }>(v: T): T {
  const d = readMeasureDefaults()
  // 2026-11-12: H her zaman makine ayarındaki KIVRIM HIZI'ndan (defaultRotationSpeedPercent) gelir; okunamadıysa eski davranış
  const h =
    machineSpeedH != null
      ? String(machineSpeedH)
      : v.H.trim() === ''
        ? String(d.H ?? MEASURE_H.def)
        : String(clampMeasureH(v.H) ?? MEASURE_H.def)
  const out = { ...v, H: h }
  // G boşsa operatör varsayılanı, o da yoksa 30 mm (ileride algoritmaya bağlanacak)
  if (typeof v.G === 'string') out.G = v.G.trim() === '' ? String(d.G ?? MEASURE_G_DEFAULT) : v.G
  return out
}

/** G (adım) boşken kullanılan varsayılan — şimdilik sabit 30 mm */
export const MEASURE_G_DEFAULT = 30

// Makine ayarı KIVRIM HIZI (MachineSettings.defaultRotationSpeedPercent) — ölçü ekranı H'si buradan gelir
let machineSpeedH: number | null = null

/** Makine ayarından H'yi okur (önbelleğe alır). Okunamazsa null (eski davranış). */
export async function loadMachineSpeedH(): Promise<number | null> {
  try {
    const m = (await window.corventa.settings.getMachine()) as Record<string, unknown>
    machineSpeedH = clampMeasureH(m.defaultRotationSpeedPercent)
  } catch {
    /* ayar okunamadı — önbellekteki değer kalır */
  }
  return machineSpeedH
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
// 2026-11-16: iki seviye (HASSAS / STANDART) değerleri artık ayarlanabilir (test geri bildirimi:
// "hassas 1 yerine 5, normal 10 yerine 40 gibi değiştirilebilir olmalı"). Seçim SEVİYE olarak saklanır,
// mm değeri seviyenin ayarından türetilir. Eski kayıt (mm: '1' / '10') seviyeye çevrilir.
// Büküme bağlantı: TOLERANSI BÜKÜME UYGULA (varsayılan KAPALI) açıksa bendingOrchestrator işin toleranceMm'ini
// seçili değerle doldurur; kapalıyken eski davranış (iş, makine ayarı ÇAP TOLERANSI'nı kullanır — DataApi doldurur).
const PRODUCTION_TOL_KEY = 'corventa.productionTolerance'
const PRODUCTION_TOL_VALUES_KEY = 'corventa.productionToleranceValues'
const PRODUCTION_TOL_APPLY_KEY = 'corventa.productionToleranceApply'
/** Başlık / ayar sayfası aynı anda açık olabilir — değişiklik bu olayla duyurulur */
export const PRODUCTION_TOL_EVENT = 'corventa:production-tolerance'

export type ProductionToleranceLevel = 'hassas' | 'standart'

export const PRODUCTION_TOLERANCE_LEVELS: readonly {
  level: ProductionToleranceLevel
  label: string
  min: number
  max: number
  def: number
}[] = [
  { level: 'hassas', label: 'HASSAS ÜRETİM', min: 1, max: 5, def: 1 },
  { level: 'standart', label: 'STANDART ÜRETİM', min: 6, max: 100, def: 10 },
]

export type ProductionToleranceValues = Record<ProductionToleranceLevel, number>

function tolLevelDef(level: ProductionToleranceLevel) {
  return PRODUCTION_TOLERANCE_LEVELS.find((o) => o.level === level)!
}

/** Değer seviyenin aralığında mı (aralık dışı → false) */
export function isValidProductionTolerance(level: ProductionToleranceLevel, mm: number): boolean {
  const d = tolLevelDef(level)
  return Number.isFinite(mm) && mm >= d.min && mm <= d.max
}

/** Seçili seviye — eski mm kaydı (1 / 10) seviyeye çevrilir */
export function readProductionToleranceLevel(): ProductionToleranceLevel {
  try {
    const v = localStorage.getItem(PRODUCTION_TOL_KEY)
    if (v === 'hassas' || v === 'standart') return v
    if (v === '10') return 'standart'
  } catch {
    /* varsayılan */
  }
  return 'hassas'
}

export function readProductionToleranceValues(): ProductionToleranceValues {
  const v = readJson(PRODUCTION_TOL_VALUES_KEY) as Partial<ProductionToleranceValues> | null
  const pick = (level: ProductionToleranceLevel) => {
    const n = Number(v?.[level])
    return v?.[level] != null && isValidProductionTolerance(level, n) ? n : tolLevelDef(level).def
  }
  return { hassas: pick('hassas'), standart: pick('standart') }
}

/** Seçili seviyenin değeri (mm, ± tolerans) */
export function readProductionToleranceMm(): number {
  return readProductionToleranceValues()[readProductionToleranceLevel()]
}

/** TOLERANSI BÜKÜME UYGULA — varsayılan KAPALI */
export function readApplyProductionTolerance(): boolean {
  return readJson(PRODUCTION_TOL_APPLY_KEY) === true
}

function notifyProductionTolerance(): void {
  try {
    window.dispatchEvent(new Event(PRODUCTION_TOL_EVENT))
  } catch {
    /* olay gönderilemedi — ekranlar açılışta yeniden okur */
  }
}

export function saveProductionToleranceLevel(level: ProductionToleranceLevel): void {
  write(PRODUCTION_TOL_KEY, level)
  notifyProductionTolerance()
}

/** Aralık dışı değer kaydedilmez (o seviye eski değerinde kalır) */
export function saveProductionToleranceValues(v: Partial<ProductionToleranceValues>): void {
  const cur = readProductionToleranceValues()
  for (const o of PRODUCTION_TOLERANCE_LEVELS) {
    const n = v[o.level]
    if (n != null && isValidProductionTolerance(o.level, n)) cur[o.level] = n
  }
  write(PRODUCTION_TOL_VALUES_KEY, JSON.stringify(cur))
  notifyProductionTolerance()
}

export function saveApplyProductionTolerance(on: boolean): void {
  write(PRODUCTION_TOL_APPLY_KEY, JSON.stringify(on))
  notifyProductionTolerance()
}

/** "±1 mm" — tam sayı değilse en fazla 2 ondalık */
export function formatProductionTolerance(mm: number): string {
  return `±${Number.isInteger(mm) ? mm : Number(mm.toFixed(2))} mm`
}
