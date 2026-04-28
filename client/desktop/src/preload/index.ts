import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Expose electron-toolkit helpers (ipcRenderer, etc.)
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('corventa', {
      getAppVersion: (): Promise<string> =>
        ipcRenderer.invoke('app:get-version'),

      machine: {
        connect: (): Promise<void> => ipcRenderer.invoke('machine:connect'),
        disconnect: (): Promise<void> => ipcRenderer.invoke('machine:disconnect'),
        getStatus: (): Promise<unknown> => ipcRenderer.invoke('machine:get-status'),
      },

      on: (channel: string, callback: (...args: unknown[]) => void) => {
        ipcRenderer.on(channel, (_event, ...args) => callback(...args))
      },
      off: (channel: string, callback: (...args: unknown[]) => void) => {
        ipcRenderer.removeListener(channel, callback)
      },
    })
  } catch (error) {
    console.error(error)
  }
}
