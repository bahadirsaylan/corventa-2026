// Profil başına kıvrım yönü seçenekleri (07.10.2026 toplantısı, madde 16).
//   I, H        → YATAY / DİKİNE
//   C, T        → DİK / YAN / TERS
//   Boş boru    → yön seçimi yok (sayfa atlanır, yön 'left' kaydedilir)
//   Kare, dolu kare → YATAY / DİĞER
//   Lama        → değişmedi (yatay / dikine / diğer), görseller lamaya özel
//   Diğerleri   → değişmedi (genel görseller)
// Yön backend'de sadece kayıttır (BendingDirection: left=Inward, right=Outward, other=Other,
// reverse=Reverse) — büküm hesabına girmez. Lama kapasite kontrolü left=kolay, right=zor kullanır.
// Görseller: PROFIL_YONLERI (*_KOLAY / *_ZOR) → assets/images/directions.

import type { BendingDirectionId, BendingProfileId } from '@/store/bendingJobStore'
import blendYatay from '@/assets/images/blend2-1.png'
import blendDikine from '@/assets/images/blend2-2.png'
import lamaKolay from '@/assets/images/directions/lama_kolay.png'
import lamaZor from '@/assets/images/directions/lama_zor.png'
import ipnKolay from '@/assets/images/directions/ipn_kolay.png'
import ipnZor from '@/assets/images/directions/ipn_zor.png'
import hebKolay from '@/assets/images/directions/heb_kolay.png'
import hebZor from '@/assets/images/directions/heb_zor.png'
import upnKolay1 from '@/assets/images/directions/upn_kolay_1.png'
import upnKolay2 from '@/assets/images/directions/upn_kolay_2.png'
import upnZor from '@/assets/images/directions/upn_zor.png'
import tKolay from '@/assets/images/directions/t_kiris_kolay.png'
import tZor1 from '@/assets/images/directions/t_kiris_zor_1.png'
import tZor2 from '@/assets/images/directions/t_kiris_zor_2.png'
import kareKutu from '@/assets/images/directions/kare_kutu.png'
import kareDolu from '@/assets/images/directions/kare_dolu.png'

export interface DirectionOption {
  id: BendingDirectionId
  label: string
  /** Görsel yoksa sadece etiket kutusu (ör. "DİĞER KIVRIM YÖNLERİ") */
  image?: string
}

const OTHER: DirectionOption = { id: 'other', label: 'DİĞER\nKIVRIM YÖNLERİ' }

const DEFAULT_OPTIONS: DirectionOption[] = [
  { id: 'left', label: 'YATAY', image: blendYatay },
  { id: 'right', label: 'DİKİNE', image: blendDikine },
  OTHER,
]

const PROFILE_DIRECTIONS: Partial<Record<BendingProfileId, DirectionOption[] | null>> = {
  'i-single': [
    { id: 'left', label: 'YATAY', image: lamaKolay },
    { id: 'right', label: 'DİKİNE', image: lamaZor },
    OTHER,
  ],
  'i-bar': [
    { id: 'left', label: 'YATAY', image: ipnKolay },
    { id: 'right', label: 'DİKİNE', image: ipnZor },
  ],
  'h-bar': [
    { id: 'left', label: 'YATAY', image: hebKolay },
    { id: 'right', label: 'DİKİNE', image: hebZor },
  ],
  'c-channel': [
    { id: 'left', label: 'DİK', image: upnKolay1 },
    { id: 'right', label: 'YAN', image: upnZor },
    { id: 'reverse', label: 'TERS', image: upnKolay2 },
  ],
  't-bar': [
    { id: 'left', label: 'DİK', image: tKolay },
    { id: 'right', label: 'YAN', image: tZor1 },
    { id: 'reverse', label: 'TERS', image: tZor2 },
  ],
  'square-out': [{ id: 'left', label: 'YATAY', image: kareKutu }, OTHER],
  'square-filled': [{ id: 'left', label: 'YATAY', image: kareDolu }, OTHER],
  circle: null, // boş boru — yön seçimi yok
}

/** Profilin yön seçenekleri; null = yön seçimi yok (sayfa atlanır). */
export function directionOptionsFor(profileId: BendingProfileId | null): DirectionOption[] | null {
  if (!profileId) return DEFAULT_OPTIONS
  const v = PROFILE_DIRECTIONS[profileId]
  return v === undefined ? DEFAULT_OPTIONS : v
}

/** Yön seçimi olmayan profillerde kaydedilecek yön */
export const NO_DIRECTION_DEFAULT: BendingDirectionId = 'left'
