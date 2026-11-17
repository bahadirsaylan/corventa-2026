// STANDART SÜRÜM (2026-11-17) — KAYITLI BÜKÜMLER IPC handler'ları — DataApi /api/saved-bends CRUD (STANDART_SURUM.md §3.3).
// Yazma OPERATOR+, silme SUPERVISOR+ (DataApi [RequireRole]); Bearer başlığını http katmanı ekler (makrolar gibi).
// Hatalar HttpError olarak fırlatılır (body.error mesajı) — renderer ön eki temizleyip gösterir.

import { ipcMain } from 'electron'

import { childLogger } from '@main/lib/logger'
import { dataApi } from '@main/services/data-api/DataApiClient'
import { Ipc, type SavedBendSaveBody } from '@shared'

const log = childLogger('ipc:saved-bend')

const num = (v: unknown): number | undefined => {
  const n = Number(v)
  return v != null && v !== '' && Number.isFinite(n) ? n : undefined
}

/** Renderer'dan gelen gövdeyi sadece sözleşmedeki alanlara indir (yok = PUT'ta korunur) */
function sanitize(body: SavedBendSaveBody): SavedBendSaveBody {
  const b = body ?? {}
  const out: SavedBendSaveBody = {}
  if (b.name != null) out.name = String(b.name).slice(0, 100)
  if (b.method != null) out.method = String(b.method)
  if (b.paramsJson != null) out.paramsJson = String(b.paramsJson)
  if (num(b.targetDiameterMm) != null) out.targetDiameterMm = num(b.targetDiameterMm)
  if (num(b.profileA) != null) out.profileA = num(b.profileA)
  if (num(b.pushDepthMm) != null) out.pushDepthMm = num(b.pushDepthMm)
  if (num(b.stepDistanceMm) != null) out.stepDistanceMm = num(b.stepDistanceMm)
  if (b.stageNumber !== undefined) out.stageNumber = Number.isInteger(b.stageNumber) ? b.stageNumber : null
  if (b.correctionsJson !== undefined) out.correctionsJson = b.correctionsJson == null ? null : String(b.correctionsJson)
  if (b.sourceJobId !== undefined) out.sourceJobId = Number.isInteger(b.sourceJobId) ? b.sourceJobId : null
  return out
}

export function registerSavedBendHandlers(): void {
  ipcMain.handle(Ipc.IpcInvoke.SavedBendList, async () => dataApi.listSavedBends())

  ipcMain.handle(Ipc.IpcInvoke.SavedBendGet, async (_evt, id: number) => dataApi.getSavedBend(Number(id)))

  ipcMain.handle(Ipc.IpcInvoke.SavedBendCreate, async (_evt, body: SavedBendSaveBody) => {
    const clean = sanitize(body)
    log.info('create-saved-bend', { name: clean.name, pushDepthMm: clean.pushDepthMm })
    return dataApi.createSavedBend(clean)
  })

  ipcMain.handle(
    Ipc.IpcInvoke.SavedBendUpdate,
    async (_evt, payload: { id: number; body: SavedBendSaveBody }) => {
      const clean = sanitize(payload?.body)
      log.info('update-saved-bend', { id: payload?.id, name: clean.name, pushDepthMm: clean.pushDepthMm })
      return dataApi.updateSavedBend(Number(payload?.id), clean)
    },
  )

  ipcMain.handle(Ipc.IpcInvoke.SavedBendRan, async (_evt, id: number) => {
    log.info('saved-bend-ran', { id })
    return dataApi.markSavedBendRan(Number(id))
  })

  ipcMain.handle(Ipc.IpcInvoke.SavedBendDelete, async (_evt, id: number) => {
    log.info('delete-saved-bend', { id })
    return dataApi.deleteSavedBend(Number(id))
  })
}
