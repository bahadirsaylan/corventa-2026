// "MANUEL BENDING" başlık banner'ı — SEKIL-22, 23, 24, 25'te ortak.
// Üstte aşağı/yukarı navigasyon okları (geri/ileri) ile.

import { useNavigate } from 'react-router-dom'
import styles from './ManuelHeader.module.css'

interface Props {
  onUp?: () => void
  onDown?: () => void
  /** Header'ın altında ekstra başlık satırı (örn. seçili program kodu) */
  subtitle?: string
}

export default function ManuelHeader({ onUp, onDown, subtitle }: Props) {
  const navigate = useNavigate()

  return (
    <div className={styles.wrapper}>
      <button
        className={styles.arrowBtn}
        onClick={onDown ?? (() => navigate(-1))}
        aria-label="Geri / Aşağı"
      >
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M12 4v16M5 13l7 7 7-7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <div className={styles.titleBlock}>
        <span className={styles.title}>MANUEL</span>
        <span className={styles.title}>BENDING</span>
        {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
      </div>

      <button
        className={styles.arrowBtn}
        onClick={onUp ?? (() => navigate('/dashboard'))}
        aria-label="İleri / Yukarı"
      >
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M12 20V4M5 11l7-7 7 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  )
}
