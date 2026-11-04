// Kullanım süreleri IPC handler'ları — DataApi GET /api/usage-time/summary.
// Renderer asla DataApi'ye direkt fetch atmaz; tüm trafik bu handler üzerinden gider.

import { ipcMain } from 'electron'

import { childLogger } from '@main/lib/logger'
import { dataApi } from '@main/services/data-api/DataApiClient'
import { Ipc } from '@shared'

const log = childLogger('ipc:usage')

export function registerUsageHandlers(): void {
  ipcMain.handle(Ipc.IpcInvoke.UsageGetSummary, async (_evt, days?: number) => {
    // Backend 1..366 kabul eder; dışındaysa 400 yerine sınırla
    const d = Math.min(366, Math.max(1, Math.round(Number(days) || 30)))
    log.debug('get-usage-summary', { days: d })
    return dataApi.getUsageTimeSummary(d)
  })
}
