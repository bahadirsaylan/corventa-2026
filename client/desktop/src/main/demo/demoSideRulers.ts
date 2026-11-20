// DEMO — yan dayama cetvelleri (2026-11-19). Gerçek backend SimSideSupportRulers ile aynı davranış:
// yan dayama komutu (ileri / geri) aktifken cetvel 25 mm/sn ilerler / geri gelir, strok uçlarında durur.
// Ham değer VARSAYILAN kalibrasyonla üretilir (PLC gibi 0..4095); mm Admin Ayarları'ndaki kalibrasyonla hesaplanır
// (EN GERİ / EN İLERİ DEĞERİ KAYDET + KAYDET denenebilsin). CORVENTA_DEMO_NO_SIDE_RULERS=1 → eski PLC gibi "yok".

import type { MachineState, SideSupportRulerState, SideSupportRulersState, SideSupportSide, SideSupportType } from '@shared/types'
import { SIDE_RULERS, sideRulerDisplayMmToRaw, sideRulerKey, sideRulerSettingKeys, sideRulerToMm, type SideRulerKey } from '@shared/sideRulers'

const SPEED_MM_PER_SEC = 25
const START_MM: Record<SideRulerKey, number> = {
  rightBody: 20, leftBody: 20, rightReel: 50, leftReel: 50, rightJoint: 30, leftJoint: 30,
}
const DISABLED = process.env.CORVENTA_DEMO_NO_SIDE_RULERS === '1'

export class DemoSideRulers {
  private pos: Record<SideRulerKey, number> = { ...START_MM }
  private dir: Record<SideRulerKey, number> = {
    rightBody: 0, leftBody: 0, rightReel: 0, leftReel: 0, rightJoint: 0, leftJoint: 0,
  }

  // (2026-11-20) konum modu (PLC FB_SideSupportPosition benzetimi): fiziksel hedef mm + durum
  private target: Partial<Record<SideRulerKey, { posMm: number; displayMm: number }>> = {}
  private posState: Record<SideRulerKey, number> = {
    rightBody: 0, leftBody: 0, rightReel: 0, leftReel: 0, rightJoint: 0, leftJoint: 0,
  }

  /** /api/side-support/{side}/{type}/{forward|backward|stop} */
  command(side: SideSupportSide, type: SideSupportType, action: string): void {
    const k = sideRulerKey(side, type)
    this.dir[k] = action === 'forward' ? 1 : action === 'backward' ? -1 : 0
    delete this.target[k]
    this.posState[k] = 0
  }

  /** Gönyede hepsi en geriye (backend RetractSideSupportsAsync gibi — strok ucunda kendiliğinden durur) */
  retractAll(): void {
    for (const r of SIDE_RULERS) this.command(r.side, r.type, 'backward')
  }

  /** /api/side-support/{side}/{type}/position { mm } — null = başarılı, string = hata */
  moveTo(side: SideSupportSide, type: SideSupportType, mm: number, settings: Record<string, unknown>): string | null {
    if (DISABLED) return "YAN DAYAMA KONUM KONTROLÜ PLC'DE YOK"
    const k = sideRulerKey(side, type)
    const def = SIDE_RULERS.find((r) => r.key === k)!
    const sk = sideRulerSettingKeys(k)
    const num = (key: string, d: number) => (Number.isFinite(Number(settings[key])) ? Number(settings[key]) : d)
    const stroke = num(sk.strokeMm, def.strokeMm)
    const raw = sideRulerDisplayMmToRaw(mm, num(sk.rawMin, def.rawMin), num(sk.rawMax, def.rawMax), stroke, num(sk.offsetMm, 0))
    if (raw == null) return `hedef ${mm} mm strok dışında`
    // ham → demo fiziksel konum (varsayılan = "gerçek" kalibrasyon)
    const posMm = ((raw - def.rawMin) / (def.rawMax - def.rawMin)) * def.strokeMm
    this.target[k] = { posMm: Math.max(0, Math.min(def.strokeMm, posMm)), displayMm: mm }
    this.dir[k] = 0
    this.posState[k] = 1
    return null
  }

  tick(dtSec: number, state: MachineState, settings: Record<string, unknown>): void {
    const out = {} as SideSupportRulersState
    for (const r of SIDE_RULERS) {
      const tg = this.target[r.key]
      if (tg && this.posState[r.key] === 1) {
        const err = tg.posMm - this.pos[r.key]
        const stepMm = SPEED_MM_PER_SEC * dtSec
        if (Math.abs(err) <= Math.max(0.3, stepMm)) {
          this.pos[r.key] = tg.posMm
          this.posState[r.key] = 2
        } else {
          this.pos[r.key] += Math.sign(err) * stepMm
        }
      }
      const d = this.dir[r.key]
      if (d !== 0) {
        const next = Math.max(0, Math.min(r.strokeMm, this.pos[r.key] + d * SPEED_MM_PER_SEC * dtSec))
        this.pos[r.key] = next
        if (next <= 0 || next >= r.strokeMm) this.dir[r.key] = 0
      }
      const k = sideRulerSettingKeys(r.key)
      const num = (key: string, def: number) => {
        const v = Number(settings[key])
        return Number.isFinite(v) ? v : def
      }
      // PLC ham değeri: fiziksel konum + varsayılan (gerçek) kalibrasyon, küçük gürültü
      const raw = Math.round(
        Math.min(4095, Math.max(0, r.rawMin + (this.pos[r.key] / r.strokeMm) * (r.rawMax - r.rawMin) + Math.random() * 2)),
      )
      const stroke = num(k.strokeMm, r.strokeMm)
      const offsetMm = num(k.offsetMm, 0)
      const calibratedMm = DISABLED ? 0 : sideRulerToMm(raw, num(k.rawMin, r.rawMin), num(k.rawMax, r.rawMax), stroke)
      const st: SideSupportRulerState = {
        raw: DISABLED ? 0 : raw,
        calibratedMm,
        // ofset sonrası 0'a kırpılmaz (backend ile aynı)
        mm: DISABLED ? 0 : Math.round((calibratedMm - offsetMm) * 100) / 100,
        offsetMm,
        available: !DISABLED,
        calibrated: settings[k.calibrated] === undefined ? r.calibrated : settings[k.calibrated] === true,
        strokeMm: stroke,
        positionState: DISABLED ? -1 : this.posState[r.key],
        targetMm: this.target[r.key]?.displayMm ?? null,
      }
      out[r.key] = st
    }
    state.sideSupportRulers = out
  }
}
