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
const ROTATION_SPEED = 320 // mm/s
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
      s1PressureBar: 42,
      s2PressureBar: 38,
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
    const rdiff = this.rotationTarget - s.rotation.positionMm
    const rstep = ROTATION_SPEED * (this.rotationSpeedPct / 100) * dt
    if (Math.abs(rdiff) <= Math.max(rstep, 0.05)) {
      s.rotation.positionMm = this.rotationTarget
      s.rotation.activeDirection = 0
      s.rotation.inPosition = true
    } else {
      s.rotation.positionMm += Math.sign(rdiff) * rstep
      s.rotation.activeDirection = rdiff > 0 ? 1 : -1
      s.rotation.inPosition = false
    }
    s.rotation.encoderRaw = Math.round(s.rotation.positionMm)

    // Basınç: hareket varken yükselir, dururken bekleme basıncına iner (görsel canlılık)
    const anyMoving = (Object.keys(this.targets) as PistonKey[]).some((k) => s[k].moving) || !s.rotation.inPosition
    const wantS1 = anyMoving ? 118 + Math.random() * 14 : 42 + Math.random() * 3
    s.sensors.s1PressureBar = Math.round(s.sensors.s1PressureBar + (wantS1 - s.sensors.s1PressureBar) * 0.3)
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
    await this.movePistons({ leftPiston: st.left, rightPiston: st.right, lowerPiston: st.lower, upperPiston: 0 }, token, Math.max(30, speedPct))
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

  private async clampAndZero(jobId: number, total: number, token: number): Promise<void> {
    this.setProgress(jobId, 0, total, 'Parça sıkıştırılıyor...')
    await this.movePistons({ upperPiston: CLAMP_UPPER_MM }, token, 60)
    await this.sleep(700, token)
    this.setProgress(jobId, 0, total, 'Parça sıfırlanıyor...')
    await this.rotateTo(this.state.rotation.positionMm - 260, token, 40)
    await this.rotateTo(this.state.rotation.positionMm + 120, token, 15)
    await this.sleep(500, token)
    this.state.rotation.positionMm = 0
    this.rotationTarget = 0
  }

  /** Gerçek push derinliği → ekranda gösterilecek encoder konumu (son hedef = MAX_PISTON_MM) */
  private displayMapper(pushMax: number, restOffset: number): (push: number) => number {
    const top = Math.max(MAX_PISTON_MM, restOffset + 20)
    return (push: number) => Math.max(restOffset + 5, top - (pushMax - push))
  }

  private async runCircle(job: DemoJob, st: (typeof STAGES)[number], token: number): Promise<void> {
    const base = { ball: BALL, thickness: job.profileA, center: CENTER_NORMAL, xa1: st.xa1, ya1: 0, theta: THETA }
    const push = calcPush({ ...base, diameter: job.targetDiameterMm }) ?? 280
    const contact = calcPush({ ...base, diameter: 200_000 }) ?? push - 40
    const step = job.stepDistanceMm > 0 ? job.stepDistanceMm : 10
    const pasoTargets: number[] = []
    let g = Math.min(push, contact + step * 0.5)
    pasoTargets.push(g)
    while (g < push - 0.01) {
      g = Math.min(push, g + step)
      pasoTargets.push(g)
    }
    const total = pasoTargets.length
    job.totalPasos = total
    const rotFar = Math.max(300, job.partLengthMm - 2 * (job.safetyMarginMm || 50))
    const disp = this.displayMapper(push, Math.max(st.left, st.right))
    const approach = disp(contact) - 25

    this.setProgress(job.id, 0, total, 'Büküm başlıyor...')
    await this.clampAndZero(job.id, total, token)
    // Yan toplar parçaya yaklaşır (temas öncesi)
    await this.movePistons({ leftPiston: approach, rightPiston: approach }, token, 80)

    let leftActive = true
    let rotAtFar = false
    for (let i = 0; i < total; i++) {
      const active: PistonKey = leftActive ? 'leftPiston' : 'rightPiston'
      const passive: PistonKey = leftActive ? 'rightPiston' : 'leftPiston'
      this.setProgress(job.id, i, total, `Paso ${i + 1} bükülüyor`)
      await this.movePistons({ [passive]: approach, [active]: disp(pasoTargets[i]) }, token, 60)
      const r = radiusFromPush(pasoTargets[i], base)
      this.setProgress(job.id, i, total, `Paso ${i + 1} bükülüyor`, { currentRadiusMm: r })
      await this.rotateTo(rotAtFar ? 0 : rotFar, token, 80)
      rotAtFar = !rotAtFar
      this.setProgress(job.id, i + 1, total, `Paso ${i + 1} tamamlandı`, { currentRadiusMm: r })
      await this.sleep(900, token)
      leftActive = !leftActive
    }
    this.setProgress(job.id, total, total, 'Geri esneme ölçülüyor...')
    await this.sleep(2500, token)
    this.setProgress(job.id, total, total, 'Büküm tamamlandı!')
    await this.movePistons({ upperPiston: 0, leftPiston: st.left, rightPiston: st.right }, token, 60)
  }

  private async runArc(job: DemoJob, st: (typeof STAGES)[number], token: number): Promise<void> {
    const segs = [...(job.segments ?? [])].sort((a, b) => a.segmentOrder - b.segmentOrder)
    const G = (job.arcStepDistanceMm ?? job.stepDistanceMm) || 15
    const plans = segs.map((seg, idx) => {
      const middle = idx === 0
      const center = middle ? CENTER_MIDDLE : CENTER_NORMAL
      const base = { ball: BALL, thickness: job.profileA, center, xa1: st.xa1, ya1: 0, theta: THETA }
      const push = calcPush({ ...base, diameter: seg.radiusMm * 2 }) ?? 250
      const contact = calcPush({ ...base, diameter: 200_000 }) ?? push - 30
      const steps = Math.max(1, Math.ceil((push - contact) / G))
      const nOdd = steps * 2 - 1
      // Backend ile aynı: L_yay = 2·π·R·(180−α)/360
      const arcLen = (2 * Math.PI * seg.radiusMm * (180 - seg.angleDeg)) / 360
      return { seg, middle, base, push, contact, steps, nOdd, arcLen }
    })
    const total = plans.reduce((a, p) => a + p.nOdd, 0)
    job.totalPasos = total
    const n = plans.length
    const pushMax = Math.max(...plans.map((p) => p.push), 1)
    const disp = this.displayMapper(pushMax, Math.max(st.left, st.right))
    const approachArc = disp(Math.min(...plans.map((p) => p.contact))) - 25

    this.setProgress(job.id, 0, total, 'Arc büküm başlatıldı', { completedSegmentOrder: 0, totalSegmentCount: n })
    await this.clampAndZero(job.id, total, token)

    let done = 0
    let rot = 0
    // Rotasyon parça boyunu aşmasın (backend safety guard: LT − safety)
    const maxRot = Math.max(300, job.partLengthMm - (job.safetyMarginMm || 50))
    const rotArc = (mm: number) => this.rotateTo(Math.min(maxRot, Math.max(-maxRot, mm)), token, 70)
    for (let i = 0; i < n; i++) {
      const p = plans[i]
      const order = i + 1
      const segExtra = { completedSegmentOrder: order - 1, totalSegmentCount: n }
      // Düzlük (Seg1'de leading straight)
      const straight = i === 0 ? p.seg.straightAfterMm : plans[i - 1].seg.straightAfterMm
      this.setProgress(job.id, done, total, `Seg${order} düzlük`, { ...segExtra, currentRadiusMm: null })
      if (straight > 0) {
        rot += straight
        await rotArc(rot)
      }
      // Aktif top: ilk segment Middle (sağ, iki top), diğerleri Normal (sol)
      const active: PistonKey = p.middle ? 'rightPiston' : 'leftPiston'
      const other: PistonKey = p.middle ? 'leftPiston' : 'rightPiston'
      await this.movePistons(p.middle ? { [active]: approachArc, [other]: approachArc } : { [active]: approachArc, [other]: approachArc - 15 }, token, 70)
      const legStart = rot
      let depth = p.contact
      for (let k = 1; k <= p.nOdd; k++) {
        const fwd = k % 2 === 1
        if (fwd) depth = Math.min(p.push, p.contact + G * ((k + 1) / 2))
        const label = `Seg${order} paso${k}/${p.nOdd} (${fwd ? 'fwd' : 'rew'}) [${active === 'leftPiston' ? 'Left' : 'Right'}] piston ${disp(depth).toFixed(1)}mm`
        this.setProgress(job.id, done, total, label, segExtra)
        if (fwd) {
          const t: Partial<Record<PistonKey, number>> = { [active]: disp(depth) }
          if (p.middle) t[other] = disp(Math.max(p.contact, depth - G / 2))
          await this.movePistons(t, token, 70)
          this.setProgress(job.id, done, total, label, { ...segExtra, currentRadiusMm: radiusFromPush(depth, p.base) })
        }
        await rotArc(fwd ? legStart + p.arcLen : legStart)
        done++
        this.setProgress(job.id, done, total, label, segExtra)
      }
      rot = legStart + p.arcLen
      await this.movePistons({ [active]: approachArc, [other]: approachArc }, token, 70)
      await this.sleep(400, token)
    }
    // Kalan düz kısım
    const tail = n > 0 ? plans[n - 1].seg.straightAfterMm : 0
    if (tail > 0) {
      this.setProgress(job.id, done, total, `Seg${n + 1} düzlük`, { completedSegmentOrder: n, totalSegmentCount: n, currentRadiusMm: null })
      await rotArc(rot + tail)
    }
    this.setProgress(job.id, total, total, 'Arc büküm tamamlandı', { completedSegmentOrder: n, totalSegmentCount: n })
    await this.movePistons({ upperPiston: 0, leftPiston: st.left, rightPiston: st.right }, token, 60)
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
      const contact = Math.max(0, target - 45)
      const totalPasos = Math.max(1, Math.ceil((target - contact) / step) + 1)
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
        this.rotationTarget = dir === 0 ? r.positionMm : r.positionMm + dir * 100_000
        this.rotationSpeedPct = Number(b.speedPercent) || 30
      } else if (m[1] === 'position') {
        this.rotationTarget = Number(b.position) || 0
      } else if (m[1] === 'distance') {
        this.rotationTarget = r.positionMm + (Number(b.distance) || 0)
      } else {
        this.rotationTarget = r.positionMm
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

  private abort(): void {
    this.runToken++
    for (const k of Object.keys(this.targets) as PistonKey[]) this.targets[k] = this.state[k].positionMm
    this.rotationTarget = this.state.rotation.positionMm
    if (this.activeJobId != null) {
      const id = this.activeJobId
      this.setProgress(id, this.progress?.completedPasos ?? 0, this.progress?.totalPasos ?? 0, 'İptal edildi')
    }
  }
}

export const demoMachine = new DemoMachine()
