// window.corventa.bending.* — bending pipeline endpoint'lerine renderer erişimi.

import { ipcRenderer } from 'electron'

import {
  Ipc,
  type ApplyStageRequest,
  type GonyeResult,
  type BendingCalculateRequest,
  type BendingCalculateResponse,
  type BendingJob,
  type BendingJobCreateRequest,
  type BendingJobListQuery,
  type BendingLogExportRequest,
  type BendingLogExportResult,
  type BendingLogQuery,
  type BendingLogsResponse,
  type BendingPreviewRequest,
  type BendingPreviewResponse,
  type RecommendStageResponse,
  type SimilarBendingJobRequest,
  type SimilarBendingJobResponse,
  type StartJobResponse,
  type StopUnloadResponse,
  type OilHeatingResult,
  type OilHeatingStartRequest,
  type OilHeatingStatus,
  type PressureDropTestLogDetail,
  type PressureDropTestLogSummary,
  type PressureDropTestResult,
  type PressureDropTestStartRequest,
  type PressureDropTestStatus,
  type UnloadPartRequest,
  type UnloadPartResponse,
  type ResumeStatusResponse,
  type ResumeActionResponse,
  type ManualCorrectRequest,
  type ManualCorrectStartResult,
  type ManualCorrectStatus,
  type ManualCorrectStopResult,
  type SavedBend,
  type SavedBendSaveBody,
  type SavedBendSummary,
  type ValidateArcPlanRequest,
  type ValidateArcPlanResponse,
} from '@shared'

