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

import { demoAuth, demoRequireRole } from '@main/demo/demoAuth'
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

// MachineSettings entity varsayılanları (camelCase) — demo ayar ekranları için
const DEMO_MACHINE_SETTINGS = {
  id: 1,
  leftPistonStrokeMm: 422, rightPistonStrokeMm: 422, upperPistonStrokeMm: 161, lowerPistonStrokeMm: 195,
  leftPistonMaxReg: 21093, rightPistonMaxReg: 21127, upperPistonMaxReg: 7981, lowerPistonMaxReg: 9732,
  pneumaticStrokeMm: 265, pneumaticMaxReg: 13250, rollerDiameterMm: 220, rotationEncoderPpr: 1024,
  safetyMarginMm: 1, zeroResetDistanceMm: 810,
  defaultActiveSensorSide: 'Left', defaultValsCode: null,
  defaultPistonSpeedPercent: 100, defaultRotationSpeedPercent: 100,
  defaultToleranceMm: 5, defaultSafetyMarginMm: 100,
  defaultSlackPressureBar: 157, defaultSlackDistanceMm: 0.1, adaptiveInitialSlackDistanceMm: null,
  circularSlackDistanceMm: 0.1, circularSlackPressureBar: 157, circularAdaptiveInitialSlackDistanceMm: null,
  arcSlackDistanceMm: 0.1, arcSlackPressureBar: 157, arcAdaptiveInitialSlackDistanceMm: null,
  defaultClampPressureBar: 150, defaultBallDiameterMm: 220, defaultCenterDistanceMm: 300.82,
  centerDistanceMiddleRadiusMm: 300, upperLowerCenterDistanceMm: 488, clampOverpressMm: 0.1,
  defaultThetaDeg: 63, defaultXA1: -465, defaultYA1: 0,
  slpisZeroOffsetMm: 0, slpisLMm: 70, slpisRulmanCapMm: 35,
  leftRadiusSensorZeroOffsetMm: 0, rightRadiusSensorZeroOffsetMm: 0,
  radiusSensorMmPerPulse: 0.00025, radiusSensorStrokeMm: 12,
  minMeasurableArcLengthMm: null, defaultMeasurementDistanceMm: 850, stateSnapshotIntervalSec: 5,
  clampContactDeltaBar: 1, clampJogSpeedPercent: 30, clampSlowSpeedPercent: 20, clampSlowdownPercentOfTarget: 95,
  clampContactAtTargetEnabled: true, clampTravelOverpressureBar: 3,
  measurePneumaticExtendWaitMs: null, measurePneumaticRetractWaitMs: null, measureSampleDurationMs: null,
  circularSlackPressureSettleMs: null, circularIterationPauseMs: null,
  slackSpeedPercent: 30, adaptiveJogSpeedPercent: 20, adaptiveSampleIntervalMm: 1, adaptiveWindowSampleCount: 10,
  adaptiveEncoderStopToleranceMm: 0.1, springbackMaxIterations: 20, arcMeasureMaxIterations: 10,
  springbackRotationOnlyMaxMm: 50, springbackStableTimeMs: 500, springbackIncreaseThresholdMm: 0.2, springbackMinThresholdMm: 0.1,
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
}
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
const UNLOAD_MAX_UPPER_MM = 150 // tahliye üst top geri çekme üst sınırı (UI operatorPrefs UNLOAD_UPPER.max ile aynı)
const UNLOAD_MAX_ROTATION_MM = 3000 // tahliye rotasyon üst sınırı (UI operatorPrefs UNLOAD_ROT.max ile aynı)
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
  private unloadRunning = false // tahliye hareketi sürüyor (POST /api/preparation/unload/stop bunu keser)
  private progress: BendingProgress | null = null
  private prefs = new Map<string, unknown>()
  // Ayar ekranları (Operatör / Admin) için bellek içi kayıtlar — sadece ekranda görünür,
  // demo simülasyonunun hesabına etki etmez.
  private machineSettings: Record<string, unknown> = { ...DEMO_MACHINE_SETTINGS }
  private gonyeSettings: Record<string, unknown> = { id: 1, leftOffsetMm: 3.75, rightOffsetMm: 3.75, upperOffsetMm: 0, lowerOffsetMm: 10.5, referencePressureBar: 70 }
  private stageEdits = new Map<number, Record<string, unknown>>()
  private extraStages: (Record<string, unknown> & { id: number; isActive?: boolean })[] = []

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
    // Gönye yapılmış makine: tüm cetveller gönye konumunda 0 (gerçekteki gibi; üst top gönye ofseti 0)
    const home: Record<PistonKey, number> = { leftPiston: 0, rightPiston: 0, upperPiston: 0, lowerPiston: 0 }
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

  /** Stage 1-3 demo sabitleri; 4-5 Admin Ayarları'nda eklenen (aktif) kayıtlardan */
  private stageDef(n: number): (typeof STAGES)[number] | undefined {
    const fixed = STAGES.find((s) => s.stageNumber === n)
    if (fixed) return fixed
    const rec = this.extraStages
      .map((x) => ({ ...x, ...this.stageEdits.get(x.id) }))
      .find((x) => Number(x.stageNumber) === n && x.isActive !== false)
    if (!rec) return undefined
    return {
      stageNumber: n, stageId: rec.id, name: `Stage ${n}`,
      maxProfileAMm: Number(rec.maxProfileAMm ?? 0), left: Number(rec.leftOffsetMm ?? 0),
      right: Number(rec.rightOffsetMm ?? 0), lower: Number(rec.lowerOffsetMm ?? 0), xa1: Number(rec.xA1Mm ?? -465),
    }
  }

  private currentStage() {
    const pi = (this.state as unknown as { physicalInfo?: { currentStage?: number } }).physicalInfo
    return this.stageDef(pi?.currentStage ?? 1) ?? STAGES[0]
  }

  private async applyStage(n: number, speedPct: number): Promise<void> {
    const st = this.stageDef(n) ?? STAGES[0]
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
    // Elle konumlandırmada sensör arızalı kabul edilir → açılmaz
    if (!this.partSensor && !job.manualPlacement) this.togglePartSensor()
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
  private async clampCircle(jobId: number, total: number, token: number, manual = false): Promise<void> {
    this.setProgress(jobId, 0, total, manual ? 'Parça sıkıştırılıyor (ELLE KONUMLANDIRMA — sensörsüz)...' : 'Parça sıkıştırılıyor...')
    if (!manual) await this.waitUntil(() => this.partSensor, token)
    await this.movePistons({ upperPiston: CLAMP_UPPER_MM }, token, 30)
    this.pressureHold = CLAMP_PRESSURE_BAR
    await this.sleep(1200, token)
  }

  /**
   * ZeroPartCircularHandler: (1) %80 sensörden uzaklaş → sensör kapanır, (2) %10 geri yaklaş →
   * sensör açılır, (3) %50 ile (ResetDistance − Safety) uzaklaş, (4) rotasyon enkoderi = 0.
   */
  private async zeroCircle(jobId: number, total: number, safety: number, token: number, manual = false): Promise<void> {
    this.setProgress(jobId, 0, total, manual ? 'Parça sıfırlanıyor (ELLE KONUMLANDIRMA — sensör araması yok)...' : 'Parça sıfırlanıyor...')
    if (!manual) {
      const p0 = this.state.rotation.positionMm
      await this.rotateTo(p0 + 140, token, 80)
      if (this.partSensor) this.togglePartSensor()
      await this.sleep(300, token)
      await this.rotateTo(p0 + 12, token, 10)
      if (!this.partSensor) this.togglePartSensor()
      await this.sleep(300, token)
    } else {
      // Elle konumlandırma: mevcut konum = sensör tetik anı; doğrudan başlangıç pozisyonuna gidilir
      await this.sleep(100, token)
    }
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
    await this.clampCircle(job.id, total, token, !!job.manualPlacement)
    await this.zeroCircle(job.id, total, safety, token, !!job.manualPlacement)

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
      // Demo senaryosu: ortadan bükülen segmentler 1 düzeltme alır (ilk ölçüm tolerans dışı → SPLIT →
      // ikinci ölçüm tolerans içinde); ön bükümlü (adaptif, tek paso) segmentte ilk ölçüm tutar.
      const correct = mode === 'Middle' && corrPush > push
      return { seg, order, arcLen, duzlukEf, arcEf, mode, base, push, contact, measured1, corrPush, correct }
    })
    // Ekranda en derin konum (son düzeltme dahil) = MAX_PISTON_MM; diğer hedefler gerçek hesap farkıyla altında
    const pushMax = Math.max(1, ...plans.map((p) => (p.correct ? p.corrPush : p.push)))
    const disp = this.displayMapper(pushMax, Math.max(st.left, st.right))

    this.setProgress(job.id, 0, approx, 'Arc büküm başlatıldı', { completedSegmentOrder: 0, totalSegmentCount: P })

    // ── Sıkıştır ──
    this.setProgress(job.id, 0, approx, 'Parça sıkıştırılıyor...', { completedSegmentOrder: 0, totalSegmentCount: P })
    if (!job.manualPlacement) await this.waitUntil(() => this.partSensor, token)
    await this.movePistons({ upperPiston: CLAMP_UPPER_MM }, token, 30)
    this.pressureHold = CLAMP_PRESSURE_BAR
    await this.sleep(800, token)

    // ── Sıfırla (ZeroPartArc) ──
    this.setProgress(job.id, 0, approx, 'Parça sıfırlanıyor...', { completedSegmentOrder: 0, totalSegmentCount: P })
    if (!job.manualPlacement) {
      const p0 = this.state.rotation.positionMm
      await this.rotateTo(p0 + 140, token, 80)
      if (this.partSensor) this.togglePartSensor()
      await this.sleep(200, token)
      await this.rotateTo(p0 + 12, token, 10)
      if (!this.partSensor) this.togglePartSensor()
      await this.sleep(200, token)
    } else {
      // Elle konumlandırma: sensör araması yok — mevcut konum referans
      await this.sleep(100, token)
    }
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
          // Demo senaryosu: düzeltmeli segmentte ilk ölçüm hedefin %3 üstü (az bükülmüş), sonra tolerans içinde
          const measuredR = p.correct && it === 1 ? p.measured1 : p.seg.radiusMm + (Math.random() * 1.0 - 0.5) * tol
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
    if (path === '/api/preparation/unload/stop') {
      // Tahliye DURDUR — devam eden tahliyeyi keser (runToken), üst top + rotasyon yerinde durur.
      // Tahliye yoksa success=true döner ama hiçbir ekseni durdurmaz (bilinçli fark): gerçek backend
      // tahliye yokken çalışan büküm varsa stop GÖNDERMEZ, yoksa üst top + rotasyona stop gönderir —
      // demoda tahliye/job dışında süren hareket olmadığından sonuç aynı. Çalışan job'a dokunmaz.
      if (this.unloadRunning) this.stopMotion()
      return { success: true, errorMessage: null }
    }
    if (path === '/api/preparation/unload') {
      // Tahliye (SEKIL-18): üst top seçilen mm kadar GERİ çekilir (baskı biter), ardından
      // seçilen mesafe kadar rotasyon (işaret = yön). Yan toplar oynamaz.
      // Cevap sözleşmesi: { success, errorMessage, appliedUpperRetractMm, appliedRotationMm, cancelled }
      // Hatalar gerçek backend gibi 400/409 + aynı gövde (EngineApiClient body'yi normalize eder).
      const fail = (status: number, errorMessage: string): never => {
        throw new HttpError(status, rawUrl, errorMessage, {
          success: false, errorMessage, appliedUpperRetractMm: 0, appliedRotationMm: 0, cancelled: false,
        })
      }
      const retract = Number(b.upperRetractMm)
      const rot = Number(b.rotationMm)
      if (!Number.isFinite(retract) || retract < 0 || retract > UNLOAD_MAX_UPPER_MM)
        fail(400, `Üst top geri çekme 0-${UNLOAD_MAX_UPPER_MM} mm arasında olmalı`)
      if (!Number.isFinite(rot) || Math.abs(rot) > UNLOAD_MAX_ROTATION_MM)
        fail(400, `Rotasyon mesafesi en fazla ${UNLOAD_MAX_ROTATION_MM} mm olabilir`)
      if (this.activeJobId != null && this.jobs.get(this.activeJobId)?.status === 3)
        fail(409, 'Çalışan bir büküm var — tahliye yapılamaz')
      if (this.unloadRunning) fail(409, 'Tahliye zaten devam ediyor')

      const token = this.runToken
      const upper0 = this.state.upperPiston.positionMm
      const rot0 = this.state.rotation.positionMm
      // NOT: demo applied* = ÖLÇÜLEN gerçekleşen hareket (iptalde kısmi); gerçek backend
      // appliedRotationMm = KOMUT (tam mm) ve üst topu gönye güvenli geri sınırına kırpar (demo 0'a).
      // UI bu alanları göstermiyor — fark kabul edildi.
      const applied = () => ({
        appliedUpperRetractMm: Math.round(Math.max(0, upper0 - this.state.upperPiston.positionMm) * 100) / 100,
        appliedRotationMm: Math.round((this.state.rotation.positionMm - rot0) * 100) / 100,
      })
      this.unloadRunning = true
      this.pressureHold = null
      try {
        if (retract > 0) {
          const target = Math.max(0, upper0 - retract) // gönye referansının altına inmez (kırpılır, applied'da görünür)
          await this.movePistons({ upperPiston: target }, token, 50)
        }
        if (Math.abs(rot) > 0.5) await this.rotateTo(rot0 + rot, token, 60)
        return { success: true, errorMessage: null, ...applied(), cancelled: false }
      } catch (err) {
        if (err instanceof Cancelled) {
          return { success: false, errorMessage: 'Tahliye durduruldu', ...applied(), cancelled: true }
        }
        throw err
      } finally {
        this.unloadRunning = false
      }
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
      // ELLE KONUMLANDIRMA (sensörsüz) — gerçek BendingJobController.StartJob ile aynı doğrulama
      const manualPlacement = u.searchParams.get('manualPlacement') === 'true'
      if (manualPlacement) {
        const side = u.searchParams.get('manualPlacementSide')
        const jobSide = String(job.activeSensorSide ?? 'Left')
        let err: string | null = null
        if (side !== 'Left' && side !== 'Right') err = "Elle konumlandırmada manualPlacementSide 'Left' veya 'Right' olmalı"
        else if (side.toLowerCase() !== jobSide.toLowerCase())
          err = `Elle konumlandırma tarafı (${side}) job tarafı (${jobSide}) ile aynı olmalı`
        if (err) throw new HttpError(400, rawUrl, err, { success: false, error: err })
      }
      job.manualPlacement = manualPlacement
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
      // Ekranda görünen stage kayıtları (demo hesabı STAGES sabitini kullanmaya devam eder)
      const base = STAGES.map((s) => ({
        id: s.stageId, stageNumber: s.stageNumber, name: s.name,
        leftOffsetMm: s.left, rightOffsetMm: s.right, lowerOffsetMm: s.lower,
        xA1Mm: s.xa1, yA1Mm: 0, maxProfileAMm: s.maxProfileAMm, displayOrder: s.stageNumber, isActive: true,
      }))
      const all = [...base, ...this.extraStages].map((s) => ({ ...s, ...this.stageEdits.get(s.id) }))
      return u.searchParams.get('includeInactive') === 'true' ? all : all.filter((s) => s.isActive !== false)
    }
    if (path === '/api/settings/stages' && method === 'POST') {
      const id = 100 + this.extraStages.length
      const st = { ...b, id, isActive: true } as (typeof this.extraStages)[number]
      this.extraStages.push(st)
      return st
    }
    if ((m = /^\/api\/settings\/stages\/(\d+)$/.exec(path)) && method === 'PUT') {
      const id = Number(m[1])
      this.stageEdits.set(id, { ...this.stageEdits.get(id), ...b, id })
      return { ...b, id }
    }
    if (path === '/api/settings/reload') return ok
    if (path === '/api/settings/machine') {
      if (method === 'PUT') this.machineSettings = { ...this.machineSettings, ...b, updatedAt: new Date().toISOString() }
      return this.machineSettings
    }
    if (path === '/api/settings/gonye') {
      if (method === 'PUT') this.gonyeSettings = { ...this.gonyeSettings, ...b }
      return this.gonyeSettings
    }
    if (path === '/api/usage-time/summary' && method === 'GET') {
      // Kullanım süreleri — gerçek DataApi sözleşmesiyle birebir (BÜYÜK HARF kategori, saniye)
      const days = Number(u.searchParams.get('days') ?? 30)
      if (!Number.isInteger(days) || days < 1 || days > 366) {
        throw new HttpError(400, rawUrl, 'days 1..366 aralığında olmalı', { error: 'days 1..366 aralığında olmalı' })
      }
      return demoUsageSummary(days)
    }
    if ((m = /^\/api\/certificates\/([^/]+)$/.exec(path)) && method === 'GET') {
      // Sertifika sorgula — gerçek DataApi sözleşmesiyle birebir (büyük harf kod, 404 = bulunamadı)
      const code = decodeURIComponent(m[1]).trim().toUpperCase()
      if (!code) throw new HttpError(400, rawUrl, 'Sertifika kodu boş olamaz', { error: 'Sertifika kodu boş olamaz' })
      const cert = demoCertificate(code)
      if (!cert) {
        const error = `'${code}' kodlu sertifika bulunamadı`
        throw new HttpError(404, rawUrl, error, { error })
      }
      return cert
    }
    if (path === '/api/customer-change/request' && method === 'POST') {
      return demoCustomerChangeRequest(rawUrl, b)
    }
    if (path === '/api/customer-change/confirm' && method === 'POST') {
      return demoCustomerChangeConfirm(rawUrl, b)
    }
    if (path === '/api/customer-change/history' && method === 'GET') {
      const limit = Math.min(Math.max(Number(u.searchParams.get('limit') ?? 50) || 50, 1), 500)
      return DEMO_CUSTOMER_CHANGE_LOGS.slice(0, limit)
    }
    if (path === '/api/machine-identity') {
      // Müşteri değişikliği (OTP) demoda da kimliği günceller → aynı nesne döner
      return { ...demoIdentity }
    }
    if (path.startsWith('/api/maintenance')) {
      return demoMaintenance(rawUrl, path, method, u, b)
    }
    // Rol sistemi — giriş / kullanıcı yönetimi (demoAuth.ts; operator|admin|super, şifre 1234)
    if (path.startsWith('/api/auth/') || path === '/api/users' || path.startsWith('/api/users/')) {
      return demoAuth(rawUrl, path, method, b)
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

  /** Hareketi kes: bekleyen pipeline/tahliye adımları Cancelled ile düşer, toplar yerinde durur */
  private stopMotion(): void {
    this.runToken++
    for (const k of Object.keys(this.targets) as PistonKey[]) this.targets[k] = this.state[k].positionMm
    this.rotationTarget = this.glideStop()
  }

  private abort(): void {
    this.stopMotion()
    if (this.activeJobId != null) {
      const id = this.activeJobId
      this.setProgress(id, this.progress?.completedPasos ?? 0, this.progress?.totalPasos ?? 0, 'İptal edildi')
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Makine kimliği + müşteri değişikliği (OTP) demo verisi
// POST /api/customer-change/request · /confirm · GET /history — gerçek DataApi sözleşmesiyle birebir
// (aynı durum kodları ve hata gövdeleri: 400/404/409/410/429, { error, remainingAttempts? }).
// ─────────────────────────────────────────────────────────────

// ---------- Bakım durumu (DataApi /api/maintenance sözleşmesi) ----------
// Demoda bakım uyarısı görünsün diye haftalık bakım 9 gün gecikmiş başlar (2. hafta → sarı uyarı).
// mark-completed / mode / PUT gerçek DataApi gibi state'i değiştirir (süreç boyunca bellekte).
const DEMO_DAY_MS = 86_400_000
const demoMaintenanceState = (() => {
  const now = Date.now()
  const iso = (ms: number) => new Date(ms).toISOString()
  return {
    id: 1,
    lastDailyAt: iso(now - 2 * 3600_000) as string | null,
    lastWeeklyAt: iso(now - (7 + 9) * DEMO_DAY_MS - 3600_000) as string | null,
    lastMonthlyAt: iso(now - 10 * DEMO_DAY_MS) as string | null,
    last6MonthlyAt: iso(now - 60 * DEMO_DAY_MS) as string | null,
    last12MonthlyAt: iso(now - 120 * DEMO_DAY_MS) as string | null,
    isInMaintenanceMode: false,
    createdAt: iso(now - 365 * DEMO_DAY_MS),
    updatedAt: iso(now),
  }
})()

const DEMO_MAINTENANCE_FIELDS: Record<string, 'lastDailyAt' | 'lastWeeklyAt' | 'lastMonthlyAt' | 'last6MonthlyAt' | 'last12MonthlyAt'> = {
  daily: 'lastDailyAt',
  weekly: 'lastWeeklyAt',
  monthly: 'lastMonthlyAt',
  'six-monthly': 'last6MonthlyAt',
  'twelve-monthly': 'last12MonthlyAt',
}

// Bakım modu kuralları (DataApi MaintenanceModeService ile aynı sözleşme): min süre / hatırlatma / otomatik kapanma.
// DEMO: değerler bilerek KISA — sunumda "X DK SONRA" düğmesi, DEVAM EDİYOR MUSUNUZ? hatırlatması ve
// otomatik kapanma birkaç dakikada görülebilsin (gerçek varsayılanlar: 10/30/60/120/240 dk, hatırlatma 180 dk,
// otomatik kapanma 15 dk). Admin Ayarları'ndan kayıtta backend aralıkları geçerli (hatırlatma ≥ 15 dk).
const demoMaintenanceRules: { periodKey: string; minDurationMinutes: number }[] = [
  { periodKey: 'daily', minDurationMinutes: 1 },
  { periodKey: 'weekly', minDurationMinutes: 2 },
  { periodKey: 'monthly', minDurationMinutes: 3 },
  { periodKey: 'six-monthly', minDurationMinutes: 5 },
  { periodKey: 'twelve-monthly', minDurationMinutes: 10 },
]
const demoMaintenanceTiming = { reminderAfterMinutes: 3, autoCloseAfterMinutes: 2 }
const demoMaintenanceMode = {
  startedAt: null as number | null,
  reminderDueAt: null as number | null,
  lastAutoClosedAt: null as string | null,
}

function demoMaintenanceSetMode(on: boolean): void {
  const st = demoMaintenanceState
  const now = Date.now()
  if (on && !st.isInMaintenanceMode) {
    st.isInMaintenanceMode = true
    demoMaintenanceMode.startedAt = now
    demoMaintenanceMode.reminderDueAt = now + demoMaintenanceTiming.reminderAfterMinutes * 60_000
  } else if (!on && st.isInMaintenanceMode) {
    st.isInMaintenanceMode = false
    demoMaintenanceMode.startedAt = null
    demoMaintenanceMode.reminderDueAt = null
  }
  st.updatedAt = new Date(now).toISOString()
}

/** Süre dolmuşsa otomatik kapat (backend lazy kontrolü gibi) */
function demoMaintenanceEnforce(): void {
  const m = demoMaintenanceMode
  if (!demoMaintenanceState.isInMaintenanceMode || m.reminderDueAt == null) return
  if (Date.now() >= m.reminderDueAt + demoMaintenanceTiming.autoCloseAfterMinutes * 60_000) {
    demoMaintenanceSetMode(false)
    m.lastAutoClosedAt = new Date().toISOString()
  }
}

function demoMaintenanceView(): Record<string, unknown> {
  const m = demoMaintenanceMode
  const now = Date.now()
  const open = demoMaintenanceState.isInMaintenanceMode && m.startedAt != null && m.reminderDueAt != null
  const iso = (ms: number | null) => (ms == null ? null : new Date(ms).toISOString())
  return {
    ...demoMaintenanceState,
    modeStartedAt: open ? iso(m.startedAt) : null,
    elapsedMinutes: open ? Math.max(0, Math.floor((now - m.startedAt!) / 60_000)) : null,
    reminderDueAt: open ? iso(m.reminderDueAt) : null,
    reminderActive: open ? now >= m.reminderDueAt! : false,
    autoCloseAt: open ? iso(m.reminderDueAt! + demoMaintenanceTiming.autoCloseAfterMinutes * 60_000) : null,
    lastAutoClosedAt: m.lastAutoClosedAt,
    reminderAfterMinutes: demoMaintenanceTiming.reminderAfterMinutes,
    autoCloseAfterMinutes: demoMaintenanceTiming.autoCloseAfterMinutes,
    rules: demoMaintenanceRules.map((r) => ({ ...r })),
  }
}

function demoMaintenanceRulesView(): Record<string, unknown> {
  return { rules: demoMaintenanceRules.map((r) => ({ ...r })), ...demoMaintenanceTiming }
}

function demoMaintenance(rawUrl: string, path: string, method: string, u: URL, b: Record<string, unknown>): unknown {
  const st = demoMaintenanceState
  const now = new Date().toISOString()
  demoMaintenanceEnforce()
  if (path === '/api/maintenance' && method === 'GET') return demoMaintenanceView()
  if (path === '/api/maintenance' && method === 'PUT') {
    // Elle düzeltme (min süre kuralını atlar) — gerçek DataApi gibi SUPERADMIN'e kilitli (401/403)
    demoRequireRole(rawUrl, 'SUPERADMIN')
    for (const f of Object.values(DEMO_MAINTENANCE_FIELDS)) {
      const v = b[f]
      st[f] = typeof v === 'string' && v ? v : null
    }
    demoMaintenanceSetMode(b.isInMaintenanceMode === true)
    st.updatedAt = now
    return demoMaintenanceView()
  }
  if (path === '/api/maintenance/mark-completed' && method === 'POST') {
    const period = (u.searchParams.get('period') ?? '').trim().toLowerCase()
    if (!period) demoFail(400, rawUrl, 'period query param zorunlu')
    const field = DEMO_MAINTENANCE_FIELDS[period]
    if (!field) {
      demoFail(400, rawUrl, `Geçersiz periyot '${period}'. Beklenen: daily|weekly|monthly|six-monthly|twelve-monthly`)
    }
    const startedAt = demoMaintenanceMode.startedAt
    if (!st.isInMaintenanceMode || startedAt == null) {
      demoFail(409, rawUrl, 'Bakım tamamlandı demek için önce bakım modunu açın')
    }
    const minMinutes = demoMaintenanceRules.find((r) => r.periodKey === period)?.minDurationMinutes ?? 0
    const elapsedMin = (Date.now() - startedAt) / 60_000
    if (elapsedMin < minMinutes) {
      const remaining = Math.ceil(minMinutes - elapsedMin)
      demoFail(409, rawUrl, `Minimum bakım süresi dolmadı — ${remaining} dk kaldı`, { remainingMinutes: remaining })
    }
    st[field] = now
    st.updatedAt = now
    return demoMaintenanceView()
  }
  if (path === '/api/maintenance/mode' && method === 'POST') {
    demoMaintenanceSetMode(u.searchParams.get('on') === 'true')
    return demoMaintenanceView()
  }
  if (path === '/api/maintenance/continue' && method === 'POST') {
    if (!st.isInMaintenanceMode) demoFail(409, rawUrl, 'Bakım modu açık değil')
    demoMaintenanceMode.reminderDueAt = Date.now() + demoMaintenanceTiming.reminderAfterMinutes * 60_000
    st.updatedAt = now
    return demoMaintenanceView()
  }
  if (path === '/api/maintenance/rules' && method === 'GET') return demoMaintenanceRulesView()
  if (path === '/api/maintenance/rules' && method === 'PUT') {
    // ADMIN+ — Bearer başlığı interceptor'a gelmiyor; demoAuth main'deki oturum token'ından doğrular (401/403)
    demoRequireRole(rawUrl, 'ADMIN')
    const rules = Array.isArray(b.rules) ? (b.rules as Record<string, unknown>[]) : []
    const updates: { periodKey: string; minDurationMinutes: number }[] = []
    for (const r of rules) {
      const key = String(r.periodKey ?? '').trim().toLowerCase()
      if (!demoMaintenanceRules.some((x) => x.periodKey === key)) {
        demoFail(400, rawUrl, `Geçersiz periodKey '${String(r.periodKey)}'. Beklenen: daily|weekly|monthly|six-monthly|twelve-monthly`)
      }
      const min = Number(r.minDurationMinutes)
      if (!Number.isInteger(min) || min < 1 || min > 1440) {
        demoFail(400, rawUrl, `${key} minimum süresi 1..1440 dk olmalı (gelen ${String(r.minDurationMinutes)})`)
      }
      updates.push({ periodKey: key, minDurationMinutes: min })
    }
    const rem = b.reminderAfterMinutes
    if (rem != null && (!Number.isInteger(rem) || (rem as number) < 15 || (rem as number) > 1440)) {
      demoFail(400, rawUrl, `reminderAfterMinutes 15..1440 olmalı (gelen ${String(rem)})`)
    }
    const ac = b.autoCloseAfterMinutes
    if (ac != null && (!Number.isInteger(ac) || (ac as number) < 1 || (ac as number) > 120)) {
      demoFail(400, rawUrl, `autoCloseAfterMinutes 1..120 olmalı (gelen ${String(ac)})`)
    }
    for (const up of updates) {
      const r = demoMaintenanceRules.find((x) => x.periodKey === up.periodKey)
      if (r) r.minDurationMinutes = up.minDurationMinutes
    }
    if (rem != null) demoMaintenanceTiming.reminderAfterMinutes = rem as number
    if (ac != null) demoMaintenanceTiming.autoCloseAfterMinutes = ac as number
    return demoMaintenanceRulesView()
  }
  return demoFail(404, rawUrl, 'Demo modunda desteklenmiyor')
}

const demoIdentity = {
  id: 1, serialNo: 'CRV-DEMO-001', customerName: 'Corventa',
  warrantyStartDate: '2026-01-01T00:00:00Z', warrantyEndDate: '2028-01-01T00:00:00Z', ownershipType: 'SATIS',
  customerCompany: null as string | null, customerTaxNo: null as string | null, customerPhone: null as string | null,
  customerEmail: null as string | null, customerAddress: null as string | null,
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
}

/** DEMO OTP — demo modunda e-posta gönderilmez, kod HER ZAMAN 123456'dır (yalnızca bu dosyada). */
const DEMO_OTP = '123456'
const DEMO_OTP_VALID_MS = 10 * 60_000
const DEMO_OTP_MAX_ATTEMPTS = 5
const DEMO_OTP_SENT_TO = 'de***@corventa.com'

const REASON_TO_OWNERSHIP: Record<string, string> = { SALE: 'SATIS', TRADE: 'TAKAS', GRANT: 'HIBE' }

type DemoChangeRequest = {
  requestId: string; reason: string; expiresAt: number; attempts: number
  status: 'Pending' | 'Confirmed' | 'Superseded'
  fields: {
    newCustomerName: string; newCustomerCompany: string | null; newCustomerTaxNo: string | null
    newCustomerPhone: string | null; newCustomerEmail: string | null; newCustomerAddress: string | null; note: string | null
  }
}

const demoChangeRequests = new Map<string, DemoChangeRequest>()
const DEMO_CUSTOMER_CHANGE_LOGS: Record<string, unknown>[] = []

function demoFail(status: number, rawUrl: string, error: string, extra: Record<string, unknown> = {}): never {
  throw new HttpError(status, rawUrl, error, { error, ...extra })
}

/** Boş/whitespace → null, aksi halde trim (backend gibi) */
/** Backend CustomerChangeController.LooksLikeEmail ile aynı kural (UI CustomerChangePage.isValidEmail de aynı) */
function demoLooksLikeEmail(s: string): boolean {
  const at = s.indexOf('@')
  return at > 0 && at === s.lastIndexOf('@') && s.indexOf('.', at) > at + 1 && !s.endsWith('.') && !s.includes(' ')
}

function demoOpt(v: unknown): string | null {
  const s = typeof v === 'string' ? v.trim() : ''
  return s ? s : null
}

function demoCustomerChangeRequest(rawUrl: string, b: Record<string, unknown>): unknown {
  const reason = String(b.reason ?? '').trim().toUpperCase()
  if (!REASON_TO_OWNERSHIP[reason]) demoFail(400, rawUrl, "reason 'SALE', 'TRADE' veya 'GRANT' olmalı (satış/takas/hibe)")
  const fields = {
    newCustomerName: demoOpt(b.newCustomerName) ?? '',
    newCustomerCompany: demoOpt(b.newCustomerCompany),
    newCustomerTaxNo: demoOpt(b.newCustomerTaxNo),
    newCustomerPhone: demoOpt(b.newCustomerPhone),
    newCustomerEmail: demoOpt(b.newCustomerEmail),
    newCustomerAddress: demoOpt(b.newCustomerAddress),
    note: demoOpt(b.note),
  }
  if (!fields.newCustomerName) demoFail(400, rawUrl, 'Yeni müşteri adı boş olamaz')
  const limits: [keyof typeof fields, number][] = [
    ['newCustomerName', 200], ['newCustomerCompany', 200], ['newCustomerTaxNo', 50], ['newCustomerPhone', 50],
    ['newCustomerEmail', 200], ['newCustomerAddress', 500], ['note', 1000],
  ]
  for (const [k, max] of limits) {
    if ((fields[k]?.length ?? 0) > max) demoFail(400, rawUrl, `${k} en fazla ${max} karakter olabilir`)
  }
  if (fields.newCustomerEmail && !demoLooksLikeEmail(fields.newCustomerEmail)) {
    demoFail(400, rawUrl, 'Yeni müşteri e-posta adresi geçersiz')
  }
  // Yeni talep → bekleyen eski talepler geçersiz (backend gibi)
  for (const r of demoChangeRequests.values()) if (r.status === 'Pending') r.status = 'Superseded'
  const requestId = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
  const expiresAt = Date.now() + DEMO_OTP_VALID_MS
  demoChangeRequests.set(requestId, { requestId, reason, expiresAt, attempts: 0, status: 'Pending', fields })
  log.info(`DEMO: müşteri değişikliği talebi — OTP ${DEMO_OTP}`, { requestId, reason })
  return { requestId, expiresAt: new Date(expiresAt).toISOString(), sentTo: DEMO_OTP_SENT_TO }
}

function demoCustomerChangeConfirm(rawUrl: string, b: Record<string, unknown>): unknown {
  const requestId = String(b.requestId ?? '').trim()
  const otp = String(b.otp ?? '').trim()
  if (!requestId || !otp) demoFail(400, rawUrl, 'requestId ve otp zorunlu')
  const r = demoChangeRequests.get(requestId)
  if (!r) return demoFail(404, rawUrl, 'Talep bulunamadı')
  if (r.status === 'Confirmed') demoFail(409, rawUrl, 'Bu talep zaten onaylandı')
  if (r.status === 'Superseded') demoFail(410, rawUrl, 'Bu talep geçersiz — daha yeni bir talep açıldı')
  if (Date.now() > r.expiresAt) demoFail(410, rawUrl, 'OTP süresi doldu — yeni talep açın')
  if (r.attempts >= DEMO_OTP_MAX_ATTEMPTS) demoFail(429, rawUrl, 'Deneme hakkı bitti — yeni talep açın', { remainingAttempts: 0 })
  if (otp !== DEMO_OTP) {
    r.attempts++
    const remaining = Math.max(0, DEMO_OTP_MAX_ATTEMPTS - r.attempts)
    if (remaining === 0) demoFail(429, rawUrl, 'OTP hatalı — deneme hakkı bitti, yeni talep açın', { remainingAttempts: 0 })
    demoFail(400, rawUrl, 'OTP hatalı', { remainingAttempts: remaining })
  }

  const now = new Date().toISOString()
  const newOwnership = REASON_TO_OWNERSHIP[r.reason]
  const change = {
    id: DEMO_CUSTOMER_CHANGE_LOGS.length + 1,
    requestId: r.requestId,
    reason: r.reason,
    oldCustomerName: demoIdentity.customerName,
    oldCustomerCompany: demoIdentity.customerCompany,
    oldCustomerTaxNo: demoIdentity.customerTaxNo,
    oldCustomerPhone: demoIdentity.customerPhone,
    oldCustomerEmail: demoIdentity.customerEmail,
    oldCustomerAddress: demoIdentity.customerAddress,
    oldOwnershipType: demoIdentity.ownershipType,
    ...r.fields,
    newOwnershipType: newOwnership,
    otpSentTo: DEMO_OTP_SENT_TO,
    changedAt: now,
  }
  Object.assign(demoIdentity, {
    customerName: r.fields.newCustomerName,
    customerCompany: r.fields.newCustomerCompany,
    customerTaxNo: r.fields.newCustomerTaxNo,
    customerPhone: r.fields.newCustomerPhone,
    customerEmail: r.fields.newCustomerEmail,
    customerAddress: r.fields.newCustomerAddress,
    ownershipType: newOwnership,
    updatedAt: now,
  })
  r.status = 'Confirmed'
  DEMO_CUSTOMER_CHANGE_LOGS.unshift(change)
  return { machineIdentity: { ...demoIdentity }, change }
}

// ─────────────────────────────────────────────────────────────
// Sertifika demo verisi (GET /api/certificates/{code})
// ─────────────────────────────────────────────────────────────

type DemoCertificate = {
  id: number; code: string; ownerName: string; ownerCompany: string | null; courseName: string
  certifiedBy: string; issuedAt: string; validUntil: string | null; createdAt: string
}

const DEMO_CERTIFICATES: readonly DemoCertificate[] = [
  { id: 1, code: 'CRV-2026-001', ownerName: 'Ahmet Yılmaz', ownerCompany: 'Demo Metal A.Ş.', courseName: 'Temel Operatör Eğitimi', certifiedBy: 'Corventa Teknik Eğitim', issuedAt: '2026-02-15T00:00:00Z', validUntil: '2028-02-15T00:00:00Z', createdAt: '2026-02-15T09:00:00Z' },
  { id: 2, code: 'CRV-2025-042', ownerName: 'Mehmet Demir', ownerCompany: null, courseName: 'İleri Seviye Bakım Eğitimi', certifiedBy: 'Corventa Teknik Eğitim', issuedAt: '2025-06-10T00:00:00Z', validUntil: null, createdAt: '2025-06-10T09:00:00Z' },
  { id: 3, code: 'CRV-2024-018', ownerName: 'Osman Şahin', ownerCompany: 'Demo Metal A.Ş.', courseName: 'Temel Operatör Eğitimi', certifiedBy: 'Corventa Teknik Eğitim', issuedAt: '2024-03-20T00:00:00Z', validUntil: '2026-03-20T00:00:00Z', createdAt: '2024-03-20T09:00:00Z' },
]

/** Kod ile demo sertifika — isExpired backend gibi istek anında hesaplanır (validUntil null = süresiz) */
function demoCertificate(code: string): (DemoCertificate & { isExpired: boolean }) | null {
  const c = DEMO_CERTIFICATES.find((x) => x.code === code)
  if (!c) return null
  return { ...c, isExpired: c.validUntil != null && new Date(c.validUntil).getTime() < Date.now() }
}

// ─────────────────────────────────────────────────────────────
// Kullanım süreleri demo verisi (GET /api/usage-time/summary)
// ─────────────────────────────────────────────────────────────

type DemoUsageMap = { PRESSURE: number; STANDBY: number; ERROR: number; MAINTENANCE: number; SERVICE: number }

/** Yerel tarih "yyyy-MM-dd" (backend'in gün anahtarı gibi) */
function localDateKey(d: Date): string {
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** Tarihten sabit sözde rastgele [0,1) — demo her açılışta aynı geçmişi gösterir */
function dayRand(key: string, salt: number): number {
  let h = 2166136261 ^ salt
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619)
  return ((h >>> 0) % 10_000) / 10_000
}

/** Bir günün sahte kullanımı (saniye). Pazar kapalı; bugün günün geçen kısmına göre ölçeklenir. */
function demoUsageDay(d: Date, fraction = 1): DemoUsageMap {
  const key = localDateKey(d)
  if (d.getDay() === 0) return { PRESSURE: 0, STANDBY: 0, ERROR: 0, MAINTENANCE: 0, SERVICE: 0 }
  const r = (salt: number): number => dayRand(key, salt)
  const scale = (sec: number): number => Math.round(sec * fraction)
  return {
    PRESSURE: scale(3 * 3600 + r(1) * 2.5 * 3600),
    STANDBY: scale(1.5 * 3600 + r(2) * 1.5 * 3600),
    ERROR: scale(r(3) < 0.35 ? 120 + r(4) * 1500 : 0),
    MAINTENANCE: scale(d.getDay() === 1 ? 1200 + r(5) * 1800 : 0),
    SERVICE: scale(r(6) < 0.06 ? 3600 + r(7) * 5400 : 0),
  }
}

function demoUsageSummary(days: number): unknown {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  // Bugün: 08:00-18:00 vardiyasının geçen kısmı kadar
  const hour = now.getHours() + now.getMinutes() / 60
  const todayFraction = Math.min(1, Math.max(0, (hour - 8) / 10))
  const daily: ({ date: string } & DemoUsageMap)[] = []
  const rangeTotals: DemoUsageMap = { PRESSURE: 0, STANDBY: 0, ERROR: 0, MAINTENANCE: 0, SERVICE: 0 }
  let todayMap: DemoUsageMap = { PRESSURE: 0, STANDBY: 0, ERROR: 0, MAINTENANCE: 0, SERVICE: 0 }
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)
    const m = demoUsageDay(d, i === 0 ? todayFraction : 1)
    daily.push({ date: localDateKey(d), ...m })
    for (const k of Object.keys(rangeTotals) as (keyof DemoUsageMap)[]) rangeTotals[k] += m[k]
    if (i === 0) todayMap = m
  }
  // Tüm zamanlar = aralık + kurulumdan beri sabit geçmiş (≈1 yıl)
  const base: DemoUsageMap = { PRESSURE: 1_150 * 3600, STANDBY: 640 * 3600, ERROR: 31 * 3600, MAINTENANCE: 48 * 3600, SERVICE: 19 * 3600 }
  const totals = { ...rangeTotals }
  for (const k of Object.keys(totals) as (keyof DemoUsageMap)[]) totals[k] += base[k]
  return {
    days,
    from: daily[0].date,
    to: daily[daily.length - 1].date,
    totals,
    rangeTotals,
    today: { ...todayMap },
    daily,
  }
}

export const demoMachine = new DemoMachine()
