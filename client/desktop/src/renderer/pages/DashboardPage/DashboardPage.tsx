import { useNavigate } from 'react-router-dom'
import CorventaLogo from '@/components/CorventaLogo/CorventaLogo'
import LiveClock from './LiveClock'
import styles from './DashboardPage.module.css'
import artificialIntelligenceIcon from '@/assets/images/artificial.png'

export default function DashboardPage() {
  const navigate = useNavigate()

  return (
    <div className={styles.page}>

      {/* ── Left column — navigation ──────────────── */}
      <div className={styles.colLeft}>
        <button
          className={`${styles.navBtn} ${styles.navBtnPrimary}`}
          onClick={() => navigate('/bending/ai')}
        >
          <span className={styles.navBtnLabel}>ARTIFICIAL<br />INTELLIGENCE</span>
          <img src={artificialIntelligenceIcon} alt="Artificial Intelligence" className={styles.navBtnIcon} width={120} height={120} />
          <span className={styles.navBtnSub}>BENDING</span>
        </button>

        <button
          className={`${styles.navBtn} ${styles.navBtnSecondary}`}
          onClick={() => navigate('/bending/manual')}
        >
          <span className={styles.navBtnLabel}>MANUEL<br />BENDING</span>
        </button>
      </div>

      {/* ── Center column — logo + clock + date ───── */}
      <div className={styles.colCenter}>
        <div className={styles.clockBox}>
          <LiveClock />
        </div>
        <div className={styles.logoWrapper}>
          <CorventaLogo size="dashboard" />
        </div>
        <div className={styles.dateBox}>
          <LiveClock dateOnly />
        </div>
      </div>

      {/* ── Right column — settings, service ────── */}
      <div className={styles.colRight}>
        <button
          className={`${styles.iconBtn} ${styles.iconBtnTop}`}
          onClick={() => navigate('/settings')}
          aria-label="Settings"
        >
          <svg className={styles.gearIcon} viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="10" stroke="currentColor" strokeWidth="4"/>
            <path d="M32 4v8M32 52v8M4 32h8M52 32h8M11.03 11.03l5.66 5.66M47.31 47.31l5.66 5.66M52.97 11.03l-5.66 5.66M16.69 47.31l-5.66 5.66"
              stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
          </svg>
          <span className={styles.iconBtnLabel}>SETTINGS</span>
        </button>

        <button
          className={styles.iconBtn}
          onClick={() => navigate('/service')}
          aria-label="Service"
        >
          <svg className={styles.serviceIcon} viewBox="0 0 64 64" fill="none">
            <path d="M10 30C10 18.95 19.4 10 31 10s21 8.95 21 20" stroke="currentColor" strokeWidth="4" fill="none"/>
            <rect x="6" y="30" width="10" height="18" rx="4" stroke="currentColor" strokeWidth="3"/>
            <rect x="48" y="30" width="10" height="18" rx="4" stroke="currentColor" strokeWidth="3"/>
            <path d="M58 48c0 6-4 10-10 10H36" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
            <circle cx="32" cy="58" r="4" stroke="currentColor" strokeWidth="3"/>
          </svg>
          <span className={styles.iconBtnLabel}>SERVICE</span>
        </button>
      </div>

    </div>
  )
}
