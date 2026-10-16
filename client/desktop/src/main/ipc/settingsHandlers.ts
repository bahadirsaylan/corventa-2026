// Ayarlar (Settings) sayfaları için IPC handler'ları — MachineIdentity + MaintenanceState.
// Renderer asla DataApi'ye direkt fetch atmaz; tüm trafik bu handler üzerinden gider.
// Cloud proxy geçişinde tek nokta: DataApiClient baseUrl.

import { ipcMain } from 'electron'

import { childLogger } from '@main/lib/logger'
import { dataApi } from '@main/services/data-api/DataApiClient'
import { engineApi } from '@main/services/engine-api/EngineApiClient'
import {
  Ipc,
  type GonyeSettingsDto,
  type MachineSettingsDto,
  type StageInfo,
  type MachineIdentity,
  type MaintenancePeriodKey,
} from '@shared'

const log = childLogger('ipc:settings')

export function registerSettingsHandlers(): void {
  // ---------- USER PREFERENCES ----------

  ipcMain.handle(Ipc.IpcInvoke.SettingsGetUserPreference, async (_evt, userKey: string, prefKey: string) => {
    return dataApi.getUserPreference(userKey, prefKey)
  })

  ipcMain.handle(
    Ipc.IpcInvoke.SettingsPutUserPreference,
    async (_evt, userKey: string, prefKey: string, valueJson: string) => {
      log.info('put-user-preference', { userKey, prefKey })
      return dataApi.putUserPreference(userKey, prefKey, valueJson)
    },
  )

  // ---------- STAGES ----------

  ipcMain.handle(Ipc.IpcInvoke.SettingsGetStages, async () => {
    return dataApi.getStages()
  })

  // ---------- MAKİNE AYARLARI (Bending API — kayıt sonrası orchestrator yenilenir) ----------
  // Renderer sadece değişen alanları yollar; güncel kayıt okunup üstüne yazılır → dokunulmayan
  // alanlar backend'deki değerleriyle birebir geri gider (yuvarlama / null kaybı olmaz).

  ipcMain.handle(Ipc.IpcInvoke.SettingsGetMachine, async () => engineApi.getMachineSettings())

  ipcMain.handle(Ipc.IpcInvoke.SettingsUpdateMachine, async (_evt, patch: MachineSettingsDto) => {
    log.info('update-machine-settings', { fields: Object.keys(patch ?? {}) })
    const current = await engineApi.getMachineSettings()
    return engineApi.updateMachineSettings({ ...current, ...patch })
  })

  ipcMain.handle(Ipc.IpcInvoke.SettingsGetGonye, async () => engineApi.getGonyeSettings())

  ipcMain.handle(Ipc.IpcInvoke.SettingsUpdateGonye, async (_evt, patch: Partial<GonyeSettingsDto>) => {
    log.info('update-gonye-settings', { fields: Object.keys(patch ?? {}) })
    const current = await engineApi.getGonyeSettings()
    return engineApi.updateGonyeSettings({ ...current, ...patch })
  })

  ipcMain.handle(Ipc.IpcInvoke.SettingsUpdateStage, async (_evt, id: number, patch: Partial<StageInfo>) => {
    log.info('update-stage', { id, fields: Object.keys(patch ?? {}) })
    const current = (await dataApi.getStages()).find((s) => s.id === id)
    if (!current) throw new Error(`Stage id=${id} bulunamadı`)
    return engineApi.updateStage(id, { ...current, ...patch })
  })

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
