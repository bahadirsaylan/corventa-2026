import type { ElectronAPI } from '@electron-toolkit/preload'

import type { AuthApi } from './api/auth'
import type { BendingApi } from './api/bending'
import type { EventsApi } from './api/events'
import type { MachineApi } from './api/machine'
import type { MacroApi } from './api/macro'
import type { ServiceApi } from './api/service'
import type { SystemApi } from './api/system'
import type { UsageApi } from './api/usage'

export interface CorventaAPI {
  getAppVersion: () => Promise<string>
  machine: MachineApi
  bending: BendingApi
  events: EventsApi
  service: ServiceApi
  system: SystemApi
  usage: UsageApi
  auth: AuthApi
  macro: MacroApi
}

declare global {
  interface Window {
    electron: ElectronAPI
    corventa: CorventaAPI
  }
}
