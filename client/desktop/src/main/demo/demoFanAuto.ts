// DEMO — OTOMATİK FAN + yağ sıcaklığı ısıl modeli (2026-11-19). Gerçek backend FanAutoController ile aynı kural:
//   yağ ≥ FAN AÇMA SICAKLIĞI ve fan kapalı → fan AÇ (otomatik); yağ ≤ FAN KAPATMA SICAKLIĞI, fanı otomatik açtıysa ve
//   EN AZ AÇIK KALMA SÜRESİ dolduysa → fan KAPAT. Elle açılan fan otomatik kapatılmaz; elle kapatılınca 10 dk açılmaz.
//   Acil stop / fan termik → hiçbir komut yok. Durum değişince "FanAuto" (info) olayı yayınlanır (MAKİNE DEĞERLERİ rozeti).
// Isıl model sadece OTOMATİK FAN açıkken çalışır (kapalıyken eski 38–46 °C rastgele yürüyüş aynen):
//   motor çalışırken +0,25 °C/sn (demo hız çarpanıyla), fan açıkken −0,4 °C/sn → eşikler arasında gidip gelir.
// CORVENTA_DEMO_FAN_AUTO=1 → demo OTOMATİK FAN açık başlar (fan kapalı, yağ 40 °C, en az açık kalma 20 sn — sunum için).

import type { MachineEvent, MachineState } from '@shared/types'

const MANUAL_OFF_HOLD_MS = 10 * 60_000
const RISE_PER_SEC = 0.25
const FAN_COOL_PER_SEC = 0.4

export const DEMO_FAN_AUTO_START = process.env.CORVENTA_DEMO_FAN_AUTO === '1'

type Override = 'none' | 'manualOn' | 'manualOffHold'

export class DemoFanAuto {
  private temp: number | null = null
  private autoOwned = false
  private autoOnSince: number | null = null
  private override: Override = 'none'
  private holdUntil: number | null = null
  private lastAction: 'on' | 'off' | null = null
  private lastActionAt: number | null = null
  private lastActionReason: string | null = null
  private lastKey = ''

  /** /api/machine/fan — elle komut (otomatikten önceliklidir) */
  onManual(on: boolean): void {
    this.autoOwned = false
    this.autoOnSince = null
    this.override = on ? 'manualOn' : 'manualOffHold'
    this.holdUntil = on ? null : Date.now() + MANUAL_OFF_HOLD_MS
  }

  /** Her demo tick'inde (dtSec = demo hız çarpanı dahil). Yağ sıcaklığını ve fanı günceller. */
  tick(dtSec: number, s: MachineState, cfg: Record<string, unknown>, emit: (evt: MachineEvent) => void): void {
    const enabled = cfg.fanAutoEnabled === true
    const onC = Number(cfg.fanOnTempC ?? 45)
    const offC = Number(cfg.fanOffTempC ?? 40)
    const minOnSec = Number(cfg.fanMinOnSeconds ?? 120)
    const now = Date.now()

    if (this.override === 'manualOffHold' && this.holdUntil != null && now >= this.holdUntil) {
      this.override = 'none'
      this.holdUntil = null
    }
    if (this.override === 'manualOn' && !s.fanActive) this.override = 'none'

    const speed = Math.max(1, dtSec / 0.1) // demo tick 100 ms × hız çarpanı
    let condition = 'disabled'
    if (enabled) {
      // Isıl model (sadece otomatik açıkken)
      if (this.temp == null) this.temp = s.sensors.oilTempC
      let rate = 0
      if (s.hydraulicMotorState === 2) rate += RISE_PER_SEC
      if (s.fanActive) rate -= FAN_COOL_PER_SEC
      this.temp = Math.max(20, Math.min(90, this.temp + rate * dtSec))
      s.sensors.oilTempC = Math.round(this.temp)

      const sf = s.safety
      if (!sf.emergencyStopOK || !sf.fanThermalOK) {
        condition = 'safetyStop'
      } else {
        condition = 'active'
        const t = s.sensors.oilTempC
        if (s.fanActive && !this.autoOwned && this.override === 'none') this.override = 'manualOn'
        if (!s.fanActive && this.override !== 'manualOffHold' && t >= onC) {
          s.fanActive = true
          this.autoOwned = true
          this.autoOnSince = now
          this.override = 'none'
          this.action('on', `yağ ${t}°C ≥ açma eşiği ${onC}°C`, now)
        } else if (s.fanActive && this.autoOwned && t <= offC && now - (this.autoOnSince ?? now) >= (minOnSec * 1000) / speed) {
          // en az açık kalma süresi demo hız çarpanıyla (F9) kısalır
          s.fanActive = false
          this.autoOwned = false
          this.autoOnSince = null
          this.action('off', `yağ ${t}°C ≤ kapatma eşiği ${offC}°C`, now)
        }
      }
    } else {
      this.temp = null
      this.autoOwned = false
      this.autoOnSince = null
    }

    const key = [enabled, onC, offC, minOnSec, this.autoOwned, this.override, condition, s.fanActive, this.lastActionAt].join('|')
    if (key === this.lastKey) return
    this.lastKey = key
    emit({
      messageType: 'info',
      eventType: 'FanAuto',
      timestamp: new Date(now).toISOString(),
      payload: {
        enabled, onTempC: onC, offTempC: offC, minOnSeconds: minOnSec,
        autoOwned: this.autoOwned,
        autoOnSince: this.autoOnSince ? new Date(this.autoOnSince).toISOString() : null,
        override: this.override,
        holdUntil: this.holdUntil ? new Date(this.holdUntil).toISOString() : null,
        condition,
        oilTempC: s.sensors.oilTempC,
        fanOn: s.fanActive,
        lastAction: this.lastAction,
        lastActionAt: this.lastActionAt ? new Date(this.lastActionAt).toISOString() : null,
        lastActionReason: this.lastActionReason,
      },
    })
  }

  /** Otomatik açıkken demo ısıl modeli yağ sıcaklığını yönetir (rastgele yürüyüş devre dışı) */
  get controlsTemperature(): boolean {
    return this.temp != null
  }

  private action(a: 'on' | 'off', reason: string, now: number): void {
    this.lastAction = a
    this.lastActionAt = now
    this.lastActionReason = reason
  }
}
