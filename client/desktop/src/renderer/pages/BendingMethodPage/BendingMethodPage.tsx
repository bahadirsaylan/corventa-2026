import { useNavigate } from 'react-router-dom'
import { useBendingJobStore } from '@/store/bendingJobStore'
import PageHeader from '@/components/PageHeader/PageHeader'
import StatusBar from '@/components/StatusBar/StatusBar'
import BendingMethodGrid from './BendingMethodGrid'
import styles from './BendingMethodPage.module.css'
import artificialIntelligenceIcon from '@/assets/images/artificial.png'

export default function BendingMethodPage() {
  const navigate = useNavigate()
  const bendingMethod = useBendingJobStore((s) => s.params.bendingMethod)
  const setParams = useBendingJobStore((s) => s.setParams)

  return (
    <div className={styles.page}>

      {/* ── Header ──────────────────────────────── */}
      <PageHeader
        icon={artificialIntelligenceIcon}
        iconAlt="Artificial Intelligence"
        label="ARTIFICIAL INTELLIGENCE MODE"
      />

      {/* ── Title ───────────────────────────────── */}
      <h2 className={styles.title}>KIVIRIM METODUNU SEÇİNİZ</h2>

      {/* ── Content ─────────────────────────────── */}
      <div className={styles.content}>
        <BendingMethodGrid
          selected={bendingMethod}
          onSelect={(id) => setParams({ bendingMethod: id })}
        />
      </div>

      {/* ── Bottom status bar ───────────────────── */}
      <StatusBar
        backTo="/bending/ai/direction"
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
