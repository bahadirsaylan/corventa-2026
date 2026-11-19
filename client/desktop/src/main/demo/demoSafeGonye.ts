// DEMO — GÜVENLİ GÖNYE (2026-11-19). Gerçek Bending API ExecuteGonyeHandler + SafeGonyeRetract + RulerValidityTracker
// davranışının ekran gösterimi için sadeleştirilmiş kopyası (aynı mesaj metinleri, aynı karar tablosu).
//
// Senaryolar (sadece demo):
//   F6                           → Remote I/O yeniden başladı (tüm piston cetvelleri 0, toplar yerinde) → CETVELLER GEÇERSİZ
//   CORVENTA_DEMO_RIO_RESET=1    → demo bu durumda açılır (son kayıt: Stage 2 — sol/sağ 71,1 · alt 70,5 mm)
//   CORVENTA_DEMO_ENC_REVERSE=1  → Remote I/O sonrası sayaçlar TERS sayar (gönyede "SAYAÇ TERS" uyarısı)
//   CORVENTA_DEMO_OBSTACLE=Left:35 → İLK güvenli gönyede o top 35 mm sonra engele dayanır → 20 mm ileri, gönye başarısız
//   CORVENTA_DEMO_NO_LAST_POS=1  → son konum kaydı yok → kontrol listesi onayı istenir
// Durum: MachineState.rulerStatus (her tick). DemoMachine sadece adaptör verir; davranış bu dosyada.

import { app, globalShortcut } from 'electron'

import { HttpError } from '@main/lib/http'
import { getAuthUser } from '@main/services/auth/authSession'
import { ROLE_RANK } from '@shared/types'
import type { LastKnownPositionsInfo, RulerStatusInfo, SafeGonyePistonReport, SafeGonyeReport } from '@shared/types'

type PistonKey = 'leftPiston' | 'rightPiston' | 'upperPiston' | 'lowerPiston'
const KEYS: PistonKey[] = ['rightPiston', 'leftPiston', 'upperPiston', 'lowerPiston']
const NAME: Record<PistonKey, string> = { leftPiston: 'SOL TOP', rightPiston: 'SAĞ TOP', upperPiston: 'ÜST TOP', lowerPiston: 'ALT TOP' }
const ID: Record<PistonKey, number> = { rightPiston: 0, leftPiston: 1, upperPiston: 2, lowerPiston: 3 }
const ENV_NAME: Record<string, PistonKey> = { left: 'leftPiston', right: 'rightPiston', upper: 'upperPiston', lower: 'lowerPiston' }

const MSG: Record<string, string> = {
  APP_START: 'PROGRAM YENİ AÇILDI — REMOTE I/O KAPALI KALMIŞ OLABİLİR',
  RIO_RESET: 'REMOTE I/O YENİDEN BAŞLADI — SAYAÇLAR SIFIRLANDI',
  CONNECTION_LOST: 'PLC BAĞLANTISI KOPTU',
  SAFE_GONYE_FAILED: 'GÜVENLİ GÖNYE TAMAMLANMADI',
}

export interface DemoSafeGonyeHost {
  state: () => Record<string, unknown>
  /** Piston cetvelini (positionMm) ve hedefini anında ayarla (demo fiziği hareket ettirmesin) */
  setEncoder: (k: PistonKey, mm: number) => void
  settings: () => Record<string, unknown>
  /** demo hız çarpanı */
  speed: () => number
  /** Gönye sonrası gönye konumu + Stage 1 (gerçek handler'ın adım 2-6'sı) */
  finishGonye: () => Promise<void>
  sleep: (ms: number) => Promise<void>
}

const PISTON_SPEED = 28 // mm/s — DemoMachine ile aynı

export class DemoSafeGonye {
  private valid = process.env.CORVENTA_DEMO_RIO_RESET !== '1'
  private reason: string | null = this.valid ? null : 'RIO_RESET'
  private since: string | null = this.valid ? null : new Date().toISOString()
  private lastKnown: LastKnownPositionsInfo | null = null
  private reversed = false
  private running = false
  private report: SafeGonyeReport | null = null
  private obstacleOnce: string | undefined = process.env.CORVENTA_DEMO_OBSTACLE
  /** Geçersizken toplar fiziksel olarak nerede (mekanik limitten mm) — demo "gerçeği" */
  private physical: Record<PistonKey, number> = { leftPiston: 3.75, rightPiston: 3.75, upperPiston: 0, lowerPiston: 10.5 }

