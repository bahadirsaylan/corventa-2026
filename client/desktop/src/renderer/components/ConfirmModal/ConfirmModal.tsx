// SEKIL-23'teki silme onay modali — yeniden kullanılabilir generic dialog.
// Tasarım dili: krem arka plan + yeşil "VAZGEÇ" + pembe "SİL/ONAY".

import type { ReactNode } from 'react'
import { useT } from '@/i18n'
import styles from './ConfirmModal.module.css'

interface Props {
  message: string | ReactNode
  cancelLabel?: string
  confirmLabel?: string
  variant?: 'danger' | 'primary'
  onCancel: () => void
  onConfirm: () => void
}

export default function ConfirmModal({
  message,
  cancelLabel,
  confirmLabel,
  variant = 'danger',
  onCancel,
  onConfirm,
}: Props) {
  const t = useT()
  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <p className={styles.message}>
          {typeof message === 'string' ? t(message) : message}
          <span className={styles.qmark}>?</span>
        </p>
        <div className={styles.actions}>
          <button className={`${styles.btn} ${styles.cancel}`} onClick={onCancel}>
            {cancelLabel !== undefined ? t(cancelLabel) : t('VAZGEÇ')}
          </button>
          <button
            className={`${styles.btn} ${variant === 'danger' ? styles.danger : styles.primary}`}
            onClick={onConfirm}
          >
            {confirmLabel !== undefined ? t(confirmLabel) : t('ONAYLA')}
          </button>
        </div>
      </div>
    </div>
  )
}
