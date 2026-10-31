// "MANUEL BENDING" başlık banner'ı — SEKIL-22, 23, 24, 25'te ortak.
// Üstte aşağı/yukarı navigasyon okları (geri/ileri) ile.

import { useNavigate } from 'react-router-dom'
import { Icon } from '@/components/Icon'
import { useT } from '@/i18n'
import styles from './ManuelHeader.module.css'

interface Props {
  onUp?: () => void
  onDown?: () => void
  /** Header'ın altında ekstra başlık satırı (örn. seçili program kodu) */
  subtitle?: string
}

export default function ManuelHeader({ onUp, onDown, subtitle }: Props) {
  const navigate = useNavigate()
  const t = useT()

  return (
    <div className={styles.wrapper}>
      <button
        className={styles.arrowBtn}
        onClick={onDown ?? (() => navigate(-1))}
        aria-label={t('Geri / Aşağı')}
      >
        <Icon name="down" size={56} />
      </button>

      <div className={styles.titleBlock}>
        <span className={styles.title}>{t('MANUEL')}</span>
        <span className={styles.title}>{t('BÜKÜM')}</span>
        {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
      </div>

      <button
        className={styles.arrowBtn}
        onClick={onUp ?? (() => navigate('/dashboard'))}
        aria-label={t('İleri / Yukarı')}
      >
        <Icon name="up" size={56} />
      </button>
    </div>
  )
}
