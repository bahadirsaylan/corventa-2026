import styles from './ArcPlanConfirmModal.module.css'
import type { ValidateArcPlanResponse } from '@shared/types'
import { useT } from '@/i18n'

// Çevrilmiş metindeki <b>…</b> işaretlerini kalın parçalara böler (çeviri kelime sırası için).
function withBold(text: string, boldClass?: string) {
  return text
    .split(/<\/?b>/)
    .map((part, i) => (i % 2 === 1 ? <b key={i} className={boldClass}>{part}</b> : part))
}

interface Props {
  plan: ValidateArcPlanResponse
  onCancel: () => void
  onAccept: () => void
}

// 2026-09-08: Backend planner uzatma veya sıralama tersine çevirme önerdiğinde
// operatörden onay alan modal. Uzatma yok + reversal yoksa gösterilmez (Page
// direkt navigate eder).
export default function ArcPlanConfirmModal({ plan, onCancel, onAccept }: Props) {
  const t = useT()
  const hasExtension = (plan.extensionMm ?? 0) > 0
  const isReversed = plan.isReversed === true
  const sideStr = plan.side === 'Leading'
    ? t('PARÇA BAŞINA (ilk düzlük tarafına)')
    : plan.side === 'Trailing'
      ? t('PARÇA SONUNA')
      : ''
  const reasonStr = plan.isMeasurementOnly ? t('ÖLÇÜM İÇİN') : t('BÜKÜM İÇİN')

  return (
    <div className={styles.overlay}>
      <div className={styles.box}>
        <div className={styles.head}>{t('KIVRIM PLANI HAZIR')}</div>

        {hasExtension && (
          <div className={styles.section}>
            <div className={styles.sectionHead}>{t('PARÇA UZATMA GEREKLİ')}</div>
            <div className={styles.sectionBody}>
              <div>
                {withBold(t('Parçayı <b>{mm} mm</b> uzatın.', { mm: plan.extensionMm!.toFixed(0) }), styles.big)}
              </div>
              <div>{withBold(t('Ekleme <b>{side}</b> yapılacak.', { side: sideStr }))}</div>
              <div className={styles.small}>{t('Sebep')}: {reasonStr}</div>
            </div>
          </div>
        )}

        {isReversed && (
          <div className={styles.section}>
            <div className={styles.sectionHead}>{t('SEGMENT SIRASI TERS ÇEVRİLDİ')}</div>
            <div className={styles.sectionBody}>
              <div>
                {withBold(t('Segmentler <b>ters sırada</b> bükülecek — parça sonu (SegN) önce bükülür, Seg1 en son.'))}
              </div>
              <div className={styles.small}>
                {t('Parça sıfırlama parça sonu tarafında yapılacak.')}
              </div>
            </div>
          </div>
        )}

        {plan.adjustedPartLengthMm != null && plan.adjustedPartLengthMm > 0 && (
          <div className={styles.summary}>
            {t('Ayarlanmış toplam parça boyu')}: <b>{plan.adjustedPartLengthMm.toFixed(0)} mm</b>
          </div>
        )}

        {plan.warningMessage && (
          <div className={styles.warning}>{plan.warningMessage}</div>
        )}

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onCancel}>
            {t('İPTAL')}
          </button>
          <button className={styles.acceptBtn} onClick={onAccept}>
            {t('ONAYLA & DEVAM')}
          </button>
        </div>
      </div>
    </div>
  )
}
