// Kapasite kataloğu kontrol sonucu — engelleyici madde varsa sadece DÜZELT,
// yalnızca uyarı varsa DÜZELT / YİNE DE DEVAM.

import { useT } from '@/i18n'
import type { CapacityCheck } from '@/constants/capacityCatalog'
import styles from './CapacityCheckModal.module.css'

interface Props {
  check: CapacityCheck
  onFix: () => void
  onProceed: () => void
}

export default function CapacityCheckModal({ check, onFix, onProceed }: Props) {
  const t = useT()
  const blocked = check.issues.some((i) => i.severity === 'block')

  return (
    <div className={styles.overlay} onClick={onFix}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <p className={styles.title}>{blocked ? t('BÜKÜM YAPILAMAZ') : t('DİKKAT')}</p>
        {check.label && <p className={styles.label}>{check.label}</p>}

        <ul className={styles.list}>
          {check.issues.map((issue, i) => (
            <li key={i} className={styles.item} data-severity={issue.severity}>
              {issue.message}
            </li>
          ))}
        </ul>

        <div className={blocked ? styles.actionsSingle : styles.actions}>
          <button className={`${styles.btn} ${styles.fix}`} onClick={onFix}>
            {t('DÜZELT')}
          </button>
          {!blocked && (
            <button className={`${styles.btn} ${styles.proceed}`} onClick={onProceed}>
              {t('YİNE DE DEVAM')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
