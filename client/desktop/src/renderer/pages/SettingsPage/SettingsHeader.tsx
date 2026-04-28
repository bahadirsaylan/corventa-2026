import styles from './SettingsHeader.module.css'

interface Props {
  onBack: () => void
}

export default function SettingsHeader({ onBack }: Props) {
  return (
    <div className={styles.header}>
      {/* Left — title */}
      <div className={styles.titleBlock}>
        <button className={styles.backBtn} onClick={onBack} aria-label="Back to dashboard">
          ←
        </button>
        <div className={styles.titleText}>
          <span className={styles.titleTop}>CORVENTA BENDING</span>
          <span className={styles.titleBottom}>MACHINE SETTINGS</span>
        </div>
      </div>

      {/* Center — dual-gear settings icon */}
      <div className={styles.iconBlock}>
        <SettingsIcon className={styles.settingsIcon} />
      </div>

      {/* Right — customer info */}
      <div className={styles.customerBlock}>
        <span className={styles.customerLabel}>MÜŞTERİ ADI :</span>
        <span className={styles.customerName}>SERSOVİS A.Ş.  –  40.198517, 28.836939</span>
      </div>
    </div>
  )
}

/**
 * Dual interlocked gears inside a circle with "SETTINGS" arc text —
 * matches the reference image: large dark gear (back-left) + small blue gear (front-right).
 */
function SettingsIcon({ className }: { className?: string }) {
  const gearPath = (cx: number, cy: number, r: number, teeth: number, toothH: number) => {
    const innerR = r
    const outerR = r + toothH
    const toothW = (2 * Math.PI * r) / teeth / 2.8
    let d = ''
    for (let i = 0; i < teeth; i++) {
      const angle = (i / teeth) * 2 * Math.PI - Math.PI / 2
      const nextAngle = ((i + 1) / teeth) * 2 * Math.PI - Math.PI / 2
      const midAngle = angle + (nextAngle - angle) * 0.5
      const halfTooth = toothW / outerR / 2

      const x1 = cx + innerR * Math.cos(angle)
      const y1 = cy + innerR * Math.sin(angle)
      const x2 = cx + outerR * Math.cos(midAngle - halfTooth)
      const y2 = cy + outerR * Math.sin(midAngle - halfTooth)
      const x3 = cx + outerR * Math.cos(midAngle + halfTooth)
      const y3 = cy + outerR * Math.sin(midAngle + halfTooth)
      const x4 = cx + innerR * Math.cos(nextAngle)
      const y4 = cy + innerR * Math.sin(nextAngle)

      if (i === 0) d += `M ${x1} ${y1} `
      else d += `L ${x1} ${y1} `
      d += `L ${x2} ${y2} L ${x3} ${y3} L ${x4} ${y4} `
    }
    d += 'Z'
    return d
  }

  return (
    <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer circle */}
      <circle cx="60" cy="60" r="56" stroke="#ccc" strokeWidth="1.5" fill="none" />

      {/* "SETTINGS" text arcing along top of circle */}
      <defs>
        <path id="arcTop" d="M 14 60 A 46 46 0 0 1 106 60" />
      </defs>
      <text fontSize="9" fontWeight="700" letterSpacing="3" fill="#888" textAnchor="middle" fontFamily="inherit">
        <textPath href="#arcTop" startOffset="50%">SETTINGS</textPath>
      </text>

      {/* Small dot accent (red dot top-left, matching original) */}
      <circle cx="22" cy="42" r="2.5" fill="#e8474a" />

      {/* Large gear — back-left, dark */}
      <path
        d={gearPath(50, 66, 22, 10, 5)}
        fill="#2a2a2a"
        stroke="#2a2a2a"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <circle cx="50" cy="66" r="8" fill="white" />
      <circle cx="50" cy="66" r="4" fill="#2a2a2a" />

      {/* Small gear — front-right, blue */}
      <path
        d={gearPath(76, 44, 14, 8, 4)}
        fill="#1a6fd4"
        stroke="#1a6fd4"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <circle cx="76" cy="44" r="5" fill="white" />
      <circle cx="76" cy="44" r="2.5" fill="#1a6fd4" />
    </svg>
  )
}
