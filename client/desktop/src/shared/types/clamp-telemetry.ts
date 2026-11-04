// (2026-11-04) Sıkıştırma telemetrisi — DataApi /api/clamp-telemetry sözleşmesi (ClampTelemetryController).
// Bending API sıkıştırma boyunca (100 ms) ve sonrasında (POST-WATCH, 500 ms) makine state'ini örnekler.

export type ClampTelemetryPhase = 'CLAMP' | 'AFTER' | 'NOTE'

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
  note: string | null
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
