// Kullanım süreleri (DataApi GET /api/usage-time/summary) — Excel madde 35/36.
// Kategori anahtarları backend'de BÜYÜK HARF; değerler SANİYE (tam sayı).
// Sayımı Bending API UsageTimeTracker yapar; UI sadece okur.

export type UsageTimeCategory = 'PRESSURE' | 'STANDBY' | 'ERROR' | 'MAINTENANCE' | 'SERVICE'

/** Ekrandaki sıra = backend'in kategori sırası */
export const USAGE_TIME_CATEGORIES: readonly UsageTimeCategory[] = [
  'PRESSURE',
  'STANDBY',
  'ERROR',
  'MAINTENANCE',
  'SERVICE',
] as const

/** Kategori → saniye */
export type UsageTimeMap = Record<UsageTimeCategory, number>

/** Günlük satır: { date: "yyyy-MM-dd", PRESSURE: n, ... } (boş günler 0) */
export type UsageTimeDailyRow = { date: string } & UsageTimeMap

export interface UsageTimeSummary {
  days: number
  /** Yerel tarih "yyyy-MM-dd" */
  from: string
  to: string
  /** Tüm zamanlar (makine ömrü boyunca) */
  totals: UsageTimeMap
  /** Seçilen gün aralığı (from..to) */
  rangeTotals: UsageTimeMap
  today: UsageTimeMap
  /** Eskiden yeniye */
  daily: UsageTimeDailyRow[]
}
