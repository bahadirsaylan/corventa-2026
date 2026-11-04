// Bakım durumu hook'ları — maintenanceStore (DataApi /api/maintenance, 30 sn yenileme) üzerinden
// hafta kademeli uyarıları hesaplar. Kural ve sabitler: services/maintenanceStatus.ts

import { useEffect, useMemo, useState } from 'react'

import type { MaintenancePeriodKey } from '@shared/types'

import { useMaintenanceStore } from '@/stores/maintenanceStore'
import {
  computeAllMaintenanceStatuses,
  computeMaintenanceAlerts,
  maintenanceLockActive,
  type MaintenancePeriodStatus,
} from '@/services/maintenanceStatus'

/** Gecikmiş periyotlar (en yüksek kademe önce) + en üstteki uyarı. */
export function useMaintenanceAlerts(): {
  alerts: MaintenancePeriodStatus[]
  top: MaintenancePeriodStatus | null
  loaded: boolean
} {
  const state = useMaintenanceStore((s) => s.state)
  const loaded = useMaintenanceStore((s) => s.loaded)
  const alerts = useMemo(() => (state ? computeMaintenanceAlerts(state) : []), [state])
  return { alerts, top: alerts[0] ?? null, loaded }
}

/**
 * BAKIM KİLİDİ (EXCEL 34) — backend kararı. active: büküm başlatma butonları kilitli gösterilir.
 * message: büküm başlatma 409 mesajıyla aynı Türkçe metin (translateProgress ile çevrilir).
 */
export function useMaintenanceLock(): {
  active: boolean
  reason: string | null
  message: string | null
} {
  const state = useMaintenanceStore((s) => s.state)
  return useMemo(
    () => ({
      active: maintenanceLockActive(state),
      reason: state?.lockReason ?? null,
      message: state?.lockMessage ?? null,
    }),
    [state],
  )
}

/** 5 periyodun tamamının durumu (bakım modu ekranı / Bakım Süresi sayfası). */
export function useMaintenanceStatuses(): MaintenancePeriodStatus[] {
  const state = useMaintenanceStore((s) => s.state)
  return useMemo(() => (state ? computeAllMaintenanceStatuses(state) : []), [state])
}

/** Saniyede bir güncellenen "şimdi" — sadece active iken çalışır (bakım modu sayaçları). */
export function useNowTick(active: boolean, intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [active, intervalMs])
  return now
}

export interface MaintenanceModeTiming {
  /** Bakım modu açık mı */
  on: boolean
  /** Açılış anından geçen süre (ms) — mod kapalı / bilinmiyorsa null */
  elapsedMs: number | null
  /** Periyodun minimum bakım süresi (dk) — kural yoksa (eski DataApi) null */
  minMinutes: (key: MaintenancePeriodKey) => number | null
  /**
   * "Tamamlandı" için kalan dakika (yukarı yuvarlanır; 0 = süre doldu).
   * Mod kapalıysa / kural yoksa null. Asıl karar backend'de (409) — bu sadece gösterim.
   */
  remainingMinutes: (key: MaintenancePeriodKey) => number | null
}

/**
 * Bakım modu süre kuralları (DataApi rules[] + modeStartedAt) — bakım modu ekranı ve Bakım Süresi
 * sayfasındaki "TAMAMLANDI" düğmeleri için. `now` dışarıdan verilir (useNowTick).
 */
export function useMaintenanceModeTiming(now: number): MaintenanceModeTiming {
  const state = useMaintenanceStore((s) => s.state)
  const sinceMs = useMaintenanceStore((s) => s.modeSinceMs)
  const on = state?.isInMaintenanceMode === true
  const elapsedMs = on && sinceMs != null ? Math.max(0, now - sinceMs) : null
  const rules = state?.rules
  const minMinutes = (key: MaintenancePeriodKey): number | null =>
    rules?.find((r) => r.periodKey === key)?.minDurationMinutes ?? null
  const remainingMinutes = (key: MaintenancePeriodKey): number | null => {
    const min = minMinutes(key)
    if (!on || min == null || elapsedMs == null) return null
    return Math.max(0, Math.ceil((min * 60_000 - elapsedMs) / 60_000))
  }
  return { on, elapsedMs, minMinutes, remainingMinutes }
}
