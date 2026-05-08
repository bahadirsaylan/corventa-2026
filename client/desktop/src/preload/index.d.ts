import type { ElectronAPI } from '@electron-toolkit/preload'

import type { BendingApi } from './api/bending'
import type { EventsApi } from './api/events'
import type { MachineApi } from './api/machine'

export interface CorventaAPI {
  getAppVersion: () => Promise<string>
  machine: MachineApi
  bending: BendingApi
  events: EventsApi
}

declare global {
  interface Window {
    electron: ElectronAPI
    corventa: CorventaAPI
  }
}
