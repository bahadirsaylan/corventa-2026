// Ayarlar (Settings) sayfaları için DataApi type'ları — MachineIdentity, MaintenanceState.
// DataApi C# entity'leriyle isim ve alan olarak birebir eşleşir (JSON serialize/deserialize kolay).

export interface MachineIdentity {
  id: number
  serialNo: string
  customerName: string
  /** ISO 8601 UTC — DataApi tarafında DateTime. Front'ta new Date(...) ile parse edilir. */
  warrantyStartDate: string
  /** ISO 8601 UTC. */
  warrantyEndDate: string
  /** 'SATIS' | 'TAKAS' | 'HIBE' */
  ownershipType: string
  createdAt: string
  updatedAt: string
}

export interface MaintenanceState {
  id: number
  lastDailyAt: string | null
  lastWeeklyAt: string | null
  lastMonthlyAt: string | null
  last6MonthlyAt: string | null
  last12MonthlyAt: string | null
  isInMaintenanceMode: boolean
  createdAt: string
  updatedAt: string
}

export type MaintenancePeriodKey =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'six-monthly'
  | 'twelve-monthly'

export interface MaintenancePeriodInfo {
  key: MaintenancePeriodKey
  label: string
  intervalDays: number
}

/** PDF kılavuzu s.8-12'den — 5 periyot ve tekrar aralıkları. */
export const MAINTENANCE_PERIODS: readonly MaintenancePeriodInfo[] = [
  { key: 'daily',          label: 'Günlük',   intervalDays: 1 },
  { key: 'weekly',         label: 'Haftalık', intervalDays: 7 },
  { key: 'monthly',        label: 'Aylık',    intervalDays: 30 },
  { key: 'six-monthly',    label: '6 Aylık',  intervalDays: 180 },
  { key: 'twelve-monthly', label: '12 Aylık', intervalDays: 365 },
] as const

// Kullanıcıya özel UI tercihi — DataApi /api/user-preferences/{userKey}/{prefKey}
export interface UserPreference {
  userKey: string
  prefKey: string
  /** Tercih içeriği (JSON metni) — şeklini tercihi kullanan ekran tanımlar */
  valueJson: string
  updatedAt: string
}

/** DataApi Stage (GET /api/settings/stages) — gönye ekranında stage seçimi için. */
export interface StageInfo {
  id: number
  stageNumber: number
  name: string
  description?: string | null
  leftOffsetMm: number
  rightOffsetMm: number
  lowerOffsetMm: number
  xA1Mm?: number | null
  yA1Mm?: number | null
  maxProfileAMm?: number | null
  displayOrder?: number
  isActive?: boolean
}

/**
 * Bending API MachineSettings (GET/PUT /api/settings/machine) — alan adları C# entity'nin camelCase hali.
 * Ayar ekranları sadece DEĞİŞEN alanları gönderir: güncel kayıt okunur, değişiklik üstüne yazılır, PUT edilir.
 */
export type MachineSettingsDto = Record<string, number | string | boolean | null>

/** Bending API GonyeSettings (GET/PUT /api/settings/gonye). */
export interface GonyeSettingsDto {
  id: number
  leftOffsetMm: number
  rightOffsetMm: number
  upperOffsetMm: number
  lowerOffsetMm: number
  referencePressureBar: number
  [k: string]: unknown
}
