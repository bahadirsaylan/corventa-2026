// window.corventa.settings.* — Ayarlar sayfaları için DataApi köprüsü.
// MachineIdentity (garanti + müşteri) + MaintenanceState (bakım periyot takibi).

import { ipcRenderer } from 'electron'

import {
  Ipc,
  type GonyeSettingsDto,
  type MachineIdentity,
  type MachineSettingsDto,
  type MaintenancePeriodKey,
  type MaintenanceState,
  type StageInfo,
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

  // Stage tanımları (DataApi) — gönye ekranında stage seçimi
  getStages: (): Promise<StageInfo[]> => ipcRenderer.invoke(Ipc.IpcInvoke.SettingsGetStages),

  // Makine ayarları (Bending API) — sadece değişen alanlar gönderilir (patch); main güncel kaydı okuyup birleştirir
  getMachine: (): Promise<MachineSettingsDto> => ipcRenderer.invoke(Ipc.IpcInvoke.SettingsGetMachine),
  updateMachine: (patch: MachineSettingsDto): Promise<MachineSettingsDto> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.SettingsUpdateMachine, patch),
  getGonye: (): Promise<GonyeSettingsDto> => ipcRenderer.invoke(Ipc.IpcInvoke.SettingsGetGonye),
  updateGonye: (patch: Partial<GonyeSettingsDto>): Promise<GonyeSettingsDto> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.SettingsUpdateGonye, patch),
  updateStage: (id: number, patch: Partial<StageInfo>): Promise<StageInfo> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.SettingsUpdateStage, id, patch),
  // Admin Ayarları — pasifler dahil tüm stage'ler + yeni stage
  getAllStages: (): Promise<StageInfo[]> => ipcRenderer.invoke(Ipc.IpcInvoke.SettingsGetAllStages),
  createStage: (body: Partial<StageInfo>): Promise<StageInfo> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.SettingsCreateStage, body),
}

export type SettingsApi = typeof settingsApi
