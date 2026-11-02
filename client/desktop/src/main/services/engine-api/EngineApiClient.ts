// Engine API (port 5000) HTTP client — bending pipeline + machine commands.

import { getConfig } from '@main/config/runtime-config'
import { http, HttpError } from '@main/lib/http'
import type {
  ApplyStageRequest,
  GonyeResult,
  BendingCalculateRequest,
  GonyeSettingsDto,
  MachineSettingsDto,
  BendingCalculateResponse,
  BendingPreviewRequest,
  BendingPreviewResponse,
  PistonJogRequest,
  PistonPositionRequest,
  PistonPressureRequest,
  PneumaticRequest,
  RecommendStageResponse,
  RotationDistanceRequest,
  RotationJogRequest,
  RotationPositionRequest,
  SideSupportRequest,
  StartJobResponse,
  StopUnloadResponse,
  OilHeatingResult,
  OilHeatingStartRequest,
  OilHeatingStatus,
  UnloadPartRequest,
  UnloadPartResponse,
  ResumeStatusResponse,
  ResumeActionResponse,
  ValidateArcPlanRequest,
  ValidateArcPlanResponse,
} from '@shared/types'

export class EngineApiClient {
  private get baseUrl(): string {
    return getConfig().engine.baseUrl
  }

  // Health
  async isHealthy(): Promise<boolean> {
    try {
      // Engine API'nin açık endpoint'lerinden biri — orchestrator state cache'i
      await http.get(`${this.baseUrl}/api/machine/state`, { timeoutMs: 3_000 })
      return true
    } catch {
      return false
    }
  }

  // ---------- Ayarlar (DB-backed; PUT sonrası backend orchestrator cache'ini yeniler) ----------

  getMachineSettings(): Promise<MachineSettingsDto> {
    return http.get<MachineSettingsDto>(`${this.baseUrl}/api/settings/machine`)
  }

  updateMachineSettings(body: MachineSettingsDto): Promise<MachineSettingsDto> {
    return http.put<MachineSettingsDto>(`${this.baseUrl}/api/settings/machine`, body)
  }

  getGonyeSettings(): Promise<GonyeSettingsDto> {
    return http.get<GonyeSettingsDto>(`${this.baseUrl}/api/settings/gonye`)
  }

  updateGonyeSettings(body: GonyeSettingsDto): Promise<GonyeSettingsDto> {
    return http.put<GonyeSettingsDto>(`${this.baseUrl}/api/settings/gonye`, body)
  }

  /** DataApi'ye doğrudan yazılan ayarlardan sonra orchestrator cache'ini yeniler. */
  reloadSettings(): Promise<unknown> {
    return http.post(`${this.baseUrl}/api/settings/reload`, {})
  }

  // ---------- Bending pipeline ----------

  calculate(req: BendingCalculateRequest): Promise<BendingCalculateResponse> {
    return http.post<BendingCalculateResponse>(`${this.baseUrl}/api/bending/calculate`, req)
  }

  preview(req: BendingPreviewRequest): Promise<BendingPreviewResponse> {
    return http.post<BendingPreviewResponse>(`${this.baseUrl}/api/bending/geometric/preview`, req)
  }

  // 2026-09-08: Arc segmentlerini backend planner'a gönderir — bükülebilirlik/ölçülebilirlik
  // kontrolü + parça uzatma + sıralama tersine çevirme kararı. Operatör ONAYLA'ya basınca çağrılır.
  validateArcPlan(req: ValidateArcPlanRequest): Promise<ValidateArcPlanResponse> {
    return http.post<ValidateArcPlanResponse>(`${this.baseUrl}/api/bending/arc/validate-plan`, req)
  }

  recommendStage(profileA: number): Promise<RecommendStageResponse> {
    const u = new URL(`${this.baseUrl}/api/preparation/recommend-stage`)
    u.searchParams.set('profileA', String(profileA))
    return http.get<RecommendStageResponse>(u.toString())
  }

  applyStage(req: ApplyStageRequest): Promise<unknown> {
    // Stage transition 3 piston paralel hareket — 30-60sn surebilir.
    // Default 10sn timeout yetmediginden manuel override.
    return http.post(`${this.baseUrl}/api/preparation/stage`, req, { timeoutMs: 120_000 })
  }

  // Ayarlar > Cetvel Sıfırlama — Web'deki "Gönye Al" ile aynı çağrı (boş body → backend varsayılanları).
  // Pistonlar mekanik limite çekilir, cetveller sıfırlanır, gönye ofsetlerine gidilir — uzun sürer.
  // Backend başarısızlıkta 400 + PreparationResult döner; mesajı kaybetmemek için body'yi döndürüyoruz.
  async executeGonye(): Promise<GonyeResult> {
    try {
      const res = await http.post<GonyeResult>(`${this.baseUrl}/api/preparation/gonye`, {}, { timeoutMs: 180_000 })
      return { success: res?.success ?? true, errorMessage: res?.errorMessage ?? null }
    } catch (err) {
      if (err instanceof HttpError && err.body && typeof err.body === 'object' && 'errorMessage' in err.body) {
        const body = err.body as { errorMessage?: string | null }
        return { success: false, errorMessage: body.errorMessage ?? err.message }
      }
      throw err
    }
  }

