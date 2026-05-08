import { registerBendingHandlers } from './bendingHandlers'
import { registerMachineHandlers } from './machineHandlers'

export function registerIpcHandlers(): void {
  registerMachineHandlers()
  registerBendingHandlers()
}
