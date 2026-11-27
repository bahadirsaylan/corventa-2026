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
import { copyFileSync, existsSync, mkdirSync, readdirSync, realpathSync, rmSync, statSync, writeFileSync } from 'fs'
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
  type UpdateFlowStatus,
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

// 2026-11-16: yetki matrisi (renderer constants/permissions.ts) — 'big-data' SERVICEMAN, 'cloud-deactivate' SUPERADMIN
function denied(min: 'SERVICEMAN' | 'SUPERADMIN'): { ok: false; status: number; error: string } {
  log.warn('cloud action denied — role', { min, username: getAuthUser()?.username ?? null })
  return { ok: false, status: 403, error: `${min === 'SUPERADMIN' ? 'SÜPERADMİN' : 'SERVİS TEKNİSYENİ'} yetkisi gerekli` }
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

/** VBScript çift tırnaklı metin */
const vbq = (v: string) => `"${v.replace(/"/g, '""')}"`

/** Ayrık süreç başlat; süreç oluşunca resolve, oluşamazsa reject */
function spawnDetached(cmd: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(cmd, args, { detached: true, stdio: 'ignore', windowsHide: true, cwd })
    child.once('error', reject)
    child.once('spawn', () => {
      child.unref()
      resolvePromise()
    })
  })
}

/**
 * Setup'ı ayrık başlat.
 * 2026-11-27 (makinede): 0.3.17 → 0.3.18 kuruldu ama uygulama AÇILMADI (--force-run'a güvenilmez); 0.3.19'daki gizli
 * PowerShell bekçisi ise ayrık (konsolsuz) başlatılınca HİÇ çalışmadı → setup başlamadı, ekran "kuruluyor"da kaldı.
 * Şimdi: Windows Script Host (wscript.exe — konsol gerektirmez) + <DATA_DIR>\updates\run-update.vbs:
 *   setup'ı /S --force-run ile başlatır, BİTMESİNİ bekler, çıkış kodunu yazar; 3 sn sonra uygulama çalışmıyorsa KENDİSİ açar.
 *   Sonuç <DATA_DIR>\logs\update-install.log (UTF-16). Dev PC'de ayrık + üst süreç kapandıktan sonra doğrulandı.
 * wscript başlatılamazsa (WSH kapalı vb.) eski yol: setup doğrudan '/S --force-run' (açılmazsa elle açılır).
 */
async function launchSetup(path: string): Promise<void> {
  const appExe = process.execPath
  const exeName = basename(appExe).replace(/'/g, '')
  const logFile = join(DATA_DIR, 'logs', 'update-install.log')
  try { mkdirSync(dirname(logFile), { recursive: true }) } catch { /* log klasörü yoksa VBS yazamaz — kurulum yine yapılır */ }
  const vbsFile = join(dirname(path), 'run-update.vbs')
  const vbs = [
    'On Error Resume Next',
    'Set sh = CreateObject("WScript.Shell")',
    'Set fso = CreateObject("Scripting.FileSystemObject")',
    `logPath = ${vbq(logFile)}`,
    'Sub W(m)',
    '  Set f = fso.OpenTextFile(logPath, 8, True, -1)',
    '  f.WriteLine Now & " " & m',
    '  f.Close',
    'End Sub',
    `W "setup başlıyor: " & ${vbq(path)}`,
    `rc = sh.Run(${vbq(vbq(path) + ' /S --force-run')}, 0, True)`,
    'If Err.Number <> 0 Then',
    '  W "setup HATASI: " & Err.Description',
    '  Err.Clear',
    'Else',
    '  W "setup bitti, çıkış kodu " & rc',
    'End If',
    'WScript.Sleep 3000',
    'Set wmi = GetObject("winmgmts:root\\cimv2")',
    `Set ps = wmi.ExecQuery("select ProcessId from Win32_Process where Name='${exeName}'")`,
    'If ps.Count > 0 Then',
    '  W "uygulama zaten açık (force-run)"',
    'Else',
    `  sh.Run ${vbq(vbq(appExe))}, 1, False`,
    '  If Err.Number <> 0 Then',
    '    W "uygulama BAŞLATILAMADI: " & Err.Description',
    '    Err.Clear',
    '  Else',
    '    W "uygulama başlatıldı"',
    '  End If',
    'End If',
  ].join('\r\n')
  try {
    // UTF-16 LE + BOM: Türkçe karakterli yollar wscript'te bozulmasın
    writeFileSync(vbsFile, Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(vbs, 'utf16le')]))
    await spawnDetached('wscript.exe', ['//B', '//Nologo', vbsFile], dirname(path))
    log.warn('setup bekçisi (wscript) başlatıldı', { vbsFile, logFile })
    return
  } catch (err) {
    log.error('setup bekçisi başlatılamadı — setup doğrudan başlatılıyor', { error: (err as Error).message })
  }
  await spawnDetached(path, ['/S', '--force-run'], dirname(path))
}

