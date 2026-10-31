// Bakım periyodu durumu — Bakım Süresi sayfası (MaintenancePage), alt uyarı şeridi (BottomStatsPanel),
// girişten sonraki bakım uyarı penceresi ve bakım modu ekranı bu tek yardımcıyı kullanır.
//
// Veri: DataApi GET /api/maintenance (son yapılma tarihleri) + MAINTENANCE_PERIODS (tekrar aralıkları).
// Sonraki tarih = son yapılma + aralık. Hesap tamamen ekranda; backend'e kural eklenmedi.
//
// HAFTA KADEMELERİ (UI madde 19) — sonraki tarih GEÇTİKTEN sonra kaç gün geçtiğine göre:
//   0-6. gün   → 1. hafta  YEŞİL   hatırlatma
//   7-13. gün  → 2. hafta  SARI    uyarı
//   14-20. gün → 3. hafta  KIRMIZI kritik
//   21+ gün    → KIRMIZI + "bakım kilidi yakında" notu (kilit HENÜZ YOK — hiçbir hareket engellenmez)
// Vadesi gelmemiş periyot uyarı üretmez. Hiç yapılmamış (tarih yok) periyot da kademe üretmez
// (gecikme günü hesaplanamaz) — sayfada "HİÇ YAPILMADI" olarak görünür.
// Sınırları değiştirmek için aşağıdaki sabitleri düzenleyin.

import {
  MAINTENANCE_PERIODS,
  type MaintenancePeriodInfo,
  type MaintenanceState,
} from '@shared/types'

const DAY_MS = 86_400_000

/** Gecikmenin bu güne kadarki kısmı 1. hafta (yeşil hatırlatma) — 0..6 */
export const MAINT_WEEK1_END_DAY = 7
/** Bu güne kadarki kısmı 2. hafta (sarı uyarı) — 7..13 */
export const MAINT_WEEK2_END_DAY = 14
/** Bu güne kadarki kısmı 3. hafta (kırmızı kritik) — 14..20; bu ve sonrası "kilit yakında" */
export const MAINT_WEEK3_END_DAY = 21

/** Sayfa renk kodu — sarı: vadeye 7 gün kala (vade öncesi ön uyarı), kırmızı/kademe: geciken. */
export type MaintenanceSeverity = 'ok' | 'warn' | 'overdue' | 'unknown'

/** Gecikmiş periyodun hafta kademesi: 1. hafta yeşil, 2. hafta sarı, 3. hafta+ kırmızı. */
export type MaintenanceTier = 'reminder' | 'warning' | 'critical'

export interface MaintenancePeriodStatus {
  info: MaintenancePeriodInfo
  lastAt: string | null
  nextAt: Date | null
  /** Sonraki tarihe kalan tam gün; geçtiyse negatif. */
  daysUntilNext: number | null
  severity: MaintenanceSeverity
  /** Sonraki tarih geçtiyse geçen tam gün (0 = bugün geçti); değilse null. */
  overdueDays: number | null
  /** Sadece gecikmiş periyotta dolu. */
  tier: MaintenanceTier | null
  /** 21+ gün gecikme — "bakım kilidi yakında" notu (kilit yok, sadece bilgi). */
  lockSoon: boolean
}

const TIER_RANK: Record<MaintenanceTier, number> = { reminder: 1, warning: 2, critical: 3 }

export function pickLastAt(key: MaintenancePeriodInfo['key'], state: MaintenanceState): string | null {
  switch (key) {
    case 'daily':          return state.lastDailyAt
    case 'weekly':         return state.lastWeeklyAt
    case 'monthly':        return state.lastMonthlyAt
    case 'six-monthly':    return state.last6MonthlyAt
    case 'twelve-monthly': return state.last12MonthlyAt
  }
}

/** Gecikme gününden hafta kademesi. */
export function tierForOverdueDays(overdueDays: number): MaintenanceTier {
  if (overdueDays < MAINT_WEEK1_END_DAY) return 'reminder'
  if (overdueDays < MAINT_WEEK2_END_DAY) return 'warning'
  return 'critical'
}

export function computeMaintenanceStatus(
  info: MaintenancePeriodInfo,
  state: MaintenanceState,
  nowMs: number = Date.now(),
): MaintenancePeriodStatus {
  const lastAt = pickLastAt(info.key, state)
  if (!lastAt) {
    return {
      info, lastAt: null, nextAt: null, daysUntilNext: null,
      severity: 'unknown', overdueDays: null, tier: null, lockSoon: false,
    }
  }
  const nextAt = new Date(new Date(lastAt).getTime() + info.intervalDays * DAY_MS)
  const daysUntilNext = Math.floor((nextAt.getTime() - nowMs) / DAY_MS)
  let severity: MaintenanceSeverity = 'ok'
  if (daysUntilNext < 0) severity = 'overdue'
  else if (daysUntilNext <= Math.min(7, info.intervalDays / 4)) severity = 'warn'

  let overdueDays: number | null = null
  let tier: MaintenanceTier | null = null
  if (severity === 'overdue') {
    overdueDays = Math.max(0, Math.floor((nowMs - nextAt.getTime()) / DAY_MS))
    tier = tierForOverdueDays(overdueDays)
  }
  const lockSoon = overdueDays != null && overdueDays >= MAINT_WEEK3_END_DAY
  return { info, lastAt, nextAt, daysUntilNext, severity, overdueDays, tier, lockSoon }
}

/** 5 periyodun hepsinin durumu (MAINTENANCE_PERIODS sırasıyla). */
export function computeAllMaintenanceStatuses(
  state: MaintenanceState,
  nowMs: number = Date.now(),
): MaintenancePeriodStatus[] {
  return MAINTENANCE_PERIODS.map((p) => computeMaintenanceStatus(p, state, nowMs))
}

/** Sadece gecikmiş (kademesi olan) periyotlar — en yüksek kademe, sonra en çok geciken önce. */
export function computeMaintenanceAlerts(
  state: MaintenanceState,
  nowMs: number = Date.now(),
): MaintenancePeriodStatus[] {
  return computeAllMaintenanceStatuses(state, nowMs)
    .filter((s) => s.tier != null)
    .sort((a, b) =>
      TIER_RANK[b.tier!] - TIER_RANK[a.tier!] || (b.overdueDays ?? 0) - (a.overdueDays ?? 0))
}

/** En yüksek kademeli bakım uyarısı; yoksa null. */
export function topMaintenanceAlert(
  state: MaintenanceState | null,
  nowMs: number = Date.now(),
): MaintenancePeriodStatus | null {
  if (!state) return null
  return computeMaintenanceAlerts(state, nowMs)[0] ?? null
}

/** Kademe başlığı — çevrilecek Türkçe kaynak metin (t() ile kullanın). */
export function maintenanceTierTitle(tier: MaintenanceTier): string {
  switch (tier) {
    case 'reminder': return '1. HAFTA — BAKIM HATIRLATMASI'
    case 'warning':  return '2. HAFTA — BAKIM UYARISI'
    case 'critical': return '3. HAFTA — KRİTİK BAKIM UYARISI'
  }
}
