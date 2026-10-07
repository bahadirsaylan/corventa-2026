// window.corventa.system.* — sistem yardımcıları (PDF açma vb.).

import { ipcRenderer } from 'electron'

import { Ipc } from '@shared'

export interface OpenUserGuideResult {
  ok: boolean
  error?: string
}

export const systemApi = {
  openUserGuide: (): Promise<OpenUserGuideResult> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.OpenUserGuide),

  // 2026-09-04 — Kiosk mode gizli cikis. Rol/sifre yapisi sonraki fazda eklenecek.
  // Renderer 5-tap logo veya 5sn uzun basis tetikleyicisi bunu cagirir.
  exitKiosk: (): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('kiosk:exit'),
}

export type SystemApi = typeof systemApi
