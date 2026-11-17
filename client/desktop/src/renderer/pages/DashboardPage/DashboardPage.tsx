import { useNavigate } from 'react-router-dom'
import CorventaLogo from '@/components/CorventaLogo/CorventaLogo'
import { useBendingJobStore } from '@/store/bendingJobStore'
import LiveClock from './LiveClock'
import { useT } from '@/i18n'
import { Icon } from '@/components/Icon'
import styles from './DashboardPage.module.css'
import artificialIntelligenceIcon from '@/assets/images/artificial.png'
import { AUTO_BENDING_MODE, FEATURES, IS_STANDARD } from '@shared/edition'

export default function DashboardPage() {
  const navigate = useNavigate()
  const t = useT()
  const resetJob = useBendingJobStore((s) => s.resetJob)
  const setParams = useBendingJobStore((s) => s.setParams)

  // Otomatik büküm = AI (tam otomatik). Yarı oto artık Manuel altında seçiliyor.
  // STANDART SÜRÜM (2026-11-17): aynı akış 'semi' anlamında (geri esneme düzeltmesi / AI reçete yok)
  function startAiBending() {
    resetJob()
    setParams({ bendingMode: AUTO_BENDING_MODE })
    navigate('/bending/ai')
  }

  // STANDART SÜRÜM (2026-11-17): MANUEL BÜKÜM doğrudan usta kayıtlarına (Manuel / Yarı Oto seçimi yok)
  function openManual() {
    navigate(FEATURES.semiAutoSelect ? '/bending/manual-mode' : '/bending/macros')
  }

  return (
    <div className={styles.page}>

      {/* ── Left column — navigation ──────────────── */}
      <div className={styles.colLeft}>
        <button
          className={`${styles.navBtn} ${styles.navBtnPrimary}`}
          onClick={startAiBending}
        >
          <span className={styles.navBtnLabel}>{t('OTOMATİK')}<br />{t('BÜKÜM')}</span>
          {IS_STANDARD ? (
            <span className={styles.navBtnIcon}><Icon name="rotateCw" size={96} strokeWidth={1.75} /></span>
          ) : (
            <>
              <img src={artificialIntelligenceIcon} alt="Artificial Intelligence" className={styles.navBtnIcon} width={120} height={120} />
              <span className={styles.navBtnSub}>{t('YZ')}</span>
            </>
          )}
        </button>

        <button
          className={`${styles.navBtn} ${styles.navBtnSecondary}`}
          onClick={openManual}
        >
          <span className={styles.navBtnLabel}>{t('MANUEL')}<br />{t('BÜKÜM')}</span>
          {IS_STANDARD ? (
            <span className={styles.navBtnIcon}><Icon name="hand" size={96} strokeWidth={1.75} /></span>
          ) : (
            <span className={styles.navBtnSub}>{t('MANUEL / YARI OTO')}</span>
          )}
        </button>
      </div>

      {/* ── Center column — logo + clock + date ───── */}
      <div className={styles.colCenter}>
        <div className={styles.clockBox}>
          <LiveClock />
        </div>
        {/* Logo → servis ağı haritası (SEKIL-6) */}
        <button
          type="button"
          className={styles.logoWrapper}
          onClick={() => navigate('/service-network')}
          aria-label={t('Servis ağı')}
        >
          <CorventaLogo size="dashboard" />
        </button>
        <div className={styles.dateBox}>
          <LiveClock dateOnly />
        </div>
      </div>

      {/* ── Right column — settings, service ────── */}
      <div className={styles.colRight}>
        <button
          className={`${styles.iconBtn} ${styles.iconBtnTop}`}
          onClick={() => navigate('/settings')}
          aria-label={t('AYARLAR')}
        >
          <Icon name="settings" size={80} strokeWidth={1.75} className={styles.gearIcon} />
          <span className={styles.iconBtnLabel}>{t('AYARLAR')}</span>
        </button>

        <button
          className={styles.iconBtn}
          onClick={() => navigate('/service')}
          aria-label={t('SERVİS')}
        >
          <Icon name="service" size={80} strokeWidth={1.75} className={styles.serviceIcon} />
          <span className={styles.iconBtnLabel}>{t('SERVİS')}</span>
        </button>
      </div>

    </div>
  )
}
