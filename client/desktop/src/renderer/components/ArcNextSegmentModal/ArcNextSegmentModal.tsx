// Arc interactive flow — Bending API her segment sonu sıradaki segment için
// BendingProgress.awaitingArcSegmentInput=true gönderir. Bu modal otomatik açılır,
// operatörden R/α/L alır, POST /api/bending-jobs/{id}/segments ile DataApi'ye gönderir.
// Backend coordinator wait'i resolve eder → pipeline devam → modal kapanır.

import { useEffect, useState } from 'react'

import NumpadModal from '@/components/NumpadModal/NumpadModal'
import { useMachineStateStore } from '@/stores/machineStateStore'
import type { BendingJob } from '@shared/types'
import styles from './ArcNextSegmentModal.module.css'

type FieldKey = 'R' | 'Alpha' | 'L'

interface FieldState {
  R: string
  Alpha: string
  L: string
}

const EMPTY: FieldState = { R: '', Alpha: '', L: '' }

const FIELD_INFO: Record<FieldKey, { label: string; placeholder: string; hint: string }> = {
  R: { label: 'R (mm)', placeholder: 'Yarıçap', hint: 'KIVIRIM YARIÇAPI (> 0)' },
  Alpha: { label: 'α (°)', placeholder: 'Açı', hint: '0 < α < 180' },
  L: { label: 'L (mm)', placeholder: 'Düzlük', hint: 'BİTİŞTEN SONRAKİ DÜZLÜK (≥ 0)' },
}

function isFieldsValid(v: FieldState): boolean {
  const r = parseFloat(v.R)
  const a = parseFloat(v.Alpha)
  const l = parseFloat(v.L)
  if (!Number.isFinite(r) || r <= 0) return false
  if (!Number.isFinite(a) || a <= 0 || a >= 180) return false
  if (!Number.isFinite(l) || l < 0) return false
  return true
}

// ArcBendingCalculator ile birebir aynı formül — server-side parity.
function computeArcLength(radiusMm: number, angleDeg: number): number {
  return (2 * Math.PI * radiusMm * (180 - angleDeg)) / 360
}

interface LengthBudget {
  used: number    // Σ önceki yay + Σ önceki düzlük
  available: number // partLength - 2*safetyMargin - zeroReset
  remaining: number // available - used
}

function computeBudget(job: BendingJob | null): LengthBudget | null {
  if (!job) return null
  const usedArc = (job.segments ?? []).reduce(
    (acc, s) => acc + computeArcLength(s.radiusMm, s.angleDeg),
    0,
  )
  const usedStraight = (job.segments ?? []).reduce((acc, s) => acc + s.straightAfterMm, 0)
  const used = usedArc + usedStraight
  const available =
    (job.partLengthMm ?? 0) - 2 * (job.safetyMarginMm ?? 0) - (job.zeroResetDistanceMm ?? 0)
  return { used, available, remaining: Math.max(0, available - used) }
}

