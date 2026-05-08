import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

import { childLogger } from '@main/lib/logger'
import { connectionManager } from '@main/services/ConnectionManager'
import { dumpInitialState, startEventsBroadcaster } from '@main/ipc/eventsBroadcaster'
import { registerIpcHandlers } from '@main/ipc/registerHandlers'

const log = childLogger('app')

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1080,
    height: 1920,
    minWidth: 1080,
    minHeight: 1920,
    resizable: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    frame: false,
    show: false,
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    if (mainWindow) dumpInitialState(mainWindow)
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Tek-instance lock — ikinci kopya açılmasın
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

app.whenReady().then(async () => {
  log.info('app ready', { version: app.getVersion(), platform: process.platform })

  // Önce IPC handler'larını kaydet ki renderer ilk istekte hata almasın
  registerIpcHandlers()

  // Connection manager event'lerini renderer'a yayan broadcaster
  startEventsBroadcaster()

  // Backend'le bağlantıyı başlat (await etme — UI ayağa kalkması beklemez)
  connectionManager.start().catch((err) => {
    log.error('connection manager start failed', { error: (err as Error).message })
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', async () => {
  await connectionManager.stop().catch(() => {})
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', async () => {
  await connectionManager.stop().catch(() => {})
})

// IPC error wrapping — renderer'a temiz hata gönder
ipcMain.on('error', (_evt, err) => {
  log.error('ipc error', { error: err })
})
