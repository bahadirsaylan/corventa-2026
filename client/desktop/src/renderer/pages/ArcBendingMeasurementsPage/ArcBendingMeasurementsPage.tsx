import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBendingJobStore, type ArcSegmentParams } from '@/store/bendingJobStore'
import PageHeader from '@/components/PageHeader/PageHeader'
import StatusBar from '@/components/StatusBar/StatusBar'
import ArcMeasurementForm, {
  ArcFormStage,
  ArcInputMode,
  ArcMeasurementValues,
  ArcSegmentValues,
  MIN_ARC_LENGTH_MM,
  mainFieldsValid,
} from './ArcMeasurementForm'
import ArcPlanConfirmModal from './ArcPlanConfirmModal'
import styles from './ArcBendingMeasurementsPage.module.css'
import artificialIntelligenceIcon from '@/assets/images/artificial.png'
import type { ValidateArcPlanResponse, ValidateArcPlanSegment } from '@shared/types'

const EMPTY: ArcMeasurementValues = {
  A: '', B: '', S: '', H: '', P: '', G: '', LT: '',
  segments: [],
}

// 2026-09-08 refactor:
//   Aşama 2'de ONAYLA basılınca backend'in ArcExtensionPlanner'ına gönderilir. Backend
//   bükülebilirlik + ölçülebilirlik kontrolü + gerekiyorsa parça uzatma + sıralama
//   tersine çevirme kararı döner. Uzatma varsa modal ile onay istenir; onaydan sonra
//   segments/LT store'da ayarlanıp part-loading'e geçilir.
//   isComplete artık SADECE ana alanların dolu, segment alanlarının dolu, budget aşımı
//   yok ve min-yay ihlali yok kontrolü yapar. Bükülebilirlik/ölçülebilirlik backend'de.
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

  // Budget overflow — segmentlerin toplam RAW mesafesi LT'yi aşmamalı.
  const ltMm = parseFloat(v.LT) || 0
  let cumulativeRaw = 0
  for (const seg of v.segments) {
    const R = parseFloat(seg.R)
    const alpha = parseFloat(seg.Alpha)
    const L = parseFloat(seg.L)
    if (!(R > 0 && alpha > 0 && alpha < 180)) return false
    const arc = (2 * Math.PI * R * (180 - alpha)) / 360
    if (arc < MIN_ARC_LENGTH_MM) return false
    cumulativeRaw += arc + (Number.isFinite(L) ? L : 0)
  }
  if (cumulativeRaw > ltMm) return false

  return true
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
  const [stage, setStage] = useState<ArcFormStage>('main')

  // ONAYLA akışı state'i.
  const [validating, setValidating] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [planResult, setPlanResult] = useState<ValidateArcPlanResponse | null>(null)

  function handleReset() {
    setValues({ ...EMPTY, segments: [] })
    setParams({ arcBending: null })
    setStage('main')
    setValidationError(null)
    setPlanResult(null)
  }

  // Segmentleri backend planner formatına çevir (α her durumda dolu — form sync effect halleder).
  function segmentsToPlannerRequest(): ValidateArcPlanSegment[] {
    return values.segments.map((seg, i) => ({
      segmentOrder: i + 1,
      radiusMm: parseFloat(seg.R),
      angleDeg: parseFloat(seg.Alpha),
      straightAfterMm: parseFloat(seg.L),
    }))
  }

  async function handleConfirmClick() {
    setValidating(true)
    setValidationError(null)
    setPlanResult(null)
    try {
      const req = {
        partLengthMm: parseFloat(values.LT),
        xa1AbsMm: 0, // Backend default (Stage 2 = 465). Gelecekte stage'e göre doldurulabilir.
        segments: segmentsToPlannerRequest(),
      }
      const res = await window.corventa.bending.validateArcPlan(req)
      if (!res || res.success === false) {
        setValidationError(res?.error || 'Backend hesaplama başarısız')
        setValidating(false)
        return
      }
      setPlanResult(res)
      setValidating(false)
      // Uzatma YOK ve ters YOK ise direkt devam et — modal göstermeye gerek yok.
      if ((res.extensionMm ?? 0) === 0 && !res.isReversed) {
        finalizePlanAndNavigate(res)
      }
    } catch (err: unknown) {
      setValidationError(err instanceof Error ? err.message : String(err))
      setValidating(false)
    }
  }

  function finalizePlanAndNavigate(res: ValidateArcPlanResponse) {
    const p = parseInt(values.P, 10)

    // Ayarlanmış segmentler backend'den geldiyse onları kullan, yoksa mevcut.
    const adjSegs = res.adjustedSegments && res.adjustedSegments.length === p
      ? res.adjustedSegments.map<ArcSegmentParams>((s) => ({
          R: s.radiusMm,
          Alpha: s.angleDeg,
          L: s.straightAfterMm,
        }))
      : values.segments.slice(0, p).map(segmentToStore)

    const finalLT = res.adjustedPartLengthMm && res.adjustedPartLengthMm > 0
      ? res.adjustedPartLengthMm
      : parseFloat(values.LT)

    setParams({
      arcBending: {
        A: parseFloat(values.A),
        B: parseFloat(values.B),
        S: parseFloat(values.S),
        H: parseFloat(values.H),
        P: p,
        G: parseFloat(values.G),
        LTotal: finalLT,
        segments: adjSegs.length === p
          ? adjSegs
          : Array.from({ length: p }, (_, i) => adjSegs[i] ?? {
              R: null, Alpha: null, L: null,
            } as ArcSegmentParams),
        isReversedOrder: res.isReversed ?? false,
      },
    })
    navigate('/bending/ai/part-loading')
  }

  return (
    <div className={styles.page}>
      <PageHeader
        icon={artificialIntelligenceIcon}
        iconAlt="Artificial Intelligence"
        label="ARTIFICIAL INTELLIGENCE MODE"
      />
      <h2 className={styles.title}>KIVRIM ÖLÇÜLERİNİ GİRİNİZ</h2>

      <div className={styles.content}>
        <ArcMeasurementForm
          values={values}
          onChange={setValues}
          onReset={handleReset}
          inputMode={inputMode}
          onInputModeChange={setInputMode}
          stage={stage}
        />
      </div>

      {stage === 'main' ? (
        <StatusBar
          backTo="/bending/ai/method"
          confirmDisabled={!mainFieldsValid(values)}
          onConfirm={() => setStage('segments')}
        />
      ) : (
        <StatusBar
          onBack={() => setStage('main')}
          confirmDisabled={!isComplete(values, inputMode) || validating}
          onConfirm={handleConfirmClick}
        />
      )}

      {/* Loading overlay (validate-plan sırasında) */}
      {validating && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingBox}>
            <div className={styles.spinner} />
            <div>KIVRIM PLANI HESAPLANIYOR...</div>
          </div>
        </div>
      )}

      {/* Hata modalı */}
      {validationError && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingBox}>
            <div className={styles.errorHead}>⚠ HESAPLAMA HATASI</div>
            <div className={styles.errorBody}>{validationError}</div>
            <button className={styles.errorBtn} onClick={() => setValidationError(null)}>
              TAMAM
            </button>
          </div>
        </div>
      )}

      {/* Plan sonuç modalı — sadece extension veya reversal varsa */}
      {planResult && ((planResult.extensionMm ?? 0) > 0 || planResult.isReversed) && (
        <ArcPlanConfirmModal
          plan={planResult}
          onCancel={() => setPlanResult(null)}
          onAccept={() => {
            const p = planResult
            setPlanResult(null)
            finalizePlanAndNavigate(p)
          }}
        />
      )}
    </div>
  )
}
