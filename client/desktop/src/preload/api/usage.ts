// window.corventa.usage.* — Kullanım süreleri (DataApi usage-time) köprüsü.
// Renderer'da mock yok; veri main → DataApiClient → DataApi'den gelir (demo'da DemoMachine).

import { ipcRenderer } from 'electron'

import { Ipc, type UsageTimeSummary } from '@shared'

export const usageApi = {
  /** Kategori bazlı kullanım süreleri — days 1..366 (varsayılan 30) */
  getSummary: (days = 30): Promise<UsageTimeSummary> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.UsageGetSummary, days),
}

export type UsageApi = typeof usageApi