async function installUpdate(rawPath: unknown): Promise<CloudInstallResult> {
  if (installing) return { ok: false, error: 'Kurulum zaten başlatıldı' }
  if (!sessionHasRole('SERVICEMAN')) return { ok: false, error: denied('SERVICEMAN').error }
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

  return performInstall(v.path)
}

/** Son kaç DB yedeği tutulur (C:\ProgramData\Corventa\backups) */
const KEEP_BACKUPS = 5

/**
 * (2026-11-26) KURULUM ÖNCESİ YEDEK — backend'ler DURDURULDUKTAN sonra (DB kilitli değil) machine.db (+ -wal / -shm,
 * WAL birlikte kopyalanınca tutarlı) ve config\machine.json → <DATA_DIR>\backups\<eski sürüm>-<tarih>\.
 * En yeni KEEP_BACKUPS klasör tutulur. Yedek alınamazsa hata fırlatır (kurulum YAPILMAZ).
 */
function backupBeforeInstall(): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19)
  const root = join(DATA_DIR, 'backups')
  const dir = join(root, `${app.getVersion()}-${stamp}`)
  mkdirSync(dir, { recursive: true })
  const db = join(DATA_DIR, 'machine.db')
  if (!existsSync(db)) throw new Error(`machine.db bulunamadı: ${db}`)
  for (const f of ['machine.db', 'machine.db-wal', 'machine.db-shm']) {
    const src = join(DATA_DIR, f)
    if (existsSync(src)) copyFileSync(src, join(dir, f))
  }
  const identity = join(DATA_DIR, 'config', 'machine.json')
  if (existsSync(identity)) copyFileSync(identity, join(dir, 'machine.json'))
  // Eski yedekleri temizle (en yeni KEEP_BACKUPS kalsın)
  try {
    const dirs = readdirSync(root, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => ({ name: d.name, t: statSync(join(root, d.name)).mtimeMs }))
      .sort((a, b) => b.t - a.t)
    for (const old of dirs.slice(KEEP_BACKUPS)) rmSync(join(root, old.name), { recursive: true, force: true })
  } catch (err) {
    log.warn('eski yedekler temizlenemedi', { error: (err as Error).message })
  }
  return dir
}

