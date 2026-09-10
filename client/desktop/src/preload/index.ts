import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

import { bendingApi } from './api/bending'
import { eventsApi } from './api/events'
import { machineApi } from './api/machine'
import { serviceApi } from './api/service'
import { settingsApi } from './api/settings'
import { systemApi } from './api/system'

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
    })
  } catch (error) {
    console.error('preload: contextBridge.exposeInMainWorld failed', error)
  }
}
