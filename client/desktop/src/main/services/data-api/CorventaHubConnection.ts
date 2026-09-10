// SignalR /corventa bağlantısı — DataApi'den kategorize event'ler (PartSensor vb.).

import * as signalR from '@microsoft/signalr'
import { EventEmitter } from 'node:events'

import { getConfig } from '@main/config/runtime-config'
import { childLogger } from '@main/lib/logger'
import type { ConnectionState, MachineEvent } from '@shared/types'

const log = childLogger('corventaHub')

export interface CorventaHubEvents {
  eventReceived: (evt: MachineEvent) => void
  connectionStateChanged: (state: ConnectionState) => void
}

export class CorventaHubConnection extends EventEmitter {
  private connection: signalR.HubConnection | null = null
  private connectionState: ConnectionState = 'disconnected'

  override on<K extends keyof CorventaHubEvents>(event: K, listener: CorventaHubEvents[K]): this {
    return super.on(event, listener)
  }

  override emit<K extends keyof CorventaHubEvents>(
    event: K,
    ...args: Parameters<CorventaHubEvents[K]>
  ): boolean {
    return super.emit(event, ...args)
  }

  getConnectionState(): ConnectionState {
    return this.connectionState
  }

  async start(): Promise<void> {
    if (this.connection) {
      log.warn('start called while already initialized')
      return
    }

    const url = getConfig().dataApi.hubUrl

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(url, { withCredentials: false })
      .withAutomaticReconnect([0, 1_000, 2_000, 5_000, 10_000, 30_000])
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    this.connection.on('EventReceived', (evt: MachineEvent) => {
      this.emit('eventReceived', evt)
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
