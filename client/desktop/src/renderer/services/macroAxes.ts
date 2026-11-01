// EXCEL 28 — makro eksenleri: ekran etiketi, birim, MachineState'ten anlık değer ve "hareket ediyor mu".
// Eksen adları backend MacroAxes ile birebir; piston IPC adları (left/right/upper/lower) EngineApiClient'la aynı.

import type {
  MachineState,
  MacroAxis,
  MacroStep,
  MacroStepType,
  PistonName,
  PneumaticSide,
} from '@shared/types'

type PistonKey = 'leftPiston' | 'rightPiston' | 'upperPiston' | 'lowerPiston'

export const AXIS_LABELS: Record<MacroAxis, string> = {
  Left: 'SOL PİSTON',
  Right: 'SAĞ PİSTON',
  Upper: 'ÜST PİSTON',
  Lower: 'ALT PİSTON',
  Rotation: 'ROTASYON',
  PneumaticLeft: 'SOL PNÖMATİK',
  PneumaticRight: 'SAĞ PNÖMATİK',
}

export const STEP_TYPE_LABELS: Record<MacroStepType, string> = {
  Position: 'KONUM',
  Distance: 'MESAFE',
  Pneumatic: 'PNÖMATİK',
}

export const PISTON_BY_AXIS: Partial<Record<MacroAxis, { name: PistonName; key: PistonKey }>> = {
  Left: { name: 'left', key: 'leftPiston' },
  Right: { name: 'right', key: 'rightPiston' },
  Upper: { name: 'upper', key: 'upperPiston' },
  Lower: { name: 'lower', key: 'lowerPiston' },
}

export const PNEUMATIC_BY_AXIS: Partial<Record<MacroAxis, PneumaticSide>> = {
  PneumaticLeft: 'left',
  PneumaticRight: 'right',
}

export function pistonAxis(name: PistonName): MacroAxis {
  return name === 'left' ? 'Left' : name === 'right' ? 'Right' : name === 'upper' ? 'Upper' : 'Lower'
}

export function pneumaticAxis(side: PneumaticSide): MacroAxis {
  return side === 'left' ? 'PneumaticLeft' : 'PneumaticRight'
}

/** Eksenin şu anki gerçek değeri (piston/rotasyon mm, pnömatik encoder) */
export function readAxisValue(state: MachineState, axis: MacroAxis): number {
  const piston = PISTON_BY_AXIS[axis]
  if (piston) return state[piston.key].positionMm
  if (axis === 'Rotation') return state.rotation.positionMm
  return axis === 'PneumaticLeft' ? state.leftPneumatic.encoderPosition : state.rightPneumatic.encoderPosition
}

/** Eksen hâlâ hareket ediyor mu (kayıtta son değeri yazmadan önce durması beklenir) */
export function isAxisMoving(state: MachineState, axis: MacroAxis): boolean {
  const piston = PISTON_BY_AXIS[axis]
  if (piston) return state[piston.key].moving
  if (axis === 'Rotation') return state.rotation.activeDirection !== 0
  return (axis === 'PneumaticLeft' ? state.leftPneumatic : state.rightPneumatic).activeDirection !== 0
}

/**
 * Kayıtta saklanan değer: piston 0.01 mm, rotasyon TAM mm (backend rotasyon hedefini tamsayı mm alır —
 * ekranda görülen ile oynatılan aynı olsun), pnömatik encoder tamsayı.
 */
export function roundAxisValue(axis: MacroAxis, value: number): number {
  if (axis === 'Rotation' || PNEUMATIC_BY_AXIS[axis]) return Math.round(value)
  return Math.round(value * 100) / 100
}

/** "Hareket yok" sayılan fark — kayıtta dokunup bırakılan (hareket etmeyen) eksen adım yazmaz */
export function axisEpsilon(axis: MacroAxis): number {
  if (axis === 'Rotation') return 0.5
  if (PNEUMATIC_BY_AXIS[axis]) return 1
  return 0.05
}

export function axisUnit(step: Pick<MacroStep, 'axis' | 'stepType'>): string {
  return step.stepType === 'Pneumatic' ? '' : 'mm'
}

/** Ekranda değer metni (Distance işaretli gösterilir) */
export function formatStepValue(step: Pick<MacroStep, 'axis' | 'stepType' | 'value'>): string {
  const decimals = step.axis === 'Rotation' || step.stepType === 'Pneumatic' ? 0 : 2
  const txt = step.value.toFixed(decimals)
  return step.stepType === 'Distance' && step.value > 0 ? `+${txt}` : txt
}

/** Electron IPC hatayı "Error invoking remote method '...': HttpError: ..." diye sarar → ön eki at */
export function macroErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? '')
  return raw.replace(/^Error invoking remote method '[^']*':\s*/, '').replace(/^(Http)?Error:\s*/, '')
}
