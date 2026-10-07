// SEKIL-26 yan dayama göstergesi — açı + pozisyon değeri + dikey çubuk simgesi.
// Press-and-hold: ↑ = ileri (direction=1), ↓ = geri (direction=-1).

import styles from './SideSupport.module.css'

interface Props {
  position: number
  angleDeg: number
  side: 'left' | 'right'
  active?: boolean
  onForward: () => void
  onBackward: () => void
  onRelease: () => void
}

export default function SideSupport({
  position,
  angleDeg,
  side,
  active = false,
  onForward,
  onBackward,
  onRelease,
}: Props) {
  return (
    <div className={`${styles.box} ${side === 'left' ? styles.left : styles.right}`}>
      <span className={styles.angle}>
        {angleDeg}°
        {side === 'left' ? ' ↻' : ' ↺'}
      </span>
      <div className={`${styles.bar} ${active ? styles.barActive : ''}`} />
      <span className={styles.position}>
        {position.toFixed(1)}
        <span className={styles.arrow}>↑</span>
      </span>
      <div className={styles.btnCol}>
        <button
          className={styles.btn}
          onPointerDown={(e) => {
            e.preventDefault()
            onForward()
          }}
          onPointerUp={onRelease}
          onPointerLeave={onRelease}
          aria-label="ileri"
        >
          ▲
        </button>
        <button
          className={styles.btn}
          onPointerDown={(e) => {
            e.preventDefault()
            onBackward()
          }}
          onPointerUp={onRelease}
          onPointerLeave={onRelease}
          aria-label="geri"
        >
          ▼
        </button>
      </div>
    </div>
  )
}
