import styles from './ArcPlanConfirmModal.module.css'
import type { ValidateArcPlanResponse } from '@shared/types'

interface Props {
  plan: ValidateArcPlanResponse
  onCancel: () => void
  onAccept: () => void
}

// 2026-09-08: Backend planner uzatma veya sıralama tersine çevirme önerdiğinde
// operatörden onay alan modal. Uzatma yok + reversal yoksa gösterilmez (Page
// direkt navigate eder).
export default function ArcPlanConfirmModal({ plan, onCancel, onAccept }: Props) {
  const hasExtension = (plan.extensionMm ?? 0) > 0
  const isReversed = plan.isReversed === true
  const sideStr = plan.side === 'Leading'
    ? 'PARÇA BAŞINA (ilk düzlük tarafına)'
    : plan.side === 'Trailing'
      ? 'PARÇA SONUNA'
      : ''
  const reasonStr = plan.isMeasurementOnly ? 'ÖLÇÜM İÇİN' : 'BÜKÜM İÇİN'

  return (
    <div className={styles.overlay}>
      <div className={styles.box}>
        <div className={styles.head}>KIVRIM PLANI HAZIR</div>

        {hasExtension && (
          <div className={styles.section}>
            <div className={styles.sectionHead}>PARÇA UZATMA GEREKLİ</div>
            <div className={styles.sectionBody}>
              <div>
                Parçayı <b className={styles.big}>{plan.extensionMm!.toFixed(0)} mm</b> uzatın.
              </div>
              <div>Ekleme <b>{sideStr}</b> yapılacak.</div>
              <div className={styles.small}>Sebep: {reasonStr}</div>
            </div>
          </div>
        )}

        {isReversed && (
          <div className={styles.section}>
            <div className={styles.sectionHead}>SEGMENT SIRASI TERS ÇEVRİLDİ</div>
            <div className={styles.sectionBody}>
              <div>
                Segmentler <b>ters sırada</b> bükülecek — parça sonu (SegN) önce
                bükülür, Seg1 en son.
              </div>
              <div className={styles.small}>
                Parça sıfırlama parça sonu tarafında yapılacak.
              </div>
            </div>
          </div>
        )}

        {plan.adjustedPartLengthMm != null && plan.adjustedPartLengthMm > 0 && (
          <div className={styles.summary}>
            Ayarlanmış toplam parça boyu: <b>{plan.adjustedPartLengthMm.toFixed(0)} mm</b>
          </div>
        )}

        {plan.warningMessage && (
          <div className={styles.warning}>{plan.warningMessage}</div>
        )}

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onCancel}>
            İPTAL
          </button>
          <button className={styles.acceptBtn} onClick={onAccept}>
            ONAYLA & DEVAM
          </button>
        </div>
      </div>
    </div>
  )
}
