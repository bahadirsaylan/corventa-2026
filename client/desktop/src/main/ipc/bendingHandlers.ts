// Bending pipeline IPC handler'ları — UI'dan gelen istekleri Engine + DataApi'ye yönlendirir.

import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { writeFile } from 'fs/promises'
import { extname, join } from 'path'

import { childLogger } from '@main/lib/logger'
import { trackUnload } from '@main/services/activity/unloadActivity'
import { dataApi } from '@main/services/data-api/DataApiClient'
import { engineApi } from '@main/services/engine-api/EngineApiClient'
import {
  Ipc,
  type BendingJob,
  type BendingJobCreateRequest,
  type BendingJobListQuery,
  type BendingLogExportRequest,
  type BendingLogExportResult,
  type BendingLogQuery,
  type SimilarBendingJobRequest,
  type UnloadPartRequest,
  type OilHeatingStartRequest,
} from '@shared'

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

  ipcMain.handle(Ipc.IpcInvoke.BendingArcValidatePlan, async (_evt, req) => {
    log.info('arc-validate-plan', { req })
    return engineApi.validateArcPlan(req)
  })

  ipcMain.handle(Ipc.IpcInvoke.RecommendStage, async (_evt, profileA: number) => {
    log.debug('recommend-stage', { profileA })
    return engineApi.recommendStage(profileA)
  })

  ipcMain.handle(Ipc.IpcInvoke.ApplyStage, async (_evt, req) => {
    log.info('apply-stage', { req })
    return engineApi.applyStage(req)
  })

  ipcMain.handle(Ipc.IpcInvoke.UnloadPart, async (_evt, req: UnloadPartRequest) => {
    log.info('unload-part', { req })
    // Sürerken güncelleme kurulumu reddedilir (cloudHandlers)
    return trackUnload(() => engineApi.unloadPart(req))
  })

  // Tahliye DURDUR — POST /api/preparation/unload/stop (devam eden tahliyeyi keser)
  ipcMain.handle(Ipc.IpcInvoke.StopUnload, async () => {
    log.warn('stop-unload')
    return engineApi.stopUnload()
  })

  // Yağ ısıtma programı (Admin Ayarları > TEST)
  ipcMain.handle(Ipc.IpcInvoke.OilHeatingStart, async (_evt, req?: OilHeatingStartRequest) => {
    log.info('oil-heating-start', { req })
    return engineApi.oilHeatingStart(req ?? {})
  })
  ipcMain.handle(Ipc.IpcInvoke.OilHeatingStop, async () => {
    log.warn('oil-heating-stop')
    return engineApi.oilHeatingStop()
  })
  ipcMain.handle(Ipc.IpcInvoke.OilHeatingStatus, async () => engineApi.oilHeatingStatus())

  ipcMain.handle(Ipc.IpcInvoke.RadiusSensorAction, async (_evt, side: unknown, action: unknown) => {
    if (side !== 'left' && side !== 'right') throw new Error('Geçersiz sensör tarafı')
    if (action !== 'zero' && action !== 'clear' && action !== 'reset-encoder') throw new Error('Geçersiz işlem')
    log.info('radius-sensor', { side, action })
    return engineApi.radiusSensorAction(side, action)
  })

  ipcMain.handle(Ipc.IpcInvoke.ExecuteGonye, async () => {
    log.info('execute-gonye')
    return engineApi.executeGonye()
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

  // ---------- BÜKÜM GEÇMİŞİ (Ayarlar > Büküm Geçmişi) ----------

  ipcMain.handle(Ipc.IpcInvoke.ListBendingJobs, async (_evt, q?: BendingJobListQuery) => {
    // Backend limit'i 1..1000'e sıkıştırır; burada da sınırla (geçersiz sayı → 50)
    const limit = Math.min(1000, Math.max(1, Math.round(Number(q?.limit) || 50)))
    const status = q?.status != null && Number.isInteger(Number(q.status)) ? q.status : undefined
    return dataApi.listBendingJobs({ limit, status })
  })

  ipcMain.handle(Ipc.IpcInvoke.GetBendingLogs, async (_evt, q: BendingLogQuery) => {
    const jobId = Math.round(Number(q?.jobId))
    if (!Number.isFinite(jobId) || jobId <= 0) throw new Error('jobId zorunlu')
    const limit = Math.min(20_000, Math.max(1, Math.round(Number(q?.limit) || 20_000)))
    return dataApi.getBendingLogs({
      jobId,
      category: q?.category || undefined,
      errorsOnly: q?.errorsOnly === true || undefined,
      limit,
    })
  })

  // Log dışa aktarma — kayıt penceresi (USB dahil istenen klasör). Uzantı .csv seçilirse CSV, aksi halde TXT yazılır.
  ipcMain.handle(
    Ipc.IpcInvoke.ExportBendingLogs,
    async (evt, req: BendingLogExportRequest): Promise<BendingLogExportResult> => {
      try {
        const safeName = String(req?.defaultFileName || 'bukum-loglari.txt').replace(/[\\/:*?"<>|]+/g, '_')
        const win = BrowserWindow.fromWebContents(evt.sender) ?? undefined
        const opts: Electron.SaveDialogOptions = {
          title: req?.dialogTitle || 'Büküm loglarını kaydet',
          defaultPath: join(app.getPath('documents'), safeName),
          filters: [
            { name: 'Metin (.txt)', extensions: ['txt'] },
            { name: 'CSV (.csv)', extensions: ['csv'] },
          ],
        }
        const res = win ? await dialog.showSaveDialog(win, opts) : await dialog.showSaveDialog(opts)
        if (res.canceled || !res.filePath) return { ok: false, cancelled: true }
        const isCsv = extname(res.filePath).toLowerCase() === '.csv'
        // UTF-8 BOM — Excel / Not Defteri Türkçe karakterleri doğru açsın
        await writeFile(res.filePath, '\uFEFF' + String((isCsv ? req.csv : req.txt) ?? ''), 'utf8')
        log.info('bending logs exported', { path: res.filePath, format: isCsv ? 'csv' : 'txt' })
        return { ok: true, path: res.filePath }
      } catch (err) {
        const msg = (err as Error).message
        log.error('bending logs export failed', { error: msg })
        return { ok: false, error: msg }
      }
    },
  )

  // AI RECIPE FAZ 4B UI (2026-09-04) — dairesel bukum eslesme kontrolu (read-only, side-effect yok)
  ipcMain.handle(
    Ipc.IpcInvoke.FindSimilarBendingJob,
    async (_evt, req: SimilarBendingJobRequest) => {
      log.debug('find-similar-bending-job', { req })
      return dataApi.findSimilarCircularJob(req)
    },
  )

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
    async (
      _evt,
      payload:
        | number
        | {
            jobId: number
            skipAutoCorrect?: boolean
            manualPlacement?: boolean
            manualPlacementSide?: 'Left' | 'Right'
          },
    ) => {
      // Eski sozlesme number ile gelirdi; backward compat icin dual-shape destek.
      const jobId = typeof payload === 'number' ? payload : payload.jobId
      const skipAutoCorrect = typeof payload === 'number' ? false : !!payload.skipAutoCorrect
      // Elle konumlandırma (sensörsüz) — sadece taraf da geldiyse; taraf yoksa backend zaten 400 verirdi
      const manualSide =
        typeof payload !== 'number' && payload.manualPlacement
          ? payload.manualPlacementSide === 'Right'
            ? 'Right'
            : payload.manualPlacementSide === 'Left'
              ? 'Left'
              : null
          : null
      if (typeof payload !== 'number' && payload.manualPlacement && !manualSide) {
        return { success: false, error: 'Elle konumlandırmada taraf (Left/Right) seçilmeli' }
      }
      log.info('start-bending-job', { jobId, skipAutoCorrect, manualPlacementSide: manualSide })
      return engineApi.startBendingJob(jobId, skipAutoCorrect, manualSide)
    },
  )

  ipcMain.handle(Ipc.IpcInvoke.CancelBendingJob, async (_evt, jobId: number) => {
    log.warn('cancel-bending-job', { jobId })
    return engineApi.cancelBendingJob(jobId)
  })

  // 2026-11-01 — acil stop kesintisi: devam durumu / DEVAM ET / MANUEL TAHLİYE
  ipcMain.handle(Ipc.IpcInvoke.GetResumeStatus, async (_evt, jobId: number) => engineApi.getResumeStatus(jobId))
  ipcMain.handle(Ipc.IpcInvoke.ResumeBendingJob, async (_evt, jobId: number) => {
    log.warn('resume-bending-job (DEVAM ET)', { jobId })
    return engineApi.resumeBendingJob(jobId)
  })
  ipcMain.handle(Ipc.IpcInvoke.AbandonBendingJob, async (_evt, jobId: number) => {
    log.warn('abandon-bending-job (MANUEL TAHLİYE)', { jobId })
    return engineApi.abandonBendingJob(jobId)
  })

  ipcMain.handle(Ipc.IpcInvoke.ConfirmSideSupport, async (_evt, jobId: number) => {
    log.info('confirm-side-support (Serpantin operator confirmation)', { jobId })
    return engineApi.confirmSideSupport(jobId)
  })

  // Arc ölçüm hatası retry modal — 2 modal (Modal 1: retract/remeasure, Modal 2: finish_all/skip_segment)
  ipcMain.handle(
    Ipc.IpcInvoke.MeasurementRetryAction,
    async (_evt, payload: { jobId: number; action: string }) => {
      log.info('measurement-retry-action', payload)
      return engineApi.measurementRetryAction(payload.jobId, payload.action)
    },
  )

  ipcMain.handle(Ipc.IpcInvoke.CancelMeasurementRetry, async (_evt, jobId: number) => {
    log.info('cancel-measurement-retry (manuel modal iptali)', { jobId })
    return engineApi.cancelMeasurementRetry(jobId)
  })
}
