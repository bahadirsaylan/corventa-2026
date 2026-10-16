// DEMO MODU — ekran kaydı / sunum için sahte makine (CORVENTA_DEMO=1).
//
// Backend (DataApi + Bending API) HİÇ başlatılmaz, makineye bağlanılmaz. Main process'teki
// http katmanı bu modüle yönlendirilir: UI'ın yaptığı tüm REST çağrılarını burası cevaplar,
// SignalR yerine 100ms'de bir sahte MachineState + BendingProgress yayınlar.
//
// Senaryo gerçek pipeline mesajlarıyla birebir aynı metinleri üretir (paso göstergesi, Arc şeridi,
// R etiketi gerçekteki gibi çalışır):
//   Stage → (Parça yerleştir: F8 veya ekrandaki TOUCH onayı) → Sıkıştır → Sıfırla → Pasolar → Bitti
//
// Kısayollar (sadece demo): F8 parça sensörü aç/kapa · F9 demo hızını değiştir (1x / 2x / 4x)
// Hız: CORVENTA_DEMO_SPEED=2 gibi başlangıç çarpanı verilebilir.
//
// Gerçek kodla bağlantısı: sadece http.ts'deki interceptor + ConnectionManager/index.ts'deki
// IS_DEMO dalları. Demo kapalıyken hiçbir şey değişmez.

import { EventEmitter } from 'node:events'

import { app, type BrowserWindow } from 'electron'

import { HttpError } from '@main/lib/http'
import { childLogger } from '@main/lib/logger'
import {
  emptyMachineState,
  type BendingProgress,
  type MachineEvent,
  type MachineState,
} from '@shared/types'

const log = childLogger('demo')

export const IS_DEMO = process.env.CORVENTA_DEMO === '1'

// ─────────────────────────────────────────────────────────────
// Makine sabitleri (dev DB değerleri)
// ─────────────────────────────────────────────────────────────

const STAGES = [
  { stageNumber: 1, stageId: 1, name: 'Stage 1', maxProfileAMm: 50, left: 0, right: 0, lower: 0, xa1: -493 },
  { stageNumber: 2, stageId: 2, name: 'Stage 2', maxProfileAMm: 120, left: 67.34, right: 67.34, lower: 60, xa1: -465 },
  { stageNumber: 3, stageId: 3, name: 'Stage 3', maxProfileAMm: 250, left: 134.68, right: 134.68, lower: 120, xa1: -422 },
]
const BALL = 220
const THETA = 63
const CENTER_NORMAL = 300.82
const CENTER_MIDDLE = 300
const CLAMP_UPPER_MM = 96 // üst top sıkıştırma konumu (görsel)

// Ekranda pistonun gideceği en büyük konum (son paso). Gerçek hesap (R etiketi) aynen kullanılır,
// sadece gösterilen piston konumları bu hedefe ötelenir. CORVENTA_DEMO_MAX_PISTON ile değişir.
const MAX_PISTON_MM = Number(process.env.CORVENTA_DEMO_MAX_PISTON) || 165

const PISTON_SPEED = 28 // mm/s (hız %100 iken, demo çarpanı ile)
const ROTATION_SPEED = 320 // mm/s (hız %100)
const ROTATION_ACCEL = 55 // mm/s² — yumuşak kalkış / duruş (gerçek motor gibi)
// Pasif top güvenli geri limiti (encoder): −gönyeOffset(3.75) + safetyMargin(1.0) — PistonPhysicalTracker
const SAFE_BACKWARD_MM = -2.75
// Gerçek DB (MachineSettings) değerleri
const SLACK_UPPER_MM = 0.1 // CircularSlackDistanceMm — her paso / ölçüm öncesi üst top boşluk alma
const ZERO_RESET_MM = 810 // ZeroResetDistanceMm
const CLAMP_PRESSURE_BAR = 150 // DefaultClampPressureBar (clamp hedefi strok dışı → basınç modu)
const ADAPTIVE_JOG_PCT = 20 // BendingHandlers.AdaptiveJogSpeedPercent
const ADAPTIVE_WINDOW_MM = 10 // RollingWindowSampleCount × PistonSampleIntervalMm
const CORRECTION_COEF = 0.25 // SpringbackCalculator.CorrectionCoefficient
const ROTATION_ONLY_MAX_OVERRUN = 50 // SpringbackAutoCorrectHandler.RotationOnlyMaxOverrunMm
// Demo senaryosu (kullanıcı isteği): çemberde adaptif temas piston 120mm'de tespit edilir,
// büküm 2 pasoda biter (paso 1 = temas konumu, paso 2 = son hedef).
const DEMO_CONTACT_MM = Number(process.env.CORVENTA_DEMO_CONTACT) || 120
const TICK_MS = 100

type PistonKey = 'leftPiston' | 'rightPiston' | 'upperPiston' | 'lowerPiston'
const PISTON_BY_NAME: Record<string, PistonKey> = {
  left: 'leftPiston',
  right: 'rightPiston',
  upper: 'upperPiston',
  lower: 'lowerPiston',
}

// ─────────────────────────────────────────────────────────────
// BendingCalculator (backend ile aynı formül) + ters hesap
// ─────────────────────────────────────────────────────────────

interface CalcIn {
  ball: number
  thickness: number
  center: number
  diameter: number
  xa1: number
  ya1: number
  theta: number
}

function calcPush(i: CalcIn): number | null {
  if (i.ball <= 0 || i.thickness <= 0 || i.center <= 0 || i.diameter <= 0) return null
  const Rk = i.ball / 2
  const Rarc = i.diameter / 2
  const K = Rarc + Rk
  const R2 = Rarc - i.thickness - Rk
  if (R2 <= 0) return null
  const t = (i.theta * Math.PI) / 180
  const yarc = (K * K - R2 * R2 + i.center * i.center) / (2 * i.center)
  const xs = K * K - yarc * yarc
  if (xs < 0) return null
  const xarc = Math.sqrt(xs)
  const xd = i.xa1 - xarc
  const yd = i.ya1 - yarc
  const B = 2 * (xd * Math.cos(t) + yd * Math.sin(t))
  const C = xd * xd + yd * yd - K * K
  const disc = B * B - 4 * C
  if (disc < 0) return null
  let d = (-B - Math.sqrt(disc)) / 2
  if (d < 0) {
    const alt = (-B + Math.sqrt(disc)) / 2
    if (alt < 0) return null
    d = alt
  }
  return Math.round(d * 100) / 100
}

/** push → yarıçap (backend LiveBendRadiusEstimator ile aynı mantık) */
function radiusFromPush(push: number, base: Omit<CalcIn, 'diameter'>): number | null {
  if (!(push > 0.05)) return null
  let lo = 2 * base.thickness + base.ball + 1
  let hi = 200_000
  const pHi = calcPush({ ...base, diameter: hi })
  if (pHi == null || push <= pHi) return null
  for (let k = 0; k < 80 && hi - lo > 0.2; k++) {
    const mid = (lo + hi) / 2
    const p = calcPush({ ...base, diameter: mid })
    if (p == null || p > push) lo = mid
    else hi = mid
  }
  return (lo + hi) / 4
}

function recommendStage(profileA: number) {
  return STAGES.find((s) => profileA <= s.maxProfileAMm) ?? STAGES[STAGES.length - 1]
}

// ─────────────────────────────────────────────────────────────
// Sahte makine
// ─────────────────────────────────────────────────────────────

class Cancelled extends Error {}

