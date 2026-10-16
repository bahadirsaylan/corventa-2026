// SEKIL-26: piston pozisyon dairesi + ortasında değer + üst/alt + - jog butonları.
// Touch-and-hold pattern: tuşa basıldıkça komut gönderilir, bırakılınca stop.

import { useT } from '@/i18n'
import styles from './JogBall.module.css'

interface Props {
  value: number
  active?: boolean
  onPlus: () => void
  onMinus: () => void
  onRelease: () => void
}

export default function JogBall({ value, active = false, onPlus, onMinus, onRelease }: Props) {
  const t = useT()
  return (
    <div className={`${styles.ball} ${active ? styles.active : ''}`}>
      <button
        className={styles.btn}
        onPointerDown={(e) => {
          e.preventDefault()
          onPlus()
        }}
        onPointerUp={onRelease}
        onPointerLeave={onRelease}
        aria-label={t('ileri')}
      >
        +
      </button>
      <span className={styles.value}>{value.toFixed(1)}</span>
      <button
        className={styles.btn}
        onPointerDown={(e) => {
          e.preventDefault()
          onMinus()
        }}
        onPointerUp={onRelease}
        onPointerLeave={onRelease}
        aria-label={t('geri')}
      >
        −
      </button>
    </div>
  )
}
