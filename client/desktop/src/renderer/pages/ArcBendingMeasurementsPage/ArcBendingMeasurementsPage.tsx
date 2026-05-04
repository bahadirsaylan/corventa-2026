import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBendingJobStore } from '@/store/bendingJobStore'
import PageHeader from '@/components/PageHeader/PageHeader'
import StatusBar from '@/components/StatusBar/StatusBar'
import ArcMeasurementForm, { ArcMeasurementValues } from './ArcMeasurementForm'
import styles from './ArcBendingMeasurementsPage.module.css'
import artificialIntelligenceIcon from '@/assets/images/artificial.png'

const EMPTY: ArcMeasurementValues = { A: '', B: '', S: '', H: '', R: '', P: '', L: '', G: '' }

function isComplete(v: ArcMeasurementValues) {
  return Object.values(v).every((val) => val.trim() !== '')
}

function fromStore(
  stored: ReturnType<typeof useBendingJobStore.getState>['params']['arcBending'],
): ArcMeasurementValues {
  if (!stored) return { ...EMPTY }
  return {
    A: stored.A != null ? String(stored.A) : '',
    B: stored.B != null ? String(stored.B) : '',
    S: stored.S != null ? String(stored.S) : '',
    H: stored.H != null ? String(stored.H) : '',
    R: stored.R != null ? String(stored.R) : '',
    P: stored.P != null ? String(stored.P) : '',
    L: stored.L != null ? String(stored.L) : '',
    G: stored.G != null ? String(stored.G) : '',
  }
}

export default function ArcBendingMeasurementsPage() {
  const navigate = useNavigate()
  const arcBending = useBendingJobStore((s) => s.params.arcBending)
  const setParams  = useBendingJobStore((s) => s.setParams)
  const [values, setValues] = useState<ArcMeasurementValues>(() => fromStore(arcBending))

  function handleReset() {
    setValues({ ...EMPTY })
    setParams({ arcBending: null })
  }

  function handleConfirm() {
    setParams({
      arcBending: {
        A: parseFloat(values.A),
        B: parseFloat(values.B),
        S: parseFloat(values.S),
        H: parseFloat(values.H),
        R: parseFloat(values.R),
        P: parseFloat(values.P),
        L: parseFloat(values.L),
        G: parseFloat(values.G),
      },
    })
    navigate('/bending/ai/part-loading')
  }

  return (
    <div className={styles.page}>

      {/* ── Header ──────────────────────────────── */}
      <PageHeader
        icon={artificialIntelligenceIcon}
        iconAlt="Artificial Intelligence"
        label="ARTIFICIAL INTELLIGENCE MODE"
      />

      {/* ── Title ───────────────────────────────── */}
      <h2 className={styles.title}>KIVRIM ÖLÇÜLERİNİ GİRİNİZ</h2>

      {/* ── Content ─────────────────────────────── */}
      <div className={styles.content}>
        <ArcMeasurementForm values={values} onChange={setValues} onReset={handleReset} />
      </div>

      {/* ── Bottom status bar ───────────────────── */}
      <StatusBar
        backTo="/bending/ai/method"
        confirmDisabled={!isComplete(values)}
        onConfirm={handleConfirm}
      />

    </div>
  )
}
