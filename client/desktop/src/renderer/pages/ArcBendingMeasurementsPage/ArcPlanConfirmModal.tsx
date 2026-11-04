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

// 2026-11-05: metinler son kullanıcı diline çevrildi (Seg → kıvrım), backend warningMessage tekrarı kaldırıldı.
// 2026-09-08: Backend planner uzatma veya sıralama tersine çevirme önerdiğinde
// operatörden onay alan modal. Uzatma yok + reversal yoksa gösterilmez (Page
// direkt navigate eder).
export default function ArcPlanConfirmModal({ plan, onCancel, onAccept }: Props) {
  const t = useT()
  const hasExtension = (plan.extensionMm ?? 0) > 0
  const isReversed = plan.isReversed === true
  const ext = plan.extensionMm ?? 0
  const finalLen = plan.adjustedPartLengthMm ?? 0
  const enteredLen = finalLen - ext
  const segCount = plan.adjustedSegments?.length ?? 0

  // NEDEN — planlayıcının gerçek kararı: girilen haliyle kıvrım yapılamıyor mu, ölçülemiyor mu, ikisi mi?
  // Eski backend bu alanları göndermezse isMeasurementOnly'den çıkarılır.
  const hasNew = plan.bendIssue !== undefined || plan.measureIssue !== undefined
  const bendProblem = hasNew ? !!plan.bendIssue : !plan.isMeasurementOnly
  const measureProblem = hasNew ? !!plan.measureIssue : !!plan.isMeasurementOnly
  const reasonTitle =
    bendProblem && measureProblem
      ? t('Girdiğiniz ölçülerle kıvrım hem yapılamaz hem de ölçülemez.')
      : bendProblem
        ? t('Girdiğiniz ölçülerle kıvrım yapılamaz.')
        : measureProblem
          ? t('Girdiğiniz ölçülerle kıvrım yapılır ama ölçülemez.')
          : plan.orderIssue
            ? t('Girdiğiniz sırayla bükülürse bir kıvrım, önceki bükümde sıkıştırılmış kısmın üstünde bükülür; kesit bozulabilir.')
            : null
  const fixText =
    hasExtension && isReversed
      ? t('Parça uzatılıp büküme sondan başlanınca sorun ortadan kalkar.')
      : hasExtension
        ? t('Parça uzatılınca sorun ortadan kalkar.')
        : t('Büküme parçanın sonundan başlanınca sorun ortadan kalkar.')

  return (
    <div className={styles.overlay}>
      <div className={styles.box}>
        <div className={styles.head}>{t('KIVRIM PLANI HAZIR')}</div>

        {hasExtension && (
          <div className={styles.section}>
            <div className={styles.sectionHead}>{t('PARÇAYI DAHA UZUN KESİN')}</div>
            <div className={styles.sectionBody}>
              <div>
                {withBold(t('Parçayı <b>{mm} mm</b> daha uzun kesin.', { mm: ext.toFixed(0) }), styles.big)}
              </div>
              <div>
                {withBold(
                  plan.side === 'Leading'
                    ? t('Fazlalık parçanın <b>BAŞINA</b> (1. kıvrımdan önceki düz kısma) eklenir.')
                    : t('Fazlalık parçanın <b>SONUNA</b> (son kıvrımdan sonraki düz kısma) eklenir.'),
                )}
              </div>
            </div>
          </div>
        )}

        {isReversed && (
          <div className={styles.section}>
            <div className={styles.sectionHead}>{t('BÜKÜM PARÇANIN SONUNDAN BAŞLAYACAK')}</div>
            <div className={styles.sectionBody}>
              <div>
                {withBold(
                  segCount > 1
                    ? t('Kıvrımlar <b>sondan başa</b> bükülecek: önce {n}. kıvrım, en son 1. kıvrım.', { n: segCount })
                    : t('Kıvrım parçanın <b>sonu</b> tarafından bükülecek.'),
                )}
              </div>
              <div className={styles.small}>{t('Başlangıç noktası parçanın sonu tarafından alınır.')}</div>
            </div>
          </div>
        )}

        {reasonTitle && (
          <div className={styles.section}>
            <div className={styles.sectionHead}>{t('NEDEN')}</div>
            <div className={styles.sectionBody}>
              <div><b>{reasonTitle}</b></div>
              {bendProblem && plan.bendIssue && <div className={styles.small}>• {plan.bendIssue}</div>}
              {measureProblem && plan.measureIssue && <div className={styles.small}>• {plan.measureIssue}</div>}
              <div>{fixText}</div>
            </div>
          </div>
        )}

        {finalLen > 0 && (
          <div className={styles.summary}>
            {t('Kesilecek parça boyu')}: <b>{finalLen.toFixed(0)} mm</b>
            {hasExtension && (
              <span className={styles.small}>
                {' '}
                {t('(girdiğiniz {a} mm + {b} mm)', { a: enteredLen.toFixed(0), b: ext.toFixed(0) })}
              </span>
            )}
          </div>
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
