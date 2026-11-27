// Service modülü IPC handler'ları — Soru/Öneri/Şikayet (ticket) + Servis Talebi/Raporu (request).
// Renderer asla DataApi'ye direkt fetch yapmaz; tüm trafik bu handler'lar üzerinden gider.
// Cloud uyumu: ileride DataApi yerine cloud proxy konursa, bu dosyada baseUrl değişimi yeter.

import { BrowserWindow, dialog, ipcMain } from 'electron'
import { IS_DEMO } from '@main/demo/DemoMachine'
import { importClampCsvs } from '@main/demo/demoClampTelemetry'

import { childLogger } from '@main/lib/logger'
import { dataApi } from '@main/services/data-api/DataApiClient'
import {
  Ipc,
  type ClampTelemetryListQuery,
  type ErrorSnapshotListQuery,
  type ServiceRequest,
  type ServiceRequestCreateRequest,
  type ServiceTicketAction,
  type ServiceTicketCreateRequest,
} from '@shared'

const log = childLogger('ipc:service')

export function registerServiceHandlers(): void {
  // ---------- TICKETS ----------

  ipcMain.handle(
    Ipc.IpcInvoke.ServiceListTickets,
    async (
      _evt,
      payload: { type: 'question' | 'suggestion' | 'complaint'; limit?: number },
    ) => {
      log.debug('list-tickets', payload)
      return dataApi.listTickets(payload.type, payload.limit ?? 100)
    },
  )

  ipcMain.handle(Ipc.IpcInvoke.ServiceGetTicket, async (_evt, id: number) => {
    return dataApi.getTicket(id)
  })

  ipcMain.handle(
    Ipc.IpcInvoke.ServiceCreateTicket,
    async (_evt, req: ServiceTicketCreateRequest) => {
      log.info('create-ticket', { type: req.type, title: req.title })
      return dataApi.createTicket(req)
    },
  )

  ipcMain.handle(
    Ipc.IpcInvoke.ServiceUpdateTicketStatus,
    async (
      _evt,
      payload: { id: number; action: ServiceTicketAction; response?: string },
    ) => {
      log.info('update-ticket-status', payload)
      return dataApi.updateTicketStatus(payload.id, payload.action, payload.response)
    },
  )

  // ---------- REQUESTS ----------

  ipcMain.handle(
    Ipc.IpcInvoke.ServiceListRequests,
    async (_evt, payload?: { limit?: number }) => {
      return dataApi.listRequests(payload?.limit ?? 100)
    },
  )

  ipcMain.handle(
    Ipc.IpcInvoke.ServiceListReports,
    async (_evt, payload?: { limit?: number }) => {
      return dataApi.listReports(payload?.limit ?? 100)
    },
  )

  ipcMain.handle(Ipc.IpcInvoke.ServiceGetRequest, async (_evt, id: number) => {
    return dataApi.getRequest(id)
  })

  ipcMain.handle(
    Ipc.IpcInvoke.ServiceCreateRequest,
    async (_evt, req: ServiceRequestCreateRequest) => {
      log.info('create-request', { customer: req.customerName, purpose: req.purpose })
      return dataApi.createRequest(req)
    },
  )

  ipcMain.handle(
    Ipc.IpcInvoke.ServiceUpdateRequest,
    async (_evt, payload: { id: number; req: Partial<ServiceRequest> }) => {
      return dataApi.updateRequest(payload.id, payload.req)
    },
  )

  ipcMain.handle(Ipc.IpcInvoke.ServiceStartRequest, async (_evt, id: number) => {
    log.info('start-request', { id })
    return dataApi.startRequest(id)
  })

  ipcMain.handle(Ipc.IpcInvoke.ServiceCompleteRequest, async (_evt, id: number) => {
    log.info('complete-request', { id })
    return dataApi.completeRequest(id)
  })

  ipcMain.handle(
    Ipc.IpcInvoke.ServiceConfirmRequest,
    async (_evt, payload: { id: number; code: string }) => {
      log.info('confirm-request', { id: payload.id })
      return dataApi.confirmRequest(payload.id, payload.code)
    },
  )

  ipcMain.handle(
    Ipc.IpcInvoke.ServiceRateRequest,
    async (_evt, payload: { id: number; rating: number; note?: string }) => {
      log.info('rate-request', payload)
      return dataApi.rateRequest(payload.id, payload.rating, payload.note)
    },
  )

  // ---------- HATA ANI SNAPSHOT'LARI (EXCEL 26) ----------

  ipcMain.handle(Ipc.IpcInvoke.ErrorSnapshotList, async (_evt, q?: ErrorSnapshotListQuery) => {
    // Backend pageSize 1..100 kabul eder; dışındaysa 400 yerine sınırla
    const page = Math.max(1, Math.round(Number(q?.page) || 1))
    const pageSize = Math.min(100, Math.max(1, Math.round(Number(q?.pageSize) || 30)))
    return dataApi.listErrorSnapshots({
      page,
      pageSize,
      triggerType: q?.triggerType || undefined,
      jobId: q?.jobId,
    })
  })

  ipcMain.handle(Ipc.IpcInvoke.ErrorSnapshotGet, async (_evt, id: number) => {
    return dataApi.getErrorSnapshot(id)
  })

  // ---------- SIKIŞTIRMA TELEMETRİSİ (2026-11-04) ----------
  ipcMain.handle(Ipc.IpcInvoke.ClampTelemetryList, async (_evt, q?: ClampTelemetryListQuery) => {
    const page = Math.max(1, Math.round(Number(q?.page) || 1))
    const pageSize = Math.min(100, Math.max(1, Math.round(Number(q?.pageSize) || 20)))
    const jobId = Number(q?.jobId)
    return dataApi.listClampTelemetry({ page, pageSize, jobId: Number.isFinite(jobId) && jobId > 0 ? jobId : undefined })
  })

  ipcMain.handle(Ipc.IpcInvoke.ClampTelemetryGet, async (_evt, id: number) => {
    const n = Math.round(Number(id))
    if (!Number.isFinite(n) || n <= 0) throw new Error('id zorunlu')
    return dataApi.getClampTelemetry(n)
  })

  // 2026-11-05 — DEMO: makinedeki Sıkıştırma Kayıtları ekranından alınan CSV'leri seç → demo klasörüne kopyala
  ipcMain.handle(Ipc.IpcInvoke.ClampTelemetryImportCsv, async () => {
    if (!IS_DEMO) throw new Error('CSV içe aktarma sadece demo modunda')
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    const opts: Electron.OpenDialogOptions = {
      title: 'Sıkıştırma kaydı CSV seç',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    }
    const r = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts)
    if (r.canceled || r.filePaths.length === 0) return { imported: 0, errors: [], cancelled: true }
    return { ...importClampCsvs(r.filePaths), cancelled: false }
  })
}
