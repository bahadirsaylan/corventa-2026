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
