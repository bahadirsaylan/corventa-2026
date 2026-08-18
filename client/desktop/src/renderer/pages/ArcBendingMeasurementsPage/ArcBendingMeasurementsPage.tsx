import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBendingJobStore } from '@/store/bendingJobStore'
import PageHeader from '@/components/PageHeader/PageHeader'
import StatusBar from '@/components/StatusBar/StatusBar'
import ArcMeasurementForm, { ArcInputMode, ArcMeasurementValues } from './ArcMeasurementForm'
import styles from './ArcBendingMeasurementsPage.module.css'
import artificialIntelligenceIcon from '@/assets/images/artificial.png'

const EMPTY: ArcMeasurementValues = {
  A: '', B: '', S: '', H: '', R: '', Alpha: '', ArcLen: '', P: '', L: '', G: '', LT: '',
}

// isComplete: mode'a göre farklı — angle mode Alpha zorunlu, arcLen mode ArcLen zorunlu.
// Diğer field'lar hep zorunlu. ArcLen mode'da Alpha auto-hesaplandığı için o da dolu olur.
function isComplete(v: ArcMeasurementValues, mode: ArcInputMode) {
  const required: Array<keyof ArcMeasurementValues> =
    mode === 'angle'
      ? ['A', 'B', 'S', 'H', 'R', 'Alpha', 'P', 'L', 'G', 'LT']
      : ['A', 'B', 'S', 'H', 'R', 'ArcLen', 'P', 'L', 'G', 'LT']
  return required.every((k) => v[k].trim() !== '')
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
    Alpha: stored.Alpha != null ? String(stored.Alpha) : '',
    // ArcLen store'da tutulmuyor — sync effect anında hesaplayacak (R + Alpha varsa)
    ArcLen: '',
    P: stored.P != null ? String(stored.P) : '',
    L: stored.L != null ? String(stored.L) : '',
    G: stored.G != null ? String(stored.G) : '',
    LT: stored.LTotal != null ? String(stored.LTotal) : '',
  }
}

export default function ArcBendingMeasurementsPage() {
  const navigate = useNavigate()
  const arcBending = useBendingJobStore((s) => s.params.arcBending)
  const setParams  = useBendingJobStore((s) => s.setParams)
  const [values, setValues] = useState<ArcMeasurementValues>(() => fromStore(arcBending))
  const [inputMode, setInputMode] = useState<ArcInputMode>('angle')

  function handleReset() {
    setValues({ ...EMPTY })
    setParams({ arcBending: null })
  }

  function handleConfirm() {
    // Backend her durumda α bekler. ArcLen mode'da sync effect Alpha alanını doldurmuş olur.
    setParams({
      arcBending: {
        A: parseFloat(values.A),
        B: parseFloat(values.B),
        S: parseFloat(values.S),
        H: parseFloat(values.H),
        R: parseFloat(values.R),
        Alpha: parseFloat(values.Alpha),
        P: parseFloat(values.P),
        L: parseFloat(values.L),
        G: parseFloat(values.G),
        LTotal: parseFloat(values.LT),
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
        <ArcMeasurementForm
          values={values}
          onChange={setValues}
          onReset={handleReset}
          inputMode={inputMode}
          onInputModeChange={setInputMode}
        />
      </div>

      {/* ── Bottom status bar ───────────────────── */}
      <StatusBar
        backTo="/bending/ai/method"
        confirmDisabled={!isComplete(values, inputMode)}
        onConfirm={handleConfirm}
      />

    </div>
  )
}
