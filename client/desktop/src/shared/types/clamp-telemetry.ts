// (2026-11-04) Sıkıştırma telemetrisi — DataApi /api/clamp-telemetry sözleşmesi (ClampTelemetryController).
// Bending API sıkıştırma boyunca (100 ms) ve sonrasında (POST-WATCH, 500 ms) makine state'ini örnekler.

// 2026-11-05: JOB = sıkıştırmadan sonra iş bitene kadar (sıfırlama + büküm + düzeltme) izleme
export type ClampTelemetryPhase = 'CLAMP' | 'JOB' | 'AFTER' | 'NOTE'

export interface ClampTelemetrySample {
  id: number
  sessionId: number
  capturedAt: string
  elapsedMs: number
  phase: ClampTelemetryPhase
  upperMm: number
  lowerMm: number
  leftMm: number
  rightMm: number
  upperMoving: boolean
  upperInPosition: boolean
  lowerMoving: boolean
  rotationMm: number
  s1Bar: number
  s2Bar: number
  s1FlowCms: number
  s2FlowCms: number
  oilTempC: number
  oilHumidityPercent: number
  oilLevelPercent: number
  motorState: number
  leftPartSensor: boolean
  rightPartSensor: boolean
  upperDriftMm: number | null
  lowerDriftMm: number | null
  /** JOB/AFTER: o anki büküm adımı (ilerleme mesajı) */
  step?: string | null
  /** Üst/alt topun o anki komutu ("POS 55,10", "PRS 120 bar ileri", "STOP", "TUTUYOR"; ✓ = yerleşti) */
  upperCmd?: string | null
  lowerCmd?: string | null
  /** KOMUTSUZ kayma (mm): son komut yerleştikten sonraki fark — komut sürerken null. − = geri (gevşeme) */
  upperUncmdMm?: number | null
  lowerUncmdMm?: number | null
  note: string | null
}

/** İş izlemesinde paso/adım özeti (PasoSummaryJson) */
export interface ClampTelemetryPasoSummary {
  no: number
  label: string
  startSec: number
  durationSec: number | null
  startUpperMm: number
  endUpperMm: number | null
  slackCount: number
  slackCmdMm: number
  slackRealMm: number
  maxUpperRetreatMm: number
  maxUpperAdvanceMm: number
  maxLowerUncmdMm: number
  minS1Bar: number | null
  maxS1Bar: number | null
  rotStartMm: number
  rotEndMm: number | null
}

export interface ClampTelemetrySession {
  id: number
  bendingJobId: number | null
  kind: string
  startedAt: string
  clampEndedAt: string | null
  endedAt: string | null
  success: boolean | null
  errorMessage: string | null
  targetPositionMm: number | null
  pressureBar: number
  speedPercent: number
  settingsJson: string | null
  startUpperMm: number | null
  startLowerMm: number | null
  startOilTempC: number | null
  endUpperMm: number | null
  endLowerMm: number | null
  endLeftMm: number | null
  endRightMm: number | null
  endS1Bar: number | null
  endS2Bar: number | null
  endOilTempC: number | null
  maxS1Bar: number | null
  maxUpperDriftMm: number | null
  maxLowerDriftMm: number | null
  finalUpperDriftMm: number | null
  finalLowerDriftMm: number | null
  postWatchSec: number | null
  /** İş boyunca izleme (2026-11-05) — null = iş izlenmedi */
  jobEndedAt?: string | null
  maxUpperRetreatMm?: number | null
  maxUpperAdvanceMm?: number | null
  maxLowerUncmdMm?: number | null
  minS1HoldBar?: number | null
  slackCount?: number | null
  slackTotalMm?: number | null
  pasoSummaryJson?: string | null
  sampleCount: number
  noteCount: number
  samples: ClampTelemetrySample[]
}

export interface ClampTelemetryPage {
  total: number
  page: number
  pageSize: number
  items: ClampTelemetrySession[]
}

export interface ClampTelemetryListQuery {
  page?: number
  pageSize?: number
  jobId?: number
}
