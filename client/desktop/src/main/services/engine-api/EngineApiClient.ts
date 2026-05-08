// Engine API (port 5000) HTTP client — bending pipeline + machine commands.

import { getConfig } from '@main/config/runtime-config'
import { http } from '@main/lib/http'
import type {
  ApplyStageRequest,
  BendingCalculateRequest,
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
  StartJobResponse,
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

  // ---------- Bending pipeline ----------

  calculate(req: BendingCalculateRequest): Promise<BendingCalculateResponse> {
    return http.post<BendingCalculateResponse>(`${this.baseUrl}/api/bending/calculate`, req)
  }

  preview(req: BendingPreviewRequest): Promise<BendingPreviewResponse> {
    return http.post<BendingPreviewResponse>(`${this.baseUrl}/api/bending/geometric/preview`, req)
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

  startBendingJob(jobId: number, skipAutoCorrect = false): Promise<StartJobResponse> {
    const u = new URL(`${this.baseUrl}/api/bending-job/${jobId}/start`)
    if (skipAutoCorrect) u.searchParams.set('skipAutoCorrect', 'true')
    return http.post<StartJobResponse>(u.toString())
  }

  cancelBendingJob(jobId: number): Promise<unknown> {
    // NOT: Backend'de henüz cancel endpoint'i yok (CLAUDE.md "yapılacaklar"da listede).
    // Eklendiğinde burayı tek noktadan değiştiririz.
    return http.post(`${this.baseUrl}/api/bending-job/${jobId}/cancel`)
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

  rotationPosition(req: RotationPositionRequest): Promise<unknown> {
    return http.post(`${this.baseUrl}/api/rotation/position`, req)
  }

  rotationDistance(req: RotationDistanceRequest): Promise<unknown> {
    return http.post(`${this.baseUrl}/api/rotation/distance`, req)
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

  emergencyStop(): Promise<unknown> {
    return http.post(`${this.baseUrl}/api/machine/emergency-stop`)
  }

  setMode(mode: number): Promise<unknown> {
    return http.post(`${this.baseUrl}/api/machine/mode`, { mode })
  }
}

export const engineApi = new EngineApiClient()
