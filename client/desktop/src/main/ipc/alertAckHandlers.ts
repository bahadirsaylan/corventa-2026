// UYARI KAYITLARI (2026-11-19) IPC handler'ları — DataApi /api/alert-acks.
//   create  → POST /api/alert-acks (OPERATOR+; kullanıcı / rol DataApi'de oturumdan yazılır)
//   list    → GET  /api/alert-acks?kind=&key=&action=&from=&to=&page=&pageSize= (SUPERVISOR+)
//   summary → GET  /api/alert-acks/summary (SUPERVISOR+)
// Bearer başlığını http katmanı ekler; demo modunda http interceptor (demoAlertAcks.ts) cevaplar.
// Hatalar HttpError olarak fırlatılır (body.error) — renderer gösterir / yutar.

import { ipcMain } from 'electron'

import { getConfig } from '@main/config/runtime-config'
import { http } from '@main/lib/http'
import { childLogger } from '@main/lib/logger'
import { Ipc } from '@shared'
import type {
  AlertAckCreateBody,
  AlertAckCreateResult,
  AlertAckListQuery,
  AlertAckPage,
  AlertAckSummary,
} from '@shared/types/alert-ack'

const log = childLogger('ipc:alert-ack')

const base = (): string => getConfig().dataApi.baseUrl

const str = (v: unknown, max: number): string | undefined =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined

/** Renderer gövdesini sözleşmedeki alanlara indir */
function sanitize(b: AlertAckCreateBody): AlertAckCreateBody {
  return {
    alertKind: str(b?.alertKind, 40) ?? '',
    alertKey: str(b?.alertKey, 700),
    message: str(b?.message, 2000) ?? '',
    severity: b?.severity === 'info' || b?.severity === 'error' ? b.severity : 'warning',
    shownAt: str(b?.shownAt, 40) ?? null,
    action: (str(b?.action, 32) ?? 'DISMISSED') as AlertAckCreateBody['action'],
    sessionId: str(b?.sessionId, 64) ?? null,
    machineStateJson: str(b?.machineStateJson, 4000) ?? null,
  }
}

export function registerAlertAckHandlers(): void {
  ipcMain.handle(Ipc.IpcInvoke.AlertAckCreate, async (_evt, body: AlertAckCreateBody) => {
    const clean = sanitize(body)
    log.info('alert-ack', { kind: clean.alertKind, key: clean.alertKey, action: clean.action })
    return http.post<AlertAckCreateResult>(`${base()}/api/alert-acks`, clean)
  })

  ipcMain.handle(Ipc.IpcInvoke.AlertAckList, async (_evt, q?: AlertAckListQuery) => {
    const p = new URLSearchParams()
    p.set('page', String(Math.max(1, Math.round(Number(q?.page) || 1))))
    p.set('pageSize', String(Math.min(100, Math.max(1, Math.round(Number(q?.pageSize) || 20)))))
    if (q?.kind) p.set('kind', String(q.kind))
    if (q?.key) p.set('key', String(q.key))
    if (q?.action) p.set('action', String(q.action))
    if (q?.from) p.set('from', String(q.from))
    if (q?.to) p.set('to', String(q.to))
    return http.get<AlertAckPage>(`${base()}/api/alert-acks?${p.toString()}`)
  })

  ipcMain.handle(Ipc.IpcInvoke.AlertAckSummary, async () =>
    http.get<AlertAckSummary>(`${base()}/api/alert-acks/summary`),
  )
}