  constructor(private readonly host: DemoSafeGonyeHost) {
    if (process.env.CORVENTA_DEMO_NO_LAST_POS !== '1') {
      this.lastKnown = this.record({ leftPiston: 71.09, rightPiston: 71.09, upperPiston: 0, lowerPiston: 70.5 }, 2)
      this.lastKnown.savedAt = new Date(Date.now() - 14 * 3600_000).toISOString()
    }
    if (!this.valid) {
      this.physical = { leftPiston: 71.09, rightPiston: 71.09, upperPiston: 0, lowerPiston: 70.5 }
      this.reversed = process.env.CORVENTA_DEMO_ENC_REVERSE === '1'
    }
    void app.whenReady().then(() => {
      try { globalShortcut.register('F6', () => this.remoteIoReset()) } catch { /* kısayol alınamadı */ }
    })
  }

  /** Demo başlangıcında DemoMachine.start() sonra çağırır — geçersizse gönye bilgisi silinir */
  init(): void {
    if (!this.valid) this.invalidateGonye()
  }

  private record(pos: Record<PistonKey, number>, stage: number): LastKnownPositionsInfo {
    return {
      savedAt: new Date().toISOString(), ageDays: 0,
      leftMm: pos.leftPiston, rightMm: pos.rightPiston, upperMm: pos.upperPiston, lowerMm: pos.lowerPiston,
      stage, gonyeCompleted: true, usable: true, unusableReason: null, estimated: false,
    }
  }

  private livePhysical(): Record<PistonKey, number> {
    const s = this.host.state() as Record<string, { positionMm: number; gonyeOffsetMm: number }>
    const o = {} as Record<PistonKey, number>
    for (const k of KEYS) o[k] = Math.round(((s[k].gonyeOffsetMm ?? 0) + s[k].positionMm) * 100) / 100
    return o
  }

  private invalidateGonye(): void {
    const s = this.host.state() as { physicalInfo?: Record<string, unknown> }
    s.physicalInfo = { isGonyeCompleted: false, currentStage: 0, currentStageName: null }
  }

  /** F6 — Remote I/O yeniden başladı */
  remoteIoReset(): void {
    if (this.running) return
    if (this.valid) {
      this.physical = this.livePhysical()
      const pi = (this.host.state() as { physicalInfo?: { currentStage?: number } }).physicalInfo
      this.lastKnown = this.record(this.physical, pi?.currentStage ?? 0)
    }
    for (const k of KEYS) this.host.setEncoder(k, 0)
    this.reversed = process.env.CORVENTA_DEMO_ENC_REVERSE === '1'
    if (this.valid) {
      this.valid = false
      this.reason = 'RIO_RESET'
      this.since = new Date().toISOString()
    }
    this.invalidateGonye()
  }

  blockReason(): string | null {
    return this.valid ? null : `CETVELLER GEÇERSİZ — GÜVENLİ GÖNYE ALIN (${MSG[this.reason ?? ''] ?? 'CETVELLER GEÇERSİZ'})`
  }

  /** Her demo tick'i: rulerStatus yayını + geçerliyken son konum kaydı (durunca yaz benzeri) */
  applyTo(state: Record<string, unknown>): void {
    if (this.valid && !this.running) {
      const s = state as Record<string, { moving: boolean }>
      const still = KEYS.every((k) => !s[k].moving)
      const pi = (state as { physicalInfo?: { currentStage?: number; isGonyeCompleted?: boolean } }).physicalInfo
      if (still && pi?.isGonyeCompleted) {
        const live = this.livePhysical()
        const lk = this.lastKnown
        const changed = !lk || Math.abs(lk.leftMm - live.leftPiston) > 0.05 || Math.abs(lk.rightMm - live.rightPiston) > 0.05
          || Math.abs(lk.upperMm - live.upperPiston) > 0.05 || Math.abs(lk.lowerMm - live.lowerPiston) > 0.05
        if (changed) this.lastKnown = this.record(live, pi.currentStage ?? 0)
      }
    }
    const lk = this.lastKnown ? { ...this.lastKnown, ageDays: Math.round(((Date.now() - Date.parse(this.lastKnown.savedAt)) / 86_400_000) * 100) / 100 } : null
    const rs: RulerStatusInfo = {
      valid: this.valid,
      invalidReason: this.valid ? null : this.reason,
      invalidMessage: this.valid ? null : (MSG[this.reason ?? ''] ?? null),
      invalidSince: this.valid ? null : this.since,
      safeGonyeRunning: this.running,
      lastKnown: lk,
      safeGonye: this.report,
    }
    ;(state as { rulerStatus?: RulerStatusInfo }).rulerStatus = rs
  }

