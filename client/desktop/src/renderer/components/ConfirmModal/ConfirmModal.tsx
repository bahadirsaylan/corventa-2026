// SEKIL-23'teki silme onay modali — yeniden kullanılabilir generic dialog.
// Tasarım dili: krem arka plan + yeşil "VAZGEÇ" + pembe "SİL/ONAY".

import type { ReactNode } from 'react'
import { useT } from '@/i18n'
import { Icon } from '@/components/Icon'
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
  // 2026-11-17 (QA): mesajın sonundaki "?" ikonu (bilgi butonlarıyla aynı daire-soru ikonu) kafa karıştırıyordu.
  // Artık üstte varyanta göre ikon (tehlikeli işlem → uyarı üçgeni, diğer → bilgi); Türkçe soru ekiyle biten
  // metinlerde ("… SİLİNSİN Mİ", "… emin misiniz") eksik soru işareti düz karakter olarak eklenir
  // (İngilizce karşılıklar sözlükte zaten "?" ile biter).
  const text = typeof message === 'string' ? t(message) : message
  const needsQuestionMark =
    typeof text === 'string' && /(?:^|\s)(?:m[ıiuü]|M[IİUÜ])(?:s[ıiuü]n[ıiuü]z|S[IİUÜ]N[IİUÜ]Z)?\s*$/u.test(text)
  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <span className={styles.headIcon} data-variant={variant}>
          <Icon name={variant === 'danger' ? 'warning' : 'info'} size={48} />
        </span>
        <p className={styles.message}>
          {text}
          {needsQuestionMark && '?'}
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
