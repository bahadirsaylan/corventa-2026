// Profil başına ölçü alanları (07.10.2026 toplantısı, madde 22).
// Görünmeyen alan ekranda çıkmaz ve 0 gönderilir ("bu profilde yok").
// Backend hesabı sadece A'yı kullanır (piston hedefi R2 = Rarc − A − Rk, stage seçimi);
// B ve S sadece kayıt + AI eşleştirme içindir — 0 kabul edilir.

import { useBendingJobStore, type BendingProfileId } from '@/store/bendingJobStore'

export type ProfileFieldKey = 'A' | 'B' | 'S'

export const PROFILE_FIELDS: Record<BendingProfileId, ProfileFieldKey[]> = {
  'i-single': ['A', 'B'],            // lama — 80 = A kenarı, 20 = B kenarı
  'square-out': ['A', 'S'],          // boş kare
  'square-in': ['A', 'B', 'S'],      // boş dikdörtgen
  circle: ['A', 'S'],                // boş boru
  'l-right': ['A', 'S'],             // köşebent
  'l-left': ['A', 'B', 'S'],         // iki kollu köşebent (seçim ekranında en sağ alt)
  'circle-filled': ['A'],            // dolu boru
  'square-filled': ['A'],            // dolu kare
  'i-bar': ['A', 'S'],               // IPN
  'h-bar': ['A', 'S'],               // HEB
  'c-channel': ['A', 'S'],           // UPN
  't-bar': ['A', 'S'],               // T profil
}

const ALL: ProfileFieldKey[] = ['A', 'B', 'S']

/** Seçili profilin görünen A/B/S alanları (profil seçilmemişse hepsi). */
export function useVisibleProfileFields(): ProfileFieldKey[] {
  const profileId = useBendingJobStore((s) => s.params.profileId)
  return profileId ? PROFILE_FIELDS[profileId] : ALL
}

/** Görünmeyen A/B/S alanlarını "0" yapar — kontrol ve kayıt bu değerle çalışır. */
export function fillHiddenProfileFields<T extends Record<ProfileFieldKey, string>>(
  values: T,
  visible: ProfileFieldKey[],
): T {
  let out = values
  for (const k of ALL) {
    if (!visible.includes(k) && values[k] !== '0') {
      out = { ...out, [k]: '0' }
    }
  }
  return out
}

/** Alan listesinden görünmeyen A/B/S'yi çıkarır (diğer alanlara dokunmaz). */
export function filterProfileFieldList<K extends string>(fields: K[], visible: ProfileFieldKey[]): K[] {
  return fields.filter((f) => !(ALL as string[]).includes(f) || visible.includes(f as ProfileFieldKey))
}
