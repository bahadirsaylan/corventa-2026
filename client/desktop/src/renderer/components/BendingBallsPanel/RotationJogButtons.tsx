// 2026-09-05 — BendingBallsPanel'in stats footer'inda rotasyon CW/CCW jog butonlari.
// Sadece bukum YOKKEN (progress==null) enabled. Aktif otomatik bukumde disabled + tooltip.
// Basili-tut pattern (pointerdown = jog, pointerup/leave = stop) SideSupportControls ile ayni.

import { useCallback, useRef } from 'react'
import { useBendingProgress } from '@/hooks/useMachineState'
import styles from './RotationJogButtons.module.css'

// Sabit jog hizi — %20 = 2V. Ileride ayarlar sayfasindan degistirilebilir.
const JOG_SPEED_PERCENT = 20

export default function RotationJogButtons() {
  const progress = useBendingProgress()
  const bendingActive = !!progress

  return (
    <div className={styles.wrap}>
      <div className={styles.label}>
        ROTASYON
        {bendingActive && <span className={styles.disabledHint}> (BÜKÜM AKTİF)</span>}
      </div>
      <div className={styles.btnRow}>
        <JogButton direction={-1} label="CCW" arrow="◀" disabled={bendingActive} />
        <JogButton direction={+1} label="CW" arrow="▶" disabled={bendingActive} />
      </div>
    </div>
  )
}

interface JogButtonProps {
  direction: 1 | -1
  label: string
  arrow: string
  disabled: boolean
}

function JogButton({ direction, label, arrow, disabled }: JogButtonProps) {
  const activeRef = useRef(false)

  const start = useCallback(() => {
    if (disabled || activeRef.current) return
    activeRef.current = true
    void window.corventa.machine
      .rotationJog({ direction, speedPercent: JOG_SPEED_PERCENT })
      .catch(() => { /* backend fail sessizce yut, stop yine denenir */ })
  }, [direction, disabled])

  const stop = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    void window.corventa.machine.rotationStop().catch(() => {})
  }, [])

  return (
    <button
      type="button"
      className={styles.jogBtn}
      data-direction={direction === 1 ? 'cw' : 'ccw'}
      disabled={disabled}
      title={disabled ? 'Büküm sürerken manuel rotasyon yasak' : `Rotasyon ${label} (basılı tut)`}
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
    >
      <span className={styles.arrow}>{arrow}</span>
      <span className={styles.text}>{label}</span>
    </button>
  )
}
