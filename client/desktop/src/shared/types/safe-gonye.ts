// GÜVENLİ GÖNYE (2026-11-19) — Bending API MachineState.rulerStatus + POST /api/preparation/gonye safeGonye raporu.
// Backend: Core/Models/RulerValidity.cs (alan adları camelCase birebir).
//
// HER gönye güvenlidir: son bilinen fiziksel konumdan (config\last-positions.json) beklenen geri gidiş bilinir;
// top beklenenden erken durursa ENGEL → top hemen ileri alınır (rahatlatma), cetvel sıfırlanmaz, gönye başarısız.

/** Cetvel geçersizlik sebebi (backend RulerInvalidReasons) */
export type RulerInvalidReason = 'APP_START' | 'RIO_RESET' | 'CONNECTION_LOST' | 'SAFE_GONYE_FAILED' | string

export interface LastKnownPositionsInfo {
  savedAt: string
  ageDays: number
  /** Mekanik geri limitten uzaklık (mm) */
  leftMm: number
  rightMm: number
  upperMm: number
  lowerMm: number
  stage: number
  gonyeCompleted: boolean
  /** Güvenli gönyede beklenen mesafe olarak kullanılabilir */
  usable: boolean
  unusableReason: string | null
  /** Cetveller geçersizken elle jog tahmini eklendi */
  estimated: boolean
}

export type SafeGonyePistonResult =
  | 'PENDING' | 'MOVING' | 'OK' | 'OVERTRAVEL_WARN' | 'OVERTRAVEL' | 'OBSTACLE' | 'STROKE_EXCEEDED' | 'UNCHECKED' | 'STOPPED'

export interface SafeGonyePistonReport {
  /** PistonId (0 Right, 1 Left, 2 Upper, 3 Lower) — sayı veya ad gelebilir */
  piston: number | string
  /** "SOL TOP" … (Türkçe) */
  name: string
  expectedMm: number | null
  travelMm: number
  encoderStartMm: number
  encoderNowMm: number
  directionReversed: boolean
  stopped: boolean
  result: SafeGonyePistonResult
  reliefMm: number
  note: string | null
}

export type SafeGonyeState = 'RUNNING' | 'OK' | 'FAILED' | 'CONFIRMATION_REQUIRED' | 'CANCELLED'
export type SafeGonyeMode = 'NORMAL' | 'CONFIRMED' | 'OVERRIDE'

export interface SafeGonyeReport {
  startedAt: string
  finishedAt: string | null
  state: SafeGonyeState
  mode: SafeGonyeMode
  speedPercent: number
  toleranceMm: number
  overtravelAction: 'WARN' | 'STOP'
  confirmedBy: string | null
  /** LIVE | FILE | FILE_ESTIMATED | NONE */
  expectedSource: string | null
  expectedSavedAt: string | null
  message: string | null
  /** OBSTACLE | OVERTRAVEL | STROKE_EXCEEDED | CONFIRMATION_REQUIRED | TIMEOUT | NOT_AUTHORIZED | ERROR */
  errorCode: string | null
  warnings: string[]
  pistons: SafeGonyePistonReport[]
  /** Engel sonrası "KONTROL ETTİM, ENGEL YOK — YAVAŞ GÖNYE AL" önerilir (SUPERVISOR+) */
  overrideAvailable: boolean
}

export interface RulerStatusInfo {
  valid: boolean
  invalidReason: RulerInvalidReason | null
  invalidMessage: string | null
  invalidSince: string | null
  safeGonyeRunning: boolean
  lastKnown: LastKnownPositionsInfo | null
  safeGonye: SafeGonyeReport | null
}

/** POST /api/preparation/gonye gövdesi safe alanı */
export interface SafeGonyeOptions {
  /** Beklenen bilinmiyorken: TOPLARIN ARKASINDA ENGEL / ALET YOK — KONTROL ETTİM */
  confirmNoObstacle?: boolean
  /** Engel uyarısından sonra: KONTROL ETTİM, ENGEL YOK — YAVAŞ GÖNYE AL (SUPERVISOR+) */
  ignoreExpected?: boolean
  confirmedBy?: string | null
}
