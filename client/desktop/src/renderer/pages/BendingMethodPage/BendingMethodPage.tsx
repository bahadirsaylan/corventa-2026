import { useNavigate } from 'react-router-dom'
import { useBendingJobStore } from '@/store/bendingJobStore'
import { directionOptionsFor } from '@/constants/profileDirections'
import PageHeader from '@/components/PageHeader/PageHeader'
import StatusBar from '@/components/StatusBar/StatusBar'
import BendingMethodGrid from './BendingMethodGrid'
import styles from './BendingMethodPage.module.css'
import artificialIntelligenceIcon from '@/assets/images/artificial.png'
import { useT } from '@/i18n'

export default function BendingMethodPage() {
  const navigate = useNavigate()
  const t = useT()
  const bendingMethod = useBendingJobStore((s) => s.params.bendingMethod)
  const setParams = useBendingJobStore((s) => s.setParams)
  const profileId = useBendingJobStore((s) => s.params.profileId)
  // Yön seçimi olmayan profilde (boş boru) geri → profil seçimi
  const backTo = directionOptionsFor(profileId) === null ? '/bending/ai' : '/bending/ai/direction'

  return (
    <div className={styles.page}>

      {/* ── Header ──────────────────────────────── */}
      <PageHeader
        icon={artificialIntelligenceIcon}
        iconAlt="Artificial Intelligence"
        label={t('YAPAY ZEKA MODU')}
      />

      {/* ── Title ───────────────────────────────── */}
      <h2 className={styles.title}>{t('KIVIRIM METODUNU SEÇİNİZ')}</h2>

      {/* ── Content ─────────────────────────────── */}
      <div className={styles.content}>
        <BendingMethodGrid
          selected={bendingMethod}
          onSelect={(id) => setParams({ bendingMethod: id })}
        />
      </div>

      {/* ── Bottom status bar ───────────────────── */}
      <StatusBar
        backTo={backTo}
        confirmDisabled={!bendingMethod}
        onConfirm={() => {
          if (bendingMethod === 'ring') navigate('/bending/ai/measurements/ring')
          if (bendingMethod === 'arc')    navigate('/bending/ai/measurements/arc')
          if (bendingMethod === 'spiral') navigate('/bending/ai/measurements/spiral')
          if (bendingMethod === 'sivama') navigate('/bending/ai/measurements/sivama')
        }}
      />

    </div>
  )
}
