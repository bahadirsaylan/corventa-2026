// window.corventa global typing — preload tarafından contextBridge ile expose edilir.
// Burada renderer kodunun kullanabileceği şekilde Window interface'i genişletilir.

import type { ElectronAPI } from '@electron-toolkit/preload'

import type { AuthApi } from './preload/api/auth'
import type { BendingApi } from './preload/api/bending'
import type { CloudApi } from './preload/api/cloud'
import type { EventsApi } from './preload/api/events'
import type { MachineApi } from './preload/api/machine'
import type { MacroApi } from './preload/api/macro'
import type { ServiceApi } from './preload/api/service'
import type { SettingsApi } from './preload/api/settings'
import type { SystemApi } from './preload/api/system'
import type { UsageApi } from './preload/api/usage'

declare global {
  interface CorventaAPI {
    getAppVersion: () => Promise<string>
    machine: MachineApi
    bending: BendingApi
    events: EventsApi
    service: ServiceApi
    settings: SettingsApi
    system: SystemApi
    usage: UsageApi
    auth: AuthApi
    macro: MacroApi
    cloud: CloudApi
  }

  interface Window {
    electron: ElectronAPI
    corventa: CorventaAPI
  }
}

export {}
