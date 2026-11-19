// 6-step bending flow — UI'dan PartLoadingPage "Kıvrımı Başlat" tetiklediğinde çalışır.
// Adımlar bağımsız, her biri kendi hatasını fırlatır; UI tek try/catch ile yakalar.

import { manualTargetKey, useBendingJobStore } from '@/store/bendingJobStore'
import { awaitStageReturn } from './stageReturn'
import { useMachineStateStore } from '@/stores/machineStateStore'
import { refreshMaintenance, useMaintenanceStore } from '@/stores/maintenanceStore'
import { maintenanceLockActive } from '@/services/maintenanceStatus'
import {
  JobMappingError,
  mapToCreateRequest,
  type MapOptions,
} from '@/services/mappers/jobPayloadMapper'
import { loadLowerBallDiameterMm } from '@/services/machineGeometry'
import { readApplyProductionTolerance, readProductionToleranceMm } from '@/services/operatorPrefs'
import type { BendingJob } from '@shared/types'
import { t } from '@/i18n'

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
  /**
   * ELLE KONUMLANDIRMA (sensörsüz): true ise start çağrısı manualPlacement=true + manualPlacementSide
   * ile gider — backend Clamp'ta parça sensörünü beklemez, Zero'da sensör aramasını atlar.
   * Taraf = activeSensorSide (job'a yazılan tarafla aynı olmalı; backend farklıysa 400 verir).
   */
  manualPlacement?: boolean
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
/**
 * 2026-11-20 — Makine bu stage'de VE sol / sağ / alt top stage konumunda mı (±0,5 mm)? Operatör stage'den sonra topları
 * elle oynattıysa false → akış stage komutunu yeniden verir (eski davranış). Stage tanımı okunamazsa false (güvenli taraf).
 */
export async function isAtStage(stage: number): Promise<boolean> {
  const s = useMachineStateStore.getState().state
  if ((s.physicalInfo?.currentStage ?? 0) !== stage || s.physicalInfo?.isGonyeCompleted !== true) return false
  try {
    const stages = (await window.corventa.settings.getStages()) as Array<{
      stageNumber: number; leftOffsetMm?: number; rightOffsetMm?: number; lowerOffsetMm?: number
    }>
    const st = stages.find((x) => x.stageNumber === stage)
    if (!st) return false
    const near = (pos: number | undefined, target: number | undefined) =>
      Number.isFinite(pos) && Number.isFinite(target) && Math.abs((pos as number) - (target as number)) <= 0.5
    return near(s.leftPiston?.positionMm, st.leftOffsetMm) && near(s.rightPiston?.positionMm, st.rightOffsetMm)
      && near(s.lowerPiston?.positionMm, st.lowerOffsetMm)
  } catch {
    return false
  }
}

/**
 * 2026-11-20 — Büküm akışının kullanacağı stage (akışla AYNI kural): elle hedefte (Standart, çember) kayıttaki stage,
 * yoksa profil A'ya göre önerilen stage. Parça yükleme sayfası parçayı koymadan ÖNCE bu stage'e geçmek için kullanır.
 */
export async function resolveTargetStage(opts: OrchestrationOptions = {}): Promise<number> {
  const params = useBendingJobStore.getState().params
  const manualTarget =
    params.bendingMethod === 'ring' &&
    params.manualTarget &&
    Number.isFinite(params.manualTarget.pushDepthMm) &&
    params.manualTarget.pushDepthMm > 0 &&
    (params.manualTarget.paramsKey == null || params.manualTarget.paramsKey === manualTargetKey(params))
      ? params.manualTarget
      : null
  const forceStage =
    opts.forceStage ?? (manualTarget?.stageNumber != null && manualTarget.stageNumber > 0 ? manualTarget.stageNumber : undefined)
  if (forceStage) return forceStage
  const createReq = mapToCreateRequest(params, opts)
  const rec = await window.corventa.bending.recommendStage(createReq.profileA)
  return rec.stageNumber
}

