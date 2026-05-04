import { useNavigate } from 'react-router-dom'
import styles from './StatusBar.module.css'
import touchIcon from '@/assets/images/touch.png'

interface StatusBarProps {
  backTo?: string
  onBack?: () => void
  onConfirm?: () => void
  confirmDisabled?: boolean
}

export default function StatusBar({ backTo, onBack, onConfirm, confirmDisabled = false }: StatusBarProps) {
  const navigate = useNavigate()

  function handleBack() {
    if (onBack) onBack()
    else if (backTo) navigate(backTo)
  }

  return (
    <div className={styles.bar}>
      <div className={styles.left}>
        <button
          className={styles.backBtn}
          onClick={handleBack}
          aria-label="Go back"
        >
          ←
        </button>
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
