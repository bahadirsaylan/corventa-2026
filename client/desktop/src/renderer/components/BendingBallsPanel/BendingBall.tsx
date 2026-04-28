import styles from './BendingBall.module.css'

interface BendingBallProps {
  id: string
  value: number
  active?: boolean
  onIncrement?: () => void
  onDecrement?: () => void
}

export default function BendingBall({
  value,
  active = true,
  onIncrement,
  onDecrement,
}: BendingBallProps) {
  return (
    <div className={`${styles.ball} ${active ? styles.active : styles.inactive}`}>
      <button className={styles.btn} onClick={onIncrement} aria-label="increment">
        +
      </button>
      <span className={styles.value}>{value.toFixed(1)}</span>
      <button className={styles.btn} onClick={onDecrement} aria-label="decrement">
        −
      </button>
    </div>
  )
}
