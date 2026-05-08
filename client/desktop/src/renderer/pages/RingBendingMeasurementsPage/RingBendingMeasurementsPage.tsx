import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBendingJobStore } from '@/store/bendingJobStore'
import PageHeader from '@/components/PageHeader/PageHeader'
import StatusBar from '@/components/StatusBar/StatusBar'
import MeasurementForm, { MeasurementValues } from './MeasurementForm'
import styles from './RingBendingMeasurementsPage.module.css'
import artificialIntelligenceIcon from '@/assets/images/artificial.png'

const EMPTY: MeasurementValues = { A: '', B: '', S: '', R: '', H: '', G: '', L: '' }

function isComplete(v: MeasurementValues) {
  return Object.values(v).every((val) => val.trim() !== '')
}

function fromStore(stored: ReturnType<typeof useBendingJobStore.getState>['params']['ringBending']): MeasurementValues {
  if (!stored) return { ...EMPTY }
  return {
    A: stored.A != null ? String(stored.A) : '',
    B: stored.B != null ? String(stored.B) : '',
    S: stored.S != null ? String(stored.S) : '',
    R: stored.R != null ? String(stored.R) : '',
    H: stored.H != null ? String(stored.H) : '',
    G: stored.G != null ? String(stored.G) : '',
    L: stored.L != null ? String(stored.L) : '',
  }
}

export default function RingBendingMeasurementsPage() {
  const navigate = useNavigate()
  const ringBending = useBendingJobStore((s) => s.params.ringBending)
  const setParams = useBendingJobStore((s) => s.setParams)
  const [values, setValues] = useState<MeasurementValues>(() => fromStore(ringBending))

  function handleReset() {
    setValues({ ...EMPTY })
    setParams({ ringBending: null })
  }

  function handleConfirm() {
    setParams({
      ringBending: {
        A: parseFloat(values.A),
        B: parseFloat(values.B),
        S: parseFloat(values.S),
        R: parseFloat(values.R),
        H: parseFloat(values.H),
        G: parseFloat(values.G),
        L: parseFloat(values.L),
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
        <MeasurementForm values={values} onChange={setValues} onReset={handleReset} />
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
