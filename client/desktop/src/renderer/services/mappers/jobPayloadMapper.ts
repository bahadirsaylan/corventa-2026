// UI BendingJobParams (Zustand store) → backend BendingJobCreateRequest dönüşümü.
//
// UI tarafındaki kontrat backend'den farklı (uzman önce kendi store'unu yazmıştı,
// backend'le birebir eşleşmiyor). Mapping bu fonksiyonda toplanır:
//   - Profile id ('square-out' / 'circle' / ...) → ProfileType enum
//   - Bending direction ('left' / 'right' / 'other') → BendingDirection enum
//   - Bending method ('ring' / 'arc' / 'spiral' / 'sivama') → BendingMethod enum
//   - R alanı: Ring'te çap, Arc/Spiral'de yarıçap → backend her durumda Ø istiyor
//   - H (m/min) ve G (step) → backend için pistonSpeedPercent ve stepDistanceMm
//
// Mapping konusunda backend tarafıyla tartışılması gereken noktalar
// CLAUDE.md "Uzman Review Hazırlığı" altında not edildi.

import type { BendingJobParams, BendingProfileId } from '@/store/bendingJobStore'
import {
  BendingDirection,
  BendingMethod,
  ProfileType,
  type BendingJobCreateRequest,
  type BendingSegmentInput,
} from '@shared/types'

const PROFILE_MAP: Record<BendingProfileId, ProfileType> = {
  'square-out': ProfileType.Square,
  'square-in': ProfileType.Rectangular,
  circle: ProfileType.Round,
  'l-right': ProfileType.Angle,
  'l-left': ProfileType.Angle,
  'i-bar': ProfileType.IProfile,
  'i-single': ProfileType.IProfile,
  'h-bar': ProfileType.IProfile,
  'c-channel': ProfileType.Channel,
  't-bar': ProfileType.TProfile,
  'square-filled': ProfileType.Square,
  'circle-filled': ProfileType.Round,
}

const DIRECTION_MAP = {
  left: BendingDirection.Inward,
  right: BendingDirection.Outward,
  other: BendingDirection.Other,
} as const

const METHOD_MAP = {
  ring: BendingMethod.FullCircle,
  arc: BendingMethod.Arc,
  spiral: BendingMethod.Serpantin,
  sivama: BendingMethod.Sivama,
} as const

export class JobMappingError extends Error {
  constructor(
    public readonly missingField: string,
    message: string,
  ) {
    super(message)
    this.name = 'JobMappingError'
  }
}

export interface MapOptions {
  /** Sensör hangi tarafta — UI'da gelecekte ayrı seçim olacak; default Left */
  activeSensorSide?: 'Left' | 'Right'
  operatorName?: string | null
  notes?: string | null
}

