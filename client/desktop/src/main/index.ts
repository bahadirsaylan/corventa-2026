import { app, BrowserWindow, ipcMain, Menu, globalShortcut, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

import { childLogger } from '@main/lib/logger'
import { connectionManager } from '@main/services/ConnectionManager'
import { dumpInitialState, startEventsBroadcaster } from '@main/ipc/eventsBroadcaster'
import { registerIpcHandlers } from '@main/ipc/registerHandlers'
import { backendSupervisor, SupervisorStatus } from '@main/services/backend-supervisor/BackendSupervisor'

const log = childLogger('app')

let mainWindow: BrowserWindow | null = null
let splashWindow: BrowserWindow | null = null

// 2026-09-04 — Kiosk mode: uygulama menu, F-key, Alt+F4 vs. blocklanir.
// Sifresiz cikis 3 gizli tetikleyiciden biriyle olur (Ctrl+Alt+Shift+X global veya
// UI icinden 5-tap/uzun-basis). Rol/sifre yapisi sonraki fazda eklenecek.
const IS_KIOSK = !process.env.CORVENTA_NO_KIOSK // Test icin CORVENTA_NO_KIOSK=1 ile devre disi

// ─────────────────────────────────────────────────────────────
// Splash pencere — backend hazir olana kadar gosterilir
// ─────────────────────────────────────────────────────────────

function createSplash(): void {
  splashWindow = new BrowserWindow({
    width: 520,
    height: 300,
    frame: false,
    resizable: false,
    movable: false,
    center: true,
    alwaysOnTop: true,
    transparent: false,
    skipTaskbar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Inline HTML — dosyaya gerek yok
  splashWindow.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(`
<!doctype html><html><head><meta charset="utf-8"/><style>
  body {
    margin: 0; padding: 32px; box-sizing: border-box;
    font-family: 'Segoe UI', Roboto, sans-serif;
    background: linear-gradient(135deg, #c0392b 0%, #a93226 100%);
    color: #fff; height: 100vh; display: flex; flex-direction: column;
    justify-content: center; align-items: center; gap: 20px;
    user-select: none; -webkit-app-region: drag;
  }
  h1 { font-size: 32px; font-weight: 800; letter-spacing: 0.08em; margin: 0; }
  .status {
    font-size: 14px; opacity: 0.9; min-height: 20px; text-align: center;
    font-family: monospace;
  }
  .spinner {
    width: 40px; height: 40px;
    border: 3px solid rgba(255,255,255,0.25);
    border-top-color: #fff; border-radius: 50%;
    animation: s 0.9s linear infinite;
  }
  @keyframes s { to { transform: rotate(360deg); } }
</style></head><body>
  <div class="spinner"></div>
  <h1>CORVENTA</h1>
  <div class="status" id="s">Sistem baslatiliyor...</div>
  <script>
    const { ipcRenderer } = require('electron')
  </script>
</body></html>`)}`,
  )

  splashWindow.on('closed', () => { splashWindow = null })
}

function updateSplashStatus(text: string): void {
  if (!splashWindow || splashWindow.isDestroyed()) return
  splashWindow.webContents.executeJavaScript(
    `document.getElementById('s').innerText = ${JSON.stringify(text)}`,
  ).catch(() => { /* splash kapali */ })
}

// ─────────────────────────────────────────────────────────────
// Ana pencere — kiosk yapilandirmasi
// ─────────────────────────────────────────────────────────────

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1080,
    height: 1920,
    minWidth: 1080,
    minHeight: 1920,
    resizable: false,
    movable: !IS_KIOSK,
    closable: !IS_KIOSK,
    kiosk: IS_KIOSK,
    fullscreen: IS_KIOSK,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      // Dev'de DevTools acik kalsin (debug), prod build'de kapali
      devTools: is.dev,
    },
    frame: false,
    show: false,
  })

  // Menu bar tamamen kaldir (Alt bassa bile menu gorunmesin)
  mainWindow.setMenu(null)

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    if (mainWindow) dumpInitialState(mainWindow)
    // Ana pencere hazir → splash'i kapat
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close()
    }
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  // KIOSK: kritik kisayollari block et (F11, F12, Ctrl+R, Alt+F4, Alt+Tab...)
  if (IS_KIOSK) {
    mainWindow.webContents.on('before-input-event', (event, input) => {
      const key = input.key
      const ctrl = input.control
      const alt = input.alt
      const shift = input.shift

      // Blocked combinations
      const blocked =
        key === 'F5' ||                                    // Reload
        key === 'F11' ||                                   // Fullscreen toggle
        key === 'F12' ||                                   // DevTools
        (ctrl && key.toLowerCase() === 'r') ||             // Ctrl+R
        (ctrl && shift && key.toLowerCase() === 'r') ||    // Ctrl+Shift+R
        (ctrl && shift && key.toLowerCase() === 'i') ||    // Ctrl+Shift+I DevTools
        (ctrl && shift && key.toLowerCase() === 'j') ||    // Ctrl+Shift+J Console
        (ctrl && key.toLowerCase() === 'w') ||             // Ctrl+W close tab
        (ctrl && key.toLowerCase() === 'q') ||             // Ctrl+Q quit
        (alt && key === 'F4') ||                           // Alt+F4
        (alt && key === 'Tab')                             // Alt+Tab (partial)

      if (blocked) {
        event.preventDefault()
      }
    })

    // Reload/navigate block
    mainWindow.webContents.on('will-navigate', (e) => e.preventDefault())
  }

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    // Dev'de DevTools ayri pencerede aç (kiosk ekrani kaplamasin)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ─────────────────────────────────────────────────────────────
// Kiosk cikis — 3 gizli tetikleyici
//   1. Global shortcut: Ctrl+Alt+Shift+X (klavye)
//   2. IPC 'kiosk:exit' (renderer'dan: 5-tap logo veya 5sn uzun basis)
// Simdilik sifresiz — rol/sifre yapisi sonraki fazda eklenecek.
// ─────────────────────────────────────────────────────────────

function registerKioskExitHandlers(): void {
  // 1) Global klavye kisayolu (uygulama focus'ta olmasa da calisir)
  const shortcutRegistered = globalShortcut.register('Control+Alt+Shift+X', () => {
    log.info('KIOSK EXIT: Ctrl+Alt+Shift+X tetiklendi')
    app.quit()
  })
  if (!shortcutRegistered) {
    log.warn('Ctrl+Alt+Shift+X global shortcut registered edilemedi (baska bir uygulama kullaniyor olabilir)')
  }

  // 2) Renderer'dan IPC (5-tap logo, uzun basis)
  ipcMain.handle('kiosk:exit', () => {
    log.info('KIOSK EXIT: renderer IPC tetiklendi')
    app.quit()
    return { ok: true }
  })
}

// ─────────────────────────────────────────────────────────────
// Tek instance lock
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// App lifecycle
// ─────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  log.info('app ready', { version: app.getVersion(), platform: process.platform, kiosk: IS_KIOSK })

  // Menu bar tamamen kaldir (uygulama seviyesi)
  Menu.setApplicationMenu(null)

  // Splash goster
  createSplash()

  // Backend'i sirali baslat (DataApi → BendingApi → Web)
  backendSupervisor.onStatus((s: SupervisorStatus) => {
    const label =
      s.kind === 'starting' ? `${s.service} baslatiliyor...` :
      s.kind === 'waiting'  ? `${s.service} hazir olmasi bekleniyor (ilk acilista 2-3dk surebilir)...` :
      s.kind === 'ready'    ? 'Butun servisler hazir' :
      s.kind === 'failed'   ? `HATA: ${s.service} — ${s.error}` :
                              ''
    updateSplashStatus(label)
  })

  const backendOk = await backendSupervisor.start()
  if (!backendOk) {
    log.error('Backend baslatilamadi — UI acilmayacak')
    updateSplashStatus('Backend baslatilamadi. Log dosyasina bakin.')
    // 5sn splash'i acik tut ki hata gorulsun, sonra kapat
    setTimeout(() => app.quit(), 5000)
    return
  }

  // IPC handler'lari + broadcaster
  registerIpcHandlers()
  registerKioskExitHandlers()
  startEventsBroadcaster()

  // Backend'e SignalR connection
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
  await backendSupervisor.stop().catch(() => {})
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', async () => {
  log.info('before-quit — servisleri kapatiyorum')
  globalShortcut.unregisterAll()
  await connectionManager.stop().catch(() => {})
  await backendSupervisor.stop().catch(() => {})
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

// IPC error wrapping — renderer'a temiz hata gonder
ipcMain.on('error', (_evt, err) => {
  log.error('ipc error', { error: err })
})
