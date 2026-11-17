// STANDART SÜRÜM (2026-11-17) — ÇOK AÇILI / SERPANTİN / SIVAMA için BÜKÜM SONUCU düzeltme modeli.
//
// Bu metotlarda parçaya düzeltme pasosu YOK: operatör parçayı kendi aletiyle ölçer, düzeltilmiş girdilerle
// YENİ PARÇA büker. Düzeltme = metot parametrelerinin (R / G / X) değiştirilmesi; hedef konum orkestratörde
// düzeltilmiş girdilerden yeniden hesaplanır (manualTargetLocked YOK).
//
// Önerilen düzeltme (yarıçap alanları, doğrusal oran):
//     R_yeni = R_girdi × R_hedef / R_ölçülen
//   R_girdi   = bu parçayı büken girdi (önceki düzeltmeler dahil)
//   R_hedef   = operatörün istediği (tasarım) yarıçap — ilk bükümde girilen değer, düzeltmelerde sabit
//   R_ölçülen = parçada ölçülen yarıçap
// Az bükülme (ölçülen > hedef) → girdi küçülür (daha sıkı büker); fazla bükülme (ölçülen < hedef) → girdi büyür.
// Öneri sadece başlangıç — operatör ± ve numpad ile değiştirir.
//
// SIVAMA: backend sıvamada pistonu hareket ettirmez (tüm toplar stage'de, sadece rotasyon) → R ve X çapı
// DEĞİŞTİRMEZ. Ölçülen R kayda/geçmişe yazılır ama öneri üretilmez (suggest=false); alanlar elle düzenlenebilir.

import type {
  ArcSegmentParams,
  BendingJobParams,
  BendingMethodId,
} from '@/store/bendingJobStore'

export type MethodFieldKind = 'radius' | 'step' | 'angle'

export interface MethodField {
  /** R1..Rn (ÇOK AÇILI segment yarıçapı) · G (ÇOK AÇILI adım) · R (SERPANTİN/SIVAMA) · X (SIVAMA açısı) */
  id: string
  /** Ekran etiketi (sayı/harf — çevrilmez) */
  label: string
  /** Ek bilgi satırı (ÇOK AÇILI: "α 90° · L 200") — çevrilmez */
  sub?: string
  kind: MethodFieldKind
  /** Bu parçayı büken girdi değeri */
  value: number
  /** Operatör ölçülen değer girebilir mi */
  measurable: boolean
  /** Ölçülenden önerilen yeni değer hesaplanır mı */
  suggest: boolean
  /** Geçerli aralık (numpad / ± sınırı) */
  min: number
  max: number
  /** ± adımları */
  steps: [number, number]
}

const MAX_RADIUS_MM = 100_000

/** Ölçülenden önerilen yeni girdi: girdi × hedef / ölçülen (2 ondalık) */
export function suggestCorrected(input: number, target: number, measured: number): number | null {
  if (!(input > 0) || !(target > 0) || !(measured > 0)) return null
  return Math.round(((input * target) / measured) * 100) / 100
}

