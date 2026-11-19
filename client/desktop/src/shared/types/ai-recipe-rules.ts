// AI ÖĞRENME KURALLARI (2026-11-19) — DataApi GET/PUT /api/ai-recipe-rules + GET /api/bending-jobs/similar?explain=true.
// Varsayılan ayarlar = eski sabit kodlu eşleşme (hepsi tam eşit, yağ ±2 °C, merkez mesafesi ±0,01 mm, en hızlı kayıt).

export type AiTolUnit = 'MM' | 'PCT'
export type AiRecipeSelection = 'FASTEST' | 'NEWEST'

export interface AiRecipeMatchSettings {
  targetDiameterEnabled: boolean
  targetDiameterTol: number
  targetDiameterTolUnit: AiTolUnit
  partLengthEnabled: boolean
  partLengthTolMm: number
  stepDistanceEnabled: boolean
  stepDistanceTolMm: number
  profileAEnabled: boolean
  profileATolMm: number
  profileBEnabled: boolean
  profileBTolMm: number
  profileSEnabled: boolean
  profileSTolMm: number
  ballDiameterEnabled: boolean
  ballDiameterTolMm: number
  centerDistanceEnabled: boolean
  centerDistanceTolMm: number
  oilTempEnabled: boolean
  oilTempTolC: number
  oilTempAllowMissing: boolean
  profileTypeEnabled: boolean
  requireWithinTolerance: boolean
  excludeFailedMeasurement: boolean
  minSuccessfulRecords: number
  selection: AiRecipeSelection
  maxRecordAgeDays: number
  includeCloudRecipes: boolean
  cloudCenterDistanceTolMm: number
  updatedAt?: string | null
  updatedBy?: string | null
}

export interface AiRecipeRulesResponse {
  settings: AiRecipeMatchSettings
  defaults: AiRecipeMatchSettings
  isDefault: boolean
}

export type AiCriterionKey =
  | 'TargetDiameter' | 'PartLength' | 'StepDistance' | 'ProfileA' | 'ProfileB' | 'ProfileS' | 'BallDiameter'
  | 'CenterDistance' | 'OilTemp' | 'ProfileType' | 'FailedMeasurement' | 'MaxAge' | 'Duration'

export interface AiCriterionCheck {
  key: AiCriterionKey
  enabled: boolean
  applied: boolean
  passed: boolean
  actual?: number | null
  actual2?: number | null
  wanted?: number | null
  tolerance?: number | null
  unit: string
  actualText?: string | null
  wantedText?: string | null
  /** NOT_REQUESTED | MISSING | IGNORED */
  note?: string | null
  /** Türkçe teşhis satırı (log) — ekran yapılandırılmış alanlardan kendi metnini üretir */
  text: string
}

export type AiCandidateVerdict = 'SELECTED' | 'MATCH' | 'NO_RECIPE' | 'ELIMINATED'

export interface AiExplainCandidate {
  jobId: number
  createdAt: string
  completedAt?: string | null
  durationSeconds?: number | null
  profileType: string
  targetDiameterMm: number
  profileA: number
  profileB: number
  profileS: number
  oilTempAtStartC?: number | null
  oilTempAvgC?: number | null
  verdict: AiCandidateVerdict
  failedKeys: AiCriterionKey[]
  checks: AiCriterionCheck[]
  iterationCount: number
  recipeIndex?: number | null
  recipePositionMm?: number | null
  /** NO_ITERATIONS | SINGLE_MEASUREMENT | NOT_WITHIN_TOLERANCE | NO_CORRECTION */
  noRecipeCode?: string | null
  noRecipeText?: string | null
}

export interface AiExplainResult {
  settings: AiRecipeMatchSettings
  scanned: number
  scanLimit: number
  filterPassedCount: number
  recipeReadyCount: number
  minSuccessfulRecords: number
  selectedJobId?: number | null
  source?: 'local' | 'cloud' | null
  cloudMatchId?: number | null
  /** CLOUD_MATCH | CLOUD_DISABLED_BY_RULES | CLOUD_SHARE_OFF | CLOUD_NO_CENTER_DISTANCE | CLOUD_NO_CANDIDATE | CLOUD_NO_RECIPE | CLOUD_MIN_RECORDS_NOT_MET | CLOUD_ERROR */
  cloudNote?: string | null
  candidates: AiExplainCandidate[]
}

/** Ekrandaki DENEME formu → GET /api/bending-jobs/similar?explain=true */
export interface AiRecipeExplainRequest {
  targetDiameterMm: number
  partLengthMm: number
  stepDistanceMm: number
  profileA: number
  profileB: number
  profileS: number
  ballDiameterMm: number
  oilTempC?: number
  centerDistanceMm?: number
  /** Backend ProfileType adı (Square, Rectangular, Round, …) */
  profileType?: string
  explainLimit?: number
}

export interface AiRecipeExplainResponse {
  match: { id: number; durationSeconds?: number | null } | null
  recipeIndex?: number | null
  explain?: AiExplainResult
}
