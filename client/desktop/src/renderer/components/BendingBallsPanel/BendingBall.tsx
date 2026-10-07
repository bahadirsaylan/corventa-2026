// 2026-09-05: +/- butonlari basili-tut pattern'e cevrildi (piston jog icin).
// Bosta bekleyen onIncrement/onDecrement props'lari yerine onJogStart/onJogStop:
// pointerdown → jog baslar, pointerup/leave → dur. Endustriyel touch + mouse ile ayni yolla calisir.

import { useCallback, useRef } from 'react'
import styles from './BendingBall.module.css'

interface BendingBallProps {
  id: string
  value: number
  active?: boolean
  disabled?: boolean
  /** + tıklanınca — ileri yönde jog başlat (parca-tarafi, direction=-1 backend'de) */
  onJogPlusStart?: () => void
  /** − tıklanınca — geri yönde jog başlat (uzaga, direction=+1 backend'de) */
  onJogMinusStart?: () => void
  /** pointer bırakıldığında jog dur */
  onJogStop?: () => void
}

export default function BendingBall({
  value,
  active = true,
  disabled = false,
  onJogPlusStart,
  onJogMinusStart,
  onJogStop,
}: BendingBallProps) {
  return (
    <div className={`${styles.ball} ${active ? styles.active : styles.inactive}`}>
      <HoldButton
        label="+"
        disabled={disabled}
        onStart={onJogPlusStart}
        onStop={onJogStop}
      />
      <span className={styles.value}>{value.toFixed(1)}</span>
      <HoldButton
        label="−"
        disabled={disabled}
        onStart={onJogMinusStart}
        onStop={onJogStop}
      />
    </div>
  )
}

interface HoldButtonProps {
  label: string
  disabled: boolean
  onStart?: () => void
  onStop?: () => void
}

function HoldButton({ label, disabled, onStart, onStop }: HoldButtonProps) {
  const activeRef = useRef(false)

  const start = useCallback(() => {
    if (disabled || activeRef.current || !onStart) return
    activeRef.current = true
    onStart()
  }, [disabled, onStart])

  const stop = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    onStop?.()
  }, [onStop])

  return (
    <button
      type="button"
      className={styles.btn}
      disabled={disabled || !onStart}
      onPointerDown={(e) => {
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
        start()
      }}
      onPointerUp={(e) => {
        try { e.currentTarget.releasePointerCapture(e.pointerId) } catch { /* pointer released */ }
        stop()
      }}
      onPointerCancel={stop}
      onPointerLeave={stop}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={label === '+' ? 'jog ileri' : 'jog geri'}
    >
      {label}
    </button>
  )
}
