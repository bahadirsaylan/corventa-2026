import { ElectronAPI } from '@electron-toolkit/preload'

export interface CorventaAPI {
  getAppVersion: () => Promise<string>
  machine: {
    connect: () => Promise<void>
    disconnect: () => Promise<void>
    getStatus: () => Promise<unknown>
  }
  on: (channel: string, callback: (...args: unknown[]) => void) => void
  off: (channel: string, callback: (...args: unknown[]) => void) => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    corventa: CorventaAPI
  }
}
