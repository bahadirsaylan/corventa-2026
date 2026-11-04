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
              <div className={styles.small}>
                {plan.isMeasurementOnly
                  ? t('Neden: Kıvrım büküldükten sonra ölçülebilmesi için parçanın ucunda yeterli düz kısım yok.')
                  : t('Neden: Makine kıvrımı bükerken parçayı düz kısmından tutar; parçanın ucundaki düz kısım bunun için kısa.')}
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
              <div className={styles.small}>
                {t('Neden: Bu kıvrım düzeninde parçanın sonundan başlamak daha güvenli. Başlangıç noktası parçanın sonu tarafından alınır.')}
              </div>
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
