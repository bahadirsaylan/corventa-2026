// Bending pipeline IPC handler'ları — UI'dan gelen istekleri Engine + DataApi'ye yönlendirir.

import { ipcMain } from 'electron'

import { childLogger } from '@main/lib/logger'
import { dataApi } from '@main/services/data-api/DataApiClient'
import { engineApi } from '@main/services/engine-api/EngineApiClient'
import { Ipc, type BendingJob, type BendingJobCreateRequest } from '@shared'

const log = childLogger('ipc:bending')

export function registerBendingHandlers(): void {
  ipcMain.handle(Ipc.IpcInvoke.BendingCalculate, async (_evt, req) => {
    log.debug('calculate', { req })
    return engineApi.calculate(req)
  })

  ipcMain.handle(Ipc.IpcInvoke.BendingPreview, async (_evt, req) => {
    log.debug('preview', { req })
    return engineApi.preview(req)
  })

  ipcMain.handle(Ipc.IpcInvoke.RecommendStage, async (_evt, profileA: number) => {
    log.debug('recommend-stage', { profileA })
    return engineApi.recommendStage(profileA)
  })

  ipcMain.handle(Ipc.IpcInvoke.ApplyStage, async (_evt, req) => {
    log.info('apply-stage', { req })
    return engineApi.applyStage(req)
  })

  ipcMain.handle(Ipc.IpcInvoke.CreateBendingJob, async (_evt, req: BendingJobCreateRequest) => {
    log.info('create-bending-job', { req })
    // BendingJobCreateRequest → Partial<BendingJob>
    // Backend default'ları kabul ediyor; ek alanlar gelirse de geçer.
    return dataApi.createBendingJob(req as Partial<BendingJob>)
  })

  ipcMain.handle(Ipc.IpcInvoke.GetActiveBendingJob, async () => {
    return dataApi.getActiveBendingJob()
  })

  ipcMain.handle(Ipc.IpcInvoke.GetBendingJob, async (_evt, id: number) => {
    return dataApi.getBendingJob(id)
  })

  ipcMain.handle(
    Ipc.IpcInvoke.AddArcSegment,
    async (
      _evt,
      payload: {
        jobId: number
        segment: { segmentOrder: number; radiusMm: number; angleDeg: number; straightAfterMm: number }
      },
    ) => {
      log.info('add-arc-segment (→ engine /next-segment)', payload)
      // Bending API endpoint'ini cagiriyoruz cunku:
      //   1) DB yazimini DataApi /segments uzerinden yapiyor (kumulatif validation orada calisir)
      //   2) ArcSegmentInputCoordinator sinyali iceride atiliyor → pipeline devam
      // DataApi'ye DIREKT POST etmek coordinator'i bypass eder → pipeline asili kalir.
      //
      // Backend DiameterMm (Ø) bekler, UI R (yaricap) toplar → R*2 cevirimi burada.
      return engineApi.provideNextArcSegment(payload.jobId, {
        diameterMm: payload.segment.radiusMm * 2,
        angleDeg: payload.segment.angleDeg,
        straightAfterMm: payload.segment.straightAfterMm,
      })
    },
  )

  ipcMain.handle(
    Ipc.IpcInvoke.StartBendingJob,
    async (_evt, payload: number | { jobId: number; skipAutoCorrect?: boolean }) => {
      // Eski sozlesme number ile gelirdi; backward compat icin dual-shape destek.
      const jobId = typeof payload === 'number' ? payload : payload.jobId
      const skipAutoCorrect = typeof payload === 'number' ? false : !!payload.skipAutoCorrect
      log.info('start-bending-job', { jobId, skipAutoCorrect })
      return engineApi.startBendingJob(jobId, skipAutoCorrect)
    },
  )

  ipcMain.handle(Ipc.IpcInvoke.CancelBendingJob, async (_evt, jobId: number) => {
    log.warn('cancel-bending-job (backend endpoint may not exist yet)', { jobId })
    return engineApi.cancelBendingJob(jobId)
  })
}
