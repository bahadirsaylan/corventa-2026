// Backend BendingJob entity (Core/Entities/BendingJob.cs) yansıması.
// DataAPI POST /api/bending-jobs body'si bu şekli kabul eder.

import type {
  BendingDirection,
  BendingJobStatus,
  BendingMethod,
  ProfileType,
} from './enums'

export interface BendingJob {
  id: number

  // Lifecycle
  status: BendingJobStatus
  createdAt: string
  startedAt: string | null
  completedAt: string | null

  // Profile
  profileType: ProfileType
  direction: BendingDirection
  method: BendingMethod

  profileA: number
  profileB: number
  profileS: number
  targetDiameterMm: number
  profileH: number | null
  profileG: number | null

  // Part
  partLengthMm: number
  activeSensorSide: 'Left' | 'Right'
  valsCode: string | null

  // Bending parameters
  stepDistanceMm: number
  firstStepDistanceMm: number | null
  safetyMarginMm: number
  zeroResetDistanceMm: number
  pistonSpeedPercent: number
  rotationSpeedPercent: number
  slackDistanceMm: number | null
  slackPressureBar: number
  clampPressureBar: number
  toleranceMm: number

  // Machine geometry
  ballDiameterMm: number
  centerDistanceMm: number
  thetaDeg: number
  xA1: number
  yA1: number

  // Calculated
  calculatedPistonPositionMm: number | null

  // Progress
  totalPasos: number
  completedPasos: number
  currentPaso: number | null

  // Results
  measuredDiameterMm: number | null
  finalLeftPositionMm: number | null
  finalRightPositionMm: number | null
  durationSeconds: number | null

  // Error
  errorMessage: string | null
  failedAtPaso: number | null

  // User
  operatorName: string | null
  notes: string | null
}

// UI'dan job kaydederken gönderilecek minimum alanlar.
// Geri kalan field'lar backend default'larından gelir (DataAPI tarafında ileride netleştirilecek).
// Şu an için backend tüm alanları kabul ediyor; mapper bu interface'i full BendingJob'a çevirir.
export interface BendingJobCreateRequest {
  profileType: ProfileType
  direction: BendingDirection
  method: BendingMethod

  profileA: number
  profileB: number
  profileS: number
  targetDiameterMm: number
  profileH?: number | null
  profileG?: number | null

  partLengthMm: number
  activeSensorSide: 'Left' | 'Right'

  stepDistanceMm: number
  totalPasos?: number
  calculatedPistonPositionMm?: number | null

  // Operator metadata
  operatorName?: string | null
  notes?: string | null

  // İleride DataAPI default'lara bağlanırsa bu alanlar opsiyonel kalacak.
  safetyMarginMm?: number
  pistonSpeedPercent?: number
  rotationSpeedPercent?: number
  slackPressureBar?: number
  clampPressureBar?: number
  toleranceMm?: number
  ballDiameterMm?: number
  centerDistanceMm?: number
  thetaDeg?: number
  xA1?: number
  yA1?: number
  zeroResetDistanceMm?: number
}

// Bending pipeline ilerlemesi (SignalR /machineHub "BendingProgress" event'i).
export interface BendingProgress {
  jobId: number
  completedPasos: number
  totalPasos: number
  percentComplete: number
  message: string
}