/** Backend'leri durdur → DB yedeği → setup'ı başlat → uygulamayı kapat. Yedek / setup başarısızsa uygulama yeniden açılır. */
async function performInstall(path: string): Promise<CloudInstallResult> {
  installing = true
  log.warn('INSTALL UPDATE — backend servisleri durduruluyor, yedek alınıp setup başlatılacak', {
    path,
    username: getAuthUser()?.username ?? null,
  })
  // Setup resources\backend altındaki exe'lerin üzerine yazar → önce backend'ler kapanmalı (kilitli kalmasın)
  await backendSupervisor.stop().catch(() => {})

  const relaunchSoon = () =>
    setTimeout(() => {
      app.relaunch()
      app.quit()
    }, 3000)

  setFlow({ phase: 'backup' })
  try {
    const dir = backupBeforeInstall()
    log.warn('kurulum öncesi yedek alındı', { dir })
  } catch (err) {
    const msg = (err as Error).message
    // Yedeksiz kurulum yok — backend'ler kapalı kaldı, uygulama yeniden açılır (eski sürüm aynen)
    log.error('yedek alınamadı — kurulum YAPILMADI, uygulama yeniden başlatılıyor', { error: msg })
    setFlow({ phase: 'error', error: `Yedek alınamadı: ${msg} — kurulum yapılmadı` })
    relaunchSoon()
    return { ok: false, error: `Yedek alınamadı: ${msg} — kurulum yapılmadı, uygulama yeniden başlatılıyor` }
  }

  setFlow({ phase: 'installing' })
  try {
    await launchSetup(path)
  } catch (err) {
    const msg = (err as Error).message
    // Backend'ler kapalı kaldı — en temiz kurtarma: uygulamayı yeniden başlat (backend + SignalR baştan)
    log.error('setup başlatılamadı — uygulama yeniden başlatılıyor', { error: msg })
    setFlow({ phase: 'error', error: `Kurulum başlatılamadı: ${msg}` })
    relaunchSoon()
    return { ok: false, error: `Kurulum başlatılamadı: ${msg} — uygulama yeniden başlatılıyor` }
  }

  log.warn('setup başlatıldı — uygulama kapanıyor')
  // Renderer cevabı alsın, sonra normal kapanış yolu (before-quit → servis durdurma)
  setTimeout(() => app.quit(), 500)
  // 2026-11-27 (makinede ekran 'kuruluyor'da açık kaldı): normal kapanış takılırsa 5 sn sonra zorla çık — setup dosyaları yazabilsin
  setTimeout(() => {
    log.warn('uygulama 5 sn içinde kapanmadı — zorla çıkılıyor (app.exit)')
    app.exit(0)
  }, 5000)
  return { ok: true }
}

// ── TEK TUŞLA GÜNCELLEME (2026-11-26, kullanıcı: "UI'dan güncelle dediğimizde otomatik güncellensin") ──
// GÜNCELLE (tek onay) → DataApi indirir + sha256 doğrular → büküm / tahliye / hareket yoksa (varsa bitmesi beklenir)
// → backend'ler durur → DB yedeği → sessiz kurulum → uygulama yeniden açılır. Akış main'de: ekran değişse de sürer.
const FLOW_POLL_MS = 1_000
const DOWNLOAD_TIMEOUT_MS = 60 * 60_000

let flow: UpdateFlowStatus = { phase: 'idle', version: null, progress: null, waitReason: null, error: null }
let flowToken = 0

function setFlow(patch: Partial<UpdateFlowStatus>): void {
  flow = { ...flow, ...patch }
}

