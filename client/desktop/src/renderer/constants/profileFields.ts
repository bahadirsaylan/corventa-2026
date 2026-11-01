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

/**
 * Görünmeyen A/B/S alanlarını "0" yapar — kontrol ve kayıt bu değerle çalışır.
 * Kalıp kodu seçiliyse (BULUT_API_V2.md §2.4) görünen A/B/S kalıbın değerine SABİTLENİR: dört ölçü ekranı
 * (ring/arc/spiral/sıvama) başlangıçta, her değişiklikte ve SIFIRLA'da bu fonksiyondan geçtiği için
 * kalıp ölçüleri değiştirilemez; görünmeyen alanlar yine "0" (operatörün elle gireceği değerlerle aynı).
 */
export function fillHiddenProfileFields<T extends Record<ProfileFieldKey, string>>(
  values: T,
  visible: ProfileFieldKey[],
): T {
  let out = values
  const locked = moldProfileValues()
  for (const k of ALL) {
    if (!visible.includes(k)) {
      if (values[k] !== '0') out = { ...out, [k]: '0' }
    } else if (locked && values[k] !== locked[k]) {
      out = { ...out, [k]: locked[k] }
    }
  }
  return out
}

/** Seçili kalıbın A/B/S değerleri (metin) — kalıp yoksa null */
export function moldProfileValues(): Record<ProfileFieldKey, string> | null {
  const { moldCode, mold } = useBendingJobStore.getState().params
  if (!moldCode || !mold) return null
  return { A: String(mold.a), B: String(mold.b), S: String(mold.s) }
}

export interface MoldLock {
  /** Kalıp seçili → A/B/S kilitli */
  locked: boolean
  moldCode: string | null
  /** Kalıbın önerdiği adım (G) — sadece öneri, otomatik uygulanmaz */
  suggestedStepMm: number | null
}

/** Ölçü formları: A/B/S kilitli mi + kalıp bilgisi */
export function useMoldLock(): MoldLock {
  const moldCode = useBendingJobStore((s) => s.params.moldCode)
  const step = useBendingJobStore((s) => s.params.mold?.defaultParams?.stepDistanceMm ?? null)
  return {
    locked: !!moldCode,
    moldCode,
    suggestedStepMm: typeof step === 'number' && Number.isFinite(step) && step > 0 ? step : null,
  }
}

/** Alan kalıp tarafından kilitli mi (A/B/S + kalıp seçili) */
export function isMoldLockedField(field: string, lock: MoldLock): boolean {
  return lock.locked && (ALL as string[]).includes(field)
}

/** Kilitli ölçü kutusu görünümü (formların kendi CSS modüllerine dokunmadan) */
export const MOLD_LOCKED_FIELD_STYLE = {
  background: '#e5e7eb',
  color: '#374151',
  borderStyle: 'dashed',
  cursor: 'not-allowed',
} as const

/** Alan listesinden görünmeyen A/B/S'yi çıkarır (diğer alanlara dokunmaz). */
export function filterProfileFieldList<K extends string>(fields: K[], visible: ProfileFieldKey[]): K[] {
  return fields.filter((f) => !(ALL as string[]).includes(f) || visible.includes(f as ProfileFieldKey))
}
