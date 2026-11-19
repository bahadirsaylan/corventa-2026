// Kullanım süreleri IPC handler'ları — DataApi GET /api/usage-time/summary.
// Renderer asla DataApi'ye direkt fetch atmaz; tüm trafik bu handler üzerinden gider.

import { ipcMain } from 'electron'

import { childLogger } from '@main/lib/logger'
import { dataApi } from '@main/services/data-api/DataApiClient'
import { Ipc, type BendingCountReportQuery, type BendingReportGroupBy } from '@shared'

const log = childLogger('ipc:usage')

export function registerUsageHandlers(): void {
  ipcMain.handle(Ipc.IpcInvoke.UsageGetSummary, async (_evt, days?: number) => {
    // Backend 1..366 kabul eder; dışındaysa 400 yerine sınırla
    const d = Math.min(366, Math.max(1, Math.round(Number(days) || 30)))
    log.debug('get-usage-summary', { days: d })
    return dataApi.getUsageTimeSummary(d)
  })

  // Kıvrım adetleri raporu — renderer'dan gelen sorgu süzülür (sadece bilinen alanlar)
  ipcMain.handle(Ipc.IpcInvoke.UsageGetBendingCountReport, async (_evt, raw?: BendingCountReportQuery) => {
    const day = (v: unknown): string | undefined =>
      typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined
    const int = (v: unknown): number | undefined =>
      typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : undefined
    const groups: BendingReportGroupBy[] = ['day', 'week', 'month']
    const q: BendingCountReportQuery = {
      from: day(raw?.from),
      to: day(raw?.to),
      groupBy: groups.includes(raw?.groupBy as BendingReportGroupBy) ? raw?.groupBy : undefined,
      method: int(raw?.method),
      profileType: int(raw?.profileType),
    }
    log.debug('get-bending-count-report', q)
    return dataApi.getBendingCountReport(q)
  })
}