interface DemoJob {
  [k: string]: unknown
  id: number
  status: number
  method: number
  profileA: number
  targetDiameterMm: number
  partLengthMm: number
  stepDistanceMm: number
  safetyMarginMm: number
  totalPasos: number
  segments?: { segmentOrder: number; radiusMm: number; angleDeg: number; straightAfterMm: number }[]
  arcStepDistanceMm?: number | null
}

export class DemoMachine extends EventEmitter {
  private state: MachineState = emptyMachineState()
  private targets: Record<PistonKey, number> = { leftPiston: 0, rightPiston: 0, upperPiston: 0, lowerPiston: 0 }
  private pistonSpeedPct: Record<PistonKey, number> = { leftPiston: 100, rightPiston: 100, upperPiston: 100, lowerPiston: 100 }
  private rotationTarget = 0
  private rotationSpeedPct = 100
  private rotationVel = 0 // mm/s, işaretli
  private pressureHold: number | null = null // sıkıştırma basıncı (bar) — üst top basınçla tutuyorken
  private timer: NodeJS.Timeout | null = null
  private sensorTimer: NodeJS.Timeout | null = null

  speed = Math.max(0.25, Number(process.env.CORVENTA_DEMO_SPEED) || 1)
  partSensor = false

  private jobs = new Map<number, DemoJob>()
  private nextJobId = 1001
  private activeJobId: number | null = null
  private runToken = 0
  private progress: BendingProgress | null = null
  private prefs = new Map<string, unknown>()

  // ── yaşam döngüsü ──

  start(): void {
    const s = this.state
    s.hydraulicMotorState = 2
    s.systemReady = true
    s.fanActive = true
    s.sensors = {
      s1PressureBar: 6,
      s2PressureBar: 6,
      s1FlowCms: 12,
      s2FlowCms: 11,
      oilTempC: 41,
      oilHumidityPercent: 18,
      oilLevelPercent: 82,
    }
    s.safety = {
      ...s.safety,
      emergencyStopOK: true,
      motorThermalOK: true,
      fanThermalOK: true,
      phaseSequenceOK: true,
    }
    const anyS = s as unknown as { physicalInfo?: Record<string, unknown> }
    anyS.physicalInfo = { isGonyeCompleted: true, currentStage: 1, currentStageName: 'Stage 1' }
    // Başlangıçta toplar geride — stage komutunda stage konumuna geldikleri görünsün
    const home: Record<PistonKey, number> = { leftPiston: -40, rightPiston: -40, upperPiston: -25, lowerPiston: -30 }
    for (const k of Object.keys(this.targets) as PistonKey[]) {
      s[k].positionMm = home[k]
      this.targets[k] = home[k]
      s[k].inPosition = true
      s[k].safeBackwardMm = -30
      s[k].safeForwardMm = 400
    }
    s.rotation.inPosition = true

    // Parça varlık sensörü: parça yükleme ekranı açılınca 2.5sn sonra parça "algılanır"
    // (operatör parçayı koymuş gibi). Ekrandan çıkıp büküm başlamazsa sensör kapanır.
    app.on('browser-window-created', (_e, win: BrowserWindow) => {
      win.webContents.on('did-navigate-in-page', (_ev, url) => this.onNavigate(url))
    })

    this.timer = setInterval(() => this.tick(), TICK_MS)
    this.sensorTimer = setInterval(() => this.emitPartSensor(), 1000)
    log.info('DEMO makine başladı', { speed: this.speed })
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    if (this.sensorTimer) clearInterval(this.sensorTimer)
    this.timer = this.sensorTimer = null
  }

  getState(): MachineState {
    return this.state
  }

  private sensorTimeout: NodeJS.Timeout | null = null
  private onNavigate(url: string): void {
    if (this.sensorTimeout) clearTimeout(this.sensorTimeout)
    this.sensorTimeout = null
    if (url.includes('/part-loading')) {
      // Kullanıcı isteği (2026-10-16): parça yükleme ekranında sensör parçayı HEMEN görür
      if (!this.partSensor) this.togglePartSensor()
    } else if (this.activeJobId == null && this.partSensor && !url.includes('/dashboard')) {
      this.togglePartSensor() // büküm başlamadan ekrandan çıkıldı → parça yok
    }
  }

  togglePartSensor(): void {
    this.partSensor = !this.partSensor
    log.info('DEMO parça sensörü', { on: this.partSensor })
    this.emitPartSensor()
  }

  cycleSpeed(): void {
    this.speed = this.speed >= 4 ? 1 : this.speed * 2
    log.info('DEMO hız', { speed: this.speed })
  }

  private emitPartSensor(): void {
    this.state.safety.leftPartSensor = this.partSensor
    const evt: MachineEvent = {
      messageType: 'info',
      eventType: 'PartSensor',
      timestamp: new Date().toISOString(),
      payload: { leftPartSensor: this.partSensor, rightPartSensor: false },
    }
    this.emit('eventReceived', evt)
  }

  // ── fizik ──

  private tick(): void {
    const dt = (TICK_MS / 1000) * this.speed
    const s = this.state
    for (const k of Object.keys(this.targets) as PistonKey[]) {
      const p = s[k]
      const diff = this.targets[k] - p.positionMm
      const step = PISTON_SPEED * (this.pistonSpeedPct[k] / 100) * dt
      if (Math.abs(diff) <= Math.max(step, 0.005)) {
        p.positionMm = this.targets[k]
        p.moving = false
        p.inPosition = true
      } else {
        p.positionMm += Math.sign(diff) * step
        p.moving = true
        p.inPosition = false
      }
      p.encoderRaw = Math.round(p.positionMm * 50)
      p.physicalPositionMm = p.positionMm
    }
    // Rotasyon: rampa ile hızlanır, hedefe yaklaşırken v ≤ √(2·a·mesafe) ile yavaşlar
    const rdiff = this.rotationTarget - s.rotation.positionMm
    const vMax = ROTATION_SPEED * (this.rotationSpeedPct / 100)
    const dist = Math.abs(rdiff)
    if (dist <= 0.05 && Math.abs(this.rotationVel) < 5) {
      s.rotation.positionMm = this.rotationTarget
      this.rotationVel = 0
      s.rotation.activeDirection = 0
      s.rotation.inPosition = true
    } else {
      const dir = Math.sign(rdiff)
      const vStop = Math.sqrt(2 * ROTATION_ACCEL * dist)
      const want = dir * Math.min(vMax, vStop)
      const dv = ROTATION_ACCEL * dt
      this.rotationVel += Math.max(-dv, Math.min(dv, want - this.rotationVel))
      let move = this.rotationVel * dt
      if (Math.sign(move) === dir && Math.abs(move) >= dist) {
        move = rdiff // hedefi aşma — hedefte dur
        this.rotationVel = 0
      }
      if (Math.abs(move) < 0.02 && dist > 0.05) move = dir * Math.min(dist, 0.5) // son milimetreler
      s.rotation.positionMm += move
      s.rotation.activeDirection = this.rotationVel > 0 ? 1 : this.rotationVel < 0 ? -1 : 0
      s.rotation.inPosition = false
    }
    s.rotation.encoderRaw = Math.round(s.rotation.positionMm)

    // Basınç: hareket varken yükselir, dururken bekleme basıncına iner (görsel canlılık)
    const anyMoving = (Object.keys(this.targets) as PistonKey[]).some((k) => s[k].moving) || !s.rotation.inPosition
    // Boşta (büküm yokken) hat basıncı 6-7 bar; büküm sırasında hareketsizken ~40, harekette ~120
    const idle = this.activeJobId == null && !anyMoving
    const wantS1 = anyMoving ? 118 + Math.random() * 14 : 42 + Math.random() * 3
    if (this.pressureHold != null && !anyMoving) {
      s.sensors.s1PressureBar = Math.round(this.pressureHold + (Math.random() * 3 - 1.5))
    } else if (idle) {
      // ~1sn'de bir 6 ↔ 7 bar arası oynar (her tick değişip titremesin)
      const cur = s.sensors.s1PressureBar
      if ((cur !== 6 && cur !== 7) || Math.random() < 0.1) s.sensors.s1PressureBar = Math.random() < 0.5 ? 6 : 7
    } else {
      s.sensors.s1PressureBar = Math.round(s.sensors.s1PressureBar + (wantS1 - s.sensors.s1PressureBar) * 0.3)
    }
    s.sensors.s2PressureBar = Math.round(s.sensors.s1PressureBar * 0.9)
    s.sensors.s1FlowCms = anyMoving ? 34 + Math.round(Math.random() * 4) : 12
    s.sensors.s2FlowCms = anyMoving ? 31 + Math.round(Math.random() * 4) : 11
    ;(s as unknown as { timestamp?: string }).timestamp = new Date().toISOString()

    this.emit('stateUpdated', structuredClone(s))
    if (this.progress) this.emit('bendingProgress', { ...this.progress })
  }

