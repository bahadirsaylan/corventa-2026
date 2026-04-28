import { useBendingJobStore } from '@/store/bendingJobStore'
import BendingProfileGrid from './BendingProfileGrid'
import ProfileInfoPanel from './ProfileInfoPanel'
import PageHeader from '@/components/PageHeader/PageHeader'
import StatusBar from '@/components/StatusBar/StatusBar'
import styles from './AiBendingPage.module.css'
import artificialIntelligenceIcon from '@/assets/images/artificial.png'

export default function AiBendingPage() {
  const profileId = useBendingJobStore((s) => s.params.profileId)
  const setParams = useBendingJobStore((s) => s.setParams)

  return (
    <div className={styles.page}>

      {/* ── Header ──────────────────────────────── */}
      <PageHeader
        backTo="/dashboard"
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
        confirmDisabled={!profileId}
        onConfirm={() => {
          if (profileId) {
            /* TODO: navigate to the next bending parameter screen */
          }
        }}
      />

    </div>
  )
}
