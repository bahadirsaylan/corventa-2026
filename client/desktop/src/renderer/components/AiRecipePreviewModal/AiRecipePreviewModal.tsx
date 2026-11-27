// AI RECIPE FAZ 4B UI (2026-09-04) — Dairesel bukum baslamadan onceki AI eslesme preview modali.
// Read-only: sadece DataApi'ye GET /api/bending-jobs/similar cagirir, yan etki yok.
// SignalR / bukum akisi bu modaldan bagimsiz — modal parametre ekraninda acilir/kapanir.

import { useEffect, useState } from 'react'
import styles from './AiRecipePreviewModal.module.css'
import { useT } from '@/i18n'
import { Icon, IconLabel } from '@/components/Icon'
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
  | { kind: 'match' }
  | { kind: 'none' }
  | { kind: 'error' }

// 2026-11-27 (kullanıcı): operatöre sade bilgi — "EŞLEŞEN KAYIT BULUNDU" / "YOK"; iş numarası, süre, pozisyon gibi ayrıntı yok.
// Eşleşen TÜM kayıtlar bükümde hafızaya alınır, ilk geri esneme ölçümünden sonra en uygunu seçilir (Bending API).
export default function AiRecipePreviewModal({ request, onProceed, onClose }: Props) {
  const t = useT()
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const resp = await window.corventa.bending.findSimilar(request)
        if (cancelled) return
        setPhase(resp.match && pickRecipeIndex(resp) != null ? { kind: 'match' } : { kind: 'none' })
      } catch {
        if (!cancelled) setPhase({ kind: 'error' })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [request])

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeX} onClick={onClose} aria-label={t('Kapat')}>
          <Icon name="close" size="md" />
        </button>

        <h2 className={styles.title}>
          <span className={styles.icon}><Icon name="ai" size="lg" /></span> {t('AI ÖĞRENME KONTROLÜ')}
        </h2>

        <div className={styles.content}>
          {phase.kind === 'loading' && (
            <div className={styles.stateLoading}>
              <div className={styles.spinner} />
              <p>{t('Kayıtlar kontrol ediliyor...')}</p>
            </div>
          )}

          {phase.kind === 'match' && (
            <div className={styles.stateMatch}>
              <p className={styles.matchHead}><IconLabel icon="energy">{t('EŞLEŞEN KAYIT BULUNDU')}</IconLabel></p>
            </div>
          )}

          {phase.kind === 'none' && (
            <div className={styles.stateNoMatch}>
              <p className={styles.noMatchHead}><IconLabel icon="clipboard">{t('EŞLEŞEN KAYIT YOK')}</IconLabel></p>
            </div>
          )}

          {phase.kind === 'error' && (
            <div className={styles.stateError}>
              <p className={styles.errorHead}><IconLabel icon="warning">{t('Kayıtlar kontrol edilemedi')}</IconLabel></p>
            </div>
          )}
        </div>

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

/**
 * Backend AiRecipeRules ile aynı kural: son ölçüm tolerans içinde + ondan önce gerçek düzeltme (pozisyon > 0);
 * reçete = başarıdan önceki SON düzeltme. Backend recipeIndex gönderirse o kullanılır (eski backend: istemci hesaplar).
 */
function pickRecipeIndex(resp: SimilarBendingJobResponse): number | null {
  if (resp.recipeIndex !== undefined) return resp.recipeIndex ?? null
  const its = [...resp.iterations].sort((a, b) => a.iterationOrder - b.iterationOrder)
  if (its.length < 2 || !its[its.length - 1].isWithinTolerance) return null
  for (let i = its.length - 2; i >= 0; i--) if (its[i].correctionPistonPositionMm > 0) return i
  return null
}
