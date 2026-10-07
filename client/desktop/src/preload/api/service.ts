// window.corventa.service.* — Soru/Öneri/Şikayet + Servis Talebi/Raporu CRUD'u.
// Renderer'da hardcode/mock yok; ileride cloud proxy değişimi tek noktada (DataApiClient).

import { ipcRenderer } from 'electron'

import {
  Ipc,
  type ServiceRequest,
  type ServiceRequestCreateRequest,
  type ServiceTicket,
  type ServiceTicketAction,
  type ServiceTicketCreateRequest,
} from '@shared'

export const serviceApi = {
  // ---------- Tickets ----------

  listTickets: (
    type: 'question' | 'suggestion' | 'complaint',
    limit = 100,
  ): Promise<ServiceTicket[]> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.ServiceListTickets, { type, limit }),

  getTicket: (id: number): Promise<ServiceTicket> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.ServiceGetTicket, id),

  createTicket: (req: ServiceTicketCreateRequest): Promise<ServiceTicket> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.ServiceCreateTicket, req),

  updateTicketStatus: (
    id: number,
    action: ServiceTicketAction,
    response?: string,
  ): Promise<ServiceTicket> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.ServiceUpdateTicketStatus, {
      id,
      action,
      response,
    }),

  // ---------- Requests ----------

  listRequests: (limit = 100): Promise<ServiceRequest[]> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.ServiceListRequests, { limit }),

  listReports: (limit = 100): Promise<ServiceRequest[]> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.ServiceListReports, { limit }),

  getRequest: (id: number): Promise<ServiceRequest> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.ServiceGetRequest, id),

  createRequest: (req: ServiceRequestCreateRequest): Promise<ServiceRequest> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.ServiceCreateRequest, req),

  updateRequest: (id: number, req: Partial<ServiceRequest>): Promise<ServiceRequest> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.ServiceUpdateRequest, { id, req }),

  startRequest: (id: number): Promise<ServiceRequest> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.ServiceStartRequest, id),

  completeRequest: (id: number): Promise<ServiceRequest> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.ServiceCompleteRequest, id),

  confirmRequest: (id: number, code: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.ServiceConfirmRequest, { id, code }),

  rateRequest: (id: number, rating: number, note?: string): Promise<ServiceRequest> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.ServiceRateRequest, { id, rating, note }),
}

export type ServiceApi = typeof serviceApi
