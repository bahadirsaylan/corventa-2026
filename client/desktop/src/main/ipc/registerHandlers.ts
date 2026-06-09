import { registerBendingHandlers } from './bendingHandlers'
import { registerMachineHandlers } from './machineHandlers'
import { registerServiceHandlers } from './serviceHandlers'

export function registerIpcHandlers(): void {
  registerMachineHandlers()
  registerBendingHandlers()
  registerServiceHandlers()
}
