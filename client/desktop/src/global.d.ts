// window.corventa global typing — preload tarafından contextBridge ile expose edilir.
// Burada renderer kodunun kullanabileceği şekilde Window interface'i genişletilir.

import type { ElectronAPI } from '@electron-toolkit/preload'

import type { BendingApi } from './preload/api/bending'
import type { EventsApi } from './preload/api/events'
import type { MachineApi } from './preload/api/machine'
import type { ServiceApi } from './preload/api/service'
import type { SettingsApi } from './preload/api/settings'
import type { SystemApi } from './preload/api/system'

declare global {
  interface CorventaAPI {
    getAppVersion: () => Promise<string>
    machine: MachineApi
    bending: BendingApi
    events: EventsApi
    service: ServiceApi
    settings: SettingsApi
    system: SystemApi
  }

  interface Window {
    electron: ElectronAPI
    corventa: CorventaAPI
  }
}

export {}