  // ── hareket yardımcıları (pipeline) ──

  private sleep(ms: number, token: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const end = Date.now() + ms / this.speed
      const iv = setInterval(() => {
        if (token !== this.runToken) {
          clearInterval(iv)
          reject(new Cancelled())
        } else if (Date.now() >= end) {
          clearInterval(iv)
          resolve()
        }
      }, 50)
    })
  }

  private waitUntil(cond: () => boolean, token: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const iv = setInterval(() => {
        if (token !== this.runToken) {
          clearInterval(iv)
          reject(new Cancelled())
        } else if (cond()) {
          clearInterval(iv)
          resolve()
        }
      }, 50)
    })
  }

  private async movePistons(t: Partial<Record<PistonKey, number>>, token: number, speedPct = 100): Promise<void> {
    for (const [k, v] of Object.entries(t) as [PistonKey, number][]) {
      this.targets[k] = Math.round(v * 100) / 100
      this.pistonSpeedPct[k] = speedPct
    }
    await this.sleep(150, token)
    await this.waitUntil(
      () => (Object.keys(t) as PistonKey[]).every((k) => Math.abs(this.state[k].positionMm - this.targets[k]) < 0.01),
      token,
    )
    await this.sleep(250, token)
  }

  private async rotateTo(mm: number, token: number, speedPct = 100): Promise<void> {
    this.rotationTarget = Math.round(mm)
    this.rotationSpeedPct = speedPct
    await this.sleep(150, token)
    await this.waitUntil(() => Math.abs(this.state.rotation.positionMm - this.rotationTarget) < 0.1, token)
    await this.sleep(250, token)
  }

  private setProgress(jobId: number, completed: number, total: number, message: string, extra: Partial<BendingProgress> = {}): void {
    const keepR = this.progress?.jobId === jobId ? this.progress.currentRadiusMm : null
    this.progress = {
      jobId,
      completedPasos: completed,
      totalPasos: total,
      percentComplete: total > 0 ? Math.min(100, (completed / total) * 100) : 0,
      message,
      currentRadiusMm: keepR ?? null,
      ...extra,
    } as BendingProgress
  }

  private currentStage() {
    const pi = (this.state as unknown as { physicalInfo?: { currentStage?: number } }).physicalInfo
    return STAGES.find((s) => s.stageNumber === (pi?.currentStage ?? 1)) ?? STAGES[0]
  }

  private async applyStage(n: number, speedPct: number): Promise<void> {
    const st = STAGES.find((s) => s.stageNumber === n) ?? STAGES[0]
    const token = this.runToken
    // Gerçek ChangeStageHandler: Sol + Alt + Sağ paralel (üst top oynamaz)
    await this.movePistons({ leftPiston: st.left, rightPiston: st.right, lowerPiston: st.lower }, token, Math.max(30, speedPct))
    ;(this.state as unknown as { physicalInfo: Record<string, unknown> }).physicalInfo = {
      isGonyeCompleted: true,
      currentStage: st.stageNumber,
      currentStageName: st.name,
    }
  }

  // ── pipeline ──

  private async runJob(job: DemoJob): Promise<void> {
    const token = ++this.runToken
    const st = this.currentStage()
    job.status = 3
    this.activeJobId = job.id
    this.progress = null
    // Parça makinede — temas sensörü aktif (bitince operatör alır → pasif)
    if (!this.partSensor) this.togglePartSensor()
    try {
      if (job.method === 1) await this.runArc(job, st, token)
      else await this.runCircle(job, st, token)
      job.status = 4
    } catch (err) {
      if (err instanceof Cancelled) {
        job.status = 6
        log.info('DEMO job iptal', { id: job.id })
      } else {
        job.status = 5
        log.error('DEMO job hata', { error: (err as Error).message })
      }
    }
    // Son mesaj birkaç saniye ekranda kalsın, sonra monitör kapanır
    setTimeout(() => {
      if (this.activeJobId === job.id) {
        this.activeJobId = null
        this.progress = null
        if (this.partSensor) this.togglePartSensor()
      }
    }, 4000)
  }

  /** Gerçek push derinliği → ekranda gösterilecek encoder konumu (son hedef = MAX_PISTON_MM) */
  private displayMapper(pushMax: number, restOffset: number): (push: number) => number {
    const top = Math.max(MAX_PISTON_MM, restOffset + 20)
    return (push: number) => Math.max(restOffset + 5, top - (pushMax - push))
  }

  /** Ekran konumu → gerçek push (displayMapper'ın tersi) */
  private pushFromDisplay(dispPos: number, pushMax: number): number {
    return pushMax - (MAX_PISTON_MM - dispPos)
  }

  /**
   * ClampPartCircularHandler: parça sensörü beklenir → üst top %30 ile basınç modunda iner
   * (DB pozisyon hedefi 488−220−10.5−A+0.1 üst strok 161'i aştığı için basınç moduna düşer).
   */
  private async clampCircle(jobId: number, total: number, token: number): Promise<void> {
    this.setProgress(jobId, 0, total, 'Parça sıkıştırılıyor...')
    await this.waitUntil(() => this.partSensor, token)
    await this.movePistons({ upperPiston: CLAMP_UPPER_MM }, token, 30)
    this.pressureHold = CLAMP_PRESSURE_BAR
    await this.sleep(1200, token)
  }

  /**
   * ZeroPartCircularHandler: (1) %80 sensörden uzaklaş → sensör kapanır, (2) %10 geri yaklaş →
   * sensör açılır, (3) %50 ile (ResetDistance − Safety) uzaklaş, (4) rotasyon enkoderi = 0.
   */
  private async zeroCircle(jobId: number, total: number, safety: number, token: number): Promise<void> {
    this.setProgress(jobId, 0, total, 'Parça sıfırlanıyor...')
    const p0 = this.state.rotation.positionMm
    await this.rotateTo(p0 + 140, token, 80)
    if (this.partSensor) this.togglePartSensor()
    await this.sleep(300, token)
    await this.rotateTo(p0 + 12, token, 10)
    if (!this.partSensor) this.togglePartSensor()
    await this.sleep(300, token)
    // Parça kenarı sensörden uzaklaşır → sensör pasif (büküm boyunca pasif kalır)
    if (this.partSensor) this.togglePartSensor()
    await this.rotateTo(this.state.rotation.positionMm + (ZERO_RESET_MM - safety), token, 50)
    await this.sleep(400, token)
    this.state.rotation.positionMm = 0
    this.rotationTarget = 0
    this.rotationVel = 0
  }

  /**
   * Çember — ExecuteGeometricBendingHandler + SpringbackAutoCorrectHandler ile adım adım aynı:
   *   Paso 1 ADAPTİF: üst top boşluk (0.1) → pasif güvenli geri (−2.75) → aktif %20 jog; temasta
   *     parça yuvarlanır (rotasyon enkoderi oynar), enkoder 10mm piston boyunca durunca dur →
   *     ölçekli adım (temas <130: 1, <140: 2/3, ≥140: 1/3) − 10mm pencere gecikmesi kadar ilerle.
   *   Her paso sonu SWAP + BÖLÜNMÜŞ ROT: kısa rot (|XA1|+A) → büken top güvenli geri → diğer top
   *     AYNI bükme konumuna → uzun rot (sol büktüyse → LT−2·safety, sağ büktüyse → 0).
   *   Paso 2+: üst boşluk → pasif (zaten geride) → aktif +adım (hedefi aşmaz) → swap + rot.
   *   GERİ ESNEME: üst boşluk → ölçüm pnömatiği (parçanın olduğu taraf) uzat → oku → geri çek →
   *     tolerans içi: bitti · hedef altı: bitti · fark ≤50mm: sadece swap+rot karşıya, tekrar ölç ·
   *     fark >50mm: düzeltme çapı = önceki − (ölçülen−hedef)×0.25 → parça tarafı top düzeltmeye →
   *     swap + rot karşıya → tekrar ölç.
   */
  private async runCircle(job: DemoJob, st: (typeof STAGES)[number], token: number): Promise<void> {
    const base = { ball: BALL, thickness: job.profileA, center: CENTER_NORMAL, xa1: st.xa1, ya1: 0, theta: THETA }
    const T = job.targetDiameterMm
    const push = calcPush({ ...base, diameter: T }) ?? 280
    const safety = job.safetyMarginMm || 50
    const tol = Number(job.toleranceMm) > 0 ? Number(job.toleranceMm) : 5
    const doSpringback = !job.skipAutoCorrect

    // Geri esneme senaryosu (kullanıcı isteği): 6 ölçüm, hedefe oranla iner, 6.'sı tolerans içinde.
    // Ø2000 için: 2800 → 2400 → 2200 → 2100 → 2040 → ~2000. Gerçek kurallarla: fark >50mm →
    // düzeltme bükümü (çap = önceki − fark×0.25), fark ≤50mm → düzeltmesiz karşıya geç, tolerans → bitti.
    const measures = [0.4, 0.2, 0.1, 0.05, 0.02].map((f) => T * (1 + f))
    measures.push(T + (Math.random() * 1.2 - 0.6) * tol)
    let cPlan = T
    let deepest = push
    for (const m of measures) {
      if (Math.abs(m - T) <= tol || m - T <= ROTATION_ONLY_MAX_OVERRUN) continue
      cPlan = cPlan - (m - T) * CORRECTION_COEF
      deepest = Math.max(deepest, calcPush({ ...base, diameter: cPlan }) ?? deepest)
    }
    const pushMax = doSpringback ? deepest : push // ekranda en derin konum (son düzeltme) = 165
    const disp = this.displayMapper(pushMax, Math.max(st.left, st.right))
    const targetDisp = disp(push)
    const radiusAt = (dispPos: number) => radiusFromPush(this.pushFromDisplay(dispPos, pushMax), base)

    const home = 0
    const far = Math.max(300, Math.round(job.partLengthMm - 2 * safety))
    const shortDelta = Math.abs(st.xa1) + job.profileA

    // Toplam paso tahmini (EstimateTotalPasos gibi — paso 1 sonrası güncellenir)
    let total = 2
    job.totalPasos = total

    // Kısa rot (|XA1|+A) → büken top güvenli geriye → diğer top bükme konumuna → uzun rot
    const swapSplit = async (act: PistonKey, pas: PistonKey, bendPos: number, target: number) => {
      const cur = this.state.rotation.positionMm
      const dir = target > cur ? 1 : -1
      let mid = cur + dir * shortDelta
      if ((dir > 0 && mid > target) || (dir < 0 && mid < target)) mid = target
      if (Math.abs(mid - cur) > 0.5) await this.rotateTo(mid, token, 100)
      await this.movePistons({ [act]: SAFE_BACKWARD_MM }, token, 100)
      await this.movePistons({ [pas]: bendPos }, token, 100)
      if (Math.abs(mid - target) > 0.5) await this.rotateTo(target, token, 100)
    }
    const slack = async () => {
      this.pressureHold = null
      await this.movePistons({ upperPiston: this.state.upperPiston.positionMm + SLACK_UPPER_MM }, token, 30)
    }

    this.setProgress(job.id, 0, total, 'Büküm başlıyor...')
    await this.clampCircle(job.id, total, token)
    await this.zeroCircle(job.id, total, safety, token)

    // ── PASO 1 (ADAPTİF) ──
    let active: PistonKey = 'leftPiston' // ActiveSensorSide = Left → ilk aktif sol
    let passive: PistonKey = 'rightPiston'
    this.setProgress(job.id, 0, total, 'Paso 1 bükülüyor (adaptif temas)')
    await slack()
    await this.movePistons({ [passive]: SAFE_BACKWARD_MM }, token, 100)
    // %20 jog → temasta parça itilir, rotasyon enkoderi oynar (~6mm), sonra durur;
    // 10mm pencere boyunca enkoder durgun → piston DEMO_CONTACT_MM'de durur (temas tespiti)
    const stopAt = Math.min(DEMO_CONTACT_MM, targetDisp)
    const encStart = stopAt - ADAPTIVE_WINDOW_MM - 8
    if (encStart > this.state[active].positionMm) await this.movePistons({ [active]: encStart }, token, ADAPTIVE_JOG_PCT)
    const rot0 = this.state.rotation.positionMm
    await Promise.all([
      this.movePistons({ [active]: stopAt - ADAPTIVE_WINDOW_MM }, token, ADAPTIVE_JOG_PCT),
      this.rotateTo(rot0 + 6, token, 1.2),
    ])
    await this.movePistons({ [active]: stopAt }, token, ADAPTIVE_JOG_PCT)
    await this.sleep(200, token)
    let bend = this.state[active].positionMm
    total = bend >= targetDisp - 0.5 ? 1 : 2
    job.totalPasos = total
    let r = radiusAt(bend)
    this.setProgress(job.id, 0, total, 'Paso 1 bükülüyor (adaptif temas)', { currentRadiusMm: r })
    await swapSplit(active, passive, bend, active === 'leftPiston' ? far : home)
    let done = 1
    this.setProgress(job.id, done, total, 'Paso 1 tamamlandı (adaptif temas)', { currentRadiusMm: r })
    ;[active, passive] = [passive, active]

    // ── PASO 2+ ──
    while (bend < targetDisp - 0.5) {
      this.setProgress(job.id, done, total, `Paso ${done + 1} bükülüyor`)
      await slack()
      await this.movePistons({ [passive]: SAFE_BACKWARD_MM }, token, 100)
      bend = targetDisp // demo: paso 2 doğrudan son hedef
      await this.movePistons({ [active]: bend }, token, 100)
      r = radiusAt(bend)
      this.setProgress(job.id, done, total, `Paso ${done + 1} bükülüyor`, { currentRadiusMm: r })
      await swapSplit(active, passive, bend, active === 'leftPiston' ? far : home)
      done++
      this.setProgress(job.id, done, total, `Paso ${done} tamamlandı`, { currentRadiusMm: r })
      ;[active, passive] = [passive, active]
      await this.sleep(300, token)
    }

    if (doSpringback) {
      // ── GERİ ESNEME ÖLÇÜM + DÜZELTME (SpringbackAutoCorrectHandler) ──
      this.setProgress(job.id, done, done, 'Geri esneme düzeltmesi başlıyor...')
      await this.sleep(1000, token)
      const fmt = (d: number) => `Ø${d.toFixed(1)}`
      let partOnRight = this.state.rotation.positionMm > far / 2
      let prevDiameter = T
      for (let it = 1; it <= 20; it++) {
        const sideKey = partOnRight ? 'right' : 'left'
        const sideTr = partOnRight ? 'SAĞ' : 'SOL'
        const msg = (t: string, extra: Partial<BendingProgress> = {}) =>
          this.setProgress(job.id, done, done, `Geri esneme ${it}: ${t}`, extra)
        // ADIM 1: üst boşluk alma
        msg('üst top boşluk alıyor')
        await slack()
        // ADIM 2: pnömatik uzat + oku + geri çek
        msg(`ölçüm pnömatiği uzatılıyor (${sideTr})`)
        await this.movePneumatic(sideKey, true, token)
        msg('sensör okunuyor...')
        await this.sleep(2000, token)
        const m = measures[Math.min(it - 1, measures.length - 1)]
        const err = Math.abs(m - T)
        await this.movePneumatic(sideKey, false, token)
        if (err <= tol) {
          msg(`${fmt(m)} ölçüldü ✓ tolerans içinde`, { currentRadiusMm: m / 2 })
          await this.sleep(2500, token)
          break
        }
        if (m <= T) {
          msg(`${fmt(m)} ölçüldü — düzeltme gerekmiyor`, { currentRadiusMm: m / 2 })
          await this.sleep(2500, token)
          break
        }
        const act: PistonKey = partOnRight ? 'rightPiston' : 'leftPiston'
        const pas: PistonKey = partOnRight ? 'leftPiston' : 'rightPiston'
        const overrun = m - T
        if (overrun <= ROTATION_ONLY_MAX_OVERRUN) {
          msg(`${fmt(m)} ölçüldü → düzeltmesiz, karşıdan ölçülecek`, { currentRadiusMm: m / 2 })
          await this.sleep(1800, token)
          await swapSplit(act, pas, this.state[act].positionMm, partOnRight ? home : far)
        } else {
          const corr = Math.round((prevDiameter - overrun * CORRECTION_COEF) * 100) / 100
          prevDiameter = corr
          const pos = disp(calcPush({ ...base, diameter: corr }) ?? pushMax)
          msg(`${fmt(m)} ölçüldü → düzeltme ${fmt(corr)}`, { currentRadiusMm: m / 2 })
          await this.sleep(1800, token)
          msg(`düzeltme bükümü (${sideTr} top ${pos.toFixed(1)})`, { currentRadiusMm: m / 2 })
          await slack()
          await this.movePistons({ [act]: pos }, token, 100)
          await swapSplit(act, pas, pos, partOnRight ? home : far)
        }
        partOnRight = !partOnRight
        await this.sleep(500, token)
      }
    }
    this.pressureHold = null
    this.setProgress(job.id, done, done, 'Büküm tamamlandı!')
  }

  /** Ölçüm pnömatiği (SLPIS/GT2 sensör kolu) uzat / geri çek — ~1.2sn */
  private async movePneumatic(side: 'left' | 'right', extend: boolean, token: number): Promise<void> {
    const pn = side === 'left' ? this.state.leftPneumatic : this.state.rightPneumatic
    pn.activeDirection = extend ? 1 : -1
    pn.extended = false
    pn.retracted = false
    const from = pn.encoderPosition
    const to = extend ? 120 : 0
    const steps = 12
    for (let k = 1; k <= steps; k++) {
      await this.sleep(100, token)
      pn.encoderPosition = Math.round(from + ((to - from) * k) / steps)
    }
    pn.activeDirection = 0
    pn.extended = extend
    pn.retracted = !extend
  }

  /**
   * Çok açılı — ExecuteArcBendingHandler + ArcMeasureAndCorrectHandler ile adım adım aynı
   * (sensör Sol varsayımı, segmentler baştan girilmiş):
   *   Sıkıştır → Sıfırla (başlangıç = Reset − safety − max(0, L1 − safety)) →
   *   her segment: mod kararı (L > |XA1| ve kalan > |XA1| → Middle · sadece kalan → Normal ·
   *   sadece L → ReverseNormal) → "SegN düzlük" rotasyonu → pasif (Normal: güvenli geri, Middle: stage'de) →
   *   nOdd paso (her paso: üst boşluk → piston → rotasyon ileri/geri → mesaj) → aktif sonra pasif
   *   stage'e → ölçüm (rot = yay başı + max(yay, 800), karşı taraf pnömatik 5+5+5 sn) →
   *   tolerans dışıysa SPLIT (yarım + tam) düzeltme → tekrar ölç.
   *   Ölçüm/düzeltme sırasında ekrana yeni mesaj YOK (gerçekteki gibi son paso mesajı kalır).
   *   Son segmentten sonra rotasyon / üst top kalkma YOK.
   */
  private async runArc(job: DemoJob, st: (typeof STAGES)[number], token: number): Promise<void> {
    const segs = [...(job.segments ?? [])].sort((a, b) => a.segmentOrder - b.segmentOrder)
    const P = segs.length
    const G = (job.arcStepDistanceMm ?? job.stepDistanceMm) || 15
    const LT = job.partLengthMm
    const safety = job.safetyMarginMm || 50
    const tol = Number(job.toleranceMm) > 0 ? Number(job.toleranceMm) : 5
    const xA1Abs = Math.abs(st.xa1)
    const maxRot = LT - safety
    const fwd = 1 // sensör Sol → parça hep sağa sürülür
    const approx = P * 6
    const f1 = (v: number) => v.toFixed(1).replace('.', ',') // Türkçe Windows kültürü

    const arcLenOf = (s: (typeof segs)[number]) => (2 * Math.PI * s.radiusMm * (180 - s.angleDeg)) / 360
    const decideMode = (L: number, kalan: number): 'Normal' | 'Middle' | 'ReverseNormal' =>
      L > xA1Abs && kalan > xA1Abs ? 'Middle' : !(L > xA1Abs) && kalan > xA1Abs ? 'Normal' : L > xA1Abs ? 'ReverseNormal' : 'Normal'

    // ── Ön plan: her segmentin modu, hedefi (ekran ölçeği için en derin push) ──
    let adv = 0
    const plans = segs.map((seg, i) => {
      const order = i + 1
      const arcLen = arcLenOf(seg)
      const duzlukEf = order === 1 ? Math.max(seg.straightAfterMm, safety) : seg.straightAfterMm
      let arcEf = arcLen
      if (order === P) {
        const physRem = LT - (adv + duzlukEf) - arcLen
        if (physRem < safety) arcEf = Math.max(0, arcLen - (safety - physRem))
      }
      const kalan = LT - (adv + duzlukEf + arcEf)
      adv += duzlukEf + arcEf
      const mode = decideMode(seg.straightAfterMm, kalan)
      const center = mode === 'Middle' ? CENTER_MIDDLE : CENTER_NORMAL
      const base = { ball: BALL, thickness: job.profileA, center, xa1: st.xa1, ya1: 0, theta: THETA }
      const push = calcPush({ ...base, diameter: seg.radiusMm * 2 }) ?? 250
      const contact = calcPush({ ...base, diameter: 200_000 }) ?? push - 40
      // Düzeltme (iterasyon 1 ölçümü hedefin %3 üstü → SPLIT) — hesap job.CenterDistanceMm ile (gerçek kodda böyle)
      const measured1 = seg.radiusMm * 1.03 + tol
      const corrD = 2 * seg.radiusMm - (2 * measured1 - 2 * seg.radiusMm) * CORRECTION_COEF
      const corrBase = { ...base, center: CENTER_NORMAL }
      const corrPush = calcPush({ ...corrBase, diameter: corrD }) ?? push
      return { seg, order, arcLen, duzlukEf, arcEf, mode, base, push, contact, measured1, corrPush }
    })
    const pushMax = Math.max(1, ...plans.map((p) => p.push))
    const disp = this.displayMapper(pushMax, Math.max(st.left, st.right))

    this.setProgress(job.id, 0, approx, 'Arc büküm başlatıldı', { completedSegmentOrder: 0, totalSegmentCount: P })

    // ── Sıkıştır ──
    this.setProgress(job.id, 0, approx, 'Parça sıkıştırılıyor...', { completedSegmentOrder: 0, totalSegmentCount: P })
    await this.waitUntil(() => this.partSensor, token)
    await this.movePistons({ upperPiston: CLAMP_UPPER_MM }, token, 30)
    this.pressureHold = CLAMP_PRESSURE_BAR
    await this.sleep(800, token)

    // ── Sıfırla (ZeroPartArc) ──
    this.setProgress(job.id, 0, approx, 'Parça sıfırlanıyor...', { completedSegmentOrder: 0, totalSegmentCount: P })
    const p0 = this.state.rotation.positionMm
    await this.rotateTo(p0 + 140, token, 80)
    if (this.partSensor) this.togglePartSensor()
    await this.sleep(200, token)
    await this.rotateTo(p0 + 12, token, 10)
    if (!this.partSensor) this.togglePartSensor()
    await this.sleep(200, token)
    const L1 = plans[0]?.seg.straightAfterMm ?? 0
    const startPos = ZERO_RESET_MM - safety - Math.max(0, L1 - safety)
    // Parça kenarı sensörden uzaklaşır → sensör pasif (büküm boyunca pasif kalır)
    if (this.partSensor) this.togglePartSensor()
    if (startPos > 0) await this.rotateTo(this.state.rotation.positionMm + fwd * startPos, token, 50)
    await this.sleep(200, token)
    this.state.rotation.positionMm = 0
    this.rotationTarget = 0
    this.rotationVel = 0

    let rotAcc = 0
    let completed = 0
    const slack = async () => {
      this.pressureHold = null
      await this.movePistons({ upperPiston: this.state.upperPiston.positionMm + SLACK_UPPER_MM }, token, 30)
    }
    const rotGuard = async (target: number) => {
      if (Math.abs(target) > maxRot) throw new Error(`rotasyon ${target.toFixed(0)} > ${maxRot}`)
      await this.rotateTo(target, token, 100)
    }

    for (const p of plans) {
      const n = p.order
      const segExtra = { completedSegmentOrder: n - 1, totalSegmentCount: P }
      const rev = p.mode === 'ReverseNormal'
      const rs = rev ? -1 : 1
      // Aktif: Normal → sensör tarafı (sol), Middle / ReverseNormal → karşı (sağ)
      const active: PistonKey = p.mode === 'Normal' ? 'leftPiston' : 'rightPiston'
      const passive: PistonKey = active === 'leftPiston' ? 'rightPiston' : 'leftPiston'
      const actRest = active === 'leftPiston' ? st.left : st.right
      const pasRest = passive === 'leftPiston' ? st.left : st.right
      const target = disp(p.push)
      let segMaxPos = -Infinity
      const updR = (extra: Partial<BendingProgress>) => {
        const pos = Math.max(this.state[active].positionMm, p.mode === 'Middle' ? this.state[passive].positionMm : -Infinity)
        if (pos > segMaxPos) segMaxPos = pos
        const push = this.pushFromDisplay(segMaxPos, pushMax)
        return { ...extra, currentRadiusMm: radiusFromPush(push, p.base) }
      }

      // 4b) Düzlük rotasyonu
      const delta = (n === 1 ? 0 : p.seg.straightAfterMm) + (rev ? p.arcEf : 0)
      this.setProgress(job.id, completed, approx, `Seg${n} düzlük`, { ...segExtra, currentRadiusMm: null })
      const sbTarget = rotAcc + fwd * delta
      await rotGuard(sbTarget)
      rotAcc = sbTarget

      // 4d) Pasif top
      if (p.mode !== 'Middle') await this.movePistons({ [passive]: SAFE_BACKWARD_MM }, token, 100)

      // 4e) Paso planı
      const pistonStart = this.state[active].positionMm
      const pushDist = target - pistonStart
      let nOdd = 1
      let actualStep = 0
      let activeCount = 1
      if (pushDist > 0.5) {
        if (p.mode === 'Middle') {
          const naive = Math.max(1, Math.ceil(pushDist / G))
          const rem = pushDist - (naive - 1) * G
          activeCount = naive > 1 && rem <= G / 3 + 0.001 ? naive - 1 : naive
          nOdd = 2 * activeCount - 1
        } else {
          const nRaw = Math.max(1, Math.ceil(pushDist / G))
          nOdd = nRaw % 2 === 0 ? Math.max(1, nRaw - 1) : nRaw
          actualStep = pushDist / nOdd
        }
      }

      // 4f) Paso döngüsü
      let skipRest = false
      for (let k = 1; k <= nOdd; k++) {
        const isFwd = k % 2 === 1
        await slack()
        let moved: PistonKey = active
        if ((p.mode === 'Normal' || rev) && k === 1 && pushDist > 0.5) {
          // Adaptif ön büküm (demo senaryosu): %20 jog, temasta rotasyon enkoderi oynar, sonra
          // 10mm pencere durgun → piston DOĞRUDAN HEDEFTE durur → kalan pasolar atlanır (tek paso).
          const encStart = Math.max(this.state[active].positionMm, target - ADAPTIVE_WINDOW_MM - 8)
          if (encStart > this.state[active].positionMm) await this.movePistons({ [active]: encStart }, token, ADAPTIVE_JOG_PCT)
          const r0 = this.state.rotation.positionMm
          await Promise.all([
            this.movePistons({ [active]: Math.max(encStart, target - ADAPTIVE_WINDOW_MM) }, token, ADAPTIVE_JOG_PCT),
            this.rotateTo(r0 + fwd * 5, token, 1.2),
          ])
          await this.movePistons({ [active]: target }, token, ADAPTIVE_JOG_PCT)
          const stopPos = target
          await this.sleep(200, token)
          const now = this.state[active].positionMm
          const finalT = Math.max(stopPos, Math.min(now + Math.max(0, actualStep - ADAPTIVE_WINDOW_MM), target))
          if (Math.abs(finalT - now) > 0.05) await this.movePistons({ [active]: finalT }, token, 100)
          if (nOdd > 1) {
            const remaining = target - this.state[active].positionMm
            if (remaining < 0.5) skipRest = true
            else actualStep = remaining / (nOdd - 1)
          }
        } else if (p.mode === 'Middle') {
          if (isFwd) {
            const m = (k + 1) / 2
            const t = m === activeCount ? target : Math.min(pistonStart + m * G, target)
            await this.movePistons({ [active]: t }, token, 100)
          } else {
            moved = passive
            const t = Math.min(this.state[active].positionMm + G / 2, target)
            if (t > this.state[passive].positionMm + 0.05) await this.movePistons({ [passive]: t }, token, 100)
          }
        } else if (pushDist > 0.5) {
          const t = Math.min(this.state[active].positionMm + actualStep, target)
          await this.movePistons({ [active]: t }, token, 100)
        }
        const rotT = isFwd ? rotAcc + fwd * rs * p.arcEf : rotAcc
        await rotGuard(rotT)
        completed++
        const label = `Seg${n} paso${k}/${nOdd} (${isFwd ? 'fwd' : 'rew'}) [${moved === 'leftPiston' ? 'Left' : 'Right'}] piston ${f1(this.state[moved].positionMm)}mm`
        this.setProgress(job.id, completed, approx, label, updR(segExtra))
        if (skipRest) break
      }
      const lastMsg = this.progress?.message ?? ''

      // 4g) Ölçüm öncesi: aktif → stage, sonra pasif → stage
      await this.movePistons({ [active]: actRest }, token, 100)
      await this.movePistons({ [passive]: pasRest }, token, 100)

      // 4h) Ölçüm + düzeltme (mesaj yok — son paso mesajı kalır)
      // Ölçüm: yay sonundan stage |XA1| kadar daha (backend daf4989, yay boyundan bağımsız)
      const rotMeas = rotAcc + rs * fwd * (p.arcEf + xA1Abs)
      const rotYay = rotAcc + rs * fwd * p.arcEf
      if (Math.abs(rotMeas) <= maxRot) {
        await this.rotateTo(rotMeas, token, 100)
        const measSide: 'left' | 'right' = rev ? 'left' : 'right' // Normal/Middle: sensörün tersi
        let curPos = target
        for (let it = 1; it <= 2; it++) {
          await this.movePneumatic(measSide, true, token)
          await this.sleep(5000, token) // PneumaticWaitMs
          await this.sleep(5000, token) // örnekleme
          // Demo senaryosu: ilk ölçüm tolerans içinde → düzeltmesiz devam
          const measuredR = p.seg.radiusMm + (Math.random() * 1.0 - 0.5) * tol
          this.setProgress(job.id, completed, approx, lastMsg, { ...segExtra, currentRadiusMm: measuredR })
          await this.movePneumatic(measSide, false, token)
          await this.sleep(3800, token) // geri çekme bekleme (toplam 5sn)
          if (Math.abs(p.seg.radiusMm - measuredR) <= tol) break
          // SPLIT düzeltme
          const newPos = disp(p.corrPush)
          const push = newPos - curPos
          if (push <= 0) break // fazla bükülmüş — açılamaz
          await this.rotateTo(rotYay, token, 100) // a
          if (p.mode === 'Middle') {
            await this.movePistons({ [active]: curPos }, token, 100) // b.1
            await this.movePistons({ [passive]: curPos + push / 2 }, token, 100) // b.2
            await this.rotateTo(rotAcc, token, 100) // c — büküm 1
            await this.movePistons({ [active]: newPos }, token, 100) // d
            await this.rotateTo(rotYay, token, 100) // e — büküm 2
          } else {
            await this.movePistons({ [passive]: SAFE_BACKWARD_MM }, token, 100) // a.2
            await this.movePistons({ [active]: curPos + push / 2 }, token, 100) // b
            await this.rotateTo(rotAcc, token, 100) // c — büküm 1
            await this.movePistons({ [active]: newPos }, token, 100) // d
            await this.rotateTo(rotYay, token, 100) // e — büküm 2
          }
          this.setProgress(job.id, completed, approx, lastMsg, updR(segExtra))
          await this.movePistons({ [active]: actRest }, token, 100) // f
          await this.movePistons({ [passive]: pasRest }, token, 100) // f.2
          await this.rotateTo(rotMeas, token, 100) // g
          curPos = newPos
        }
      }

      // 4i) Segment sonu (mantıksal yay sonu)
      rotAcc = rotAcc + fwd * (rev ? -p.arcEf : p.arcEf)
    }

    this.pressureHold = null
    this.setProgress(job.id, completed, approx, 'Arc büküm tamamlandı', { completedSegmentOrder: P, totalSegmentCount: P })
  }

  // ─────────────────────────────────────────────────────────────
  // REST yönlendirici
  // ─────────────────────────────────────────────────────────────

  async handle(method: string, rawUrl: string, body: unknown): Promise<unknown> {
    const u = new URL(rawUrl)
    const path = u.pathname.replace(/\/+$/, '')
    const b = (body ?? {}) as Record<string, unknown>
    const ok = { success: true }
    let m: RegExpExecArray | null

    // ── genel ──
    if (path === '/health') return { status: 'ok' }
    if (path === '/api/machine/state') return this.state

    // ── hesap / plan ──
    if (path === '/api/bending/calculate') {
      const d = calcPush({
        ball: Number(b.ballDiameter) || BALL,
        thickness: Number(b.thickness),
        center: Number(b.centerDistance) || CENTER_NORMAL,
        diameter: Number(b.targetBendingDiameter),
        xa1: Number(b.xA1) || -493,
        ya1: Number(b.yA1) || 0,
        theta: Number(b.theta) || THETA,
      })
      if (d == null) return { success: false, pistonPosition: 0, error: 'Bu parametrelerle büküm yapılamaz' }
      return { success: true, pistonPosition: d, xArc: 0, yArc: 0, discriminant: 0, ballRadius: BALL / 2, arcRadius: Number(b.targetBendingDiameter) / 2, k: 0, r2: 0 }
    }
    if (path === '/api/bending/geometric/preview') {
      const target = Number(b.targetPositionMm) || 0
      const step = Number(b.stepDistanceMm) || 10
      const contact = Math.max(0, target - 60)
      const totalPasos = Math.max(1, Math.ceil((target - contact) / step))
      return { success: true, totalPasos, pasoSteps: [] }
    }
    if (path === '/api/bending/arc/validate-plan') {
      const segs = (b.segments as unknown[]) ?? []
      return { success: true, isReversed: false, extensionMm: 0, side: 'None', isMeasurementOnly: false, adjustedPartLengthMm: Number(b.partLengthMm) || 0, adjustedSegments: segs }
    }
    if (path === '/api/preparation/recommend-stage') {
      const s = recommendStage(Number(u.searchParams.get('profileA')) || 0)
      return { stageNumber: s.stageNumber, stageId: s.stageId, name: s.name, maxProfileAMm: s.maxProfileAMm, leftOffsetMm: s.left, rightOffsetMm: s.right, lowerOffsetMm: s.lower, reason: 'Profil A uygun en küçük stage' }
    }
    if (path === '/api/preparation/stage') {
      await this.applyStage(Number(b.targetStage) || 1, Number(b.speedPercent) || 50)
      return { success: true }
    }
    if (path === '/api/preparation/unload') {
      // Tahliye (SEKIL-18): üst top seçilen mm kadar GERİ çekilir (baskı biter), ardından
      // seçilen mesafe kadar rotasyon (işaret = yön). Yan toplar oynamaz.
      const token = this.runToken
      const retract = Math.max(0, Number(b.upperRetractMm) || 0)
      const rot = Number(b.rotationMm) || 0
      this.pressureHold = null
      if (retract > 0) {
        const target = Math.max(-25, this.state.upperPiston.positionMm - retract)
        await this.movePistons({ upperPiston: target }, token, 50)
      }
      if (Math.abs(rot) > 0.5) await this.rotateTo(this.state.rotation.positionMm + rot, token, 60)
      return { success: true, errorMessage: null }
    }
    if (path === '/api/preparation/gonye') {
      const token = this.runToken
      await this.movePistons({ leftPiston: -15, rightPiston: -15, upperPiston: -10, lowerPiston: -10 }, token, 60)
      await this.sleep(600, token)
      for (const k of Object.keys(this.targets) as PistonKey[]) {
        this.state[k].positionMm = 0
        this.targets[k] = 0
      }
      await this.applyStage(1, 60)
      return { success: true, errorMessage: null }
    }

    // ── job ──
    if (path === '/api/bending-jobs' && method === 'POST') {
      const id = this.nextJobId++
      const job: DemoJob = {
        ...(b as object),
        id,
        status: 2,
        method: Number(b.method) || 0,
        profileA: Number(b.profileA) || 40,
        targetDiameterMm: Number(b.targetDiameterMm) || 1000,
        partLengthMm: Number(b.partLengthMm) || 3000,
        stepDistanceMm: Number(b.stepDistanceMm) || 10,
        safetyMarginMm: Number(b.safetyMarginMm) || 50,
        totalPasos: Number(b.totalPasos) || 0,
        createdAt: new Date().toISOString(),
      } as DemoJob
      this.jobs.set(id, job)
      return job
    }
    if (path === '/api/bending-jobs/active') {
      return this.activeJobId != null ? (this.jobs.get(this.activeJobId) ?? null) : null
    }
    if (path === '/api/bending-jobs/similar') return { match: null, iterations: [] }
    if ((m = /^\/api\/bending-jobs\/(\d+)\/segments$/.exec(path))) {
      const job = this.jobs.get(Number(m[1]))
      if (job) job.segments = [...(job.segments ?? []), b as never]
      return ok
    }
    if ((m = /^\/api\/bending-jobs\/(\d+)$/.exec(path))) {
      const job = this.jobs.get(Number(m[1]))
      if (!job) throw new HttpError(404, rawUrl, 'Job bulunamadı')
      return job
    }
    if ((m = /^\/api\/bending-job\/(\d+)\/start$/.exec(path))) {
      const job = this.jobs.get(Number(m[1]))
      if (!job) return { success: false, error: 'Job bulunamadı' }
      job.skipAutoCorrect = u.searchParams.get('skipAutoCorrect') === 'true'
      if (this.activeJobId != null && this.jobs.get(this.activeJobId)?.status === 3)
        return { success: false, error: 'Zaten çalışan bir büküm var' }
      void this.runJob(job)
      return { success: true, message: 'Büküm başlatıldı', jobId: job.id }
    }
    if (/^\/api\/bending-job\/\d+\/cancel$/.test(path) || path === '/api/machine/emergency-stop') {
      this.abort()
      return ok
    }
    if (/^\/api\/bending-job\//.test(path)) return ok

    // ── manuel kontrol ──
    if ((m = /^\/api\/piston\/(\w+)\/(jog|position|pressure|stop)$/.exec(path))) {
      const key = PISTON_BY_NAME[m[1]]
      if (key) {
        const p = this.state[key]
        if (m[2] === 'jog') {
          const dir = Number(b.direction) || 0
          // UI: -1 = ileri (encoder artar), +1 = geri
          this.targets[key] = dir === 0 ? p.positionMm : dir < 0 ? 400 : -30
          this.pistonSpeedPct[key] = Number(b.speedPercent) || 30
        } else if (m[2] === 'position') {
          this.targets[key] = Number(b.positionMm) || 0
          this.pistonSpeedPct[key] = Number(b.speedPercent) || 50
        } else if (m[2] === 'pressure') {
          this.targets[key] = p.positionMm + 15
        } else {
          this.targets[key] = p.positionMm
        }
      }
      return ok
    }
    if ((m = /^\/api\/rotation\/(jog|position|distance|stop)$/.exec(path))) {
      const r = this.state.rotation
      if (m[1] === 'jog') {
        const dir = Number(b.direction) || 0
        this.rotationTarget = dir === 0 ? this.glideStop() : r.positionMm + dir * 100_000
        this.rotationSpeedPct = Number(b.speedPercent) || 30
      } else if (m[1] === 'position') {
        this.rotationTarget = Number(b.position) || 0
      } else if (m[1] === 'distance') {
        this.rotationTarget = r.positionMm + (Number(b.distance) || 0)
      } else {
        this.rotationTarget = this.glideStop()
      }
      return ok
    }
    if (path === '/api/machine/motor') {
      this.state.hydraulicMotorState = b.value ? 2 : 0
      return ok
    }
    if (/^\/api\/(machine|pneumatic|side-support)\//.test(path)) return ok

    // ── DataApi yan servisler ──
    if ((m = /^\/api\/user-preferences\/([^/]+)\/([^/]+)$/.exec(path))) {
      const key = `${m[1]}/${m[2]}`
      if (method === 'PUT') {
        const pref = { userKey: decodeURIComponent(m[1]), prefKey: decodeURIComponent(m[2]), valueJson: b.valueJson, updatedAt: new Date().toISOString() }
        this.prefs.set(key, pref)
        return pref
      }
      return this.prefs.get(key) ?? undefined
    }
    if (path === '/api/settings/stages' && method === 'GET') {
      return STAGES.map((s) => ({
        id: s.stageId, stageNumber: s.stageNumber, name: s.name,
        leftOffsetMm: s.left, rightOffsetMm: s.right, lowerOffsetMm: s.lower,
        xA1Mm: s.xa1, yA1Mm: 0, maxProfileAMm: s.maxProfileAMm,
      }))
    }
    if (path === '/api/machine-identity') {
      return { id: 1, serialNo: 'CRV-DEMO-001', customerName: 'Corventa', warrantyStartDate: '2026-01-01T00:00:00Z', warrantyEndDate: '2028-01-01T00:00:00Z', ownershipType: 'SATIS', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' }
    }
    if (path.startsWith('/api/maintenance')) {
      const now = new Date().toISOString()
      return { id: 1, lastDailyAt: now, lastWeeklyAt: now, lastMonthlyAt: now, last6MonthlyAt: now, last12MonthlyAt: now, isInMaintenanceMode: false, createdAt: now, updatedAt: now }
    }
    if (/^\/api\/service\/(tickets|requests|reports)$/.test(path) && method === 'GET') return []

    log.warn('DEMO: karşılanmayan istek', { method, path })
    throw new HttpError(404, rawUrl, 'Demo modunda desteklenmiyor')
  }

  /** Durdurma: mevcut hızdan rampa ile duracağı nokta */
  private glideStop(): number {
    const v = this.rotationVel
    return this.state.rotation.positionMm + (Math.sign(v) * v * v) / (2 * ROTATION_ACCEL)
  }

  private abort(): void {
    this.runToken++
    for (const k of Object.keys(this.targets) as PistonKey[]) this.targets[k] = this.state[k].positionMm
    this.rotationTarget = this.glideStop()
    if (this.activeJobId != null) {
      const id = this.activeJobId
      this.setProgress(id, this.progress?.completedPasos ?? 0, this.progress?.totalPasos ?? 0, 'İptal edildi')
    }
  }
}

export const demoMachine = new DemoMachine()
