// İnternet erişim kontrolü (EXCEL 37 — "Google bağlantısı denenecek").
// 30 sn'de bir Google'ın generate_204 ucuna istek atar (3 sn zaman aşımı); olmazsa yedek uç denenir.
// Sonuç (online/offline, son kontrol, gecikme) eventsBroadcaster üzerinden renderer'a push edilir.
// - Sadece bilgi amaçlı: makine / büküm akışını hiçbir şekilde etkilemez (bulut senkronu için ön bilgi).
// - electron net.fetch kullanılır → Chromium ağ yığını, sistem proxy ayarlarına uyar.
// - 204 dışındaki cevaplar (ör. captive portal / proxy giriş sayfası 200 döner) offline sayılır.
// - Demo modunda (CORVENTA_DEMO=1) gerçek istek atılmaz, hep online varsayılır.

import { EventEmitter } from 'node:events'

import { net } from 'electron'

import { IS_DEMO } from '@main/demo/DemoMachine'
import { childLogger } from '@main/lib/logger'
import type { InternetStatus } from '@shared'

const log = childLogger('connectivity')

const CHECK_INTERVAL_MS = 30_000
const REQUEST_TIMEOUT_MS = 3_000
const TARGETS = [
  'https://www.google.com/generate_204',
  'https://clients3.google.com/generate_204',
] as const

interface ProbeResult {
  ok: boolean
  latencyMs: number
  target: string
  error: string | null
}

async function probe(url: string): Promise<ProbeResult> {
  const target = new URL(url).host
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  const started = Date.now()
  try {
    const res = await net.fetch(url, {
      method: 'GET',
      cache: 'no-store',
      redirect: 'manual',
      signal: controller.signal,
    })
    const latencyMs = Date.now() - started
    // Gövdeyi okumadan bağlantıyı bırak
    res.body?.cancel().catch(() => {})
    if (res.status === 204) return { ok: true, latencyMs, target, error: null }
    return { ok: false, latencyMs, target, error: `HTTP ${res.status}` }
  } catch (err) {
    const aborted = controller.signal.aborted
    return {
      ok: false,
      latencyMs: Date.now() - started,
      target,
      error: aborted ? `Zaman aşımı (${REQUEST_TIMEOUT_MS} ms)` : (err as Error).message,
    }
  } finally {
    clearTimeout(timer)
  }
}

type Listener = (status: InternetStatus) => void

class ConnectivityService {
  private readonly emitter = new EventEmitter()
  private timer: NodeJS.Timeout | null = null
  private inFlight: Promise<InternetStatus> | null = null
  private status: InternetStatus = {
    state: 'unknown',
    checking: false,
    lastCheckedAt: null,
    lastOnlineAt: null,
    latencyMs: null,
    target: null,
    error: null,
    simulated: IS_DEMO,
  }

  getStatus(): InternetStatus {
    return { ...this.status }
  }

  onStatusChanged(listener: Listener): () => void {
    this.emitter.on('status', listener)
    return () => this.emitter.off('status', listener)
  }

  /** Periyodik kontrolü başlatır (ilk kontrol hemen). Birden fazla çağrı güvenli. */
  start(): void {
    if (this.timer) return
    log.info('connectivity service started', { intervalMs: CHECK_INTERVAL_MS, demo: IS_DEMO })
    void this.checkNow()
    this.timer = setInterval(() => void this.checkNow(), CHECK_INTERVAL_MS)
    // Uygulamanın kapanmasını engellemesin
    this.timer.unref?.()
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  /** Hemen bir kontrol yapar; süren kontrol varsa onun sonucunu bekler (çakışan istek yok). */
  checkNow(): Promise<InternetStatus> {
    if (this.inFlight) return this.inFlight
    this.inFlight = this.runCheck().finally(() => {
      this.inFlight = null
    })
    return this.inFlight
  }

  private async runCheck(): Promise<InternetStatus> {
    if (IS_DEMO) {
      const now = new Date().toISOString()
      this.update({
        state: 'online',
        checking: false,
        lastCheckedAt: now,
        lastOnlineAt: now,
        latencyMs: 0,
        target: null,
        error: null,
        simulated: true,
      })
      return this.getStatus()
    }

    this.update({ checking: true })
    let result: ProbeResult | null = null
    for (const url of TARGETS) {
      result = await probe(url)
      if (result.ok) break
    }
    const now = new Date().toISOString()
    const online = result?.ok === true
    const prevState = this.status.state
    this.update({
      state: online ? 'online' : 'offline',
      checking: false,
      lastCheckedAt: now,
      lastOnlineAt: online ? now : this.status.lastOnlineAt,
      latencyMs: online ? result!.latencyMs : null,
      target: online ? result!.target : null,
      error: online ? null : (result?.error ?? 'Bilinmeyen hata'),
    })
    // Sadece durum değişiminde logla (30 sn'de bir log kirliliği olmasın)
    if (prevState !== this.status.state) {
      if (online) log.info('internet online', { target: result!.target, latencyMs: result!.latencyMs })
      else log.warn('internet offline', { error: this.status.error })
    }
    return this.getStatus()
  }

  private update(patch: Partial<InternetStatus>): void {
    this.status = { ...this.status, ...patch }
    this.emitter.emit('status', this.getStatus())
  }
}

export const connectivityService = new ConnectivityService()
