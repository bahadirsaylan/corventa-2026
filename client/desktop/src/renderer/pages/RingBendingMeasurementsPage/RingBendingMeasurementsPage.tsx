import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBendingJobStore } from '@/store/bendingJobStore'
import { useSensors } from '@/hooks/useMachineState'
import PageHeader from '@/components/PageHeader/PageHeader'
import StatusBar from '@/components/StatusBar/StatusBar'
import AiRecipePreviewModal from '@/components/AiRecipePreviewModal/AiRecipePreviewModal'
import MeasurementForm, { MeasurementValues } from './MeasurementForm'
import styles from './RingBendingMeasurementsPage.module.css'
import artificialIntelligenceIcon from '@/assets/images/artificial.png'
import type { SimilarBendingJobRequest } from '@shared/types'

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

  // AI RECIPE FAZ 4B UI (2026-09-04) — İLERİ tıklanınca AI preview modal aç
  const sensors = useSensors()
  const [aiModalRequest, setAiModalRequest] = useState<SimilarBendingJobRequest | null>(null)

  function handleReset() {
    setValues({ ...EMPTY })
    setParams({ ringBending: null })
  }

  function persistAndNavigate() {
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

  function handleConfirm() {
    // Parametreler tamsa AI eşleşme modalını aç. Modal fetch fail olsa bile
    // "KAPAT" veya "BÜKÜMÜ BAŞLAT" ile devam eder — büküm akışını bloklamaz.
    const req: SimilarBendingJobRequest = {
      targetDiameterMm: parseFloat(values.R),
      partLengthMm: parseFloat(values.L),
      stepDistanceMm: parseFloat(values.G),
      profileA: parseFloat(values.A),
      profileB: parseFloat(values.B),
      profileS: parseFloat(values.S),
      ballDiameterMm: 220, // Backend default; ilerideki setting UI ile override edilebilir
      // Yağ sıcaklığı: SignalR /machineHub'dan canlı — 0 ise API'ye gönderme (yağ filtresi atlansın)
      oilTempC: sensors.oilTempC > 0 ? sensors.oilTempC : undefined,
    }
    setAiModalRequest(req)
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

      {/* AI RECIPE FAZ 4B UI — parametre onayı sonrası eşleşme preview modali */}
      {aiModalRequest && (
        <AiRecipePreviewModal
          request={aiModalRequest}
          onProceed={() => {
            setAiModalRequest(null)
            persistAndNavigate()
          }}
          onClose={() => setAiModalRequest(null)}
        />
      )}

    </div>
  )
}