  // Tahliye (SEKIL-18) — üst top geri çekilir, ardından rotasyon (Bending API POST /api/preparation/unload).
  // upperRetractMm: üst top kaç mm geri çekilsin · rotationMm: işaretli rotasyon mesafesi (+ / − yön)
  // Backend 400/409'da da aynı gövdeyi döner; mesajı kaybetmemek için HttpError body'si normalize edilir.
  async unloadPart(req: UnloadPartRequest): Promise<UnloadPartResponse> {
    try {
      const res = await http.post<Partial<UnloadPartResponse>>(`${this.baseUrl}/api/preparation/unload`, req, {
        timeoutMs: unloadTimeoutMs(req.rotationMm, req.rotationSeconds),
      })
      return normalizeUnload(res, true)
    } catch (err) {
      if (err instanceof HttpError && err.body && typeof err.body === 'object' && 'errorMessage' in err.body) {
        const r = normalizeUnload(err.body as Partial<UnloadPartResponse>, false)
        return { ...r, success: false, errorMessage: r.errorMessage ?? err.message }
      }
      // Sözleşme dışı hata gövdesi (ör. ProblemDetails) — yine aynı şekle çevir (success=false)
      if (err instanceof HttpError) {
        return { ...normalizeUnload(null, false), errorMessage: err.message }
      }
      throw err
    }
  }

  // Tahliye DURDUR — devam eden tahliyeyi keser, üst top + rotasyonu durdurur. Tahliye yoksa da success=true.
  // Yağ ısıtma programı — 409 gövdesi de { success, errorMessage, status } (mesaj kaybolmasın)
  async oilHeatingStart(req: OilHeatingStartRequest): Promise<OilHeatingResult> {
    return this.oilHeatingCall(() => http.post<OilHeatingResult>(`${this.baseUrl}/api/oil-heating/start`, req ?? {}))
  }

  async oilHeatingStop(): Promise<OilHeatingResult> {
    return this.oilHeatingCall(() => http.post<OilHeatingResult>(`${this.baseUrl}/api/oil-heating/stop`))
  }

  /** Radyus sensörü: zero = o anki değeri sıfır yap (DB'ye de yazılır), clear = sıfırı kaldır,
   *  reset-encoder = PLC'de GT-5102 sayacını donanımsal 0'la. Backend /api/machine/radius-sensor/{side}/... */
  radiusSensorAction(side: 'left' | 'right', action: 'zero' | 'clear' | 'reset-encoder'): Promise<unknown> {
    const path = action === 'zero' ? 'zero' : action === 'clear' ? 'zero/clear' : 'reset-encoder'
    return http.post(`${this.baseUrl}/api/machine/radius-sensor/${side}/${path}`)
  }

  async oilHeatingStatus(): Promise<OilHeatingStatus> {
    return http.get<OilHeatingStatus>(`${this.baseUrl}/api/oil-heating/status`)
  }

  private async oilHeatingCall(fn: () => Promise<OilHeatingResult>): Promise<OilHeatingResult> {
    try {
      const res = await fn()
      return { success: res?.success ?? true, errorMessage: res?.errorMessage ?? null, status: res?.status ?? null }
    } catch (err) {
      if (err instanceof HttpError && err.body && typeof err.body === 'object' && 'errorMessage' in err.body) {
        const body = err.body as Partial<OilHeatingResult>
        return { success: false, errorMessage: body.errorMessage ?? err.message, status: body.status ?? null }
      }
      throw err
    }
  }

  async stopUnload(): Promise<StopUnloadResponse> {
    try {
      const res = await http.post<Partial<StopUnloadResponse>>(`${this.baseUrl}/api/preparation/unload/stop`)
      return { success: res?.success ?? true, errorMessage: res?.errorMessage ?? null }
    } catch (err) {
      if (err instanceof HttpError && err.body && typeof err.body === 'object' && 'errorMessage' in err.body) {
        const body = err.body as { errorMessage?: string | null }
        return { success: false, errorMessage: body.errorMessage ?? err.message }
      }
      throw err
    }
  }

