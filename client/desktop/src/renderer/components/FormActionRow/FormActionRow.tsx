// Ölçü giriş formlarının alt satırı (2026-11-02): solda SIFIRLA, sağda ONAYLA.
// ONAYLA sağ alttaki touch (StatusBar) tuşuyla AYNI işlevi görür — ikisi de kalır, aynı onConfirm/disabled verilir.

import { useT } from '@/i18n'
import { IconLabel } from '@/components/Icon'
import styles from './FormActionRow.module.css'

interface Props {
  onReset: () => void
  /** Verilmezse sadece SIFIRLA görünür (sola dayalı) */
  onConfirm?: () => void
  confirmDisabled?: boolean
}

export default function FormActionRow({ onReset, onConfirm, confirmDisabled = false }: Props) {
  const t = useT()
  return (
    <div className={styles.row}>
      <button type="button" className={styles.resetBtn} onClick={onReset}>
        <IconLabel icon="reset">{t('SIFIRLA')}</IconLabel>
      </button>
      {onConfirm && (
        <button type="button" className={styles.confirmBtn} onClick={onConfirm} disabled={confirmDisabled}>
          <IconLabel icon="check">{t('ONAYLA')}</IconLabel>
        </button>
      )}
    </div>
  )
}
