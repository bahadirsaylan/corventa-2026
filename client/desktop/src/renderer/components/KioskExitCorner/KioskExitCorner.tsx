// 2026-09-04 — Kiosk moddan gizli cikis tetikleyicisi.
// Sag ust kose'de gorunmez bir hot-spot:
//   - 2sn icinde 5 tap → cikis
//   - 5sn kesintisiz basili tutma → cikis
// Global klavye kisayolu Ctrl+Alt+Shift+X main process'te (bu component'ten bagimsiz).
//
// Simdilik sifresiz — rol/sifre yapisi sonraki fazda eklenecek.

import { useEffect, useRef, useState } from 'react'
import styles from './KioskExitCorner.module.css'

const TAP_COUNT_TARGET = 5
const TAP_WINDOW_MS = 2000
const LONG_PRESS_MS = 5000

export default function KioskExitCorner() {
  const [toast, setToast] = useState<string | null>(null)

  const tapCountRef = useRef<number>(0)
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const exitedRef = useRef<boolean>(false) // ayni turda 2 kez tetiklenmesin

  const triggerExit = (reason: string) => {
    if (exitedRef.current) return
    exitedRef.current = true
    setToast(`Kioskdan cikiliyor (${reason})...`)
    setTimeout(() => {
      window.corventa?.system
        ?.exitKiosk()
        .catch((err) => {
          console.error('kiosk exit fail', err)
          setToast(`Cikis basarisiz: ${String(err)}`)
          exitedRef.current = false // tekrar denenebilsin
        })
    }, 300)
  }

  const handleTap = () => {
    tapCountRef.current += 1

    // Sayacı 2sn sonra sifirla
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current)
    tapTimerRef.current = setTimeout(() => {
      tapCountRef.current = 0
    }, TAP_WINDOW_MS)

    if (tapCountRef.current >= TAP_COUNT_TARGET) {
      tapCountRef.current = 0
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current)
      triggerExit(`${TAP_COUNT_TARGET}-tap`)
    }
  }

  const handlePointerDown = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
    longPressTimerRef.current = setTimeout(() => {
      triggerExit(`${LONG_PRESS_MS / 1000}sn uzun basis`)
    }, LONG_PRESS_MS)
  }

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  // Component unmount olursa timer'lari temizle
  useEffect(() => {
    return () => {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current)
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
    }
  }, [])

  return (
    <>
      <div
        className={styles.hotspot}
        onClick={handleTap}
        onPointerDown={handlePointerDown}
        onPointerUp={cancelLongPress}
        onPointerLeave={cancelLongPress}
        onPointerCancel={cancelLongPress}
        aria-hidden="true"
      />
      {toast && <div className={styles.toast}>{toast}</div>}
    </>
  )
}
