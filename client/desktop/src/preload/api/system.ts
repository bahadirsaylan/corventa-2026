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

  // 2026-09-04 — Kiosk mode gizli cikis. Renderer 5-tap / 5sn uzun basis tetikleyicisi cagirir.
  // Main ADMIN+ oturum yoksa reddeder (ok: false).
  exitKiosk: (): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('kiosk:exit'),
}

export type SystemApi = typeof systemApi
