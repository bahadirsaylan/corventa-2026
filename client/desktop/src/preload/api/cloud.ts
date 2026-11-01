// window.corventa.cloud.* — Bulut bağlantısı (DataApi /api/cloud/*, BULUT_API.md §4) + güncelleme kurulumu (§5).
// Veri main → DataApiClient → DataApi'den gelir (demo'da DemoMachine). Hatalar { ok:false, status, error } zarfında.

import { ipcRenderer } from 'electron'

import {
  Ipc,
  type CloudInstallBlockers,
  type CloudInstallResult,
  type CloudResult,
  type CloudStatus,
} from '@shared'

export const cloudApi = {
  getStatus: (): Promise<CloudResult<CloudStatus>> => ipcRenderer.invoke(Ipc.IpcInvoke.CloudGetStatus),
  /** ADMIN+ — kod XXXX-XXXX-XXXX-XXXX */
  activate: (code: string): Promise<CloudResult<CloudStatus>> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.CloudActivate, code),
  syncNow: (): Promise<CloudResult<unknown>> => ipcRenderer.invoke(Ipc.IpcInvoke.CloudSyncNow),
  /** ADMIN+ — DataApi arka planda indirir; ilerleme getStatus().update.progress */
  downloadUpdate: (): Promise<CloudResult<unknown>> => ipcRenderer.invoke(Ipc.IpcInvoke.CloudDownloadUpdate),
  /** ADMIN+ — Big Data reçete paylaşımı */
  setShare: (shareRecipes: boolean): Promise<CloudResult<unknown>> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.CloudSetShare, shareRecipes),
  /** SUPERADMIN */
  deactivate: (): Promise<CloudResult<CloudStatus>> => ipcRenderer.invoke(Ipc.IpcInvoke.CloudDeactivate),
  /** null = DataApi'ye ulaşılamadı (büküm durumu bilinmiyor) */
  getInstallBlockers: (): Promise<CloudInstallBlockers | null> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.CloudGetInstallBlockers),
  /** ADMIN+ — setup'ı başlatır, ok:true ise uygulama birazdan kapanır */
  installUpdate: (downloadPath: string): Promise<CloudInstallResult> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.CloudInstallUpdate, downloadPath),
}

export type CloudApi = typeof cloudApi
