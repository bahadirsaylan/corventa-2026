// 6-step bending flow — UI'dan PartLoadingPage "Kıvrımı Başlat" tetiklediğinde çalışır.
// Adımlar bağımsız, her biri kendi hatasını fırlatır; UI tek try/catch ile yakalar.

import { useBendingJobStore } from '@/store/bendingJobStore'
import {
  JobMappingError,
  mapToCreateRequest,
  type MapOptions,
} from '@/services/mappers/jobPayloadMapper'
import type { BendingJob } from '@shared/types'

export class BendingOrchestratorError extends Error {
  constructor(
    public readonly step: string,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'BendingOrchestratorError'
  }
}

export interface OrchestrationResult {
  job: BendingJob
  totalPasos: number
  pistonPosition: number
  recommendedStage: number
  startResponse: { success: boolean; message?: string; error?: string }
}

export type OrchestrationStep =
  | 'mapping'
  | 'calculate'
  | 'preview'
  | 'recommend-stage'
  | 'create-job'
  | 'apply-stage'
  | 'start'

export interface OrchestrationOptions extends MapOptions {
  /** Backend recommend-stage çağrısı yerine UI'da seçilen stage. Atlanırsa otomatik öneri kullanılır. */
  forceStage?: number
  /** Build payload sırasında ek operatör kararları — opsiyonel partLengthMm vb. */
  partLengthMm?: number
  /** Sayfada hangi taraftan parça beslenecek */
  activeSensorSide?: 'Left' | 'Right'
  /** UI'a hangi adımda olduğunu bildirmek için — adım çağrısından ÖNCE tetiklenir. */
  onStep?: (step: OrchestrationStep) => void
  /** True ise pipeline'in 4. adimi (geri esneme auto-correct) atlanir; pipeline 3 adimda biter. */
  skipAutoCorrect?: boolean
}

/**
 * Tüm pipeline'ı çalıştırır. Her aşamada hata BendingOrchestratorError olarak fırlatılır
 * (step alanı UI'a hangi adımda kaldığını söyler).
 *
 * NOT: Sensör bekleme (Adım 6a) bu fonksiyonun **dışında** UI tarafından yapılır
 * (PartLoadingPage'de operatör manuel onaylar veya usePartSensor hook'u izler).
 * Bu yüzden orchestrator burada start endpoint'ini çağırır — caller önce
 * sensör onayını almış olmalı.
 */
export async function executeBendingFlow(
  opts: OrchestrationOptions = {},
): Promise<OrchestrationResult> {
  const params = useBendingJobStore.getState().params
  const notify = (step: OrchestrationStep) => opts.onStep?.(step)

  // ---------- Mapping ----------
  notify('mapping')
  let createReq
  try {
    createReq = mapToCreateRequest(params, opts)
    if (opts.partLengthMm) createReq.partLengthMm = opts.partLengthMm
  } catch (err) {
    if (err instanceof JobMappingError) {
      throw new BendingOrchestratorError('mapping', err.message, err)
    }
    throw err
  }

  // ---------- Step 1: Calculate ----------
  notify('calculate')
  let pistonPosition: number
  try {
    const calc = await window.corventa.bending.calculate({
      ballDiameter: createReq.ballDiameterMm ?? 220,
      thickness: createReq.profileA,  // ⚠ BendingCalculator "Thickness" = profilin radyal kesit boyutu (kenar A), duvar kalınlığı (S) DEĞİL. R2 = Rarc - Thickness - Rk formülünde kullanılır.
      centerDistance: createReq.centerDistanceMm ?? 300.82,
      targetBendingDiameter: createReq.targetDiameterMm,
      xA1: createReq.xA1 ?? -493,
      yA1: createReq.yA1 ?? 0,
      theta: createReq.thetaDeg ?? 63,
    })
    if (!calc.success) {
      throw new BendingOrchestratorError(
        'calculate',
        calc.error ?? 'Hesaplama başarısız',
      )
    }
    pistonPosition = calc.pistonPosition
    createReq.calculatedPistonPositionMm = pistonPosition
  } catch (err) {
    if (err instanceof BendingOrchestratorError) throw err
    throw new BendingOrchestratorError('calculate', toMessage(err), err)
  }

  // ---------- Step 2: Preview ----------
  notify('preview')
  let totalPasos: number
  try {
    const preview = await window.corventa.bending.preview({
      targetPositionMm: pistonPosition,
      partLengthMm: createReq.partLengthMm,
      safetyMarginMm: createReq.safetyMarginMm ?? 50,
      stepDistanceMm: createReq.stepDistanceMm,
      activeSensorSide: createReq.activeSensorSide,
    })
    if (!preview.success) {
      throw new BendingOrchestratorError(
        'preview',
        preview.error ?? 'Paso önizlemesi başarısız',
      )
    }
    totalPasos = preview.totalPasos
    createReq.totalPasos = totalPasos
  } catch (err) {
    if (err instanceof BendingOrchestratorError) throw err
    throw new BendingOrchestratorError('preview', toMessage(err), err)
  }

  // ---------- Step 3: Recommend stage (opsiyonel) ----------
  let recommendedStage = opts.forceStage ?? 0
  if (!opts.forceStage) {
    notify('recommend-stage')
    try {
      const rec = await window.corventa.bending.recommendStage(createReq.profileA)
      recommendedStage = rec.stageNumber
    } catch (err) {
      throw new BendingOrchestratorError('recommend-stage', toMessage(err), err)
    }
  }

  // ---------- Step 4: Create job (DataApi DİREKT) ----------
  notify('create-job')
  let job: BendingJob
  try {
    job = await window.corventa.bending.createJob(createReq)
  } catch (err) {
    throw new BendingOrchestratorError('create-job', toMessage(err), err)
  }

  // ---------- Step 5: Apply stage ----------
  notify('apply-stage')
  try {
    await window.corventa.bending.applyStage({
      targetStage: recommendedStage,
      speedPercent: 50,
    })
  } catch (err) {
    throw new BendingOrchestratorError('apply-stage', toMessage(err), err)
  }

  // ---------- Step 6: Start ----------
  // NOT: Caller bu noktada part-sensor aktif olduğundan emin olmalı.
  // Pipeline içindeki Clamp adımı zaten WaitForPartSensor=true ile race korumasını yapıyor.
  notify('start')
  let startResponse
  try {
    const r = await window.corventa.bending.startJob(job.id, opts.skipAutoCorrect)
    startResponse = { success: r.success, message: r.message, error: r.error }
    if (!r.success) {
      throw new BendingOrchestratorError(
        'start',
        r.error ?? 'Job başlatılamadı',
      )
    }
  } catch (err) {
    if (err instanceof BendingOrchestratorError) throw err
    throw new BendingOrchestratorError('start', toMessage(err), err)
  }

  return {
    job,
    totalPasos,
    pistonPosition,
    recommendedStage,
    startResponse,
  }
}

function toMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}
