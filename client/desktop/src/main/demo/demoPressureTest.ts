// DEMO — BASINÇ DÜŞÜŞ TESTİ (Admin Ayarları > TEST, 2026-11-19). Bending API /api/pressure-drop-test/{start,stop,status}
// sözleşmesiyle birebir. Seçilen yan top güvenli ileri sınıra (demo kursu − 1 mm) sürülür; S2 temasa kadar düşük, temastan
// sonra yükselir, rastgele bir noktada aniden düşer (parça "kaydı"). Algılama kuralı backend PressureDropWindow ile aynı:
// pencere (windowMs) içindeki tepe ≥ minBaseBar VE tepe − şimdiki ≥ dropBar (S1 veya S2), en az 3 örnek.
// Eşikler yüksek girilirse (ör. düşüş eşiği 120 bar) kurs sonuna kadar ALGILANMADI sonucu görülür.
// Sadece bellek — dosya yazılmaz (csvPath demo yolu gösterir).

import type {
  PressureDropDetection,
  PressureDropTestSample,
  PressureDropTestState,
  PressureDropTestStatus,
} from '@shared'

type SideKey = 'leftPiston' | 'rightPiston'

export interface DemoPressureTestHost {
  /** cetvel konumu (mm) */
  position(key: SideKey): number
  inPosition(key: SideKey): boolean
  move(key: SideKey, targetMm: number, speedPercent: number): void
  stop(key: SideKey): void
  /** başlatmayı engelleyen durum (409 mesajı) — yoksa null */
  blocker(): string | null
  /** güvenli ileri sınır (mm) */
  forwardLimit(key: SideKey): number
  settings(): { dropBar: number; windowMs: number; minBaseBar: number }
  /** motor / acil stop sorunu — varsa test durur */
  safetyProblem(): string | null
  /** canlı S1/S2 (test çalışmıyorken durumda gösterilir — backend gibi) */
  pressures(): { s1: number; s2: number }
}

const MIN_SAMPLES = 3
const MAX_SAMPLES = 600

export class DemoPressureTest {
  private st: PressureDropTestStatus = DemoPressureTest.idle()
  private samples: PressureDropTestSample[] = []
  private window: { t: number; s1: number; s2: number }[] = []
  private startedAt = 0
  private contactMm = 0
  private dropMm = 0
  private lastSampleAt = 0
  private noise = 0

  constructor(private host: DemoPressureTestHost) {}

  private static idle(): PressureDropTestStatus {
    return {
      state: 'Idle', message: null, side: null, speedPercent: 0,
      dropBar: 0, windowMs: 0, minBaseBar: 0, settingsDropBar: 0, settingsWindowMs: 0, settingsMinBaseBar: 0,
      startPositionMm: 0, targetPositionMm: 0, elapsedMs: 0, currentPositionMm: null,
      s1: 0, s2: 0, peakS1: 0, peakS2: 0, dropS1: 0, dropS2: 0, maxDropS1: 0, maxDropS2: 0, maxS1: 0, maxS2: 0,
      detectedAt: null, endReason: null, sampleCount: 0, csvPath: null, startedAt: null, finishedAt: null, stopRequested: false,
      active: false, recentSamples: [],
    }
  }

  get active(): boolean {
    return this.st.state === 'Running'
  }

  private key(): SideKey {
    return this.st.side === 'Left' ? 'leftPiston' : 'rightPiston'
  }

  status(samples = 60): PressureDropTestStatus {
    const n = Math.max(0, Math.min(MAX_SAMPLES, Math.round(Number.isFinite(samples) ? samples : 60)))
    const live = this.st.state === 'Idle' ? this.host.pressures() : null
    return { ...this.st, ...(live ?? {}), recentSamples: n ? this.samples.slice(-n) : [] }
  }

