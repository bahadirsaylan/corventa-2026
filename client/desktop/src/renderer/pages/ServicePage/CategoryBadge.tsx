// SEKIL 31'deki büyük daire kategori butonu (SERVİS S, KURULUM K, EĞİTİM E, SORU S, ÖNERİ Ö, ŞİKAYET Ş).
// İçinde dönen yarım daire + iki kırmızı nokta + büyük harf var.

import styles from './CategoryBadge.module.css'

interface Props {
  label: string
  letter: string
  onClick?: () => void
  /** Kompakt mod — küçük rozet (ticket kod prefix'i gibi yerlerde) */
  compact?: boolean
  /** Devre dışı görünüm (eğitim modu için stub) */
  disabled?: boolean
}

export default function CategoryBadge({ label, letter, onClick, compact, disabled }: Props) {
  return (
    <button
      type="button"
      className={[styles.badge, compact ? styles.compact : '', disabled ? styles.disabled : '']
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
      disabled={disabled}
    >
      <span className={styles.smallLabel}>{label}</span>

      {/* Yarım daire kıvrımı + iki kırmızı uç noktası — SEKIL-31'deki rozet işareti */}
      <svg viewBox="0 0 100 100" className={styles.arc} aria-hidden="true">
        {/* 3/4 daire — sağ üstten sola, alttan sağa */}
        <path
          d="M 78 28 A 34 34 0 1 1 28 78"
          fill="none"
          stroke="#3a3a3a"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Üst-sağ uç nokta */}
        <circle cx="78" cy="28" r="3.5" fill="#c93235" />
        {/* Alt-sol uç nokta */}
        <circle cx="28" cy="78" r="3.5" fill="#c93235" />
      </svg>

      <span className={styles.letter}>{letter}</span>
    </button>
  )
}
