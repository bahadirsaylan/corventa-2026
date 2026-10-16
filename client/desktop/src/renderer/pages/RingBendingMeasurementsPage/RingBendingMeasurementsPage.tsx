import { useState } from 'react'
import { fillHiddenProfileFields, useVisibleProfileFields } from '@/constants/profileFields'
import { useNavigate } from 'react-router-dom'
import { useBendingJobStore } from '@/store/bendingJobStore'
import { useSensors } from '@/hooks/useMachineState'
import PageHeader from '@/components/PageHeader/PageHeader'
import StatusBar from '@/components/StatusBar/StatusBar'
import AiRecipePreviewModal from '@/components/AiRecipePreviewModal/AiRecipePreviewModal'
import MeasurementForm, { MeasurementValues } from './MeasurementForm'
import CapacityCheckModal from './CapacityCheckModal'
import { checkCapacity, type CapacityCheck } from '@/constants/capacityCatalog'
import styles from './RingBendingMeasurementsPage.module.css'
import artificialIntelligenceIcon from '@/assets/images/artificial.png'
import type { SimilarBendingJobRequest } from '@shared/types'
import { useT } from '@/i18n'

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
  const t = useT()
  const navigate = useNavigate()
  const ringBending = useBendingJobStore((s) => s.params.ringBending)
  const setParams = useBendingJobStore((s) => s.setParams)
  // Profil başına A/B/S alanları — görünmeyenler her zaman "0" (constants/profileFields)
  const visibleFields = useVisibleProfileFields()
  const [values, setRawValues] = useState<MeasurementValues>(() => fillHiddenProfileFields(fromStore(ringBending), visibleFields))
  const setValues = (v: MeasurementValues) => setRawValues(fillHiddenProfileFields(v, visibleFields))

  // AI RECIPE FAZ 4B UI (2026-09-04) — İLERİ tıklanınca AI preview modal aç
  const sensors = useSensors()
  const [aiModalRequest, setAiModalRequest] = useState<SimilarBendingJobRequest | null>(null)

  // Kapasite kataloğu kontrolü (min. çap / deformasyon / pekleşme) — İLERİ öncesi
  const profileId = useBendingJobStore((s) => s.params.profileId)
  const bendingDirection = useBendingJobStore((s) => s.params.bendingDirection)
  const [capacityCheck, setCapacityCheck] = useState<CapacityCheck | null>(null)

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
    navigate('/bending/ai/roll-arrangement') // önce vals topu dizilimi onayı
  }

  const bendingMode = useBendingJobStore((s) => s.params.bendingMode)

  function handleConfirm() {
    const check = checkCapacity({
      profileId,
      direction: bendingDirection,
      a: parseFloat(values.A),
      b: parseFloat(values.B),
      diameterMm: parseFloat(values.R),
      stepMm: parseFloat(values.G),
    })
    if (check.issues.length > 0) {
      setCapacityCheck(check)
      return
    }
    proceed()
  }

  function proceed() {
    // Yari oto mod'da AI recipe uygulanmiyor (skipAutoCorrect=true → AutoCorrect
    // adimi atlanir, recipe fetch bloku da orada). Preview modal bilgi amaciyla
    // acilirdi ama gereksiz — direkt PartLoading'e gec.
    if (bendingMode === 'semi') {
      persistAndNavigate()
      return
    }

    // AI mod: parametreler tamsa AI eşleşme modalını aç.
    const req: SimilarBendingJobRequest = {
      targetDiameterMm: parseFloat(values.R),
      partLengthMm: parseFloat(values.L),
      stepDistanceMm: parseFloat(values.G),
      profileA: parseFloat(values.A),
      profileB: parseFloat(values.B),
      profileS: parseFloat(values.S),
      ballDiameterMm: 220,
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
      <h2 className={styles.title}>{t('KIVRIM ÖLÇÜLERİNİ GİRİNİZ')}</h2>

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

      {capacityCheck && (
        <CapacityCheckModal
          check={capacityCheck}
          onFix={() => setCapacityCheck(null)}
          onProceed={() => {
            setCapacityCheck(null)
            proceed()
          }}
        />
      )}

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
