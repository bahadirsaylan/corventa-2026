// Hata anı makine snapshot'ları (DataApi /api/error-snapshots) — EXCEL 26.
// Bending API iş Failed / acil stop / güvenlik uyarısı-alarmı anında kaydeder; UI sadece okur.
// Saklama: DataApi en yeni 500 kaydı tutar.

import type { PistonState, RotationState, SafetyState, SensorState } from './machine-state'

/** Backend ErrorSnapshotTriggers sabitleri (bilinmeyen değer gelirse metin olarak gösterilir) */
export type ErrorSnapshotTrigger =
  | 'JobFailed'
  | 'EmergencyStop'
  | 'PhysicalEmergencyStop'
  | 'SafetyAlarm'
  | 'SafetyWarning'
  | 'EncoderStall'

export const ERROR_SNAPSHOT_TRIGGERS: readonly ErrorSnapshotTrigger[] = [
  'JobFailed',
  'EmergencyStop',
  'PhysicalEmergencyStop',
  'SafetyAlarm',
  'SafetyWarning',
  'EncoderStall',
] as const

export type ErrorSnapshotSeverity = 'error' | 'warning'

/** Liste satırı (büyük JSON alanları yok) */
export interface ErrorSnapshotSummary {
  id: number
  /** ISO-8601 UTC */
  capturedAt: string
  triggerType: ErrorSnapshotTrigger | string
  severity: ErrorSnapshotSeverity
  reason: string
  bendingJobId: number | null
  s1PressureBar: number | null
  s2PressureBar: number | null
  oilTempC: number | null
  /** PLC sistem hata kodu (0 = yok) */
  plcErrorCode: number | null
  logCount: number
}

export interface ErrorSnapshotPage {
  total: number
  page: number
  pageSize: number
  items: ErrorSnapshotSummary[]
}

export interface ErrorSnapshotListQuery {
  page?: number
  pageSize?: number
  triggerType?: string
  jobId?: number
}

/**
 * Snapshot'taki MachineState — backend bunu enum'lar METİN olacak şekilde yazar
 * (mode: "Manual", errorCode: "NoError"); canlı SignalR state'inden farklı olarak alanlar opsiyonel kabul edilir.
 */
export interface ErrorSnapshotMachineState {
  mode?: string | number
  hydraulicMotorState?: number
  fanActive?: boolean
  alarmActive?: boolean
  systemReady?: boolean
  safetyBits?: number
  errorCode?: string | number
  rightPiston?: Partial<PistonState>
  leftPiston?: Partial<PistonState>
  upperPiston?: Partial<PistonState>
  lowerPiston?: Partial<PistonState>
  rotation?: Partial<RotationState>
  sensors?: Partial<SensorState>
  safety?: Partial<SafetyState>
  physicalInfo?: { isGonyeCompleted?: boolean; currentStage?: number; currentStageName?: string | null }
  timestamp?: string
  [key: string]: unknown
}

export interface ErrorSnapshotProgress {
  jobId: number
  completedPasos: number
  totalPasos: number
  percentComplete: number
  message: string | null
  updatedAt: string
  completedSegmentOrder: number | null
  totalSegmentCount: number | null
  lastMeasuredRadiusMm: number | null
  targetRadiusMm: number | null
}

/** DataApi'nin kayıt anında eklediği iş özeti (enum'lar metin) */
export interface ErrorSnapshotJobSummary {
  id: number
  status: string
  method: string
  profileType: string
  profileSubType: string | null
  direction: string
  profileA: number
  profileB: number
  profileS: number
  targetDiameterMm: number
  partLengthMm: number
  stepDistanceMm: number
  activeSensorSide: string
  totalPasos: number
  completedPasos: number
  currentPaso: number | null
  failedAtPaso: number | null
  errorMessage: string | null
  measuredDiameterMm: number | null
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  operatorName: string | null
}

export interface ErrorSnapshotLogLine {
  timestamp: string
  category: string
  message: string
  isError: boolean
  value1: number | null
  value2: number | null
  value3: number | null
  valueLabels: string | null
}

export interface ErrorSnapshotDetail extends ErrorSnapshotSummary {
  machineState: ErrorSnapshotMachineState | null
  progress: ErrorSnapshotProgress | null
  job: ErrorSnapshotJobSummary | null
  /** Kronolojik (en eski → en yeni), en fazla 200 satır */
  logs: ErrorSnapshotLogLine[] | null
}
