// Ölçü ekranlarındaki profil görseli — seçilen profilin kesiti + A/B/S ölçü okları.
// Görseller blend4-1-buyuk.png (köşebent) referansıyla aynı stilde üretildi (assets/images/profile-dims).
// Profil seçilmemişse referans köşebent görseli döner.

import { useBendingJobStore, type BendingProfileId } from '@/store/bendingJobStore'
import fallbackImage from '@/assets/images/blend4-1-buyuk.png'
import squareOut from '@/assets/images/profile-dims/profile-dim-square-out.png'
import squareIn from '@/assets/images/profile-dims/profile-dim-square-in.png'
import circle from '@/assets/images/profile-dims/profile-dim-circle.png'
import lRight from '@/assets/images/profile-dims/profile-dim-l-right.png'
import iBar from '@/assets/images/profile-dims/profile-dim-i-bar.png'
import hBar from '@/assets/images/profile-dims/profile-dim-h-bar.png'
import cChannel from '@/assets/images/profile-dims/profile-dim-c-channel.png'
import tBar from '@/assets/images/profile-dims/profile-dim-t-bar.png'
import squareFilled from '@/assets/images/profile-dims/profile-dim-square-filled.png'
import iSingle from '@/assets/images/profile-dims/profile-dim-i-single.png'
import circleFilled from '@/assets/images/profile-dims/profile-dim-circle-filled.png'
import lLeft from '@/assets/images/profile-dims/profile-dim-l-left.png'

const IMAGES: Record<BendingProfileId, string> = {
  'square-out': squareOut,
  'square-in': squareIn,
  circle,
  'l-right': lRight,
  'i-bar': iBar,
  'h-bar': hBar,
  'c-channel': cChannel,
  't-bar': tBar,
  'square-filled': squareFilled,
  'i-single': iSingle,
  'circle-filled': circleFilled,
  'l-left': lLeft,
}

export function useProfileDimensionImage(): string {
  const profileId = useBendingJobStore((s) => s.params.profileId)
  return (profileId && IMAGES[profileId]) || fallbackImage
}
