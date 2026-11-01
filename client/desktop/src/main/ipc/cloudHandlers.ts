// Bulut bağlantısı IPC handler'ları — DataApi /api/cloud/* (BULUT_API.md §4) + güncelleme kurulumu (§5).
//
// Güncelleme kurulumu (cloud:install-update):
//   1. Oturum ADMIN+ olmalı; paketli sürüm olmalı (geliştirmede CORVENTA_ALLOW_DEV_UPDATE=1 ile açılır).
//   2. Dosya yolu DataApi'nin indirdiği yerde olmalı: <DATA_DIR>\updates\*.exe (C:\ProgramData\Corventa\updates).
//   3. Büküm (DataApi Running iş + taze ilerleme), tahliye ya da piston/rotasyon hareketi varsa REDDEDİLİR —
//      renderer da düğmeyi kapatır, bu ikinci (asıl) kontroldür.
//   4. Backend'ler (DataApi / Bending API) durdurulur — kurulum resources\backend altındaki exe'lerin
//      üzerine yazacağı için kilitli kalmamalılar. Sonra setup '/S --force-run' ile ayrık başlatılır
//      (NSIS tek tık, sessiz kurulum + bitince uygulamayı yeniden açar) ve uygulama app.quit() ile kapanır
//      (before-quit: SignalR + supervisor). Setup başlatılamazsa uygulama yeniden başlatılır (relaunch).

import { app, ipcMain } from 'electron'
import { spawn } from 'child_process'
import { existsSync, realpathSync, statSync } from 'fs'
import { dirname, basename, isAbsolute, join, relative, resolve } from 'path'

import { IS_DEMO } from '@main/demo/DemoMachine'
import { HttpError } from '@main/lib/http'
import { childLogger } from '@main/lib/logger'
import { isUnloadActive } from '@main/services/activity/unloadActivity'
import { sessionHasRole, getAuthUser } from '@main/services/auth/authSession'
import { backendSupervisor, DATA_DIR } from '@main/services/backend-supervisor/BackendSupervisor'
import { connectionManager } from '@main/services/ConnectionManager'
import { dataApi } from '@main/services/data-api/DataApiClient'
import {
  Ipc,
  type CloudInstallBlockers,
  type CloudInstallResult,
  type CloudResult,
  type CloudStatus,
} from '@shared'

const log = childLogger('ipc:cloud')

/** Büküm ilerlemesi bu süreden yeniyse iş gerçekten çalışıyor sayılır (backend her 100 ms'de push eder) */
const PROGRESS_FRESH_MS = 15_000
const ACTIVATION_CODE_RE = /^[A-Z0-9]{4}(-[A-Z0-9]{4}){3}$/

let lastProgressAt = 0
let installing = false

function failure(err: unknown): { ok: false; status: number; error: string } {
  if (err instanceof HttpError) {
    log.warn('cloud request failed', { status: err.status, error: err.message })
    return { ok: false, status: err.status, error: err.message }
  }
  const message = err instanceof Error ? err.message : String(err)
  log.warn('cloud request unreachable', { error: message })
  return { ok: false, status: 0, error: message }
}

async function wrap<T>(fn: () => Promise<T>): Promise<CloudResult<T>> {
  try {
    return { ok: true, data: await fn() }
  } catch (err) {
    return failure(err)
  }
}

function denied(min: 'ADMIN' | 'SUPERADMIN'): { ok: false; status: number; error: string } {
  log.warn('cloud action denied — role', { min, username: getAuthUser()?.username ?? null })
  return { ok: false, status: 403, error: `${min === 'SUPERADMIN' ? 'SÜPERADMİN' : 'ADMİN'} yetkisi gerekli` }
}

/** Piston / rotasyon hareket halinde mi (son SignalR state'i) */
function isMachineMoving(): boolean {
  const s = connectionManager.getLatestState()
  if (!s) return false
  const pistons = [s.rightPiston, s.leftPiston, s.upperPiston, s.lowerPiston]
  return pistons.some((p) => p?.moving === true) || (s.rotation?.activeDirection ?? 0) !== 0
}

