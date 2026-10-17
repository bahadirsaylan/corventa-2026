// window.corventa.events.* — main process push event'lerine renderer subscribe API'si.

import { ipcRenderer, type IpcRendererEvent } from 'electron'

import {
  Ipc,
  type BendingProgress,
  type ConnectionStatus,
  type MachineEvent,
  type MachineState,
} from '@shared'

type Unsubscribe = () => void

function subscribe<T>(channel: string, listener: (payload: T) => void): Unsubscribe {
  const wrapped = (_evt: IpcRendererEvent, payload: T): void => listener(payload)
  ipcRenderer.on(channel, wrapped)
  return () => ipcRenderer.removeListener(channel, wrapped)
}

export const eventsApi = {
  onStateUpdated: (listener: (state: MachineState) => void): Unsubscribe =>
    subscribe(Ipc.IpcEvent.StateUpdated, listener),

  onBendingProgress: (listener: (progress: BendingProgress) => void): Unsubscribe =>
    subscribe(Ipc.IpcEvent.BendingProgress, listener),

  onMachineEvent: (listener: (evt: MachineEvent) => void): Unsubscribe =>
    subscribe(Ipc.IpcEvent.EventReceived, listener),

  onConnectionStatusChanged: (listener: (status: ConnectionStatus) => void): Unsubscribe =>
    subscribe(Ipc.IpcEvent.ConnectionStatusChanged, listener),
}

export type EventsApi = typeof eventsApi
