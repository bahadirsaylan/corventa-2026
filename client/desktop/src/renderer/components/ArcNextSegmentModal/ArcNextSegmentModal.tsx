// Arc interactive flow — Bending API her segment sonu sıradaki segment için
// BendingProgress.awaitingArcSegmentInput=true gönderir. Bu modal otomatik açılır,
// operatörden R/α/L alır, POST /api/bending-jobs/{id}/segments ile DataApi'ye gönderir.
// Backend coordinator wait'i resolve eder → pipeline devam → modal kapanır.

import { useEffect, useState } from 'react'

import NumpadModal from '@/components/NumpadModal/NumpadModal'
import { useMachineStateStore } from '@/stores/machineStateStore'
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

function isValid(v: FieldState): boolean {
  const r = parseFloat(v.R)
  const a = parseFloat(v.Alpha)
  const l = parseFloat(v.L)
  if (!Number.isFinite(r) || r <= 0) return false
  if (!Number.isFinite(a) || a <= 0 || a >= 180) return false
  if (!Number.isFinite(l) || l < 0) return false
  return true
}

export default function ArcNextSegmentModal() {
  const progress = useMachineStateStore((s) => s.bendingProgress)

  const [values, setValues] = useState<FieldState>(EMPTY)
  const [numpadField, setNumpadField] = useState<FieldKey | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const isOpen = !!progress?.awaitingArcSegmentInput
  const nextOrder = progress?.completedSegmentOrder
    ? progress.completedSegmentOrder + 1
    : null
  const total = progress?.totalSegmentCount ?? null

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

  async function handleSubmit() {
    if (!progress || !nextOrder || !isValid(values)) return
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
      setErrorMsg(`Segment gönderilemedi: ${msg}`)
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
            disabled={!isValid(values) || submitting}
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