/** Kurulumu engelleyen durumlar. DataApi'ye ulaşılamazsa büküm durumu bilinmez → null (reddet). */
async function computeBlockers(): Promise<CloudInstallBlockers | null> {
  let activeJob: unknown = null
  try {
    activeJob = await dataApi.getActiveBendingJob()
  } catch (err) {
    log.warn('active job check failed', { error: (err as Error).message })
    return null
  }
  return {
    bendingActive: activeJob != null && Date.now() - lastProgressAt < PROGRESS_FRESH_MS,
    unloadActive: isUnloadActive(),
    machineMoving: isMachineMoving(),
  }
}

/** Setup yolu <DATA_DIR>\updates altında ve .exe mi — gerçek (symlink çözülmüş) yol döner, değilse hata metni */
function validateSetupPath(rawPath: unknown): { path: string } | { error: string } {
  if (typeof rawPath !== 'string' || !rawPath.trim()) return { error: 'Kurulum dosyası yolu boş' }
  const p = resolve(rawPath.trim())
  if (!p.toLowerCase().endsWith('.exe')) return { error: 'Kurulum dosyası .exe olmalı' }
  if (!existsSync(p)) return { error: `Kurulum dosyası bulunamadı: ${p}` }
  let real: string
  try {
    real = realpathSync(p)
    if (!statSync(real).isFile()) return { error: 'Kurulum yolu bir dosya değil' }
  } catch (err) {
    return { error: `Kurulum dosyası okunamadı: ${(err as Error).message}` }
  }
  const updatesDir = join(DATA_DIR, 'updates')
  const rel = relative(updatesDir.toLowerCase(), real.toLowerCase())
  const insideDataDir = rel !== '' && !rel.startsWith('..') && !isAbsolute(rel)
  // Geliştirmede DataApi bin\…\updates klasörüne indirir → izinli ise klasör adı 'updates' yeterli
  const devAllowed = !app.isPackaged && process.env.CORVENTA_ALLOW_DEV_UPDATE === '1'
    && basename(dirname(real)).toLowerCase() === 'updates'
  if (!insideDataDir && !devAllowed) return { error: `Kurulum dosyası ${updatesDir} klasöründe değil` }
  return { path: real }
}

/** Setup'ı ayrık başlat; süreç oluşunca resolve, oluşamazsa reject */
function launchSetup(path: string): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(path, ['/S', '--force-run'], {
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
      cwd: dirname(path),
    })
    child.once('error', reject)
    child.once('spawn', () => {
      child.unref()
      resolvePromise()
    })
  })
}

async function installUpdate(rawPath: unknown): Promise<CloudInstallResult> {
  if (installing) return { ok: false, error: 'Kurulum zaten başlatıldı' }
  if (!sessionHasRole('ADMIN')) return { ok: false, error: denied('ADMIN').error }
  if (IS_DEMO) return { ok: false, error: 'DEMO MODU — güncelleme kurulmaz' }
  if (!app.isPackaged && process.env.CORVENTA_ALLOW_DEV_UPDATE !== '1') {
    return { ok: false, error: 'Geliştirme modunda kurulum kapalı (CORVENTA_ALLOW_DEV_UPDATE=1 ile açılır)' }
  }

  const v = validateSetupPath(rawPath)
  if ('error' in v) {
    log.warn('install-update rejected — path', { rawPath, error: v.error })
    return { ok: false, error: v.error }
  }

  const blockers = await computeBlockers()
  if (!blockers) return { ok: false, error: 'Büküm durumu doğrulanamadı (DataApi yanıt vermiyor) — kurulum yapılmadı' }
  if (blockers.bendingActive) return { ok: false, error: 'Büküm sürüyor — güncelleme kurulamaz' }
  if (blockers.unloadActive) return { ok: false, error: 'Tahliye sürüyor — güncelleme kurulamaz' }
  if (blockers.machineMoving) return { ok: false, error: 'Makine hareket halinde — güncelleme kurulamaz' }

  installing = true
  log.warn('INSTALL UPDATE — backend servisleri durduruluyor, setup başlatılacak', {
    path: v.path,
    username: getAuthUser()?.username ?? null,
  })
  // Setup resources\backend altındaki exe'lerin üzerine yazar → önce backend'ler kapanmalı (kilitli kalmasın)
  await backendSupervisor.stop().catch(() => {})

  try {
    await launchSetup(v.path)
  } catch (err) {
    const msg = (err as Error).message
    // Backend'ler kapalı kaldı — en temiz kurtarma: uygulamayı yeniden başlat (backend + SignalR baştan)
    log.error('setup başlatılamadı — uygulama yeniden başlatılıyor', { error: msg })
    setTimeout(() => {
      app.relaunch()
      app.quit()
    }, 3000)
    return { ok: false, error: `Kurulum başlatılamadı: ${msg} — uygulama yeniden başlatılıyor` }
  }

  log.warn('setup başlatıldı — uygulama kapanıyor')
  // Renderer cevabı alsın, sonra normal kapanış yolu (before-quit → servis durdurma)
  setTimeout(() => app.quit(), 500)
  return { ok: true }
}

