import styles from './StatusBar.module.css'
import alertIcon from '@/assets/images/alert.png'
import wifiIcon from '@/assets/images/wifi.png'
import touchIcon from '@/assets/images/touch.png'

interface StatusBarProps {
  onConfirm?: () => void
  confirmDisabled?: boolean
}

export default function StatusBar({ onConfirm, confirmDisabled = false }: StatusBarProps) {
  return (
    <div className={styles.bar}>
      <div className={styles.left}>
        <img src={alertIcon} alt="Alert" className={styles.icon} />
        <img src={wifiIcon} alt="WiFi" className={styles.icon} />
      </div>

      <div className={styles.right}>
        <button
          className={styles.confirmBtn}
          disabled={confirmDisabled}
          onClick={onConfirm}
          aria-label="Confirm"
        >
          <img src={touchIcon} alt="Touch to confirm" className={styles.touchIcon} />
        </button>
      </div>
    </div>
  )
}
