// window.corventa global typing — preload tarafından contextBridge ile expose edilir.
// Burada renderer kodunun kullanabileceği şekilde Window interface'i genişletilir.

import type { ElectronAPI } from '@electron-toolkit/preload'

import type { BendingApi } from './preload/api/bending'
import type { EventsApi } from './preload/api/events'
import type { MachineApi } from './preload/api/machine'

declare global {
  interface CorventaAPI {
    getAppVersion: () => Promise<string>
    machine: MachineApi
    bending: BendingApi
    events: EventsApi
  }

  interface Window {
    electron: ElectronAPI
    corventa: CorventaAPI
  }
}

export {}
