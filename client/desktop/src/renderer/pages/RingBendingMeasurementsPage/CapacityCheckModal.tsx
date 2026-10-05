// Kapasite kataloğu kontrol sonucu — engelleyici madde varsa sadece DÜZELT,
// yalnızca uyarı varsa DÜZELT / YİNE DE DEVAM.

import type { CapacityCheck } from '@/constants/capacityCatalog'
import styles from './CapacityCheckModal.module.css'

interface Props {
  check: CapacityCheck
  onFix: () => void
  onProceed: () => void
}

export default function CapacityCheckModal({ check, onFix, onProceed }: Props) {
  const blocked = check.issues.some((i) => i.severity === 'block')

  return (
    <div className={styles.overlay} onClick={onFix}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <p className={styles.title}>{blocked ? 'BÜKÜM YAPILAMAZ' : 'DİKKAT'}</p>
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
            DÜZELT
          </button>
          {!blocked && (
            <button className={`${styles.btn} ${styles.proceed}`} onClick={onProceed}>
              YİNE DE DEVAM
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
