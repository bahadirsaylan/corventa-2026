// DEMO + PENCERE MODU (CORVENTA_DEMO=1 + CORVENTA_NO_KIOSK=1) — 2026-11-04.
// Paketli demo başka bir PC'de (dizüstü vb.) açıldığında 1080x1920 arayüz ekrana sığmaz; ana pencere
// ekranın çalışma alanına sığacak şekilde ölçeklenir (en fazla %50 → 540x960, geliştirme PC'si ile aynı).
// Kiosk / gerçek makine / demo olmayan çalıştırmada HİÇBİR ŞEY yapmaz.

import { app, screen, type BrowserWindow } from 'electron'

const BASE_W = 1080
const BASE_H = 1920

function fit(win: BrowserWindow): void {
  try {
    const wa = screen.getDisplayMatching(win.getBounds()).workArea
    const zoom = Math.min(0.5, (wa.height - 40) / BASE_H, (wa.width - 40) / BASE_W)
    const w = Math.round(BASE_W * zoom)
    const h = Math.round(BASE_H * zoom)
    win.setMinimumSize(w, h)
    win.setSize(w, h)
    win.center()
    win.webContents.setZoomFactor(zoom)
  } catch {
    // ölçekleme başarısızsa pencere olduğu gibi kalır
  }
}

export function installDemoWindowFit(): void {
  if (process.env.CORVENTA_DEMO !== '1' || !process.env.CORVENTA_NO_KIOSK) return
  app.on('browser-window-created', (_e, win) => {
    // Sadece ana arayüz penceresi (başlangıç/splash pencereleri küçük — dokunma)
    const [w, h] = win.getSize()
    if (w < BASE_W / 2 && h < BASE_H / 2) return
    fit(win)
    win.webContents.on('did-finish-load', () => fit(win))
  })
}
