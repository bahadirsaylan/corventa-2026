// window.corventa.settings.* — Ayarlar sayfaları için DataApi köprüsü.
// MachineIdentity (garanti + müşteri) + MaintenanceState (bakım periyot takibi).

import { ipcRenderer } from 'electron'

import {
  Ipc,
  type MachineIdentity,
  type MaintenancePeriodKey,
  type MaintenanceState,
  type UserPreference,
} from '@shared'

export const settingsApi = {
  // Machine Identity
  getIdentity: (): Promise<MachineIdentity> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.SettingsGetIdentity),

  updateIdentity: (identity: MachineIdentity): Promise<MachineIdentity> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.SettingsUpdateIdentity, identity),

  // Maintenance
  getMaintenance: (): Promise<MaintenanceState> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.SettingsGetMaintenance),

  markMaintenanceCompleted: (period: MaintenancePeriodKey): Promise<MaintenanceState> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.SettingsMarkMaintenanceCompleted, period),

  setMaintenanceMode: (on: boolean): Promise<MaintenanceState> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.SettingsSetMaintenanceMode, on),

  // Kullanıcı tercihleri — kayıt yoksa null
  getUserPreference: (userKey: string, prefKey: string): Promise<UserPreference | null> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.SettingsGetUserPreference, userKey, prefKey),

  putUserPreference: (userKey: string, prefKey: string, valueJson: string): Promise<UserPreference> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.SettingsPutUserPreference, userKey, prefKey, valueJson),
}

export type SettingsApi = typeof settingsApi
