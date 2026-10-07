// Ölçü ekranının ortasındaki "profil / kıvrım tipi" görseli — seçilen profil + yön + metot.
// Görseller assets/images/method-tiles/<çizim>__<metot>.png; kullanıcının PROFIL_YONLERI
// çizimlerinden blend4-2/3/4-buyuk.png düzeniyle (profil 20° yatık, sol üst; kıvrım tipi sağ alt) üretildi.
// Yön: left = yatay (kolay), right = dikine (zor); 'other' ve seçilmemişse yatay kullanılır.
// Eşleşme yoksa ekranın eski (köşebent) görseli döner.

import { useBendingJobStore, type BendingProfileId } from '@/store/bendingJobStore'

export type MethodTileKind = 'ring' | 'arc' | 'spiral' | 'sivama'

const TILES = import.meta.glob('@/assets/images/method-tiles/*.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>

const byName: Record<string, string> = {}
for (const [path, url] of Object.entries(TILES)) {
  const file = path.split('/').pop()!.replace(/\.png$/, '')
  byName[file] = url
}

const DRAWINGS: Record<BendingProfileId, { left: string; right: string }> = {
  'i-single': { left: 'lama_kivrim_2', right: 'lama_kivrim_1' },
  'square-in': { left: 'dikdortgen_profil_2', right: 'dikdortgen_profil_1' },
  'square-out': { left: 'kare_profil_1', right: 'kare_profil_1' },
  'square-filled': { left: 'kare_dolu_1', right: 'kare_dolu_1' },
  circle: { left: 'dikisli_boru_1', right: 'dikisli_boru_1' },
  'circle-filled': { left: 'yuvarlak_dolu_1', right: 'yuvarlak_dolu_1' },
  'l-right': { left: 'kosebent_1', right: 'kosebent_1' },
  'l-left': { left: 'kosebent_2', right: 'kosebent_2' },
  'i-bar': { left: 'ipn_kivrim_2', right: 'ipn_kivrim_1' },
  'h-bar': { left: 'heb_kivrim_1', right: 'heb_kivrim_2' },
  'c-channel': { left: 'upn_kivrim_1', right: 'upn_kivrim_2' },
  't-bar': { left: 't_kiris_3', right: 't_kiris_1' },
}

export function useMethodTileImage(method: MethodTileKind, fallback: string): string {
  const profileId = useBendingJobStore((s) => s.params.profileId)
  const direction = useBendingJobStore((s) => s.params.bendingDirection)
  if (!profileId) return fallback
  const d = DRAWINGS[profileId]
  const drawing = direction === 'right' ? d.right : d.left
  return byName[`${drawing}__${method}`] ?? fallback
}