function flowActive(): boolean {
  return flow.phase === 'downloading' || flow.phase === 'waiting' || flow.phase === 'backup' || flow.phase === 'installing'
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function blockReason(b: CloudInstallBlockers | null): string | null {
  if (!b) return 'Büküm durumu doğrulanamadı (DataApi yanıt vermiyor)'
  if (b.bendingActive) return 'Büküm sürüyor — bitince kurulacak'
  if (b.unloadActive) return 'Tahliye sürüyor — bitince kurulacak'
  if (b.machineMoving) return 'Makine hareket halinde — durunca kurulacak'
  return null
}

async function runUpdateFlow(token: number): Promise<void> {
  const alive = () => token === flowToken
  try {
    // 1) İndir (zaten indirildiyse atla) — DataApi parça + bütün sha256 doğrular
    let st = await dataApi.getCloudStatus()
    if (!st.update) throw new Error('Yeni sürüm yok')
    setFlow({ version: st.update.version })
    if (!st.update.downloaded) {
      if (!st.update.downloading) await dataApi.downloadCloudUpdate()
      const started = Date.now()
      for (;;) {
        if (!alive()) return
        await sleep(FLOW_POLL_MS)
        st = await dataApi.getCloudStatus()
        const u = st.update
        if (!u) throw new Error('Güncelleme bilgisi kayboldu (bulut sürümü geri çekilmiş olabilir)')
        setFlow({ progress: u.progress ?? null, version: u.version })
        if (u.downloaded) break
        if (!u.downloading && u.error) throw new Error(`İndirme başarısız: ${u.error}`)
        if (!u.downloading && Date.now() - started > 15_000) throw new Error('İndirme başlamadı')
        if (Date.now() - started > DOWNLOAD_TIMEOUT_MS) throw new Error('İndirme zaman aşımı (60 dk)')
      }
    }
    const path = st.update?.downloadPath
    if (!path) throw new Error('İndirilen kurulum dosyası bulunamadı')
    const v = IS_DEMO ? { path } : validateSetupPath(path)
    if ('error' in v) throw new Error(v.error)

    // 2) Makine boşalana kadar bekle (büküm / tahliye / hareket)
    for (;;) {
      if (!alive()) return
      const reason = blockReason(await computeBlockers())
      if (!reason) break
      setFlow({ phase: 'waiting', waitReason: reason, progress: 100 })
      await sleep(2_000)
    }
    if (!alive()) return
    // Demo: akış buraya kadar gösterilir, kurulum yapılmaz
    if (IS_DEMO) {
      setFlow({ phase: 'error', error: 'DEMO MODU — güncelleme indirildi, kurulum demoda yapılmaz' })
      return
    }

    // 3) Yedek + kurulum (iptal edilemez)
    const r = await performInstall(v.path)
    if (!r.ok) setFlow({ phase: 'error', error: r.error ?? 'Kurulum başarısız' })
  } catch (err) {
    if (!alive()) return
    const msg = (err as Error).message
    log.error('update flow failed', { error: msg })
    setFlow({ phase: 'error', error: msg })
  }
}

function startUpdateFlow(): CloudInstallResult {
  if (installing || flowActive()) return { ok: true }
  if (!sessionHasRole('SERVICEMAN')) return { ok: false, error: denied('SERVICEMAN').error }
  if (!IS_DEMO && !app.isPackaged && process.env.CORVENTA_ALLOW_DEV_UPDATE !== '1') {
    return { ok: false, error: 'Geliştirme modunda kurulum kapalı (CORVENTA_ALLOW_DEV_UPDATE=1 ile açılır)' }
  }
  const token = ++flowToken
  flow = { phase: 'downloading', version: null, progress: 0, waitReason: null, error: null }
  log.warn('UPDATE NOW — tek tuşla güncelleme başladı', { username: getAuthUser()?.username ?? null })
  void runUpdateFlow(token)
  return { ok: true }
}

function cancelUpdateFlow(): UpdateFlowStatus {
  // Yedek / kurulum başladıysa (backend'ler durmuş olabilir) iptal yok
  if (flow.phase === 'downloading' || flow.phase === 'waiting') {
    flowToken++
    log.warn('update flow cancelled', { phase: flow.phase })
    flow = { phase: 'cancelled', version: flow.version, progress: null, waitReason: null, error: null }
  }
  return flow
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
    if (!sessionHasRole('SERVICEMAN')) return denied('SERVICEMAN')
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
    if (!sessionHasRole('SERVICEMAN')) return denied('SERVICEMAN')
    log.info('cloud-download-update')
    return wrap(() => dataApi.downloadCloudUpdate())
  })

  ipcMain.handle(Ipc.IpcInvoke.CloudSetShare, async (_evt, shareRecipes: unknown): Promise<CloudResult<unknown>> => {
    if (!sessionHasRole('SERVICEMAN')) return denied('SERVICEMAN')
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

  ipcMain.handle(Ipc.IpcInvoke.CloudUpdateNow, async (): Promise<CloudInstallResult> => startUpdateFlow())
  ipcMain.handle(Ipc.IpcInvoke.CloudUpdateFlowStatus, async (): Promise<UpdateFlowStatus> => flow)
  ipcMain.handle(Ipc.IpcInvoke.CloudUpdateFlowCancel, async (): Promise<UpdateFlowStatus> => cancelUpdateFlow())

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