export function mapToCreateRequest(
  params: BendingJobParams,
  opts: MapOptions = {},
): BendingJobCreateRequest {
  if (!params.profileId)
    throw new JobMappingError('profileId', 'Profil seçimi tamamlanmadı')
  if (!params.bendingDirection)
    throw new JobMappingError('bendingDirection', 'Yön seçimi tamamlanmadı')
  if (!params.bendingMethod)
    throw new JobMappingError('bendingMethod', 'Metod seçimi tamamlanmadı')

  const profileType = PROFILE_MAP[params.profileId]
  const direction = DIRECTION_MAP[params.bendingDirection]
  const method = METHOD_MAP[params.bendingMethod]

  let A = 0,
    B = 0,
    S = 0,
    R = 0,
    H: number | null = null,
    G: number | null = null

  if (params.bendingMethod === 'ring' && params.ringBending) {
    A = params.ringBending.A ?? 0
    B = params.ringBending.B ?? 0
    S = params.ringBending.S ?? 0
    R = params.ringBending.R ?? 0
    H = params.ringBending.H
    G = params.ringBending.G
  } else if (params.bendingMethod === 'arc' && params.arcBending) {
    A = params.arcBending.A ?? 0
    B = params.arcBending.B ?? 0
    S = params.arcBending.S ?? 0
    // Arc: TargetDiameterMm backend'de "job-level" bir alan; birden fazla segment
    // olduğu için tek bir "hedef çap" yok — ilk segmentin çapını gönder (backend Arc
    // pipeline'ı bu alanı sadece log/UI için kullanır, hesap her segment'in kendi
    // radiusMm'i üzerinden yapılır).
    const firstSeg = params.arcBending.segments?.[0]
    R = (firstSeg?.R ?? 0) * 2
    H = params.arcBending.H
    G = params.arcBending.G
  } else if (params.bendingMethod === 'spiral' && params.spiralBending) {
    A = params.spiralBending.A ?? 0
    B = params.spiralBending.B ?? 0
    S = params.spiralBending.S ?? 0
    R = (params.spiralBending.R ?? 0) * 2 // yarıçap → çap
    H = params.spiralBending.H
  } else if (params.bendingMethod === 'sivama' && params.sivamaBending) {
    A = params.sivamaBending.A ?? 0
    B = params.sivamaBending.B ?? 0
    S = params.sivamaBending.S ?? 0
    R = (params.sivamaBending.R ?? 0) * 2 // yarıçap → çap (backend TargetDiameterMm)
    H = params.sivamaBending.H
  }

  const required = { A, B, S, R }
  for (const [name, value] of Object.entries(required)) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new JobMappingError(name, `${name} değeri geçersiz veya girilmemiş`)
    }
  }

  // partLengthMm — UI'daki olcum ekranindan toplanir:
  //   - ring: ringBending.L = parça toplam uzunluğu
  //   - arc:  arcBending.LTotal = parça toplam uzunluğu (arcBending.L per-segment düzlük!)
  //   - diger: TODO
  // opts.widthMm override eder. Hicbiri yoksa hata firlatir — eskinin
  // "sessizce 6000mm gonder" davranisi sahada rotasyonun yanlis hedefe gitmesine
  // sebep olmustu.
  let partLengthMm: number | undefined
  if (params.bendingMethod === 'ring' && params.ringBending?.L != null) {
    partLengthMm = params.ringBending.L
  }
  if (params.bendingMethod === 'arc' && params.arcBending?.LTotal != null) {
    partLengthMm = params.arcBending.LTotal
  }
  if (params.bendingMethod === 'spiral' && params.spiralBending?.L != null) {
    partLengthMm = params.spiralBending.L
  }
  if (params.bendingMethod === 'sivama' && params.sivamaBending?.L != null) {
    partLengthMm = params.sivamaBending.L
  }
  if (params.widthMm != null) {
    partLengthMm = params.widthMm
  }
  if (partLengthMm == null || !Number.isFinite(partLengthMm) || partLengthMm <= 0) {
    throw new JobMappingError('partLengthMm', 'Parça uzunluğu (L) girilmemiş veya geçersiz')
  }

  // Arc-only payload — P (segment sayısı), G (Arc step), H (kıvrım hız) + 1. segment
  let totalSegmentCount: number | null | undefined
  let arcStepDistanceMm: number | null | undefined
  let kivrimHizMetreDakika: number | null | undefined
  let segments: BendingSegmentInput[] | undefined

  if (params.bendingMethod === 'arc' && params.arcBending) {
    const ab = params.arcBending
    if (ab.P == null || !Number.isFinite(ab.P) || ab.P <= 0) {
      throw new JobMappingError('P', 'Segment sayısı (P) girilmemiş veya geçersiz')
    }
    if (ab.G == null || !Number.isFinite(ab.G) || ab.G <= 0) {
      throw new JobMappingError('G', 'Adım değeri (G) girilmemiş veya geçersiz')
    }
    if (!ab.segments || ab.segments.length === 0) {
      throw new JobMappingError('segments', 'Segment listesi boş')
    }
    if (ab.segments.length !== Math.round(ab.P)) {
      throw new JobMappingError(
        'segments',
        `Segment sayısı P (${ab.P}) ile listedeki (${ab.segments.length}) uyuşmuyor`,
      )
    }
    // Her segment R>0, 0<α<180, L≥0 validate
    ab.segments.forEach((seg, i) => {
      const order = i + 1
      if (seg.R == null || !Number.isFinite(seg.R) || seg.R <= 0) {
        throw new JobMappingError(`segment${order}.R`, `Segment ${order}: R (yarıçap) 0'dan büyük olmalı`)
      }
      if (seg.Alpha == null || !Number.isFinite(seg.Alpha) || seg.Alpha <= 0 || seg.Alpha >= 180) {
        throw new JobMappingError(`segment${order}.Alpha`, `Segment ${order}: α 0 < α < 180 olmalı`)
      }
      if (seg.L == null || !Number.isFinite(seg.L) || seg.L < 0) {
        throw new JobMappingError(`segment${order}.L`, `Segment ${order}: L (düzlük) ≥ 0 olmalı`)
      }
    })
    totalSegmentCount = Math.round(ab.P)
    arcStepDistanceMm = ab.G
    kivrimHizMetreDakika = ab.H
    segments = ab.segments.map((seg, i) => ({
      segmentOrder: i + 1,
      radiusMm: seg.R as number,        // UI'daki R = yarıçap (entity ile aynı)
      angleDeg: seg.Alpha as number,
      straightAfterMm: seg.L as number,
    }))
  }

  // Sivama-only — backend Method=Sivama ise zorunlu olarak doğrular
  let sivamaAngleDeg: number | null | undefined
  if (params.bendingMethod === 'sivama' && params.sivamaBending?.X != null) {
    sivamaAngleDeg = params.sivamaBending.X
  }

  return {
    profileType,
    direction,
    method,
    profileA: A,
    profileB: B,
    profileS: S,
    targetDiameterMm: R,
    // Arc'ta H/G Arc-specific field'larda; FullCircle'da profileH/profileG'de
    profileH: method === BendingMethod.Arc ? null : H,
    profileG: method === BendingMethod.Arc ? null : G,
    partLengthMm,
    activeSensorSide: opts.activeSensorSide ?? 'Left',
    stepDistanceMm: G ?? 30,
    // Arc-only — backend Method=Arc ise zorunlu olarak doğrular
    totalSegmentCount,
    arcStepDistanceMm,
    kivrimHizMetreDakika,
    segments,
    // Sivama-only — backend Method=Sivama ise zorunlu olarak doğrular
    sivamaAngleDeg,
    operatorName: opts.operatorName ?? null,
    notes: opts.notes ?? null,
  }
}
