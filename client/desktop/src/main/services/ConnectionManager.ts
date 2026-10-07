// Tüm backend bağlantılarını orkestre eder.
// Tek noktada start/stop, status takibi, event multicasting.

import { EventEmitter } from 'node:events'

import { childLogger } from '@main/lib/logger'
import { dataApi } from '@main/services/data-api/DataApiClient'
import { CorventaHubConnection } from '@main/services/data-api/CorventaHubConnection'
import { engineApi } from '@main/services/engine-api/EngineApiClient'
import { MachineHubConnection } from '@main/services/engine-api/MachineHubConnection'
import {
  emptyMachineState,
  type BendingProgress,
  type ConnectionState,
  type ConnectionStatus,
  type MachineEvent,
  type MachineState,
} from '@shared/types'

const log = childLogger('connectionMgr')

export interface ConnectionManagerEvents {
  statusChanged: (status: ConnectionStatus) => void
  stateUpdated: (state: MachineState) => void
  bendingProgress: (progress: BendingProgress) => void
  eventReceived: (evt: MachineEvent) => void
}

export class ConnectionManager extends EventEmitter {
  private machineHub = new MachineHubConnection()
  private corventaHub = new CorventaHubConnection()

  private engineHttpState: ConnectionState = 'disconnected'
  private dataApiHttpState: ConnectionState = 'disconnected'
  private lastError?: string

  // En son alınan state — yeni renderer pencere açılınca initial dump için.
  private latestState: MachineState = emptyMachineState()

  // Cached event'ler — corventa cache'ine ek olarak local copy
  // (henüz gerekli değilse gelecekte).
  private cachedEvents: Map<string, MachineEvent> = new Map()

  override on<K extends keyof ConnectionManagerEvents>(
    event: K,
    listener: ConnectionManagerEvents[K],
  ): this {
    return super.on(event, listener)
  }

  override emit<K extends keyof ConnectionManagerEvents>(
    event: K,
    ...args: Parameters<ConnectionManagerEvents[K]>
  ): boolean {
    return super.emit(event, ...args)
  }

  async start(): Promise<void> {
    log.info('starting connection manager')

    this.machineHub.on('stateUpdated', (state) => {
      this.latestState = state
      this.emit('stateUpdated', state)
    })
    this.machineHub.on('bendingProgress', (progress) => {
      this.emit('bendingProgress', progress)
    })
    this.machineHub.on('connectionStateChanged', () => {
      this.emitStatus()
    })

    this.corventaHub.on('eventReceived', (evt) => {
      this.cachedEvents.set(evt.eventType, evt)
      this.emit('eventReceived', evt)
    })
    this.corventaHub.on('connectionStateChanged', () => {
      this.emitStatus()
    })

    // Health check'leri ve hub'ları paralel başlat
    await Promise.allSettled([
      this.checkEngineHealth(),
      this.checkDataApiHealth(),
      this.machineHub.start(),
      this.corventaHub.start(),
    ])

    // Periyodik HTTP health check (SignalR ayrı kanal — REST hâlâ kapalı olabilir)
    this.healthCheckTimer = setInterval(() => {
      void this.checkEngineHealth()
      void this.checkDataApiHealth()
    }, 30_000)

    this.emitStatus()
  }

  async stop(): Promise<void> {
    log.info('stopping connection manager')
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
      this.healthCheckTimer = null
    }
    await Promise.allSettled([this.machineHub.stop(), this.corventaHub.stop()])
  }

  getStatus(): ConnectionStatus {
    const lastTs = this.machineHub.getLastStateTimestamp()
    return {
      engineHttp: this.engineHttpState,
      machineHub: this.machineHub.getConnectionState(),
      dataApiHttp: this.dataApiHttpState,
      corventaHub: this.corventaHub.getConnectionState(),
      lastError: this.lastError,
      lastStateUpdateAt: lastTs ? new Date(lastTs).toISOString() : undefined,
    }
  }

  getLatestState(): MachineState {
    return this.latestState
  }

  getCachedEvents(): MachineEvent[] {
    return Array.from(this.cachedEvents.values())
  }

  // ---- internal ----

  private healthCheckTimer: NodeJS.Timeout | null = null

  private async checkEngineHealth(): Promise<void> {
    const ok = await engineApi.isHealthy()
    const next: ConnectionState = ok ? 'connected' : 'error'
    if (next !== this.engineHttpState) {
      this.engineHttpState = next
      this.emitStatus()
    }
  }

  private async checkDataApiHealth(): Promise<void> {
    const ok = await dataApi.isHealthy()
    const next: ConnectionState = ok ? 'connected' : 'error'
    if (next !== this.dataApiHttpState) {
      this.dataApiHttpState = next
      this.emitStatus()
    }
  }

  private emitStatus(): void {
    this.emit('statusChanged', this.getStatus())
  }
}

// Singleton — main process boyunca tek instance
export const connectionManager = new ConnectionManager()
