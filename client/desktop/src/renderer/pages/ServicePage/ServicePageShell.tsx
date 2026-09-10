// Tüm /service/* sayfaları için ortak iskelet: MachineCodeBar + sarı header + içerik.
// SEKIL 31-53 boyunca tekrarlayan layout — DRY için tek yerde.

import { useNavigate } from 'react-router-dom'
import MachineCodeBar from '@/pages/SettingsPage/MachineCodeBar'
import styles from './ServicePageShell.module.css'

interface Props {
  title: string
  subtitle?: string
  /** Geri butonu davranışı — varsayılan: bir önceki sayfaya */
  onBack?: () => void
  children: React.ReactNode
}

export default function ServicePageShell({ title, subtitle, onBack, children }: Props) {
  const navigate = useNavigate()
  const handleBack = onBack ?? (() => navigate(-1))

  return (
    <div className={styles.page}>
      <MachineCodeBar />

      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <button className={styles.backBtn} onClick={handleBack} aria-label="Geri">
            ←
          </button>
          <div className={styles.titleText}>
            <span className={styles.titleTop}>{title}</span>
            {subtitle && <span className={styles.titleBottom}>{subtitle}</span>}
          </div>
        </div>

        <div className={styles.iconBlock}>
          <ServiceRepIcon className={styles.icon} />
        </div>

        <div className={styles.customerBlock}>
          <span className={styles.customerLabel}>MÜŞTERİ ADI :</span>
          <span className={styles.customerName}>SERSOVİS A.Ş.  –  40.198517, 28.836939</span>
        </div>
      </div>

      <div className={styles.body}>{children}</div>
    </div>
  )
}

/**
 * Kulaklıklı servis temsilcisi ikonu — temiz, geometrik silüet kompozisyonu.
 * Layer sırası: arka daire → arc yazı → saç → headset bandı → kulaklık → yüz → kulaklık önü → mikrofon.
 */
function ServiceRepIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Arka daire çerçeve */}
      <circle cx="60" cy="60" r="56" stroke="#a8a290" strokeWidth="1.5" fill="#fbe89a" />

      {/* SERVICES arc text */}
      <defs>
        <path id="svcArc" d="M 22 60 A 38 38 0 0 1 98 60" />
      </defs>
      <text fontSize="8" fontWeight="800" letterSpacing="2.5" fill="#5a5a5a" textAnchor="middle" fontFamily="inherit">
        <textPath href="#svcArc" startOffset="50%">SERVICES</textPath>
      </text>

      {/* Saç tepe + arka */}
      <path
        d="M 42 54 C 42 38 78 38 78 54 L 78 50 C 78 36 64 32 60 32 C 56 32 42 36 42 50 Z"
        fill="#2a2a2a"
      />

      {/* Omuz / takım yaka */}
      <path
        d="M 28 116 C 32 88 46 80 60 80 C 74 80 88 88 92 116 Z"
        fill="#243a5e"
      />

      {/* Yaka iç V şekli (gömlek) */}
      <path d="M 54 86 L 60 96 L 66 86 Z" fill="#ffffff" />

      {/* Yüz */}
      <ellipse cx="60" cy="58" rx="14" ry="16" fill="#f4c9a3" />

      {/* Kulaklık bandı (saçın üzerinden geçer) */}
      <path
        d="M 38 58 C 38 38 82 38 82 58"
        stroke="#1a6fd4"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />

      {/* Sol kulaklık */}
      <rect x="34" y="55" width="8" height="12" rx="3" fill="#1a6fd4" />
      {/* Sağ kulaklık */}
      <rect x="78" y="55" width="8" height="12" rx="3" fill="#1a6fd4" />

      {/* Gözler */}
      <circle cx="55" cy="60" r="1.4" fill="#2a2a2a" />
      <circle cx="65" cy="60" r="1.4" fill="#2a2a2a" />

      {/* Ağız */}
      <path d="M 56 68 Q 60 71 64 68" stroke="#2a2a2a" strokeWidth="1.4" fill="none" strokeLinecap="round" />

      {/* Mikrofon kolu (sol kulaklıktan ağız önüne) */}
      <path
        d="M 36 64 Q 32 70 38 76"
        stroke="#1a6fd4"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx="40" cy="76" rx="2.4" ry="1.6" fill="#1a6fd4" />
    </svg>
  )
}