  start(b: Record<string, unknown>, httpFail: (status: number, msg: string, body: unknown) => never): PressureDropTestStatus {
    const bad = (msg: string) => httpFail(400, msg, { success: false, errorMessage: msg, status: this.status() })
    const conflict = (msg: string) => httpFail(409, msg, { success: false, errorMessage: msg, status: this.status() })
    const side = b.side === 'Left' || b.side === 'Right' ? b.side : null
    if (!side) bad("Taraf 'Left' veya 'Right' olmalı")
    const speed = Number(b.speedPercent)
    if (!Number.isInteger(speed) || speed < 1 || speed > 100) bad('Hız %1-100 arası olmalı')
    const opt = (v: unknown) => (v === undefined || v === null || v === '' ? null : Number(v))
    const db = opt(b.dropBar), wm = opt(b.windowMs), mb = opt(b.minBaseBar)
    if (db != null && !(db >= 1 && db <= 250)) bad('Basınç düşüşü eşiği 1-250 bar arası olmalı')
    if (wm != null && !(wm >= 50 && wm <= 5000)) bad('Pencere 50-5000 ms arası olmalı')
    if (mb != null && !(mb >= 0 && mb <= 250)) bad('En düşük taban 0-250 bar arası olmalı')
    if (this.active) conflict('Basınç düşüş testi zaten çalışıyor')
    const blocked = this.host.blocker()
    if (blocked) conflict(blocked)

    const set = this.host.settings()
    const key: SideKey = side === 'Left' ? 'leftPiston' : 'rightPiston'
    const startPos = this.host.position(key)
    const target = Math.floor(this.host.forwardLimit(key) * 10) / 10
    if (target <= startPos + 1) conflict(`${side === 'Left' ? 'Sol' : 'Sağ'} top zaten ileri sınırda (${startPos.toFixed(1)} / ${target.toFixed(1)} mm)`)

    this.samples = []
    this.window = []
    this.startedAt = Date.now()
    this.lastSampleAt = 0
    this.contactMm = startPos + 8 + Math.random() * 6
    this.dropMm = this.contactMm + 15 + Math.random() * 15
    const stamp = new Date()
    const p2 = (n: number) => String(n).padStart(2, '0')
    this.st = {
      ...DemoPressureTest.idle(),
      state: 'Running',
      message: 'Top ileri gidiyor',
      side,
      speedPercent: speed,
      dropBar: db ?? set.dropBar,
      windowMs: wm ?? set.windowMs,
      minBaseBar: mb ?? set.minBaseBar,
      settingsDropBar: set.dropBar,
      settingsWindowMs: set.windowMs,
      settingsMinBaseBar: set.minBaseBar,
      startPositionMm: Math.round(startPos * 100) / 100,
      targetPositionMm: target,
      currentPositionMm: Math.round(startPos * 100) / 100,
      csvPath:
        `C:\\ProgramData\\Corventa\\logs\\pressure-drop-tests\\pdt-${stamp.getFullYear()}${p2(stamp.getMonth() + 1)}${p2(stamp.getDate())}-` +
        `${p2(stamp.getHours())}${p2(stamp.getMinutes())}${p2(stamp.getSeconds())}-${side === 'Left' ? 'Sol' : 'Sag'}.csv (DEMO)`,
      startedAt: stamp.toISOString(),
      active: true,
    }
    this.host.move(key, target, speed)
    return this.status()
  }

  stop(): boolean {
    if (!this.active) return false
    this.st.stopRequested = true
    this.finish('Stopped', 'Stopped', `Operatör durdurdu — ${this.maxDropText()}. Top durduruldu, geri çekilmedi.`)
    return true
  }