export const bendingApi = {
  calculate: (req: BendingCalculateRequest): Promise<BendingCalculateResponse> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.BendingCalculate, req),

  preview: (req: BendingPreviewRequest): Promise<BendingPreviewResponse> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.BendingPreview, req),

  // 2026-09-08: Arc onayla — segmentleri backend planner'a gönder, uzatma + sıralama kararı al.
  validateArcPlan: (req: ValidateArcPlanRequest): Promise<ValidateArcPlanResponse> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.BendingArcValidatePlan, req),

  recommendStage: (profileA: number): Promise<RecommendStageResponse> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.RecommendStage, profileA),

  applyStage: (req: ApplyStageRequest): Promise<unknown> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.ApplyStage, req),

  executeGonye: (): Promise<GonyeResult> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.ExecuteGonye),

  // Tahliye (SEKIL-18) — üst top geri + rotasyon (POST /api/preparation/unload).
  // Hata / durdurma da cevap gövdesiyle gelir (success=false, cancelled=true durdurulduysa).
  unloadPart: (req: UnloadPartRequest): Promise<UnloadPartResponse> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.UnloadPart, req),

  // Tahliye DURDUR — devam eden tahliyeyi keser, üst top + rotasyonu durdurur.
  stopUnload: (): Promise<StopUnloadResponse> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.StopUnload),

  // Yağ ısıtma programı (Admin Ayarları > TEST)
  oilHeatingStart: (req?: OilHeatingStartRequest): Promise<OilHeatingResult> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.OilHeatingStart, req ?? {}),
  oilHeatingStop: (): Promise<OilHeatingResult> => ipcRenderer.invoke(Ipc.IpcInvoke.OilHeatingStop),
  oilHeatingStatus: (): Promise<OilHeatingStatus> => ipcRenderer.invoke(Ipc.IpcInvoke.OilHeatingStatus),
  // Basınç düşüş testi (Admin Ayarları > TEST)
  pressureDropTestStart: (req: PressureDropTestStartRequest): Promise<PressureDropTestResult> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.PressureDropTestStart, req),
  pressureDropTestStop: (): Promise<PressureDropTestResult> => ipcRenderer.invoke(Ipc.IpcInvoke.PressureDropTestStop),
  pressureDropTestStatus: (samples?: number): Promise<PressureDropTestStatus> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.PressureDropTestStatus, samples),
  pressureDropTestLogs: (): Promise<PressureDropTestLogSummary[]> => ipcRenderer.invoke(Ipc.IpcInvoke.PressureDropTestLogs),
  pressureDropTestLog: (fileName: string): Promise<PressureDropTestLogDetail> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.PressureDropTestLog, fileName),
  // Radyus (GT2) sensörü — Admin Ayarları > ÖLÇÜM & SENSÖR
  radiusSensorAction: (side: 'left' | 'right', action: 'zero' | 'clear' | 'reset-encoder'): Promise<unknown> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.RadiusSensorAction, side, action),

  createJob: (req: BendingJobCreateRequest): Promise<BendingJob> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.CreateBendingJob, req),

  // AI RECIPE FAZ 4B UI (2026-09-04) — bukum baslamadan onceki eslesme kontrolu (read-only)
  findSimilar: (req: SimilarBendingJobRequest): Promise<SimilarBendingJobResponse> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.FindSimilarBendingJob, req),

  getActiveJob: (): Promise<BendingJob | null> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.GetActiveBendingJob),

  getJob: (id: number): Promise<BendingJob> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.GetBendingJob, id),

  // BÜKÜM GEÇMİŞİ — iş listesi (en yeni önce, limit ≤ 1000) + iş logları (kronolojik, limit ≤ 20000)
  listJobs: (q: BendingJobListQuery = {}): Promise<BendingJob[]> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.ListBendingJobs, q),

  getJobLogs: (q: BendingLogQuery): Promise<BendingLogsResponse> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.GetBendingLogs, q),

  /** Logları dosyaya kaydet — main kayıt penceresi açar (.txt / .csv) */
  exportJobLogs: (req: BendingLogExportRequest): Promise<BendingLogExportResult> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.ExportBendingLogs, req),

  // manualPlacementSide verilirse ELLE KONUMLANDIRMA (sensörsüz) başlatma — taraf job tarafıyla aynı olmalı.
  startJob: (
    jobId: number,
    skipAutoCorrect = false,
    manualPlacementSide?: 'Left' | 'Right',
  ): Promise<StartJobResponse> =>
    ipcRenderer.invoke(
      Ipc.IpcInvoke.StartBendingJob,
      manualPlacementSide
        ? { jobId, skipAutoCorrect, manualPlacement: true, manualPlacementSide }
        : { jobId, skipAutoCorrect },
    ),

  cancelJob: (jobId: number): Promise<unknown> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.CancelBendingJob, jobId),

  // 2026-11-01 — acil stop kesintisi (Şekil 15-17)
  getResumeStatus: (jobId: number): Promise<ResumeStatusResponse> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.GetResumeStatus, jobId),
  resumeJob: (jobId: number): Promise<ResumeActionResponse> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.ResumeBendingJob, jobId),
  abandonJob: (jobId: number): Promise<ResumeActionResponse> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.AbandonBendingJob, jobId),

  // STANDART SÜRÜM (2026-11-17) — BÜKÜM SONUCU: parça sıkılıyken elle düzeltme pasosu (Bending API)
  manualCorrectStart: (jobId: number, req: ManualCorrectRequest): Promise<ManualCorrectStartResult> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.ManualCorrectStart, { jobId, req }),
  manualCorrectStatus: (jobId: number): Promise<ManualCorrectStatus> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.ManualCorrectStatus, jobId),
  manualCorrectStop: (jobId: number): Promise<ManualCorrectStopResult> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.ManualCorrectStop, jobId),

  // STANDART SÜRÜM (2026-11-17) — KAYITLI BÜKÜMLER (DataApi /api/saved-bends). Yazma OPERATOR+, silme SUPERVISOR+.
  listSavedBends: (): Promise<SavedBendSummary[]> => ipcRenderer.invoke(Ipc.IpcInvoke.SavedBendList),
  getSavedBend: (id: number): Promise<SavedBend> => ipcRenderer.invoke(Ipc.IpcInvoke.SavedBendGet, id),
  createSavedBend: (body: SavedBendSaveBody): Promise<SavedBend> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.SavedBendCreate, body),
  updateSavedBend: (id: number, body: SavedBendSaveBody): Promise<SavedBend> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.SavedBendUpdate, { id, body }),
  markSavedBendRan: (id: number): Promise<SavedBend> => ipcRenderer.invoke(Ipc.IpcInvoke.SavedBendRan, id),
  deleteSavedBend: (id: number): Promise<unknown> => ipcRenderer.invoke(Ipc.IpcInvoke.SavedBendDelete, id),

  // Arc interactive — pipeline çalışırken sıradaki segment'i ekler.
  addArcSegment: (
    jobId: number,
    segment: { segmentOrder: number; radiusMm: number; angleDeg: number; straightAfterMm: number },
  ): Promise<unknown> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.AddArcSegment, { jobId, segment }),

  // Serpantin — operatör yan dayama ayarını bitirince "DEVAM ET" onayı.
  confirmSideSupport: (jobId: number): Promise<unknown> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.ConfirmSideSupport, jobId),

  // Arc ölçüm hatası retry modal (2026-08-18):
  //   action: "retract" | "remeasure" | "finish_all" | "skip_segment"
  measurementRetryAction: (jobId: number, action: string): Promise<unknown> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.MeasurementRetryAction, { jobId, action }),

  cancelMeasurementRetry: (jobId: number): Promise<unknown> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.CancelMeasurementRetry, jobId),
}

export type BendingApi = typeof bendingApi
