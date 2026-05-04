import { useState } from 'react'
import PageHeader from '@/components/PageHeader/PageHeader'
import StatusBar from '@/components/StatusBar/StatusBar'
import styles from './PartLoadingPage.module.css'
import artificialIntelligenceIcon from '@/assets/images/artificial.png'
import readyBanner from '@/assets/images/itsready.png'
import partIllustration from '@/assets/images/blend8-tasvir.png'
import alertIcon from '@/assets/images/alert.png'
import touchIcon from '@/assets/images/touch.png'
import { useBendingJobStore, prepareBendingJobPayload } from '@/store/bendingJobStore'

export default function PartLoadingPage() {
  const [loaded, setLoaded] = useState(false)
  const setParams = useBendingJobStore((s) => s.setParams)
  const resetJob = useBendingJobStore((s) => s.resetJob)
  const params = useBendingJobStore((s) => s.params)
  const payload = prepareBendingJobPayload(params)

  return (
    <div className={styles.page}>

      {/* ── Header ──────────────────────────────── */}
      <PageHeader
        icon={artificialIntelligenceIcon}
        iconAlt="Alarm Mode"
        label="ALARM MODE"
      />

      {/* ── Ready banner ────────────────────────── */}
      <div className={styles.banner}>
        <img src={readyBanner} alt="Ready" className={styles.bannerImage} />
      </div>

      {/* ── Loaded notification (shown after confirm) */}
      {loaded && (
        <div className={styles.loadedBar}>
          PARÇA BAŞARIYLA YÜKLENDİ
        </div>
      )}

      {/* ── Content ─────────────────────────────── */}
      <div className={styles.content}>

        {loaded ? (
          /* ── Start bending button ─────────────── */
          <button
            className={styles.startBtn}
            disabled={!payload}
            onClick={() => {
              if (!payload) return
              /* TODO: call API with payload, then navigate to bending running screen */
              console.log('startBendingJob payload:', payload)
            }}
          >
            <span className={styles.startLabel}>KIVRIMI</span>
            <img src={touchIcon} alt="touch" className={styles.startIcon} />
            <span className={styles.startLabel}>BAŞLAT</span>
          </button>
        ) : (
          <>
            {/* ── Description ───────────────────── */}
            <div className={styles.description}>
              <div className={styles.descriptionText}>
                <p>MAKİNA KIVIRIM İÇİN HAZIRLANMIŞTIR. LÜTFEN KIVIRIM PARÇASINI SENSÖRÜN GÖRECEĞİ ŞEKİLDE YÜKLEYİNİZ.</p>
                <div className={styles.warningRow}>
                  <img src={alertIcon} alt="Warning" className={styles.warningIcon} />
                  <p>SENSÖR ARIZALIYSA YÜKLEMEYİ YAPTIKTAN SONRA TOUCH İLE ONAYLAMALISINİZ.</p>
                </div>
              </div>
            </div>

            {/* ── Part illustration ─────────────── */}
            <div className={styles.illustrationBox}>
              <img src={partIllustration} alt="Part loading illustration" className={styles.illustration} />
            </div>
          </>
        )}

      </div>

      {/* ── Bottom status bar ───────────────────── */}
      
        <StatusBar
          backTo="/bending/ai/measurements/ring"
          onConfirm={() => setLoaded(true)}
          confirmDisabled={loaded}
          onBack={() => {
            setLoaded(false)
            return
          }}
        />
      

    </div>
  )
}
