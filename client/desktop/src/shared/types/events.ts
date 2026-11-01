// Backend MachineEvent envelope (Core/Models/Events/MachineEvent.cs) yansıması.
// DataAPI /corventa SignalR hub'ı "EventReceived" callback'iyle bu şekli gönderir.

export const EventMessageType = {
  Info: 'info',
  Warning: 'warning',
  Error: 'error',
} as const
export type EventMessageType = (typeof EventMessageType)[keyof typeof EventMessageType]

// Bilinen eventType sabitleri. Yeni tip eklenince burayı güncelle.
export const EventTypes = {
  PartSensor: 'PartSensor',
  /** EXCEL 27 — hareket komutu varken encoder ilerlemiyor (sadece uyarı, hareket durmaz) */
  EncoderStall: 'EncoderStall',
  /** EXCEL 27 — açılış / büküm başı yağ sıcaklığı + sensör kontrolü (info = sorun yok) */
  SafetyCheck: 'SafetyCheck',
  // İleride: OilTemperature, EmergencyStop, JobStatusChanged, ...
} as const

export interface MachineEvent<TPayload = unknown> {
  messageType: EventMessageType
  eventType: string
  timestamp: string // ISO-8601 UTC
  payload: TPayload
}

// EventType-spesifik payload tipler
export interface PartSensorPayload {
  leftPartSensor: boolean
  rightPartSensor: boolean
}

export type PartSensorEvent = MachineEvent<PartSensorPayload>

/** Backend SafetyMonitorService — eksen adları */
export type SafetyAxis = 'Right' | 'Left' | 'Upper' | 'Lower' | 'Rotation'

export interface EncoderStallPayload {
  axis: SafetyAxis
  movedMm: number
  minMm: number
  windowMs: number
  positionMm: number
}

/** Backend SafetyCheckService.Codes */
export type SafetyWarningCode =
  | 'OilTempHigh'
  | 'OilTempCritical'
  | 'OilTempSensorFault'
  | 'S1PressureSensorFault'
  | 'S2PressureSensorFault'

export interface SafetyCheckPayload {
  context: 'Startup' | 'StartJob' | 'Periodic'
  jobId: number | null
  /** true → büküm başlatılmadı (SafetyBlockingEnabled + yağ sıcaklığı engel eşiği üstü) */
  blocked: boolean
  blockReason: string | null
  oilTempC: number
  oilTempWarnC: number
  oilTempBlockC: number
  blockingEnabled: boolean
  warnings: { code: SafetyWarningCode | string; message: string }[]
}
