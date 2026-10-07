// SEKIL-22 alt: Uyarı + sinyal + Geometrik çap + Touch icon

import styles from './ManuelFooter.module.css'
import alertIcon from '@/assets/images/alert.png'
import touchIcon from '@/assets/images/touch.png'

interface Props {
  selectedDiameter: number | null
  /** Diameter kutusu üzerindeki başlık */
  diameterLabel?: string
  onTouchConfirm?: () => void
}

export default function ManuelFooter({
  selectedDiameter,
  diameterLabel = 'SEÇİLİ PROGRAMIN\nGEOMETRİSEL ÇAPI',
  onTouchConfirm,
}: Props) {
  return (
    <div className={styles.footer}>
      <div className={styles.left}>
        <img src={alertIcon} alt="Uyarı" className={styles.alertIcon} />
        <SignalIcon />
      </div>

      <div className={styles.diameterBox}>
        <span className={styles.diameterLabel}>
          {diameterLabel.split('\n').map((line, i) => (
            <span key={i}>{line}</span>
          ))}
        </span>
        <span className={styles.diameterValue}>
          {selectedDiameter && selectedDiameter > 0 ? `Ø ${selectedDiameter}` : '—'}
        </span>
      </div>

      <button className={styles.touchBtn} onClick={onTouchConfirm} disabled={!onTouchConfirm}>
        <img src={touchIcon} alt="Touch" className={styles.touchIcon} />
      </button>
    </div>
  )
}

function SignalIcon() {
  return (
    <svg viewBox="0 0 24 24" className="signal" fill="none" width={48} height={48}>
      <circle cx="12" cy="20" r="2" fill="currentColor" />
      <path
        d="M5 14a10 10 0 0114 0M2 11a14 14 0 0120 0"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}
