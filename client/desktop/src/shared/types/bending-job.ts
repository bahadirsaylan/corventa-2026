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

  // Arc segments — server BendingJob.Segments nav property'sini include eder.
  // Arc dışı method'larda null/undefined. ArcNextSegmentModal kümülatif boy hesabı için okur.
  segments?: BendingSegmentInput[]
}

// Arc (çok açılı) bending — ilk segment payload'u (backend BendingSegment entity'si)
// Sonraki segment'ler POST /api/bending-job/{id}/next-segment ile interactive eklenir.
export interface BendingSegmentInput {
  segmentOrder: number  // 1 from UI (Create body); 2+ via interactive
  radiusMm: number      // yarıçap (UI'daki R direkt, /2 yok)
  angleDeg: number      // α — 0 < α < 180
  straightAfterMm: number  // L_düz, ≥ 0
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

  // Arc-only fields (Method=Arc ise zorunlu; diğer method'larda null)
  totalSegmentCount?: number | null       // P
  arcStepDistanceMm?: number | null       // G — Arc'a özel job-level adım
  kivrimHizMetreDakika?: number | null    // H (m/min) — Arc'a özel hız
  segments?: BendingSegmentInput[]        // İlk segment burada; sonrakiler interactive
  // 2026-09-08: UI planner (ArcExtensionPlanner) ters sıralamayı önerdiyse true.
  // Segmentler DB'ye orijinal user-input sırada gider; runtime handler ters çevirir.
  isReversedArcOrder?: boolean | null

  // Sivama-only field (Method=Sivama ise zorunlu; diğer method'larda null)
  sivamaAngleDeg?: number | null          // X — Sıvama ilk rotasyon açısı (derece)

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

// AI RECIPE FAZ 4B UI (2026-09-04) — bir dairesel bukum baslamadan onceki eslesme kontrolu
export interface SimilarBendingJobRequest {
  targetDiameterMm: number
  partLengthMm: number
  stepDistanceMm: number
  profileA: number
  profileB: number
  profileS: number
  ballDiameterMm: number
  // Opsiyonel — SignalR /machineHub'dan MachineState.Sensors.OilTempC verilirse ±2°C filtre uygulanir
  oilTempC?: number
}

export interface SimilarBendingJobIteration {
  iterationOrder: number
  measuredDiameterMm: number
  errorMm: number
  correctionPistonPositionMm: number
  measurementSide: string
  isWithinTolerance: boolean
}

export interface SimilarBendingJobResponse {
  // null = eslesme yok, ilk kez bu parametre kombinasyonu.
  match: {
    id: number
    durationSeconds: number
    totalSpringbackIterations: number
    createdAt: string
    completedAt: string
    oilTempAtStartC?: number | null
    oilTempAvgC?: number | null
    recipeUsedFromJobId?: number | null
  } | null
  iterations: SimilarBendingJobIteration[]
}

// Bending pipeline ilerlemesi (SignalR /machineHub "BendingProgress" event'i).
export interface BendingProgress {
  jobId: number
  completedPasos: number
  totalPasos: number
  percentComplete: number
  message: string

  // Arc interactive flow — FullCircle job'larında her zaman false/null.
  // awaitingArcSegmentInput=true iken UI SEKIL-14-LP modal'ı açıp R/α/L sorar,
  // POST /api/bending-jobs/{id}/segments ile DataApi'ye gönderir, modal kapanır.
  awaitingArcSegmentInput?: boolean
  completedSegmentOrder?: number | null
  totalSegmentCount?: number | null

  // Serpantin flow — pipeline yan dayama ayarı için operatör onayı bekliyor.
  // true iken UI büyük "DEVAM ET" butonu göster, tıklanınca
  // POST /api/bending-job/{id}/confirm-side-support çağrılır.
  awaitingSideSupportConfirmation?: boolean

  // Arc ölçüm hatası retry akışı (2026-08-18):
  //   awaitingMeasurementRetry=true iken UI MODAL 1 (Retract + Remeasure) açar.
  //   pneumaticRetractedForRetry=true olunca Modal 1'de "Tekrar Ölç" butonu AKTİF olur.
  //   awaitingMeasurementFinalDecision=true iken UI MODAL 2 (Finish + Skip) açar.
  //   POST /api/bending-job/{id}/measurement-retry-action ile action gönderilir.
  awaitingMeasurementRetry?: boolean
  pneumaticRetractedForRetry?: boolean
  awaitingMeasurementFinalDecision?: boolean
  prevMeasuredRadiusMm?: number | null
  lastMeasuredRadiusMm?: number | null
  targetRadiusMm?: number | null
  measurementRetrySegmentOrder?: number | null
  measurementRetryIteration?: number | null
}
