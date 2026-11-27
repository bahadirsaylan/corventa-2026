import { registerAiRecipeRulesHandlers } from './aiRecipeRulesHandlers'
import { registerAlertAckHandlers } from './alertAckHandlers'
import { registerAuthHandlers } from './authHandlers'
import { registerBendingHandlers } from './bendingHandlers'
import { registerCloudHandlers } from './cloudHandlers'
import { registerMachineHandlers } from './machineHandlers'
import { registerMoldHandlers } from './moldHandlers'
import { registerMacroHandlers } from './macroHandlers'
import { registerSavedBendHandlers } from './savedBendHandlers'
import { registerServiceHandlers } from './serviceHandlers'
import { registerSettingsHandlers } from './settingsHandlers'
import { registerSystemHandlers } from './systemHandlers'
import { registerUsageHandlers } from './usageHandlers'

export function registerIpcHandlers(): void {
  registerMachineHandlers()
  registerBendingHandlers()
  registerServiceHandlers()
  registerSettingsHandlers()
  registerSystemHandlers()
  registerUsageHandlers()
  registerAuthHandlers()
  registerMacroHandlers()
  registerSavedBendHandlers()
  registerAlertAckHandlers()
  registerAiRecipeRulesHandlers()
  registerCloudHandlers()
  registerMoldHandlers()
}