  // ELLE KONUMLANDIRMA (sensörsüz): manualPlacement=true → backend Clamp'ta parça sensörünü beklemez,
  // Zero'da sensör arama adımını atlar (parça ucu operatör tarafından merkezden ZeroResetDistanceMm'e konur).
  // manualPlacementSide zorunlu ve job.ActiveSensorSide ile aynı olmalı — değilse backend 400 döner.
  // Varsayılan (false) → query'ye hiçbir şey eklenmez, eski sözleşme birebir.
  startBendingJob(
    jobId: number,
    skipAutoCorrect = false,
    manualPlacementSide: 'Left' | 'Right' | null = null,
  ): Promise<StartJobResponse> {
    const u = new URL(`${this.baseUrl}/api/bending-job/${jobId}/start`)
    if (skipAutoCorrect) u.searchParams.set('skipAutoCorrect', 'true')
    if (manualPlacementSide) {
      u.searchParams.set('manualPlacement', 'true')
      u.searchParams.set('manualPlacementSide', manualPlacementSide)
    }
    return http.post<StartJobResponse>(u.toString())
  }

  cancelBendingJob(jobId: number): Promise<unknown> {
    // Backend: POST /api/bending-job/{id}/cancel (= /stop) → makine durur, job Cancelled (EXCEL 24).
    // Job Running değilse 400 → HttpError.
    return http.post(`${this.baseUrl}/api/bending-job/${jobId}/cancel`)
  }

  // 2026-11-01 — acil stop kesintisi (Şekil 15-17)
  getResumeStatus(jobId: number): Promise<ResumeStatusResponse> {
    return http.get<ResumeStatusResponse>(`${this.baseUrl}/api/bending-job/${jobId}/resume-status`)
  }

  /** DEVAM ET — backend 400/409'da da { success:false, error } döner; hata metni kaybolmasın */
  resumeBendingJob(jobId: number): Promise<ResumeActionResponse> {
    return postAction(`${this.baseUrl}/api/bending-job/${jobId}/resume`)
  }

  /** MANUEL TAHLİYE seçildi — iş Cancelled, devam kaydı silinir */
  abandonBendingJob(jobId: number): Promise<ResumeActionResponse> {
    return postAction(`${this.baseUrl}/api/bending-job/${jobId}/abandon`)
  }

  // Serpantin — operatör yan dayama ayarını bitirince "DEVAM ET" onayı.
  confirmSideSupport(jobId: number): Promise<unknown> {
    return http.post(`${this.baseUrl}/api/bending-job/${jobId}/confirm-side-support`)
  }

  // Arc interactive — pipeline awaitingArcSegmentInput=true iken çağrılır:
  //   1) Bending API yeni segment'i DB'ye yazar (DataApi /segments üzerinden)
  //   2) ArcSegmentInputCoordinator sinyallenir → pipeline devam eder
  // ÖNEMLİ: backend DiameterMm (Ø) bekler — modal R (yarıçap) topluyorsa caller R*2 göndermeli.
  provideNextArcSegment(
    jobId: number,
    payload: { diameterMm: number; angleDeg: number; straightAfterMm: number },
  ): Promise<unknown> {
    return http.post(`${this.baseUrl}/api/bending-job/${jobId}/next-segment`, payload)
  }

  // Arc ölçüm hatası retry modal akışı (2026-08-18).
  //   action: "retract" | "remeasure" | "finish_all" | "skip_segment"
  //   Modal 1: retract → remeasure (retract sonrası Tekrar Ölç aktif olur)
  //   Modal 2: finish_all → job Completed, skip_segment → sonraki segmente geç
  measurementRetryAction(jobId: number, action: string): Promise<unknown> {
    return http.post(
      `${this.baseUrl}/api/bending-job/${jobId}/measurement-retry-action`,
      { action },
    )
  }

  cancelMeasurementRetry(jobId: number): Promise<unknown> {
    return http.post(`${this.baseUrl}/api/bending-job/${jobId}/cancel-measurement-retry`)
  }

  // ---------- Machine state (SignalR fallback / initial dump) ----------

  getCurrentState(): Promise<unknown> {
    return http.get(`${this.baseUrl}/api/machine/state`)
  }

  // ---------- Manuel control ----------

  pistonJog(req: PistonJogRequest): Promise<unknown> {
    return http.post(`${this.baseUrl}/api/piston/${req.piston}/jog`, {
      direction: req.direction,
      speedPercent: req.speedPercent,
    })
  }

  pistonPosition(req: PistonPositionRequest): Promise<unknown> {
    return http.post(`${this.baseUrl}/api/piston/${req.piston}/position`, {
      positionMm: req.positionMm,
      speedPercent: req.speedPercent,
    })
  }

  pistonPressure(req: PistonPressureRequest): Promise<unknown> {
    return http.post(`${this.baseUrl}/api/piston/${req.piston}/pressure`, {
      pressureBar: req.pressureBar,
      speedPercent: req.speedPercent,
    })
  }

  pistonStop(piston: string): Promise<unknown> {
    return http.post(`${this.baseUrl}/api/piston/${piston}/stop`)
  }

