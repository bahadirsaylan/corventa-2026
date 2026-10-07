// Ayarlar (Settings) sayfaları için IPC handler'ları — MachineIdentity + MaintenanceState.
// Renderer asla DataApi'ye direkt fetch atmaz; tüm trafik bu handler üzerinden gider.
// Cloud proxy geçişinde tek nokta: DataApiClient baseUrl.

import { ipcMain } from 'electron'

import { childLogger } from '@main/lib/logger'
import { dataApi } from '@main/services/data-api/DataApiClient'
import {
  Ipc,
  type MachineIdentity,
  type MaintenancePeriodKey,
} from '@shared'

const log = childLogger('ipc:settings')

export function registerSettingsHandlers(): void {
  // ---------- MACHINE IDENTITY ----------

  ipcMain.handle(Ipc.IpcInvoke.SettingsGetIdentity, async () => {
    return dataApi.getMachineIdentity()
  })

  ipcMain.handle(
    Ipc.IpcInvoke.SettingsUpdateIdentity,
    async (_evt, identity: MachineIdentity) => {
      log.info('update-identity', {
        serialNo: identity.serialNo,
        customer: identity.customerName,
        ownership: identity.ownershipType,
      })
      return dataApi.updateMachineIdentity(identity)
    },
  )

  // ---------- MAINTENANCE ----------

  ipcMain.handle(Ipc.IpcInvoke.SettingsGetMaintenance, async () => {
    return dataApi.getMaintenanceState()
  })

  ipcMain.handle(
    Ipc.IpcInvoke.SettingsMarkMaintenanceCompleted,
    async (_evt, period: MaintenancePeriodKey) => {
      log.info('mark-maintenance-completed', { period })
      return dataApi.markMaintenanceCompleted(period)
    },
  )

  ipcMain.handle(
    Ipc.IpcInvoke.SettingsSetMaintenanceMode,
    async (_evt, on: boolean) => {
      log.info('set-maintenance-mode', { on })
      return dataApi.setMaintenanceMode(on)
    },
  )
}
