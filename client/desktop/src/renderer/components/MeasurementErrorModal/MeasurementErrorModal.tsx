// Arc ölçüm hatası retry modal akışı (2026-08-18).
//
// İki modal tek component:
//   MODAL 1 (awaitingMeasurementRetry=true):
//     "Ölçüm Hatası" — [Pnömatiği Geri Çek] + [Tekrar Ölç]
//     Retract butonu tıklanmadan Tekrar Ölç disabled.
//     Retract → POST measurement-retry-action(retract), backend pnömatik retract eder ve
//     pneumaticRetractedForRetry=true set eder → Tekrar Ölç AKTİF olur.
//     Remeasure → POST measurement-retry-action(remeasure), backend yeniden SLPIS ölçüm yapar.
//
//   MODAL 2 (awaitingMeasurementFinalDecision=true):
//     "Ölçüm Tekrarlanamıyor" — [Tüm Bükümü Bitir] + [Bu Segmenti Atla]
//     Finish → POST measurement-retry-action(finish_all), job Completed olarak sonlanır.
//     Skip → POST measurement-retry-action(skip_segment), sonraki segmente geç.

import { useEffect, useState } from 'react'

import { useMachineStateStore } from '@/stores/machineStateStore'
import styles from './MeasurementErrorModal.module.css'

export default function MeasurementErrorModal() {
  const progress = useMachineStateStore((s) => s.bendingProgress)

  const modal1Open = !!progress?.awaitingMeasurementRetry
  const modal2Open = !!progress?.awaitingMeasurementFinalDecision
  const isOpen = modal1Open || modal2Open

  const [submitting, setSubmitting] = useState<null | string>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Modal kapandıkça state sıfır
  useEffect(() => {
    if (!isOpen) {
      setSubmitting(null)
      setErrorMsg(null)
    }
  }, [isOpen])

  if (!isOpen || !progress) return null

  const jobId = progress.jobId
  const segNo = progress.measurementRetrySegmentOrder ?? null
  const iter = progress.measurementRetryIteration ?? null
  const prev = progress.prevMeasuredRadiusMm
  const last = progress.lastMeasuredRadiusMm
  const target = progress.targetRadiusMm
  const retracted = !!progress.pneumaticRetractedForRetry

  async function sendAction(action: string) {
    setSubmitting(action)
    setErrorMsg(null)
    try {
      await window.corventa.bending.measurementRetryAction(jobId, action)
      // Backend BendingProgress'i günceller → bir sonraki SignalR push ile modal state değişir
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(`İşlem başarısız: ${msg}`)
      setSubmitting(null)
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {modal1Open && (
          <>
            <h2 className={styles.title}>⚠ ÖLÇÜM HATASI</h2>
            <p className={styles.subtitle}>
              Segment {segNo}, iterasyon {iter}: sensör beklenmedik değer okudu (kötüleşme)
            </p>

            <div className={styles.info}>
              <div className={styles.infoRow}>
                <span>Hedef radyüs:</span>
                <strong>{target != null ? `${target.toFixed(2)} mm` : '—'}</strong>
              </div>
              <div className={styles.infoRow}>
                <span>Önceki ölçüm:</span>
                <strong>{prev != null ? `${prev.toFixed(2)} mm` : '—'}</strong>
              </div>
              <div className={`${styles.infoRow} ${styles.infoBad}`}>
                <span>Şimdi ölçülen:</span>
                <strong>
                  {last != null ? `${last.toFixed(2)} mm` : '—'}{' '}
                  {prev != null && last != null && last >= prev ? '(arttı ▲)' : ''}
                </strong>
              </div>
            </div>

            <p className={styles.instruction}>
              1) Önce <b>Pnömatiği Geri Çek</b> ile SLPIS'i güvenli konuma çekin.
              <br />
              2) Sonra <b>Tekrar Ölç</b> ile yeniden ölçüm yapın.
            </p>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.btnPrimary}
                disabled={submitting !== null || retracted}
                onClick={() => sendAction('retract')}
              >
                {submitting === 'retract'
                  ? 'Gönderiliyor…'
                  : retracted
                    ? '✓ Pnömatik Geri Çekildi'
                    : '① Pnömatiği Geri Çek'}
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                disabled={submitting !== null || !retracted}
                onClick={() => sendAction('remeasure')}
              >
                {submitting === 'remeasure' ? 'Ölçülüyor…' : '② Tekrar Ölç'}
              </button>
            </div>
          </>
        )}

        {modal2Open && (
          <>
            <h2 className={styles.title}>⚠ ÖLÇÜM TEKRARLANAMIYOR</h2>
            <p className={styles.subtitle}>
              Segment {segNo}, iterasyon {iter}: tekrar ölçümde de sonuç önceki'den yüksek.
              Fiziksel bir sorun olabilir (parça kayması, sensör hatası, vb.)
            </p>

            <div className={styles.info}>
              <div className={styles.infoRow}>
                <span>Hedef radyüs:</span>
                <strong>{target != null ? `${target.toFixed(2)} mm` : '—'}</strong>
              </div>
              <div className={styles.infoRow}>
                <span>Önceki ölçüm:</span>
                <strong>{prev != null ? `${prev.toFixed(2)} mm` : '—'}</strong>
              </div>
              <div className={`${styles.infoRow} ${styles.infoBad}`}>
                <span>Son ölçüm:</span>
                <strong>{last != null ? `${last.toFixed(2)} mm` : '—'}</strong>
              </div>
            </div>

            <p className={styles.instruction}>
              Bu segment için düzeltme başarısız. Aşağıdaki iki seçenekten birini seçin:
            </p>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.btnDanger}
                disabled={submitting !== null}
                onClick={() => sendAction('finish_all')}
              >
                {submitting === 'finish_all' ? 'Gönderiliyor…' : '⏹ Tüm Bükümü Bitir'}
              </button>
              <button
                type="button"
                className={styles.btnWarning}
                disabled={submitting !== null}
                onClick={() => sendAction('skip_segment')}
              >
                {submitting === 'skip_segment' ? 'Gönderiliyor…' : '⏭ Bu Segmenti Atla'}
              </button>
            </div>
          </>
        )}

        {errorMsg && <div className={styles.error}>{errorMsg}</div>}
      </div>
    </div>
  )
}
