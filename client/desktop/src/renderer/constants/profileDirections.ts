// Profil başına kıvrım yönü seçenekleri (07.10.2026 toplantısı, madde 16).
//   I, H        → YATAY / DİKİNE
//   C, T        → DİK / YAN / TERS
//   Boş boru    → yön yok; yön sayfasında DİKİŞLİ / ETLİ boru tipi seçilir (PIPE_TYPE_OPTIONS,
//                 profileSubType), yön 'left' kaydedilir
//   Dolu boru   → yön seçimi yok (sayfa atlanır, yön 'left' kaydedilir)
//   Kare, dolu kare → YATAY / DİĞER
//   Köşebent (L, iki kollu L) → KANAT İÇE (left=Inward) / KANAT DIŞA (right=Outward) / DİĞER
//                 Görsel: yatay kanat halka düzleminde; DIŞA = yatay kanat merkezden dışarı uzanır
//                 (dik kanat iç çapta), İÇE = yatay kanat merkeze doğru (dik kanat dış çapta).
//                 Görseller SVG (kosebent*_kanat_*.svg); iki kollu = aynanın simetriği, kollar farklı boy.
//   Lama        → değişmedi (yatay / dikine / diğer), görseller lamaya özel
//   Diğerleri   → değişmedi (genel görseller)
// Yön backend'de sadece kayıttır (BendingDirection: left=Inward, right=Outward, other=Other,
// reverse=Reverse) — büküm hesabına girmez. Lama kapasite kontrolü left=kolay, right=zor kullanır.
// Görseller: PROFIL_YONLERI (*_KOLAY / *_ZOR) → assets/images/directions.

import type { BendingDirectionId, BendingProfileId, PipeTypeId } from '@/store/bendingJobStore'
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
import kosebentDisa from '@/assets/images/directions/kosebent_kanat_disa.svg'
import kosebentIce from '@/assets/images/directions/kosebent_kanat_ice.svg'
import kosebent2Disa from '@/assets/images/directions/kosebent2_kanat_disa.svg'
import kosebent2Ice from '@/assets/images/directions/kosebent2_kanat_ice.svg'
import dikisliImage from '@/assets/images/pipe-dikisli.png'
import etliImage from '@/assets/images/pipe-etli.png'

export interface DirectionOption<Id extends string = BendingDirectionId> {
  id: Id
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
  'l-right': [
    { id: 'left', label: 'KANAT İÇE', image: kosebentIce },
    { id: 'right', label: 'KANAT DIŞA', image: kosebentDisa },
    OTHER,
  ],
  'l-left': [
    { id: 'left', label: 'KANAT İÇE', image: kosebent2Ice },
    { id: 'right', label: 'KANAT DIŞA', image: kosebent2Disa },
    OTHER,
  ],
  'square-out': [{ id: 'left', label: 'YATAY', image: kareKutu }, OTHER],
  'square-filled': [{ id: 'left', label: 'YATAY', image: kareDolu }, OTHER],
  circle: null, // boş boru — yön yok, yön sayfasında boru tipi seçilir (PIPE_TYPE_OPTIONS)
  'circle-filled': null, // dolu boru — yön seçimi yok, sayfa atlanır
}

/** Boş boru: yön sayfasında yön yerine DİKİŞLİ / ETLİ boru tipi (job'a profileSubType olarak gider). */
export const PIPE_TYPE_OPTIONS: DirectionOption<PipeTypeId>[] = [
  { id: 'DIKISLI', label: 'DİKİŞLİ BORU', image: dikisliImage },
  { id: 'ETLI', label: 'ETLİ BORU', image: etliImage },
]

/** Yön sayfası açılıyor mu? (yön seçenekleri var veya boş boru tipi seçimi) */
export function hasDirectionPage(profileId: BendingProfileId | null): boolean {
  return profileId === 'circle' || directionOptionsFor(profileId) !== null
}

/** Profilin yön seçenekleri; null = yön seçimi yok (boş boru hariç sayfa atlanır — hasDirectionPage). */
export function directionOptionsFor(profileId: BendingProfileId | null): DirectionOption[] | null {
  if (!profileId) return DEFAULT_OPTIONS
  const v = PROFILE_DIRECTIONS[profileId]
  return v === undefined ? DEFAULT_OPTIONS : v
}

/** Yön seçimi olmayan profillerde kaydedilecek yön */
export const NO_DIRECTION_DEFAULT: BendingDirectionId = 'left'
