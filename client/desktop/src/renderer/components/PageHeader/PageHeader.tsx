import { useNavigate } from 'react-router-dom'
import styles from './PageHeader.module.css'
import homeIcon from '@/assets/images/home.png'
import { useBendingJobStore } from '@/store/bendingJobStore'

interface PageHeaderProps {
  icon: string
  iconAlt: string
  label: string
}

export default function PageHeader({ icon, iconAlt, label }: PageHeaderProps) {
  const navigate = useNavigate()
  const resetJob = useBendingJobStore((s) => s.resetJob)

  return (
    <div className={styles.header}>
      <button
        className={styles.homeBtn}
        onClick={() => { resetJob(); navigate('/dashboard') }}
        aria-label="Go to dashboard"
      >
        <img src={homeIcon} alt="Home" className={styles.homeIcon} />
      </button>

      <div className={styles.headerCenter}>
        <img src={icon} alt={iconAlt} className={styles.icon} width={32} height={32} />
        <span className={styles.label}>{label}</span>
      </div>
    </div>
  )
}
