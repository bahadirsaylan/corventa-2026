import { useNavigate } from 'react-router-dom'
import styles from './PageHeader.module.css'
import homeIcon from '@/assets/images/home.png'
import { useBendingJobStore } from '@/store/bendingJobStore'
import artificialIntelligenceIcon from '@/assets/images/artificial.png'
import { Icon } from '@/components/Icon'
import { IS_STANDARD } from '@shared/edition'

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
        {/* STANDART SÜRÜM (2026-11-17): AI görseli yerine nötr "otomatik" ikonu — sayfalar aynı prop'u vermeye devam eder */}
        {IS_STANDARD && icon === artificialIntelligenceIcon ? (
          <Icon name="rotateCw" size={32} className={styles.icon} />
        ) : (
          <img src={icon} alt={iconAlt} className={styles.icon} width={32} height={32} />
        )}
        <span className={styles.label}>{label}</span>
      </div>
    </div>
  )
}
