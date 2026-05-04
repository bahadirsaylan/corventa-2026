import { useBendingJobStore } from '@/store/bendingJobStore'
import PageHeader from '@/components/PageHeader/PageHeader'
import StatusBar from '@/components/StatusBar/StatusBar'
import BendingDirectionGrid from './BendingDirectionGrid'
import styles from './BendingDirectionPage.module.css'
import artificialIntelligenceIcon from '@/assets/images/artificial.png'
import { useNavigate } from 'react-router-dom'

export default function BendingDirectionPage() {
  const navigate = useNavigate()
  const bendingDirection = useBendingJobStore((s) => s.params.bendingDirection)
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
      <h2 className={styles.title}>KIVIRIM YÖNÜNÜ SEÇİNİZ</h2>

      {/* ── Content ─────────────────────────────── */}
      <div className={styles.content}>
        <BendingDirectionGrid
          selected={bendingDirection}
          onSelect={(id) => setParams({ bendingDirection: id })}
        />
      </div>

      {/* ── Bottom status bar ───────────────────── */}
      <StatusBar
        backTo="/bending/ai"
        confirmDisabled={!bendingDirection}
        onConfirm={() => navigate('/bending/ai/method')}
      />

    </div>
  )
}
