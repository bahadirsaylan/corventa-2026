// DataApi (port 5002) HTTP client — DB CRUD operations.

import { getConfig } from '@main/config/runtime-config'
import { http, HttpError } from '@main/lib/http'
import type {
  BendingJob,
  BendingJobListQuery,
  BendingLogQuery,
  BendingLogsResponse,
  Certificate,
  ChecklistResultBody,
  CloudConfig,
  CloudStatus,
  CustomerChangeConfirmResponse,
  CustomerChangeRequestBody,
  CustomerChangeRequestResponse,
  ErrorSnapshotDetail,
  ErrorSnapshotListQuery,
  ErrorSnapshotPage,
  Macro,
  MacroSaveBody,
  MacroSummary,
  MachineIdentity,
  UserPreference,
  MaintenancePeriodKey,
  MaintenanceState,
  MaintenanceRulesConfig,
  MoldListQuery,
  MoldListResponse,
  MoldLookupResult,
  StageInfo,
  ServiceRequest,
  ServiceRequestCreateRequest,
  ServiceTicket,
  ServiceTicketAction,
  ServiceTicketCreateRequest,
  SimilarBendingJobRequest,
  SimilarBendingJobResponse,
  UsageTimeSummary,
  CreateUserBody,
  UpdateUserBody,
  UserListItem,
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

  /** Büküm geçmişi — en yeni önce (CreatedAt desc), limit 1..1000 (backend sıkıştırır) */
  listBendingJobs(q: BendingJobListQuery = {}): Promise<BendingJob[]> {
    const p = new URLSearchParams()
    p.set('limit', String(q.limit ?? 50))
    if (q.status != null) p.set('status', String(q.status))
    return http.get<BendingJob[]>(`${this.baseUrl}/api/bending-jobs?${p.toString()}`)
  }

  /** İş logları — kronolojik (en eski → en yeni), limit 1..20000 (backend sıkıştırır) */
  getBendingLogs(q: BendingLogQuery): Promise<BendingLogsResponse> {
    const p = new URLSearchParams()
    p.set('jobId', String(q.jobId))
    if (q.category) p.set('category', q.category)
    if (q.errorsOnly) p.set('errorsOnly', 'true')
    p.set('limit', String(q.limit ?? 20_000))
    // 20000 satır (Detay logları dahil) varsayılan 10 sn'den uzun sürebilir
    return http.get<BendingLogsResponse>(`${this.baseUrl}/api/bending-logs?${p.toString()}`, { timeoutMs: 30_000 })
  }

  getActiveBendingJob(): Promise<BendingJob | null> {
    return http.get<BendingJob | null>(`${this.baseUrl}/api/bending-jobs/active`)
  }

  // AI RECIPE FAZ 4B UI (2026-09-04) — dairesel bukum baslamadan onceki eslesme kontrolu.
  // Backend GET /api/bending-jobs/similar (read-only, side-effect yok).
  findSimilarCircularJob(req: SimilarBendingJobRequest): Promise<SimilarBendingJobResponse> {
    const params = new URLSearchParams({
      targetDiameterMm: String(req.targetDiameterMm),
      partLengthMm: String(req.partLengthMm),
      stepDistanceMm: String(req.stepDistanceMm),
      profileA: String(req.profileA),
      profileB: String(req.profileB),
      profileS: String(req.profileS),
      ballDiameterMm: String(req.ballDiameterMm),
    })
    if (req.oilTempC != null) params.set('oilTempC', String(req.oilTempC))
    return http.get<SimilarBendingJobResponse>(
      `${this.baseUrl}/api/bending-jobs/similar?${params.toString()}`,
    )
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

  // ---------- Sertifika sorgulama ----------

  /** Kod ile sertifika — 404 → null (bulunamadı); ağ / diğer HTTP hataları fırlatılır */
  async getCertificate(code: string): Promise<Certificate | null> {
    try {
      return await http.get<Certificate>(`${this.baseUrl}/api/certificates/${encodeURIComponent(code)}`)
    } catch (err) {
      if (err instanceof HttpError && err.status === 404) return null
      throw err
    }
  }

  // ---------- Müşteri değişikliği (satış / takas / hibe, e-posta OTP) ----------
  // OTP, DataApi'deki CustomerChange:OtpRecipientEmail adresine gider. Hatalar HttpError olarak
  // fırlatılır (status + body.error / body.remainingAttempts) — IPC handler sonuç nesnesine çevirir.
  // SMTP gönderimi birkaç saniye sürebilir → varsayılandan uzun zaman aşımı.

  requestCustomerChange(body: CustomerChangeRequestBody): Promise<CustomerChangeRequestResponse> {
    return http.post<CustomerChangeRequestResponse>(
      `${this.baseUrl}/api/customer-change/request`,
      body,
      { timeoutMs: 30_000 },
    )
  }

  confirmCustomerChange(requestId: string, otp: string): Promise<CustomerChangeConfirmResponse> {
    return http.post<CustomerChangeConfirmResponse>(
      `${this.baseUrl}/api/customer-change/confirm`,
      { requestId, otp },
    )
  }

  // ---------- Kullanıcı tercihleri (ör. sağ hızlı menü) ----------

  async getUserPreference(userKey: string, prefKey: string): Promise<UserPreference | null> {
    const u = encodeURIComponent(userKey)
    const k = encodeURIComponent(prefKey)
    // 204 (kayıt yok) → http helper undefined döner
    return (await http.get<UserPreference>(`${this.baseUrl}/api/user-preferences/${u}/${k}`)) ?? null
  }

  putUserPreference(userKey: string, prefKey: string, valueJson: string): Promise<UserPreference> {
    const u = encodeURIComponent(userKey)
    const k = encodeURIComponent(prefKey)
    return http.put<UserPreference>(`${this.baseUrl}/api/user-preferences/${u}/${k}`, { valueJson })
  }

  // ---------- Maintenance State (bakım periyot takibi) ----------

  // Stage tanımları (gönye ekranında stage seçimi)
  getStages(includeInactive = false): Promise<StageInfo[]> {
    const q = includeInactive ? '?includeInactive=true' : ''
    return http.get<StageInfo[]>(`${this.baseUrl}/api/settings/stages${q}`)
  }

  // Admin Ayarları — stage ekle / güncelle (pasif dahil). Sonrasında Bending API reload çağrılmalı.
  createStage(body: Partial<StageInfo>): Promise<StageInfo> {
    return http.post<StageInfo>(`${this.baseUrl}/api/settings/stages`, body)
  }

  updateStage(id: number, body: StageInfo): Promise<StageInfo> {
    return http.put<StageInfo>(`${this.baseUrl}/api/settings/stages/${id}`, body)
  }

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

  /** Hatırlatmada DEVAM ET — hatırlatma süresi yeniden başlar. 409 = mod kapalı. */
  continueMaintenanceMode(): Promise<MaintenanceState> {
    return http.post<MaintenanceState>(`${this.baseUrl}/api/maintenance/continue`, {})
  }

  getMaintenanceRules(): Promise<MaintenanceRulesConfig> {
    return http.get<MaintenanceRulesConfig>(`${this.baseUrl}/api/maintenance/rules`)
  }

  /** ADMIN+ — Bearer başlığını http katmanı ekler. Alanlar opsiyonel; aralık dışı 400. */
  updateMaintenanceRules(body: Partial<MaintenanceRulesConfig>): Promise<MaintenanceRulesConfig> {
    return http.put<MaintenanceRulesConfig>(`${this.baseUrl}/api/maintenance/rules`, body)
  }

  // ---------- Kullanım süreleri (usage-time) ----------
  // Kategori anahtarları BÜYÜK HARF, değerler saniye. days 1..366.
  getUsageTimeSummary(days = 30): Promise<UsageTimeSummary> {
    return http.get<UsageTimeSummary>(`${this.baseUrl}/api/usage-time/summary?days=${days}`)
  }

  // ---------- Hata anı snapshot'ları (EXCEL 26) ----------
  // Liste sayfalı + özet (en yeni önce), detay tam MachineState + iş özeti + son loglar.
  listErrorSnapshots(q: ErrorSnapshotListQuery = {}): Promise<ErrorSnapshotPage> {
    const p = new URLSearchParams()
    p.set('page', String(q.page ?? 1))
    p.set('pageSize', String(q.pageSize ?? 30))
    if (q.triggerType) p.set('triggerType', q.triggerType)
    if (q.jobId != null) p.set('jobId', String(q.jobId))
    return http.get<ErrorSnapshotPage>(`${this.baseUrl}/api/error-snapshots?${p.toString()}`)
  }

  getErrorSnapshot(id: number): Promise<ErrorSnapshotDetail> {
    return http.get<ErrorSnapshotDetail>(`${this.baseUrl}/api/error-snapshots/${id}`)
  }

  // ---------- Usta öğrenme programı / makro (EXCEL 28) ----------
  // POST/PUT OPERATOR+, DELETE ADMIN+ — Bearer başlığını http katmanı ekler.

  listMacros(): Promise<MacroSummary[]> {
    return http.get<MacroSummary[]>(`${this.baseUrl}/api/macros`)
  }

  getMacro(id: number): Promise<Macro> {
    return http.get<Macro>(`${this.baseUrl}/api/macros/${id}`)
  }

  createMacro(body: MacroSaveBody): Promise<Macro> {
    return http.post<Macro>(`${this.baseUrl}/api/macros`, body)
  }

  updateMacro(id: number, body: MacroSaveBody): Promise<Macro> {
    return http.put<Macro>(`${this.baseUrl}/api/macros/${id}`, body)
  }

  deleteMacro(id: number): Promise<unknown> {
    return http.delete<unknown>(`${this.baseUrl}/api/macros/${id}`)
  }

  // ---------- Bulut bağlantısı (BULUT_API.md §4) ----------
  // Hatalar HttpError (400 { error }) — IPC handler sonuç zarfına çevirir.

  getCloudStatus(): Promise<CloudStatus> {
    return http.get<CloudStatus>(`${this.baseUrl}/api/cloud/status`)
  }

  /** Aktivasyon buluta gider (Supabase RPC) — internet yavaşsa varsayılandan uzun sürebilir */
  activateCloud(code: string): Promise<CloudStatus> {
    return http.post<CloudStatus>(`${this.baseUrl}/api/cloud/activate`, { code }, { timeoutMs: 30_000 })
  }

  syncCloudNow(): Promise<unknown> {
    return http.post<unknown>(`${this.baseUrl}/api/cloud/sync-now`, {})
  }

  downloadCloudUpdate(): Promise<unknown> {
    return http.post<unknown>(`${this.baseUrl}/api/cloud/update/download`, {})
  }

  setCloudShare(shareRecipes: boolean): Promise<unknown> {
    return http.put<unknown>(`${this.baseUrl}/api/cloud/share`, { shareRecipes })
  }

  deactivateCloud(): Promise<CloudStatus> {
    return http.post<CloudStatus>(`${this.baseUrl}/api/cloud/deactivate`, {})
  }

  // ---------- Bulut v2 (BULUT_API_V2.md §6) — kalıp kütüphanesi, yönetilen veriler, checklist ----------
  // Hepsi bulut aktive değilken de cevap verir (önbellek / yerel). Hatalar HttpError (400/404/503 { error }).

  listMolds(q: MoldListQuery = {}): Promise<MoldListResponse> {
    const p = new URLSearchParams()
    if (q.q) p.set('q', q.q)
    if (q.profileType) p.set('profileType', q.profileType)
    if (q.licensed != null) p.set('licensed', String(q.licensed))
    const qs = p.toString()
    return http.get<MoldListResponse>(`${this.baseUrl}/api/molds${qs ? `?${qs}` : ''}`)
  }

  /** Çevrimiçiyse DataApi buluttan tazeler — internet yavaşsa varsayılandan uzun sürebilir */
  getMold(code: string): Promise<MoldLookupResult> {
    return http.get<MoldLookupResult>(`${this.baseUrl}/api/molds/${encodeURIComponent(code)}`, { timeoutMs: 20_000 })
  }

  activateMoldLicense(code: string, licenseKey: string): Promise<MoldLookupResult> {
    return http.post<MoldLookupResult>(
      `${this.baseUrl}/api/molds/${encodeURIComponent(code)}/activate`,
      { licenseKey },
      { timeoutMs: 30_000 },
    )
  }

  getCloudConfig(): Promise<CloudConfig> {
    return http.get<CloudConfig>(`${this.baseUrl}/api/cloud/config`)
  }

  submitChecklistResult(body: ChecklistResultBody): Promise<unknown> {
    return http.post<unknown>(`${this.baseUrl}/api/checklist/results`, body)
  }

  // ---------- Rol sistemi (auth + users) ----------
  // Bearer başlığını http katmanı ekler (authSession başlık sağlayıcısı) — burada token yok.
  // Hatalar HttpError (status + body.error / body.lockedUntil) — IPC handler sonuç zarfına çevirir.

  getAuthSetupStatus(): Promise<{ needsSetup: boolean }> {
    return http.get<{ needsSetup: boolean }>(`${this.baseUrl}/api/auth/setup-status`)
  }

  authSetup(body: { username: string; displayName?: string; password: string }): Promise<AuthLoginResponse> {
    return http.post<AuthLoginResponse>(`${this.baseUrl}/api/auth/setup`, body)
  }

  authLogin(username: string, password: string): Promise<AuthLoginResponse> {
    return http.post<AuthLoginResponse>(`${this.baseUrl}/api/auth/login`, { username, password })
  }

  authLogout(): Promise<{ ok: boolean }> {
    return http.post<{ ok: boolean }>(`${this.baseUrl}/api/auth/logout`, {})
  }

  listUsers(): Promise<UserListItem[]> {
    return http.get<UserListItem[]>(`${this.baseUrl}/api/users`)
  }

  createUser(body: CreateUserBody): Promise<UserListItem> {
    return http.post<UserListItem>(`${this.baseUrl}/api/users`, body)
  }

  updateUser(id: number, body: UpdateUserBody): Promise<UserListItem> {
    return http.put<UserListItem>(`${this.baseUrl}/api/users/${id}`, body)
  }

  /** Silmez — pasifleştirir (backend DELETE sözleşmesi) */
  deactivateUser(id: number): Promise<unknown> {
    return http.delete<unknown>(`${this.baseUrl}/api/users/${id}`)
  }
}

/** POST /api/auth/login ve /api/auth/setup cevabı (token SADECE main'de kalır) */
export interface AuthLoginResponse {
  token: string
  expiresAt: string | null
  user: { id: number; username: string; displayName: string | null; role: string }
}

export const dataApi = new DataApiClient()
