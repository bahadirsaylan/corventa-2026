// Arc interactive flow — Bending API her segment sonu sıradaki segment için
// BendingProgress.awaitingArcSegmentInput=true gönderir. Bu modal otomatik açılır,
// operatörden R/α veya R/L_yay alır, POST /api/bending-jobs/{id}/segments ile
// DataApi'ye gönderir. Backend coordinator wait'i resolve eder → pipeline devam → modal kapanır.
//
// 2026-08-18: 2 input modu (angle / arcLen), yeni bütçe formülü (safety kırpma yok,
// seg1 min-safety, son seg yay -safety). Backend ile birebir hizalı.

import { useEffect, useState } from 'react'

import NumpadModal from '@/components/NumpadModal/NumpadModal'
import { useMachineStateStore } from '@/stores/machineStateStore'
import type { BendingJob } from '@shared/types'
import styles from './ArcNextSegmentModal.module.css'

type InputMode = 'angle' | 'arcLen'
type FieldKey = 'R' | 'Alpha' | 'ArcLen' | 'L'

interface FieldState {
  R: string
  Alpha: string
  ArcLen: string
  L: string
}

const EMPTY: FieldState = { R: '', Alpha: '', ArcLen: '', L: '' }

const FIELD_INFO: Record<FieldKey, { label: string; placeholder: string; hint: string }> = {
  R: { label: 'R (mm)', placeholder: 'Yarıçap', hint: 'KIVRIM YARIÇAPI (> 0)' },
  Alpha: { label: 'α (°)', placeholder: 'Açı', hint: '0 < α < 180' },
  ArcLen: { label: 'Yay (mm)', placeholder: 'Yay uzunluğu', hint: '0 < Yay < π·R' },
  L: { label: 'L (mm)', placeholder: 'Düzlük', hint: 'BİTİŞTEN SONRAKİ DÜZLÜK (≥ 0)' },
}

// Yay uzunluğu formülü — L = 2π·R·(180−α)/360 (backend ArcBudgetCalculator ile birebir).
function computeArcLength(radiusMm: number, angleDeg: number): number {
  return (2 * Math.PI * radiusMm * (180 - angleDeg)) / 360
}

// Ters formül — R + yay verilince α (backend ComputeAngleFromArcLength ile birebir).
// α = 180 − (L·180)/(π·R). Kısıt: 0 < L < π·R.
function computeAngleFromArc(radiusMm: number, arcMm: number): number {
  return 180 - (arcMm * 180) / (Math.PI * radiusMm)
}

// Bütçe hesabı (backend Core/Models/ArcBudgetCalculator ile birebir):
//   - available = partLengthMm (safety kırpma YOK)
//   - Seg1 düzlük min = safety
//   - Son segment yay -safety
interface LengthBudget {
  used: number
  available: number
  remaining: number
}

function effectiveStraightForBudget(segmentOrder: number, straight: number, safety: number): number {
  return segmentOrder === 1 ? Math.max(straight, safety) : straight
}

function effectiveArcForBudget(
  segmentOrder: number,
  totalP: number | null | undefined,
  arc: number,
  safety: number,
): number {
  return totalP != null && segmentOrder === totalP ? Math.max(0, arc - safety) : arc
}

function computeBudget(job: BendingJob | null, totalP: number | null | undefined): LengthBudget | null {
  if (!job) return null
  const safety = job.safetyMarginMm ?? 0
  let used = 0
  for (const s of job.segments ?? []) {
    const arc = computeArcLength(s.radiusMm, s.angleDeg)
    used +=
      effectiveStraightForBudget(s.segmentOrder, s.straightAfterMm, safety) +
      effectiveArcForBudget(s.segmentOrder, totalP, arc, safety)
  }
  const available = job.partLengthMm ?? 0
  return { used, available, remaining: Math.max(0, available - used) }
}

