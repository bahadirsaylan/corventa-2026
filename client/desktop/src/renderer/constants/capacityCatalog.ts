// Kapasite kataloğu — KAPASITE_KATALOGU_KADIR.xlsx (makine kapasitesi 200 kN baz alınır).
//
// Ölçü ekranında İLERİ öncesi kontrol (şimdilik sadece LAMA + ÇEMBER):
//   1. Min. çap      — Ø < Makine Min.  → ENGELLER
//   2. Deformasyon   — Ø < Kesit Min.   → UYARIR (operatör yine de devam edebilir)
//   3. Pekleşme      — Mph > 30 kNm iken adım (G) > 30 mm → ENGELLER
// Katalogda 200 kN'da ✗ olan satırlar (kapasite yetersiz) doğrudan engellenir.
// Yön: yön ekranındaki yatay seçim (left) = KOLAY, dikine/kılıcına seçim (right) = ZOR.

import type { BendingDirectionId, BendingProfileId } from '@/store/bendingJobStore'

export type CapacityAxis = 'kolay' | 'zor'

interface CapacityRow {
  /** Profil genişliği (mm) — 80×10'daki 80 */
  width: number
  /** Profil kalınlığı (mm) — 80×10'daki 10 */
  thickness: number
  axis: CapacityAxis
  /** 200 kN ile bükülebilir mi (katalogda 465/495 ✓) */
  capable: boolean
  /** Ø Makine Min. (mm) — katalogda "—" ise null, kontrol atlanır */
  machineMinDiameter: number | null
  /** Ø Kesit Min. / deformasyon (mm) */
  sectionMinDiameter: number
  /** Plastik sınır Mpl (kNm) — pekleşme Mph = Mpl × 1.1 */
  mplKnm: number
}

const lama = (
  size: [number, number],
  axis: CapacityAxis,
  capable: boolean,
  machineMinDiameter: number | null,
  sectionMinDiameter: number,
  mplKnm: number,
): CapacityRow => ({
  width: size[0],
  thickness: size[1],
  axis,
  capable,
  machineMinDiameter,
  sectionMinDiameter,
  mplKnm,
})

const LAMA_ROWS: CapacityRow[] = [
  lama([50, 10], 'kolay', true, 500, 500, 0.44),
  lama([50, 10], 'zor', true, 500, 625, 2.22),
  lama([80, 10], 'kolay', true, 500, 500, 0.71),
  lama([80, 10], 'zor', true, 500, 1000, 5.68),
  lama([80, 20], 'kolay', true, 500, 500, 2.84),
  lama([80, 20], 'zor', true, 500, 1000, 11.36),
  lama([100, 20], 'kolay', true, 500, 500, 3.55),
  lama([100, 20], 'zor', true, 500, 1250, 17.75),
  lama([100, 25], 'kolay', true, 500, 500, 5.55),
  lama([100, 25], 'zor', true, 600, 1250, 22.19),
  lama([120, 25], 'kolay', true, 500, 500, 6.66),
  lama([120, 25], 'zor', true, 800, 1500, 31.95),
  lama([130, 30], 'kolay', true, 500, 500, 10.38),
  lama([130, 30], 'zor', true, null, 1625, 45),
  lama([150, 30], 'kolay', true, 500, 500, 12),
  lama([150, 30], 'zor', false, null, 1875, 59.91),
  lama([200, 30], 'kolay', true, 500, 500, 16),
  lama([200, 30], 'zor', false, null, 1875, 106.5),
  lama([200, 50], 'kolay', true, null, 625, 44.38),
  lama([200, 50], 'zor', false, null, 1250, 177.5),
]

/** Pekleşme momenti bu değeri aşarsa adım mesafesi sınırlanır */
export const HARDENING_LIMIT_KNM = 30
/** Pekleşme sınırı aşıldığında izin verilen en büyük adım (mm) */
export const HARDENING_MAX_STEP_MM = 30

export interface CapacityInput {
  profileId: BendingProfileId | null
  direction: BendingDirectionId | null
  /** Profil ölçüleri A ve B (mm) — sıra fark etmez */
  a: number
  b: number
  /** Hedef çap Ø (mm) */
  diameterMm: number
  /** Adım mesafesi G (mm) */
  stepMm: number
}

export interface CapacityIssue {
  severity: 'block' | 'warn'
  message: string
}

export interface CapacityCheck {
  /** Katalogda eşleşen satırın etiketi, ör. "LAMA 80×10 KOLAY"; eşleşme yoksa null */
  label: string | null
  issues: CapacityIssue[]
}

function findRow(input: CapacityInput): CapacityRow | null {
  if (input.profileId !== 'i-single') return null
  const axis: CapacityAxis | null =
    input.direction === 'left' ? 'kolay' : input.direction === 'right' ? 'zor' : null
  if (!axis) return null
  const width = Math.max(input.a, input.b)
  const thickness = Math.min(input.a, input.b)
  const eq = (x: number, y: number) => Math.abs(x - y) < 0.01
  return (
    LAMA_ROWS.find((r) => r.axis === axis && eq(r.width, width) && eq(r.thickness, thickness)) ??
    null
  )
}

export function checkCapacity(input: CapacityInput): CapacityCheck {
  const row = findRow(input)
  if (!row) return { label: null, issues: [] }

  const label = `LAMA ${row.width}×${row.thickness} ${row.axis === 'kolay' ? 'KOLAY (YATAY)' : 'ZOR (DİKİNE)'}`
  const issues: CapacityIssue[] = []

  if (!row.capable) {
    issues.push({
      severity: 'block',
      message: 'BU PROFİL BU YÖNDE MAKİNE KAPASİTESİNİ (200 kN) AŞIYOR. BÜKÜLEMEZ.',
    })
    return { label, issues }
  }

  const d = input.diameterMm
  if (row.machineMinDiameter != null && d < row.machineMinDiameter) {
    issues.push({
      severity: 'block',
      message: `MİNİMUM ÇAP Ø${row.machineMinDiameter}. GİRİLEN Ø${d} BU PROFİL İÇİN ÇOK KÜÇÜK.`,
    })
  }

  if (d < row.sectionMinDiameter) {
    issues.push({
      severity: 'warn',
      message: `Ø${row.sectionMinDiameter} ALTINDA PROFİLDE DEFORMASYON OLUŞABİLİR. GİRİLEN Ø${d}.`,
    })
  }

  const mph = row.mplKnm * 1.1
  if (mph > HARDENING_LIMIT_KNM && input.stepMm > HARDENING_MAX_STEP_MM) {
    issues.push({
      severity: 'block',
      message: `PEKLEŞME ${mph.toFixed(1)} kNm (> ${HARDENING_LIMIT_KNM}). ADIM (G) EN FAZLA ${HARDENING_MAX_STEP_MM} mm OLABİLİR, GİRİLEN ${input.stepMm} mm.`,
    })
  }

  return { label, issues }
}
