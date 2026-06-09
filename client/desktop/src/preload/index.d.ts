import type { ElectronAPI } from '@electron-toolkit/preload'

import type { BendingApi } from './api/bending'
import type { EventsApi } from './api/events'
import type { MachineApi } from './api/machine'
import type { ServiceApi } from './api/service'

export interface CorventaAPI {
  getAppVersion: () => Promise<string>
  machine: MachineApi
  bending: BendingApi
  events: EventsApi
  service: ServiceApi
}

declare global {
  interface Window {
    electron: ElectronAPI
    corventa: CorventaAPI
  }
}
