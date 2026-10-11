import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBendingJobStore } from '@/store/bendingJobStore'
import BendingProfileGrid from './BendingProfileGrid'
import ProfileInfoPanel from './ProfileInfoPanel'
import PipeTypeModal from './PipeTypeModal'
import { NO_DIRECTION_DEFAULT, directionOptionsFor } from '@/constants/profileDirections'
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
  const profileSubType = useBendingJobStore((s) => s.params.profileSubType)
  // Boş boru → dikişli / etli seçimi (dolu boru ve diğer profiller sormaz)
  const [pipeModalOpen, setPipeModalOpen] = useState(false)
  const needsPipeType = profileId === 'circle' && !profileSubType

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
      {profileId === 'circle' && profileSubType && (
        <p className={styles.subtitle}>{profileSubType === 'ETLI' ? 'ETLİ BORU' : 'DİKİŞLİ BORU'}</p>
      )}

      {/* ── Content row ─────────────────────────── */}
      <div className={styles.content}>
        <BendingProfileGrid
          selected={profileId}
          onSelect={(id) => {
            if (id === 'circle') setPipeModalOpen(true)
            else setParams({ profileId: id, profileSubType: null })
          }}
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
        confirmDisabled={!profileId || needsPipeType}
        onConfirm={() => {
          // Yön seçimi olmayan profil (boş boru) → yön sayfası atlanır
          if (profileId && directionOptionsFor(profileId) === null) {
            setParams({ bendingDirection: NO_DIRECTION_DEFAULT })
            navigate('/bending/ai/method')
          } else navigate('/bending/ai/direction')
        }}
      />

      {pipeModalOpen && (
        <PipeTypeModal
          selected={profileId === 'circle' ? profileSubType : null}
          onSelect={(type) => {
            setParams({ profileId: 'circle', profileSubType: type })
            setPipeModalOpen(false)
          }}
          onClose={() => setPipeModalOpen(false)}
        />
      )}
    </div>
  )
}
