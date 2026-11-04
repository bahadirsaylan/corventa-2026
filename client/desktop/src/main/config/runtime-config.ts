// Backend bağlantı ayarları — production'da config dosyasından / env'den okunabilecek şekilde.
// Hardcode yok; tek noktada toplu.

import { app } from 'electron'

export interface RuntimeConfig {
  engine: {
    baseUrl: string // Engine API (Bending API)
    hubUrl: string // /machineHub
  }
  dataApi: {
    baseUrl: string // DataApi
    hubUrl: string // /corventa
  }

  http: {
    defaultTimeoutMs: number
    healthCheckIntervalMs: number
  }

  watchdog: {
    // SignalR'dan kaç saniyedir state gelmiyorsa "stale" sayalım
    staleStateThresholdMs: number
  }

  logging: {
    level: 'error' | 'warn' | 'info' | 'debug'
    fileMaxSize: string // ör. '5m'
    fileMaxFiles: number
  }
}

// Default — geliştirme + ilk prod kurulum
const DEFAULT_CONFIG: RuntimeConfig = {
  engine: {
    baseUrl: 'http://localhost:5000',
    hubUrl: 'http://localhost:5000/machineHub',
  },
  dataApi: {
    baseUrl: 'http://localhost:5002',
    hubUrl: 'http://localhost:5002/corventa',
  },
  http: {
    defaultTimeoutMs: 10_000,
    healthCheckIntervalMs: 30_000,
  },
  watchdog: {
    staleStateThresholdMs: 5_000,
  },
  logging: {
    level: app.isPackaged ? 'info' : 'debug',
    fileMaxSize: '5m',
    fileMaxFiles: 10,
  },
}

let _config: RuntimeConfig = DEFAULT_CONFIG

export function getConfig(): RuntimeConfig {
  return _config
}

// İleride config dosyası okuma için yer:
// export function loadConfigFile(path: string): void { ... }

export function overrideConfig(overrides: Partial<RuntimeConfig>): void {
  _config = { ..._config, ...overrides }
}
