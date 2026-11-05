// DEMO + PENCERE MODU (CORVENTA_DEMO=1 + CORVENTA_NO_KIOSK=1) — 2026-11-04.
// Paketli demo başka bir PC'de (dizüstü vb.) açıldığında 1080x1920 arayüz ekrana sığmaz; ana pencere
// ekranın çalışma alanına sığacak şekilde küçültülür ve içerik aynı oranda ölçeklenir (en fazla %50 → 540x960,
// geliştirme PC'si ile aynı). Kiosk / gerçek makine / demo olmayan çalıştırmada HİÇBİR ŞEY yapmaz.
//
// Not: zoom, sayfa yüklendikten SONRA verilmeli (önce verilen zoom sayfa yüklenince 1'e döner). İlk sürüm
// (pencere oluşurken zoom + did-finish-load) paketli demoda tutmadı: arayüz 540 px'e ölçeksiz basıldı, ekran
// klavyesi sıkıştı. Olaylara bağlı kalmamak için ana pencere saniyede bir kontrol edilir; yükleme bitmiş ve
// zoom hedeften farklıysa yeniden uygulanır (sayfa yenilense de düzelir). Maliyeti yok denecek kadar az.
//
// 2026-11-05 — EKRAN BOYUTU: kullanıcı boyutu kendisi seçer (Ctrl + / Ctrl − / Ctrl 0 veya giriş ekranındaki
// düğmeler). Seçim <userData>/demo-window.json'da saklanır (o PC'de hatırlanır). Üst sınır ekrana sığan boyut.

import { app, BrowserWindow, screen } from 'electron'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const BASE_W = 1080
const BASE_H = 1920
const MIN_ZOOM = 0.2
const STEP = 0.05

let userZoom: number | null = null // null = otomatik (ekrana sığan, en fazla %50)

function prefsPath(): string {
  return join(app.getPath('userData'), 'demo-window.json')
}

function loadPrefs(): void {
  try {
    const j = JSON.parse(readFileSync(prefsPath(), 'utf8')) as { zoom?: unknown }
    userZoom = typeof j.zoom === 'number' && Number.isFinite(j.zoom) ? j.zoom : null
  } catch {
    userZoom = null
  }
}

function savePrefs(): void {
  try {
    writeFileSync(prefsPath(), JSON.stringify({ zoom: userZoom }), 'utf8')
  } catch {
    /* kaydedilemezse sadece bu oturumda geçerli */
  }
}

/** Ekrana sığan en büyük zoom (pencere çerçevesi + görev çubuğu payı ile). */
function fitZoom(win: BrowserWindow): number {
  const wa = screen.getDisplayMatching(win.getBounds()).workArea
  return Math.min((wa.height - 40) / BASE_H, (wa.width - 40) / BASE_W)
}

function targetZoom(win: BrowserWindow): number {
  const fit = fitZoom(win)
  const z = userZoom ?? Math.min(0.5, fit)
  return Math.max(MIN_ZOOM, Math.min(z, fit))
}

function resize(win: BrowserWindow, zoom: number): void {
  const w = Math.round(BASE_W * zoom)
  const h = Math.round(BASE_H * zoom)
  win.setMinimumSize(Math.round(BASE_W * MIN_ZOOM), Math.round(BASE_H * MIN_ZOOM))
  win.setSize(w, h)
  win.center()
}

function isMainWindow(win: BrowserWindow | null): win is BrowserWindow {
  if (!win || win.isDestroyed()) return false
  const [w, h] = win.getSize()
  // Başlangıç (splash) penceresi küçük — dokunma. Ana pencere 1080x1920 açılır (ekran küçükse Windows kırpar)
  // veya daha önce bizim küçülttüğümüz boyuttadır (en az MIN_ZOOM).
  return w >= BASE_W * MIN_ZOOM - 1 && h >= BASE_H * MIN_ZOOM - 1 && h > w
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

function mainWindows(): BrowserWindow[] {
  return BrowserWindow.getAllWindows().filter(isMainWindow)
}

/** Boyutu değiştir: 'in' büyüt, 'out' küçült, 'reset' otomatik. Yeni yüzde döner (ör. 45). */
export function changeDemoZoom(action: 'in' | 'out' | 'reset'): number {
  const win = mainWindows()[0]
  if (!win) return Math.round((userZoom ?? 0.5) * 100)
  if (action === 'reset') {
    userZoom = null
  } else {
    const cur = targetZoom(win)
    const next = Math.round((cur + (action === 'in' ? STEP : -STEP)) / STEP) * STEP
    userZoom = Math.max(MIN_ZOOM, Math.min(next, fitZoom(win)))
  }
  savePrefs()
  for (const w of mainWindows()) applyZoom(w)
  return Math.round(targetZoom(win) * 100)
}

export function currentDemoZoomPercent(): number {
  const win = mainWindows()[0]
  return Math.round((win ? targetZoom(win) : (userZoom ?? 0.5)) * 100)
}

export function demoWindowFitActive(): boolean {
  return process.env.CORVENTA_DEMO === '1' && !!process.env.CORVENTA_NO_KIOSK
}

export function installDemoWindowFit(): void {
  if (!demoWindowFitActive()) return
  loadPrefs()
  app.on('browser-window-created', (_e, win) => {
    // Klavye kısayolları: Ctrl + / Ctrl = büyüt, Ctrl − küçült, Ctrl 0 otomatik
    win.webContents.on('before-input-event', (event, input) => {
      if (input.type !== 'keyDown' || !(input.control || input.meta) || input.alt) return
      const k = input.key
      if (k === '+' || k === '=' || input.code === 'NumpadAdd') {
        changeDemoZoom('in')
        event.preventDefault()
      } else if (k === '-' || input.code === 'NumpadSubtract') {
        changeDemoZoom('out')
        event.preventDefault()
      } else if (k === '0' || input.code === 'Numpad0') {
        changeDemoZoom('reset')
        event.preventDefault()
      }
    })
    if (!isMainWindow(win)) return
    try {
      resize(win, targetZoom(win))
    } catch {
      /* yok say */
    }
  })
  setInterval(() => {
    for (const win of mainWindows()) {
      const wc = win.webContents
      try {
        if (!wc.isLoading() && wc.getURL() && Math.abs(wc.getZoomFactor() - targetZoom(win)) > 0.001) applyZoom(win)
      } catch {
        /* yok say */
      }
    }
  }, 1000)
}