export async function executeBendingFlow(
  opts: OrchestrationOptions = {},
): Promise<OrchestrationResult> {
  const params = useBendingJobStore.getState().params
  const notify = (step: OrchestrationStep) => opts.onStep?.(step)
  // STANDART SÜRÜM (2026-11-17) — elle hedef konum (BÜKÜM SONUCU → YENİ PARÇAYLA BÜK / KAYITLI BÜKÜM ÇALIŞTIR).
  // Doluyken hedef hesaplanmaz; iş bu itme derinliği + manualTargetLocked=true ile kaydedilir. Yoksa akış birebir eski.
  // Sadece ÇEMBER: ÇOK AÇILI / SERPANTİN / SIVAMA'da düzeltme parametrelere yazılır, hedef her zaman hesaplanır.
  const manualTarget =
    params.bendingMethod === 'ring' &&
    params.manualTarget &&
    Number.isFinite(params.manualTarget.pushDepthMm) &&
    params.manualTarget.pushDepthMm > 0 &&
    // Parametre değiştiyse (profil / A / çap) elle hedef geçersiz → hesap yapılır
    (params.manualTarget.paramsKey == null || params.manualTarget.paramsKey === manualTargetKey(params))
      ? params.manualTarget
      : null

  // ---------- Mapping ----------
  notify('mapping')
  let createReq
  try {
    createReq = mapToCreateRequest(params, opts)
    if (opts.partLengthMm) createReq.partLengthMm = opts.partLengthMm
    // 2026-11-16: TOLERANSI BÜKÜME UYGULA (Operatör Ayarları, varsayılan KAPALI) açıksa ana ekranda seçilen
    // üretim toleransı (± mm) işin toleransı olur. DataApi pozitif toleranceMm'i ezmez (sadece ≤ 0 iken
    // ÇAP TOLERANSI'nı yazar). Kapalıyken alan gönderilmez → eski davranış.
    if (readApplyProductionTolerance()) {
      const tol = readProductionToleranceMm()
      if (tol > 0) createReq.toleranceMm = tol
    }
  } catch (err) {
    if (err instanceof JobMappingError) {
      throw new BendingOrchestratorError('mapping', err.message, err)
    }
    throw err
  }

  // Alt top çapı makine ayarından (2026-11-16) — piston hedefi (Step 1/2) ve iş kaydı (Step 4)
  // AYNI değeri kullanır; ayar okunamazsa tahmini 220 ile hesap yapılmaz, akış durur.
  let ballDiameterMm: number
  try {
    ballDiameterMm = await loadLowerBallDiameterMm()
    createReq.ballDiameterMm = ballDiameterMm
  } catch (err) {
    throw new BendingOrchestratorError('mapping', toMessage(err), err)
  }

  // ---------- Step 1: Calculate ----------
  notify('calculate')
  let pistonPosition: number
  if (manualTarget) {
    // Elle hedef: hesap yok — kayıtlı / düzeltilmiş itme derinliği aynen (preview toplam pasoyu bununla hesaplar)
    pistonPosition = manualTarget.pushDepthMm
    createReq.calculatedPistonPositionMm = pistonPosition
    createReq.manualTargetLocked = true
  } else try {
    const calc = await window.corventa.bending.calculate({
      ballDiameter: ballDiameterMm,
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
        calc.error ?? t('Hesaplama başarısız'),
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
      // Step 1 calculate ile birebir aynı geometri → preview pasoSteps[].expectedRadiusMm dolar (sadece
      // önizleme bilgisi; monitör etiketi bunu KULLANMAZ — çalışan paso R'si progress'ten gelir, EXCEL 32)
      ballDiameterMm,
      thicknessMm: createReq.profileA,
      centerDistanceMm: createReq.centerDistanceMm ?? 300.82,
      xA1: createReq.xA1 ?? -493,
      yA1: createReq.yA1 ?? 0,
      thetaDeg: createReq.thetaDeg ?? 63,
    })
    if (!preview.success) {
      throw new BendingOrchestratorError(
        'preview',
        preview.error ?? t('Paso önizlemesi başarısız'),
      )
    }
    totalPasos = preview.totalPasos
    createReq.totalPasos = totalPasos
  } catch (err) {
    if (err instanceof BendingOrchestratorError) throw err
    throw new BendingOrchestratorError('preview', toMessage(err), err)
  }

  // ---------- Step 3: Recommend stage (opsiyonel) ----------
  // Elle hedefte kayıttaki stage (opsiyonel) — hedef konum o stage'e göre ölçülmüştü
  const forceStage =
    opts.forceStage ?? (manualTarget?.stageNumber != null && manualTarget.stageNumber > 0 ? manualTarget.stageNumber : undefined)
  let recommendedStage = forceStage ?? 0
  if (!forceStage) {
    notify('recommend-stage')
    try {
      const rec = await window.corventa.bending.recommendStage(createReq.profileA)
      recommendedStage = rec.stageNumber
    } catch (err) {
      throw new BendingOrchestratorError('recommend-stage', toMessage(err), err)
    }
  }

  // ---------- BAKIM KİLİDİ taze kontrol (EXCEL 34) ----------
  // Bakım store'u 30 sn'de bir yenilenir; bayat önbellekle job kaydı + stage geçişi (piston hareketi)
  // yapılıp ancak StartJob'da 409 alınmasın diye, job oluşturmadan ÖNCE durum tazelenir.
  // Okuma hatasında refreshMaintenance son state'i korur (kilit yoksa akış aynen sürer — asıl engel backend'de).
  // Ayar kapalıyken lockActive=false → akış eskisiyle aynı (sadece bir GET eklenir).
  await refreshMaintenance()
  const maintState = useMaintenanceStore.getState().state
  if (maintenanceLockActive(maintState)) {
    throw new BendingOrchestratorError(
      'create-job',
      maintState?.lockMessage ?? 'BAKIM KİLİDİ — BÜKÜM BAŞLATILAMAZ',
    )
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
  // 2026-11-20: parça alındıktan sonra başlatılan stage dönüşü sürüyorsa önce o biter (iki stage komutu çakışmasın)
  await awaitStageReturn()
  // 2026-11-20 (kullanıcı): stage artık parça yükleme sayfası AÇILINCA (parça konmadan önce) yapılıyor — parça
  // topların üzerindeyken stage geçişi parçayı düşürebiliyordu. Makine zaten o stage'deyse burada TEKRAR hareket
  // ettirilmez; değilse (geri sayımdan vazgeçildi / önceden yapılamadı) eskisi gibi burada yapılır.
  if (!(await isAtStage(recommendedStage))) {
    try {
      await window.corventa.bending.applyStage({
        targetStage: recommendedStage,
        speedPercent: 50,
      })
    } catch (err) {
      throw new BendingOrchestratorError('apply-stage', toMessage(err), err)
    }
  }

  // ---------- Step 6: Start ----------
  // NOT: Caller bu noktada part-sensor aktif olduğundan emin olmalı.
  // Pipeline içindeki Clamp adımı zaten WaitForPartSensor=true ile race korumasını yapıyor.
  notify('start')
  let startResponse
  try {
    const r = opts.manualPlacement
      ? await window.corventa.bending.startJob(
          job.id,
          opts.skipAutoCorrect,
          createReq.activeSensorSide === 'Right' ? 'Right' : 'Left',
        )
      : await window.corventa.bending.startJob(job.id, opts.skipAutoCorrect)
    startResponse = { success: r.success, message: r.message, error: r.error }
    if (!r.success) {
      throw new BendingOrchestratorError(
        'start',
        r.error ?? t('Job başlatılamadı'),
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
