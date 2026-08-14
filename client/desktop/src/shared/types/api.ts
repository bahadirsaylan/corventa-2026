// Engine API (port 5000) request/response şekilleri.

// POST /api/bending/calculate
export interface BendingCalculateRequest {
  ballDiameter: number
  thickness: number
  centerDistance: number
  targetBendingDiameter: number
  xA1: number
  yA1: number
  theta: number
}

export interface BendingCalculateResponse {
  success: boolean
  pistonPosition: number
  xArc: number
  yArc: number
  discriminant: number
  ballRadius: number
  arcRadius: number
  k: number
  r2: number
  error?: string
}

// POST /api/bending/geometric/preview
export interface BendingPreviewRequest {
  targetPositionMm: number
  partLengthMm: number
  safetyMarginMm: number
  stepDistanceMm: number
  activeSensorSide: 'Left' | 'Right'
  firstStepDistanceMm?: number | null
}

export interface BendingPreviewResponse {
  success: boolean
  totalPasos: number
  pasoSteps: PasoStep[]
  error?: string
}

export interface PasoStep {
  stepNumber: number
  distanceMm: number
  cumulativeMm: number
}

// GET /api/preparation/recommend-stage?profileA={mm}
export interface RecommendStageResponse {
  stageNumber: number
  stageId: number
  name: string
  maxProfileAMm: number
  leftOffsetMm: number
  rightOffsetMm: number
  lowerOffsetMm: number
  reason: string
}

export interface RecommendStageError {
  error: string
  profileA: number
  maxConfiguredMaxProfileAMm: number
}

// POST /api/preparation/stage
export interface ApplyStageRequest {
  targetStage: number
  speedPercent: number
}

// POST /api/bending-job/{id}/start  (no body)
export interface StartJobResponse {
  success: boolean
  message?: string
  jobId?: number
  error?: string
}

// Manuel control commands

export type JogDirection = -1 | 0 | 1
export type PistonName = 'right' | 'left' | 'upper' | 'lower'
export type PneumaticSide = 'right' | 'left'

export interface PistonJogRequest {
  piston: PistonName
  direction: JogDirection
  speedPercent: number
}

export interface PistonPositionRequest {
  piston: PistonName
  positionMm: number
  speedPercent: number
}

export interface PistonPressureRequest {
  piston: PistonName
  pressureBar: number
  speedPercent: number
}

export interface RotationJogRequest {
  direction: JogDirection
  speedPercent: number
}

export interface RotationPositionRequest {
  position: number
  speedPercent: number
}

export interface RotationDistanceRequest {
  distance: number
  speedPercent: number
}

export interface PneumaticRequest {
  side: PneumaticSide
  direction: JogDirection
}

// Yan dayama (side support) — 3 tip × 2 taraf, basılı-tut pattern.
// mouseDown → direction=1|-1, mouseUp/mouseLeave → direction=0.
export type SideSupportSide = 'left' | 'right'
export type SideSupportType = 'joint' | 'body' | 'reel'

export interface SideSupportRequest {
  side: SideSupportSide
  type: SideSupportType
  direction: JogDirection
}

// Bağlantı durumu — connection manager'dan UI'a gelir.
export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error'

export interface ConnectionStatus {
  engineHttp: ConnectionState
  machineHub: ConnectionState
  dataApiHttp: ConnectionState
  corventaHub: ConnectionState
  lastError?: string
  lastStateUpdateAt?: string // ISO timestamp — watchdog için
}
