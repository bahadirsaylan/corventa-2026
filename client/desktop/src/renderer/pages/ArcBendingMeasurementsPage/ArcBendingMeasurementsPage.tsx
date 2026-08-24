import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBendingJobStore, type ArcSegmentParams } from '@/store/bendingJobStore'
import PageHeader from '@/components/PageHeader/PageHeader'
import StatusBar from '@/components/StatusBar/StatusBar'
import ArcMeasurementForm, {
  ArcInputMode,
  ArcMeasurementValues,
  ArcSegmentValues,
  DEFAULT_MEASUREMENT_DISTANCE_MM,
  DEFAULT_XA1_ABS_MM,
  computeAllFeasibilities,
  makeEmptySegment,
} from './ArcMeasurementForm'
import styles from './ArcBendingMeasurementsPage.module.css'
import artificialIntelligenceIcon from '@/assets/images/artificial.png'

const EMPTY: ArcMeasurementValues = {
  A: '', B: '', S: '', H: '', P: '', G: '', LT: '',
  segments: [],
}

// isComplete: ana bilgiler + P adet segment tam olarak dolmalı VE hiçbir segment
// imkânsız olmamalı (T + XA1 kuralları — feasibility).
// Mode'a göre segment gereklilik: angle → Alpha zorunlu, arcLen → ArcLen zorunlu (form sync effect
// diğerini R + kaynak'tan doldurur, yani genelde ikisi de dolu olur ama zorunluluk sadece kaynağa).
function isComplete(v: ArcMeasurementValues, mode: ArcInputMode): boolean {
  const mainRequired: Array<keyof Omit<ArcMeasurementValues, 'segments'>> = [
    'A', 'B', 'S', 'H', 'P', 'G', 'LT',
  ]
  if (!mainRequired.every((k) => v[k].trim() !== '')) return false
  const p = parseInt(v.P, 10)
  if (!Number.isFinite(p) || p <= 0) return false
  if (v.segments.length !== p) return false
  const segRequired: ArcSegmentValues =
    mode === 'angle'
      ? { R: 'x', Alpha: 'x', ArcLen: '', L: 'x' }
      : { R: 'x', Alpha: '', ArcLen: 'x', L: 'x' }
  const allFieldsFilled = v.segments.every((seg) =>
    (Object.keys(segRequired) as Array<keyof ArcSegmentValues>).every(
      (k) => segRequired[k] === '' || seg[k].trim() !== '',
    ),
  )
  if (!allFieldsFilled) return false

  //   Feasibility kontrolü — herhangi bir segment imkânsızsa (T/XA1 kuralı ihlal)
  //   submit disable. Backend zaten DataApi validation'da reject eder, UI erken uyarı.
  const ltMm = parseFloat(v.LT) || 0
  const feasibilities = computeAllFeasibilities(
    v.segments, p, ltMm, 100 /*safety*/,
    DEFAULT_MEASUREMENT_DISTANCE_MM, DEFAULT_XA1_ABS_MM,
  )
  return feasibilities.every((f) => f.feasible)
}

function segmentToStore(seg: ArcSegmentValues): ArcSegmentParams {
  return {
    R: seg.R !== '' ? parseFloat(seg.R) : null,
    Alpha: seg.Alpha !== '' ? parseFloat(seg.Alpha) : null,
    L: seg.L !== '' ? parseFloat(seg.L) : null,
  }
}

function segmentFromStore(seg: ArcSegmentParams): ArcSegmentValues {
  return {
    R: seg.R != null ? String(seg.R) : '',
    Alpha: seg.Alpha != null ? String(seg.Alpha) : '',
    // ArcLen store'da tutulmuyor — form sync effect hesaplar
    ArcLen: '',
    L: seg.L != null ? String(seg.L) : '',
  }
}

function fromStore(
  stored: ReturnType<typeof useBendingJobStore.getState>['params']['arcBending'],
): ArcMeasurementValues {
  if (!stored) return { ...EMPTY, segments: [] }
  return {
    A: stored.A != null ? String(stored.A) : '',
    B: stored.B != null ? String(stored.B) : '',
    S: stored.S != null ? String(stored.S) : '',
    H: stored.H != null ? String(stored.H) : '',
    P: stored.P != null ? String(stored.P) : '',
    G: stored.G != null ? String(stored.G) : '',
    LT: stored.LTotal != null ? String(stored.LTotal) : '',
    segments: (stored.segments ?? []).map(segmentFromStore),
  }
}

export default function ArcBendingMeasurementsPage() {
  const navigate = useNavigate()
  const arcBending = useBendingJobStore((s) => s.params.arcBending)
  const setParams = useBendingJobStore((s) => s.setParams)
  const [values, setValues] = useState<ArcMeasurementValues>(() => fromStore(arcBending))
  const [inputMode, setInputMode] = useState<ArcInputMode>('angle')

  function handleReset() {
    setValues({ ...EMPTY, segments: [] })
    setParams({ arcBending: null })
  }

  function handleConfirm() {
    // Backend her durumda α bekler. ArcLen mode'da form sync effect Alpha alanını doldurmuş olur.
    const p = parseInt(values.P, 10)
    // Segments dizisi P kadar olmalı; form useEffect zaten senkronize etti ama defensive:
    const normalizedSegments =
      values.segments.length === p
        ? values.segments
        : Array.from({ length: p }, (_, i) => values.segments[i] ?? makeEmptySegment())

    setParams({
      arcBending: {
        A: parseFloat(values.A),
        B: parseFloat(values.B),
        S: parseFloat(values.S),
        H: parseFloat(values.H),
        P: p,
        G: parseFloat(values.G),
        LTotal: parseFloat(values.LT),
        segments: normalizedSegments.map(segmentToStore),
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
