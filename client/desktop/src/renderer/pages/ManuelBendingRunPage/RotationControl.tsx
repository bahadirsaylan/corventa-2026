// Manuel rotasyon kontrolü — ↺ CCW (-1) / ↻ CW (1) press-and-hold jog.
// Backend rotation jog: { direction: -1|0|1, speedPercent }.

import styles from './RotationControl.module.css'

interface Props {
  positionMm: number
  activeDirection: number // -1=CCW, 0=Stop, 1=CW
  onJog: (direction: 1 | -1) => void
  onRelease: () => void
}

export default function RotationControl({
  positionMm,
  activeDirection,
  onJog,
  onRelease,
}: Props) {
  return (
    <div className={styles.box}>
      <span className={styles.label}>ROTASYON</span>
      <div className={styles.row}>
        <button
          className={`${styles.btn} ${activeDirection === -1 ? styles.btnActive : ''}`}
          onPointerDown={(e) => {
            e.preventDefault()
            onJog(-1)
          }}
          onPointerUp={onRelease}
          onPointerLeave={onRelease}
          aria-label="ccw"
        >
          ↺
        </button>
        <span className={styles.value}>{positionMm.toFixed(1)}</span>
        <button
          className={`${styles.btn} ${activeDirection === 1 ? styles.btnActive : ''}`}
          onPointerDown={(e) => {
            e.preventDefault()
            onJog(1)
          }}
          onPointerUp={onRelease}
          onPointerLeave={onRelease}
          aria-label="cw"
        >
          ↻
        </button>
      </div>
    </div>
  )
}
