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
}

export type SystemApi = typeof systemApi
