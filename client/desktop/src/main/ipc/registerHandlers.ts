import { registerBendingHandlers } from './bendingHandlers'
import { registerMachineHandlers } from './machineHandlers'
import { registerServiceHandlers } from './serviceHandlers'
import { registerSystemHandlers } from './systemHandlers'

export function registerIpcHandlers(): void {
  registerMachineHandlers()
  registerBendingHandlers()
  registerServiceHandlers()
  registerSystemHandlers()
}