export default function ArcNextSegmentModal() {
  const progress = useMachineStateStore((s) => s.bendingProgress)

  const [values, setValues] = useState<FieldState>(EMPTY)
  const [numpadField, setNumpadField] = useState<FieldKey | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [job, setJob] = useState<BendingJob | null>(null)

  const isOpen = !!progress?.awaitingArcSegmentInput
  const nextOrder = progress?.completedSegmentOrder
    ? progress.completedSegmentOrder + 1
    : null
  const total = progress?.totalSegmentCount ?? null

  // Modal açıldığında active job'u çek (kümülatif hesap için)
  useEffect(() => {
    if (!isOpen || !progress) {
      setJob(null)
      return
    }
    let cancelled = false
    void window.corventa.bending
      .getJob(progress.jobId)
      .then((j) => {
        if (!cancelled) setJob(j)
      })
      .catch(() => {
        // Job fetch fail — budget gösterimi olmadan devam, server-side kontrol yine yapacak
      })
    return () => {
      cancelled = true
    }
  }, [isOpen, progress?.jobId])

  // Modal kapandıkça (awaitingArcSegmentInput false olunca) state'i sıfırla.
  useEffect(() => {
    if (!isOpen) {
      setValues(EMPTY)
      setNumpadField(null)
      setSubmitting(false)
      setErrorMsg(null)
    }
  }, [isOpen])

  if (!isOpen || !progress) return null

  const budget = computeBudget(job)

  // Bu segmentin yay+düzlüğü (anlık girilen değerlere göre)
  const r = parseFloat(values.R)
  const a = parseFloat(values.Alpha)
  const l = parseFloat(values.L)
  const newArc =
    Number.isFinite(r) && r > 0 && Number.isFinite(a) && a > 0 && a < 180
      ? computeArcLength(r, a)
      : 0
  const newStraight = Number.isFinite(l) && l >= 0 ? l : 0
  const newTotal = newArc + newStraight
  const wouldExceed = budget != null && newTotal > budget.remaining + 0.01
  const fieldsValid = isFieldsValid(values)
  const canSubmit = fieldsValid && !submitting && !wouldExceed

  async function handleSubmit() {
    if (!progress || !nextOrder || !canSubmit) return
    setSubmitting(true)
    setErrorMsg(null)
    try {
      await window.corventa.bending.addArcSegment(progress.jobId, {
        segmentOrder: nextOrder,
        radiusMm: parseFloat(values.R),
        angleDeg: parseFloat(values.Alpha),
        straightAfterMm: parseFloat(values.L),
      })
      // Backend BendingProgressService.awaitingArcSegmentInput = false yapacak,
      // bir sonraki SignalR push ile modal kapanır.
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(`Segment reddedildi: ${msg}`)
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <h2 className={styles.title}>
            {nextOrder && total
              ? `${nextOrder}. SEGMENT — ${nextOrder}/${total}`
              : 'SIRADAKİ SEGMENT'}
          </h2>
          <p className={styles.subtitle}>R, α ve L değerlerini girin</p>

          {budget && (
            <div className={styles.budget}>
              <div className={styles.budgetRow}>
                <span>Kullanılabilir parça:</span>
                <strong>{budget.available.toFixed(1)} mm</strong>
              </div>
              <div className={styles.budgetRow}>
                <span>Önceki segment(ler):</span>
                <strong>{budget.used.toFixed(1)} mm</strong>
              </div>
              <div className={styles.budgetRow}>
                <span>Bu segment (yay {newArc.toFixed(1)} + düz {newStraight.toFixed(1)}):</span>
                <strong>{newTotal.toFixed(1)} mm</strong>
              </div>
              <div
                className={
                  wouldExceed
                    ? `${styles.budgetRow} ${styles.budgetExceeded}`
                    : `${styles.budgetRow} ${styles.budgetRemaining}`
                }
              >
                <span>Kalan (bu segment dahil):</span>
                <strong>{(budget.remaining - newTotal).toFixed(1)} mm</strong>
              </div>
              {wouldExceed && (
                <div className={styles.budgetWarning}>
                  ⚠ Parça boyu yetersiz — R, α veya L değerini küçültün
                </div>
              )}
            </div>
          )}

          <div className={styles.fields}>
            {(Object.keys(FIELD_INFO) as FieldKey[]).map((field) => {
              const info = FIELD_INFO[field]
              const value = values[field]
              return (
                <div key={field} className={styles.row}>
                  <span className={styles.label}>{info.label}</span>
                  <button
                    type="button"
                    className={`${styles.input} ${value ? styles.inputFilled : ''}`}
                    onClick={() => setNumpadField(field)}
                    disabled={submitting}
                  >
                    {value || <span className={styles.placeholder}>{info.placeholder}</span>}
                  </button>
                  <span className={styles.hint}>{info.hint}</span>
                </div>
              )
            })}
          </div>

          {errorMsg && <div className={styles.error}>{errorMsg}</div>}

          <button
            type="button"
            className={styles.submit}
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {submitting ? 'Gönderiliyor...' : 'ONAYLA VE DEVAM'}
          </button>
        </div>
      </div>

      {numpadField && (
        <NumpadModal
          fieldLabel={FIELD_INFO[numpadField].label}
          initialValue={values[numpadField]}
          onConfirm={(v) => setValues((prev) => ({ ...prev, [numpadField]: v }))}
          onClose={() => setNumpadField(null)}
        />
      )}
    </>
  )
}
