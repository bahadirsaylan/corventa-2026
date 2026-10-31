// Bakım durumu hook'ları — maintenanceStore (DataApi /api/maintenance, 30 sn yenileme) üzerinden
// hafta kademeli uyarıları hesaplar. Kural ve sabitler: services/maintenanceStatus.ts

import { useMemo } from 'react'

import { useMaintenanceStore } from '@/stores/maintenanceStore'
import {
  computeAllMaintenanceStatuses,
  computeMaintenanceAlerts,
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

/** 5 periyodun tamamının durumu (bakım modu ekranı / Bakım Süresi sayfası). */
export function useMaintenanceStatuses(): MaintenancePeriodStatus[] {
  const state = useMaintenanceStore((s) => s.state)
  return useMemo(() => (state ? computeAllMaintenanceStatuses(state) : []), [state])
}
