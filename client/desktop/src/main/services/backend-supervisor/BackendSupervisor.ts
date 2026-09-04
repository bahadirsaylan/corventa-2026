// 2026-09-04 — Backend supervisor: DataApi → BendingApi → Web sirali baslat + saglik bekle.
// Dev mode: `dotnet run --project <csproj>` ile baslar. Prod paketleme sonra eklenebilir.
// Uygulama kapaninca (app.on 'before-quit') child process'ler SIGTERM ile kapatilir.

import { spawn, ChildProcess } from 'child_process'
import http from 'http'
import { existsSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { childLogger } from '@main/lib/logger'

const log = childLogger('backend-supervisor')

// Backend project paths — dev mode ile ayni repo koken varsayilir.
// Default: <UserProfile>\Desktop\SoftPLCCorventa (herhangi bir Windows kullanicisi icin dogru).
// Override: CORVENTA_BACKEND_REPO env variable — repo baska yerdeyse zorunlu.
const REPO_ROOT =
  process.env.CORVENTA_BACKEND_REPO ??
  join(homedir(), 'Desktop', 'SoftPLCCorventa')

interface BackendService {
  name: string
  csprojPath: string
  healthUrl: string
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
    healthUrl: 'http://localhost:5002/health',
    healthTimeoutMs: HEALTH_TIMEOUT_MS,
    optional: false,
  },
  {
    name: 'BendingApi',
    csprojPath: `${REPO_ROOT}\\src\\CncBendingMachine.Api\\CncBendingMachine.Api.csproj`,
    healthUrl: 'http://localhost:5000/api/machine/state',
    healthTimeoutMs: HEALTH_TIMEOUT_MS,
    optional: false,
  },
  {
    name: 'BlazorWeb',
    csprojPath: `${REPO_ROOT}\\src\\CncBendingMachine.Web\\CncBendingMachine.Web.csproj`,
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
    for (const svc of SERVICES) {
      if (!existsSync(svc.csprojPath)) {
        const msg = `Csproj bulunamadi: ${svc.csprojPath}`
        if (svc.optional) {
          log.warn(`${svc.name} atlaniyor (${msg})`)
          continue
        }
        this.setStatus({ kind: 'failed', service: svc.name, error: msg })
        return false
      }

      this.setStatus({ kind: 'starting', service: svc.name })
      const proc = this.spawnDotnet(svc)
      this.processes.set(svc.name, proc)

      this.setStatus({ kind: 'waiting', service: svc.name })
      const healthy = await this.waitForHealth(svc.healthUrl, svc.healthTimeoutMs)
      if (!healthy) {
        const msg = `${svc.name} ${svc.healthTimeoutMs / 1000}sn icinde saglikli cevap vermedi (${svc.healthUrl})`
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

  private spawnDotnet(svc: BackendService): ChildProcess {
    log.info(`spawn ${svc.name}`, { csproj: svc.csprojPath })

    // `dotnet run --project X --no-launch-profile` — launchSettings.json'daki
    // hazirlanmis profiller devreye girmesin, cikti temiz olsun.
    const proc = spawn(
      'dotnet',
      ['run', '--project', svc.csprojPath, '--no-launch-profile'],
      {
        // Windows'ta dotnet PATH'te. shell:true gerekmez cunku args ayri.
        shell: false,
        // stdio: 'pipe' → log capture, 'ignore' → sessiz
        stdio: 'pipe',
        // detached:false → parent olurse child da olur
        detached: false,
        windowsHide: true, // Console penceresi acilmasin (Windows only)
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

  private async waitForHealth(url: string, timeoutMs: number): Promise<boolean> {
    const deadline = Date.now() + timeoutMs
    let lastError: string | null = null
    while (Date.now() < deadline) {
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
