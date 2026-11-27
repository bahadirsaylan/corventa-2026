import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

import { authApi } from './api/auth'
import { bendingApi } from './api/bending'
import { cloudApi } from './api/cloud'
import { eventsApi } from './api/events'
import { machineApi } from './api/machine'
import { macroApi } from './api/macro'
import { moldApi } from './api/molds'
import { serviceApi } from './api/service'
import { settingsApi } from './api/settings'
import { systemApi } from './api/system'
import { usageApi } from './api/usage'

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('corventa', {
      getAppVersion: (): Promise<string> => ipcRenderer.invoke('app:get-version'),

      machine: machineApi,
      bending: bendingApi,
      events: eventsApi,
      service: serviceApi,
      settings: settingsApi,
      system: systemApi,
      usage: usageApi,
      auth: authApi,
      macro: macroApi,
      cloud: cloudApi,
      molds: moldApi,
    })
  } catch (error) {
    console.error('preload: contextBridge.exposeInMainWorld failed', error)
  }
}
