import { useNavigate } from 'react-router-dom'
import { useBendingJobStore } from '@/store/bendingJobStore'
import BendingProfileGrid from './BendingProfileGrid'
import ProfileInfoPanel from './ProfileInfoPanel'
import styles from './AiBendingPage.module.css'

export default function AiBendingPage() {
  const navigate = useNavigate()
  const profileId  = useBendingJobStore((s) => s.params.profileId)
  const setParams  = useBendingJobStore((s) => s.setParams)

  return (
    <div className={styles.page}>

      {/* ── Header ──────────────────────────────── */}
      <div className={styles.header}>
        <button
          className={styles.backBtn}
          onClick={() => navigate('/dashboard')}
          aria-label="Back to dashboard"
        >
          ←
        </button>

        <div className={styles.headerCenter}>
          <AiChipIcon className={styles.aiIcon} />
          <span className={styles.headerLabel}>ARTIFICIAL INTELLIGENCE MODE</span>
        </div>
      </div>

      {/* ── Title ───────────────────────────────── */}
      <h2 className={styles.title}>KIVIRIM PROFİLİNİ SEÇİNİZ</h2>

      {/* ── Content row ─────────────────────────── */}
      <div className={styles.content}>
        <BendingProfileGrid
          selected={profileId}
          onSelect={(id) => setParams({ profileId: id })}
        />
        <ProfileInfoPanel />
      </div>

      {/* ── Bottom status bar ───────────────────── */}
      <div className={styles.statusBar}>
        <div className={styles.statusLeft}>
          <WarningIcon className={styles.statusIcon} />
          <WifiIcon className={styles.statusIcon} />
        </div>
        <div className={styles.statusRight}>
          <button
            className={styles.confirmBtn}
            disabled={!profileId}
            onClick={() => {
              if (profileId) {
                /* TODO: navigate to the next bending parameter screen */
              }
            }}
          >
            <TouchIcon className={styles.touchIcon} />
          </button>
        </div>
      </div>

    </div>
  )
}

/* ── Icons ──────────────────────────────────── */

function AiChipIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="14" y="14" width="36" height="36" rx="4" stroke="currentColor" strokeWidth="3" />
      <rect x="23" y="23" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2.5" />
      <line x1="32" y1="2"  x2="32" y2="14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <line x1="32" y1="50" x2="32" y2="62" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <line x1="2"  y1="32" x2="14" y2="32" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <line x1="50" y1="32" x2="62" y2="32" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <line x1="20" y1="2"  x2="20" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="44" y1="2"  x2="44" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="20" y1="50" x2="20" y2="62" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="44" y1="50" x2="44" y2="62" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="2"  y1="20" x2="14" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="2"  y1="44" x2="14" y2="44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="50" y1="20" x2="62" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="50" y1="44" x2="62" y2="44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none">
      <path
        d="M32 6 L58 54 H6 Z"
        stroke="#e8a020"
        strokeWidth="3"
        strokeLinejoin="round"
        fill="#f5c842"
      />
      <line x1="32" y1="24" x2="32" y2="40" stroke="#2a2a2a" strokeWidth="4" strokeLinecap="round" />
      <circle cx="32" cy="47" r="2.5" fill="#2a2a2a" />
    </svg>
  )
}

function WifiIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none">
      <path d="M8 28 C18 18 46 18 56 28" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M16 37 C21 31 43 31 48 37" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M23 46 C26 42 38 42 41 46" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none" />
      <circle cx="32" cy="54" r="3.5" fill="currentColor" />
    </svg>
  )
}

function TouchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none">
      <path
        d="M28 10 C28 7.8 29.8 6 32 6 C34.2 6 36 7.8 36 10 L36 32
           C38 30.5 40.5 30 43 31 C45.5 32 47 34.5 47 37
           L47 46 C47 52 42 58 36 58 L28 58
           C22 58 17 53 17 47 L17 38 C17 35.8 18.8 34 21 34
           C21.8 34 22.5 34.2 23.2 34.6 L23.2 22
           C23.2 19.8 25 18 27.1 18 C27.4 18 27.7 18.05 28 18.1 Z"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}
