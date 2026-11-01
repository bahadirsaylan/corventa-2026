// 2026-09-04 — Backend supervisor: DataApi → BendingApi → Web sirali baslat + saglik bekle.
// Dev mode: `dotnet run --project <csproj>` ile baslar.
// 2026-11-01 — Paketli surum (app.isPackaged): resources\backend\<Servis>\*.exe (self-contained Release) baslatilir,
// Production ortami, ciktisi Electron'dan GECMEZ (stdio ignore) — loglar C:\ProgramData\Corventa\logs altina dosyaya.
// DB + makineye ozel ayarlar da C:\ProgramData\Corventa altinda (kurulum/guncelleme ezmez).
// Uygulama kapaninca (app.on 'before-quit') child process'ler SIGTERM ile kapatilir.

import { spawn, ChildProcess } from 'child_process'
import http from 'http'
import { existsSync, mkdirSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { app } from 'electron'
import { childLogger } from '@main/lib/logger'

const log = childLogger('backend-supervisor')

// Backend project paths — dev mode ile ayni repo koken varsayilir.
// Default: <UserProfile>\Desktop\SoftPLCCorventa (herhangi bir Windows kullanicisi icin dogru).
// Override: CORVENTA_BACKEND_REPO env variable — repo baska yerdeyse zorunlu.
const REPO_ROOT =
  process.env.CORVENTA_BACKEND_REPO ??
  join(homedir(), 'Desktop', 'SoftPLCCorventa')

// Paketli surum: DB, makine ayarlari ve loglar kurulum klasorunun disinda
export const IS_PACKAGED = app.isPackaged
export const DATA_DIR = join(process.env.ProgramData ?? 'C:\\ProgramData', 'Corventa')

interface BackendService {
  name: string
  csprojPath: string
  /** Paketli surumde resources\backend altindaki klasor + exe; yoksa paketli surumde baslatilmaz */
  packaged?: { dir: string; exe: string; configFile: string; logPrefix: string }
  healthUrl: string
  // ASP.NET default portu 5000 — --no-launch-profile ile launchSettings devre disi kaldi,
  // yani her servise explicit --urls vermek zorunda kaliyoruz. Aksi halde hepsi 5000'de
  // dinlemeye calisir ve ilk basarili spawn portu tutar, digerleri "Address in use" fail eder.
  applicationUrl: string
  healthTimeoutMs: number
  optional: boolean // true = fail'de warn + devam (Web icin)
}

// Health timeout — yavas PC'de dotnet run + build + startup 2dk+ surebilir.
// Env variable ile override: CORVENTA_HEALTH_TIMEOUT_MS (ms cinsinden).
// Default: 180sn (3dk) — makul yavas PC icin guvenli.
const HEALTH_TIMEOUT_MS = Number(process.env.CORVENTA_HEALTH_TIMEOUT_MS) || 180_000

const SERVICES: BackendService[] = [
  {
    name: 'DataApi',
    csprojPath: `${REPO_ROOT}\\src\\CncBendingMachine.DataApi\\CncBendingMachine.DataApi.csproj`,
    packaged: { dir: 'DataApi', exe: 'CncBendingMachine.DataApi.exe', configFile: 'dataapi.json', logPrefix: 'dataapi' },
    applicationUrl: 'http://localhost:5002',
    healthUrl: 'http://localhost:5002/health',
    healthTimeoutMs: HEALTH_TIMEOUT_MS,
    optional: false,
  },
  {
    name: 'BendingApi',
    csprojPath: `${REPO_ROOT}\\src\\CncBendingMachine.Api\\CncBendingMachine.Api.csproj`,
    packaged: { dir: 'BendingApi', exe: 'CncBendingMachine.Api.exe', configFile: 'bending-api.json', logPrefix: 'bending-api' },
    applicationUrl: 'http://localhost:5000',
    healthUrl: 'http://localhost:5000/api/machine/state',
    healthTimeoutMs: HEALTH_TIMEOUT_MS,
    optional: false,
  },
  {
    name: 'BlazorWeb',
    csprojPath: `${REPO_ROOT}\\src\\CncBendingMachine.Web\\CncBendingMachine.Web.csproj`,
    applicationUrl: 'http://localhost:5001',
    healthUrl: 'http://localhost:5001',
    healthTimeoutMs: HEALTH_TIMEOUT_MS,
    optional: true, // test ekrani, fail'de UI yine acilsin
  },
]

export type SupervisorStatus =
  | { kind: 'idle' }
  | { kind: 'starting'; service: string }
  | { kind: 'waiting'; service: string }
  | { kind: 'ready' }
  | { kind: 'failed'; service: string; error: string }

type StatusListener = (s: SupervisorStatus) => void

export class BackendSupervisor {
  private processes: Map<string, ChildProcess> = new Map()
  private status: SupervisorStatus = { kind: 'idle' }
  private listeners: Set<StatusListener> = new Set()

  onStatus(listener: StatusListener): () => void {
    this.listeners.add(listener)
    listener(this.status)
    return () => this.listeners.delete(listener)
  }

  private setStatus(s: SupervisorStatus): void {
    this.status = s
    log.info('status', s)
    for (const l of this.listeners) {
      try { l(s) } catch { /* listener error yutulur */ }
    }
  }

  /** Tum servisleri sirali baslat + health bekle. Zorunlu servis fail olursa fail doner. */
  async start(): Promise<boolean> {
    if (IS_PACKAGED) {
      try {
        mkdirSync(join(DATA_DIR, 'logs'), { recursive: true })
        mkdirSync(join(DATA_DIR, 'config'), { recursive: true })
      } catch (err) {
        log.warn('ProgramData klasoru olusturulamadi', { error: (err as Error).message })
      }
      // DB yoksa DataApi bos DB olusturmasin (kalibrasyonsuz ayar) — kullaniciya net mesaj
      const dbPath = join(DATA_DIR, 'machine.db')
      if (!existsSync(dbPath) && !process.env.CORVENTA_ALLOW_NEW_DB) {
        this.setStatus({
          kind: 'failed',
          service: 'DataApi',
          error: `machine.db bulunamadi: ${dbPath} — mevcut makinenin machine.db dosyasini bu klasore kopyalayip programi yeniden acin.`,
        })
        return false
      }
    }

    for (const svc of SERVICES) {
      if (IS_PACKAGED && !svc.packaged) {
        log.info(`${svc.name} paketli surumde yok, atlaniyor`)
        continue
      }
      const target = IS_PACKAGED ? this.packagedExePath(svc) : svc.csprojPath
      if (!existsSync(target)) {
        const msg = IS_PACKAGED ? `Backend exe bulunamadi: ${target}` : `Csproj bulunamadi: ${svc.csprojPath}`
        if (svc.optional) {
          log.warn(`${svc.name} atlaniyor (${msg})`)
          continue
        }
        this.setStatus({ kind: 'failed', service: svc.name, error: msg })
        return false
      }

      this.setStatus({ kind: 'starting', service: svc.name })
      const proc = IS_PACKAGED ? this.spawnPackaged(svc) : this.spawnDotnet(svc)
      this.processes.set(svc.name, proc)

      this.setStatus({ kind: 'waiting', service: svc.name })
      const healthy = await this.waitForHealth(svc.healthUrl, svc.healthTimeoutMs, proc)
      if (!healthy) {
        const msg = proc.exitCode !== null
          ? `${svc.name} acilista kapandi (cikis kodu ${proc.exitCode})` +
            (IS_PACKAGED ? ` — ayrinti: ${join(DATA_DIR, 'logs')}` : '')
          : `${svc.name} ${svc.healthTimeoutMs / 1000}sn icinde saglikli cevap vermedi (${svc.healthUrl})`
        if (svc.optional) {
          log.warn(msg)
          continue
        }
        this.setStatus({ kind: 'failed', service: svc.name, error: msg })
        return false
      }
      log.info(`${svc.name} hazir`, { url: svc.healthUrl })
    }

    this.setStatus({ kind: 'ready' })
    return true
  }

  /** Tum child process'leri SIGTERM ile kapat, 5sn beklemeyen icin SIGKILL. */
  async stop(): Promise<void> {
    log.info('stop — child process\'ler sonlandiriliyor', { count: this.processes.size })
    const killed: Promise<void>[] = []
    for (const [name, proc] of this.processes.entries()) {
      killed.push(this.killProcess(name, proc))
    }
    await Promise.allSettled(killed)
    this.processes.clear()
    this.setStatus({ kind: 'idle' })
  }

  private packagedExePath(svc: BackendService): string {
    return join(process.resourcesPath, 'backend', svc.packaged!.dir, svc.packaged!.exe)
  }

  /** Paketli surum: self-contained exe, Production; cikti Electron'dan gecmez (dosya logu backend'de). */
  private spawnPackaged(svc: BackendService): ChildProcess {
    const p = svc.packaged!
    const exe = this.packagedExePath(svc)
    log.info(`spawn (paketli) ${svc.name}`, { exe, url: svc.applicationUrl })
    const proc = spawn(exe, ['--urls', svc.applicationUrl], {
      // ContentRoot = cwd → appsettings.json exe yanindan okunur
      cwd: join(process.resourcesPath, 'backend', p.dir),
      shell: false,
      stdio: 'ignore',
      detached: false,
      windowsHide: true,
      env: {
        ...process.env,
        ASPNETCORE_ENVIRONMENT: process.env.CORVENTA_ASPNETCORE_ENV ?? 'Production',
        Database__Path: join(DATA_DIR, 'machine.db'),
        FileLogging__Directory: join(DATA_DIR, 'logs'),
        FileLogging__Prefix: p.logPrefix,
        // Alarm kapatma vb. saha islemleri icin Swagger acik (localhost)
        Swagger__Enabled: 'true',
        // Makineye ozel ayarlar (PLC IP, SMTP ...) — dosya yoksa yok sayilir
        CORVENTA_CONFIG_FILE: join(DATA_DIR, 'config', p.configFile),
      },
    })
    proc.on('exit', (code, signal) => {
      log.info(`${svc.name} exit`, { code, signal })
      this.processes.delete(svc.name)
    })
    proc.on('error', (err) => {
      log.error(`${svc.name} spawn error`, { error: err.message })
    })
    return proc
  }

  private spawnDotnet(svc: BackendService): ChildProcess {
    log.info(`spawn ${svc.name}`, { csproj: svc.csprojPath, url: svc.applicationUrl })

    // --no-launch-profile: launchSettings.json profillerini devre disi birak (temiz cikti,
    //                      swagger browser popup yok).
    // --urls: explicit port ver. Aksi halde ASP.NET default 5000'e dusuyor,
    //         3 servis 5000'e sikisiyor + iki fail.
    // -- (double dash): dotnet run bunun sonrasindakileri uygulamaya iletir.
    const proc = spawn(
      'dotnet',
      ['run', '--project', svc.csprojPath, '--no-launch-profile', '--', '--urls', svc.applicationUrl],
      {
        // Windows'ta dotnet PATH'te. shell:true gerekmez cunku args ayri.
        shell: false,
        // stdio: 'pipe' → log capture, 'ignore' → sessiz
        stdio: 'pipe',
        // detached:false → parent olurse child da olur
        detached: false,
        windowsHide: true, // Console penceresi acilmasin (Windows only)
        // --no-launch-profile ASPNETCORE_ENVIRONMENT'i da devre disi birakti; explicit ver
        // ki Swagger + Development-only ozellikler acik olsun (dev mode kullanim icin).
        // Production'da CORVENTA_ASPNETCORE_ENV=Production ile override edilebilir.
        env: {
          ...process.env,
          ASPNETCORE_ENVIRONMENT: process.env.CORVENTA_ASPNETCORE_ENV ?? 'Development',
        },
      },
    )

    proc.stdout?.on('data', (data: Buffer) => {
      const line = data.toString().trim()
      if (line) log.debug(`[${svc.name}] ${line}`)
    })
    proc.stderr?.on('data', (data: Buffer) => {
      const line = data.toString().trim()
      if (line) log.warn(`[${svc.name}:stderr] ${line}`)
    })
    proc.on('exit', (code, signal) => {
      log.info(`${svc.name} exit`, { code, signal })
      this.processes.delete(svc.name)
    })
    proc.on('error', (err) => {
      log.error(`${svc.name} spawn error`, { error: err.message })
    })

    return proc
  }

  private async waitForHealth(url: string, timeoutMs: number, proc?: ChildProcess): Promise<boolean> {
    const deadline = Date.now() + timeoutMs
    let lastError: string | null = null
    while (Date.now() < deadline) {
      // Process erken kapandiysa (DB yok, port dolu ...) timeout'u bekleme
      if (proc && proc.exitCode !== null) {
        log.warn('process health beklenirken kapandi', { url, exitCode: proc.exitCode })
        return false
      }
      const result = await this.checkHealth(url)
      if (result.ok) return true
      lastError = result.error ?? null
      await this.sleep(500)
    }
    log.warn('health timeout', { url, lastError })
    return false
  }

  private checkHealth(url: string): Promise<{ ok: boolean; error?: string }> {
    return new Promise((resolve) => {
      const req = http.get(url, { timeout: 2000 }, (res) => {
        // 200-499 arasi cevap = process ayakta demek (401/404 dahi OK, socket kabul ediyor)
        const ok = (res.statusCode ?? 0) < 500
        res.resume() // drain
        resolve({ ok, error: ok ? undefined : `HTTP ${res.statusCode}` })
      })
      req.on('error', (err) => resolve({ ok: false, error: err.message }))
      req.on('timeout', () => {
        req.destroy()
        resolve({ ok: false, error: 'timeout' })
      })
    })
  }

  private killProcess(name: string, proc: ChildProcess): Promise<void> {
    return new Promise((resolve) => {
      if (!proc.pid || proc.exitCode !== null) {
        resolve()
        return
      }
      const timer = setTimeout(() => {
        log.warn(`${name} SIGTERM'e cevap vermedi, SIGKILL`)
        try { proc.kill('SIGKILL') } catch { /* ignore */ }
        resolve()
      }, 5_000)
      proc.once('exit', () => {
        clearTimeout(timer)
        resolve()
      })
      try {
        // Windows'ta SIGTERM taskkill /pid gibi calisir
        proc.kill('SIGTERM')
      } catch (err) {
        log.warn(`${name} kill hata: ${(err as Error).message}`)
        clearTimeout(timer)
        resolve()
      }
    })
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms))
  }
}

export const backendSupervisor = new BackendSupervisor()
