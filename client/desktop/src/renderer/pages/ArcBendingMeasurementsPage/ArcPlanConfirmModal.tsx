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
  /** 2026-11-27 (kullanıcı, ayar ArcExtensionRequireLengthEdit): uzatma gerekiyorsa ONAYLA & DEVAM yok —
   *  operatör ölçü ekranına döner, parça boyunu (baştan uzatmada L1'i de) KENDİSİ artırır. */
  requireEdit?: boolean
  onEdit?: () => void
}

/** Uzatma gerektiğinde operatörün girmesi gereken değerler (planlayıcı: baştan uzatma = Seg1.L + LT, sondan = sadece LT) */
export function arcExtensionFix(plan: ValidateArcPlanResponse): { ext: number; enteredLen: number; newLen: number; l1From: number | null; l1To: number | null } | null {
  const ext = plan.extensionMm ?? 0
  if (!(ext > 0)) return null
  const newLen = plan.adjustedPartLengthMm ?? 0
  const enteredLen = newLen - ext
  let l1From: number | null = null
  let l1To: number | null = null
  if (plan.side === 'Leading' && !plan.isReversed) {
    const l1 = plan.adjustedSegments?.[0]?.straightAfterMm
    if (typeof l1 === 'number') {
      l1To = l1
      l1From = l1 - ext
    }
  }
  return { ext, enteredLen, newLen, l1From, l1To }
}

// 2026-11-05: metinler son kullanıcı diline çevrildi (Seg → kıvrım), backend warningMessage tekrarı kaldırıldı.
// 2026-09-08: Backend planner uzatma veya sıralama tersine çevirme önerdiğinde
// operatörden onay alan modal. Uzatma yok + reversal yoksa gösterilmez (Page
// direkt navigate eder).
export default function ArcPlanConfirmModal({ plan, onCancel, onAccept, requireEdit = false, onEdit }: Props) {
  const t = useT()
  const hasExtension = (plan.extensionMm ?? 0) > 0
  const isReversed = plan.isReversed === true
  const ext = plan.extensionMm ?? 0
  const finalLen = plan.adjustedPartLengthMm ?? 0
  const enteredLen = finalLen - ext
  const segCount = plan.adjustedSegments?.length ?? 0
  const fix = arcExtensionFix(plan)
  const mustEdit = requireEdit && hasExtension && fix != null

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

        {mustEdit && fix && (
          <div className={styles.section}>
            <div className={styles.sectionHead}>{t('PARÇA BOYUNU DEĞİŞTİRİN')}</div>
            <div className={styles.sectionBody}>
              <div>
                {withBold(t('Parça boyunu (LT) <b>{a} mm → {b} mm</b> yapın.', { a: fix.enteredLen.toFixed(0), b: fix.newLen.toFixed(0) }), styles.big)}
              </div>
              {fix.l1From != null && fix.l1To != null && (
                <div>
                  {withBold(t('1. kıvrımdan önceki düzlüğü (L1) <b>{a} mm → {b} mm</b> yapın.', { a: fix.l1From.toFixed(0), b: fix.l1To.toFixed(0) }), styles.big)}
                </div>
              )}
              <div className={styles.small}>
                {t('Parçayı {mm} mm daha uzun kesin. Ölçü ekranına dönüp değerleri değiştirin, sonra yeniden ONAYLA.', { mm: fix.ext.toFixed(0) })}
              </div>
            </div>
          </div>
        )}

        {hasExtension && !mustEdit && (
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

        {finalLen > 0 && !mustEdit && (
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
          {mustEdit ? (
            <button className={styles.acceptBtn} onClick={onEdit ?? onCancel}>
              {t('GERİ DÖN — ÖLÇÜLERİ DÜZELT')}
            </button>
          ) : (
            <button className={styles.acceptBtn} onClick={onAccept}>
              {t('ONAYLA & DEVAM')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
