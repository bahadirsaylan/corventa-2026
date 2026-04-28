import { useNavigate } from 'react-router-dom'
import styles from './PageHeader.module.css'

interface PageHeaderProps {
  backTo: string
  icon: string
  iconAlt: string
  label: string
}

export default function PageHeader({ backTo, icon, iconAlt, label }: PageHeaderProps) {
  const navigate = useNavigate()

  return (
    <div className={styles.header}>
      <button
        className={styles.backBtn}
        onClick={() => navigate(backTo)}
        aria-label="Go back"
      >
        ←
      </button>

      <div className={styles.headerCenter}>
        <img src={icon} alt={iconAlt} className={styles.icon} width={32} height={32} />
        <span className={styles.label}>{label}</span>
      </div>
    </div>
  )
}
