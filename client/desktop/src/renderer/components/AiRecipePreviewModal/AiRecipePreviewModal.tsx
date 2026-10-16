// AI RECIPE FAZ 4B UI (2026-09-04) — Dairesel bukum baslamadan onceki AI eslesme preview modali.
// Read-only: sadece DataApi'ye GET /api/bending-jobs/similar cagirir, yan etki yok.
// SignalR / bukum akisi bu modaldan bagimsiz — modal parametre ekraninda acilir/kapanir.

import { useEffect, useState } from 'react'
import styles from './AiRecipePreviewModal.module.css'
import { useT } from '@/i18n'
import type { SimilarBendingJobRequest, SimilarBendingJobResponse } from '@shared/types'

interface Props {
  /** Modal acikken parametre snapshot'i (kapatildiktan sonra degismez). */
  request: SimilarBendingJobRequest
  /** Kullanici "BUKUME BASLA" ile ilerlemeye karar verirse cagrilir. */
  onProceed: () => void
  /** Kullanici KAPAT ile modali kapatirsa cagrilir (parametreler duzenlenmek istenirse). */
  onClose: () => void
}

type Phase =
  | { kind: 'loading' }
  | { kind: 'match'; data: SimilarBendingJobResponse }
  | { kind: 'no-match' }
  | { kind: 'error'; message: string }

export default function AiRecipePreviewModal({ request, onProceed, onClose }: Props) {
  const t = useT()
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const resp = await window.corventa.bending.findSimilar(request)
        if (cancelled) return
        if (resp.match) {
          setPhase({ kind: 'match', data: resp })
        } else {
          setPhase({ kind: 'no-match' })
        }
      } catch (err) {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : String(err)
        setPhase({ kind: 'error', message: msg })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [request])

  const formatDate = (iso: string): string => {
    try {
      const d = new Date(iso)
      return d.toLocaleString('tr-TR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    } catch {
      return iso
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Kapatma X butonu */}
        <button className={styles.closeX} onClick={onClose} aria-label={t('Kapat')}>
          ×
        </button>

        {/* Baslik */}
        <h2 className={styles.title}>
          <span className={styles.icon}>🤖</span> {t('AI ÖĞRENME KONTROLÜ')}
        </h2>

        {/* Icerik — 4 phase */}
        <div className={styles.content}>
          {phase.kind === 'loading' && (
            <div className={styles.stateLoading}>
              <div className={styles.spinner} />
              <p>{t('Benzer büküm aranıyor...')}</p>
            </div>
          )}

          {phase.kind === 'error' && (
            <div className={styles.stateError}>
              <p className={styles.errorHead}>⚠ {t('Kontrol edilemedi')}</p>
              <p className={styles.errorDetail}>{phase.message}</p>
              <p className={styles.errorNote}>
                {t('Sorun yok — büküm klasik akışta çalışacak, sonuç kaydedilecek.')}
              </p>
            </div>
          )}

          {phase.kind === 'no-match' && (
            <div className={styles.stateNoMatch}>
              <p className={styles.noMatchHead}>📋 {t('İLK BÜKÜM')}</p>
              <p className={styles.noMatchDetail}>
                {t('Bu parametre kombinasyonunu daha önce bükmedik. Büküm klasik akışta çalışacak ve')}{' '}
                <b>{t('kayıt oluşturulacak')}</b>.{' '}
                {t('Aynı parametrelerle bir sonraki büküm daha hızlı bitirilecek.')}
              </p>
              <div className={styles.paramGrid}>
                <div><b>{t('Hedef:')}</b> Ø {request.targetDiameterMm} mm</div>
                <div><b>{t('Parça:')}</b> {request.partLengthMm} mm</div>
                <div><b>{t('Adım:')}</b> {request.stepDistanceMm} mm</div>
                <div><b>{t('Profil:')}</b> {request.profileA}×{request.profileB}×{request.profileS}</div>
              </div>
            </div>
          )}

          {phase.kind === 'match' && phase.data.match && (
            <div className={styles.stateMatch}>
              <p className={styles.matchHead}>⚡ {t('AI HIZLANDIRMA HAZIR')}</p>
              <p className={styles.matchDetail}>
                {t('Bu parametreleri daha önce büktük. Kayıttaki ilk düzeltme adımı atlanacak —')}{' '}
                <b>{t('1 iterasyon kazanç')}</b> {t('beklentisi.')}
              </p>
              <div className={styles.matchStats}>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>{t('KAYNAK KAYIT')}</span>
                  <span className={styles.statValue}>Job #{phase.data.match.id}</span>
                  <span className={styles.statNote}>{formatDate(phase.data.match.completedAt)}</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>{t('ÖNCEKİ SÜRE')}</span>
                  <span className={styles.statValueBig}>
                    {phase.data.match.durationSeconds.toFixed(0)}
                    <span className={styles.statUnit}>{t('sn')}</span>
                  </span>
                  <span className={styles.statNote}>
                    {phase.data.match.totalSpringbackIterations} iter
                  </span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>{t('KAZANÇ')}</span>
                  <span className={styles.statValueBig}>−1<span className={styles.statUnit}>{t('tekrar')}</span></span>
                  <span className={styles.statNote}>{t('ölçüm atlanacak')}</span>
                </div>
              </div>
              {phase.data.iterations.length > 1 && (
                <div className={styles.recipePos}>
                  <b>{t('İlk düzeltme:')}</b> {t('Aktif piston direkt')}{' '}
                  <b>{phase.data.iterations[1].correctionPistonPositionMm.toFixed(2)} mm</b>{' '}
                  ({phase.data.iterations[1].measurementSide === 'Right'
                    ? t('sağ taraftan ölçüm ile devam')
                    : t('sol taraftan ölçüm ile devam')})
                </div>
              )}
            </div>
          )}
        </div>

        {/* Butonlar */}
        <div className={styles.actions}>
          <button
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={onClose}
            disabled={phase.kind === 'loading'}
          >
            {t('KAPAT')}
          </button>
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={onProceed}
            disabled={phase.kind === 'loading'}
          >
            {t('BÜKÜMÜ BAŞLAT')}
          </button>
        </div>
      </div>
    </div>
  )
}
