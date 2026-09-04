// 2026-09-05 — BendingBallsPanel'de piston + rotasyon jog icin ortak hiz kontrolu.
// − / + ile %5 basamaklarla ayar. Min %5 (0.5V), max %100 (10V).
// Deger BendingBallsPanel state'inde tutulur, hem piston BendingBall'lara hem
// RotationJogButtons'a prop olarak gecirilir.

import styles from './JogSpeedControl.module.css'

interface Props {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}

const STEP = 5
const MIN = 5
const MAX = 100

export default function JogSpeedControl({ value, onChange, disabled = false }: Props) {
  const dec = () => onChange(Math.max(MIN, value - STEP))
  const inc = () => onChange(Math.min(MAX, value + STEP))

  return (
    <div className={styles.wrap}>
      <div className={styles.label}>MANUEL HIZ</div>
      <div className={styles.row}>
        <button
          type="button"
          className={styles.btn}
          onClick={dec}
          disabled={disabled || value <= MIN}
          aria-label="hızı azalt"
        >
          −
        </button>
        <div className={styles.valueBox}>
          <span className={styles.valueNum}>%{value}</span>
          <span className={styles.valueVolt}>{(value / 10).toFixed(1)}V</span>
        </div>
        <button
          type="button"
          className={styles.btn}
          onClick={inc}
          disabled={disabled || value >= MAX}
          aria-label="hızı artır"
        >
          +
        </button>
      </div>
    </div>
  )
}
