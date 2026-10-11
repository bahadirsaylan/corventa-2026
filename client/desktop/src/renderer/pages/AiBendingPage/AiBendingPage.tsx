import { useNavigate } from 'react-router-dom'
import { useBendingJobStore } from '@/store/bendingJobStore'
import BendingProfileGrid from './BendingProfileGrid'
import ProfileInfoPanel from './ProfileInfoPanel'
import PageHeader from '@/components/PageHeader/PageHeader'
import StatusBar from '@/components/StatusBar/StatusBar'
import styles from './AiBendingPage.module.css'
import artificialIntelligenceIcon from '@/assets/images/artificial.png'

export default function AiBendingPage() {
  const navigate = useNavigate()
  const profileId = useBendingJobStore((s) => s.params.profileId)
  const bendingMode = useBendingJobStore((s) => s.params.bendingMode)
  const setParams = useBendingJobStore((s) => s.setParams)
  const resetJob = useBendingJobStore((s) => s.resetJob)

  return (
    <div className={styles.page}>

      {/* ── Header ──────────────────────────────── */}
      <PageHeader
        icon={artificialIntelligenceIcon}
        iconAlt="Artificial Intelligence"
        label="ARTIFICIAL INTELLIGENCE MODE"
      />

      {/* ── Title ───────────────────────────────── */}
      <h2 className={styles.title}>KIVIRIM PROFİLİNİ SEÇİNİZ</h2>

      {/* ── Content row ─────────────────────────── */}
      <div className={styles.content}>
        <BendingProfileGrid
          selected={profileId}
          onSelect={(id) => setParams({ profileId: id })}
        />
        <ProfileInfoPanel />
      </div>

      {/* ── Bottom status bar ───────────────────── */}
      <StatusBar
        onBack={() => {
          // Seçimleri sıfırla; yarı otodaysa Manuel/Yarı Oto seçimine, AI'daysa ana ekrana dön
          const backTo = bendingMode === 'semi' ? '/bending/manual-mode' : '/dashboard'
          resetJob()
          navigate(backTo)
        }}
        confirmDisabled={!profileId}
        onConfirm={() => navigate('/bending/ai/direction')}
      />

    </div>
  )
}
