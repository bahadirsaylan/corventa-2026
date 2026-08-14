// DataApi (port 5002) HTTP client — DB CRUD operations.

import { getConfig } from '@main/config/runtime-config'
import { http } from '@main/lib/http'
import type {
  BendingJob,
  MachineIdentity,
  MaintenancePeriodKey,
  MaintenanceState,
  ServiceRequest,
  ServiceRequestCreateRequest,
  ServiceTicket,
  ServiceTicketAction,
  ServiceTicketCreateRequest,
} from '@shared/types'

export class DataApiClient {
  private get baseUrl(): string {
    return getConfig().dataApi.baseUrl
  }

  async isHealthy(): Promise<boolean> {
    try {
      await http.get(`${this.baseUrl}/health`, { timeoutMs: 3_000 })
      return true
    } catch {
      return false
    }
  }

  // ---------- BendingJobs ----------

  createBendingJob(job: Partial<BendingJob>): Promise<BendingJob> {
    return http.post<BendingJob>(`${this.baseUrl}/api/bending-jobs`, job)
  }

  getBendingJob(id: number): Promise<BendingJob> {
    return http.get<BendingJob>(`${this.baseUrl}/api/bending-jobs/${id}`)
  }

  getActiveBendingJob(): Promise<BendingJob | null> {
    return http.get<BendingJob | null>(`${this.baseUrl}/api/bending-jobs/active`)
  }

  // Arc interactive — sıradaki segment'i ekler (pipeline çalışırken).
  // Backend: POST /api/bending-jobs/{jobId}/segments
  addArcSegment(
    jobId: number,
    segment: { segmentOrder: number; radiusMm: number; angleDeg: number; straightAfterMm: number },
  ): Promise<unknown> {
    return http.post(`${this.baseUrl}/api/bending-jobs/${jobId}/segments`, segment)
  }

  // ---------- Service Tickets (Soru / Öneri / Şikayet) ----------

  listTickets(
    type: 'question' | 'suggestion' | 'complaint',
    limit = 100,
  ): Promise<ServiceTicket[]> {
    const qs = new URLSearchParams({ type, limit: String(limit) }).toString()
    return http.get<ServiceTicket[]>(`${this.baseUrl}/api/service/tickets?${qs}`)
  }

  getTicket(id: number): Promise<ServiceTicket> {
    return http.get<ServiceTicket>(`${this.baseUrl}/api/service/tickets/${id}`)
  }

  createTicket(req: ServiceTicketCreateRequest): Promise<ServiceTicket> {
    return http.post<ServiceTicket>(`${this.baseUrl}/api/service/tickets`, req)
  }

  updateTicketStatus(
    id: number,
    action: ServiceTicketAction,
    response?: string,
  ): Promise<ServiceTicket> {
    return http.put<ServiceTicket>(
      `${this.baseUrl}/api/service/tickets/${id}/status`,
      { action, response },
    )
  }

  // ---------- Service Requests (Talep + Rapor) ----------

  listRequests(limit = 100): Promise<ServiceRequest[]> {
    return http.get<ServiceRequest[]>(
      `${this.baseUrl}/api/service/requests?limit=${limit}`,
    )
  }

  listReports(limit = 100): Promise<ServiceRequest[]> {
    return http.get<ServiceRequest[]>(
      `${this.baseUrl}/api/service/reports?limit=${limit}`,
    )
  }

  getRequest(id: number): Promise<ServiceRequest> {
    return http.get<ServiceRequest>(`${this.baseUrl}/api/service/requests/${id}`)
  }

  createRequest(req: ServiceRequestCreateRequest): Promise<ServiceRequest> {
    return http.post<ServiceRequest>(`${this.baseUrl}/api/service/requests`, req)
  }

  updateRequest(id: number, req: Partial<ServiceRequest>): Promise<ServiceRequest> {
    return http.put<ServiceRequest>(`${this.baseUrl}/api/service/requests/${id}`, req)
  }

  startRequest(id: number): Promise<ServiceRequest> {
    return http.post<ServiceRequest>(
      `${this.baseUrl}/api/service/requests/${id}/start`,
      {},
    )
  }

  completeRequest(id: number): Promise<ServiceRequest> {
    return http.post<ServiceRequest>(
      `${this.baseUrl}/api/service/requests/${id}/complete`,
      {},
    )
  }

  confirmRequest(id: number, code: string): Promise<{ success: boolean }> {
    return http.post<{ success: boolean }>(
      `${this.baseUrl}/api/service/requests/${id}/confirm`,
      { code },
    )
  }

  rateRequest(
    id: number,
    rating: number,
    note?: string,
  ): Promise<ServiceRequest> {
    return http.post<ServiceRequest>(
      `${this.baseUrl}/api/service/requests/${id}/rating`,
      { rating, note },
    )
  }

  // ---------- Machine Identity (garanti + müşteri) ----------

  getMachineIdentity(): Promise<MachineIdentity> {
    return http.get<MachineIdentity>(`${this.baseUrl}/api/machine-identity`)
  }

  updateMachineIdentity(identity: MachineIdentity): Promise<MachineIdentity> {
    return http.put<MachineIdentity>(`${this.baseUrl}/api/machine-identity`, identity)
  }

  // ---------- Maintenance State (bakım periyot takibi) ----------

  getMaintenanceState(): Promise<MaintenanceState> {
    return http.get<MaintenanceState>(`${this.baseUrl}/api/maintenance`)
  }

  markMaintenanceCompleted(period: MaintenancePeriodKey): Promise<MaintenanceState> {
    return http.post<MaintenanceState>(
      `${this.baseUrl}/api/maintenance/mark-completed?period=${encodeURIComponent(period)}`,
      {},
    )
  }

  setMaintenanceMode(on: boolean): Promise<MaintenanceState> {
    return http.post<MaintenanceState>(
      `${this.baseUrl}/api/maintenance/mode?on=${on}`,
      {},
    )
  }
}

export const dataApi = new DataApiClient()