export function registerCloudHandlers(): void {
  connectionManager.on('bendingProgress', () => {
    lastProgressAt = Date.now()
  })

  // preload getAppVersion() ('app:get-version') için handler yoktu — Bulut sayfası MEVCUT SÜRÜM'ü gösterir
  try {
    ipcMain.handle('app:get-version', () => app.getVersion())
  } catch (err) {
    log.warn('app:get-version zaten kayıtlı', { error: (err as Error).message })
  }

  ipcMain.handle(Ipc.IpcInvoke.CloudGetStatus, async (): Promise<CloudResult<CloudStatus>> =>
    wrap(() => dataApi.getCloudStatus()))

  ipcMain.handle(Ipc.IpcInvoke.CloudActivate, async (_evt, code: unknown): Promise<CloudResult<CloudStatus>> => {
    if (!sessionHasRole('ADMIN')) return denied('ADMIN')
    const c = String(code ?? '').trim().toUpperCase()
    if (!ACTIVATION_CODE_RE.test(c)) return { ok: false, status: 400, error: 'Aktivasyon kodu XXXX-XXXX-XXXX-XXXX biçiminde olmalı' }
    log.info('cloud-activate')
    return wrap(() => dataApi.activateCloud(c))
  })

  ipcMain.handle(Ipc.IpcInvoke.CloudSyncNow, async (): Promise<CloudResult<unknown>> => {
    log.info('cloud-sync-now')
    return wrap(() => dataApi.syncCloudNow())
  })

  ipcMain.handle(Ipc.IpcInvoke.CloudDownloadUpdate, async (): Promise<CloudResult<unknown>> => {
    if (!sessionHasRole('ADMIN')) return denied('ADMIN')
    log.info('cloud-download-update')
    return wrap(() => dataApi.downloadCloudUpdate())
  })

  ipcMain.handle(Ipc.IpcInvoke.CloudSetShare, async (_evt, shareRecipes: unknown): Promise<CloudResult<unknown>> => {
    if (!sessionHasRole('ADMIN')) return denied('ADMIN')
    log.info('cloud-set-share', { shareRecipes: shareRecipes === true })
    return wrap(() => dataApi.setCloudShare(shareRecipes === true))
  })

  ipcMain.handle(Ipc.IpcInvoke.CloudDeactivate, async (): Promise<CloudResult<CloudStatus>> => {
    if (!sessionHasRole('SUPERADMIN')) return denied('SUPERADMIN')
    log.warn('cloud-deactivate', { username: getAuthUser()?.username ?? null })
    return wrap(() => dataApi.deactivateCloud())
  })

  ipcMain.handle(Ipc.IpcInvoke.CloudGetInstallBlockers, async (): Promise<CloudInstallBlockers | null> =>
    computeBlockers())

  ipcMain.handle(Ipc.IpcInvoke.CloudInstallUpdate, async (_evt, path: unknown): Promise<CloudInstallResult> => {
    try {
      return await installUpdate(path)
    } catch (err) {
      installing = false
      log.error('install-update threw', { error: (err as Error).message })
      return { ok: false, error: (err as Error).message }
    }
  })
}
