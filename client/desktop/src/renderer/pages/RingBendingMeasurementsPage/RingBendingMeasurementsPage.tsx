import { useState } from 'react'
import { fillHiddenProfileFields, useVisibleProfileFields } from '@/constants/profileFields'
import { useNavigate } from 'react-router-dom'
import { useBendingJobStore } from '@/store/bendingJobStore'
import { useMachineStateStore } from '@/stores/machineStateStore'
import PageHeader from '@/components/PageHeader/PageHeader'
import StatusBar from '@/components/StatusBar/StatusBar'
import AiRecipePreviewModal from '@/components/AiRecipePreviewModal/AiRecipePreviewModal'
import MeasurementForm, { MeasurementValues } from './MeasurementForm'
import CapacityCheckModal from './CapacityCheckModal'
import { checkCapacity, type CapacityCheck, type CapacityIssue } from '@/constants/capacityCatalog'
import styles from './RingBendingMeasurementsPage.module.css'
import artificialIntelligenceIcon from '@/assets/images/artificial.png'
import type { SimilarBendingJobRequest } from '@shared/types'
import { applyMeasureDefaults } from '@/services/operatorPrefs'
import { useT } from '@/i18n'
import { useBendingModeLabel } from '@/hooks/useBendingModeLabel'
import { useMoldHint } from '@/components/MoldLockHint/useMoldHint'

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
  const modeLabel = useBendingModeLabel()
  // Kalıp kodu seçiliyse alt şeritte kalıp + kilit + önerilen adım (BULUT_API_V2.md §2.4)
  const moldHint = useMoldHint()
  const navigate = useNavigate()
  const ringBending = useBendingJobStore((s) => s.params.ringBending)
  const setParams = useBendingJobStore((s) => s.setParams)
  // Profil başına A/B/S alanları — görünmeyenler her zaman "0" (constants/profileFields)
  const visibleFields = useVisibleProfileFields()
  const [values, setRawValues] = useState<MeasurementValues>(() =>
    applyMeasureDefaults(fillHiddenProfileFields(fromStore(ringBending), visibleFields)),
  )
  const setValues = (v: MeasurementValues) => setRawValues(fillHiddenProfileFields(v, visibleFields))

  // AI RECIPE FAZ 4B UI (2026-09-04) — İLERİ tıklanınca AI preview modal aç
  const [aiModalRequest, setAiModalRequest] = useState<SimilarBendingJobRequest | null>(null)

  // Kapasite kataloğu kontrolü (min. çap / deformasyon / pekleşme) — İLERİ öncesi
  const profileId = useBendingJobStore((s) => s.params.profileId)
  const bendingDirection = useBendingJobStore((s) => s.params.bendingDirection)
  const [capacityCheck, setCapacityCheck] = useState<CapacityCheck | null>(null)
  // Canlı kapasite uyarısı — numpad onayında A/B/R/G değişince aynı checkCapacity çalışır (engellemez,
  // ONAYLA'daki kontrol aynen kalır). Formun altında kırmızı metin olarak gösterilir.
  const [liveCapacityIssues, setLiveCapacityIssues] = useState<CapacityIssue[]>([])

  function runCapacityCheck(v: MeasurementValues) {
    return checkCapacity({
      profileId,
      direction: bendingDirection,
      a: parseFloat(v.A),
      b: parseFloat(v.B),
      diameterMm: parseFloat(v.R),
      stepMm: parseFloat(v.G),
    })
  }

  function handleFormChange(v: MeasurementValues) {
    setValues(v)
    const keys = ['A', 'B', 'R', 'G'] as const
    if (!keys.some((k) => v[k] !== values[k])) return
    const allPresent = keys.every((k) => v[k].trim() !== '' && Number.isFinite(parseFloat(v[k])))
    setLiveCapacityIssues(allPresent ? runCapacityCheck(v).issues : [])
  }

  function handleReset() {
    setValues(applyMeasureDefaults({ ...EMPTY }))
    setParams({ ringBending: null })
    setLiveCapacityIssues([])
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
    const check = runCapacityCheck(values)
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
    // Yağ sıcaklığı sadece burada lazım — abone olmadan anlık okunur (form 10 Hz yeniden çizilmesin)
    const oilTempC = useMachineStateStore.getState().state.sensors.oilTempC
    const req: SimilarBendingJobRequest = {
      targetDiameterMm: parseFloat(values.R),
      partLengthMm: parseFloat(values.L),
      stepDistanceMm: parseFloat(values.G),
      profileA: parseFloat(values.A),
      profileB: parseFloat(values.B),
      profileS: parseFloat(values.S),
      ballDiameterMm: 220,
      oilTempC: oilTempC > 0 ? oilTempC : undefined,
    }
    setAiModalRequest(req)
  }

  return (
    <div className={styles.page}>

      {/* ── Header ──────────────────────────────── */}
      <PageHeader
        icon={artificialIntelligenceIcon}
        iconAlt="Artificial Intelligence"
        label={modeLabel}
      />

      {/* ── Title ───────────────────────────────── */}
      <h2 className={styles.title}>{t('KIVRIM ÖLÇÜLERİNİ GİRİNİZ')}</h2>

      {/* ── Content ─────────────────────────────── */}
      <div className={styles.content}>
        <MeasurementForm
          values={values}
          onChange={handleFormChange}
          onReset={handleReset}
          onConfirm={handleConfirm}
          confirmDisabled={!isComplete(values)}
          capacityIssues={liveCapacityIssues}
        />
      </div>

      {/* ── Bottom status bar ───────────────────── */}
      <StatusBar
        backTo="/bending/ai/method"
        confirmDisabled={!isComplete(values)}
        onConfirm={handleConfirm}
        hint={moldHint}
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
