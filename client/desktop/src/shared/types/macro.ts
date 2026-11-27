// EXCEL 28 — Usta öğrenme programı (makro).
// Backend: DataApi /api/macros (Macro + MacroStep tabloları). Oynatma UI'da mevcut hareket uçlarıyla yapılır.
//
// Eksen / adım tipi yazımı backend MacroAxes / MacroStepTypes sabitleriyle BİREBİR aynı:
//   Pistonlar (Left/Right/Upper/Lower)  → Position (mutlak mm)
//   Rotation                            → Position (mutlak mm) | Distance (işaretli bağıl mm)
//   PneumaticLeft / PneumaticRight      → Pneumatic (pnömatik encoder hedef değeri, hız yok)

export type MacroAxis =
  | 'Left'
  | 'Right'
  | 'Upper'
  | 'Lower'
  | 'Rotation'
  | 'PneumaticLeft'
  | 'PneumaticRight'

export type MacroStepType = 'Position' | 'Distance' | 'Pneumatic'

export const MACRO_AXES: MacroAxis[] = [
  'Left',
  'Right',
  'Upper',
  'Lower',
  'Rotation',
  'PneumaticLeft',
  'PneumaticRight',
]

export interface MacroStep {
  /** Kayıtlı adımda DB id'si; yeni (henüz kaydedilmemiş) adımda yok */
  id?: number
  stepOrder?: number
  axis: MacroAxis
  stepType: MacroStepType
  value: number
  /** 1..100 — pnömatikte 0 */
  speedPercent: number
}

export interface MacroSummary {
  id: number
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
  createdBy: string | null
  updatedBy: string | null
  /**
   * Kayıt bağlamı: kayıt anındaki aktif stage ve gönye durumu (MachineState.physicalInfo).
   * Piston değerleri gönye referanslı encoder değerleridir — oynatmada mevcut bağlamla karşılaştırılır.
   * null/yok = bilinmiyor (bu alan eklenmeden önce kaydedilmiş makro)
   */
  recordedStage?: number | null
  recordedGonyeCompleted?: boolean | null
  stepCount: number
}

export interface Macro extends MacroSummary {
  steps: MacroStep[]
}

/** POST / PUT gövdesi — adım sırası dizideki sıradır */
export interface MacroSaveBody {
  name: string
  description?: string | null
  steps: MacroStep[]
  /** Sadece kayıt (POST) gönderir; düzenleme (PUT) göndermezse backend mevcut değeri korur */
  recordedStage?: number | null
  recordedGonyeCompleted?: boolean | null
}

export function isPneumaticAxis(axis: MacroAxis): boolean {
  return axis === 'PneumaticLeft' || axis === 'PneumaticRight'
}

/** Eksene göre izin verilen adım tipleri (ilk eleman varsayılan) */
export function allowedStepTypes(axis: MacroAxis): MacroStepType[] {
  if (isPneumaticAxis(axis)) return ['Pneumatic']
  if (axis === 'Rotation') return ['Position', 'Distance']
  return ['Position']
}
