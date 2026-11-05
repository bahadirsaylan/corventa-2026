// Sistem yardımcı IPC handler'ları — PDF açma vb.

import { app, ipcMain, shell } from 'electron'
import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
import { join } from 'path'

import { IS_DEMO } from '@main/demo/DemoMachine'
import { changeDemoZoom, currentDemoZoomPercent, demoWindowFitActive } from '@main/demo/demoWindow'
import { childLogger } from '@main/lib/logger'
import { connectivityService } from '@main/services/connectivity/ConnectivityService'
import { Ipc } from '@shared'

const log = childLogger('ipc:system')

const USER_GUIDE_FILENAME = 'CORVENTA_MIDI_USER_GUIDE.pdf'

/**
 * Kullanım kitabı PDF dosyasının diskteki yolunu döndürür.
 * - Geliştirme: <repo>/client/desktop/resources/CORVENTA_MIDI_USER_GUIDE.pdf
 * - Paketlenmiş: process.resourcesPath/CORVENTA_MIDI_USER_GUIDE.pdf (extraResources)
 */
function resolveUserGuidePath(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, USER_GUIDE_FILENAME)
  }
  // electron-vite dev modunda __dirname = out/main; resources kardeş klasör
  return join(__dirname, '..', '..', 'resources', USER_GUIDE_FILENAME)
}

export function registerSystemHandlers(): void {
  // Demo modu mu? (CORVENTA_DEMO=1) — demoya özel ekranlar (tahliye) bununla açılır
  ipcMain.handle(Ipc.IpcInvoke.SystemIsDemo, async () => IS_DEMO)

  // 2026-11-05 — demo pencere boyutu (başka PC'de büyük/küçük görünürse). Demo pencere modu değilse null.
  ipcMain.handle(Ipc.IpcInvoke.DemoWindowZoom, async (_evt, action?: string) => {
    if (!demoWindowFitActive()) return null
    if (action === 'in' || action === 'out' || action === 'reset') return changeDemoZoom(action)
    return currentDemoZoomPercent()
  })

  // İnternet erişimi (EXCEL 37) — son bilinen durum / şimdi kontrol et (Google generate_204)
  ipcMain.handle(Ipc.IpcInvoke.SystemGetInternetStatus, async () => connectivityService.getStatus())
  ipcMain.handle(Ipc.IpcInvoke.SystemCheckInternetNow, async () => connectivityService.checkNow())

  // Kılavuzu uygulama İÇİNDE göstermek için dosya içeriği (renderer blob URL ile PDF görüntüleyicide açar)
  ipcMain.handle(Ipc.IpcInvoke.ReadUserGuide, async () => {
    const pdfPath = resolveUserGuidePath()
    if (!existsSync(pdfPath)) {
      log.warn('user guide PDF not found', { pdfPath })
      return { ok: false, error: `PDF bulunamadı: ${pdfPath}` }
    }
    try {
      return { ok: true, data: new Uint8Array(await readFile(pdfPath)) }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(Ipc.IpcInvoke.OpenUserGuide, async () => {
    const pdfPath = resolveUserGuidePath()

    if (!existsSync(pdfPath)) {
      log.warn('user guide PDF not found', { pdfPath })
      return { ok: false, error: `PDF bulunamadı: ${pdfPath}` }
    }

    try {
      const errorMessage = await shell.openPath(pdfPath)
      if (errorMessage) {
        log.error('shell.openPath failed', { pdfPath, errorMessage })
        return { ok: false, error: errorMessage }
      }
      log.info('user guide opened', { pdfPath })
      return { ok: true }
    } catch (err) {
      const msg = (err as Error).message
      log.error('open user guide threw', { error: msg })
      return { ok: false, error: msg }
    }
  })
}
