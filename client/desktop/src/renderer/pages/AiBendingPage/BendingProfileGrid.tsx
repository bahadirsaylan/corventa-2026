import { BendingProfileId } from '@/store/bendingJobStore'
import styles from './BendingProfileGrid.module.css'

// Re-export so existing consumers (AiBendingPage) don't need to change imports
export type { BendingProfileId as ProfileId }

interface Profile {
  id: BendingProfileId
  shape: React.ReactNode
}

const profiles: Profile[] = [
  { id: 'square-out',    shape: <SquareOutline /> },
  { id: 'square-in',    shape: <SquareInset /> },
  { id: 'circle',       shape: <CircleOutline /> },
  { id: 'l-right',      shape: <LRight /> },
  { id: 'i-bar',        shape: <IBar /> },
  { id: 'h-bar',        shape: <HBar /> },
  { id: 'c-channel',    shape: <CChannel /> },
  { id: 't-bar',        shape: <TBar /> },
  { id: 'square-filled',shape: <SquareFilled /> },
  { id: 'i-single',     shape: <ISingle /> },
  { id: 'circle-filled',shape: <CircleFilled /> },
  { id: 'l-left',       shape: <LLeft /> },
]

interface Props {
  selected: BendingProfileId | null
  onSelect: (id: BendingProfileId) => void
}

export default function BendingProfileGrid({ selected, onSelect }: Props) {
  return (
    <div className={styles.wrapper}>
      {/* 4×3 profile tiles */}
      <div className={styles.grid}>
        {profiles.map((p) => (
          <button
            key={p.id}
            className={`${styles.tile} ${selected === p.id ? styles.tileSelected : ''}`}
            onClick={() => onSelect(p.id)}
          >
            <span className={styles.shape}>{p.shape}</span>
          </button>
        ))}
      </div>

      {/* Special profiles vertical label tile */}
      <div className={styles.specialTile}>
        <span className={styles.specialText}>ÖZEL KIVIRIM PROFİLLERİ</span>
      </div>
    </div>
  )
}

/* ── SVG shape icons ─────────────────────────── */

function SquareOutline() {
  return (
    <svg viewBox="0 0 80 80" fill="none">
      <rect x="10" y="10" width="60" height="60" rx="4" stroke="currentColor" strokeWidth="6" />
    </svg>
  )
}

function SquareInset() {
  return (
    <svg viewBox="0 0 80 80" fill="none">
      <rect x="20" y="10" width="40" height="60" rx="4" stroke="currentColor" strokeWidth="6" />
    </svg>
  )
}

function CircleOutline() {
  return (
    <svg viewBox="0 0 80 80" fill="none">
      <circle cx="40" cy="40" r="28" stroke="currentColor" strokeWidth="6" />
    </svg>
  )
}

function LRight() {
  return (
    <svg viewBox="0 0 80 80" fill="none">
      <path d="M20 10 L20 70 L60 70" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IBar() {
  return (
    <svg viewBox="0 0 80 80" fill="none">
      {/* top flange */}
      <line x1="15" y1="15" x2="65" y2="15" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      {/* web */}
      <line x1="40" y1="15" x2="40" y2="65" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      {/* bottom flange */}
      <line x1="15" y1="65" x2="65" y2="65" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    </svg>
  )
}

function HBar() {
  return (
    <svg viewBox="0 0 80 80" fill="none">
      {/* left web */}
      <line x1="15" y1="10" x2="15" y2="70" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      {/* cross */}
      <line x1="15" y1="40" x2="65" y2="40" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      {/* right web */}
      <line x1="65" y1="10" x2="65" y2="70" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    </svg>
  )
}

function CChannel() {
  return (
    <svg viewBox="0 0 80 80" fill="none">
      {/* top flange */}
      <line x1="20" y1="15" x2="60" y2="15" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      {/* web */}
      <line x1="20" y1="15" x2="20" y2="65" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      {/* bottom flange */}
      <line x1="20" y1="65" x2="60" y2="65" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    </svg>
  )
}

function TBar() {
  return (
    <svg viewBox="0 0 80 80" fill="none">
      {/* top flange */}
      <line x1="15" y1="15" x2="65" y2="15" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      {/* web */}
      <line x1="40" y1="15" x2="40" y2="65" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    </svg>
  )
}

function SquareFilled() {
  return (
    <svg viewBox="0 0 80 80" fill="none">
      <rect x="10" y="10" width="60" height="60" rx="4" fill="currentColor" />
    </svg>
  )
}

function ISingle() {
  return (
    <svg viewBox="0 0 80 80" fill="none">
      <line x1="40" y1="10" x2="40" y2="70" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    </svg>
  )
}

function CircleFilled() {
  return (
    <svg viewBox="0 0 80 80" fill="none">
      <circle cx="40" cy="40" r="28" fill="currentColor" />
    </svg>
  )
}

function LLeft() {
  return (
    <svg viewBox="0 0 80 80" fill="none">
      <path d="M20 70 L60 70" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="60" y1="10" x2="60" y2="70" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    </svg>
  )
}
