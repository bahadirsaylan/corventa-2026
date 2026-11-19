// DEMO — BASINÇ DÜŞÜŞ TESTİ (Admin Ayarları > TEST, 2026-11-19). Bending API /api/pressure-drop-test/{start,stop,status}
// sözleşmesiyle birebir. Seçilen yan top güvenli ileri sınıra (demo kursu − 1 mm) sürülür; S2 temasa kadar düşük, temastan
// sonra yükselir, rastgele bir noktada aniden düşer (parça "kaydı"). Algılama kuralı backend PressureDropWindow ile aynı:
// pencere (windowMs) içindeki tepe ≥ minBaseBar VE tepe − şimdiki ≥ dropBar (2026-11-19: sadece S2), en az 3 örnek.
// Eşikler yüksek girilirse (ör. düşüş eşiği 120 bar) kurs sonuna kadar ALGILANMADI sonucu görülür.
// Sadece bellek — dosya yazılmaz (csvPath demo yolu gösterir). KAYITLAR (/api/pressure-drop-test/logs): biten koşular
// bellekte tutulur (en fazla 200) + açılışta 2 örnek koşu (biri ALGILANDI, biri ALGILANMADI).

import type {
  PressureDropDetection,
  PressureDropTestLogDetail,
  PressureDropTestLogSample,
  PressureDropTestLogSummary,
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
const MAX_LOG_SAMPLES = 3000 // 5 dk × 10 örnek/sn (backend zaman aşımı)
const MAX_RUNS = 200
const FILE_RE = /^pdt-\d{8}-\d{6}-(Sol|Sag)(-\d{1,3})?\.csv$/

const p2 = (n: number) => String(n).padStart(2, '0')
function fileNameOf(d: Date, side: 'Left' | 'Right'): string {
  return (
    `pdt-${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}-` +
    `${side === 'Left' ? 'Sol' : 'Sag'}.csv`
  )
}
/** yerel saat, ofsetli ISO (backend DateTimeOffset gibi) */
function localIso(d: Date): string {
  const off = -d.getTimezoneOffset()
  const sign = off >= 0 ? '+' : '-'
  return (
    `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}` +
    `${sign}${p2(Math.floor(Math.abs(off) / 60))}:${p2(Math.abs(off) % 60)}`
  )
}

/** S2 profili: temasa kadar düşük, sonra yükselir, dropMm'de aniden düşer (parça "kaydı") */
function rampProfile(contactMm: number, dropMm: number) {
  return (x: number): number => {
    const BASE = 14, RATE = 9, MAX = 185
    if (x < contactMm) return BASE
    if (x < dropMm) return Math.min(MAX, BASE + (x - contactMm) * RATE)
    const peak = Math.min(MAX, BASE + (dropMm - contactMm) * RATE)
    return Math.min(peak - 25, peak * 0.45 + (x - dropMm) * 1.5)
  }
}

/** Pencere kuralı (backend PressureDropWindow) ile örnek dizisi üretir; ilk algılamada / kurs sonunda biter. */
function synthRun(o: {
  startMm: number
  targetMm: number
  speedPercent: number
  dropBar: number
  windowMs: number
  minBaseBar: number
  s2At: (x: number) => number
}): { samples: PressureDropTestLogSample[]; det: PressureDropDetection | null } {
  const samples: PressureDropTestLogSample[] = []
  const win: { t: number; s1: number; s2: number }[] = []
  const mmPerTick = Math.max(0.15, o.speedPercent * 0.06)
  let x = o.startMm
  for (let i = 1; i <= MAX_LOG_SAMPLES; i++) {
    const t = i * 100 + ((i * 7) % 13)
    x = Math.min(o.targetMm, x + mmPerTick)
    const n = i % 3
    const s1 = 9 + n
    const s2 = Math.round(o.s2At(x)) + n - 1
    win.push({ t, s1, s2 })
    while (win.length && t - win[0].t > o.windowMs) win.shift()
    const pk1 = Math.max(...win.map((w) => w.s1))
    const pk2 = Math.max(...win.map((w) => w.s2))
    const ready = win.length >= MIN_SAMPLES
    const d1 = false // 2026-11-19: karar sadece S2 (backend PressureDropWindow ile aynı)
    const d2 = ready && pk2 >= o.minBaseBar && pk2 - s2 >= o.dropBar
    const pos = Math.round(x * 100) / 100
    samples.push({ elapsedMs: t, positionMm: pos, s1, s2, peakS1: pk1, peakS2: pk2, dropS1: pk1 - s1, dropS2: pk2 - s2, ready, detected: d1 || d2 })
    if (d1 || d2) {
      const det: PressureDropDetection = {
        elapsedMs: t, positionMm: pos, sensor: d1 ? 'S1' : 'S2', fromBar: d1 ? pk1 : pk2, toBar: d1 ? s1 : s2, alsoOtherSensor: d1 && d2,
      }
      return { samples, det }
    }
    if (x >= o.targetMm && i > 3) break
  }
  return { samples, det: null }
}

type SummaryBase = Omit<PressureDropTestLogSummary, 'maxDropS1' | 'maxDropS2' | 'maxS1' | 'maxS2' | 'sampleCount' | 'durationMs' | 'endPositionMm'>

/** Özet sayıları örneklerden (backend sonuç satırıyla aynı tanım: en büyük düşüş sadece karar verilebilir pencerede) */
function summarize(base: SummaryBase, samples: PressureDropTestLogSample[]): PressureDropTestLogSummary {
  const ready = samples.filter((s) => s.ready)
  const mx = (a: number[]) => a.reduce((m, v) => (v > m ? v : m), 0)
  return {
    ...base,
    endPositionMm: samples.length ? samples[samples.length - 1].positionMm : null,
    maxDropS1: mx(ready.map((s) => s.dropS1)),
    maxDropS2: mx(ready.map((s) => s.dropS2)),
    maxS1: mx(samples.map((s) => s.s1)),
    maxS2: mx(samples.map((s) => s.s2)),
    sampleCount: samples.length,
    durationMs: samples.length ? samples[samples.length - 1].elapsedMs : 0,
  }
}

export class DemoPressureTest {
  private st: PressureDropTestStatus = DemoPressureTest.idle()
  private samples: PressureDropTestSample[] = []
  private window: { t: number; s1: number; s2: number }[] = []
  private startedAt = 0
  private contactMm = 0
  private dropMm = 0
  private lastSampleAt = 0
  private noise = 0
  /** bu koşunun tüm örnekleri (KAYITLAR için; recentSamples en fazla 600) */
  private logSamples: PressureDropTestLogSample[] = []
  /** biten koşular — en yeni önce */
  private runs: PressureDropTestLogDetail[] = []

  constructor(private host: DemoPressureTestHost) {
    this.seedRuns()
  }

  /** Açılışta 2 örnek kayıt: dün ALGILANDI (sol, %20), bugün erken ALGILANMADI (sağ, %40, eşik 120 bar). */
  private seedRuns(): void {
    const now = Date.now()
    const mk = (d: Date, side: 'Left' | 'Right', speed: number, drop: number, s2At: (x: number) => number): PressureDropTestLogDetail => {
      const start = 3.75
      const target = 164
      const r = synthRun({ startMm: start, targetMm: target, speedPercent: speed, dropBar: drop, windowMs: 300, minBaseBar: 30, s2At })
      const sum = summarize(
        {
          fileName: fileNameOf(d, side), startedAt: localIso(d), side, speedPercent: speed, targetPositionMm: target, startPositionMm: start,
          dropBar: drop, windowMs: 300, minBaseBar: 30, minSamples: MIN_SAMPLES, settingsDropBar: 20, settingsWindowMs: 300,
          settingsMinBaseBar: 30, state: r.det ? 'Detected' : 'NotDetected', message: null, endReason: r.det ? 'Drop' : 'EndOfStroke',
          detectedAt: r.det,
        },
        r.samples,
      )
      sum.message = r.det
        ? `BASINÇ DÜŞÜŞÜ ALGILANDI — ${r.det.sensor} ${r.det.fromBar}→${r.det.toBar} bar, ${r.det.positionMm.toFixed(1)} mm'de. Top durduruldu, geri çekilmedi.`
        : `KURS SONUNA KADAR ALGILANMADI (${(sum.endPositionMm ?? 0).toFixed(1)} mm) — en büyük düşüş S2 ${sum.maxDropS2} bar. Top durduruldu, geri çekilmedi.`
      return { ...sum, samples: r.samples }
    }
    this.runs = [
      mk(new Date(now - 3 * 3600_000), 'Right', 40, 120, rampProfile(20, 70)),
      mk(new Date(now - 26 * 3600_000), 'Left', 20, 20, rampProfile(14, 38)),
    ]
  }

  /** GET /api/pressure-drop-test/logs — en yeni önce; çalışan koşu Running olarak başta */
  logs(): PressureDropTestLogSummary[] {
    const list: PressureDropTestLogSummary[] = this.runs.map(({ samples: _s, ...sum }) => sum)
    const cur = this.active ? this.currentRun() : null
    if (cur) {
      const { samples: _s, ...sum } = cur
      list.unshift(sum)
    }
    return list
  }

  /** GET /api/pressure-drop-test/logs/{fileName} */
  log(fileName: string, httpFail: (status: number, msg: string, body: unknown) => never): PressureDropTestLogDetail {
    if (!FILE_RE.test(fileName)) httpFail(400, 'Geçersiz kayıt adı', { errorMessage: 'Geçersiz kayıt adı' })
    const cur = this.active ? this.currentRun() : null
    const hit = cur?.fileName === fileName ? cur : this.runs.find((r) => r.fileName === fileName)
    if (!hit) return httpFail(404, 'Kayıt bulunamadı', { errorMessage: 'Kayıt bulunamadı' })
    return { ...hit, samples: [...hit.samples] }
  }

  private currentRun(): PressureDropTestLogDetail | null {
    const st = this.st
    if (!st.csvFileName || !st.side) return null
    const sum = summarize(
      {
        fileName: st.csvFileName, startedAt: st.startedAt ? localIso(new Date(st.startedAt)) : null, side: st.side,
        speedPercent: st.speedPercent, targetPositionMm: st.targetPositionMm, startPositionMm: st.startPositionMm, dropBar: st.dropBar,
        windowMs: st.windowMs, minBaseBar: st.minBaseBar, minSamples: MIN_SAMPLES, settingsDropBar: st.settingsDropBar,
        settingsWindowMs: st.settingsWindowMs, settingsMinBaseBar: st.settingsMinBaseBar, state: st.state,
        message: st.state === 'Running' ? null : st.message, endReason: st.endReason, detectedAt: st.detectedAt,
      },
      this.logSamples,
    )
    return { ...sum, samples: this.logSamples }
  }

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
    this.logSamples = []
    this.window = []
    this.startedAt = Date.now()
    this.lastSampleAt = 0
    this.contactMm = startPos + 8 + Math.random() * 6
    this.dropMm = this.contactMm + 15 + Math.random() * 15
    const stamp = new Date()
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
      csvFileName: fileNameOf(stamp, side === 'Left' ? 'Left' : 'Right'),
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
    const drop1 = false // 2026-11-19: karar sadece S2
    const drop2 = ready && peak2 >= st.minBaseBar && peak2 - s2 >= st.dropBar

    const sample: PressureDropTestSample = {
      elapsedMs, positionMm: Math.round(x * 100) / 100, s1, s2, peakS1: peak1, peakS2: peak2, dropS1: peak1 - s1, dropS2: peak2 - s2,
    }
    this.samples.push(sample)
    if (this.samples.length > MAX_SAMPLES) this.samples.shift()
    if (this.logSamples.length < MAX_LOG_SAMPLES) this.logSamples.push({ ...sample, ready, detected: drop1 || drop2 })
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
    return `en büyük düşüş S2 ${this.st.maxDropS2} bar`
  }

  private finish(state: PressureDropTestState, endReason: string, message: string): void {
    this.host.stop(this.key())
    this.st.state = state
    this.st.endReason = endReason
    this.st.message = message
    this.st.active = false
    this.st.finishedAt = new Date().toISOString()
    const run = this.currentRun()
    if (run) {
      // aynı saniyede ikinci koşu (backend'de dosya açılamazdı) — demoda eskisinin yerine geçer
      this.runs = [{ ...run, samples: [...run.samples] }, ...this.runs.filter((r) => r.fileName !== run.fileName)].slice(0, MAX_RUNS)
    }
  }
}
