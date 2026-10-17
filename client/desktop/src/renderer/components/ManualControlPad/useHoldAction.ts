// Basılı-tut aksiyonu: pointerdown → onStart, bırakınca → onStop.
// Güvenlik: tuş basılıyken disabled olursa (ör. büküm başladı) veya component
// unmount olursa onStop otomatik gönderilir — jog komutu asılı kalmaz.

import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'

export function useHoldAction(onStart: () => void, onStop: () => void, disabled: boolean) {
  const activeRef = useRef(false)
  const [pressed, setPressed] = useState(false)
  const stopRef = useRef(onStop)
  stopRef.current = onStop

  const stop = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    setPressed(false)
    stopRef.current()
  }, [])

  const start = useCallback(() => {
    if (disabled || activeRef.current) return
    activeRef.current = true
    setPressed(true)
    onStart()
  }, [disabled, onStart])

  useEffect(() => {
    if (disabled) stop()
  }, [disabled, stop])

  useEffect(() => () => stop(), [stop])

  const handlers = {
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      start()
    },
    onPointerUp: (e: PointerEvent<HTMLButtonElement>) => {
      try { e.currentTarget.releasePointerCapture(e.pointerId) } catch { /* zaten bırakıldı */ }
      stop()
    },
    onPointerCancel: stop,
    onPointerLeave: stop,
    onContextMenu: (e: { preventDefault: () => void }) => e.preventDefault(),
  }

  return { pressed, handlers }
}
