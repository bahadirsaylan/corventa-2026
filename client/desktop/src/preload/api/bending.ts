// window.corventa.bending.* — bending pipeline endpoint'lerine renderer erişimi.

import { ipcRenderer } from 'electron'

import {
  Ipc,
  type ApplyStageRequest,
  type BendingCalculateRequest,
  type BendingCalculateResponse,
  type BendingJob,
  type BendingJobCreateRequest,
  type BendingPreviewRequest,
  type BendingPreviewResponse,
  type RecommendStageResponse,
  type StartJobResponse,
} from '@shared'

export const bendingApi = {
  calculate: (req: BendingCalculateRequest): Promise<BendingCalculateResponse> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.BendingCalculate, req),

  preview: (req: BendingPreviewRequest): Promise<BendingPreviewResponse> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.BendingPreview, req),

  recommendStage: (profileA: number): Promise<RecommendStageResponse> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.RecommendStage, profileA),

  applyStage: (req: ApplyStageRequest): Promise<unknown> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.ApplyStage, req),

  createJob: (req: BendingJobCreateRequest): Promise<BendingJob> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.CreateBendingJob, req),

  getActiveJob: (): Promise<BendingJob | null> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.GetActiveBendingJob),

  getJob: (id: number): Promise<BendingJob> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.GetBendingJob, id),

  startJob: (jobId: number, skipAutoCorrect = false): Promise<StartJobResponse> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.StartBendingJob, { jobId, skipAutoCorrect }),

  cancelJob: (jobId: number): Promise<unknown> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.CancelBendingJob, jobId),

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
