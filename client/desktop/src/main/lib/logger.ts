// Winston tabanlı logger — operatör cihazında dosyaya yazar (audit trail).
// Production'da sahada "şu saatte ne oldu?" sorusunu cevaplayabilelim.

import { app } from 'electron'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import winston from 'winston'

import { getConfig } from '@main/config/runtime-config'

const cfg = getConfig()

const logsDir = join(app.getPath('userData'), 'logs')
try {
  mkdirSync(logsDir, { recursive: true })
} catch {
  // ignore — runtime'da userData yoksa winston file transport zaten throw eder
}

const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
)

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : ''
    return `${timestamp as string} ${level} ${message as string}${metaStr}`
  }),
)

const transports: winston.transport[] = [
  // Tüm log seviyelerini günlük dosyalara döker
  new winston.transports.File({
    filename: join(logsDir, 'corventa-error.log'),
    level: 'error',
    maxsize: 5 * 1024 * 1024, // 5 MB
    maxFiles: 5,
    format: fileFormat,
  }),
  new winston.transports.File({
    filename: join(logsDir, 'corventa.log'),
    maxsize: 5 * 1024 * 1024,
    maxFiles: cfg.logging.fileMaxFiles,
    format: fileFormat,
  }),
]

if (!app.isPackaged) {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
    }),
  )
}

export const logger = winston.createLogger({
  level: cfg.logging.level,
  defaultMeta: { component: 'main' },
  transports,
})

export function childLogger(component: string): winston.Logger {
  return logger.child({ component })
}
