import { registerBendingHandlers } from './bendingHandlers'
import { registerMachineHandlers } from './machineHandlers'
import { registerServiceHandlers } from './serviceHandlers'
import { registerSettingsHandlers } from './settingsHandlers'
import { registerSystemHandlers } from './systemHandlers'

export function registerIpcHandlers(): void {
  registerMachineHandlers()
  registerBendingHandlers()
  registerServiceHandlers()
  registerSettingsHandlers()
  registerSystemHandlers()
}