  rotationJog(req: RotationJogRequest): Promise<unknown> {
    return http.post(`${this.baseUrl}/api/rotation/jog`, req)
  }

  // Backend RotationPositionRequest { positionMm: int, speedPercent } — UI alanı 'position' olduğu için
  // eşlenir (eşlenmezse backend PositionMm=0 alır → rotasyon 0'a gider). Backend tamsayı mm kabul eder.
  rotationPosition(req: RotationPositionRequest): Promise<unknown> {
    return http.post(`${this.baseUrl}/api/rotation/position`, {
      positionMm: Math.round(req.position),
      speedPercent: req.speedPercent,
    })
  }

  // Backend RotationDistanceRequest { direction: -1|1, distanceMm: int > 0, speedPercent } —
  // UI işaretli 'distance' gönderir: + = encoder ARTAR. PLC'de CW (1) encoder'ı azaltır, CCW (-1) artırır
  // (FB_RotationControl mode 4; UnloadPartHandler ile aynı eşleme: + → -1).
  rotationDistance(req: RotationDistanceRequest): Promise<unknown> {
    return http.post(`${this.baseUrl}/api/rotation/distance`, {
      direction: req.distance > 0 ? -1 : 1,
      distanceMm: Math.round(Math.abs(req.distance)),
      speedPercent: req.speedPercent,
    })
  }

  rotationStop(): Promise<unknown> {
    return http.post(`${this.baseUrl}/api/rotation/stop`)
  }

  pneumaticControl(req: PneumaticRequest): Promise<unknown> {
    return http.post(`${this.baseUrl}/api/pneumatic/${req.side}/control`, {
      direction: req.direction,
    })
  }

  pneumaticStop(side: string): Promise<unknown> {
    return http.post(`${this.baseUrl}/api/pneumatic/${side}/stop`)
  }

  // Yan dayama — basılı-tut pattern.
  // direction=1 → forward, -1 → backward, 0 → stop (buton bırakıldı).
  sideSupportControl(req: SideSupportRequest): Promise<unknown> {
    const path = req.direction === 1 ? 'forward' : req.direction === -1 ? 'backward' : 'stop'
    return http.post(`${this.baseUrl}/api/side-support/${req.side}/${req.type}/${path}`)
  }

  // jobId (EXCEL 24): büküm İPTAL'inden geliyorsa backend iptali durdurmadan ÖNCE işaretler →
  // pipeline'ın acil stop'la ürettiği sonuç Cancelled yazılır (cancel çağrısıyla yarış kalmaz).
  // cancel=true: tek çağıran büküm İPTAL tuşu — backend durdurduktan sonra alarmı kapatır (arıza değil).
  emergencyStop(jobId?: number | null): Promise<unknown> {
    const qs = jobId != null ? `?jobId=${jobId}&cancel=true` : '?cancel=true'
    return http.post(`${this.baseUrl}/api/machine/emergency-stop${qs}`)
  }

  setMode(mode: number): Promise<unknown> {
    return http.post(`${this.baseUrl}/api/machine/mode`, { mode })
  }

  // Hidrolik motor aç/kapat — backend POST /api/machine/motor { value }
  setHydraulicMotor(on: boolean): Promise<unknown> {
    return http.post(`${this.baseUrl}/api/machine/motor`, { value: on })
  }
}

// Tahliye HTTP timeout'u — backend'in en kötü toplamının (UnloadPartHandler: DataApi kontrolü 30sn +
// üst top 30sn + rotasyon 30sn + mesafe / 5 mm/sn) belirgin üstünde. Backend sabitleri değişirse burası da.
function unloadTimeoutMs(rotationMm: number, rotationSeconds?: number): number {
  const rot = Math.abs(Number(rotationMm)) || 0
  const sec = Math.abs(Number(rotationSeconds)) || 0
  if (sec > 0) return 150_000 + Math.ceil(sec) * 1000 // süreli rotasyon: mesafe yok sayılır
  return 150_000 + Math.ceil(rot / 5) * 1000
}

async function postAction(url: string): Promise<ResumeActionResponse> {
  try {
    return await http.post<ResumeActionResponse>(url)
  } catch (err) {
    if (err instanceof HttpError && err.body && typeof err.body === 'object') {
      const b = err.body as Record<string, unknown>
      return { success: false, error: String(b.error ?? b.Error ?? err.message) }
    }
    throw err
  }
}

function normalizeUnload(res: Partial<UnloadPartResponse> | null | undefined, okDefault: boolean): UnloadPartResponse {
  return {
    success: res?.success ?? okDefault,
    errorMessage: res?.errorMessage ?? null,
    appliedUpperRetractMm: Number(res?.appliedUpperRetractMm) || 0,
    appliedRotationMm: Number(res?.appliedRotationMm) || 0,
    cancelled: !!res?.cancelled,
  }
}

export const engineApi = new EngineApiClient()
