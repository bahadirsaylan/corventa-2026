// Manuel Bending — operatörün önceden tanımladığı adımlı kıvrım programı.
//
// NOT: Backend'de henüz "Program" entity'si yok (DataApi'ye sonra eklenecek).
// Şimdilik bu tipler hem mock store hem de gelecek DataApi entegrasyonu için
// kontrat olarak kullanılır.
//
// Step komut sözdizimi (SEKIL-24'ten):
//   A 150 / B 100 / S 300 / S -500 / X 180 / Y 220
//   "A 160  2 BAR" → çift parametre (mesafe + basınç)
// Komut tipleri:
//   A | B | S (signed mm) | X | Y (mm + opsiyonel BAR)

export type ManuelStepCommand = 'A' | 'B' | 'S' | 'X' | 'Y'

export interface ManuelProgramStep {
  stepNo: number // 1-indexed
  command: ManuelStepCommand
  /** Mesafe (mm) — S için negatif olabilir */
  distanceMm: number
  /** Opsiyonel basınç (bar) — bazı X/Y/A komutlarında */
  pressureBar?: number | null
  modifiedBy?: string | null
  modifiedAt?: string | null
}

export interface ManuelProgram {
  /** Program kodu — örn. M.22.08.0001 */
  programNo: string
  /** Operatörün verdiği isim — örn. "ÖZEL B PROFİL Ø900 KIVRIM" */
  name: string
  /** Hesaplanan/operatör tarafından girilmiş geometrik çap (Ø) */
  geometricDiameterMm: number
  createdAt: string
  updatedAt: string
  steps: ManuelProgramStep[]
}

// Step komutunu tek satır metne çevirir (UI'da göstermek için)
export function formatStep(step: ManuelProgramStep): string {
  const distance = step.distanceMm > 0 ? `${step.distanceMm}` : `${step.distanceMm}`
  const pressure = step.pressureBar != null ? `  ${step.pressureBar} BAR` : ''
  return `${step.command} ${distance}${pressure}`
}
