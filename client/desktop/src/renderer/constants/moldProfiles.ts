// Kalıp profil tipleri (BULUT_API_V2.md §6 MoldDto.profileType) — ekran etiketleri (t() anahtarı) ve
// makine akışında kullanılabilirlik. Değerler UI BendingProfileId ile aynı; 'custom' büküm akışına aktarılamaz.

import type { MoldDto, MoldProfileType } from '@shared/types'
import type { BendingProfileId } from '@/store/bendingJobStore'

export const MOLD_PROFILE_LABELS: Record<MoldProfileType, string> = {
  'square-out': 'KARE KUTU',
  'square-in': 'DİKDÖRTGEN KUTU',
  circle: 'BORU',
  'circle-filled': 'DOLU MİL',
  'square-filled': 'DOLU KARE',
  'i-single': 'LAMA',
  'l-right': 'KÖŞEBENT',
  'l-left': 'İKİ KOLLU KÖŞEBENT',
  'i-bar': 'IPN',
  'h-bar': 'HEB',
  'c-channel': 'UPN',
  't-bar': 'T PROFİL',
  custom: 'ÖZEL KESİT',
}

export const MOLD_PROFILE_TYPES = Object.keys(MOLD_PROFILE_LABELS) as MoldProfileType[]

/** Büküm akışında seçilebilen profil mi ('custom' değil) */
export function moldProfileToBendingProfile(t: MoldProfileType | string): BendingProfileId | null {
  return t in MOLD_PROFILE_LABELS && t !== 'custom' ? (t as BendingProfileId) : null
}

/** "160 × 80 × 3 mm" · B yoksa "Ø114 × 4 mm" (boru) / "114 × 4 mm" · dolu malzemede "… · DOLU" (t() ile) */
export function moldDimensionText(m: Pick<MoldDto, 'a' | 'b' | 's' | 'isSolid' | 'profileType'>, solidLabel: string): string {
  const round = m.profileType === 'circle' || m.profileType === 'circle-filled'
  const parts = [`${round ? 'Ø' : ''}${m.a}`]
  if (m.b > 0) parts.push(String(m.b))
  if (!m.isSolid && m.s > 0) parts.push(String(m.s).replace('.', ','))
  return `${parts.join(' × ')} mm${m.isSolid ? ` · ${solidLabel}` : ''}`
}
