// Yan dayama cetvelleri (2026-11-19) — 6 lineer potansiyometre (GT-3118 4-20 mA, 12-bit 0..4095).
// Backend: Core/Models/SideSupportRulers.cs (MachineState.sideSupportRulers) + MachineSettings <key>RulerRawMin/RawMax/StrokeMm/Calibrated.
// Adlar FİZİKSEL (2026-11-20 akşam makinede: yatay tuş gövde, eğik mafsal — PLC adları ters; eşleme backend SideSupportPlcMap).
// Konuma gönderme: POST /api/side-support/{side}/{type}/position (PLC FB_SideSupportPosition).

import type { SideSupportSide, SideSupportType } from './types/api'

export type SideRulerKey = 'rightBody' | 'leftBody' | 'rightReel' | 'leftReel' | 'rightJoint' | 'leftJoint'

export interface SideRulerDef {
  key: SideRulerKey
  side: SideSupportSide
  type: SideSupportType
  /** Ekran adı (Türkçe kaynak, t() ile çevrilir) */
  label: string
  /** Varsayılan kalibrasyon (IO listesi; sol taraf ölçülmedi → sağ eşi) */
  rawMin: number
  rawMax: number
  strokeMm: number
  calibrated: boolean
}

// 2026-11-28: mafsal ↔ gövde varsayılanları backend SideSupportRulerCalibration ile birlikte çevrildi (gövde 129 mm, mafsal 187 mm)
export const SIDE_RULERS: SideRulerDef[] = [
  { key: 'rightBody', side: 'right', type: 'body', label: 'SAĞ GÖVDE', rawMin: 698, rawMax: 2806, strokeMm: 129, calibrated: true },
  { key: 'leftBody', side: 'left', type: 'body', label: 'SOL GÖVDE', rawMin: 698, rawMax: 2806, strokeMm: 129, calibrated: false },
  { key: 'rightReel', side: 'right', type: 'reel', label: 'SAĞ MAKARA', rawMin: 400, rawMax: 4021, strokeMm: 352, calibrated: true },
  { key: 'leftReel', side: 'left', type: 'reel', label: 'SOL MAKARA', rawMin: 400, rawMax: 4021, strokeMm: 352, calibrated: false },
  { key: 'rightJoint', side: 'right', type: 'joint', label: 'SAĞ MAFSAL', rawMin: 365, rawMax: 3425, strokeMm: 187, calibrated: true },
  { key: 'leftJoint', side: 'left', type: 'joint', label: 'SOL MAFSAL', rawMin: 365, rawMax: 3425, strokeMm: 187, calibrated: false },
]

export const SIDE_RULER_RAW_LIMIT = 4095

export function sideRulerKey(side: SideSupportSide, type: SideSupportType): SideRulerKey {
  return `${side}${type.charAt(0).toUpperCase()}${type.slice(1)}` as SideRulerKey
}

/** MachineSettings alan adları (camelCase) */
export const sideRulerSettingKeys = (k: SideRulerKey) => ({
  rawMin: `${k}RulerRawMin`,
  rawMax: `${k}RulerRawMax`,
  strokeMm: `${k}RulerStrokeMm`,
  calibrated: `${k}RulerCalibrated`,
  offsetMm: `${k}RulerOffsetMm`,
})

/** Backend ile aynı: mm = clamp((raw − rawMin) / (rawMax − rawMin) × strok, 0..strok); ters aralık desteklenir. */
export function sideRulerToMm(raw: number, rawMin: number, rawMax: number, strokeMm: number): number {
  if (rawMax === rawMin || !(strokeMm > 0)) return 0
  const mm = ((raw - rawMin) / (rawMax - rawMin)) * strokeMm
  if (!Number.isFinite(mm)) return 0
  return Math.round(Math.min(strokeMm, Math.max(0, mm)) * 100) / 100
}

/** PLC konum durumu (MachineState.sideSupportRulers.*.positionState) — Türkçe kaynak, t() ile çevrilir */
export function sideSupportPosStateText(s: number | undefined): string {
  switch (s) {
    case 0: return 'ELLE'
    case 1: return 'HAREKET'
    case 2: return 'HEDEFTE'
    case 3: return 'SÜRE AŞIMI'
    case 4: return 'TAKILDI / CETVEL HATASI'
    case 5: return 'GÜVENLİK — DURDU'
    default: return "PLC'DE YOK"
  }
}

/** Gösterilen mm (ofset dahil) → ham (backend DisplayMmToRaw ile aynı). Strok dışı → null. */
export function sideRulerDisplayMmToRaw(mm: number, rawMin: number, rawMax: number, strokeMm: number, offsetMm: number): number | null {
  if (rawMax === rawMin || !(strokeMm > 0) || !Number.isFinite(mm)) return null
  const cal = mm + offsetMm
  if (cal < -0.01 || cal > strokeMm + 0.01) return null
  const raw = rawMin + (Math.min(strokeMm, Math.max(0, cal)) / strokeMm) * (rawMax - rawMin)
  return Math.round(Math.min(4095, Math.max(0, raw)))
}

/** Demo: varsayılan ayar alanları (DataApi migration varsayılanlarıyla aynı) */
export function defaultSideRulerSettings(): Record<string, number | boolean> {
  const out: Record<string, number | boolean> = {}
  for (const r of SIDE_RULERS) {
    const k = sideRulerSettingKeys(r.key)
    out[k.rawMin] = r.rawMin
    out[k.rawMax] = r.rawMax
    out[k.strokeMm] = r.strokeMm
    out[k.calibrated] = r.calibrated
    out[k.offsetMm] = 0
  }
  return out
}
