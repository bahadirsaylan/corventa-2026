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
  spiral: BendingMethod.Spiral,
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
    R = (params.arcBending.R ?? 0) * 2 // Arc'ta R yarıçap — backend Ø ister, ×2
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
    H = params.sivamaBending.H
    // Sivama'da X (açı) var ama backend henüz açı tabanlı bükümü desteklemiyor
    // → şimdilik R=0 gönderiliyor; backend tarafında açı parametresi eklendiğinde güncellenecek
  }

  const required = { A, B, S, R }
  for (const [name, value] of Object.entries(required)) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new JobMappingError(name, `${name} değeri geçersiz veya girilmemiş`)
    }
  }

  // partLengthMm — UI'daki olcum ekranindan toplanir (ring icin L field, diger
  // method'lar TODO). opts.partLengthMm verilirse o override eder.
  // Hicbiri yoksa hata firlatir — eskinin "sessizce 6000mm gonder" davranisi
  // sahada rotasyonun yanlis hedefe gitmesine sebep olmustu.
  let partLengthMm: number | undefined
  if (params.bendingMethod === 'ring' && params.ringBending?.L != null) {
    partLengthMm = params.ringBending.L
  }
  if (params.widthMm != null) {
    partLengthMm = params.widthMm
  }
  if (partLengthMm == null || !Number.isFinite(partLengthMm) || partLengthMm <= 0) {
    throw new JobMappingError('partLengthMm', 'Parça uzunluğu (L) girilmemiş veya geçersiz')
  }

  return {
    profileType,
    direction,
    method,
    profileA: A,
    profileB: B,
    profileS: S,
    targetDiameterMm: R,
    profileH: H,
    profileG: G,
    partLengthMm,
    activeSensorSide: opts.activeSensorSide ?? 'Left',
    stepDistanceMm: G ?? 30,
    operatorName: opts.operatorName ?? null,
    notes: opts.notes ?? null,
  }
}