  /** DemoMachine tick'inden (100 ms) — basınçları senaryoya göre yazar, örnek alır, kararı verir. */
  onTick(sensors: { s1PressureBar: number; s2PressureBar: number }): void {
    if (!this.active) return
    const key = this.key()
    const x = this.host.position(key)
    this.noise = (this.noise + 1) % 3
    const s1 = 9 + this.noise
    sensors.s1PressureBar = s1
    const s2 = Math.round(this.s2At(x)) + this.noise - 1
    sensors.s2PressureBar = s2

    const now = Date.now()
    if (now - this.lastSampleAt < 90) return
    this.lastSampleAt = now
    const elapsedMs = now - this.startedAt

    // ---- backend PressureDropWindow ile aynı kural ----
    const st = this.st
    this.window.push({ t: now, s1, s2 })
    while (this.window.length && now - this.window[0].t > st.windowMs) this.window.shift()
    const peak1 = Math.max(...this.window.map((w) => w.s1))
    const peak2 = Math.max(...this.window.map((w) => w.s2))
    const ready = this.window.length >= MIN_SAMPLES
    const drop1 = ready && peak1 >= st.minBaseBar && peak1 - s1 >= st.dropBar
    const drop2 = ready && peak2 >= st.minBaseBar && peak2 - s2 >= st.dropBar

    const sample: PressureDropTestSample = {
      elapsedMs, positionMm: Math.round(x * 100) / 100, s1, s2, peakS1: peak1, peakS2: peak2, dropS1: peak1 - s1, dropS2: peak2 - s2,
    }
    this.samples.push(sample)
    if (this.samples.length > MAX_SAMPLES) this.samples.shift()
    st.elapsedMs = elapsedMs
    st.currentPositionMm = sample.positionMm
    st.s1 = s1
    st.s2 = s2
    st.peakS1 = peak1
    st.peakS2 = peak2
    st.dropS1 = sample.dropS1
    st.dropS2 = sample.dropS2
    if (ready) {
      st.maxDropS1 = Math.max(st.maxDropS1, sample.dropS1)
      st.maxDropS2 = Math.max(st.maxDropS2, sample.dropS2)
    }
    st.maxS1 = Math.max(st.maxS1, s1)
    st.maxS2 = Math.max(st.maxS2, s2)
    st.sampleCount++

    const safety = this.host.safetyProblem()
    if (safety) {
      this.finish('Failed', 'Safety', `${safety} — test durduruldu`)
      return
    }
    if (drop1 || drop2) {
      const sensor = drop1 ? 'S1' : 'S2'
      const det: PressureDropDetection = {
        elapsedMs, positionMm: sample.positionMm, sensor, fromBar: drop1 ? peak1 : peak2, toBar: drop1 ? s1 : s2, alsoOtherSensor: drop1 && drop2,
      }
      st.detectedAt = det
      this.finish(
        'Detected',
        'Drop',
        `BASINÇ DÜŞÜŞÜ ALGILANDI — ${sensor} ${det.fromBar}→${det.toBar} bar, ${det.positionMm.toFixed(1)} mm'de. Top durduruldu, geri çekilmedi.`,
      )
      return
    }
    if (elapsedMs >= 300 && this.host.inPosition(key) && Math.abs(x - st.targetPositionMm) <= 0.5) {
      this.finish('NotDetected', 'EndOfStroke', `KURS SONUNA KADAR ALGILANMADI (${x.toFixed(1)} mm) — ${this.maxDropText()}. Top durduruldu, geri çekilmedi.`)
    }
  }

  private s2At(x: number): number {
    const BASE = 14, RATE = 9, MAX = 185
    if (x < this.contactMm) return BASE
    if (x < this.dropMm) return Math.min(MAX, BASE + (x - this.contactMm) * RATE)
    const peak = Math.min(MAX, BASE + (this.dropMm - this.contactMm) * RATE)
    return Math.min(peak - 25, peak * 0.45 + (x - this.dropMm) * 1.5)
  }

  private maxDropText(): string {
    return `en büyük düşüş S1 ${this.st.maxDropS1} bar · S2 ${this.st.maxDropS2} bar`
  }

  private finish(state: PressureDropTestState, endReason: string, message: string): void {
    this.host.stop(this.key())
    this.st.state = state
    this.st.endReason = endReason
    this.st.message = message
    this.st.active = false
    this.st.finishedAt = new Date().toISOString()
  }
}
