// SignalR / ConnectionManager event'lerini açık webContents'lere push eder.
// Renderer ipcRenderer.on(IpcEvent.*, ...) ile dinler.

import { BrowserWindow } from 'electron'

import { childLogger } from '@main/lib/logger'
import { connectionManager } from '@main/services/ConnectionManager'
import { Ipc } from '@shared'

const log = childLogger('ipc:events')

function broadcast(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, payload)
    }
  }
}

export function startEventsBroadcaster(): void {
  log.info('events broadcaster started')

  connectionManager.on('stateUpdated', (state) => {
    broadcast(Ipc.IpcEvent.StateUpdated, state)
  })

  connectionManager.on('bendingProgress', (progress) => {
    broadcast(Ipc.IpcEvent.BendingProgress, progress)
  })

  connectionManager.on('eventReceived', (evt) => {
    broadcast(Ipc.IpcEvent.EventReceived, evt)
  })

  connectionManager.on('statusChanged', (status) => {
    broadcast(Ipc.IpcEvent.ConnectionStatusChanged, status)
  })
}

// Yeni pencere açılınca son state'i tek seferde dök — UI null check yapmak zorunda kalmasın.
export function dumpInitialState(window: BrowserWindow): void {
  if (window.isDestroyed()) return
  window.webContents.send(Ipc.IpcEvent.StateUpdated, connectionManager.getLatestState())
  window.webContents.send(Ipc.IpcEvent.ConnectionStatusChanged, connectionManager.getStatus())
  for (const evt of connectionManager.getCachedEvents()) {
    window.webContents.send(Ipc.IpcEvent.EventReceived, evt)
  }
}
