// Ayarlar (Settings) sayfaları için IPC handler'ları — MachineIdentity + MaintenanceState.
// Renderer asla DataApi'ye direkt fetch atmaz; tüm trafik bu handler üzerinden gider.
// Cloud proxy geçişinde tek nokta: DataApiClient baseUrl.

import { ipcMain } from 'electron'

import { childLogger } from '@main/lib/logger'
import { HttpError } from '@main/lib/http'
import { dataApi } from '@main/services/data-api/DataApiClient'
import { engineApi } from '@main/services/engine-api/EngineApiClient'
import {
  Ipc,
  normalizeCertificateCode,
  type CustomerChangeConfirmResponse,
  type CustomerChangeRequestBody,
  type CustomerChangeRequestResponse,
  type CustomerChangeResult,
  type GonyeSettingsDto,
  type MachineSettingsDto,
  type StageInfo,
  type MachineIdentity,
  type MaintenancePeriodKey,
} from '@shared'

const log = childLogger('ipc:settings')

/** HttpError → renderer'ın okuyabileceği hata sonucu (status 0 = DataApi'ye ulaşılamadı) */
function toCustomerChangeFailure(err: unknown): { ok: false; status: number; error: string; remainingAttempts?: number } {
  if (err instanceof HttpError) {
    const body = (err.body ?? {}) as { remainingAttempts?: unknown }
    const remaining = typeof body.remainingAttempts === 'number' ? body.remainingAttempts : undefined
    log.warn('customer-change failed', { status: err.status, error: err.message })
    return { ok: false, status: err.status, error: err.message, remainingAttempts: remaining }
  }
  const message = err instanceof Error ? err.message : String(err)
  log.warn('customer-change unreachable', { error: message })
  return { ok: false, status: 0, error: message }
}

async function reloadEngineQuietly(): Promise<void> {
  try {
    await engineApi.reloadSettings()
  } catch (err) {
    log.warn('engine settings reload failed', { error: (err as Error).message })
  }
}

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

  // Stage'ler: pasifler dahil DataApi'ye yazılır, ardından Bending API orchestrator'ı yenilenir
  ipcMain.handle(Ipc.IpcInvoke.SettingsGetAllStages, async () => dataApi.getStages(true))

  ipcMain.handle(Ipc.IpcInvoke.SettingsUpdateStage, async (_evt, id: number, patch: Partial<StageInfo>) => {
    log.info('update-stage', { id, fields: Object.keys(patch ?? {}) })
    const current = (await dataApi.getStages(true)).find((s) => s.id === id)
    if (!current) throw new Error(`Stage id=${id} bulunamadı`)
    const saved = await dataApi.updateStage(id, { ...current, ...patch })
    await reloadEngineQuietly()
    return saved
  })

  ipcMain.handle(Ipc.IpcInvoke.SettingsCreateStage, async (_evt, body: Partial<StageInfo>) => {
    log.info('create-stage', { stageNumber: body?.stageNumber })
    const saved = await dataApi.createStage(body)
    await reloadEngineQuietly()
    return saved
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

  // ---------- SERTİFİKA SORGULA ----------
  // null = bulunamadı (404). Ağ hatası fırlatılır → renderer ayrı hata durumu gösterir.

  ipcMain.handle(Ipc.IpcInvoke.CertificateGetByCode, async (_evt, code: string) => {
    const normalized = normalizeCertificateCode(String(code ?? ''))
    if (!normalized) return null
    log.info('get-certificate', { code: normalized })
    return dataApi.getCertificate(normalized)
  })

  // ---------- MÜŞTERİ DEĞİŞİKLİĞİ (satış / takas / hibe, e-posta OTP) ----------
  // Fırlatmak yerine sonuç nesnesi döner: Electron IPC hatanın sadece mesajını taşır, oysa
  // renderer 503 / 410 / 429 / hatalı OTP (kalan hak) durumlarını ayırt etmek zorunda.

  ipcMain.handle(
    Ipc.IpcInvoke.CustomerChangeRequest,
    async (_evt, body: CustomerChangeRequestBody): Promise<CustomerChangeResult<CustomerChangeRequestResponse>> => {
      log.info('customer-change-request', { reason: body?.reason, newCustomer: body?.newCustomerName })
      try {
        return { ok: true, data: await dataApi.requestCustomerChange(body) }
      } catch (err) {
        return toCustomerChangeFailure(err)
      }
    },
  )

  ipcMain.handle(
    Ipc.IpcInvoke.CustomerChangeConfirm,
    async (_evt, requestId: string, otp: string): Promise<CustomerChangeResult<CustomerChangeConfirmResponse>> => {
      log.info('customer-change-confirm', { requestId })
      try {
        const data = await dataApi.confirmCustomerChange(String(requestId ?? ''), String(otp ?? ''))
        log.info('customer-change-confirmed', {
          requestId,
          customer: data.machineIdentity?.customerName,
          ownership: data.machineIdentity?.ownershipType,
        })
        return { ok: true, data }
      } catch (err) {
        return toCustomerChangeFailure(err)
      }
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
