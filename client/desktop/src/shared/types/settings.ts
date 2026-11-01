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
  // Müşteri iletişim bilgileri — yalnızca OTP onaylı müşteri değişikliği ile yazılır
  // (PUT /api/machine-identity bunlara dokunmaz). Eski DataApi'de alan yok → opsiyonel.
  customerCompany?: string | null
  customerTaxNo?: string | null
  customerPhone?: string | null
  customerEmail?: string | null
  customerAddress?: string | null
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
  // ── Bakım modu kuralları (DataApi MaintenanceModeService, 2026-11-01) ──
  // Eski DataApi bu alanları göndermez → hepsi opsiyonel; yoksa UI eski davranışa düşer.
  // Zaman alanları UTC ('Z' ile) ISO 8601.
  /** Bakım modunun açıldığı an (mod kapalıysa null) */
  modeStartedAt?: string | null
  /** Mod açıkken geçen tam dakika (kapalıysa null) */
  elapsedMinutes?: number | null
  /** Hatırlatma penceresinin açılacağı an (DEVAM ET ile ileri atılır) */
  reminderDueAt?: string | null
  /** Hatırlatma şu an aktif mi (now ≥ reminderDueAt) */
  reminderActive?: boolean
  /** Cevap verilmezse modun otomatik kapanacağı an (reminderDueAt + autoCloseAfterMinutes) */
  autoCloseAt?: string | null
  /** En son otomatik kapanma anı (hiç olmadıysa null) */
  lastAutoClosedAt?: string | null
  reminderAfterMinutes?: number
  autoCloseAfterMinutes?: number
  /** Periyot başına minimum bakım süresi — bu süre dolmadan "tamamlandı" 409 döner */
  rules?: MaintenanceRule[]
  // ── BAKIM KİLİDİ (EXCEL 34, DataApi MaintenanceLockRules, 2026-11-01) ──
  // Eski DataApi göndermez → yoksa kilit yok sayılır. Otoriter karar backend'de (büküm başlatma 409).
  /** MachineSettings.MaintenanceLockEnabled (varsayılan false) */
  lockEnabled?: boolean
  /** Ayar açık VE bir periyot vadesinden ≥ lockAfterOverdueDays gün geçmiş → büküm başlatılamaz */
  lockActive?: boolean
  /** "Haftalık bakım vadesinin üzerinden 23 gün geçti" (kilit yoksa null) */
  lockReason?: string | null
  /** Büküm başlatma 409 mesajı: "BAKIM KİLİDİ: Haftalık bakımı yapılmadan büküm başlatılamaz" */
  lockMessage?: string | null
  lockAfterOverdueDays?: number
  /** Kilit eşiğini geçmiş periyotlar (ayar kapalıyken de dolu — bilgi) */
  lockedPeriods?: MaintenanceLockedPeriod[]
}

export interface MaintenanceLockedPeriod {
  periodKey: MaintenancePeriodKey
  label: string
  overdueDays: number
}

/** Periyodun minimum bakım süresi (DataApi MaintenanceRules tablosu) */
export interface MaintenanceRule {
  periodKey: MaintenancePeriodKey
  minDurationMinutes: number
}

/** GET/PUT /api/maintenance/rules — PUT'ta alanlar opsiyonel (ADMIN+ Bearer) */
export interface MaintenanceRulesConfig {
  rules: MaintenanceRule[]
  reminderAfterMinutes: number
  autoCloseAfterMinutes: number
}

/** Backend aralıkları (MaintenanceController) — form sınırları bunlarla aynı */
export const MAINTENANCE_RULE_LIMITS = {
  minDuration: { min: 1, max: 1440 },
  reminderAfter: { min: 15, max: 1440 },
  autoCloseAfter: { min: 1, max: 120 },
} as const

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
