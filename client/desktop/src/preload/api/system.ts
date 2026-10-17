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

  // Kılavuz PDF içeriği — uygulama içi görüntüleyici için
  readUserGuide: (): Promise<{ ok: boolean; data?: Uint8Array; error?: string }> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.ReadUserGuide),

  // Demo modu (CORVENTA_DEMO=1) açık mı
  isDemo: (): Promise<boolean> => ipcRenderer.invoke(Ipc.IpcInvoke.SystemIsDemo),

  // 2026-09-04 — Kiosk mode gizli cikis. Rol/sifre yapisi sonraki fazda eklenecek.
  // Renderer 5-tap logo veya 5sn uzun basis tetikleyicisi bunu cagirir.
  exitKiosk: (): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('kiosk:exit'),
}

export type SystemApi = typeof systemApi
