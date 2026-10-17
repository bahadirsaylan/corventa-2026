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
