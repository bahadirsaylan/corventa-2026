// Service modülü IPC handler'ları — Soru/Öneri/Şikayet (ticket) + Servis Talebi/Raporu (request).
// Renderer asla DataApi'ye direkt fetch yapmaz; tüm trafik bu handler'lar üzerinden gider.
// Cloud uyumu: ileride DataApi yerine cloud proxy konursa, bu dosyada baseUrl değişimi yeter.

import { ipcMain } from 'electron'

import { childLogger } from '@main/lib/logger'
import { dataApi } from '@main/services/data-api/DataApiClient'
import {
  Ipc,
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
}