/** Mağaza parametrelerinden düzeltilebilir alanlar (ÇEMBER için boş liste) */
export function methodFields(params: BendingJobParams): MethodField[] {
  const m = params.bendingMethod
  if (m === 'arc' && params.arcBending) {
    const ab = params.arcBending
    const fields: MethodField[] = (ab.segments ?? []).map((seg, i) => ({
      id: `R${i + 1}`,
      label: `R${i + 1}`,
      sub: `α ${num(seg.Alpha)}° · L ${num(seg.L)}`,
      kind: 'radius',
      value: seg.R ?? 0,
      measurable: true,
      suggest: true,
      min: 1,
      max: MAX_RADIUS_MM,
      steps: [1, 10],
    }))
    if (ab.G != null) {
      fields.push({
        id: 'G',
        label: 'G',
        kind: 'step',
        value: ab.G,
        measurable: false,
        suggest: false,
        min: 0.5,
        max: 500,
        steps: [0.5, 5],
      })
    }
    return fields
  }
  if (m === 'spiral' && params.spiralBending) {
    return [
      {
        id: 'R',
        label: 'R',
        kind: 'radius',
        value: params.spiralBending.R ?? 0,
        measurable: true,
        suggest: true,
        min: 1,
        max: MAX_RADIUS_MM,
        steps: [1, 10],
      },
    ]
  }
  if (m === 'sivama' && params.sivamaBending) {
    return [
      {
        id: 'R',
        label: 'R',
        kind: 'radius',
        value: params.sivamaBending.R ?? 0,
        measurable: true,
        suggest: false,
        min: 1,
        max: MAX_RADIUS_MM,
        steps: [1, 10],
      },
      {
        id: 'X',
        label: 'X',
        kind: 'angle',
        value: params.sivamaBending.X ?? 0,
        measurable: false,
        suggest: false,
        min: 1,
        max: 359,
        steps: [1, 10],
      },
    ]
  }
  return []
}

/** İlk bükümde tasarım hedefleri = o anki girdiler (sadece yarıçap ve açı alanları) */
export function initialTargets(fields: MethodField[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const f of fields) if (f.kind !== 'step' && f.value > 0) out[f.id] = f.value
  return out
}

/** Yeni değerleri metot parametrelerine yazar → setParams parçası (değişmeyen alanlar korunur) */
export function applyMethodValues(
  params: BendingJobParams,
  values: Record<string, number>,
): Partial<BendingJobParams> {
  const m = params.bendingMethod
  if (m === 'arc' && params.arcBending) {
    const ab = params.arcBending
    const segments: ArcSegmentParams[] = (ab.segments ?? []).map((seg, i) => {
      const v = values[`R${i + 1}`]
      return v != null && v > 0 ? { ...seg, R: v } : { ...seg }
    })
    const g = values.G
    return { arcBending: { ...ab, segments, G: g != null && g > 0 ? g : ab.G } }
  }
  if (m === 'spiral' && params.spiralBending) {
    const r = values.R
    return { spiralBending: { ...params.spiralBending, R: r != null && r > 0 ? r : params.spiralBending.R } }
  }
  if (m === 'sivama' && params.sivamaBending) {
    const r = values.R
    const x = values.X
    return {
      sivamaBending: {
        ...params.sivamaBending,
        R: r != null && r > 0 ? r : params.sivamaBending.R,
        X: x != null && x > 0 ? x : params.sivamaBending.X,
      },
    }
  }
  return {}
}

/** Metot ekran adı (Türkçe kaynak metin — t() ile çevrilir) */
export function methodTitle(m: BendingMethodId | null): string {
  switch (m) {
    case 'arc':
      return 'ÇOK AÇILI'
    case 'spiral':
      return 'SERPANTİN'
    case 'sivama':
      return 'SIVAMA'
    default:
      return 'ÇEMBER'
  }
}

/** Kayıt listesi / KAYIT ADI için ana değer: ÇOK AÇILI ilk segment R · SERPANTİN/SIVAMA R */
export function primaryRadius(params: BendingJobParams): number | null {
  const m = params.bendingMethod
  const r =
    m === 'arc'
      ? params.arcBending?.segments?.[0]?.R
      : m === 'spiral'
        ? params.spiralBending?.R
        : m === 'sivama'
          ? params.sivamaBending?.R
          : null
  return r != null && r > 0 ? r : null
}

/** Metot profil A ölçüsü */
export function methodProfileA(params: BendingJobParams): number | null {
  const m = params.bendingMethod
  const a =
    m === 'arc' ? params.arcBending?.A : m === 'spiral' ? params.spiralBending?.A : m === 'sivama' ? params.sivamaBending?.A : null
  return a != null && a > 0 ? a : null
}

function num(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return String(Number(v.toFixed(2)))
}
