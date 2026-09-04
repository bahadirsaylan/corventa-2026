// 2026-09-05 — BendingBallsPanel'in stats footer'inda rotasyon CW/CCW jog butonlari.
// Sadece bukum YOKKEN (progress==null) enabled. Aktif otomatik bukumde disabled + tooltip.
// Basili-tut pattern (pointerdown = jog, pointerup/leave = stop) SideSupportControls ile ayni.

import { useCallback, useRef } from 'react'
import { useBendingProgress } from '@/hooks/useMachineState'
import styles from './RotationJogButtons.module.css'

interface Props {
  speedPercent: number
}

export default function RotationJogButtons({ speedPercent }: Props) {
  const progress = useBendingProgress()

  // BendingProgress store'da son mesaj kalır (backend job Completed olunca
  // artık push atmıyor ama store'daki son değer null'a düşmüyor). Bu yüzden
  // "büküm aktif" tespitini pasos toplamına göre yapıyoruz: totalPasos'a
  // ulaşıldıysa (veya %100) büküm bitti sayılır → jog aktif.
  const isFinished =
    !!progress && progress.totalPasos > 0 &&
    (progress.completedPasos >= progress.totalPasos || progress.percentComplete >= 100)
  const bendingActive = !!progress && !isFinished

  return (
    <div className={styles.wrap}>
      <div className={styles.label}>
        ROTASYON
        {bendingActive && <span className={styles.disabledHint}> (BÜKÜM AKTİF)</span>}
      </div>
      <div className={styles.btnRow}>
        <JogButton direction={-1} label="CCW" arrow="◀" disabled={bendingActive} speedPercent={speedPercent} />
        <JogButton direction={+1} label="CW" arrow="▶" disabled={bendingActive} speedPercent={speedPercent} />
      </div>
    </div>
  )
}

interface JogButtonProps {
  direction: 1 | -1
  label: string
  arrow: string
  disabled: boolean
  speedPercent: number
}

function JogButton({ direction, label, arrow, disabled, speedPercent }: JogButtonProps) {
  const activeRef = useRef(false)

  const start = useCallback(() => {
    if (disabled || activeRef.current) return
    activeRef.current = true
    void window.corventa.machine
      .rotationJog({ direction, speedPercent })
      .catch(() => { /* backend fail sessizce yut, stop yine denenir */ })
  }, [direction, disabled, speedPercent])

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
