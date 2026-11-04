// window.corventa.molds.* — Kalıp kütüphanesi + lisans (BULUT_API_V2.md §2, §6). DataApi /api/molds*.
// Hatalar { ok:false, status, error } zarfında: 400 biçim / lisans sebebi, 404 bulunamadı, 503 bulut yok,
// 501 DataApi bu ucu bilmiyor, 0 DataApi'ye ulaşılamadı.

import { ipcRenderer } from 'electron'

import {
  Ipc,
  type CloudResult,
  type MoldListQuery,
  type MoldListResponse,
  type MoldLookupResult,
} from '@shared'

export const moldApi = {
  list: (q?: MoldListQuery): Promise<CloudResult<MoldListResponse>> => ipcRenderer.invoke(Ipc.IpcInvoke.MoldList, q),
  /** Kod → kalıp + lisans durumu (DataApi çevrimiçiyse buluttan tazeler) */
  get: (code: string): Promise<CloudResult<MoldLookupResult>> => ipcRenderer.invoke(Ipc.IpcInvoke.MoldGet, code),
  /** OPERATOR+ — lisans anahtarı KL-XXXX-XXXX-XXXX, çevrimiçi etkinleştirme */
  activate: (code: string, licenseKey: string): Promise<CloudResult<MoldLookupResult>> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.MoldActivate, code, licenseKey),
}

export type MoldApi = typeof moldApi
