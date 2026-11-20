// window.corventa.macro.* — Usta öğrenme programı / makro (EXCEL 28) CRUD'u.
// Oynatma window.corventa.machine.* hareket kanallarıyla renderer'da yapılır (services/macroRunner).

import { ipcRenderer } from 'electron'

import { Ipc, type Macro, type MacroSaveBody, type MacroSummary } from '@shared'

export const macroApi = {
  list: (): Promise<MacroSummary[]> => ipcRenderer.invoke(Ipc.IpcInvoke.MacroList),

  get: (id: number): Promise<Macro> => ipcRenderer.invoke(Ipc.IpcInvoke.MacroGet, id),

  /** OPERATOR+ */
  create: (body: MacroSaveBody): Promise<Macro> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.MacroCreate, body),

  /** OPERATOR+ — adım listesi tamamen değiştirilir */
  update: (id: number, body: MacroSaveBody): Promise<Macro> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.MacroUpdate, { id, body }),

  /** ADMIN+ */
  remove: (id: number): Promise<unknown> => ipcRenderer.invoke(Ipc.IpcInvoke.MacroDelete, id),
}

export type MacroApi = typeof macroApi
