// Usta öğrenme programı / makro (EXCEL 28) IPC handler'ları — DataApi /api/macros CRUD.
// Hareket (oynatma) burada değil: renderer mevcut piston / rotasyon / pnömatik kanallarını kullanır.
// Hatalar HttpError olarak fırlatılır (body.error mesajı) — renderer ön eki temizleyip gösterir.

import { ipcMain } from 'electron'

import { childLogger } from '@main/lib/logger'
import { dataApi } from '@main/services/data-api/DataApiClient'
import { Ipc, type MacroSaveBody } from '@shared'

const log = childLogger('ipc:macro')

/** Renderer'dan gelen gövdeyi sadece sözleşmedeki alanlara indir */
function sanitize(body: MacroSaveBody): MacroSaveBody {
  return {
    name: String(body?.name ?? ''),
    description: body?.description ?? null,
    steps: (body?.steps ?? []).map((s) => ({
      axis: s.axis,
      stepType: s.stepType,
      value: Number(s.value),
      speedPercent: Math.round(Number(s.speedPercent) || 0),
    })),
  }
}

export function registerMacroHandlers(): void {
  ipcMain.handle(Ipc.IpcInvoke.MacroList, async () => {
    return dataApi.listMacros()
  })

  ipcMain.handle(Ipc.IpcInvoke.MacroGet, async (_evt, id: number) => {
    return dataApi.getMacro(Number(id))
  })

  ipcMain.handle(Ipc.IpcInvoke.MacroCreate, async (_evt, body: MacroSaveBody) => {
    const clean = sanitize(body)
    log.info('create-macro', { name: clean.name, steps: clean.steps.length })
    return dataApi.createMacro(clean)
  })

  ipcMain.handle(
    Ipc.IpcInvoke.MacroUpdate,
    async (_evt, payload: { id: number; body: MacroSaveBody }) => {
      const clean = sanitize(payload.body)
      log.info('update-macro', { id: payload.id, name: clean.name, steps: clean.steps.length })
      return dataApi.updateMacro(Number(payload.id), clean)
    },
  )

  ipcMain.handle(Ipc.IpcInvoke.MacroDelete, async (_evt, id: number) => {
    log.info('delete-macro', { id })
    return dataApi.deleteMacro(Number(id))
  })
}
