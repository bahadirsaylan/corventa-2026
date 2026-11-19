// window.corventa.usage.* — Kullanım süreleri (DataApi usage-time) köprüsü.
// Renderer'da mock yok; veri main → DataApiClient → DataApi'den gelir (demo'da DemoMachine).

import { ipcRenderer } from 'electron'

import { Ipc, type BendingCountReport, type BendingCountReportQuery, type UsageTimeSummary } from '@shared'

export const usageApi = {
  /** Kategori bazlı kullanım süreleri — days 1..366 (varsayılan 30) */
  getSummary: (days = 30): Promise<UsageTimeSummary> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.UsageGetSummary, days),

  /** KIVRIM ADETLERİ RAPORU — DataApi GET /api/reports/bending-count */
  getBendingCountReport: (q: BendingCountReportQuery = {}): Promise<BendingCountReport> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.UsageGetBendingCountReport, q),
}

export type UsageApi = typeof usageApi
