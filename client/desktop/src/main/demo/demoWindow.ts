// DEMO + PENCERE MODU (CORVENTA_DEMO=1 + CORVENTA_NO_KIOSK=1) — 2026-11-04.
// Paketli demo başka bir PC'de (dizüstü vb.) açıldığında 1080x1920 arayüz ekrana sığmaz; ana pencere
// ekranın çalışma alanına sığacak şekilde küçültülür ve içerik aynı oranda ölçeklenir (en fazla %50 → 540x960,
// geliştirme PC'si ile aynı). Kiosk / gerçek makine / demo olmayan çalıştırmada HİÇBİR ŞEY yapmaz.
//
// Not: zoom, sayfa yüklendikten SONRA verilmeli (önce verilen zoom sayfa yüklenince 1'e döner). İlk sürüm
// (pencere oluşurken zoom + did-finish-load) paketli demoda tutmadı: arayüz 540 px'e ölçeksiz basıldı, ekran
// klavyesi sıkıştı. Olaylara bağlı kalmamak için ana pencere saniyede bir kontrol edilir; yükleme bitmiş ve
// zoom hedeften farklıysa yeniden uygulanır (sayfa yenilense de düzelir). Maliyeti yok denecek kadar az.

import { app, BrowserWindow, screen } from 'electron'

const BASE_W = 1080
const BASE_H = 1920

function targetZoom(win: BrowserWindow): number {
  const wa = screen.getDisplayMatching(win.getBounds()).workArea
  return Math.min(0.5, (wa.height - 40) / BASE_H, (wa.width - 40) / BASE_W)
}

function resize(win: BrowserWindow, zoom: number): void {
  const w = Math.round(BASE_W * zoom)
  const h = Math.round(BASE_H * zoom)
  win.setMinimumSize(w, h)
  win.setSize(w, h)
  win.center()
}

function isMainWindow(win: BrowserWindow | null): win is BrowserWindow {
  if (!win || win.isDestroyed()) return false
  const [w, h] = win.getSize()
  // Başlangıç (splash) penceresi küçük — dokunma. Ana pencere 1080x1920 açılır (ekran küçükse Windows kırpar)
  // veya daha önce bizim küçülttüğümüz boyuttadır.
  return w >= BASE_W / 2 && h >= BASE_H / 2 - 1
}

function applyZoom(win: BrowserWindow): void {
  try {
    const zoom = targetZoom(win)
    resize(win, zoom)
    win.webContents.setZoomFactor(zoom)
  } catch {
    // ölçekleme başarısızsa pencere olduğu gibi kalır
  }
}

export function installDemoWindowFit(): void {
  if (process.env.CORVENTA_DEMO !== '1' || !process.env.CORVENTA_NO_KIOSK) return
  app.on('browser-window-created', (_e, win) => {
    if (!isMainWindow(win)) return
    try {
      resize(win, targetZoom(win))
    } catch {
      /* yok say */
    }
  })
  setInterval(() => {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!isMainWindow(win)) continue
      const wc = win.webContents
      try {
        if (!wc.isLoading() && wc.getURL() && Math.abs(wc.getZoomFactor() - targetZoom(win)) > 0.001) applyZoom(win)
      } catch {
        /* yok say */
      }
    }
  }, 1000)
}
