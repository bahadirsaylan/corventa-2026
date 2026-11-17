// STANDART SÜRÜM (2026-11-17) — BÜKÜM SONUCU ekranı (elle düzeltme) + KAYITLI BÜKÜMLER.
// Sözleşme: docs/STANDART_SURUM.md §3.2 (Bending API manual-correct) ve §3.3 (DataApi /api/saved-bends).

// ── Elle düzeltme pasosu (parça sıkılıyken) — Bending API ──────────────────

/** POST /api/bending-job/{id}/manual-correct gövdesi */
export interface ManualCorrectRequest {
  /** Yeni itme derinliği (mm) — iş hedefinden (+0,05 mm) büyük olmalı */
  pushDepthMm: number
  speedPercent?: number
}

/** POST /manual-correct cevabı — 202 { started: true }; 400/409 hata gövdesi { error } normalize edilir */
export interface ManualCorrectStartResult {
  started: boolean
  error?: string | null
}

export type ManualCorrectState = 'Idle' | 'Running' | 'Completed' | 'Failed' | 'Cancelled'

/** GET /api/bending-job/{id}/manual-correct/status */
export interface ManualCorrectStatus {
  state: ManualCorrectState
  message: string | null
  pushDepthMm: number | null
  previousPushDepthMm: number | null
  startedAt: string | null
  finishedAt: string | null
}

/** POST /manual-correct/stop */
export interface ManualCorrectStopResult {
  success: boolean
  error?: string | null
}

// ── Kayıtlı bükümler — DataApi /api/saved-bends ──────────────────────────────

/** correctionsJson içindeki tek düzeltme kaydı */
export interface SavedBendCorrection {
  /** ISO zaman */
  at: string
  fromMm: number
  toMm: number
  measuredDiameterMm?: number | null
  /** part = parçaya uygulandı (manual-correct) · newPart = yeni parçayla bükmek için hedef değişti */
  mode: 'part' | 'newPart'
}

/** GET /api/saved-bends liste satırı */
export interface SavedBendSummary {
  id: number
  name: string
  method: string
  targetDiameterMm: number
  profileA: number
  pushDepthMm: number
  stepDistanceMm: number
  stageNumber: number | null
  runCount: number
  createdAt: string
  updatedAt: string
  createdBy: string | null
}

/** GET /api/saved-bends/{id} — tam kayıt */
export interface SavedBend extends SavedBendSummary {
  /** UI BendingJobParams anlık görüntüsü (JSON) */
  paramsJson: string
  /** SavedBendCorrection[] (JSON) */
  correctionsJson: string | null
  sourceJobId: number | null
  updatedBy?: string | null
}

/** POST / PUT gövdesi — PUT'ta alanlar opsiyonel (null/yok = korunur) */
export interface SavedBendSaveBody {
  name?: string
  method?: string
  paramsJson?: string
  targetDiameterMm?: number
  profileA?: number
  pushDepthMm?: number
  stepDistanceMm?: number
  stageNumber?: number | null
  correctionsJson?: string | null
  sourceJobId?: number | null
}
