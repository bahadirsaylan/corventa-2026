// Sistem yardımcı IPC handler'ları — PDF açma vb.

import { app, ipcMain, shell } from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'

import { childLogger } from '@main/lib/logger'
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