  private publish(r: SafeGonyeReport): void {
    this.report = JSON.parse(JSON.stringify(r)) as SafeGonyeReport
  }

  /** POST /api/preparation/gonye */
  async run(rawUrl: string, body: Record<string, unknown>): Promise<unknown> {
    if (this.running) throw new HttpError(400, rawUrl, 'Gönye zaten çalışıyor', { success: false, errorMessage: 'Gönye zaten çalışıyor' })
    const safe = (body.safe ?? {}) as { confirmNoObstacle?: boolean; ignoreExpected?: boolean; confirmedBy?: string | null }
    const cfg = this.host.settings()
    const tol = Number(cfg.safeGonyeToleranceMm ?? 10)
    const speedPct = Number(cfg.safeGonyeSpeedPercent ?? 100)
    const reliefMm = Number(cfg.safeGonyeReliefMm ?? 20)
    const stopOnOver = cfg.safeGonyeOvertravelAction === 'STOP'
    const r: SafeGonyeReport = {
      startedAt: new Date().toISOString(), finishedAt: null, state: 'RUNNING', mode: 'NORMAL', speedPercent: speedPct,
      toleranceMm: tol, overtravelAction: stopOnOver ? 'STOP' : 'WARN', confirmedBy: null, expectedSource: null,
      expectedSavedAt: null, message: null, errorCode: null, warnings: [], pistons: [], overrideAvailable: false,
    }
    const body0 = (ok: boolean, msg: string | null) => ({ success: ok, errorMessage: msg, operationName: 'Gönye', completedAt: new Date().toISOString(), safeGonye: r })

    // Beklenen
    let expected: Record<PistonKey, number | null>
    const lkUsable = this.lastKnown?.usable === true && (Date.now() - Date.parse(this.lastKnown.savedAt)) / 86_400_000 <= Number(cfg.safeGonyeMaxAgeDays ?? 30)
    const pi = (this.host.state() as { physicalInfo?: { isGonyeCompleted?: boolean } }).physicalInfo
    if (this.valid && pi?.isGonyeCompleted) {
      r.expectedSource = 'LIVE'
      expected = this.livePhysical()
      this.physical = { ...expected } as Record<PistonKey, number>
    } else if (lkUsable && this.lastKnown) {
      r.expectedSource = 'FILE'
      r.expectedSavedAt = this.lastKnown.savedAt
      expected = { leftPiston: this.lastKnown.leftMm, rightPiston: this.lastKnown.rightMm, upperPiston: this.lastKnown.upperMm, lowerPiston: this.lastKnown.lowerMm }
    } else {
      r.expectedSource = 'NONE'
      expected = { leftPiston: null, rightPiston: null, upperPiston: null, lowerPiston: null }
    }
    const user = getAuthUser()
    const who = user ? `${user.displayName || user.username} (${user.role})` : null
    if (safe.ignoreExpected) {
      if (!user || ROLE_RANK[user.role] < ROLE_RANK.SUPERVISOR) {
        const e = 'ENGEL UYARISINI YOK SAYMAK İÇİN ATÖLYE SORUMLUSU (SUPERVISOR) VEYA ÜSTÜ GİRİŞİ GEREKİR'
        throw new HttpError(403, rawUrl, e, { success: false, errorMessage: e, safeGonye: null })
      }
      r.mode = 'OVERRIDE'
      r.confirmedBy = who
      expected = { leftPiston: null, rightPiston: null, upperPiston: null, lowerPiston: null }
    } else if (r.expectedSource === 'NONE') {
      if (!safe.confirmNoObstacle) {
        r.state = 'CONFIRMATION_REQUIRED'
        r.errorCode = 'CONFIRMATION_REQUIRED'
        r.message = `BEKLENEN GERİ GİDİŞ BİLİNMİYOR (${this.lastKnown ? 'SON KONUM KAYDI 31 GÜNLÜK (EN FAZLA 30)' : 'SON KONUM KAYDI YOK'}) — TOPLARIN ARKASINDA ENGEL / ALET OLMADIĞINI KONTROL EDİP ONAYLAYIN`
        this.publish(r)
        throw new HttpError(409, rawUrl, r.message, body0(false, r.message))
      }
      r.mode = 'CONFIRMED'
      r.confirmedBy = who ?? '?'
    }

    // Engel (tek sefer)
    let obstacle: { k: PistonKey; mm: number } | null = null
    if (this.obstacleOnce && r.mode !== 'OVERRIDE') {
      const [n, v] = this.obstacleOnce.split(':')
      const k = ENV_NAME[(n ?? '').toLowerCase()]
      if (k && Number(v) > 0) obstacle = { k, mm: Number(v) }
      this.obstacleOnce = undefined
    }

    const start: Record<PistonKey, number> = {} as Record<PistonKey, number>
    const st = this.host.state() as Record<string, { positionMm: number }>
    for (const k of KEYS) {
      start[k] = st[k].positionMm
      r.pistons.push({
        piston: ID[k], name: NAME[k], expectedMm: expected[k] == null ? null : Math.round(expected[k]! * 100) / 100,
        travelMm: 0, encoderStartMm: start[k], encoderNowMm: start[k], directionReversed: false, stopped: false,
        result: 'MOVING', reliefMm: 0, note: null,
      })
    }
    const P = (k: PistonKey): SafeGonyePistonReport => r.pistons[KEYS.indexOf(k)]
    this.running = true
    this.report = null
    this.publish(r)
    const sign = this.reversed ? 1 : -1 // geri çekmede cetvel normalde azalır
    const travelLimit = (k: PistonKey) => (obstacle && obstacle.k === k ? Math.min(obstacle.mm, this.physical[k]) : this.physical[k])
    const stallTicks: Record<PistonKey, number> = { leftPiston: 0, rightPiston: 0, upperPiston: 0, lowerPiston: 0 }
    const finish = (ok: boolean, msg: string | null, code: string | null) => {
      r.state = ok ? 'OK' : 'FAILED'
      r.message = msg
      r.errorCode = code
      r.finishedAt = new Date().toISOString()
      this.running = false
      this.publish(r)
    }
    try {
      for (let tick = 0; tick < 600; tick++) {
        await this.host.sleep(100)
        const step = PISTON_SPEED * (speedPct / 100) * 0.1 * this.host.speed()
        const obstacles: PistonKey[] = []
        let fail: { code: string; msg: string } | null = null
        for (const k of KEYS) {
          const p = P(k)
          if (p.stopped) continue
          const lim = travelLimit(k)
          const nt = Math.min(lim, p.travelMm + step)
          const moved = nt - p.travelMm > 0.05
          p.travelMm = Math.round(nt * 100) / 100
          p.encoderNowMm = Math.round((start[k] + sign * p.travelMm) * 100) / 100
          this.host.setEncoder(k, p.encoderNowMm)
          if (sign > 0 && p.travelMm > 1 && !p.directionReversed) {
            p.directionReversed = true
            r.warnings.push(`${NAME[k]} SAYAÇ YÖNÜ TERS (geri çekilirken ileri sayıyor) — mesafe büyüklükle değerlendirildi`)
          }
          stallTicks[k] = moved ? 0 : stallTicks[k] + 1
          if (tick < 3 || stallTicks[k] < 3) continue
          p.stopped = true
          const e = p.expectedMm
          if (e == null) p.result = 'UNCHECKED'
          else if (p.travelMm < e - tol) { p.result = 'OBSTACLE'; obstacles.push(k) }
          else if (p.travelMm <= e + tol) p.result = 'OK'
          else if (stopOnOver) {
            p.result = 'OVERTRAVEL'
            fail = { code: 'OVERTRAVEL', msg: `${NAME[k]} BEKLENENDEN FAZLA GİTTİ — beklenen ≈${e.toFixed(0)} mm, gidilen ${p.travelMm.toFixed(0)} mm (FAZLA GİTME: DURDUR).` }
          } else {
            p.result = 'OVERTRAVEL_WARN'
            p.note = `${NAME[k]} BEKLENENDEN FAZLA GİTTİ — beklenen ≈${e.toFixed(0)} mm, gidilen ${p.travelMm.toFixed(0)} mm (cetvel / sayaç kaçırmış olabilir)`
            r.warnings.push(p.note)
          }
        }
        if (obstacles.length > 0) {
          for (const k of KEYS) if (!P(k).stopped) { P(k).stopped = true; P(k).result = 'STOPPED' }
          for (const k of KEYS) this.physical[k] = Math.max(0, this.physical[k] - P(k).travelMm)
          // Rahatlatma: engelli top İLERİ (cetvel geri çekmenin tersine)
          if (reliefMm > 0) {
            let moved = 0
            while (moved < reliefMm) {
              await this.host.sleep(100)
              moved = Math.min(reliefMm, moved + PISTON_SPEED * 2 * 0.1 * this.host.speed())
              for (const k of obstacles) {
                P(k).reliefMm = Math.round(moved * 10) / 10
                this.host.setEncoder(k, Math.round((start[k] + sign * P(k).travelMm - sign * moved) * 100) / 100)
              }
              this.publish(r)
            }
            for (const k of obstacles) {
              this.physical[k] += reliefMm
              P(k).note = `${reliefMm.toFixed(0)} mm İLERİ ALINDI (sıkışma kurtarıldı)`
            }
          }
          const k0 = obstacles[0]
          const p0 = P(k0)
          const msg = p0.reliefMm > 0.5
            ? `${NAME[k0]} ENGELE TAKILDI — ${p0.reliefMm.toFixed(0)} mm İLERİ ALINDI (sıkışma kurtarıldı). Beklenen ≈${(p0.expectedMm ?? 0).toFixed(0)} mm, gidilen ${p0.travelMm.toFixed(0)} mm — topun arkasını kontrol edin.`
            : `${NAME[k0]} GERİ ÇEKİLİRKEN ENGELE TAKILDI — beklenen ≈${(p0.expectedMm ?? 0).toFixed(0)} mm, gidilen ${p0.travelMm.toFixed(0)} mm. Topun arkasını kontrol edin.`
          r.overrideAvailable = true
          // Kalan beklenen (sonraki deneme): kayıt − gidilen + ileri (gerçekte elle hareket tahmini)
          if (this.lastKnown) {
            const lk = { ...this.lastKnown, estimated: true }
            lk.leftMm = this.physical.leftPiston; lk.rightMm = this.physical.rightPiston
            lk.upperMm = this.physical.upperPiston; lk.lowerMm = this.physical.lowerPiston
            this.lastKnown = lk
          }
          finish(false, msg, 'OBSTACLE')
          throw new HttpError(400, rawUrl, msg, body0(false, msg))
        }
        if (fail) {
          for (const k of KEYS) if (!P(k).stopped) { P(k).stopped = true; P(k).result = 'STOPPED' }
          finish(false, fail.msg, fail.code)
          throw new HttpError(400, rawUrl, fail.msg, body0(false, fail.msg))
        }
        this.publish(r)
        if (KEYS.every((k) => P(k).stopped)) break
      }
      // Adım 2-6 (sıfırla → ofset → sıfırla → gönye tamam)
      await this.host.finishGonye()
      this.valid = true
      this.reason = null
      this.since = null
      this.reversed = false
      this.physical = this.livePhysical()
      const pi2 = (this.host.state() as { physicalInfo?: { currentStage?: number } }).physicalInfo
      this.lastKnown = this.record(this.physical, pi2?.currentStage ?? 0)
      const msg = r.warnings.length > 0 ? 'GÜVENLİ GÖNYE TAMAMLANDI — UYARILAR VAR' : 'GÜVENLİ GÖNYE TAMAMLANDI'
      finish(true, msg, null)
      return body0(true, null)
    } finally {
      if (this.running) {
        this.running = false
        this.publish(r)
      }
    }
  }
}