export default function ArcNextSegmentModal() {
  const progress = useMachineStateStore((s) => s.bendingProgress)

  const [inputMode, setInputMode] = useState<InputMode>('angle')
  const [values, setValues] = useState<FieldState>(EMPTY)
  const [numpadField, setNumpadField] = useState<FieldKey | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [job, setJob] = useState<BendingJob | null>(null)

  const isOpen = !!progress?.awaitingArcSegmentInput
  const nextOrder = progress?.completedSegmentOrder ? progress.completedSegmentOrder + 1 : null
  const total = progress?.totalSegmentCount ?? null
  const isSonSegment = nextOrder != null && total != null && nextOrder === total
  const safety = job?.safetyMarginMm ?? 0

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

  // Modal kapandıkça state'i sıfırla (mode korunmaz — her yeni segment default 'angle')
  useEffect(() => {
    if (!isOpen) {
      setValues(EMPTY)
      setNumpadField(null)
      setSubmitting(false)
      setErrorMsg(null)
      setInputMode('angle')
    }
  }, [isOpen])

  // Otomatik α ↔ Yay sync — R varsa: α değişirse yay hesaplanır, yay değişirse α hesaplanır.
  // Kullanıcı toggle geçince mevcut değerler korunur (R aynı → diğerini otomatik doldurur).
  useEffect(() => {
    const r = parseFloat(values.R)
    if (!Number.isFinite(r) || r <= 0) return
    if (inputMode === 'angle') {
      const a = parseFloat(values.Alpha)
      if (Number.isFinite(a) && a > 0 && a < 180) {
        const arc = computeArcLength(r, a)
        const arcStr = arc.toFixed(1)
        if (values.ArcLen !== arcStr) setValues((prev) => ({ ...prev, ArcLen: arcStr }))
      }
    } else {
      const l = parseFloat(values.ArcLen)
      if (Number.isFinite(l) && l > 0 && l < Math.PI * r) {
        const a = computeAngleFromArc(r, l)
        const aStr = a.toFixed(2)
        if (values.Alpha !== aStr) setValues((prev) => ({ ...prev, Alpha: aStr }))
      }
    }
  }, [values.R, values.Alpha, values.ArcLen, inputMode])

  if (!isOpen || !progress) return null

  const budget = computeBudget(job, total)

  // Bu segmentin bütçe efektifi (anlık girilen değerlere göre)
  const r = parseFloat(values.R)
  const rValid = Number.isFinite(r) && r > 0
  // Kaynak alan mode'a göre; diğer alan otomatik doldurulur (sync effect yukarıda)
  const a = parseFloat(values.Alpha)
  const arcRaw =
    rValid && Number.isFinite(a) && a > 0 && a < 180 ? computeArcLength(r, a) : 0
  const lRaw = parseFloat(values.L)
  const newStraight = Number.isFinite(lRaw) && lRaw >= 0 ? lRaw : 0
  const newStraightBudget =
    nextOrder != null ? effectiveStraightForBudget(nextOrder, newStraight, safety) : newStraight
  const newArcBudget =
    nextOrder != null ? effectiveArcForBudget(nextOrder, total, arcRaw, safety) : arcRaw
  const newTotal = newStraightBudget + newArcBudget
  const wouldExceed = budget != null && newTotal > budget.remaining + 0.01

  // Alan geçerliliği — mode'a göre farklı
  const alphaValid = Number.isFinite(a) && a > 0 && a < 180
  const arcFieldValue = parseFloat(values.ArcLen)
  const arcValid = rValid && Number.isFinite(arcFieldValue) && arcFieldValue > 0 && arcFieldValue < Math.PI * r
  const fieldsValid =
    rValid &&
    (inputMode === 'angle' ? alphaValid : arcValid) &&
    Number.isFinite(lRaw) &&
    lRaw >= 0
  const canSubmit = fieldsValid && !submitting && !wouldExceed

  async function handleSubmit() {
    if (!progress || !nextOrder || !canSubmit) return
    setSubmitting(true)
    setErrorMsg(null)
    try {
      // Backend her durumda α bekler — arcLen modunda hesaplanmış α'yı yolla.
      const finalAlpha = inputMode === 'angle' ? parseFloat(values.Alpha) : parseFloat(values.Alpha)
      // (Alpha alanı sync effect ile hep güncel; arcLen mode'da user ArcLen girdi, α otomatik doldu.)
      await window.corventa.bending.addArcSegment(progress.jobId, {
        segmentOrder: nextOrder,
        radiusMm: parseFloat(values.R),
        angleDeg: finalAlpha,
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

  // Görüntülenecek 3 field: R, [Alpha veya ArcLen], L
  const secondField: FieldKey = inputMode === 'angle' ? 'Alpha' : 'ArcLen'
  const visibleFields: FieldKey[] = ['R', secondField, 'L']

  return (
    <>
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <h2 className={styles.title}>
            {nextOrder && total
              ? `${nextOrder}. SEGMENT — ${nextOrder}/${total}${isSonSegment ? ' (SON)' : ''}`
              : 'SIRADAKİ SEGMENT'}
          </h2>
          <p className={styles.subtitle}>
            {inputMode === 'angle' ? 'R + α ile' : 'R + Yay uzunluğu ile'} girin
          </p>

          {/* Toggle: R+α / R+Yay */}
          <div className={styles.modeToggle}>
            <button
              type="button"
              className={inputMode === 'angle' ? styles.modeActive : styles.modeInactive}
              onClick={() => setInputMode('angle')}
              disabled={submitting}
            >
              R + α (Açı)
            </button>
            <button
              type="button"
              className={inputMode === 'arcLen' ? styles.modeActive : styles.modeInactive}
              onClick={() => setInputMode('arcLen')}
              disabled={submitting}
            >
              R + Yay (mm)
            </button>
          </div>

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
                <span>
                  Bu segment (yay {arcRaw.toFixed(1)}
                  {isSonSegment && arcRaw > newArcBudget
                    ? ` → efektif ${newArcBudget.toFixed(1)}, -${safety.toFixed(0)} safety`
                    : ''}
                  {' + düz '}
                  {newStraight.toFixed(1)}
                  {nextOrder === 1 && newStraight < safety
                    ? ` → efektif ${newStraightBudget.toFixed(1)}, min ${safety.toFixed(0)} safety`
                    : ''}
                  ):
                </span>
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
                  ⚠ Parça boyu yetersiz — R, α/Yay veya L değerini küçültün
                </div>
              )}
              {isSonSegment && arcRaw > 0 && (
                <div className={styles.budgetInfo}>
                  ℹ SON SEGMENT: yay uzunluğu {safety.toFixed(0)}mm kısaltılacak (parça sonu güvenlik payı)
                </div>
              )}
            </div>
          )}

          <div className={styles.fields}>
            {visibleFields.map((field) => {
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
