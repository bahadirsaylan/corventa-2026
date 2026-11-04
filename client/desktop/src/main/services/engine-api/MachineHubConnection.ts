// SignalR /machineHub bağlantısı — Engine API'den real-time state push.

import * as signalR from '@microsoft/signalr'
import { EventEmitter } from 'node:events'

import { getConfig } from '@main/config/runtime-config'
import { childLogger } from '@main/lib/logger'
import type { MachineState } from '@shared/types'
import type { BendingProgress } from '@shared/types'
import type { ConnectionState } from '@shared/types'

const log = childLogger('machineHub')

export interface MachineHubEvents {
  stateUpdated: (state: MachineState) => void
  bendingProgress: (progress: BendingProgress) => void
  connectionStateChanged: (state: ConnectionState) => void
}

export class MachineHubConnection extends EventEmitter {
  private connection: signalR.HubConnection | null = null
  private connectionState: ConnectionState = 'disconnected'
  private lastStateAt: number | null = null

  override on<K extends keyof MachineHubEvents>(event: K, listener: MachineHubEvents[K]): this {
    return super.on(event, listener)
  }

  override emit<K extends keyof MachineHubEvents>(
    event: K,
    ...args: Parameters<MachineHubEvents[K]>
  ): boolean {
    return super.emit(event, ...args)
  }

  getConnectionState(): ConnectionState {
    return this.connectionState
  }

  getLastStateTimestamp(): number | null {
    return this.lastStateAt
  }

  async start(): Promise<void> {
    if (this.connection) {
      log.warn('start called while already initialized')
      return
    }

    const url = getConfig().engine.hubUrl

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(url, { withCredentials: false })
      .withAutomaticReconnect([0, 1_000, 2_000, 5_000, 10_000, 30_000])
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    this.connection.on('StateUpdated', (state: MachineState) => {
      this.lastStateAt = Date.now()
      this.emit('stateUpdated', state)
    })

    this.connection.on('BendingProgress', (progress: BendingProgress) => {
      this.emit('bendingProgress', progress)
    })

    this.connection.onreconnecting(() => {
      log.warn('reconnecting')
      this.setState('reconnecting')
    })

    this.connection.onreconnected(() => {
      log.info('reconnected')
      this.setState('connected')
    })

    this.connection.onclose((err) => {
      log.warn('connection closed', { error: err?.message })
      this.setState('disconnected')
    })

    this.setState('connecting')
    try {
      await this.connection.start()
      this.setState('connected')
      log.info('connected', { url })
    } catch (err) {
      log.warn('initial connect failed; will retry', { error: (err as Error).message })
      this.setState('error')
      this.scheduleReconnect()
    }
  }

  async stop(): Promise<void> {
    if (!this.connection) return
    try {
      await this.connection.stop()
    } catch (err) {
      log.warn('stop failed', { error: (err as Error).message })
    }
    this.connection = null
    this.setState('disconnected')
  }

  private setState(state: ConnectionState): void {
    if (this.connectionState === state) return
    this.connectionState = state
    this.emit('connectionStateChanged', state)
  }

  // SignalR auto-reconnect ilk bağlantı başarısız olursa devreye girmiyor.
  // Manuel olarak bir kez deneyeceğiz, başarısızsa periyodik retry.
  private reconnectTimer: NodeJS.Timeout | null = null
  private scheduleReconnect(): void {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null
      if (!this.connection || this.connectionState === 'connected') return
      try {
        log.info('manual reconnect attempt')
        await this.connection.start()
        this.setState('connected')
      } catch (err) {
        log.warn('manual reconnect failed', { error: (err as Error).message })
        this.scheduleReconnect()
      }
    }, 5_000)
  }
}
